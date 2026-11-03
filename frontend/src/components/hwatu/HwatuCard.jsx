import React, { memo } from 'react';
import { CARDS, GWANG, YEOL, TTI, PI } from './cards.js';
import './HwatuCard.css';

// 화투 카드 그림 — 외부 이미지 없이 SVG로 직접 그린다 (viewBox 40×60).
// 월은 왼쪽 위 숫자, 종류는 아래 띠지(광·열끗·띠·피·쌍피)와 그림으로 구분한다.

const RIBBON_COLOR = { hong: '#d62839', cheong: '#2563c9', cho: '#3f8f3a', plain: '#b5452f' };
const RIBBON_TEXT = { hong: '홍단', cheong: '청단', cho: '초단', plain: '' };
const KIND_LABEL = { [GWANG]: '광', [YEOL]: '열끗', [TTI]: '띠', [PI]: '피' };

/* ── 월별 식물 그림 ── */
const Pine = () => (
  <g>
    <path d="M6 44 L14 30 L22 44 Z M12 46 L22 26 L32 46 Z" fill="#1f5c38" />
    <rect x="20.5" y="44" width="3" height="8" fill="#5a3a22" />
  </g>
);
const Blossom = ({ x, y, r = 3, fill, center = '#f7d354' }) => (
  <g>
    {[0, 72, 144, 216, 288].map((a) => (
      <circle key={a} cx={x + Math.cos((a * Math.PI) / 180) * r * 0.75} cy={y + Math.sin((a * Math.PI) / 180) * r * 0.75} r={r * 0.55} fill={fill} />
    ))}
    <circle cx={x} cy={y} r={r * 0.32} fill={center} />
  </g>
);
const Plum = () => (
  <g>
    <path d="M6 52 Q16 40 20 30 T34 14" stroke="#4a2a1a" strokeWidth="2.2" fill="none" />
    <Blossom x={12} y={42} fill="#d6336c" />
    <Blossom x={22} y={28} fill="#d6336c" />
    <Blossom x={31} y={18} r={2.6} fill="#d6336c" />
  </g>
);
const Cherry = () => (
  <g>
    <path d="M4 50 Q20 44 36 50" stroke="#5a3a22" strokeWidth="1.6" fill="none" />
    {[[9, 40], [17, 36], [25, 38], [32, 42], [13, 46], [28, 46]].map(([x, y]) => <Blossom key={`${x}-${y}`} x={x} y={y} r={3.2} fill="#f4a6c0" center="#d6336c" />)}
  </g>
);
const Wisteria = () => (
  <g>
    <path d="M8 12 Q20 18 32 12" stroke="#3a2a1a" strokeWidth="1.4" fill="none" />
    {[10, 17, 24, 31].map((x, i) => (
      <g key={x}>
        {[0, 1, 2, 3, 4].slice(0, 3 + (i % 2) * 2).map((k) => <ellipse key={k} cx={x + (k % 2 ? 1 : -1)} cy={17 + k * 5} rx="2.2" ry="2.6" fill="#2b2b2b" />)}
      </g>
    ))}
  </g>
);
const Iris = () => (
  <g>
    {[10, 16, 24, 30].map((x, i) => <path key={x} d={`M${x} 54 Q${x + (i % 2 ? 4 : -3)} 36 ${x + (i % 2 ? 2 : -1)} 22`} stroke="#2f7a3b" strokeWidth="2" fill="none" />)}
    <path d="M14 22 q4 -8 8 0 q-4 5 -8 0 Z M20 18 q4 -8 8 0 q-4 5 -8 0 Z" fill="#6c3fb5" />
  </g>
);
const Peony = () => (
  <g>
    <path d="M8 50 q6 -10 12 -6 q6 -10 12 6" fill="#2f7a3b" />
    <circle cx="20" cy="34" r="9" fill="#d62859" />
    <circle cx="20" cy="34" r="5.5" fill="#f06595" />
    <circle cx="20" cy="34" r="2" fill="#f7d354" />
  </g>
);
const Clover = () => (
  <g>
    <path d="M6 54 Q14 34 34 18 M14 54 Q22 40 34 34" stroke="#5a3a22" strokeWidth="1.4" fill="none" />
    {[[12, 44], [16, 38], [21, 32], [26, 26], [31, 21], [19, 48], [24, 42], [30, 37]].map(([x, y]) => <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="2.3" ry="1.5" fill="#c92a2a" transform={`rotate(-35 ${x} ${y})`} />)}
  </g>
);
const Moonhill = () => (
  <g>
    <path d="M2 56 Q20 30 38 56 Z" fill="#2b2b2b" />
    <path d="M6 56 q4 -6 8 0 M16 56 q4 -7 8 0 M26 56 q4 -6 8 0" stroke="#7a7a7a" strokeWidth="1" fill="none" />
  </g>
);
const Chrysanthemum = () => (
  <g>
    <path d="M20 54 L20 38" stroke="#2f7a3b" strokeWidth="2" />
    {Array.from({ length: 12 }, (_, i) => i * 30).map((a) => (
      <ellipse key={a} cx={20 + Math.cos((a * Math.PI) / 180) * 6} cy={32 + Math.sin((a * Math.PI) / 180) * 6} rx="3.4" ry="1.6" fill="#f2b705" transform={`rotate(${a} ${20 + Math.cos((a * Math.PI) / 180) * 6} ${32 + Math.sin((a * Math.PI) / 180) * 6})`} />
    ))}
    <circle cx="20" cy="32" r="3" fill="#e07b00" />
  </g>
);
const Leaf = ({ x, y, s = 1 }) => (
  <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 -6 L1.6 -2 L5.6 -2.8 L2.6 0.4 L4.6 4.4 L0 2.4 L-4.6 4.4 L-2.6 0.4 L-5.6 -2.8 L-1.6 -2 Z" fill="#d9480f" />
);
const Maple = () => (
  <g>
    <path d="M6 14 Q20 26 34 50" stroke="#5a3a22" strokeWidth="1.4" fill="none" />
    <Leaf x={12} y={20} /><Leaf x={22} y={28} s={1.2} /><Leaf x={29} y={40} /><Leaf x={15} y={36} s={0.9} />
  </g>
);
const Paulownia = () => (
  <g>
    <path d="M20 26 Q8 30 8 44 Q18 46 20 36 Q22 46 32 44 Q32 30 20 26 Z" fill="#2b2b2b" />
    <path d="M20 26 L20 54" stroke="#2b2b2b" strokeWidth="1.6" />
    <path d="M14 14 q6 -6 12 0" stroke="#e8c547" strokeWidth="2" fill="none" />
  </g>
);
const Rain = () => (
  <g>
    {[8, 16, 24, 32].map((x) => <path key={x} d={`M${x} 10 l-4 10 M${x + 2} 26 l-4 10`} stroke="#5f6f8a" strokeWidth="1" />)}
    <path d="M30 6 Q26 30 32 56 M34 6 Q30 26 36 52" stroke="#2f7a3b" strokeWidth="1.4" fill="none" />
  </g>
);
const PLANTS = [Pine, Plum, Cherry, Wisteria, Iris, Peony, Clover, Moonhill, Chrysanthemum, Maple, Paulownia, Rain];

