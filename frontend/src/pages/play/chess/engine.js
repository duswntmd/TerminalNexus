/**
 * 체스 규칙 엔진 (화면과 분리된 순수 모듈, 서버 ChessEngine.java 와 같은 규칙)
 *
 * 판: 길이 64 배열, 0 = a8 … 7 = h8 … 56 = a1 … 63 = h1 (화면 위에서 아래로)
 * 기물: 종류(1~6) | 색(WHITE 8, BLACK 16), 빈 칸 0
 * 수: 정수 하나에 from | to<<6 | promo<<12 | flag<<15 (AI가 빠르게 다루도록)
 */
export const WHITE = 8;
export const BLACK = 16;
export const PAWN = 1;
export const KNIGHT = 2;
export const BISHOP = 3;
export const ROOK = 4;
export const QUEEN = 5;
export const KING = 6;

export const FLAG_DOUBLE = 1; // 폰 두 칸 전진
export const FLAG_EP = 2;     // 앙파상
export const FLAG_CASTLE = 3; // 캐슬링

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const colorOf = (p) => p & 24;
export const typeOf = (p) => p & 7;
export const enemyOf = (c) => c ^ 24;

export const encodeMove = (from, to, promo = 0, flag = 0) => from | (to << 6) | (promo << 12) | (flag << 15);
export const moveFrom = (m) => m & 63;
export const moveTo = (m) => (m >> 6) & 63;
export const movePromo = (m) => (m >> 12) & 7;
export const moveFlag = (m) => (m >> 15) & 3;

const FILES = 'abcdefgh';
export const sqName = (i) => FILES[i & 7] + (8 - (i >> 3));
export const sqIndex = (name) => (8 - Number(name[1])) * 8 + FILES.indexOf(name[0]);

const PIECE_LETTER = ['', 'p', 'n', 'b', 'r', 'q', 'k'];
const SAN_LETTER = ['', '', 'N', 'B', 'R', 'Q', 'K'];
const pieceFromChar = (ch) => {
  const t = PIECE_LETTER.indexOf(ch.toLowerCase());
  return t > 0 ? t | (ch === ch.toUpperCase() ? WHITE : BLACK) : 0;
};
const charOf = (p) => (colorOf(p) === WHITE ? PIECE_LETTER[typeOf(p)].toUpperCase() : PIECE_LETTER[typeOf(p)]);

export const toUci = (m) => sqName(moveFrom(m)) + sqName(moveTo(m)) + (movePromo(m) ? PIECE_LETTER[movePromo(m)] : '');

/* ── 미리 계산한 이동 표 ── */
const RAYS = [];       // RAYS[sq * 8 + d]: 방향 d로 판 끝까지 이어지는 칸 (0~3 직선, 4~7 대각선)
const KNIGHT_T = [];
const KING_T = [];
{
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];
  const jumps = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  const inside = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
  for (let sq = 0; sq < 64; sq++) {
    const r = sq >> 3;
    const c = sq & 7;
    dirs.forEach(([dr, dc], d) => {
      const ray = [];
      for (let rr = r + dr, cc = c + dc; inside(rr, cc); rr += dr, cc += dc) ray.push(rr * 8 + cc);
      RAYS[sq * 8 + d] = ray;
    });
    KNIGHT_T[sq] = jumps.filter(([dr, dc]) => inside(r + dr, c + dc)).map(([dr, dc]) => (r + dr) * 8 + c + dc);
    KING_T[sq] = dirs.filter(([dr, dc]) => inside(r + dr, c + dc)).map(([dr, dc]) => (r + dr) * 8 + c + dc);
  }
}

// 기물이 떠나거나 잡히면 사라지는 캐슬링 권리 (1 백 킹사이드, 2 백 퀸사이드, 4 흑 킹사이드, 8 흑 퀸사이드)
const CASTLE_MASK = new Array(64).fill(15);
CASTLE_MASK[56] = 15 & ~2;
CASTLE_MASK[63] = 15 & ~1;
CASTLE_MASK[60] = 15 & ~3;
CASTLE_MASK[0] = 15 & ~8;
CASTLE_MASK[7] = 15 & ~4;
CASTLE_MASK[4] = 15 & ~12;

