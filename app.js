/* CritterDex Alpha 0.3 · lógica de la app (escáner IA, hábitat, combate P2P y efectos). */
'use strict';

/* ───────────── i18n (PT oficial + 6) ───────────── */
const LANGS = {
  pt: { code:'pt', name:'Português', flag:'🇧🇷' },
  es: { code:'es', name:'Español', flag:'🇪🇸' },
  en: { code:'en', name:'English', flag:'🇺🇸' },
  fr: { code:'fr', name:'Français', flag:'🇫🇷' },
  de: { code:'de', name:'Deutsch', flag:'🇩🇪' },
  it: { code:'it', name:'Italiano', flag:'🇮🇹' },
  ja: { code:'ja', name:'日本語', flag:'🇯🇵' },
};
const T = {
  pt: {
    createWorld: 'Crie sua coleção de criaturas',
    createSub: 'Descubra espécies só com o escâner, treine e lute contra amigos de outro dispositivo.',
    openScan: 'Abrir escâner →',
    found: 'Descobertas', maxLevel: 'Nível máx.', points: 'Pontos',
    myCreatures: 'Minhas criaturas', noneYet: 'Nenhuma criatura ainda. Use o Escâner.',
    habitat: 'Habitat', dex: 'Dex', scanner: 'Escâner', combat: 'Combate', ranking: 'Ranking',
    scanTitle: 'Escâner de figuras Flexi',
    cameraReady: 'Câmera pronta. Enquadre a figura completa e mantenha firme.',
    noCamera: 'Sem acesso à câmera. Você pode enviar uma imagem.',
    newSpecies: 'Nova espécie! +40 pontos', already: 'Já estava no seu Dex',
    seeHabitat: 'Ver meu habitat',
    noRecognize: 'Não reconheci nenhuma figura do catálogo',
    retry: 'Tentar de novo',
    dexHint: 'Consulte dados. Para registrar uma espécie use o Escâner.',
  },
  es: {
    createWorld: 'Crea tu colección de criaturas',
    createSub: 'Descubre especies solo con el escáner, entrenalas y lucha contra amigos desde otro dispositivo.',
    openScan: 'Abrir escáner →',
    found: 'Descubiertas', maxLevel: 'Nivel máx.', points: 'Puntos',
    myCreatures: 'Mis criaturas', noneYet: 'Ninguna criatura aún. Usa el Escáner.',
    habitat: 'Hábitat', dex: 'Dex', scanner: 'Escáner', combat: 'Combate', ranking: 'Ranking',
    scanTitle: 'Escáner de figuras Flexi',
    cameraReady: 'Cámara lista. Encuadra la figura completa y mantén firme.',
    noCamera: 'Sin acceso a la cámara. Puedes subir una imagen.',
    newSpecies: '¡Nueva especie! +40 puntos', already: 'Ya la tenías en tu Dex',
    seeHabitat: 'Ver mi hábitat',
    noRecognize: 'No reconocí ninguna figura del catálogo',
    retry: 'Reintentar',
    dexHint: 'Consulta datos. Para registrar una especie usa el Escáner.',
  },
  en: {
    createWorld: 'Build your creature collection',
    createSub: 'Discover species with the scanner, train them and battle friends on another device.',
    openScan: 'Open scanner →',
    found: 'Found', maxLevel: 'Max level', points: 'Points',
    myCreatures: 'My creatures', noneYet: 'No creatures yet. Use the Scanner.',
    habitat: 'Habitat', dex: 'Dex', scanner: 'Scanner', combat: 'Combat', ranking: 'Ranking',
    scanTitle: 'Flexi figure scanner',
    cameraReady: 'Camera ready. Frame the full figure and hold steady.',
    noCamera: 'No camera access. You can upload an image.',
    newSpecies: 'New species! +40 points', already: 'Already in your Dex',
    seeHabitat: 'See my habitat',
    noRecognize: 'No catalog figure recognized',
    retry: 'Try again',
    dexHint: 'Browse data. To register a species use the Scanner.',
  },
  fr: {
    createWorld: 'Créez votre collection de créatures',
    createSub: 'Découvrez des espèces avec le scanner, entraînez-les et combattez des amis.',
    openScan: 'Ouvrir le scanner →',
    found: 'Découvertes', maxLevel: 'Niveau max.', points: 'Points',
    myCreatures: 'Mes créatures', noneYet: 'Aucune créature. Utilisez le Scanner.',
    habitat: 'Habitat', dex: 'Dex', scanner: 'Scanner', combat: 'Combat', ranking: 'Classement',
    scanTitle: 'Scanner de figures Flexi',
    cameraReady: 'Caméra prête. Cadrez la figure entière.',
    noCamera: "Pas d'accès caméra. Vous pouvez envoyer une image.",
    newSpecies: 'Nouvelle espèce ! +40 points', already: 'Déjà dans votre Dex',
    seeHabitat: 'Voir mon habitat',
    noRecognize: 'Aucune figure du catalogue reconnue',
    retry: 'Réessayer',
    dexHint: 'Consultez les données. Pour enregistrer une espèce utilisez le Scanner.',
  },
  de: {
    createWorld: 'Erstelle deine Kreaturen-Sammlung',
    createSub: 'Entdecke Arten mit dem Scanner, trainiere sie und kämpfe gegen Freunde.',
    openScan: 'Scanner öffnen →',
    found: 'Gefunden', maxLevel: 'Max. Level', points: 'Punkte',
    myCreatures: 'Meine Kreaturen', noneYet: 'Noch keine Kreaturen. Nutze den Scanner.',
    habitat: 'Habitat', dex: 'Dex', scanner: 'Scanner', combat: 'Kampf', ranking: 'Rangliste',
    scanTitle: 'Flexi-Figuren-Scanner',
    cameraReady: 'Kamera bereit. Figur vollständig einrahmen.',
    noCamera: 'Kein Kamerazugriff. Bild hochladen möglich.',
    newSpecies: 'Neue Art! +40 Punkte', already: 'Bereits im Dex',
    seeHabitat: 'Mein Habitat',
    noRecognize: 'Keine Katalogfigur erkannt',
    retry: 'Nochmal',
    dexHint: 'Daten ansehen. Zum Registrieren den Scanner nutzen.',
  },
  it: {
    createWorld: 'Crea la tua collezione di creature',
    createSub: 'Scopri specie con lo scanner, allenale e combatti contro amici.',
    openScan: 'Apri scanner →',
    found: 'Scoperte', maxLevel: 'Livello max.', points: 'Punti',
    myCreatures: 'Le mie creature', noneYet: 'Nessuna creatura. Usa lo Scanner.',
    habitat: 'Habitat', dex: 'Dex', scanner: 'Scanner', combat: 'Combattimento', ranking: 'Classifica',
    scanTitle: 'Scanner figure Flexi',
    cameraReady: 'Fotocamera pronta. Inquadra la figura intera.',
    noCamera: "Nessun accesso alla fotocamera. Puoi caricare un'immagine.",
    newSpecies: 'Nuova specie! +40 punti', already: 'Già nel tuo Dex',
    seeHabitat: 'Vedi il mio habitat',
    noRecognize: 'Nessuna figura del catalogo riconosciuta',
    retry: 'Riprova',
    dexHint: 'Consulta i dati. Per registrare una specie usa lo Scanner.',
  },
  ja: {
    createWorld: 'クリーチャーコレクションを作ろう',
    createSub: 'スキャナーで種を発見し、育てて友達と対戦。',
    openScan: 'スキャナーを開く →',
    found: '発見', maxLevel: '最大レベル', points: 'ポイント',
    myCreatures: '自分のクリーチャー', noneYet: 'まだいません。スキャナーを使ってください。',
    habitat: '生息地', dex: '図鑑', scanner: 'スキャナー', combat: 'バトル', ranking: 'ランキング',
    scanTitle: 'Flexiスキャナー',
    cameraReady: 'カメラ準備OK。全体を枠に入れてください。',
    noCamera: 'カメラにアクセスできません。画像をアップロードできます。',
    newSpecies: '新種！ +40ポイント', already: 'すでに図鑑にあります',
    seeHabitat: '生息地を見る',
    noRecognize: 'カタログのフィギュアを認識できませんでした',
    retry: 'もう一度',
    dexHint: 'データを確認。登録にはスキャナーを使ってください。',
  },
};
let lang = localStorage.getItem('critterdex-lang') || 'pt';
if (!T[lang]) lang = 'pt';
const t = (k) => (T[lang] && T[lang][k]) || T.pt[k] || k;
function setLang(code) {
  if (!T[code]) return;
  lang = code;
  localStorage.setItem('critterdex-lang', code);
  document.documentElement.lang = code;
  applyI18n();
  try { render(); } catch (e) {}
}
function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const k = el.getAttribute('data-i18n');
    if (T[lang] && T[lang][k]) el.textContent = T[lang][k];
  });
  const sel = $('langSelect');
  if (sel) sel.value = lang;
  // status texts that may already be set
  try {
    const cs = $('cameraStatus');
    if (cs && !cs.classList.contains('working')) {
      if (!cs.textContent || /Cámara|Câmera|Camera|Caméra|Kamera|Fotocamera|カメラ/.test(cs.textContent)) {
        /* leave runtime messages */
      }
    }
  } catch (e) {}
}

