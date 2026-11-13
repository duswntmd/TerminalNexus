// 맞고 판 배치 계산 (화면과 분리된 순수 함수).
// 판은 고정 크기 설계 좌표(px)로 배치하고, 화면에서는 통째로 확대·축소한다.
// - portrait: 세로 화면(모바일) 390 × 766
// - landscape: 가로 화면(데스크톱) 1280 × 720, 오른쪽에 점수판
import { monthOf } from '../../../components/hwatu/cards.js';
import { groupCaptured } from './helpers.js';

export const CARD_H = 168.2 / 103.2; // 카드 세로/가로 비율
export const BASE_W = 100; // 카드 요소의 기준 너비(px). 크기는 scale로 바꾼다

const KINDS = ['gwang', 'yeol', 'tti', 'pi'];

export const LAYOUTS = {
  portrait: {
    W: 390,
    H: 770,
    oppBar: { x: 8, y: 6 },
    oppBacks: { cx: 318, y: 4, w: 28 },
    captured: {
      opp: { y: 52, labelH: 15, w: 33, ranges: [[10, 84], [90, 178], [184, 272], [278, 382]] },
      me: { y: 487, labelH: 15, w: 33, ranges: [[10, 84], [90, 178], [184, 272], [278, 382]] },
    },
    deck: { cx: 195, cy: 292 },
    floor: { w: 54, cols: 5, rows: 3, dx: 72, dy: 97 },
    hud: { x: 0, y: 452, w: 390, h: 32 },
    hand: { y: 562, w: 60, gap: 10, perRow: 5, rowGap: 6 },
  },
  landscape: {
    W: 1280,
    H: 720,
    oppBar: null,
    oppBacks: { cx: 960, y: 14, w: 40 },
    captured: {
      opp: { y: 10, labelH: 18, w: 44, ranges: [[20, 166], [178, 378], [390, 590], [602, 862]] },
      me: { y: 486, labelH: 18, w: 44, ranges: [[20, 166], [178, 378], [390, 590], [602, 862]] },
    },
    deck: { cx: 525, cy: 302 },
    floor: { w: 70, cols: 7, rows: 3, dx: 104, dy: 124 },
    hud: { x: 1062, y: 8, w: 210, h: 704 },
    hand: { y: 586, w: 78, gap: 8, perRow: 10, rowGap: 0 },
  },
};

/** 바닥 자리 목록: 가운데(뒷패)에 가까운 순서. [열, 줄] (1부터) */
const slotOrder = (cols, rows) => {
  const cc = (cols + 1) / 2;
  const cr = (rows + 1) / 2;
  const list = [];
  for (let r = 1; r <= rows; r += 1) {
    for (let c = 1; c <= cols; c += 1) {
      if (c === cc && r === cr) continue;
      list.push([c, r, Math.abs(c - cc) * 1.05 + Math.abs(r - cr) * 1.2 + (r < cr ? 0.01 : 0)]);
    }
  }
  return list.sort((a, b) => a[2] - b[2]).map(([c, r]) => [c, r]);
};

/** 화면에 보일 상태: view에서 고르기 대기 중인 카드(낸 패·뒤집은 패)를 바닥에 포함 */
export const frameOf = (view) => {
  const floor = view.floor.slice();
  if (view.pending) {
    for (const c of [view.pending.chooseCard, ...(view.pending.takes || [])]) {
      if (c != null && !floor.includes(c)) floor.push(c);
    }
  }
  return {
    hands: view.hands.map((h) => h.slice()),
    floor,
    captured: view.captured.map((c) => c.slice()),
    deckCount: view.deck.length,
    dummy: view.dummy.slice(),
    gukjin: view.gukjin.slice(),
    ppeokOwner: { ...view.ppeokOwner },
    origin: {},
  };
};

const cloneFrame = (f) => ({ ...f, hands: f.hands.map((h) => h.slice()), floor: f.floor.slice(), captured: f.captured.map((c) => c.slice()), origin: {} });

