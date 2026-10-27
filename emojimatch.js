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
  const photoCanvases = Object.create(null), photoRefs = Object.create(null), orbPhotoDescriptors = Object.create(null);
  let openCVPromise = null, orbRefsPromise = null;
  const REF_ORDER = ['bee','unicorn','pig','squirrel','platypus','capybara','aligator','anteater','frog','lamb','calf','orca','triceratops','fennec','guinea'];

  function loadPhotoAtlas() {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        try {
          const cellW = img.naturalWidth / 5, cellH = img.naturalHeight / 3;
          REF_ORDER.forEach((id, i) => {
            const c = newCanvas(Math.round(cellW), Math.round(cellH));
            c.getContext('2d', { willReadFrequently: true }).drawImage(img, (i % 5) * cellW, Math.floor(i / 5) * cellH, cellW, cellH, 0, 0, c.width, c.height);
            photoCanvases[id] = c;
            const seg = segment(c);
            if (seg) {
              const d = describe(seg.mask, seg.w, seg.h);
              if (d) photoRefs[id] = [d, mirror(d)];
            }
          });
        } catch (e) { console.warn('CritterDex: não foi possível preparar as fotos de referência.', e); }
        resolve(Object.keys(photoRefs).length);
      };
      img.onerror = () => { console.warn('CritterDex: atlas de referência indisponível; usando formas locais alternativas.'); resolve(0); };
      img.src = 'ref-photos/reference-atlas.webp';
    });
  }

  function loadRefs(base) {
    if (refsReady) return refsReady;
    base = base || 'ref/';
    const legacy = Promise.all(Object.keys(EMOJIS).map(id => new Promise(res => {
      const img = new Image();
      img.onload = () => {
        try {
          const k = 160 / Math.max(img.naturalWidth, img.naturalHeight), w = Math.max(8, Math.round(img.naturalWidth * k)), h = Math.max(8, Math.round(img.naturalHeight * k));
          const c = newCanvas(w, h), x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, w, h);
          const d = x.getImageData(0, 0, w, h).data, m = new Uint8Array(w * h);
          for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] > 128 ? 1 : 0;
          const desc = describe(largest(m, w, h), w, h);
          if (desc) { desc.isRef = true; const mm = mirror(desc); mm.isRef = true; refs[id] = [desc, mm]; }
        } catch (e) { /* referência antiga opcional */ }
        res();
      };
      img.onerror = () => res();
      img.src = base + id + '.png';
    })));
    refsReady = legacy.then(() => loadPhotoAtlas()).then(() => ({ legacy: Object.keys(refs).length, photos: Object.keys(photoRefs).length }));
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
  // OpenCV.js fornece ORB/BFMatcher (visão clássica, sem modelo treinado nem chamadas de IA).
  function loadOpenCV() {
    if (root.cv && root.cv.Mat && root.cv.ORB_create) return Promise.resolve(root.cv);
    if (openCVPromise) return openCVPromise;
    openCVPromise = new Promise((resolve, reject) => {
      let settled = false, timer = null, poll = null;
      const finish = (err, value) => {
        if (settled) return; settled = true; clearTimeout(timer); if (poll) clearInterval(poll);
        if (err) reject(err); else resolve(value);
      };
      const ready = () => { if (root.cv && root.cv.Mat && root.cv.ORB_create) finish(null, root.cv); };
      const module = root.Module || {};
      const previous = module.onRuntimeInitialized;
      module.onRuntimeInitialized = function () {
        try { if (typeof previous === 'function') previous(); } catch (e) { /* callback anterior opcional */ }
        ready();
      };
      root.Module = module;
      timer = setTimeout(() => finish(new Error('O OpenCV não ficou pronto a tempo.')), 9000);
      poll = setInterval(ready, 200);
      let script = document.querySelector('script[data-critter-opencv]');
      if (!script) {
        script = document.createElement('script'); script.async = true; script.dataset.critterOpencv = 'true';
        script.src = 'https://docs.opencv.org/4.x/opencv.js';
        script.onerror = () => finish(new Error('Não foi possível carregar a biblioteca OpenCV.'));
        document.head.appendChild(script);
      } else { ready(); }
    });
    return openCVPromise;
  }

  function extractORB(canvas, cv) {
    let source = null, gray = null, mask = null, maskSmall = null, keypoints = null, orb = null, descriptors = null, keep = false;
    try {
      const scale = Math.min(1, 256 / Math.max(canvas.width, canvas.height));
      const work = newCanvas(Math.max(16, Math.round(canvas.width * scale)), Math.max(16, Math.round(canvas.height * scale)));
      work.getContext('2d', { willReadFrequently: true }).drawImage(canvas, 0, 0, work.width, work.height);
      source = cv.imread(work); gray = new cv.Mat();
      cv.cvtColor(source, gray, cv.COLOR_RGBA2GRAY);
      mask = new cv.Mat(gray.rows, gray.cols, cv.CV_8UC1); mask.setTo(new cv.Scalar(255));
      const seg = segment(work);
      if (seg) {
        maskSmall = cv.matFromArray(seg.h, seg.w, cv.CV_8UC1, Array.from(seg.mask, v => v ? 255 : 0));
        cv.resize(maskSmall, mask, new cv.Size(gray.cols, gray.rows), 0, 0, cv.INTER_NEAREST);
      }
      keypoints = new cv.KeyPointVector(); descriptors = new cv.Mat(); orb = cv.ORB_create(450);
      orb.detectAndCompute(gray, mask, keypoints, descriptors);
      const count = keypoints.size();
      if (!descriptors || descriptors.empty() || count < 4) return null;
      keep = true;
      return { descriptors, count };
    } catch (e) { return null; }
    finally {
      if (source) source.delete(); if (gray) gray.delete(); if (mask) mask.delete();
      if (maskSmall) maskSmall.delete(); if (keypoints) keypoints.delete(); if (orb) orb.delete();
      if (descriptors && !keep) descriptors.delete();
    }
  }

  function orbSimilarity(query, reference, cv) {
    if (!query || !reference || !query.descriptors || !reference.descriptors) return 0;
    let matcher = null, pairs = null, good = 0;
    try {
      matcher = new cv.BFMatcher(cv.NORM_HAMMING, false); pairs = new cv.DMatchVectorVector();
      matcher.knnMatch(query.descriptors, reference.descriptors, pairs, 2);
      for (let i = 0; i < pairs.size(); i++) {
        const pair = pairs.get(i);
        try {
          if (pair.size() >= 2) {
            const m = pair.get(0), n = pair.get(1);
            if (m.distance < 0.78 * n.distance && m.distance < 68) good++;
          }
        } finally { pair.delete(); }
      }
      const denominator = Math.max(6, Math.min(query.count, reference.count) * 0.22);
      return Math.max(0, Math.min(1, good / denominator));
    } catch (e) { return 0; }
    finally { if (pairs) pairs.delete(); if (matcher) matcher.delete(); }
  }

  async function ensureORBReferences(cv) {
    if (orbRefsPromise) return orbRefsPromise;
    orbRefsPromise = Promise.resolve().then(() => {
      REF_ORDER.forEach(id => {
        if (photoCanvases[id] && !orbPhotoDescriptors[id]) orbPhotoDescriptors[id] = extractORB(photoCanvases[id], cv);
      });
      return Object.keys(orbPhotoDescriptors).filter(id => orbPhotoDescriptors[id]).length;
    });
    return orbRefsPromise;
  }

  function anatomyPenalty(id, d) {
    if (!d) return 0;
    const longBody = id === 'aligator' || id === 'anteater' || id === 'orca' || id === 'platypus';
    if (longBody && d.ar < 1.05) return -0.07;
    if (id === 'squirrel' && d.ar > 1.85) return -0.06;
    if (id === 'frog' && d.ar > 2.2) return -0.05;
    if ((id === 'pig' || id === 'guinea' || id === 'capybara') && d.ar > 2.35) return -0.04;
    return 0;
  }

  /** Classificação local: fotos de referência + silhueta + proporções + ORB; não envia imagens a servidores. */
  async function classify(canvases) {
    await loadRefs();
    const tpl = buildTemplates(), ids = Object.keys(tpl), shapeAcc = Object.create(null), orbBest = Object.create(null);
    let used = 0, rel = 0, cv = null;
    try { cv = await loadOpenCV(); await ensureORBReferences(cv); }
    catch (e) { console.warn('CritterDex: ORB indisponível; usando comparação de formas local.', e); }
    const queryOrb = [];
    for (const c of (canvases || []).slice(0, 3)) {
      const seg = segment(c);
      if (seg) {
        const q = describe(seg.mask, seg.w, seg.h);
        if (q) {
          used++; rel += seg.reliability;
          for (const id of ids) {
            let emojiScore = 0, oldScore = 0, photoScore = 0;
            for (const t of tpl[id]) emojiScore = Math.max(emojiScore, similarity(q, t, AR[id]));
            if (refs[id]) for (const t of refs[id]) oldScore = Math.max(oldScore, similarity(q, t, t.ar));
            if (photoRefs[id]) for (const t of photoRefs[id]) photoScore = Math.max(photoScore, similarity(q, t, t.ar));
            // A referência enviada pelo usuário tem prioridade sobre a silhueta de emoji.
            const best = Math.max(photoScore, oldScore, emojiScore * 0.72) + anatomyPenalty(id, q);
            shapeAcc[id] = (shapeAcc[id] || 0) + Math.max(0, Math.min(1, best));
          }
        }
      }
      if (cv) {
        const features = extractORB(c, cv);
        if (features) {
          queryOrb.push(features);
          for (const id of ids) {
            const score = orbSimilarity(features, orbPhotoDescriptors[id], cv);
            orbBest[id] = Math.max(orbBest[id] || 0, score);
          }
        }
      }
    }
    if (!used) {
      queryOrb.forEach(q => q.descriptors.delete());
      return { ok: true, speciesId: null, confidence: 0, candidates: [], isFigure: false, quality: 'ruim', local: true,
        note: 'Não consegui separar uma silhueta confiável. Tente enquadrar a figura inteira contra um fundo liso e bem iluminado.' };
    }
    const shapeScores = ids.map(id => ({ id, shape: (shapeAcc[id] || 0) / used, orb: orbBest[id] || 0 }));
    const useORB = queryOrb.length > 0 && shapeScores.some(s => s.orb >= 0.18);
    const scores = shapeScores.map(s => {
      const score = useORB && orbPhotoDescriptors[s.id] ? (s.shape * 0.76 + s.orb * 0.24) : s.shape;
      return { id: s.id, score: Math.max(0, Math.min(1, score)), shapeScore: s.shape, orbScore: s.orb };
    }).sort((a, b) => b.score - a.score);
    queryOrb.forEach(q => q.descriptors.delete());
    const top = scores[0], next = scores[1], margin = top ? top.score - (next ? next.score : 0) : 0;
    const candidates = scores.filter(s => s.score >= 0.27 && s.score >= top.score - 0.22).slice(0, 3)
      .map(s => ({ id: s.id, confidence: s.score, score: s.score, shapeScore: s.shapeScore, orbScore: s.orbScore }));
    const isFigure = !!top && top.score >= 0.34;
    const speciesId = isFigure && top.score >= 0.72 && margin >= 0.075 ? top.id : null;
    return { ok: true, speciesId, confidence: top ? top.score : 0, candidates, isFigure, quality: 'boa', local: true,
      reliability: rel / used, margin, recognizer: useORB ? 'silhouette+geometry+ORB' : 'silhouette+geometry',
      note: useORB ? 'Comparação local por silhueta, proporções anatômicas e pontos ORB.' : 'Comparação local por silhueta e proporções anatômicas.' };
  }
  function merge(ai, local) {
    const ranking = local && local.ok && Array.isArray(local.ranking) ? local.ranking : [];
    const localBest = ranking[0] || null;
    const localNext = ranking[1] || null;
    const localScore = localBest ? Number(localBest.score) || 0 : 0;
    const localMargin = localBest ? localScore - (localNext ? Number(localNext.score) || 0 : 0) : 0;

    // La puntuación softmax local solo ordena formas; NO es una probabilidad calibrada.
    // Cuando la IA falla, se ofrecen sugerencias de baja confianza, nunca un registro automático.
    if (!ai || !ai.ok) {
      if (!localBest || localScore < 0.38 || localMargin < 0.025) return ai;
      const candidates = ranking
        .filter(s => (Number(s.score) || 0) >= Math.max(0.30, localScore - 0.07))
        .slice(0, 3)
        .map(s => ({ id: s.id, confidence: Math.min(0.48, Math.max(0.08, Number(s.confidence) || 0)) }));
      return {
        ok: true, speciesId: null, confidence: candidates[0]?.confidence || 0,
        candidates, isFigure: true, quality: 'boa', local: true,
        note: 'A IA não respondeu. Estas são apenas sugestões de silhueta; confirme a espécie manualmente.',
        aiError: ai && ai.error,
      };
    }

    // Se a visão diz que não existe uma figura válida, o classificador de silhueta não pode contradizê-la.
    if (ai.isFigure !== true) {
      return Object.assign({}, ai, { speciesId: null, confidence: Math.min(Number(ai.confidence) || 0, 0.2), candidates: [] });
    }

    const aiCandidates = Array.isArray(ai.candidates) ? ai.candidates
      .filter(c => c && EMOJIS[c.id] && Number.isFinite(Number(c.confidence)))
      .map(c => ({ id: c.id, confidence: Math.max(0, Math.min(1, Number(c.confidence))) }))
      .sort((a, b) => b.confidence - a.confidence) : [];
    const aiId = ai.speciesId && EMOJIS[ai.speciesId] ? ai.speciesId : null;
    const aiConfidence = Math.max(0, Math.min(1, Number(ai.confidence) || 0));
    if (aiId && !aiCandidates.some(c => c.id === aiId)) aiCandidates.unshift({ id: aiId, confidence: aiConfidence });

    // O sinal local só pode adicionar uma alternativa quando a forma realmente combina.
    // Nunca cancela nem substitui uma identificação visual confirmada pela IA.
    const candidates = aiCandidates.slice(0, 3);
    if (localBest && localScore >= 0.43 && localMargin >= 0.055 &&
        !candidates.some(c => c.id === localBest.id) && candidates.length < 3) {
      candidates.push({ id: localBest.id, confidence: Math.min(0.39, Math.max(0.12, Number(localBest.confidence) || 0)) });
      candidates.sort((a, b) => b.confidence - a.confidence);
    }

    const confirmedId = aiId && aiConfidence >= 0.72 ? aiId : null;
    return Object.assign({}, ai, {
      speciesId: confirmedId,
      confidence: aiConfidence,
      candidates: candidates.slice(0, 3),
      localAgrees: !!(aiId && localBest && aiId === localBest.id),
    });
  }

  root.EmojiMatch = { classify, merge, loadRefs, refCount: () => Object.keys(refs).length, segment, describe, EMOJIS, _templates: buildTemplates };
})(typeof window !== 'undefined' ? window : globalThis);