const E = window.CritterEngine;
const $ = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rnd = (a, b) => a + Math.random() * (b - a);
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

/* ───────────── Datos ───────────── */
const SPECIES = [
  { id: 'anteater', name: 'AntEaterFlexi', emoji: '🐜', rarity: 'Rara', desc: 'Explorador curioso con olfato extraordinario.', pow: 12 },
  { id: 'aligator', name: 'AligatorFlexi', emoji: '🐊', rarity: 'Épica', desc: 'Guardián resistente que adora el agua.', pow: 18 },
  { id: 'frog', name: 'FrogFlexi', emoji: '🐸', rarity: 'Común', desc: 'Pequeño saltarín, alegre y lleno de energía.', pow: 8 },
  { id: 'capybara', name: 'CapybaraFlexi', emoji: '🦫', rarity: 'Común', desc: 'Tranquilo y sociable.', pow: 9 },
  { id: 'fennec', name: 'FlexiFennecFox', emoji: '🦊', rarity: 'Rara', desc: 'Orejas que captan el sonido más suave.', pow: 13 },
  { id: 'lamb', name: 'LambFlexi', emoji: '🐑', rarity: 'Común', desc: 'Amable y paciente.', pow: 7 },
  { id: 'orca', name: 'OrcaFlexi', emoji: '🐳', rarity: 'Épica', desc: 'Nadadora poderosa con espíritu de equipo.', pow: 20 },
  { id: 'pig', name: 'PigFlexi', emoji: '🐷', rarity: 'Común', desc: 'Juguetona y aventurera.', pow: 8 },
  { id: 'triceratops', name: 'TricerotopsFlexi', emoji: '🦕', rarity: 'Legendaria', desc: 'Antiguo gigante de defensa formidable.', pow: 28 },
  { id: 'calf', name: 'HighlandCalf', emoji: '🐮', rarity: 'Rara', desc: 'Peludo, curioso y veloz.', pow: 14 },
  { id: 'guinea', name: 'GuinniePigFlexi', emoji: '🐹', rarity: 'Común', desc: 'Dulce y experto en bocadillos.', pow: 6 },
  { id: 'platypus', name: 'PlatypusFlexi', emoji: '🦆', rarity: 'Épica', desc: 'Misterio de la naturaleza.', pow: 17 },
  { id: 'bee', name: 'BeeFlexi', emoji: '🐝', rarity: 'Rara', desc: 'Vuela rápido y hace florecer el hábitat.', pow: 11 },
  { id: 'unicorn', name: 'UnicornFlexi', emoji: '🦄', rarity: 'Legendaria', desc: 'Envuelta en leyendas.', pow: 30 },
  { id: 'squirrel', name: 'SquirrelFlexi', emoji: '🐿️', rarity: 'Común', desc: 'Ágil y siempre con una sorpresa.', pow: 9 },
];
const bySpecies = id => SPECIES.find(s => s.id === id);
const RARITY_COLORS = {
  'Común': ['#9fb3d1', '#ffffff'], 'Rara': ['#5ef0c0', '#ffffff', '#3dd9a0'],
  'Épica': ['#a78bfa', '#6ec8ff', '#ffffff'], 'Legendaria': ['#ffd166', '#ff6b8a', '#a78bfa', '#6ec8ff', '#5ef0c0'],
};

const DEFAULT = { player: 'Explorador', points: 0, wins: 0, owned: {}, found: [], servers: [] };
let state;
try {
  state = { ...DEFAULT, ...JSON.parse(localStorage.getItem('critterdex-alpha') || '{}') };
  state.owned = state.owned || {}; state.found = state.found || [];
} catch { state = structuredClone(DEFAULT); }

const bc = ('BroadcastChannel' in window) ? new BroadcastChannel('critterdex-local') : null;
if (bc) bc.onmessage = e => { if (e.data?.type === 'rank') renderRank(); };

function save() {
  try {
    localStorage.setItem('critterdex-alpha', JSON.stringify(state));
    const board = JSON.parse(localStorage.getItem('critterdex-board') || '[]');
    const me = { name: state.player, points: state.points, wins: state.wins || 0, ts: Date.now() };
    const idx = board.findIndex(b => b.name === state.player);
    if (idx >= 0) board[idx] = me; else board.push(me);
    board.sort((a, b) => b.points - a.points);
    localStorage.setItem('critterdex-board', JSON.stringify(board.slice(0, 20)));
    bc?.postMessage({ type: 'rank' });
  } catch { /* almacenamiento lleno o bloqueado */ }
  render();
}

/* ───────────── Toasts ───────────── */
function toast(msg, kind = 'ok', ms = 3000) {
  const t = document.createElement('div');
  t.className = 'toast ' + kind; t.textContent = msg;
  $('toasts').appendChild(t);
  while ($('toasts').children.length > 3) $('toasts').firstChild.remove();
  setTimeout(() => { t.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(10px)' }], { duration: 250 }).onfinish = () => t.remove(); }, ms);
}

/* ───────────── Partículas ───────────── */
const FX = (() => {
  const cv = $('fx'), ctx = cv.getContext('2d');
  let W = 0, H = 0, parts = [], raf = 0, last = 0;
  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener('resize', resize); resize();
  function push(p) { parts.push(p); if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } }
  function burst(x, y, o = {}) {
    if (reduceMotion()) return;
    const n = o.n || 16, cols = o.colors || ['#fff'], sp = o.speed || 6;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = rnd(.3, 1) * sp;
      push({ t: 'c', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (o.up || 0), g: o.gravity ?? .22, life: o.life || 650, age: 0, s: rnd(.6, 1.2) * (o.size || 5), c: cols[i % cols.length], drag: .965 });
    }
  }
  function confetti(x, y, o = {}) {
    if (reduceMotion()) return;
    const n = o.n || 60, cols = o.colors || ['#5ef0c0', '#ffd166', '#ff6b8a', '#a78bfa', '#6ec8ff'];
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + rnd(-1, 1) * (o.spread || 1.1), v = rnd(5, 14) * (o.power || 1);
      push({ t: 'r', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: .28, life: rnd(1100, 1900), age: 0, w: rnd(6, 11), h: rnd(4, 7), rot: rnd(0, 6.28), vr: rnd(-.3, .3), c: cols[i % cols.length], drag: .985 });
    }
  }
  function ring(x, y, o = {}) {
    if (reduceMotion()) return;
    push({ t: 'o', x, y, r0: o.r0 || 8, r1: o.r1 || 130, life: o.life || 520, age: 0, c: o.color || '#fff', w: o.w || 4 });
  }
  function tick(now) {
    const dms = Math.max(0, now - last); const dt = Math.min(40, dms) / 16.67; last = now; // rAF puede traer una marca anterior a `last`
    ctx.clearRect(0, 0, W, H);
    parts = parts.filter(p => {
      p.age += dms; if (p.age >= p.life) return false;
      const k = p.age / p.life; ctx.globalAlpha = Math.max(0, 1 - k * k);
      if (p.t === 'o') {
        ctx.strokeStyle = p.c; ctx.lineWidth = p.w * (1 - k);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r0 + (p.r1 - p.r0) * (1 - Math.pow(1 - k, 3)), 0, 6.283); ctx.stroke();
        return true;
      }
      p.vx *= Math.pow(p.drag, dt); p.vy = p.vy * Math.pow(p.drag, dt) + p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      ctx.fillStyle = p.c;
      if (p.t === 'c') { ctx.beginPath(); ctx.arc(p.x, p.y, p.s * (1 - k * .6), 0, 6.283); ctx.fill(); }
      else { p.rot += p.vr * dt; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore(); }
      return true;
    });
    ctx.globalAlpha = 1;
    raf = parts.length ? requestAnimationFrame(tick) : 0;
    if (!raf) ctx.clearRect(0, 0, W, H);
  }
  return { burst, confetti, ring };
})();
const centerOf = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
const buzz = p => { try { navigator.vibrate?.(p); } catch { } };

/* ───────────── Hábitat / Dex ───────────── */
function cardHTML(s, i) {
  const p = state.owned[s.id], locked = !p;
  return `<article class="card r-${s.rarity} ${locked ? 'locked' : ''}" data-id="${s.id}" style="--i:${i}">
    <div class="emoji"><i>${locked ? '❓' : s.emoji}</i></div>
    <div>
      <h3>${locked ? '???' : esc(s.name)}</h3>
      <div class="meta">${s.rarity}${p ? ' · Nv ' + p.level : ''}</div>
      <p class="desc">${locked ? 'Usa el escáner IA para descubrir esta especie.' : esc(s.desc)}</p>
    </div>
    ${p ? `<div><small>XP ${p.xp}/100</small><div class="bar"><span style="width:${p.xp}%"></span></div>
      <small style="color:var(--muted)">🍎 ${p.hunger}% · ⚡ ${p.energy}%</small></div>
      <div class="actions">
        <button class="primary" aria-label="Alimentar" onclick="act('${s.id}','feed')">🍎</button>
        <button class="ghost" aria-label="Entrenar" onclick="act('${s.id}','train')">💪</button>
        <button class="ghost" aria-label="Descansar" onclick="act('${s.id}','rest')">😴</button>
      </div>` : ''}
  </article>`;
}