const removeFromHand = (frame, p, card) => {
  const h = frame.hands[p];
  const i = h.indexOf(card);
  if (i >= 0) h.splice(i, 1);
  else if (h.includes(-1)) h.splice(h.indexOf(-1), 1); // 가려진 상대 손패
  else if (h.length) h.pop();
};

/**
 * 이전 상태 → 새 상태 사이의 단계별 화면.
 * 낸 패가 바닥에 놓이는 장면, 뒷패를 뒤집는 장면, 먹은 패가 옮겨진 최종 장면 순서.
 * origin[id]: 처음 나타나는 카드가 날아오는 곳 ('deck' | 'opp')
 */
export const buildFrames = (prev, next, me) => {
  const last = frameOf(next);
  const newGame = !prev || next.turnNo < prev.turnNo || next.deck.length > prev.deck.length;
  if (newGame) return [last];
  const frames = [];
  let f = frameOf(prev);
  for (const e of next.events) {
    if (e.type === 'play') {
      f = cloneFrame(f);
      removeFromHand(f, e.player, e.card);
      if (!f.floor.includes(e.card)) f.floor.push(e.card);
      if (e.player !== me) f.origin[e.card] = 'opp';
      frames.push(f);
    } else if (e.type === 'bomb') {
      f = cloneFrame(f);
      for (const c of e.cards) {
        removeFromHand(f, e.player, c);
        if (!f.floor.includes(c)) f.floor.push(c);
        if (e.player !== me) f.origin[c] = 'opp';
      }
      frames.push(f);
    } else if (e.type === 'flip') {
      f = cloneFrame(f);
      f.deckCount = Math.max(0, f.deckCount - 1);
      if (!f.floor.includes(e.card)) f.floor.push(e.card);
      f.origin[e.card] = 'deck';
      frames.push(f);
    }
  }
  frames.push(last);
  return frames;
};

/** 같은 월끼리 바닥 자리를 고정 (slots: Map 월 → 자리 번호, 바뀌면 갱신) */
export const assignSlots = (floor, slots, mode) => {
  const { cols, rows } = LAYOUTS[mode].floor;
  const order = slotOrder(cols, rows);
  const months = new Set(floor.map(monthOf));
  for (const m of [...slots.keys()]) if (!months.has(m)) slots.delete(m);
  for (const m of months) {
    if (slots.has(m)) continue;
    const used = new Set(slots.values());
    const free = order.findIndex((_, i) => !used.has(i));
    slots.set(m, free < 0 ? order.length - 1 : free);
  }
  return order;
};

/** 먹은 패 한 줄: 종류별 칸 안에서 겹쳐 깐다 */
const placeCaptured = (out, labels, list, gukjin, area, owner) => {
  const groups = groupCaptured(list, gukjin);
  const w = area.w;
  const h = w * CARD_H;
  KINDS.forEach((k, gi) => {
    const [x0, x1] = area.ranges[gi];
    const ids = groups[k];
    const n = ids.length;
    const room = x1 - x0 - w;
    let step = n > 1 ? Math.min(w * 0.5, room / (n - 1)) : 0;
    let rowsN = 1;
    if (n > 1 && step < w * 0.2) { rowsN = 2; step = Math.min(w * 0.5, room / (Math.ceil(n / 2) - 1 || 1)); }
    const perRow = Math.ceil(n / rowsN);
    ids.forEach((id, i) => {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      out.push({ id, x: x0 + col * step, y: area.y + area.labelH + row * h * 0.22, w, z: 100 + gi * 40 + i, zone: `cap-${owner}` });
    });
    labels.push({ key: `${owner}-${k}`, kind: k, x: x0, y: area.y, owner });
  });
};

/**
 * 카드 배치 계산.
 * 반환: { cards: [{id, x, y, w, z, zone, rot?, back?}], labels, deck, backs, hand }
 */
