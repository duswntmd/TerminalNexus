// AI끼리 자동 대전: node src/pages/play/gostop/test/selfplay.test.mjs [판수]
// 매 행동마다 카드 48장 보존과 중복 없음을 확인한다.
import assert from 'node:assert/strict';
import { newGame, applyAction, legalActions, settle, viewFor, allCards } from '../engine.js';
import { decide } from '../ai.js';

const GAMES = Number(process.argv[2] || 1000);
const LEVELS = [['hard', 'easy'], ['easy', 'hard'], ['hard', 'hard'], ['easy', 'easy']];

const check = (s) => {
  const all = allCards(s);
  assert.equal(all.length, 48, 'card count');
  assert.equal(new Set(all).size, 48, 'duplicate card');
};

const stats = { wins: [0, 0], nagari: 0, reasons: {}, events: {}, maxFinal: 0, actions: 0 };
const levelWins = { hard: 0, easy: 0, games: 0 };
let carry = 1;
let first = 0;
const started = Date.now();

for (let g = 0; g < GAMES; g += 1) {
  const levels = LEVELS[g % LEVELS.length];
  let s = newGame({ first, carry });
  check(s);
  let guard = 0;
  while (s.phase !== 'end') {
    const p = s.turn;
    const action = decide(viewFor(s, p), p, levels[p]);
    const legal = legalActions(s);
    assert.ok(legal.some((a) => JSON.stringify(a) === JSON.stringify(action)), `illegal AI action ${JSON.stringify(action)}`);
    s = applyAction(s, action);
    s.events.forEach((e) => { stats.events[e.type] = (stats.events[e.type] || 0) + 1; });
    check(s);
    stats.actions += 1;
    guard += 1;
    assert.ok(guard < 200, 'game too long');
  }
  const r = settle(s);
  stats.reasons[r.reason] = (stats.reasons[r.reason] || 0) + 1;
  if (r.winner == null) stats.nagari += 1;
  else {
    stats.wins[r.winner] += 1;
    stats.maxFinal = Math.max(stats.maxFinal, r.final);
    assert.ok(Number.isInteger(r.final) && r.final > 0, 'final score');
    if (levels[0] !== levels[1]) {
      levelWins.games += 1;
      levelWins[levels[r.winner]] += 1;
    }
    first = r.winner;
  }
  carry = Math.min(r.nextCarry, 8);
}

console.log(`selfplay: ${GAMES} games ok in ${((Date.now() - started) / 1000).toFixed(1)}s, ${stats.actions} actions`);
console.log('results', stats.reasons, 'wins', stats.wins, 'max final', stats.maxFinal);
console.log('hard vs easy', levelWins);
console.log('events', stats.events);
