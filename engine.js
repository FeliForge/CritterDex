/* CritterDex · motor de combate (puro, sin DOM ni red).
 * Turnos SIMULTÁNEOS: ambos eligen movimiento y el host resuelve la ronda.
 * Lados: 'A' = host, 'B' = invitado/bot. Úsalo en navegador (window.CritterEngine) o Node (require). */
(function (root) {
  'use strict';

  const MOVES = ['atk', 'def', 'spc'];
  const METER_MAX = 100;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, Number(n) || a));
  const other = s => (s === 'A' ? 'B' : 'A');

  function makeFighter(f) {
    const pow = clamp(f.pow, 4, 80);
    const level = Math.round(clamp(f.level, 1, 99));
    const maxHp = Math.round(100 + pow * 1.0 + level * 4);
    return {
      id: String(f.id || '?').slice(0, 24), name: String(f.name || 'Criatura').slice(0, 24),
      emoji: String(f.emoji || '❓').slice(0, 8), level, pow, maxHp, hp: maxHp, meter: 0, guardStreak: 0,
    };
  }

  const eff = f => 15 + f.pow * 0.32 + f.level * 0.6; // poder efectivo (comprimido)

  function createBattle(a, b) {
    return { round: 0, A: makeFighter(a), B: makeFighter(b), over: false, winner: null };
  }

  const cloneState = s => JSON.parse(JSON.stringify(s));

  function sanitizeMove(state, side, move) {
    if (!MOVES.includes(move)) return 'atk';
    if (move === 'spc' && state[side].meter < METER_MAX) return 'atk';
    return move;
  }

  /** Resuelve una ronda. Devuelve { state, events, moves }. rng: () => [0,1). */
  function resolveRound(prev, rawA, rawB, rng) {
    rng = rng || Math.random;
    const st = cloneState(prev);
    if (st.over) return { state: st, events: [], moves: { A: null, B: null } };
    st.round += 1;
    const moves = { A: sanitizeMove(st, 'A', rawA), B: sanitizeMove(st, 'B', rawB) };
    const rage = 1 + Math.max(0, st.round - 8) * 0.25; // muerte súbita: evita combates eternos
    const events = [];

    // Guardias primero (afectan a los golpes de esta ronda)
    const guarding = { A: moves.A === 'def', B: moves.B === 'def' };
    const guardPower = {};
    for (const s of ['A', 'B']) {
      if (guarding[s]) {
        guardPower[s] = st[s].guardStreak >= 1 ? 0.65 : 0.35; // factor de daño recibido
        const gain = st[s].guardStreak >= 1 ? 20 : 40;
        st[s].meter = Math.min(METER_MAX, st[s].meter + gain);
        st[s].guardStreak += 1;
        events.push({ kind: 'guard', from: s, to: s, dmg: 0, weak: st[s].guardStreak > 1, meter: st[s].meter });
      } else {
        st[s].guardStreak = 0;
      }
    }

    // Ambos se guardan: tensión, ambos pierden un poco (rompe estancamientos)
    if (guarding.A && guarding.B) {
      const pre = { A: st.A.hp, B: st.B.hp };
      for (const side of ['A', 'B']) {
        const chip = Math.max(1, Math.round(st[side].maxHp * 0.06 * rage));
        st[side].hp = Math.max(0, st[side].hp - chip);
      }
      events.push({ kind: 'standoff', from: 'A', to: 'B', dmg: 0, hpA: st.A.hp, hpB: st.B.hp });
      if (st.A.hp <= 0 || st.B.hp <= 0) {
        st.over = true;
        st.winner = st.A.hp > 0 ? 'A' : st.B.hp > 0 ? 'B' : (pre.A >= pre.B ? 'A' : 'B');
        return { state: st, events, moves };
      }
    }

    // Iniciativa
    const speed = s => st[s].pow * 0.3 + st[s].level + rng() * 6;
    const order = speed('A') >= speed('B') ? ['A', 'B'] : ['B', 'A'];

    for (const s of order) {
      if (moves[s] === 'def') continue;
      if (st[s].hp <= 0) continue; // ya cayó antes de actuar
      const t = other(s);
      const me = st[s], foe = st[t];
      const isSpecial = moves[s] === 'spc';
      let dmg, crit = false;
      if (isSpecial) {
        dmg = eff(me) * 2.6 * (0.9 + rng() * 0.2);
        me.meter = 0;
      } else {
        dmg = eff(me) * 1.25 * (0.8 + rng() * 0.4);
        crit = rng() < 0.15;
        if (crit) dmg *= 1.6;
        me.meter = Math.min(METER_MAX, me.meter + 30);
      }
      dmg *= rage;
      let blocked = false;
      if (guarding[t]) {
        blocked = true;
        dmg *= isSpecial ? Math.min(0.8, guardPower[t] + 0.3) : guardPower[t]; // el especial rompe parte de la guardia
      } else {
        foe.meter = Math.min(METER_MAX, foe.meter + 15); // recibir daño carga (remontadas)
      }
      dmg = Math.max(1, Math.round(dmg));
      foe.hp = Math.max(0, foe.hp - dmg);
      events.push({
        kind: isSpecial ? 'spc' : 'atk', from: s, to: t, dmg, crit, blocked,
        hp: foe.hp, ko: foe.hp <= 0, meterFrom: me.meter, meterTo: foe.meter,
      });
      if (foe.hp <= 0) break;
    }

    if (st.A.hp <= 0 || st.B.hp <= 0) {
      st.over = true;
      st.winner = st.A.hp > 0 ? 'A' : 'B';
    }
    return { state: st, events, moves };
  }

  /** IA sencilla usada por el bot y por el modo Auto. */
  function chooseAIMove(state, side, rng) {
    rng = rng || Math.random;
    const me = state[side], foe = state[other(side)];
    if (me.meter >= METER_MAX && rng() < 0.85) return 'spc';
    if (foe.meter >= METER_MAX && rng() < 0.5) return 'def';
    if (me.hp < me.maxHp * 0.3 && rng() < 0.35 && me.guardStreak < 1) return 'def';
    const r = rng();
    if (r < 0.7) return 'atk';
    return me.guardStreak < 1 ? 'def' : 'atk';
  }

  const api = { MOVES, METER_MAX, makeFighter, createBattle, resolveRound, chooseAIMove, sanitizeMove, other };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CritterEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