export const layoutFrame = (frame, { mode, me, slots, pickable = [] }) => {
  const L = LAYOUTS[mode];
  const opp = 1 - me;
  const cards = [];
  const labels = [];

  // 바닥
  const order = assignSlots(frame.floor, slots, mode);
  const fw = L.floor.w;
  const fh = fw * CARD_H;
  const byMonth = new Map();
  frame.floor.forEach((id) => {
    const m = monthOf(id);
    if (!byMonth.has(m)) byMonth.set(m, []);
    byMonth.get(m).push(id);
  });
  const ccol = (L.floor.cols + 1) / 2;
  const crow = (L.floor.rows + 1) / 2;
  const stacks = [];
  for (const [m, ids] of byMonth) {
    const [c, r] = order[slots.get(m)];
    const cx = L.deck.cx + (c - ccol) * L.floor.dx;
    const cy = L.deck.cy + (r - crow) * L.floor.dy;
    const choosing = ids.some((id) => pickable.includes(id));
    ids.forEach((id, i) => {
      const off = choosing ? { x: (i - (ids.length - 1) / 2) * fw * 0.78, y: 0 } : { x: i * fw * 0.16, y: i * fw * 0.1 };
      cards.push({ id, x: cx - fw / 2 + off.x - (choosing ? 0 : (ids.length - 1) * fw * 0.08), y: cy - fh / 2 + off.y, w: fw, z: 40 + i + (choosing ? 20 : 0), zone: 'floor' });
    });
    stacks.push({ month: m, x: cx - fw / 2, y: cy - fh / 2, w: fw, h: fh, ppeok: frame.ppeokOwner[m] !== undefined });
  }

  // 먹은 패
  placeCaptured(cards, labels, frame.captured[opp], frame.gukjin[opp], L.captured.opp, 'opp');
  placeCaptured(cards, labels, frame.captured[me], frame.gukjin[me], L.captured.me, 'me');

  // 내 손패 (월 순서) + 폭탄으로 받은 뒤집기 패
  const hand = frame.hands[me].filter((c) => c >= 0).sort((a, b) => a - b);
  const slotsN = hand.length + (frame.dummy[me] || 0);
  const H = L.hand;
  const hh = H.w * CARD_H;
  const handPos = (i) => {
    const perRow = H.perRow;
    const row = Math.floor(i / perRow);
    const inRow = Math.min(perRow, slotsN - row * perRow);
    const rowW = inRow * H.w + (inRow - 1) * H.gap;
    const x0 = (mode === 'landscape' ? L.hud.x : L.W) / 2 - rowW / 2;
    return { x: x0 + (i % perRow) * (H.w + H.gap), y: H.y + row * (hh + H.rowGap) };
  };
  hand.forEach((id, i) => cards.push({ id, ...handPos(i), w: H.w, z: 300 + i, zone: 'hand' }));
  const dummies = Array.from({ length: frame.dummy[me] || 0 }, (_, i) => ({ key: `dummy-${i}`, ...handPos(hand.length + i), w: H.w }));

  // 상대 손패 뒷면 (부채꼴)
  const n = frame.hands[opp].length;
  const bw = L.oppBacks.w;
  const spread = Math.min(bw * 0.42, 150 / Math.max(1, n));
  const backs = Array.from({ length: n }, (_, i) => {
    const t = n > 1 ? i / (n - 1) - 0.5 : 0;
    return { key: `ob-${i}`, x: L.oppBacks.cx - bw / 2 + (i - (n - 1) / 2) * spread, y: L.oppBacks.y + Math.abs(t) * 6, w: bw, rot: t * 24 };
  });

  return {
    cards,
    labels,
    stacks,
    dummies,
    backs,
    deck: { x: L.deck.cx - fw / 2, y: L.deck.cy - fh / 2, w: fw, count: frame.deckCount },
    oppHandPos: { x: L.oppBacks.cx - bw / 2, y: L.oppBacks.y, w: bw },
  };
};