function filtered() {
  const q = ($('search')?.value || '').toLowerCase(), r = $('rarity')?.value || '';
  return SPECIES.filter(s => (s.name.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q)) && (!r || s.rarity === r));
}

function setStat(id, text) {
  const el = $(id); if (el.textContent === String(text)) return;
  el.textContent = text; el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick');
}

function render() {
  const owned = SPECIES.filter(s => state.owned[s.id]);
  $('myCreatures').innerHTML = owned.length ? owned.map((s, i) => cardHTML(s, i)).join('') : '<p class="muted">' + t('noneYet') + '</p>';
  renderDex();
  setStat('statFound', state.found.length + ' / ' + SPECIES.length);
  setStat('statLevel', Math.max(1, ...Object.values(state.owned).map(p => p.level)));
  setStat('statPoints', state.points);
  renderRank();
}
function renderDex() { $('dexGrid').innerHTML = filtered().map((s, i) => cardHTML(s, i)).join(''); }

function renderRank() {
  let board = JSON.parse(localStorage.getItem('critterdex-board') || '[]');
  if (!board.some(b => b.name === state.player)) board.push({ name: state.player, points: state.points, wins: state.wins || 0 });
  board = board.sort((a, b) => b.points - a.points).slice(0, 15);
  $('leaderboard').innerHTML = board.map((p, i) => {
    const cls = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '', you = p.name === state.player;
    return `<div class="rank-row ${you ? 'you' : ''}" style="--i:${i}">
      <div class="rank-num ${cls}">${i === 0 ? '👑' : '#' + (i + 1)}</div>
      <div style="flex:1"><strong>${esc(p.name)}${you ? ' · tú' : ''}</strong>
        <div class="muted" style="font-size:.8rem">${p.wins || 0} victorias</div></div>
      <strong>${p.points} pts</strong></div>`;
  }).join('') || '<p class="muted">Sin datos aún.</p>';
}

function bump(id, cls) {
  document.querySelectorAll(`#myCreatures .card[data-id="${id}"]`).forEach(c => {
    c.classList.remove('bump', 'levelup'); void c.offsetWidth; c.classList.add(cls);
    if (cls === 'levelup') { const p = centerOf(c); FX.confetti(p.x, p.y, { n: 40 }); FX.ring(p.x, p.y, { color: '#ffd166', r1: 150 }); }
  });
}

/** Suma XP a una criatura; devuelve cuántos niveles subió. */
function gainXp(id, amount) {
  const p = state.owned[id]; if (!p) return 0;
  p.xp += amount; let ups = 0;
  while (p.xp >= 100) { p.xp -= 100; p.level++; state.points += 25; ups++; }
  return ups;
}

function act(id, type) {
  const p = state.owned[id]; if (!p) return;
  let cls = 'bump';
  if (type === 'feed') { p.hunger = Math.min(100, p.hunger + 25); state.points += 2; }
  else if (type === 'train') {
    if (p.hunger < 15 || p.energy < 20) { toast('Necesita comer o descansar antes de entrenar.', 'warn'); return; }
    p.energy -= 20; p.hunger = Math.max(0, p.hunger - 10); state.points += 10;
    if (gainXp(id, 30)) { cls = 'levelup'; toast(`¡${bySpecies(id).name} sube a nivel ${p.level}!`, 'ok'); }
  } else { p.energy = Math.min(100, p.energy + 35); }
  save(); bump(id, cls);
}

function discover(id) {
  let isNew = false;
  if (!state.owned[id]) state.owned[id] = { level: 1, xp: 0, hunger: 70, energy: 75 };
  if (!state.found.includes(id)) { state.found.push(id); state.points += 40; isNew = true; }
  save();
  return isNew;
}

/* ───────────── Revelación de especie ───────────── */
function showReveal(sp, isNew) {
  const host = $('overlayHost');
  host.innerHTML = `<div class="reveal" role="dialog" aria-label="Especie descubierta">
    <div>
      <div class="flip r-${sp.rarity}" id="flip"><div class="inner">
        <div class="face front">❓</div>
        <div class="face back"><div class="bigE">${sp.emoji}</div><h3>${esc(sp.name)}</h3>
          <span class="pill">${sp.rarity}</span><p>${esc(sp.desc)}</p></div>
      </div></div>
      <div class="after" id="revealAfter">
        <p style="font-weight:800;font-size:1.1rem;margin-bottom:10px">${isNew ? '¡Nueva especie! +40 puntos' : 'Ya la tenías en tu Dex'}</p>
        <button class="primary" id="revealOk">Ver mi hábitat</button>
      </div>
    </div></div>`;
  const colors = RARITY_COLORS[sp.rarity];
  setTimeout(() => {
    $('flip')?.classList.add('go');
    setTimeout(() => {
      const c = centerOf($('flip'));
      if (isNew) {
        FX.confetti(c.x, c.y, { colors, n: sp.rarity === 'Legendaria' ? 140 : sp.rarity === 'Épica' ? 90 : 55, power: sp.rarity === 'Legendaria' ? 1.4 : 1 });
        FX.ring(c.x, c.y, { color: colors[0], r1: 220, life: 800 }); if (sp.rarity !== 'Común') FX.ring(c.x, c.y, { color: colors[1], r1: 300, life: 1000 });
        buzz([30, 40, 60]);
      }
      $('revealAfter')?.classList.add('show');
    }, 520);
  }, 650);
  $('revealOk').onclick = () => { host.innerHTML = ''; switchTab('habitat'); };
}

/* ───────────── Escáner IA ───────────── */
let stream = null, lastShots = null, scanBusy = false, statusTimer = 0;
let angleShots = []; // Uma imagem de cada ângulo, não três fotogramas quase idênticos.
const video = $('video'), preview = $('preview'), stage = $('scanStage');

function setScanStatus(text, working) {
  const el = $('cameraStatus'); el.textContent = text; el.classList.toggle('working', !!working);
}
function stopCamera() { stream?.getTracks().forEach(t => t.stop()); stream = null; video.srcObject = null; }

$('startCamera').onclick = async () => {
  if (scanBusy) return;
  try {
    stopCamera();
    angleShots = [];
    $('capture').textContent = 'Capturar ângulo 1/3';
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
    video.srcObject = stream; video.classList.remove('hidden'); preview.classList.add('hidden');
    $('capture').classList.remove('hidden'); $('modelResult').classList.add('hidden');
    setScanStatus('Câmera pronta. Enquadre a figura inteira; vamos analisar três ângulos.');
  } catch {
    setScanStatus('Sem acesso à câmera. Você pode enviar uma imagem.');
    toast('Não foi possível abrir a câmera.', 'warn');
  }
};

function drawScaled(src, maxSide = 896) {
  const w = src.videoWidth || src.naturalWidth || src.width, h = src.videoHeight || src.naturalHeight || src.height;
  const k = Math.min(1, maxSide / Math.max(w, h));
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
  c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
  return c;
}

/** Nitidez (RMS del laplaciano) y brillo medio sobre una versión pequeña. */
function imageQuality(c) {
  const s = Math.min(1, 160 / Math.max(c.width, c.height));
  const w = Math.max(16, Math.round(c.width * s)), h = Math.max(16, Math.round(c.height * s));
  const t = document.createElement('canvas'); t.width = w; t.height = h;
  const x = t.getContext('2d', { willReadFrequently: true }); x.drawImage(c, 0, 0, w, h);
  const d = x.getImageData(0, 0, w, h).data, g = new Float32Array(w * h); let sum = 0;
  for (let i = 0; i < w * h; i++) { const v = .299 * d[i * 4] + .587 * d[i * 4 + 1] + .114 * d[i * 4 + 2]; g[i] = v; sum += v; }
  let acc = 0, n = 0;
  for (let y = 1; y < h - 1; y++) for (let xx = 1; xx < w - 1; xx++) {
    const i = y * w + xx, l = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - w] - g[i + w]; acc += l * l; n++;
  }
  return { sharp: Math.sqrt(acc / n), mean: sum / (w * h) };
}

async function fileToCanvas(file) {
  if ('createImageBitmap' in window) {
    try { const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); const c = drawScaled(bmp); bmp.close?.(); return c; } catch { /* fallback */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    return drawScaled(img);
  } finally { URL.revokeObjectURL(url); }
}