/* ── Zobrist 해시 (AI 치환표·반복 판정용, 32비트) ── */
let seed = 0x9e3779b9;
const rand32 = () => {
  seed ^= seed << 13; seed >>>= 0;
  seed ^= seed >>> 17;
  seed ^= seed << 5; seed >>>= 0;
  return seed | 0;
};
const Z_PIECE = Array.from({ length: 24 * 64 }, rand32);
const Z_CASTLE = Array.from({ length: 16 }, rand32);
const Z_EP = Array.from({ length: 8 }, rand32);
const Z_TURN = rand32();

/** sq 칸을 by 색이 공격하는가 */
export const isAttacked = (b, sq, by) => {
  const r = sq >> 3;
  const c = sq & 7;
  if (by === WHITE) {
    if (r < 7 && ((c < 7 && b[sq + 9] === (PAWN | WHITE)) || (c > 0 && b[sq + 7] === (PAWN | WHITE)))) return true;
  } else if (r > 0 && ((c > 0 && b[sq - 9] === (PAWN | BLACK)) || (c < 7 && b[sq - 7] === (PAWN | BLACK)))) return true;
  const kn = KNIGHT_T[sq];
  for (let i = 0; i < kn.length; i++) if (b[kn[i]] === (KNIGHT | by)) return true;
  const kg = KING_T[sq];
  for (let i = 0; i < kg.length; i++) if (b[kg[i]] === (KING | by)) return true;
  for (let d = 0; d < 8; d++) {
    const ray = RAYS[sq * 8 + d];
    const a = d < 4 ? (ROOK | by) : (BISHOP | by);
    for (let i = 0; i < ray.length; i++) {
      const p = b[ray[i]];
      if (p) {
        if (p === a || p === (QUEEN | by)) return true;
        break;
      }
    }
  }
  return false;
};

export class Position {
  constructor() {
    this.board = new Int8Array(64);
    this.turn = WHITE;
    this.castling = 0;
    this.ep = -1;
    this.halfmove = 0;
    this.fullmove = 1;
    this.kings = [-1, -1]; // [백, 흑]
    this.hash = 0;
    this.undo = [];
  }

  static fromFen(fen) {
    const pos = new Position();
    const [placement, turn = 'w', castling = '-', ep = '-', half = '0', full = '1'] = fen.trim().split(/\s+/);
    const rows = placement.split('/');
    if (rows.length !== 8) throw new Error('잘못된 FEN');
    rows.forEach((row, r) => {
      let c = 0;
      for (const ch of row) {
        if (ch >= '1' && ch <= '8') c += Number(ch);
        else {
          const p = pieceFromChar(ch);
          if (!p || c > 7) throw new Error('잘못된 FEN');
          pos.board[r * 8 + c] = p;
          if (typeOf(p) === KING) pos.kings[colorOf(p) >> 4] = r * 8 + c;
          c++;
        }
      }
      if (c !== 8) throw new Error('잘못된 FEN');
    });
    if (pos.kings[0] < 0 || pos.kings[1] < 0) throw new Error('킹이 없는 FEN');
    pos.turn = turn === 'b' ? BLACK : WHITE;
    for (const ch of castling) pos.castling |= { K: 1, Q: 2, k: 4, q: 8 }[ch] || 0;
    pos.ep = ep !== '-' ? sqIndex(ep) : -1;
    pos.halfmove = Number(half) || 0;
    pos.fullmove = Number(full) || 1;
    pos.hash = pos.computeHash();
    return pos;
  }

  computeHash() {
    let h = 0;
    for (let sq = 0; sq < 64; sq++) if (this.board[sq]) h ^= Z_PIECE[this.board[sq] * 64 + sq];
    h ^= Z_CASTLE[this.castling];
    if (this.ep >= 0) h ^= Z_EP[this.ep & 7];
    if (this.turn === BLACK) h ^= Z_TURN;
    return h;
  }

