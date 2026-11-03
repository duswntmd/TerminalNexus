import React from 'react';
import './HwatuCard.css';

/*
 * 화투 카드 그림 (직접 그린 SVG, 외부 이미지 없음). 섯다·고스톱 등이 함께 쓴다.
 * 카드 번호는 섯다 엔진과 같다: 월 = id/2 + 1, 짝수 id 가 그 달의 특별한 패(1·3·8월 광, 나머지 열끗).
 * 고스톱처럼 한 달에 4장이 필요하면 month/kind 를 직접 넘긴다.
 */

const KIND_OF = (id) => {
  const m = (id >> 1) + 1;
  if (id % 2 === 0) return [1, 3, 8].includes(m) ? 'gwang' : 'yeol';
  return m === 8 ? 'yeol' : 'tti';
};

// 띠 색: 1~3월 홍단, 6·9·10월 청단, 4·5·7월 초단
const TTI_COLOR = { 1: '#c8202f', 2: '#c8202f', 3: '#c8202f', 6: '#2456a6', 9: '#2456a6', 10: '#2456a6', 4: '#c8202f', 5: '#c8202f', 7: '#c8202f' };
const TTI_TEXT = { 1: true, 2: true, 3: true, 6: false, 9: false, 10: false, 4: false, 5: false, 7: false };

const flower = (cx, cy, r, petal, core, key) => (
  <g key={key}>
    {[0, 72, 144, 216, 288].map((a) => (
      <circle key={a} cx={cx + r * Math.cos((a * Math.PI) / 180)} cy={cy + r * Math.sin((a * Math.PI) / 180)} r={r * 0.85} fill={petal} />
    ))}
    <circle cx={cx} cy={cy} r={r * 0.6} fill={core} />
  </g>
);

const dots = (pts, r, fill) => pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={r} fill={fill} />);

/** 달마다 꽃·풀 그림 (카드 아래쪽 공통 배경) */
const PLANT = {
  1: () => ( // 소나무
    <g fill="#2f6b3a">
      <path d="M30 40 L44 58 L16 58 Z" />
      <path d="M30 50 L48 70 L12 70 Z" />
      <rect x="27" y="68" width="6" height="12" fill="#6b4226" />
    </g>
  ),
  2: () => ( // 매화
    <g>
      <path d="M10 82 Q22 60 40 52 Q48 48 52 40" stroke="#5a3a22" strokeWidth="3" fill="none" />
      {flower(22, 64, 3.2, '#d8283a', '#f7d24a', 'a')}
      {flower(40, 52, 3.2, '#d8283a', '#f7d24a', 'b')}
      {flower(48, 70, 3.2, '#d8283a', '#f7d24a', 'c')}
    </g>
  ),
  3: () => ( // 벚꽃
    <g>
      {flower(18, 60, 4, '#f3a6c0', '#fff3f6', 'a')}
      {flower(34, 54, 4, '#f3a6c0', '#fff3f6', 'b')}
      {flower(46, 66, 4, '#f3a6c0', '#fff3f6', 'c')}
      {flower(26, 74, 4, '#f3a6c0', '#fff3f6', 'd')}
    </g>
  ),
  4: () => ( // 흑싸리
    <g>
      <path d="M14 36 Q16 60 12 84 M30 34 Q32 58 30 84 M46 36 Q44 60 48 84" stroke="#2a2a2a" strokeWidth="2" fill="none" />
      {dots([[16, 46], [14, 56], [16, 66], [31, 44], [32, 54], [31, 64], [45, 46], [46, 56], [45, 66]], 3, '#1e1e1e')}
    </g>
  ),
  5: () => ( // 난초
    <g>
      <path d="M14 84 Q18 56 10 38 M24 84 Q26 60 30 40 M36 84 Q38 62 50 44" stroke="#2f6b3a" strokeWidth="3" fill="none" />
      {flower(30, 46, 3.6, '#7b4bb3', '#f7d24a', 'a')}
      {flower(48, 50, 3.2, '#7b4bb3', '#f7d24a', 'b')}
    </g>
  ),
  6: () => ( // 모란
    <g>
      <path d="M10 80 Q20 70 30 76 Q40 82 50 72" stroke="#2f6b3a" strokeWidth="4" fill="none" />
      {flower(30, 58, 7, '#c8202f', '#f39aa6', 'a')}
    </g>
  ),
  7: () => ( // 홍싸리
    <g>
      <path d="M12 38 Q20 62 14 84 M32 36 Q36 60 30 84 M48 40 Q44 62 50 84" stroke="#6b4226" strokeWidth="2" fill="none" />
      {dots([[17, 48], [18, 58], [17, 68], [34, 46], [34, 56], [33, 66], [46, 50], [46, 60], [47, 70]], 2.8, '#d8283a')}
    </g>
  ),
  8: () => ( // 공산 (억새 언덕)
    <path d="M4 86 Q16 58 30 66 Q44 58 56 86 Z" fill="#2a2a2a" />
  ),
  9: () => ( // 국화
    <g>
      <path d="M30 84 L30 60" stroke="#2f6b3a" strokeWidth="3" />
      {flower(30, 56, 6, '#f2b705', '#c8202f', 'a')}
      {flower(14, 70, 4, '#f2b705', '#c8202f', 'b')}
      {flower(46, 72, 4, '#f2b705', '#c8202f', 'c')}
    </g>
  ),
  10: () => ( // 단풍
    <g fill="#d8283a">
      {[[18, 52], [40, 48], [28, 68], [46, 72]].map(([x, y], i) => (
        <path key={i} d={`M${x} ${y - 7} L${x + 2} ${y - 2} L${x + 7} ${y - 3} L${x + 3} ${y + 1} L${x + 5} ${y + 6} L${x} ${y + 3} L${x - 5} ${y + 6} L${x - 3} ${y + 1} L${x - 7} ${y - 3} L${x - 2} ${y - 2} Z`} />
      ))}
    </g>
  ),
};