$('capture').onclick = async () => {
  if (scanBusy || !stream || !video.videoWidth) return;
  scanBusy = true;
  const angleNumber = angleShots.length + 1;
  setScanStatus(`Capturando ângulo ${angleNumber} de 3… mantenha a figura inteira no quadro.`, true);

  // Em cada ângulo, escolhemos o fotograma mais nítido de uma pequena sequência.
  const burst = [];
  for (let i = 0; i < 3; i++) {
    const c = drawScaled(video);
    burst.push({ c, q: imageQuality(c) });
    if (i === 0 && $('viewfinder').animate) {
      $('viewfinder').animate([{ filter: 'brightness(1.8)' }, { filter: 'brightness(1)' }], { duration: 220 });
    }
    if (i < 2) await sleep(120);
  }
  burst.sort((a, b) => b.q.sharp - a.q.sharp);
  angleShots.push(burst[0]);

  if (angleShots.length < 3) {
    scanBusy = false;
    const next = angleShots.length + 1;
    $('capture').textContent = `Capturar ângulo ${next}/3`;
    setScanStatus(`Ângulo ${angleShots.length}/3 salvo. Gire a figura para mostrar outro lado e capture novamente.`);
    return;
  }

  const shots = angleShots.slice().sort((a, b) => b.q.sharp - a.q.sharp);
  angleShots = [];
  const q = {
    sharp: shots.reduce((sum, s) => sum + s.q.sharp, 0) / shots.length,
    mean: shots.reduce((sum, s) => sum + s.q.mean, 0) / shots.length,
  };
  preview.src = shots[0].c.toDataURL('image/jpeg', .88);
  preview.classList.remove('hidden');
  video.classList.add('hidden');
  $('capture').classList.add('hidden');
  stopCamera();
  scanBusy = false;
  await runScan(shots.map(s => s.c), q);
};

$('upload').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f || scanBusy) return;
  angleShots = [];
  scanBusy = true; setScanStatus('Preparando imagen…', true);
  try {
    const c = await fileToCanvas(f);
    preview.src = c.toDataURL('image/jpeg', .85); preview.classList.remove('hidden');
    video.classList.add('hidden'); $('capture').classList.add('hidden'); stopCamera();
    scanBusy = false;
    await runScan([c], imageQuality(c));
  } catch { scanBusy = false; setScanStatus('No pude leer esa imagen.'); toast('Formato de imagen no compatible.', 'err'); }
};

const SCAN_STEPS = ['Preparando a imagem', 'Analisando a silhueta', 'Comparando com as referências', 'Verificando pontos visuais'];

async function runScan(canvases, q) {
  if (scanBusy) return;
  scanBusy = true; lastShots = { canvases, q };
  $('modelResult').classList.add('hidden'); stage.classList.add('scanning');
  let step = 0; setScanStatus(SCAN_STEPS[0], true); clearInterval(statusTimer);
  statusTimer = setInterval(() => { step = Math.min(step + 1, SCAN_STEPS.length - 1); setScanStatus(SCAN_STEPS[step], true); }, 800);
  let res = { ok: false, error: 'local', message: 'Não foi possível analisar essa imagem.' };
  try {
    // Tudo é processado no navegador. O OpenCV é apenas uma biblioteca de visão clássica, não IA.
    if (window.EmojiMatch && typeof window.EmojiMatch.classify === 'function') {
      res = await window.EmojiMatch.classify(canvases);
    } else {
      res = { ok: true, speciesId: null, confidence: 0, candidates: [], isFigure: false, local: true,
        note: 'O módulo local de comparação não foi carregado. Atualize a página e tente novamente.' };
    }
  } catch (e) {
    console.warn('CritterDex local scanner', e);
    res = { ok: false, error: 'local', message: 'O reconhecimento local falhou. Tente outra fotografia.' };
  } finally {
    clearInterval(statusTimer); stage.classList.remove('scanning'); scanBusy = false;
  }
  showScanResult(res, q);
}
function scanError(res) {
  if (res.error === 'local') return res.message || 'Falha no reconhecimento local.';
  return res.message || 'Não consegui analisar a imagem. Tente de novo.';
}

function qualityHints(res, q) {
  const h = [];
  if (q?.mean < 45 || res?.quality === 'oscura') h.push('a foto está escura; tente mais iluminação');
  if (q?.sharp < 5 || res?.quality === 'borrosa') h.push('a foto está desfocada; apoie o celular e espere o foco');
  if (res?.quality === 'muy_lejos') h.push('aproxime um pouco a câmera');
  if (res?.quality === 'parcial') h.push('enquadre a figura inteira');
  return h;
}

function showScanResult(res, q) {
  const box = $('modelResult'); box.classList.remove('hidden');
  const retry = '<button class="ghost" id="retryScan">Tentar novamente</button>';
  if (!res.ok) {
    setScanStatus('Não foi possível concluir a análise.');
    box.innerHTML = `<p style="font-weight:700;margin-bottom:10px">⚠️ ${esc(scanError(res))}</p><div class="toolbar" style="justify-content:center">${retry}</div>`;
    $('retryScan').onclick = () => lastShots && runScan(lastShots.canvases, lastShots.q);
    return;
  }
  const hints = qualityHints(res, q);
  const cands = (res.candidates || []).filter(c => bySpecies(c.id) && c.confidence >= (res.local ? .06 : .15));
  const sure = !!(res.speciesId && res.confidence >= .72);
  const maybe = !sure && res.isFigure && cands[0] && cands[0].confidence >= (res.local ? .06 : .35);
  const localReason = '';
  const localNote = res.local ? `<p class="hint">Processamento local sem IA: silhuetas, proporções e pontos visuais. Os percentuais são índices de correspondência, não probabilidades. Confira as sugestões antes de escolher.</p>` : '';
  const candHTML = list => list.map((c, i) => {
    const s = bySpecies(c.id), pct = Math.round(c.confidence * 100);
    const tag = maybe ? 'button' : 'div';
    return `<${tag} class="cand ${i === 0 && sure ? 'main' : ''}" data-pick="${c.id}" style="--i:${i}">
      <span class="e">${s.emoji}</span><span><strong>${esc(s.name)}</strong><br><small>${s.rarity}</small>
      <div class="bar"><span style="width:0%" data-w="${pct}"></span></div></span><strong>${pct}%</strong></${tag}>`;
  }).join('');

  if (sure) {
    setScanStatus('Figura reconhecida!');
    box.innerHTML = `<p style="font-size:1.1rem;font-weight:800;margin-bottom:6px">É ${esc(bySpecies(res.speciesId).name)}</p>
      <p class="muted" style="margin-bottom:8px;font-size:.85rem">Índice de correspondência visual: ${Math.round(res.confidence * 100)}% (não é probabilidade de acerto)</p>
      ${candHTML([{ id: res.speciesId, confidence: res.confidence }, ...cands.filter(c => c.id !== res.speciesId).slice(0, 2)])}
      <div class="toolbar" style="justify-content:center;margin-top:10px"><button class="primary" id="confirmDiscover">Confirmar descoberta</button>${retry}</div>`;
    $('confirmDiscover').onclick = () => confirmScan(res.speciesId);
  } else if (maybe) {
    setScanStatus('Não tenho certeza. Qual é a criatura?');
    box.innerHTML = `<p style="font-weight:800;margin-bottom:4px">Ainda não tenho certeza</p>
      <p class="muted" style="font-size:.85rem;margin-bottom:6px">Escolha a espécie correta entre as sugestões.</p>${candHTML(cands.filter(c => c.confidence >= (res.local ? .06 : .35)))}
      ${localNote}${hints.length ? `<p class="hint">Dica: ${esc(hints.join(' · '))}.</p>` : ''}
      <div class="toolbar" style="justify-content:center;margin-top:10px">${retry}</div>`;
    box.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => confirmScan(b.dataset.pick));
  } else {
    setScanStatus('Não reconheci nenhuma espécie.');
    box.innerHTML = `<p style="font-weight:800;margin-bottom:6px">😕 Não reconheci nenhuma figura do catálogo</p>
      <p class="muted" style="font-size:.85rem;max-width:460px;margin:0 auto">${res.note ? esc(res.note) : 'Tente fotografar a figura inteira, de perfil e com um fundo simples.'}</p>
      ${hints.length ? `<p class="hint">Dica: ${esc(hints.join(' · '))}.</p>` : ''}
      <div class="toolbar" style="justify-content:center;margin-top:10px">${retry}</div>`;
  }
  $('retryScan')?.addEventListener('click', () => lastShots && runScan(lastShots.canvases, lastShots.q));
  requestAnimationFrame(() => requestAnimationFrame(() => box.querySelectorAll('.bar span[data-w]').forEach(s => s.style.width = s.dataset.w + '%')));
}

function confirmScan(id) {
  const sp = bySpecies(id); if (!sp) return;
  const isNew = discover(id);
  $('modelResult').classList.add('hidden');
  setScanStatus(isNew ? 'Espécie registrada na sua Dex!' : 'Essa espécie já está na sua Dex.');
  showReveal(sp, isNew);
}

/* ───────────── Combate ───────────── */
const B = {
  mode: null, role: 'A', code: null, peer: null, conn: null, names: { A: 'Rival', B: 'Rival' }, st: null,
  myPick: null, foePick: null, picks: { A: null, B: null }, buf: {}, round: 0, phase: 'idle', timerAnim: null,
  auto: false, turbo: false, rematch: { me: false, foe: false }, sid: 0, failsafe: 0, joinTimer: 0, rewarded: false, opp: false,
};
const CANCEL = Symbol('cancel');
const code4 = () => { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 4; i++) s += c[Math.floor(Math.random() * c.length)]; return s; };
const view = side => (side === B.role ? 'Me' : 'Foe');
const wrapOf = side => $('wrap' + view(side));
const myName = () => B.names[B.role];
const ICE = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' }];