  placement() {
    let s = '';
    for (let r = 0; r < 8; r++) {
      let empty = 0;
      for (let c = 0; c < 8; c++) {
        const p = this.board[r * 8 + c];
        if (!p) { empty++; continue; }
        if (empty) { s += empty; empty = 0; }
        s += charOf(p);
      }
      if (empty) s += empty;
      if (r < 7) s += '/';
    }
    return s;
  }

  castlingText() {
    const s = (this.castling & 1 ? 'K' : '') + (this.castling & 2 ? 'Q' : '') + (this.castling & 4 ? 'k' : '') + (this.castling & 8 ? 'q' : '');
    return s || '-';
  }

  toFen() {
    return `${this.placement()} ${this.turn === WHITE ? 'w' : 'b'} ${this.castlingText()} ${this.ep >= 0 ? sqName(this.ep) : '-'} ${this.halfmove} ${this.fullmove}`;
  }

  /** 3회 동일 국면 판정용 키: 기물 배치, 차례, 캐슬링 권리, 실제로 가능한 앙파상 */
  repetitionKey() {
    const epLive = this.ep >= 0 && this.legalMoves().some((m) => moveFlag(m) === FLAG_EP);
    return `${this.placement()} ${this.turn === WHITE ? 'w' : 'b'} ${this.castlingText()} ${epLive ? sqName(this.ep) : '-'}`;
  }

  inCheck(color = this.turn) {
    return isAttacked(this.board, this.kings[color >> 4], color ^ 24);
  }

  /** 의사 합법수 (자기 킹이 공격받는지는 보지 않음). capturesOnly: 잡는 수와 퀸 승진만 */
  generate(out = [], capturesOnly = false) {
    const b = this.board;
    const us = this.turn;
    const them = us ^ 24;
    const promos = capturesOnly ? [QUEEN] : [QUEEN, ROOK, BISHOP, KNIGHT];
    for (let sq = 0; sq < 64; sq++) {
      const p = b[sq];
      if (!p || (p & 24) !== us) continue;
      const t = p & 7;
      if (t === PAWN) {
        const dir = us === WHITE ? -8 : 8;
        const one = sq + dir;
        const lastRow = (one >> 3) === 0 || (one >> 3) === 7;
        const c = sq & 7;
        if (b[one] === 0) {
          if (lastRow) for (const pr of promos) out.push(encodeMove(sq, one, pr));
          else if (!capturesOnly) {
            out.push(encodeMove(sq, one));
            const startRow = us === WHITE ? 6 : 1;
            if ((sq >> 3) === startRow && b[one + dir] === 0) out.push(encodeMove(sq, one + dir, 0, FLAG_DOUBLE));
          }
        }
        for (let k = 0; k < 2; k++) {
          if (k === 0 ? c === 0 : c === 7) continue;
          const to = one + (k === 0 ? -1 : 1);
          const tp = b[to];
          if (tp && (tp & 24) === them) {
            if (lastRow) for (const pr of promos) out.push(encodeMove(sq, to, pr));
            else out.push(encodeMove(sq, to));
          } else if (to === this.ep) out.push(encodeMove(sq, to, 0, FLAG_EP));
        }
      } else if (t === KNIGHT || t === KING) {
        const tg = t === KNIGHT ? KNIGHT_T[sq] : KING_T[sq];
        for (let i = 0; i < tg.length; i++) {
          const tp = b[tg[i]];
          if (tp ? (tp & 24) === them : !capturesOnly) out.push(encodeMove(sq, tg[i]));
        }
      } else {
        const d0 = t === BISHOP ? 4 : 0;
        const d1 = t === ROOK ? 4 : 8;
        for (let d = d0; d < d1; d++) {
          const ray = RAYS[sq * 8 + d];
          for (let i = 0; i < ray.length; i++) {
            const tp = b[ray[i]];
            if (!tp) {
              if (!capturesOnly) out.push(encodeMove(sq, ray[i]));
            } else {
              if ((tp & 24) === them) out.push(encodeMove(sq, ray[i]));
              break;
            }
          }
        }
      }
    }
    // 캐슬링: 사이 칸이 비고, 킹이 지나는 칸(출발 칸 포함)이 공격받지 않아야 함
    if (!capturesOnly && this.castling) {
      const base = us === WHITE ? 56 : 0;
      const kSide = us === WHITE ? 1 : 4;
      const qSide = us === WHITE ? 2 : 8;
      const e = base + 4;
      if (b[e] === (KING | us) && !isAttacked(b, e, them)) {
        if ((this.castling & kSide) && b[base + 5] === 0 && b[base + 6] === 0 && b[base + 7] === (ROOK | us)
          && !isAttacked(b, base + 5, them) && !isAttacked(b, base + 6, them)) {
          out.push(encodeMove(e, base + 6, 0, FLAG_CASTLE));
        }
        if ((this.castling & qSide) && b[base + 3] === 0 && b[base + 2] === 0 && b[base + 1] === 0 && b[base] === (ROOK | us)
          && !isAttacked(b, base + 3, them) && !isAttacked(b, base + 2, them)) {
          out.push(encodeMove(e, base + 2, 0, FLAG_CASTLE));
        }
      }
    }
    return out;
  }

