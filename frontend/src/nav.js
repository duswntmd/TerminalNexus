// 사이트 메뉴 단일 정의 — 헤더, 모바일 메뉴, 메인 랙, 푸터가 함께 쓴다.
// login: 로그인해야 쓸 수 있는 기능
export const NAV_GROUPS = [
  {
    key: 'community',
    items: [
      { key: 'freeboard', path: '/freeboard', login: true, glyph: '#' },
      { key: 'chat', path: '/chat', login: true, glyph: '@' },
    ],
  },
  {
    key: 'play',
    items: [
      { key: 'stock', path: '/play/stock', glyph: '$' },
      { key: 'janggi', path: '/play/janggi', glyph: '將' },
      { key: 'forge', path: '/forge', login: true, glyph: '+' },
      { key: 'typeracer', path: '/play/typeracer', glyph: 'Aa' },
      { key: 'terminalhack', path: '/play/terminalhack', glyph: '?' },
      { key: 'hackermode', path: '/play/hackermode', glyph: '>' },
      { key: 'linux', path: '/play/linux', glyph: '~' },
    ],
  },
  {
    key: 'tools',
    items: [
      { key: 'infra', path: '/tools', glyph: '%' },
      { key: 'lotto', path: '/lotto', glyph: '6' },
      { key: 'fruitai', path: '/fruit-ai', login: true, glyph: '*' },
    ],
  },
];

export const ALL_NAV = NAV_GROUPS.flatMap((g) => g.items.map((i) => ({ ...i, group: g.key })));