function setStatus(text, live) { const s = $('srvStatus'); s.textContent = text; s.classList.toggle('live', !!live); }
function showOnly(parts) { // lobby | pick | arena
  $('serverInfo').classList.toggle('hidden', !parts.includes('server'));
  $('pickFighter').classList.toggle('hidden', !parts.includes('pick'));
  $('arena').classList.toggle('hidden', !parts.includes('arena'));
}

function localName() {
  const n = ($('playerName').value || state.player || 'Explorador').trim().slice(0, 16) || 'Explorador';
  state.player = n; return n;
}
function needCreature() {
  if (SPECIES.some(s => state.owned[s.id])) return false;
  toast('Necesitas al menos una criatura. Descúbrela con el escáner.', 'warn'); return true;
}

function resetSession(keepUI) {
  B.sid++; clearTimeout(B.failsafe); clearTimeout(B.joinTimer); stopTimer();
  try { B.conn?.close(); } catch { }
  try { B.peer?.destroy(); } catch { }
  Object.assign(B, { mode: null, role: 'A', code: null, peer: null, conn: null, st: null, myPick: null, foePick: null, picks: { A: null, B: null }, buf: {}, round: 0, phase: 'idle', rematch: { me: false, foe: false }, rewarded: false });
  B.names = { A: 'Rival', B: 'Rival' }; B.opp = false;
  $('overlayHost').innerHTML = '';
  if (!keepUI) showOnly([]);
}

function mkPeer(id) {
  if (typeof Peer === 'undefined') { toast('No se pudo cargar la red P2P. Revisa tu conexión o usa el modo bot.', 'err', 4500); return null; }
  return new Peer(id, { debug: 0, config: { iceServers: ICE } });
}

function showRoomUI(text, live) {
  showOnly(['server']);
  $('srvCode').textContent = B.code || '----';
  $('copyLink').classList.toggle('hidden', B.mode !== 'p2p');
  $('netHint').classList.toggle('hidden', B.mode !== 'p2p');
  setStatus(text, live);
}

$('createServer').onclick = () => {
  if (needCreature()) return;
  const name = localName(); resetSession(); B.mode = 'p2p'; B.role = 'A'; B.names.A = name;
  hostOpen(0);
};

function hostOpen(attempt) {
  const sid = B.sid; B.code = code4();
  const peer = mkPeer('cdx-' + B.code); if (!peer) { resetSession(); return; }
  B.peer = peer; showRoomUI('Creando sala…', true);
  peer.on('open', () => { if (sid !== B.sid) return; showRoomUI('Esperando rival… comparte el código', true); });
  peer.on('connection', conn => {
    if (sid !== B.sid) return;
    if (B.conn && B.conn.open) { conn.on('open', () => { try { conn.send({ t: 'full' }); } catch { } setTimeout(() => conn.close(), 300); }); return; }
    B.conn = conn; wireConn(conn, sid);
  });
  peer.on('error', err => {
    if (sid !== B.sid) return;
    if (err.type === 'unavailable-id' && attempt < 4) { try { peer.destroy(); } catch { } hostOpen(attempt + 1); return; }
    netError(err);
  });
  peer.on('disconnected', () => { try { if (sid === B.sid && !peer.destroyed) peer.reconnect(); } catch { } });
}

$('joinServer').onclick = () => {
  const code = ($('joinCode').value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== 4) { toast('El código tiene 4 caracteres.', 'warn'); return; }
  if (needCreature()) return;
  const name = localName(); resetSession(); B.mode = 'p2p'; B.role = 'B'; B.code = code; B.names.B = name;
  const sid = B.sid, peer = mkPeer(); if (!peer) { resetSession(); return; }
  B.peer = peer; showRoomUI('Conectando…', true);
  peer.on('open', () => {
    if (sid !== B.sid) return;
    const conn = peer.connect('cdx-' + code, { reliable: true }); B.conn = conn; wireConn(conn, sid);
    B.joinTimer = setTimeout(() => { if (sid === B.sid && !(B.conn && B.conn.open)) joinFailed(); }, 9000);
  });
  peer.on('error', err => { if (sid !== B.sid) return; if (err.type === 'peer-unavailable') joinFailed(); else netError(err); });
};

function joinFailed() {
  clearTimeout(B.joinTimer);
  setStatus(`No encontré la sala ${B.code}. Revisa el código o pídele a tu rival que la cree de nuevo.`, false);
  toast('Sala no encontrada.', 'err');
  try { B.conn?.close(); B.peer?.destroy(); } catch { } B.conn = null; B.peer = null;
}
function netError(err) {
  const map = { network: 'Sin conexión con el servidor de salas.', 'server-error': 'El servidor de salas no responde.', 'socket-error': 'Se perdió la conexión con el servidor de salas.', 'browser-incompatible': 'Tu navegador no soporta WebRTC.' };
  toast(map[err?.type] || 'Error de red: ' + (err?.type || 'desconocido'), 'err', 4500);
  setStatus('Error de conexión. Pulsa Salir e inténtalo de nuevo.', false);
}

function wireConn(conn, sid) {
  const onOpen = () => { if (sid !== B.sid) return; clearTimeout(B.joinTimer); send({ t: 'hello', name: myName() }); };
  if (conn.open) onOpen(); else conn.on('open', onOpen);
  conn.on('data', m => { if (sid === B.sid) onData(m); });
  conn.on('close', () => { if (sid === B.sid && B.conn === conn) opponentLeft(); });
  conn.on('error', () => { if (sid === B.sid && B.conn === conn) opponentLeft(); });
}
function send(m) { try { if (B.conn && B.conn.open) B.conn.send(m); } catch { } }

function onData(m) {
  if (!m || typeof m !== 'object') return;
  switch (m.t) {
    case 'full': toast('La sala ya está llena.', 'err'); resetSession(); break;
    case 'hello': onHello(m); break;
    case 'pick': if (B.role === 'A') hostReceivePick(m); break;
    case 'start': if (B.role === 'B') guestStart(m); break;
    case 'move': if (B.role === 'A') hostReceiveMove(m); break;
    case 'result': if (B.role === 'B') guestResult(m); break;
    case 'rematch': B.rematch.foe = true; checkRematch(); break;
    case 'leave': opponentLeft(); break;
  }
}

function onHello(m) {
  const name = String(m.name || 'Rival').replace(/[\u0000-\u001f]/g, '').slice(0, 16) || 'Rival';
  B.names[E.other(B.role)] = name;
  if (!B.opp) {
    B.opp = true; toast(`${name} conectado`, 'ok');
    startPick(`${name} está en la sala. Elige tu luchador.`);
  }
}

function startPick(statusText) {
  B.phase = 'pick'; B.myPick = null; B.foePick = null; B.st = null;
  if (B.mode === 'p2p') showRoomUI(statusText, true);
  showOnly(B.mode === 'p2p' ? ['server', 'pick'] : ['pick']);
  const owned = SPECIES.filter(s => state.owned[s.id]);
  $('fighterPick').innerHTML = owned.map((s, i) => `<button class="card r-${s.rarity}" style="--i:${i};align-items:center;text-align:center" data-f="${s.id}">
      <div class="emoji"><i>${s.emoji}</i></div><strong>${esc(s.name)}</strong><div class="meta">Nv ${state.owned[s.id].level}</div></button>`).join('');
  $('fighterPick').querySelectorAll('[data-f]').forEach(b => b.onclick = () => chooseFighter(b.dataset.f));
  $('pickFighter').classList.add('enter'); setTimeout(() => $('pickFighter').classList.remove('enter'), 1000);
}

function fighterFor(id, level) {
  const sp = bySpecies(id); if (!sp) return null;
  const lv = Math.max(1, Math.min(30, Math.round(Number(level) || 1)));
  return { id: sp.id, name: sp.name, emoji: sp.emoji, level: lv, pow: sp.pow + lv * 2 };
}

function chooseFighter(id) {
  if (B.phase !== 'pick' || B.myPick) return;
  const f = fighterFor(id, state.owned[id].level); if (!f) return;
  B.myPick = f;
  $('fighterPick').querySelectorAll('[data-f]').forEach(b => { b.disabled = true; b.style.opacity = b.dataset.f === id ? 1 : .35; });
  if (B.mode === 'bot') {
    const sp = SPECIES[Math.floor(Math.random() * SPECIES.length)];
    const lv = Math.max(1, Math.min(30, f.level + Math.floor(Math.random() * 3) - 1));
    B.foePick = fighterFor(sp.id, lv); B.names.B = 'Bot'; hostBegin();
  } else if (B.role === 'A') {
    setStatus('Esperando que tu rival elija…', true); hostMaybeBegin();
  } else {
    send({ t: 'pick', id: f.id, level: f.level }); setStatus('Esperando que tu rival elija…', true);
  }
}

function hostReceivePick(m) {
  if (B.phase !== 'pick' || B.foePick) return;
  const f = fighterFor(m.id, m.level); if (!f) return;
  B.foePick = f; hostMaybeBegin();
}
function hostMaybeBegin() { if (B.myPick && B.foePick) hostBegin(); }