/* ── 열끗 그림 ── */
const Bird = ({ color = '#3b3b3b' }) => (
  <g>
    <path d="M10 28 Q16 20 24 24 L32 20 L28 27 Q24 34 14 32 Z" fill={color} />
    <circle cx="25" cy="24.5" r="0.9" fill="#fff" />
    <path d="M32 20 l3 -1 l-2 2.4 Z" fill="#e8a33a" />
  </g>
);
const Butterfly = () => (
  <g>
    <path d="M20 22 Q10 12 8 22 Q10 28 20 25 Q10 30 14 36 Q19 34 20 26 Q21 34 26 36 Q30 30 20 25 Q30 28 32 22 Q30 12 20 22 Z" fill="#7048e8" />
    <path d="M20 21 L20 30" stroke="#222" strokeWidth="1" />
  </g>
);
const Beast = ({ color }) => (
  <g>
    <ellipse cx="20" cy="26" rx="9" ry="5" fill={color} />
    <circle cx="29" cy="22" r="3.4" fill={color} />
    <path d="M13 30 v6 M17 30 v6 M23 30 v6 M27 30 v6" stroke={color} strokeWidth="1.6" />
  </g>
);
const Bridge = () => <path d="M6 32 Q20 18 34 32" stroke="#8a5a2b" strokeWidth="3.5" fill="none" />;
const Cup = () => (
  <g>
    <path d="M12 22 h16 l-3 10 h-10 Z" fill="#c92a2a" />
    <text x="20" y="29.5" textAnchor="middle" fontSize="5" fontWeight="900" fill="#ffd43b">壽</text>
  </g>
);
const YEOL_ART = {
  2: () => <Bird color="#4c7a2f" />,
  4: () => <Bird color="#2b2b2b" />,
  5: Bridge,
  6: Butterfly,
  7: () => <Beast color="#6b4423" />,
  8: () => <Bird color="#5c5c5c" />,
  9: Cup,
  10: () => <Beast color="#b8763a" />,
  12: () => <Bird color="#1c2a48" />,
};

