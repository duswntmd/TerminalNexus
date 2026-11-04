// 화투 48장 정의 — 고스톱·섯다 등 화투 게임이 함께 쓴다.
// 카드 번호(id)는 0~47. 월 = floor(id / 4) + 1, 같은 월 안에서는 아래 SPEC 순서.
// kind: gwang(광) · yeol(열끗) · tti(띠) · pi(피)
// ribbon: hong(홍단) · cheong(청단) · cho(초단) · plain(비띠, 단에 들지 않음)
// pi: 피 장수 (쌍피 2). bird: 고도리 새. bi: 비광. gukjin: 9월 열끗(국진)

export const GWANG = 'gwang';
export const YEOL = 'yeol';
export const TTI = 'tti';
export const PI = 'pi';

const SPEC = [
  /* 1 송학 */ [{ kind: GWANG }, { kind: TTI, ribbon: 'hong' }, { kind: PI }, { kind: PI }],
  /* 2 매조 */ [{ kind: YEOL, bird: true }, { kind: TTI, ribbon: 'hong' }, { kind: PI }, { kind: PI }],
  /* 3 벚꽃 */ [{ kind: GWANG }, { kind: TTI, ribbon: 'hong' }, { kind: PI }, { kind: PI }],
  /* 4 흑싸리 */ [{ kind: YEOL, bird: true }, { kind: TTI, ribbon: 'cho' }, { kind: PI }, { kind: PI }],
  /* 5 난초 */ [{ kind: YEOL }, { kind: TTI, ribbon: 'cho' }, { kind: PI }, { kind: PI }],
  /* 6 모란 */ [{ kind: YEOL }, { kind: TTI, ribbon: 'cheong' }, { kind: PI }, { kind: PI }],
  /* 7 홍싸리 */ [{ kind: YEOL }, { kind: TTI, ribbon: 'cho' }, { kind: PI }, { kind: PI }],
  /* 8 공산 */ [{ kind: GWANG }, { kind: YEOL, bird: true }, { kind: PI }, { kind: PI }],
  /* 9 국화 */ [{ kind: YEOL, gukjin: true }, { kind: TTI, ribbon: 'cheong' }, { kind: PI }, { kind: PI }],
  /* 10 단풍 */ [{ kind: YEOL }, { kind: TTI, ribbon: 'cheong' }, { kind: PI }, { kind: PI }],
  /* 11 오동 */ [{ kind: GWANG }, { kind: PI, double: true }, { kind: PI }, { kind: PI }],
  /* 12 비 */ [{ kind: GWANG, bi: true }, { kind: YEOL }, { kind: TTI, ribbon: 'plain' }, { kind: PI, double: true }],
];

/** 카드 48장 정보 배열 (id 순서) */
export const CARDS = SPEC.flatMap((list, m) => list.map((c, i) => ({
  id: m * 4 + i,
  month: m + 1,
  kind: c.kind,
  ribbon: c.ribbon || null,
  pi: c.kind === PI ? (c.double ? 2 : 1) : 0,
  bird: !!c.bird,
  bi: !!c.bi,
  gukjin: !!c.gukjin,
})));

export const monthOf = (id) => Math.floor(id / 4) + 1;
export const cardOf = (id) => CARDS[id];

export const MONTH_NAMES_KO = ['송학', '매조', '벚꽃', '흑싸리', '난초', '모란', '홍싸리', '공산', '국화', '단풍', '오동', '비'];
export const MONTH_NAMES_EN = ['Pine', 'Plum', 'Cherry', 'Wisteria', 'Iris', 'Peony', 'Bush clover', 'Moon', 'Chrysanthemum', 'Maple', 'Paulownia', 'Rain'];