function hostBegin() {
  B.st = E.createBattle(B.myPick, B.foePick); B.rewarded = false; B.buf = {};
  if (B.mode === 'p2p') send({ t: 'start', state: B.st, names: B.names });
  enterArena();
}
function guestStart(m) {
  if (B.phase !== 'pick' || !m.state?.A || !m.state?.B) return;
  B.st = m.state; if (m.names?.A) B.names.A = String(m.names.A).slice(0, 16); B.rewarded = false;
  enterArena();
}

/* —— Arena —— */
const floatersBox = () => $('floaters');
function stageRel(el) { const s = $('stage').getBoundingClientRect(), c = centerOf(el); return { x: c.x - s.left, y: c.y - s.top }; }

function hpClass(hp, max) { const p = hp / max; return p < .28 ? 'low' : p < .55 ? 'mid' : ''; }
function setHp(side, hp, max) {
  const v = view(side), pct = Math.max(0, hp / max * 100);
  $('' + v.toLowerCase() + 'Hp').style.width = pct + '%';
  $('' + v.toLowerCase() + 'Ghost').style.width = pct + '%';
  const bar = $(v.toLowerCase() + 'HpBar'); bar.classList.remove('low', 'mid'); const c = hpClass(hp, max); if (c) bar.classList.add(c);
  $(v.toLowerCase() + 'HpNum').textContent = `${Math.max(0, Math.round(hp))} / ${max} PS`;
}
function setMeter(side, m) {
  const v = view(side).toLowerCase(), el = $(v + 'Mt'); el.firstElementChild.style.width = m + '%'; el.classList.toggle('full', m >= E.METER_MAX);
  if (view(side) === 'Me') { $('spcBtn').style.setProperty('--m', m + '%'); $('spcBtn').classList.toggle('ready', m >= E.METER_MAX); $('spcSub').textContent = m >= E.METER_MAX ? '¡Listo!' : `Carga ${Math.round(m)}%`; }
}
function updateBars(st) {
  for (const side of ['A', 'B']) { setHp(side, st[side].hp, st[side].maxHp); setMeter(side, st[side].meter); }
}
function renderFighters() {
  const me = B.st[B.role], foe = B.st[E.other(B.role)];
  $('meEmoji').textContent = me.emoji; $('foeEmoji').textContent = foe.emoji;
  $('meName').textContent = myName(); $('foeName').textContent = B.names[E.other(B.role)];
  $('meSub').textContent = `${me.name} · Nv ${me.level}`; $('foeSub').textContent = `${foe.name} · Nv ${foe.level}`;
}
function setBanner(html, pop) { const b = $('banner'); b.innerHTML = html; b.classList.remove('pop'); if (pop) { void b.offsetWidth; b.classList.add('pop'); } }
function logLine(html) { const l = $('battleLog'), d = document.createElement('div'); d.innerHTML = html; l.appendChild(d); while (l.children.length > 40) l.firstChild.remove(); l.scrollTop = l.scrollHeight; }

function bigText(text, color, ms = 900) {
  const b = $('bigText'); b.innerHTML = `<span style="color:${color || '#fff'}">${esc(text)}</span>`;
  const s = b.firstElementChild;
  s.animate([{ transform: 'scale(.2) rotate(-8deg)', opacity: 0 }, { transform: 'scale(1.25) rotate(2deg)', opacity: 1, offset: .3 }, { transform: 'scale(1)', opacity: 1, offset: .7 }, { transform: 'scale(1.1)', opacity: 0 }], { duration: ms, easing: 'ease-out' });
  setTimeout(() => { if (b.firstElementChild === s) b.innerHTML = ''; }, ms);
}
function floatText(side, text, cls) {
  const p = stageRel(wrapOf(side)), d = document.createElement('div');
  d.className = 'dmg ' + (cls || ''); d.textContent = text; d.style.left = (p.x + rnd(-18, 18)) + 'px'; d.style.top = (p.y - 20) + 'px';
  floatersBox().appendChild(d); setTimeout(() => d.remove(), 1000);
}
function shakeStage(px, ms = 320) {
  if (reduceMotion()) return;
  const f = [{ transform: 'translate(0,0)' }];
  for (let i = 0; i < 8; i++) { const k = 1 - i / 8; f.push({ transform: `translate(${rnd(-px, px) * k}px,${rnd(-px, px) * k}px)` }); }
  f.push({ transform: 'translate(0,0)' });
  $('stage').animate(f, { duration: ms });
}
function flashStage(color, peak, ms) { const el = $('flash'); el.style.background = color; el.animate([{ opacity: peak }, { opacity: 0 }], { duration: ms }); }

function enterArena() {
  B.phase = 'intro'; B.picks = { A: null, B: null };
  showOnly(B.mode === 'p2p' ? ['server', 'arena'] : ['arena']);
  if (B.mode === 'p2p') setStatus('Combate en curso', true);
  ['Me', 'Foe'].forEach(v => { $('wrap' + v).getAnimations().forEach(a => a.cancel()); $('sh' + v).classList.remove('on'); });
  $('battleLog').innerHTML = ''; renderFighters(); updateBars(B.st);
  ['atkBtn', 'defBtn', 'spcBtn'].forEach(id => { $(id).disabled = true; $(id).classList.remove('picked'); });
  logLine(`⚔️ <b>${esc(B.names.A)}</b> (${esc(B.st.A.name)}) vs <b>${esc(B.names.B)}</b> (${esc(B.st.B.name)})`);
  $('arena').scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
  runIntro();
}

async function runIntro() {
  const sid = B.sid, spd = B.turbo ? 1.8 : 1;
  try {
    $('wrapMe').animate([{ transform: 'translateX(-120%) scale(.6)', opacity: 0 }, { transform: 'translateX(8%) scale(1.1)', opacity: 1, offset: .7 }, { transform: 'translateX(0) scale(1)' }], { duration: 700 / spd, easing: 'cubic-bezier(.2,.9,.3,1)' });
    $('wrapFoe').animate([{ transform: 'translateX(120%) scale(.6)', opacity: 0 }, { transform: 'translateX(-8%) scale(1.1)', opacity: 1, offset: .7 }, { transform: 'translateX(0) scale(1)' }], { duration: 700 / spd, easing: 'cubic-bezier(.2,.9,.3,1)' });
    setBanner('');
    await sleep(750 / spd); if (sid !== B.sid) return;
    bigText('VS', '#ff6b8a', 700); buzz(30); shakeStage(5);
    const c = centerOf($('stage')); FX.ring(c.x, c.y, { color: '#ff6b8a', r1: 160 });
    await sleep(750 / spd); if (sid !== B.sid) return;
    bigText('¡COMBATE!', '#ffd166', 700);
    await sleep(600 / spd); if (sid !== B.sid) return;
    beginRound();
  } catch { /* cancelado */ }
}

/* —— Rondas —— */
const TURN_SECONDS = 10;
function stopTimer() { try { B.timerAnim?.cancel(); } catch { } B.timerAnim = null; }
function startTimer() {
  stopTimer(); const sid = B.sid, round = B.round; const f = $('timerFill');
  if (reduceMotion()) { f.style.transform = 'scaleX(1)'; B.timerAnim = null; setTimeout(() => { if (sid === B.sid && B.phase === 'input' && B.round === round) chooseMove('atk'); }, TURN_SECONDS * 1000); return; }
  B.timerAnim = f.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: TURN_SECONDS * 1000, easing: 'linear', fill: 'forwards' });
  B.timerAnim.onfinish = () => { if (sid === B.sid && B.phase === 'input' && B.round === round) chooseMove('atk'); };
}

function beginRound() {
  if (!B.st || B.st.over) return;
  B.round = B.st.round + 1; B.picks = { A: null, B: null };
  if (B.role === 'A' && B.mode === 'p2p' && B.buf[B.round]) { B.picks.B = B.buf[B.round]; delete B.buf[B.round]; }
  B.phase = 'input';
  setBanner(`Ronda <b>${B.round}</b>`, true);
  const mine = B.st[B.role], canSpc = mine.meter >= E.METER_MAX;
  ['atkBtn', 'defBtn'].forEach(id => { $(id).disabled = false; $(id).classList.remove('picked'); });
  $('spcBtn').disabled = !canSpc; $('spcBtn').classList.remove('picked');
  startTimer();
  if (B.role === 'A' && B.mode === 'p2p') {
    clearTimeout(B.failsafe); const sid = B.sid, round = B.round;
    B.failsafe = setTimeout(() => { if (sid === B.sid && B.round === round && (B.phase === 'input' || B.phase === 'wait')) { B.picks.A = B.picks.A || 'atk'; B.picks.B = B.picks.B || 'atk'; hostResolve(); } }, (TURN_SECONDS + 4) * 1000);
  }
  if (B.auto) { const sid = B.sid, round = B.round; setTimeout(() => { if (sid === B.sid && B.phase === 'input' && B.round === round) chooseMove(E.chooseAIMove(B.st, B.role)); }, 450 / (B.turbo ? 1.8 : 1)); }
}