/** 광·열끗의 주인공 그림 (위쪽 가운데) */
const HERO = {
  1: () => <circle cx="40" cy="30" r="9" fill="#d8283a" />, // 해
  2: () => <path d="M22 30 q8 -10 16 0 q-8 4 -16 0 Z M38 30 l6 -3" fill="#e9a03b" stroke="#5a3a22" strokeWidth="1" />, // 꾀꼬리
  3: () => ( // 장막
    <g>
      <rect x="10" y="22" width="40" height="22" fill="#c8202f" />
      {[14, 22, 30, 38, 46].map((x) => <rect key={x} x={x} y="22" width="3" height="22" fill="#fff" opacity="0.8" />)}
    </g>
  ),
  4: () => <path d="M18 32 q10 -12 22 -2 l6 -4 l-2 7 q-12 8 -26 -1 Z" fill="#6b8f3a" />, // 두견새
  5: () => <path d="M8 40 L52 40 L52 44 L8 44 Z M14 44 L14 52 M46 44 L46 52" stroke="#6b4226" strokeWidth="3" fill="#8a5a33" />, // 다리
  6: () => <path d="M30 34 l-12 -8 q-4 10 12 8 l12 -8 q4 10 -12 8" fill="#2456a6" />, // 나비
  7: () => <ellipse cx="30" cy="34" rx="15" ry="8" fill="#5a3a22" />, // 멧돼지
  8: () => <circle cx="30" cy="36" r="13" fill="#f7e9b0" stroke="#c8a640" strokeWidth="1.5" />, // 보름달
  9: () => <path d="M18 28 L42 28 L36 42 L24 42 Z" fill="#c8202f" stroke="#7a1520" strokeWidth="1" />, // 술잔
  10: () => ( // 사슴
    <g fill="#8a5a33">
      <ellipse cx="30" cy="36" rx="12" ry="6" />
      <path d="M38 32 l4 -10 M40 26 l4 -2 M42 32 l4 -8" stroke="#8a5a33" strokeWidth="1.5" />
    </g>
  ),
};

const GEESE = () => (
  <path d="M14 30 l6 4 l6 -4 M28 24 l6 4 l6 -4 M36 36 l6 4 l6 -4" stroke="#2a2a2a" strokeWidth="2" fill="none" />
);

const Back = () => (
  <svg className="hw-svg" viewBox="0 0 60 92" aria-hidden="true">
    <rect x="1" y="1" width="58" height="90" rx="6" fill="#8e1b26" stroke="#5c0f17" strokeWidth="2" />
    <rect x="6" y="6" width="48" height="80" rx="4" fill="none" stroke="#e6b65c" strokeWidth="1" opacity="0.7" />
    {[0, 1, 2, 3].map((r) => [0, 1, 2].map((c) => (
      <path key={`${r}-${c}`} d={`M${15 + c * 15} ${16 + r * 20} l6 6 l-6 6 l-6 -6 Z`} fill="#e6b65c" opacity="0.35" />
    )))}
  </svg>
);

/**
 * @param {number} id 카드 번호 0~19 (month/kind 를 넘기면 생략 가능)
 * @param {boolean} faceDown 뒷면
 * @param {boolean} highlight 강조 테두리
 * @param {string} label 접근성 이름 (없으면 "N월 광" 식으로 만듦)
 */
const HwatuCard = ({ id, month: monthProp, kind: kindProp, faceDown = false, highlight = false, className = '', label }) => {
  const month = monthProp ?? (id >> 1) + 1;
  const kind = kindProp ?? KIND_OF(id);
  const name = label || `${month}월 ${{ gwang: '광', yeol: '열끗', tti: '띠' }[kind]}`;

  return (
    <span className={`hw-card${faceDown ? ' is-down' : ''}${highlight ? ' is-hl' : ''} ${className}`} role="img" aria-label={faceDown ? '화투 뒷면' : name}>
      <span className="hw-inner">
        <span className="hw-face hw-front">
          <svg className="hw-svg" viewBox="0 0 60 92" aria-hidden="true">
            <rect x="1" y="1" width="58" height="90" rx="6" fill="#f6efe0" stroke="#2a2a2a" strokeWidth="2" />
            {PLANT[month]()}
            {kind === 'gwang' && HERO[month]()}
            {kind === 'yeol' && (month === 8 ? GEESE() : HERO[month]())}
            {kind === 'tti' && (
              <g transform="rotate(-12 30 40)">
                <rect x="20" y="22" width="20" height="40" fill={TTI_COLOR[month]} stroke="#2a2a2a" strokeWidth="0.8" />
                {TTI_TEXT[month] && <text x="30" y="46" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">紅</text>}
              </g>
            )}
            {/* 월 숫자 */}
            <rect x="3" y="3" width="21" height="17" rx="4" fill="#fff" stroke="#2a2a2a" strokeWidth="1" />
            <text x="13.5" y="16.5" textAnchor="middle" fontSize={month === 10 ? 12 : 14} fontWeight="900" fill="#1a1a1a">{month}</text>
            {kind === 'gwang' && (
              <g>
                <circle cx="48" cy="12" r="9" fill="#d8283a" stroke="#fff" strokeWidth="1.5" />
                <text x="48" y="16.5" textAnchor="middle" fontSize="12" fontWeight="900" fill="#fff">光</text>
              </g>
            )}
          </svg>
        </span>
        <span className="hw-face hw-back"><Back /></span>
      </span>
    </span>
  );
};

export default HwatuCard;