const CardFace = ({ id }) => {
  const c = CARDS[id];
  const Plant = PLANTS[c.month - 1];
  const kindLabel = c.kind === PI && c.pi === 2 ? '쌍피' : KIND_LABEL[c.kind];
  const Yeol = c.kind === YEOL ? YEOL_ART[c.month] : null;
  return (
    <>
      <rect x="0.5" y="0.5" width="39" height="59" rx="3.5" className="hw-face" />
      <rect x="2" y="2" width="36" height="56" rx="2.5" className="hw-inner" />
      <g className="hw-plant"><Plant /></g>
      {c.kind === GWANG && c.month === 8 && <circle cx="22" cy="24" r="9" fill="#f8f1d8" stroke="#d9b44a" strokeWidth="1" />}
      {c.kind === GWANG && (
        <g>
          <circle cx="31" cy="11" r="6" fill="#d62839" stroke="#fff" strokeWidth="0.8" />
          <text x="31" y="13.4" textAnchor="middle" fontSize="7" fontWeight="900" fill="#fff">光</text>
        </g>
      )}
      {Yeol && <Yeol />}
      {c.bird && <circle cx="33" cy="10" r="3" fill="#f2c230" stroke="#7a5a00" strokeWidth="0.6" />}
      {c.kind === TTI && (
        <g>
          <path d="M14 8 L26 8 L25 40 L20 44 L15 40 Z" fill={RIBBON_COLOR[c.ribbon]} stroke="#fff" strokeWidth="0.8" />
          {RIBBON_TEXT[c.ribbon] && (
            <text x="20" y="18" textAnchor="middle" fontSize="6" fontWeight="800" fill="#fff" writingMode="tb" letterSpacing="1">{RIBBON_TEXT[c.ribbon]}</text>
          )}
        </g>
      )}
      <circle cx="7.5" cy="7.5" r="5" fill="#1d2026" />
      <text x="7.5" y="10" textAnchor="middle" fontSize={c.month >= 10 ? 6 : 7} fontWeight="900" fill="#fff">{c.month}</text>
      <g className={`hw-kind k-${c.kind}${c.pi === 2 ? ' k-ssang' : ''}${c.ribbon ? ` r-${c.ribbon}` : ''}`}>
        <rect x="3" y="49.5" width="34" height="8" rx="2" />
        <text x="20" y="55.6" textAnchor="middle" fontSize="6" fontWeight="800">{kindLabel}</text>
      </g>
    </>
  );
};

const CardBack = () => (
  <>
    <rect x="0.5" y="0.5" width="39" height="59" rx="3.5" className="hw-back" />
    <rect x="4" y="4" width="32" height="52" rx="2" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
    <circle cx="20" cy="30" r="7" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.4" />
  </>
);

/**
 * 화투 카드 한 장.
 * id: 0~47 (cards.js), back: 뒷면, selected/dim/highlight: 표시 상태
 */
const HwatuCard = ({ id, back = false, className = '', title, ...rest }) => {
  const c = back || id == null || id < 0 ? null : CARDS[id];
  return (
    <svg
      viewBox="0 0 40 60"
      className={`hw-card ${className}`}
      role="img"
      aria-label={title || (c ? `${c.month}월 ${c.kind === PI && c.pi === 2 ? '쌍피' : KIND_LABEL[c.kind]}` : '화투 뒷면')}
      {...rest}
    >
      {c ? <CardFace id={id} /> : <CardBack />}
    </svg>
  );
};

export default memo(HwatuCard);