const MOVE_BTN = { atk: 'atkBtn', def: 'defBtn', spc: 'spcBtn' };
function chooseMove(m) {
  if (B.phase !== 'input') return;
  m = E.sanitizeMove(B.st, B.role, m);
  B.phase = 'wait'; stopTimer();
  ['atkBtn', 'defBtn', 'spcBtn'].forEach(id => { $(id).disabled = true; $(id).classList.remove('picked'); });
  $(MOVE_BTN[m]).classList.add('picked');
  if (B.role === 'A') { B.picks.A = m; hostCheck(); }
  else { send({ t: 'move', round: B.round, move: m }); setBanner(`Ronda <b>${B.round}</b> · esperando al rival…`); }
}

function hostReceiveMove(m) {
  const mv = E.MOVES.includes(m.move) ? m.move : 'atk', r = Number(m.round);
  if (r === B.round && !B.picks.B && (B.phase === 'input' || B.phase === 'wait')) { B.picks.B = mv; hostCheck(); }
  else if (r === B.round + 1) B.buf[r] = mv; // llegó antes de que el host termine de animar
}
function hostCheck() {
  if (B.phase !== 'wait') return; // el host aún no eligió
  if (B.picks.A && (B.picks.B || B.mode === 'bot')) hostResolve();
}
function hostResolve() {
  clearTimeout(B.failsafe);
  if (B.phase !== 'input' && B.phase !== 'wait') return;
  const mA = B.picks.A || 'atk', mB = B.mode === 'bot' ? E.chooseAIMove(B.st, 'B') : (B.picks.B || 'atk');
  const prev = B.st, res = E.resolveRound(prev, mA, mB); B.st = res.state;
  if (B.mode === 'p2p') send({ t: 'result', round: res.state.round, events: res.events, moves: res.moves, state: res.state });
  playRound(prev, res);
}
function guestResult(m) {
  if (!B.st || !m.state || Number(m.round) !== B.st.round + 1 || B.phase === 'anim') return;
  const prev = B.st; B.st = m.state; stopTimer();
  playRound(prev, { events: Array.isArray(m.events) ? m.events : [], moves: m.moves || {}, state: m.state });
}

async function playRound(prev, res) {
  const sid = B.sid; B.phase = 'anim'; stopTimer();
  ['atkBtn', 'defBtn', 'spcBtn'].forEach(id => { $(id).disabled = true; });
  try {
    await playEvents(res.events, res.state, sid);
    if (sid !== B.sid) return;
    if (res.state.over) finishBattle(); else beginRound();
  } catch (e) { if (e !== CANCEL) console.error(e); }
}

function evName(side) { return `<b>${esc(B.st[side].name)}</b>`; }
function logEvent(e) {
  if (e.kind === 'guard') logLine(`🛡️ ${evName(e.from)} se cubre${e.weak ? ' (guardia debilitada)' : ''}`);
  else if (e.kind === 'standoff') logLine('😤 Tensión: ambos se cubren y se desgastan');
  else if (e.kind === 'spc') logLine(`✨ ${evName(e.from)} desata su especial: −${e.dmg}${e.blocked ? ' (parcialmente bloqueado)' : ''}`);
  else logLine(`⚔️ ${evName(e.from)} golpea a ${evName(e.to)}: −${e.dmg}${e.crit ? ' ¡CRÍTICO!' : ''}${e.blocked ? ' (bloqueado)' : ''}`);
}

async function playEvents(events, next, sid) {
  const spd = B.turbo ? 1.8 : 1;
  const w = async ms => { await sleep(ms / spd); if (sid !== B.sid) throw CANCEL; };
  const guards = events.filter(e => e.kind === 'guard');
  for (const g of guards) {
    $('sh' + view(g.from)).classList.add('on'); floatText(g.from, '🛡️ Guardia', 'block txt'); logEvent(g);
    const c = centerOf(wrapOf(g.from)); FX.ring(c.x, c.y, { color: '#6ec8ff', r1: 90 }); FX.burst(c.x, c.y, { colors: ['#6ec8ff', '#fff'], n: 10, speed: 4 });
    setMeter(g.from, g.meter);
  }
  if (guards.length) await w(420);
  for (const e of events) {
    if (e.kind === 'standoff') {
      logEvent(e); bigText('¡Tensión!', '#9fd6ff', 700); shakeStage(5);
      setHp('A', e.hpA, next.A.maxHp); setHp('B', e.hpB, next.B.maxHp);
      ['A', 'B'].forEach(s => floatText(s, '−' + Math.max(1, Math.round(next[s].maxHp * .06)), 'block'));
      await w(650);
    } else if (e.kind === 'atk' || e.kind === 'spc') await playHit(e, next, w, spd);
  }
  ['Me', 'Foe'].forEach(v => $('sh' + v).classList.remove('on'));
  updateBars(next);
  await w(next.over ? 350 : 180);
}

async function playHit(e, next, w, spd) {
  const from = wrapOf(e.from), to = wrapOf(e.to), special = e.kind === 'spc';
  const dirSign = view(e.from) === 'Me' ? 1 : -1;
  logEvent(e);
  if (special) {
    bigText('✨ ESPECIAL', '#d6c4ff', 900); buzz(25);
    const c = centerOf(from);
    FX.ring(c.x, c.y, { color: '#a78bfa', r1: 140, life: 600 }); FX.burst(c.x, c.y, { colors: ['#a78bfa', '#6ec8ff', '#fff'], n: 22, speed: 5, gravity: -.05 });
    from.animate([{ transform: 'scale(1)', filter: 'brightness(1)' }, { transform: 'scale(1.3)', filter: 'brightness(2.2) drop-shadow(0 0 22px #ffd166)' }, { transform: 'scale(1.15)', filter: 'brightness(1.6)' }], { duration: 480 / spd, fill: 'forwards' });
    flashStage('#a78bfa', .35, 480 / spd);
    await w(500);
    from.getAnimations().forEach(a => a.cancel());
  }
  const dx = (centerOf(to).x - centerOf(from).x) * .74, dur = special ? 640 : 500;
  from.animate([
    { transform: 'translate(0,0) scale(1)' },
    { transform: `translate(${-dirSign * 24}px,2px) scale(.9,1.14)`, offset: .25 },
    { transform: `translate(${dx}px,-16px) scale(1.2,.88)`, offset: .55 },
    { transform: 'translate(0,0) scale(1)' }], { duration: dur / spd, easing: 'cubic-bezier(.3,.8,.3,1)' });
  await w(dur * .55);
  // ── impacto ──
  const p = centerOf(to), blocked = e.blocked, crit = e.crit;
  const cols = blocked ? ['#6ec8ff', '#fff', '#9fd6ff'] : special ? ['#a78bfa', '#ffd166', '#fff', '#ff6b8a'] : crit ? ['#ffd166', '#fff', '#ff9a3c'] : ['#ff6b8a', '#ffd166', '#fff'];
  FX.burst(p.x, p.y, { colors: cols, n: special ? 34 : crit ? 26 : 16, speed: special ? 11 : crit ? 9 : 6.5, size: special ? 7 : 5 });
  FX.ring(p.x, p.y, { color: cols[0], r1: special ? 190 : 110, life: special ? 650 : 420 });
  if (special) FX.ring(p.x, p.y, { color: '#fff', r1: 260, life: 800, w: 6 });
  to.animate([
    { transform: 'translate(0,0) rotate(0)' },
    { transform: `translate(${dirSign * (blocked ? 8 : 26)}px,-6px) rotate(${dirSign * (blocked ? 3 : 12)}deg) scale(.92,1.08)`, offset: .3 },
    { transform: 'translate(0,0) rotate(0)' }], { duration: 360 / spd, easing: 'ease-out' });
  const sprite = to.querySelector('.sprite');
  sprite?.animate([{ filter: 'brightness(3) saturate(0)' }, { filter: 'brightness(1)' }], { duration: 260 });
  flashStage(special ? '#ffffff' : blocked ? '#6ec8ff' : '#ff6b8a', special ? .75 : crit ? .45 : .25, special ? 520 : 240);
  shakeStage(special ? 18 : crit ? 12 : blocked ? 3 : 7, special ? 520 : 320);
  floatText(e.to, (blocked ? '🛡️ ' : '−') + e.dmg, special ? 'spc' : crit ? 'crit' : blocked ? 'block' : '');
  if (crit) { bigText('¡CRÍTICO!', '#ffd166', 700); }
  buzz(special ? [40, 30, 90] : crit ? [30, 20, 40] : 18);
  setHp(e.to, e.hp, next[e.to].maxHp); setMeter(e.from, e.meterFrom); setMeter(e.to, e.meterTo);
  await w(dur * .45 + (special ? 220 : 110));
  if (e.ko) {
    const c = centerOf(to), d = view(e.to) === 'Me' ? -1 : 1;
    to.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: `translate(${d * 70}px,-40px) rotate(${d * 40}deg)`, opacity: 1, offset: .35 }, { transform: `translate(${d * 140}px,90px) rotate(${d * 160}deg)`, opacity: 0 }], { duration: 900 / spd, fill: 'forwards', easing: 'ease-in' });
    FX.burst(c.x, c.y, { colors: ['#fff', '#ffd166', '#ff6b8a'], n: 40, speed: 12, life: 900 }); FX.ring(c.x, c.y, { color: '#fff', r1: 280, life: 900, w: 7 });
    bigText('¡K.O.!', '#ff6b8a', 1100); shakeStage(20, 600); buzz([60, 40, 120]);
    await w(1000);
  }
}