  make(m) {
    const b = this.board;
    const from = m & 63;
    const to = (m >> 6) & 63;
    const promo = (m >> 12) & 7;
    const flag = (m >> 15) & 3;
    const piece = b[from];
    const us = this.turn;
    let capSq = to;
    if (flag === FLAG_EP) capSq = us === WHITE ? to + 8 : to - 8;
    const captured = b[capSq];
    this.undo.push(m, captured, this.castling, this.ep, this.halfmove, this.hash);

    let h = this.hash ^ Z_CASTLE[this.castling] ^ Z_TURN;
    if (this.ep >= 0) h ^= Z_EP[this.ep & 7];
    if (captured) { b[capSq] = 0; h ^= Z_PIECE[captured * 64 + capSq]; }
    b[from] = 0;
    h ^= Z_PIECE[piece * 64 + from];
    const placed = promo ? (promo | us) : piece;
    b[to] = placed;
    h ^= Z_PIECE[placed * 64 + to];
    if (flag === FLAG_CASTLE) {
      const rf = to > from ? from + 3 : from - 4;
      const rt = to > from ? from + 1 : from - 1;
      const rook = b[rf];
      b[rf] = 0;
      b[rt] = rook;
      h ^= Z_PIECE[rook * 64 + rf] ^ Z_PIECE[rook * 64 + rt];
    }
    if ((piece & 7) === KING) this.kings[us >> 4] = to;
    this.castling &= CASTLE_MASK[from] & CASTLE_MASK[to];
    h ^= Z_CASTLE[this.castling];
    this.ep = flag === FLAG_DOUBLE ? (from + to) >> 1 : -1;
    if (this.ep >= 0) h ^= Z_EP[this.ep & 7];
    this.halfmove = (piece & 7) === PAWN || captured ? 0 : this.halfmove + 1;
    if (us === BLACK) this.fullmove++;
    this.turn = us ^ 24;
    this.hash = h;
  }

  unmake() {
    const u = this.undo;
    this.hash = u.pop();
    this.halfmove = u.pop();
    this.ep = u.pop();
    this.castling = u.pop();
    const captured = u.pop();
    const m = u.pop();
    const b = this.board;
    const from = m & 63;
    const to = (m >> 6) & 63;
    const promo = (m >> 12) & 7;
    const flag = (m >> 15) & 3;
    const us = this.turn ^ 24;
    this.turn = us;
    if (us === BLACK) this.fullmove--;
    const piece = promo ? (PAWN | us) : b[to];
    b[from] = piece;
    b[to] = 0;
    if (flag === FLAG_EP) b[us === WHITE ? to + 8 : to - 8] = captured;
    else b[to] = captured;
    if (flag === FLAG_CASTLE) {
      const rf = to > from ? from + 3 : from - 4;
      const rt = to > from ? from + 1 : from - 1;
      b[rf] = b[rt];
      b[rt] = 0;
    }
    if ((piece & 7) === KING) this.kings[us >> 4] = from;
  }

