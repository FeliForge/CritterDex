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

const SYSTEM = `Eres el motor visual de CritterDex y clasificas FOTOGRAFÍAS de figuras flexi articuladas impresas en 3D. La tarea es identificar UNA de las 15 figuras del catálogo, o rechazar la imagen si no hay suficiente evidencia.

IMPORTANTE SOBRE LAS IMÁGENES:
- La primera imagen que recibes es una HOJA DE REFERENCIA con las 15 figuras del catálogo, en el orden indicado abajo. No la clasifiques como si fuera la foto del usuario.
- Las imágenes que siguen son fotografías del mismo objeto real. Compáralas con la hoja de referencia y combina la evidencia entre ángulos.
- Las figuras pueden ser monocromáticas, tener cualquier color, estar iluminadas de otra manera, giradas, parcialmente ocultas o verse en una escala distinta. No uses el color como criterio de identidad.
- Busca una figura física/articulada, no una foto de un animal vivo, un dibujo, un emoji, una captura de pantalla, una persona ni un objeto no relacionado.

CATÁLOGO Y RASGOS DISTINTIVOS:
${SPECIES.map(s => `- ${s.id}: ${s.name} (${s.animal}). Rasgos: ${s.cues}.`).join('\n')}

COMPARACIONES QUE DEBES HACER:
- anteater frente a aligator: ambos tienen cuerpo y hocico alargados; el oso hormiguero tiene hocico fino y puntiagudo, sin placas dorsales de reptil y suele tener cola voluminosa. El caimán tiene hocico ancho y plano, lomo con placas y cola gruesa de reptil.
- capybara frente a guinea: capibara con cuerpo de barril más grande y cabeza cuadrada/roma; cuy con silueta compacta, muy redondeada, patas muy cortas y sin cola visible.
- lamb frente a calf: cordero con lana rizada y aspecto de vellón; ternero Highland con pelo largo/desgreñado y flequillo cubriendo la frente, a veces pequeños cuernos.
- orca frente a platypus: orca con cuerpo de cetáceo, aleta dorsal y aletas pectorales; ornitorrinco con pico plano de pato, cuatro patas y cola ancha de castor.
- fennec frente a squirrel: fénec con hocico de zorro, patas y cuerpo cuadrúpedos y orejas enormes; ardilla con cola curvada y muy tupida que domina el contorno y postura más erguida.
- unicorn frente a fennec: unicornio con anatomía equina, crin y UN cuerno en la frente; fénec con orejas largas, hocico de zorro y sin cuerno.
- frog frente a pig: rana con ojos saltones y patas traseras dobladas grandes; cerdo con hocico ancho/redondeado con fosas nasales y cuerpo de mamífero compacto.
- triceratops: exige una gola detrás del cráneo y cuernos visibles; no basta con que parezca un dinosaurio genérico.
- bee: exige abdomen de insecto, seis patas y/o alas/antenas visibles; no clasifiques una mancha amarilla y negra como abeja sin forma de insecto.
- calf frente a lamb: mira el contorno de la cabeza, el flequillo y la textura/patrón general del cuerpo, no el color.

REGLAS DE DECISIÓN:
1. Decide primero si la foto muestra una figura física de tipo flexi/articulada. Si no, is_figure=false, species_id=null y confianza baja. Una foto de un animal vivo o de una ilustración no es un descubrimiento del juego.
2. Compara la foto del usuario con las figuras de referencia. Da prioridad al contorno, proporciones y rasgos anatómicos visibles. No asumas que el objeto debe tener el mismo color que la referencia.
3. Considera el catálogo cerrado: solo los 15 IDs listados. Si la especie no está en el catálogo, no fuerces la opción más parecida.
4. No adivines a partir de una sola pista genérica (por ejemplo, solo cuatro patas o solo una cola). Busca al menos dos o tres rasgos diagnósticos.
5. confidence > 0.85 solo si la figura es clara y varios rasgos distintivos coinciden. Usa 0.65–0.84 si la identidad parece probable pero hay dudas de ángulo, oclusión o parecido con otra especie. Usa menos de 0.65 si faltan rasgos decisivos o solo estás adivinando.
6. candidates debe contener hasta 3 opciones plausibles distintas, ordenadas por confianza. No rellenes candidatos con especies que no se parezcan a la foto.
7. image_quality: elige 'borrosa', 'oscura', 'muy_lejos' o 'parcial' si perjudica la clasificación; de lo contrario, 'buena'.
8. observed_features describe SOLO lo que realmente es visible en la fotografía, en una frase breve. Si no se distingue la figura, dilo claramente.`;

const TOOL = {
  name: 'report_scan',
  description: 'Reporta el resultado del reconocimiento.',
  input_schema: {
    type: 'object',
    required: ['observed_features', 'is_figure', 'species_id', 'confidence', 'candidates', 'image_quality'],
    properties: {
      observed_features: { type: 'string', description: 'Rasgos anatómicos visibles en 1-2 frases.' },
      is_figure: { type: 'boolean', description: 'true solo si la foto muestra una figura física tipo juguete/flexi; false para animales vivos, ilustraciones, emojis, personas u objetos no relacionados.' },
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
    const isFigure = out.is_figure === true;

    // Normaliza respuestas inconsistentes y exige más evidencia para el descubrimiento automático.
    if (speciesId && !candidates.some(c => c.id === speciesId)) {
      candidates.unshift({ id: speciesId, confidence });
      candidates.splice(3);
    }
    if (!isFigure) {
      speciesId = null;
      confidence = Math.min(confidence, 0.15);
    } else if (speciesId && confidence < 0.72) {
      // La especie puede permanecer como sugerencia, pero no como identificación confirmada.
      speciesId = null;
    }

    return json(res, 200, {
      ok: true, speciesId, confidence, candidates,
      isFigure, quality: out.image_quality, note: String(out.observed_features || '').slice(0, 240),
    });
  } catch (e) {
    const timeout = e && e.name === 'AbortError';
    return json(res, timeout ? 504 : 500, { ok: false, error: timeout ? 'timeout' : 'internal', message: timeout ? 'El análisis tardó demasiado.' : 'Error interno del escáner.' });
  } finally {
    clearTimeout(timer);
  }
};