/* —— Fin de combate —— */
function finishBattle() {
  B.phase = 'over'; stopTimer();
  const iWon = B.st.winner === B.role; let pts = 0, xp = 0, ups = 0;
  if (!B.rewarded) {
    B.rewarded = true;
    if (iWon) { pts = 30; state.points += 30; state.wins = (state.wins || 0) + 1; } else { pts = -Math.min(5, state.points); state.points = Math.max(0, state.points - 5); }
    xp = iWon ? 30 : 12; ups = gainXp(B.st[B.role].id, xp); save();
  }
  showEnd({ iWon, pts, xp, ups, forfeit: false });
}

function showEnd({ iWon, pts, xp, ups, forfeit }) {
  const my = B.st?.[B.role];
  $('overlayHost').innerHTML = `<div class="endbox" role="dialog" aria-label="Resultado"><div class="endcard ${iWon ? 'win' : 'lose'}">
    <div class="trophy">${iWon ? '🏆' : '💥'}</div>
    <h2>${forfeit ? '¡Victoria por abandono!' : iWon ? '¡Victoria!' : 'Derrota'}</h2>
    <p class="muted">${iWon ? 'Tu criatura se luce en la arena.' : 'La próxima será. ¡Pide la revancha!'} · ${B.st ? B.st.round : 0} rondas</p>
    <div class="rw">
      ${pts ? `<span style="--i:0">${pts > 0 ? '+' : ''}${pts} pts</span>` : ''}
      ${xp ? `<span style="--i:1">+${xp} XP${my ? ' · ' + esc(my.name) : ''}</span>` : ''}
      ${ups ? `<span style="--i:2">⬆️ ¡Nivel ${state.owned[my.id].level}!</span>` : ''}
    </div>
    <div class="row">
      ${forfeit ? '' : '<button class="primary" id="rematchBtn">⚔️ Revancha</button>'}
      <button class="ghost" id="exitBtn">Salir</button>
    </div></div></div>`;
  if (iWon) {
    const w = innerWidth, h = innerHeight;
    FX.confetti(w * .3, h * .7, { n: 70, power: 1.2 }); FX.confetti(w * .7, h * .7, { n: 70, power: 1.2 }); buzz([40, 40, 40, 40, 120]);
  }
  $('exitBtn').onclick = leave;
  const rb = $('rematchBtn'); if (rb) rb.onclick = () => { B.rematch.me = true; rb.disabled = true; rb.textContent = B.mode === 'p2p' ? 'Esperando al rival…' : '…'; send({ t: 'rematch' }); checkRematch(); };
}

function checkRematch() {
  if (B.phase !== 'over') return;
  if (B.mode === 'bot' ? B.rematch.me : (B.rematch.me && B.rematch.foe)) {
    B.rematch = { me: false, foe: false }; $('overlayHost').innerHTML = ''; startPick('¡Revancha! Elige tu luchador.');
  } else if (B.rematch.foe && !B.rematch.me) toast('Tu rival quiere la revancha', 'ok');
}

function opponentLeft() {
  if (B.mode !== 'p2p' || B.phase === 'idle' && !B.code) return;
  const name = B.names[E.other(B.role)] || 'Tu rival';
  if ((B.phase === 'input' || B.phase === 'wait' || B.phase === 'anim' || B.phase === 'intro') && B.st && !B.st.over) {
    B.sid++; stopTimer(); clearTimeout(B.failsafe); B.phase = 'over'; B.st.over = true; B.st.winner = B.role;
    toast(`${name} se desconectó`, 'warn', 4000); showEnd({ iWon: true, pts: 0, xp: 0, ups: 0, forfeit: true });
  } else if (B.phase === 'over') {
    toast(`${name} salió de la sala`, 'warn'); const rb = $('rematchBtn'); if (rb) { rb.disabled = true; rb.textContent = 'Rival desconectado'; }
  } else {
    toast(`${name} salió de la sala`, 'warn');
    if (B.role === 'A') { B.conn = null; B.opp = false; B.names.B = 'Rival'; B.myPick = null; B.foePick = null; B.phase = 'idle'; showRoomUI('Esperando rival… comparte el código', true); $('pickFighter').classList.add('hidden'); }
    else { resetSession(); }
  }
}

function leave() { send({ t: 'leave' }); resetSession(); }
$('leaveServer').onclick = leave;

$('botBtn').onclick = () => {
  if (needCreature()) return;
  const name = localName(); resetSession(); B.mode = 'bot'; B.role = 'A'; B.names.A = name; B.names.B = 'Bot'; B.code = null;
  startPick('Elige tu luchador.');
};

$('copyLink').onclick = async () => {
  const url = `${location.origin}${location.pathname}?join=${B.code}`;
  try { await navigator.clipboard.writeText(url); toast('Enlace copiado. ¡Pásaselo a tu rival!', 'ok'); }
  catch { toast(url, 'ok', 6000); }
};

$('atkBtn').onclick = () => chooseMove('atk');
$('defBtn').onclick = () => chooseMove('def');
$('spcBtn').onclick = () => chooseMove('spc');
function toggle(btn, key, label) {
  btn.onclick = () => { B[key] = !B[key]; btn.classList.toggle('on', B[key]); btn.setAttribute('aria-pressed', B[key]); btn.textContent = `${label}: ${B[key] ? 'sí' : 'no'}`; if (key === 'auto' && B.auto && B.phase === 'input') chooseMove(E.chooseAIMove(B.st, B.role)); };
}
toggle($('autoBtn'), 'auto', '🤖 Auto'); toggle($('turboBtn'), 'turbo', '⏩ Turbo');
addEventListener('keydown', ev => {
  if (B.phase !== 'input' || ev.target.matches?.('input,select,textarea') || ev.metaKey || ev.ctrlKey) return;
  const k = ev.key.toLowerCase();
  if (k === 'a' || k === '1') chooseMove('atk'); else if (k === 'd' || k === '2') chooseMove('def'); else if (k === 's' || k === '3') chooseMove('spc');
});

/* ───────────── Navegación y extras ───────────── */
function switchTab(id) {
  document.querySelectorAll('.page').forEach(p => {
    const show = p.id === id; p.classList.toggle('hidden', !show);
    if (show) { p.classList.remove('enter'); void p.offsetWidth; p.classList.add('enter'); setTimeout(() => p.classList.remove('enter'), 1200); }
  });
  document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === id));
  if (id === 'rank') renderRank();
  if (id !== 'scan' && stream) { stopCamera(); video.classList.add('hidden'); $('capture').classList.add('hidden'); }
  window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' });
}
document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
$('search').addEventListener('input', renderDex);
$('rarity').addEventListener('change', renderDex);
$('saveName').onclick = () => {
  const n = $('rankName').value.trim().slice(0, 16);
  if (n) { state.player = n; save(); toast('Nombre guardado', 'ok'); }
};
$('logo').onclick = () => { const c = centerOf($('logo')); FX.burst(c.x, c.y, { colors: ['#5ef0c0', '#a78bfa', '#ffd166'], n: 18, speed: 6 }); };
$('mascot').onclick = () => {
  const m = $('mascot'), s = SPECIES[Math.floor(Math.random() * SPECIES.length)], c = centerOf(m);
  m.textContent = s.emoji; FX.burst(c.x, c.y, { colors: ['#ffd166', '#ff6b8a', '#5ef0c0'], n: 14, speed: 5 }); m.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.5,.7)' }, { transform: 'scale(.8,1.3)' }, { transform: 'scale(1)' }], { duration: 480 });
};
addEventListener('beforeunload', () => { stopCamera(); send({ t: 'leave' }); });

// Fondo: criaturas flotando muy suavemente
(function bgCritters() {
  const host = $('bgcrit'); if (reduceMotion()) return;
  for (let i = 0; i < 9; i++) {
    const el = document.createElement('i'), s = SPECIES[(i * 5) % SPECIES.length];
    el.textContent = s.emoji; el.style.left = (4 + i * 11 + rnd(-3, 3)) + '%'; el.style.fontSize = rnd(26, 52) + 'px';
    el.style.animationDuration = rnd(16, 30) + 's'; el.style.animationDelay = (-rnd(0, 30)) + 's'; host.appendChild(el);
  }
})();

// Migración suave desde versiones anteriores
if (!state.found.length && localStorage.getItem('critterdex-save')) {
  try {
    const old = JSON.parse(localStorage.getItem('critterdex-save'));
    if (old.found) state.found = old.found; if (old.owned) state.owned = old.owned;
    if (old.points) state.points = old.points; if (old.player) state.player = old.player;
    save();
  } catch { }
}

// Enlace de invitación ?join=ABCD
(function inviteLink() {
  const code = (new URLSearchParams(location.search).get('join') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  if (code.length === 4) { $('joinCode').value = code; switchTab('battle'); toast(`Invitación a la sala ${code}: escribe tu nombre y pulsa Unirse`, 'ok', 5000); }
})();
$('playerName').value = state.player === 'Explorador' ? '' : state.player;

render();
switchTab(document.querySelector('.page:not(.hidden)')?.id || 'habitat');
try { applyI18n(); } catch (e) {}
