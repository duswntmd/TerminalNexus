// 체스 규칙 엔진 검증: 알려진 국면의 깊이별 수 개수(perft)와 비교한다.
// 실행: node scripts/chess-perft.mjs
import { Position, perft, START_FEN, replay } from '../src/pages/play/chess/engine.js';

const CASES = [
  ['시작 국면', START_FEN, [20, 400, 8902, 197281]],
  ['Kiwipete', 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', [48, 2039, 97862]],
  ['앙파상·핀', '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', [14, 191, 2812, 43238]],
  ['승진·캐슬링', 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', [6, 264, 9467]],
  ['승진 분기', 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', [44, 1486, 62379]],
];

let failed = 0;
for (const [name, fen, expected] of CASES) {
  const pos = Position.fromFen(fen);
  expected.forEach((want, i) => {
    const t = Date.now();
    const got = perft(pos, i + 1);
    const ok = got === want;
    if (!ok) failed++;
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${name} 깊이 ${i + 1}: ${got} (기대 ${want}) ${Date.now() - t}ms`);
  });
  if (pos.toFen() !== fen) { failed++; console.log(`FAIL ${name}: make/unmake 뒤 FEN이 달라짐`); }
}

// 대국 단위 판정
const check = (label, cond) => { if (!cond) failed++; console.log(`${cond ? 'OK  ' : 'FAIL'} ${label}`); };
const mate = replay(START_FEN, ['f2f3', 'e7e5', 'g2g4', 'd8h4']);
check('바보 메이트: 체크메이트·흑 승·Qh4#', mate.reason === 'checkmate' && mate.winner === 16 && mate.moves[3].san === 'Qh4#');
const stale = replay('7k/8/6K1/8/8/8/8/5Q2 w - - 0 1', ['f1f7']);
check('스테일메이트 판정', stale.status === 'FINISHED' && stale.reason === 'stalemate');
const rep = replay(START_FEN, ['g1f3', 'g8f6', 'f3g1', 'f6g8', 'g1f3', 'g8f6', 'f3g1', 'f6g8']);
check('3회 동일 국면', rep.reason === 'threefold');
const kk = replay('8/8/8/4k3/8/8/3r4/3K4 w - - 0 1', ['d1d2']);
check('기물 부족(킹 대 킹)', kk.reason === 'insufficient');
const fifty = replay('8/8/8/4k3/8/8/8/R3K3 w - - 99 80', ['a1a2']);
check('50수 규칙', fifty.reason === 'fifty');
const promo = replay('8/P7/8/8/8/8/8/k6K w - - 0 1', ['a7a8n']);
check('승진 선택(나이트) SAN a8=N', promo.moves[0].san === 'a8=N');
const castle = replay('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', ['e1g1', 'e8c8']);
check('캐슬링 SAN O-O / O-O-O', castle.moves[0].san === 'O-O' && castle.moves[1].san === 'O-O-O');
const through = Position.fromFen('r3k2r/8/8/8/8/8/5r2/R3K2R w KQkq - 0 1'); // f1·f2 줄 공격: 킹사이드 불가
check('공격받는 칸 통과 캐슬링 금지', !through.legalMoves().some((m) => ((m >> 15) & 3) === 3 && ((m >> 6) & 63) === 62));
const ep = replay('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2', ['e5d6']);
check('앙파상 SAN exd6', ep.moves[0].san === 'exd6' && ep.board[27] === 0);
const dis = replay('8/1k6/8/8/8/8/4K3/R6R w - - 0 1', ['a1d1']);
check('모호성 해소 SAN Rad1', dis.moves[0].san === 'Rad1');

console.log(failed ? `\n실패 ${failed}건` : '\n모두 통과');
process.exit(failed ? 1 : 0);