  /** 수를 쉬는 것 (AI 널무브 가지치기용) */
  makeNull() {
    this.undo.push(0, 0, this.castling, this.ep, this.halfmove, this.hash);
    let h = this.hash ^ Z_TURN;
    if (this.ep >= 0) h ^= Z_EP[this.ep & 7];
    this.ep = -1;
    this.halfmove++;
    this.turn ^= 24;
    this.hash = h;
  }

  unmakeNull() {
    const u = this.undo;
    this.hash = u.pop();
    this.halfmove = u.pop();
    this.ep = u.pop();
    this.castling = u.pop();
    u.pop();
    u.pop();
    this.turn ^= 24;
  }

  /** 수를 둔 쪽 킹이 공격받지 않는가 (make 직후 호출) */
  leftKingSafe() {
    const mover = this.turn ^ 24;
    return !isAttacked(this.board, this.kings[mover >> 4], this.turn);
  }

  legalMoves() {
    const res = [];
    for (const m of this.generate()) {
      this.make(m);
      if (this.leftKingSafe()) res.push(m);
      this.unmake();
    }
    return res;
  }

  /** 기물 부족 무승부: 킹끼리, 킹+경기물 하나, 같은 색 칸 비숍만 남은 경우 */
  insufficientMaterial() {
    let minors = 0;
    let knights = 0;
    const bishopColors = new Set();
    for (let sq = 0; sq < 64; sq++) {
      const t = this.board[sq] & 7;
      if (t === PAWN || t === ROOK || t === QUEEN) return false;
      if (t === KNIGHT) { minors++; knights++; }
      if (t === BISHOP) { minors++; bishopColors.add(((sq >> 3) + (sq & 7)) & 1); }
    }
    if (minors <= 1) return true;
    return knights === 0 && bishopColors.size === 1;
  }

  /** 표준 대수 기보(SAN). legal: 이 국면의 합법수 목록 */
  san(m, legal = this.legalMoves()) {
    const from = moveFrom(m);
    const to = moveTo(m);
    const piece = this.board[from];
    const t = typeOf(piece);
    let s;
    if (moveFlag(m) === FLAG_CASTLE) s = to > from ? 'O-O' : 'O-O-O';
    else {
      const capture = this.board[to] !== 0 || moveFlag(m) === FLAG_EP;
      if (t === PAWN) {
        s = (capture ? `${FILES[from & 7]}x` : '') + sqName(to);
        if (movePromo(m)) s += `=${SAN_LETTER[movePromo(m)]}`;
      } else {
        const rivals = legal.filter((o) => moveTo(o) === to && moveFrom(o) !== from && this.board[moveFrom(o)] === piece);
        let dis = '';
        if (rivals.length) {
          if (!rivals.some((o) => (moveFrom(o) & 7) === (from & 7))) dis = FILES[from & 7];
          else if (!rivals.some((o) => (moveFrom(o) >> 3) === (from >> 3))) dis = String(8 - (from >> 3));
          else dis = sqName(from);
        }
        s = SAN_LETTER[t] + dis + (capture ? 'x' : '') + sqName(to);
      }
    }
    this.make(m);
    if (this.inCheck()) s += this.legalMoves().length ? '+' : '#';
    this.unmake();
    return s;
  }
}

/** 수 개수 세기 (규칙 검증용) */
export const perft = (pos, depth) => {
  if (depth === 0) return 1;
  const moves = pos.generate();
  let n = 0;
  for (const m of moves) {
    pos.make(m);
    if (pos.leftKingSafe()) n += depth === 1 ? 1 : perft(pos, depth - 1);
    pos.unmake();
  }
  return n;
};

