/* CritterDex · reconocimiento local por semejanza de silueta con emojis.
 * 1) Segmenta la figura de la foto (fondo ≈ color del borde) → máscara binaria.
 * 2) Compara la máscara con plantillas de silueta generadas desde los emojis de cada especie
 *    (IoU normalizado + proporción + perfil radial, probando el espejo).
 * Es una señal complementaria a la IA: rápida, gratis y offline. No usa el color. */
(function (root) {
  'use strict';

  // Varios emojis por especie: la silueta de un solo emoji varía mucho entre plataformas.
  const EMOJIS = {
    anteater: ['🦡', '🐜'], aligator: ['🐊'], frog: ['🐸'], capybara: ['🦫', '🐹'], fennec: ['🦊'],
    lamb: ['🐑', '🐏'], orca: ['🐳', '🐋'], pig: ['🐷', '🐖'], triceratops: ['🦕', '🦖'],
    calf: ['🐮', '🐄', '🐂'], guinea: ['🐹', '🐭'], platypus: ['🦆', '🦫'], bee: ['🐝'],
    unicorn: ['🦄', '🐴'], squirrel: ['🐿️'],
  };
  // Proporción ancho/alto típica de la figura de perfil (conocimiento anatómico, no del emoji).
  const AR = {
    anteater: 2.3, aligator: 2.6, frog: 1.3, capybara: 1.7, fennec: 1.4, lamb: 1.4, orca: 2.0, pig: 1.5,
    triceratops: 1.9, calf: 1.5, guinea: 1.3, platypus: 2.0, bee: 1.3, unicorn: 1.4, squirrel: 0.9,
  };

  const N = 40, BINS = 36, SEG = 112, TSIZE = 128;

  function newCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  /** Máscara (Uint8Array w*h) → descriptor. */
  function describe(mask, w, h) {
    let x0 = w, y0 = h, x1 = -1, y1 = -1, area = 0, sx = 0, sy = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (mask[y * w + x]) {
      area++; sx += x; sy += y; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    if (area < 20) return null;
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1, cx = sx / area, cy = sy / area;
    // Rejilla N×N con la caja estirada a cuadrado: compara la FORMA sin depender de la proporción
    // (los emojis son casi cuadrados; la proporción real se puntúa aparte con AR).
    const kx = (N - 2) / bw, ky = (N - 2) / bh, grid = new Uint8Array(N * N);
    for (let gy = 0; gy < N; gy++) for (let gx = 0; gx < N; gx++) {
      const px = Math.floor((gx - 1) / kx + x0), py = Math.floor((gy - 1) / ky + y0);
      if (px >= x0 && px <= x1 && py >= y0 && py <= y1 && mask[py * w + px]) grid[gy * N + gx] = 1;
    }
    // Perfil radial en coordenadas de caja normalizada (0..1): distancia máxima por sector.
    const rad = new Float32Array(BINS), ncx = (cx - x0) / bw, ncy = (cy - y0) / bh;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (mask[y * w + x]) {
      const ux = (x - x0) / bw - ncx, uy = (y - y0) / bh - ncy;
      const a = Math.atan2(uy, ux), b = Math.min(BINS - 1, Math.floor(((a + Math.PI) / (2 * Math.PI)) * BINS));
      const d = Math.hypot(ux, uy); if (d > rad[b]) rad[b] = d;
    }
    return { grid, rad, ar: bw / bh, fill: area / (bw * bh), area };
  }

  const mirror = d => {
    const grid = new Uint8Array(N * N), rad = new Float32Array(BINS);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) grid[y * N + x] = d.grid[y * N + (N - 1 - x)];
    // espejo horizontal: ángulo a → π - a
    for (let b = 0; b < BINS; b++) rad[BINS - 1 - b] = d.rad[b];
    return { grid, rad, ar: d.ar, fill: d.fill, area: d.area };
  };

  function similarity(q, t, ar) {
    let inter = 0, uni = 0;
    for (let i = 0; i < N * N; i++) { const a = q.grid[i], b = t.grid[i]; if (a & b) inter++; if (a | b) uni++; }
    const iou = uni ? inter / uni : 0;
    let dr = 0; for (let b = 0; b < BINS; b++) dr += Math.abs(q.rad[b] - t.rad[b]);
    const rs = Math.max(0, 1 - dr / BINS / 0.35);
    const as = Math.exp(-Math.abs(Math.log(q.ar / ar)) * 1.2);
    return 0.45 * iou + 0.38 * rs + 0.17 * as;
  }

  // Siluetas de las figuras reales (ref/<id>.png con alfa). Prioridad sobre los emojis.
  const refs = {}; let refsReady = null;
  function loadRefs(base) {
    if (refsReady) return refsReady;
    base = base || 'ref/';
    refsReady = Promise.all(Object.keys(EMOJIS).map(id => new Promise(res => {
      const img = new Image();
      img.onload = () => {
        try {
          const k = 160 / Math.max(img.naturalWidth, img.naturalHeight), w = Math.max(8, Math.round(img.naturalWidth * k)), h = Math.max(8, Math.round(img.naturalHeight * k));
          const c = newCanvas(w, h), x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, w, h);
          const d = x.getImageData(0, 0, w, h).data, m = new Uint8Array(w * h);
          for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] > 128 ? 1 : 0;
          const desc = describe(largest(m, w, h), w, h);
          if (desc) { desc.isRef = true; const mm = mirror(desc); mm.isRef = true; refs[id] = [desc, mm]; }
        } catch (e) { /* sin plantilla de referencia */ }
        res();
      };
      img.onerror = () => res();
      img.src = base + id + '.png';
    }))).then(() => Object.keys(refs).length);
    return refsReady;
  }

  // Plantillas de emoji (se calculan una vez, perezosamente).
  let templates = null;
  function buildTemplates() {
    if (templates) return templates;
    templates = {};
    for (const id of Object.keys(EMOJIS)) {
      templates[id] = [];
      for (const e of EMOJIS[id]) {
        const c = newCanvas(TSIZE, TSIZE), x = c.getContext('2d', { willReadFrequently: true });
        x.font = `${Math.round(TSIZE * 0.78)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
        x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(e, TSIZE / 2, TSIZE / 2 + TSIZE * 0.04);
        const d = x.getImageData(0, 0, TSIZE, TSIZE).data, m = new Uint8Array(TSIZE * TSIZE);
        for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] > 40 ? 1 : 0;
        const desc = describe(largest(m, TSIZE, TSIZE), TSIZE, TSIZE);
        if (desc) templates[id].push(desc, mirror(desc));
      }
    }
    return templates;
  }

  /** Conserva solo el mayor componente conexo. */
  function largest(mask, w, h) {
    const lab = new Int32Array(w * h), sizes = [0]; let n = 0; const stack = [];
    for (let i = 0; i < w * h; i++) {
      if (!mask[i] || lab[i]) continue;
      n++; let s = 0; stack.push(i); lab[i] = n;
      while (stack.length) {
        const p = stack.pop(); s++; const x = p % w, y = (p / w) | 0;
        if (x > 0 && mask[p - 1] && !lab[p - 1]) { lab[p - 1] = n; stack.push(p - 1); }
        if (x < w - 1 && mask[p + 1] && !lab[p + 1]) { lab[p + 1] = n; stack.push(p + 1); }
        if (y > 0 && mask[p - w] && !lab[p - w]) { lab[p - w] = n; stack.push(p - w); }
        if (y < h - 1 && mask[p + w] && !lab[p + w]) { lab[p + w] = n; stack.push(p + w); }
      }
      sizes.push(s);
    }
    let best = 0; for (let i = 1; i <= n; i++) if (sizes[i] > (sizes[best] || 0)) best = i;
    const out = new Uint8Array(w * h); if (best) for (let i = 0; i < w * h; i++) if (lab[i] === best) out[i] = 1;
    return out;
  }

  /** Foto → máscara de la figura (o null si no hay silueta fiable). */
  function segment(canvas) {
    const k = SEG / Math.max(canvas.width, canvas.height), w = Math.max(8, Math.round(canvas.width * k)), h = Math.max(8, Math.round(canvas.height * k));
    const c = newCanvas(w, h), x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(canvas, 0, 0, w, h);
    const d = x.getImageData(0, 0, w, h).data;
    // Color de fondo: mediana por canal del anillo exterior.
    const ring = [], t = Math.max(2, Math.round(Math.min(w, h) * 0.05));
    for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) if (y < t || y >= h - t || xx < t || xx >= w - t) ring.push((y * w + xx) * 4);
    const med = ch => { const v = ring.map(i => d[i + ch]).sort((a, b) => a - b); return v[v.length >> 1]; };
    const bg = [med(0), med(1), med(2)];
    // Distancia perceptual (Lab, ΔE76): detecta figuras pálidas sobre fondo claro (cerdo rosa, cordero…).
    const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const f = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
    const lab = (r, g, bl) => {
      r = lin(r); g = lin(g); bl = lin(bl);
      const X = (0.4124 * r + 0.3576 * g + 0.1805 * bl) / 0.95047, Y = 0.2126 * r + 0.7152 * g + 0.0722 * bl, Z = (0.0193 * r + 0.1192 * g + 0.9505 * bl) / 1.08883;
      return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
    };
    const L0 = lab(bg[0], bg[1], bg[2]);
    const dist = new Float32Array(w * h); let mx = 1;
    for (let i = 0; i < w * h; i++) {
      const l = lab(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]);
      dist[i] = Math.hypot(l[0] - L0[0], (l[1] - L0[1]) * 1.3, (l[2] - L0[2]) * 1.3); if (dist[i] > mx) mx = dist[i];
    }
    let bgDev = 0; for (const i of ring) { const q = i / 4; bgDev += dist[q]; } bgDev /= ring.length;
    const hist = new Float32Array(64);
    for (let i = 0; i < w * h; i++) hist[Math.min(63, (dist[i] / mx * 63) | 0)]++;
    // Otsu
    let sumAll = 0; for (let i = 0; i < 64; i++) sumAll += i * hist[i];
    let wB = 0, sumB = 0, best = 0, thr = 0;
    for (let i = 0; i < 64; i++) {
      wB += hist[i]; if (!wB) continue; const wF = w * h - wB; if (!wF) break;
      sumB += i * hist[i]; const mB = sumB / wB, mF = (sumAll - sumB) / wF, v = wB * wF * (mB - mF) * (mB - mF);
      if (v > best) { best = v; thr = i; }
    }
    // Umbral: Otsu moderado (para dejar fuera sombras suaves) pero nunca por debajo del ruido del fondo.
    const T = Math.max(8, bgDev * 3 + 4, Math.min((thr / 63) * mx * 0.8, 40));
    // Umbral → máscara; si la silueta sale diminuta (figura pálida), se repite con umbral más bajo.
    let mask = null, frac = 0;
    for (const m of [1, 0.7, 0.5]) {
      const Tm = Math.max(5, T * m), raw = new Uint8Array(w * h);
      for (let i = 0; i < w * h; i++) raw[i] = dist[i] > Tm ? 1 : 0;
      mask = fillHoles(largest(close(close(raw, w, h), w, h), w, h), w, h);
      let area = 0; for (let i = 0; i < mask.length; i++) area += mask[i];
      frac = area / (w * h);
      if (frac >= 0.12) break;
    }
    if (frac < 0.03 || frac > 0.85) return null;
    return { mask, w, h, reliability: Math.max(0.25, Math.min(1, 1 - bgDev / 12)) };
  }

  /** Rellena huecos interiores (todo lo que no se alcanza desde el borde). */
  function fillHoles(m, w, h) {
    const out = new Uint8Array(w * h).fill(1), stack = [];
    const push = i => { if (!m[i] && out[i] === 1) { out[i] = 0; stack.push(i); } };
    for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
    while (stack.length) {
      const p = stack.pop(), x = p % w, y = (p / w) | 0;
      if (x > 0) push(p - 1); if (x < w - 1) push(p + 1); if (y > 0) push(p - w); if (y < h - 1) push(p + w);
    }
    return out;
  }

  function close(m, w, h) { // dilatar 1 y erosionar 1 (cierra huecos pequeños)
    const dil = new Uint8Array(w * h), out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let v = 0; for (let dy = -1; dy <= 1 && !v; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < w && yy < h && m[yy * w + xx]) { v = 1; break; }
      } dil[y * w + x] = v;
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let v = 1; for (let dy = -1; dy <= 1 && v; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h || !dil[yy * w + xx]) { v = 0; break; }
      } out[y * w + x] = v;
    }
    return out;
  }

  /** Clasifica una o varias fotos (canvas). Devuelve { ok, ranking:[{id,score,confidence}], reliability }. */
  function classify(canvases) {
    const tpl = buildTemplates(), ids = Object.keys(tpl), acc = {}; let used = 0, rel = 0;
    for (const c of canvases) {
      const seg = segment(c); if (!seg) continue;
      const q = describe(seg.mask, seg.w, seg.h); if (!q) continue;
      used++; rel += seg.reliability;
      for (const id of ids) {
        let best = 0; for (const t of tpl[id]) best = Math.max(best, similarity(q, t, AR[id]) * (refs[id] ? 0.93 : 1));
        if (refs[id]) for (const t of refs[id]) best = Math.max(best, similarity(q, t, t.ar));
        acc[id] = (acc[id] || 0) + best;
      }
    }
    if (!used) return { ok: false };
    const scores = ids.map(id => ({ id, score: acc[id] / used })).sort((a, b) => b.score - a.score);
    // Softmax con temperatura baja → pseudo-probabilidad; techo bajo porque es una señal débil.
    const T = 0.05, mx = scores[0].score, ex = scores.map(s => Math.exp((s.score - mx) / T)), z = ex.reduce((a, b) => a + b, 0);
    const reliability = rel / used, cap = 0.35 + 0.35 * reliability;
    scores.forEach((s, i) => { s.confidence = Math.min(cap, (ex[i] / z) * (0.5 + 0.5 * reliability)); });
    return { ok: true, ranking: scores, reliability };
  }

  /** Mezcla IA + local. ai: respuesta de /api/scan (o {ok:false}); local: salida de classify. */
  function merge(ai, local) {
    const L = local && local.ok ? local.ranking.slice(0, 5) : [];
    if (!ai || !ai.ok) {
      if (!L.length) return ai;
      const cands = L.slice(0, 3).map(s => ({ id: s.id, confidence: s.confidence }));
      return { ok: true, speciesId: null, confidence: cands[0].confidence, candidates: cands, isFigure: true, quality: 'buena', local: true,
        note: 'Reconocimiento local por silueta (sin IA).', aiError: ai && ai.error };
    }
    if (!L.length) return ai;
    const lmap = Object.fromEntries(L.map(s => [s.id, s]));
    const board = {};
    for (const c of ai.candidates || []) board[c.id] = c.confidence;
    if (ai.speciesId && !(ai.speciesId in board)) board[ai.speciesId] = ai.confidence;
    // Si la IA y la silueta coinciden, sube; si la silueta discrepa claramente, el empate lo decide el local.
    const out = {};
    for (const id of new Set([...Object.keys(board), L[0].id])) {
      const a = board[id] || 0, l = lmap[id] ? lmap[id].confidence : 0;
      out[id] = Math.min(0.99, a + (a > 0 ? 0.12 * (l / 0.7) : 0.25 * (l / 0.7) * (ai.isFigure ? 1 : 0)));
    }
    const cands = Object.entries(out).map(([id, confidence]) => ({ id, confidence })).sort((x, y) => y.confidence - x.confidence).slice(0, 3);
    const top = cands[0];
    const agree = ai.speciesId && ai.speciesId === L[0].id;
    let confidence = top && top.id === ai.speciesId ? Math.min(0.99, ai.confidence + (agree ? 0.08 : 0)) : (top ? top.confidence : ai.confidence);
    let speciesId = ai.speciesId && top && top.id === ai.speciesId ? ai.speciesId : (ai.speciesId && ai.confidence >= 0.6 ? ai.speciesId : null);
    if (speciesId && ai.speciesId !== speciesId) confidence = Math.min(confidence, 0.55);
    // Desacuerdo claro y la IA no está muy segura → que el usuario elija entre las sugerencias.
    if (speciesId && !agree && L[0].confidence >= 0.4 && ai.confidence < 0.85) { speciesId = null; confidence = Math.min(confidence, 0.55); }
    return Object.assign({}, ai, { speciesId, confidence, candidates: cands, localAgrees: !!agree });
  }

  root.EmojiMatch = { classify, merge, loadRefs, refCount: () => Object.keys(refs).length, segment, describe, EMOJIS, _templates: buildTemplates };
})(typeof window !== 'undefined' ? window : globalThis);
