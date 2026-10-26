// POST /api/scan  { images: [{ data: <base64 sin prefijo>, mediaType: 'image/jpeg' }, ...] }
// → { ok, speciesId|null, confidence (0..1), candidates:[{id,confidence}], isToy, quality, note }
// Requiere la variable de entorno ANTHROPIC_API_KEY en Vercel. SCAN_MODEL es opcional.
const SPECIES = require('./_species');
const REF_SHEET = require('./_refsheet');

const MODEL = process.env.SCAN_MODEL || 'claude-sonnet-5-5';
const MAX_IMAGES = 3;
const MAX_B64_CHARS = 1_800_000; // ~1.3 MB por imagen ya reducida por el cliente
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);
const IDS = SPECIES.map(s => s.id);

// Límite best-effort por IP (memoria de la instancia; no es un límite global).
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter(t => now - t < 60_000);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 500) for (const [k, v] of hits) if (!v.some(t => now - t < 60_000)) hits.delete(k);
  return arr.length > 12;
}

const SYSTEM = `Eres el motor de reconocimiento de CritterDex. Recibes fotos de FIGURAS FLEXI: juguetes articulados impresos en 3D (cuerpo segmentado, a menudo de un solo color, bicolor o degradado). Debes decidir cuál de las especies del catálogo aparece, o ninguna.

Catálogo:
${SPECIES.map(s => `- ${s.id}: ${s.name} (${s.animal}). Rasgos: ${s.cues}.`).join('\n')}

Reglas:
1. Identifica por SILUETA y RASGOS ANATÓMICOS (hocico, orejas, cola, cuernos, extremidades), nunca por el color: el mismo modelo se imprime en cualquier color.
2. Si hay varias fotos, son del mismo objeto; combina la evidencia.
3. Si no hay una figura/animal claro (rostro de persona, paisaje, texto, objeto no relacionado, imagen borrosa), pon species_id = null y confidence baja.
4. Si la figura es un animal que NO está en el catálogo, species_id = null.
5. La confidence debe estar calibrada: >0.85 solo con rasgos distintivos claramente visibles; 0.5-0.85 con duda razonable; <0.5 si adivinas.
6. candidates incluye hasta 3 ids del catálogo ordenados de mayor a menor confianza, aunque species_id sea null.
7. No inventes: usa solo los ids del catálogo.
8. La PRIMERA imagen es una hoja de referencia con las 15 figuras reales (numeradas, en el orden del catálogo). Compara la silueta, proporciones y rasgos de la foto con esas figuras. La figura de la foto puede estar impresa en OTRO color, en otro ángulo o con otra iluminación; no es una imagen de la hoja.`;

const TOOL = {
  name: 'report_scan',
  description: 'Reporta el resultado del reconocimiento.',
  input_schema: {
    type: 'object',
    required: ['observed_features', 'is_figure', 'species_id', 'confidence', 'candidates', 'image_quality'],
    properties: {
      observed_features: { type: 'string', description: 'Rasgos anatómicos visibles en 1-2 frases.' },
      is_figure: { type: 'boolean', description: 'true si hay una figura o animal reconocible en la foto.' },
      species_id: { type: ['string', 'null'], enum: [...IDS, null] },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      candidates: {
        type: 'array', maxItems: 3,
        items: {
          type: 'object', required: ['id', 'confidence'],
          properties: { id: { type: 'string', enum: IDS }, confidence: { type: 'number', minimum: 0, maximum: 1 } },
        },
      },
      image_quality: { type: 'string', enum: ['buena', 'borrosa', 'oscura', 'muy_lejos', 'parcial'] },
    },
  },
};

function json(res, code, body) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > 4_000_000) throw new Error('payload');
    chunks.push(c);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method' });
  // Solo aceptamos peticiones hechas desde este mismo sitio (frena el uso de la clave desde otras webs).
  const origin = req.headers.origin;
  if (origin) {
    let ok = false;
    try { ok = new URL(origin).host === req.headers.host; } catch { /* origen inválido */ }
    if (!ok) return json(res, 403, { ok: false, error: 'origin', message: 'Origen no permitido.' });
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return json(res, 503, { ok: false, error: 'no_key', message: 'Falta ANTHROPIC_API_KEY en las variables de entorno de Vercel.' });

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'anon';
  if (limited(ip)) return json(res, 429, { ok: false, error: 'rate', message: 'Demasiados escaneos seguidos. Espera un momento.' });

  let body;
  try { body = await readBody(req); } catch { return json(res, 400, { ok: false, error: 'bad_body' }); }

  const images = Array.isArray(body.images) ? body.images.slice(0, MAX_IMAGES) : [];
  if (!images.length) return json(res, 400, { ok: false, error: 'no_images' });
  for (const im of images) {
    if (!im || typeof im.data !== 'string' || !ALLOWED.has(im.mediaType) || im.data.length > MAX_B64_CHARS || !/^[A-Za-z0-9+/=]+$/.test(im.data)) {
      return json(res, 400, { ok: false, error: 'bad_image' });
    }
  }

  const content = [
    { type: 'text', text: 'Hoja de referencia del catálogo (no es la foto a identificar):' },
    { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: REF_SHEET } },
    { type: 'text', text: images.length > 1 ? 'Fotos a identificar:' : 'Foto a identificar:' },
    ...images.map(im => ({ type: 'image', source: { type: 'base64', media_type: im.mediaType, data: im.data } })),
    { type: 'text', text: images.length > 1 ? `Son ${images.length} fotos del mismo objeto. Identifica la figura.` : 'Identifica la figura.' },
  ];

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25_000);
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 500,
        system: SYSTEM,
        tools: [TOOL],
        tool_choice: { type: 'tool', name: 'report_scan' },
        messages: [{ role: 'user', content }],
      }),
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      console.error('anthropic', r.status, detail.slice(0, 300));
      return json(res, 502, { ok: false, error: 'upstream', status: r.status, message: 'El modelo no respondió. Inténtalo de nuevo.' });
    }
    const data = await r.json();
    const out = (data.content || []).find(b => b.type === 'tool_use')?.input;
    if (!out) return json(res, 502, { ok: false, error: 'no_output', message: 'Respuesta inesperada del modelo.' });

    const clamp = n => Math.max(0, Math.min(1, Number(n) || 0));
    const candidates = (out.candidates || [])
      .filter(c => IDS.includes(c.id))
      .map(c => ({ id: c.id, confidence: clamp(c.confidence) }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);
    let speciesId = IDS.includes(out.species_id) ? out.species_id : null;
    let confidence = clamp(out.confidence);
    if (!out.is_figure) { speciesId = null; confidence = Math.min(confidence, 0.2); }

    return json(res, 200, {
      ok: true, speciesId, confidence, candidates,
      isFigure: !!out.is_figure, quality: out.image_quality, note: String(out.observed_features || '').slice(0, 240),
    });
  } catch (e) {
    const timeout = e && e.name === 'AbortError';
    return json(res, timeout ? 504 : 500, { ok: false, error: timeout ? 'timeout' : 'internal', message: timeout ? 'El análisis tardó demasiado.' : 'Error interno del escáner.' });
  } finally {
    clearTimeout(timer);
  }
};