/* ── 대국 단위 API (화면용, 불변 객체) ── */

const MOVE_INFO = (pos, m, legal) => ({
  uci: toUci(m),
  san: pos.san(m, legal),
  from: moveFrom(m),
  to: moveTo(m),
  promo: movePromo(m),
  color: pos.turn,
  piece: pos.board[moveFrom(m)],
  captured: moveFlag(m) === FLAG_EP ? (PAWN | enemyOf(pos.turn)) : pos.board[moveTo(m)],
});

/** 국면의 결과 판정. keys: 대국 시작부터의 반복 판정 키 목록 (마지막이 현재) */
const outcome = (pos, legal, keys) => {
  if (legal.length === 0) {
    return pos.inCheck()
      ? { status: 'FINISHED', winner: enemyOf(pos.turn), reason: 'checkmate' }
      : { status: 'FINISHED', winner: null, reason: 'stalemate' };
  }
  if (pos.insufficientMaterial()) return { status: 'FINISHED', winner: null, reason: 'insufficient' };
  if (pos.halfmove >= 100) return { status: 'FINISHED', winner: null, reason: 'fifty' };
  const cur = keys[keys.length - 1];
  if (keys.filter((k) => k === cur).length >= 3) return { status: 'FINISHED', winner: null, reason: 'threefold' };
  return { status: 'PLAYING', winner: null, reason: null };
};

const build = (startFen, pos, moves, keys) => {
  const legal = pos.legalMoves();
  return {
    startFen,
    fen: pos.toFen(),
    board: Array.from(pos.board),
    turn: pos.turn,
    moves,
    keys,
    check: pos.inCheck(),
    kingSq: pos.kings[pos.turn >> 4],
    legal: legal.map((m) => ({ from: moveFrom(m), to: moveTo(m), promo: movePromo(m), uci: toUci(m) })),
    ...outcome(pos, legal, keys),
  };
};

export const newGame = (fen = START_FEN) => {
  const pos = Position.fromFen(fen);
  return build(fen, pos, [], [pos.repetitionKey()]);
};

/** uci 수를 둔 새 대국 상태. 둘 수 없는 수면 예외 */
export const playMove = (game, uci) => {
  if (game.status !== 'PLAYING') throw new Error('끝난 대국입니다');
  const pos = Position.fromFen(game.fen);
  const legal = pos.legalMoves();
  const m = legal.find((x) => toUci(x) === uci);
  if (m === undefined) throw new Error(`둘 수 없는 수: ${uci}`);
  const info = MOVE_INFO(pos, m, legal);
  pos.make(m);
  return build(game.startFen, pos, [...game.moves, info], [...game.keys, pos.repetitionKey()]);
};

/** 시작 국면 + uci 목록으로 대국 재구성 */
export const replay = (startFen, ucis = []) => ucis.reduce((g, u) => playMove(g, u), newGame(startFen));

export const resign = (game, color) => ({ ...game, status: 'FINISHED', winner: enemyOf(color), reason: 'resign', legal: [] });

export const finishWith = (game, winner, reason) => ({ ...game, status: 'FINISHED', winner, reason, legal: [] });

/** 진영별 잡은 기물과 기물 점수 차 */
const POINTS = [0, 1, 3, 3, 5, 9, 0];
export const capturedBy = (moves) => {
  const res = { [WHITE]: [], [BLACK]: [] };
  for (const mv of moves) if (mv.captured) res[mv.color].push(mv.captured);
  const order = (a, c) => POINTS[typeOf(c)] - POINTS[typeOf(a)] || typeOf(c) - typeOf(a);
  res[WHITE].sort(order);
  res[BLACK].sort(order);
  return res;
};

export const materialDiff = (board) => {
  let d = 0;
  for (const p of board) if (p) d += colorOf(p) === WHITE ? POINTS[typeOf(p)] : -POINTS[typeOf(p)];
  return d; // 양수면 백 우세
};
