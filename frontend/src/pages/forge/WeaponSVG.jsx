// 레벨별 색상/장식 설정
const getLvStyle = (lv) => {
  const gems = Math.min(Math.floor(lv / 4), 5);
  const wings = lv >= 13;
  const flame = lv >= 15;
  if (lv <= 4)  return { c1:'#94a3b8', c2:'#e2e8f0', gems, wings, flame };
  if (lv <= 9)  return { c1:'#60a5fa', c2:'#bfdbfe', gems, wings, flame };
  if (lv <= 14) return { c1:'#a855f7', c2:'#e9d5ff', gems, wings, flame };
  if (lv <= 19) return { c1:'#fb923c', c2:'#fef3c7', gems, wings, flame };
  return              { c1:'#f59e0b', c2:'#fef08a', gems, wings, flame };
};

/* ── 공통 장식 (보석, 날개) ─────────────── */
const Gems = ({ count, c1, cx, gy, gh }) => (
  <>
    {count >= 1 && <circle cx={cx - 14} cy={gy + gh/2} r="3.5" fill="#fbbf24" stroke={c1} strokeWidth="1"/>}
    {count >= 2 && <circle cx={cx + 14} cy={gy + gh/2} r="3.5" fill="#fbbf24" stroke={c1} strokeWidth="1"/>}
    {count >= 3 && <circle cx={cx}      cy={gy + gh/2} r="3"   fill="white"   stroke={c1} strokeWidth="0.8"/>}
    {count >= 4 && <circle cx={cx - 7}  cy={gy + 2}    r="2.5" fill="#c084fc"/>}
    {count >= 5 && <circle cx={cx + 7}  cy={gy + 2}    r="2.5" fill="#c084fc"/>}
  </>
);

const Wings = ({ c1, cx, gy }) => (
  <>
    <path d={`M ${cx-18} ${gy+4} Q ${cx-32} ${gy-4} ${cx-26} ${gy+14}`} fill={c1} fillOpacity="0.25" stroke={c1} strokeWidth="1.5"/>
    <path d={`M ${cx+18} ${gy+4} Q ${cx+32} ${gy-4} ${cx+26} ${gy+14}`} fill={c1} fillOpacity="0.25" stroke={c1} strokeWidth="1.5"/>
  </>
);

/* ══════════════════════════════════════════════
   1. 단검 (itemId=1)
══════════════════════════════════════════════ */
const Dagger = ({ lv, s }) => {
  const { c1, c2, gems, wings } = s;
  const gid = `d1_${lv}`;
  const scale = 1 + (lv * 0.02); // 최대 1.4배
  return (
    <svg viewBox="0 0 80 200" width="80" height="160" style={{overflow:'visible'}}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor={c1} stopOpacity="0.5"/>
          <stop offset="50%"  stopColor="white" stopOpacity="0.9"/>
          <stop offset="100%" stopColor={c1} stopOpacity="0.5"/>
        </linearGradient>
      </defs>
      {wings && <Wings c1={c1} cx={40} gy={100}/>}
      <g transform={`translate(40,105) scale(${scale}) translate(-40,-105)`}>
        {/* 추가 톱날 (10강 이상) */}
        {lv >= 10 && <path d="M 35 70 L 25 80 L 35 90 M 45 70 L 55 80 L 45 90" fill="none" stroke={c1} strokeWidth="2"/>}
        {/* 거대 뿔 (15강 이상) */}
        {lv >= 15 && <path d="M 30 100 Q 15 70 20 50 Q 30 80 35 95 M 50 100 Q 65 70 60 50 Q 50 80 45 95" fill={c1} opacity="0.8"/>}
        {/* 기본 날 */}
        <path d={lv >= 5 ? "M 40 10 L 32 98 L 40 105 L 48 98 Z" : "M 40 22 L 35 98 L 40 102 L 45 98 Z"}
          fill={`url(#${gid})`} stroke={c1} strokeWidth="0.5"
          style={s.flame ? {filter:`drop-shadow(0 0 6px ${c1})`}:{}}/>
        <rect x={lv>=10 ? "20" : "24"} y="101" width={lv>=10 ? "40" : "32"} height="7" fill={c1} rx="3" stroke={c2} strokeWidth="0.5"/>
        <Gems count={gems} c1={c1} cx={40} gy={101} gh={7}/>
        <rect x="37.5" y="108" width="5" height="24" fill={c1} fillOpacity="0.7" rx="2"/>
        <circle cx="40" cy="136" r="5" fill={c1} stroke={c2} strokeWidth="0.8"/>
      </g>
    </svg>
  );
};

/* ══════════════════════════════════════════════
   2. 한손검 (itemId=2)
══════════════════════════════════════════════ */
const Sword = ({ lv, s }) => {
  const { c1, c2, gems, wings } = s;
  const gid = `d2_${lv}`;
  const scale = 1 + (lv * 0.025);
  return (
    <svg viewBox="0 0 80 210" width="80" height="170" style={{overflow:'visible'}}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor={c1} stopOpacity="0.5"/>
          <stop offset="40%"  stopColor={c2}/>
          <stop offset="50%"  stopColor="white" stopOpacity="0.95"/>
          <stop offset="60%"  stopColor={c2}/>
          <stop offset="100%" stopColor={c1} stopOpacity="0.5"/>
        </linearGradient>
      </defs>
      {wings && <Wings c1={c1} cx={40} gy={100}/>}
      <g transform={`translate(40,110) scale(${scale}) translate(-40,-110)`}>
        {/* 추가 가드 장식 */}
        {lv >= 10 && <path d="M 17 99 Q 10 80 15 70 Q 20 90 25 99 M 63 99 Q 70 80 65 70 Q 60 90 55 99" fill={c2}/>}
        {/* 톱니 날 (15강 이상) */}
        {lv >= 15 && <path d="M 33 40 L 25 45 L 34 50 M 34 60 L 23 65 L 35 70 M 47 40 L 55 45 L 46 50 M 46 60 L 57 65 L 45 70" fill={c1}/>}
        {/* 날 */}
        <path d={lv >= 5 ? "M 40 -5 L 30 90 L 36 102 L 44 102 L 50 90 Z" : "M 40 10 L 33 90 L 36 100 L 44 100 L 47 90 Z"}
          fill={`url(#${gid})`} stroke={c1} strokeWidth="0.5"
          style={s.flame ? {filter:`drop-shadow(0 0 8px ${c1})`}:{}}/>
        <line x1="40" y1={lv>=5 ? "5" : "18"} x2="40" y2="88" stroke="white" strokeOpacity="0.3" strokeWidth="1.2"/>
        <rect x="17" y={lv>=5 ? "102" : "99"} width="46" height="9" fill={c1} rx="4" stroke={c2} strokeWidth="0.5"/>
        <Gems count={gems} c1={c1} cx={40} gy={lv>=5?102:99} gh={9}/>
        <rect x="36.5" y={lv>=5 ? "111" : "108"} width="7" height="34" fill={c1} fillOpacity="0.7" rx="2.5"/>
        {[0,1,2,3].map(i=><line key={i} x1="37" y1={(lv>=5?118:115)+i*8} x2="43" y2={(lv>=5?118:115)+i*8} stroke={c2} strokeOpacity="0.5" strokeWidth="1"/>)}
        <ellipse cx="40" cy={lv>=5?"150":"147"} rx="8" ry="5" fill={c1} stroke={c2} strokeWidth="0.8"/>
      </g>
    </svg>
  );
};

/* ══════════════════════════════════════════════
   3. 대검 (itemId=3)
══════════════════════════════════════════════ */
const Greatsword = ({ lv, s }) => {
  const { c1, c2, gems, wings } = s;
  const gid = `d3_${lv}`;
  const scale = 1 + (lv * 0.03);
  return (
    <svg viewBox="0 0 80 220" width="80" height="185" style={{overflow:'visible'}}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor={c1} stopOpacity="0.4"/>
          <stop offset="35%"  stopColor={c2}/>
          <stop offset="50%"  stopColor="white" stopOpacity="0.95"/>
          <stop offset="65%"  stopColor={c2}/>
          <stop offset="100%" stopColor={c1} stopOpacity="0.4"/>
        </linearGradient>
      </defs>
      {wings && <Wings c1={c1} cx={40} gy={100}/>}
      <g transform={`translate(40,120) scale(${scale}) translate(-40,-120)`}>
        {/* 가드 뿔 (10강) */}
        {lv >= 10 && <path d="M 10 99 Q -5 70 0 50 Q 15 80 18 99 M 70 99 Q 85 70 80 50 Q 65 80 62 99" fill={c2}/>}
        {/* 폭주하는 날 (15강) */}
        {lv >= 15 && <path d="M 33 20 L 15 30 L 29 45 M 47 20 L 65 30 L 51 45" fill="none" stroke={c1} strokeWidth="4"/>}
        {/* 넓은 날 */}
        <path d={lv >= 5 ? "M 40 -15 L 24 84 L 33 100 L 47 100 L 56 84 Z" : "M 40 5 L 29 84 L 33 100 L 47 100 L 51 84 Z"}
          fill={`url(#${gid})`} stroke={c1} strokeWidth="0.5"
          style={s.flame ? {filter:`drop-shadow(0 0 10px ${c1})`}:{}}/>
        <line x1="37" y1="14" x2="37" y2="86" stroke="white" strokeOpacity="0.2" strokeWidth="1"/>
        <line x1="43" y1="14" x2="43" y2="86" stroke="white" strokeOpacity="0.2" strokeWidth="1"/>
        <path d="M 10 99 L 70 99 L 66 112 L 14 112 Z" fill={c1} stroke={c2} strokeWidth="0.5"/>
        <path d="M 10 99 L 3 93 L 9 107 L 14 112 Z"  fill={c1}/>
        <path d="M 70 99 L 77 93 L 71 107 L 66 112 Z" fill={c1}/>
        <Gems count={gems} c1={c1} cx={40} gy={99} gh={13}/>
        <rect x="35.5" y="112" width="9" height="44" fill={c1} fillOpacity="0.7" rx="3"/>
        {[0,1,2,3,4].map(i=><line key={i} x1="36" y1={119+i*8} x2="44" y2={119+i*8} stroke={c2} strokeOpacity="0.4" strokeWidth="1"/>)}
        <path d="M 40 158 L 30 165 L 40 174 L 50 165 Z" fill={c1} stroke={c2} strokeWidth="0.8"/>
      </g>
    </svg>
  );
};

/* ══════════════════════════════════════════════
   4. 도끼 (itemId=4)
══════════════════════════════════════════════ */
const Axe = ({ lv, s }) => {
  const { c1, c2, gems, wings } = s;
  const gid = `d4_${lv}`;
  const scale = 1 + (lv * 0.025);
  return (
    <svg viewBox="0 0 80 200" width="80" height="165" style={{overflow:'visible'}}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor={c1} stopOpacity="0.5"/>
          <stop offset="60%"  stopColor={c2}/>
          <stop offset="100%" stopColor="white" stopOpacity="0.9"/>
        </linearGradient>
      </defs>
      {wings && <Wings c1={c1} cx={40} gy={85}/>}
      <g transform={`translate(40,130) scale(${scale}) translate(-40,-130)`}>
        <rect x="38.5" y="10" width="5" height="160" fill={c1} fillOpacity="0.6" rx="2.5"/>
        {/* 양날 도끼 (10강 이상) */}
        {lv >= 10 && <path d="M 39 15 Q 5 25 8 60 Q 12 88 39 90 L 41 90 Q 52 75 46 48 Q 42 25 41 15 Z" fill={`url(#${gid})`} stroke={c1} strokeWidth="0.8"/>}
        {/* 거대 스파이크 (15강 이상) */}
        {lv >= 15 && <path d="M 40 10 L 40 -15 M 35 15 L 20 0 M 45 15 L 60 0" fill="none" stroke={c1} strokeWidth="2.5"/>}
        {/* 기본 도끼날 */}
        <path d={lv >= 5 ? "M 41 5 Q 85 20 80 65 Q 75 95 41 100 L 39 100 Q 25 75 34 45 Q 38 15 39 5 Z" : "M 41 15 Q 75 25 72 60 Q 68 88 41 90 L 39 90 Q 28 75 34 48 Q 38 25 39 15 Z"}
          fill={`url(#${gid})`} stroke={c1} strokeWidth="0.8"
          style={s.flame ? {filter:`drop-shadow(0 0 8px ${c1})`}:{}}/>
        <path d={lv >= 5 ? "M 41 10 Q 78 28 73 67 Q 69 90 41 95" : "M 41 20 Q 70 32 66 62 Q 62 82 41 87"}
          fill="none" stroke="white" strokeOpacity="0.35" strokeWidth="1.5"/>
        {gems >= 1 && <circle cx="55" cy="52" r="4" fill="#fbbf24" stroke={c1} strokeWidth="1"/>}
        {gems >= 2 && <circle cx="60" cy="38" r="3" fill={c2} stroke={c1} strokeWidth="0.8"/>}
        {gems >= 3 && <circle cx="58" cy="68" r="3" fill="white" stroke={c1} strokeWidth="0.8"/>}
        <ellipse cx="41" cy="175" rx="6" ry="4" fill={c1} stroke={c2} strokeWidth="0.8"/>
      </g>
    </svg>
  );
};

/* ══════════════════════════════════════════════
   5. 창 (itemId=5)
══════════════════════════════════════════════ */
const Spear = ({ lv, s }) => {
  const { c1, c2, gems, wings } = s;
  const gid = `d5_${lv}`;
  const scale = 1 + (lv * 0.03);
  return (
    <svg viewBox="0 0 80 220" width="80" height="185" style={{overflow:'visible'}}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor={c1} stopOpacity="0.4"/>
          <stop offset="50%"  stopColor="white" stopOpacity="0.95"/>
          <stop offset="100%" stopColor={c1} stopOpacity="0.4"/>
        </linearGradient>
      </defs>
      {wings && <Wings c1={c1} cx={40} gy={90}/>}
      <g transform={`translate(40,120) scale(${scale}) translate(-40,-120)`}>
        <rect x="38.5" y="80" width="4" height="130" fill={c1} fillOpacity="0.55" rx="2"/>
        {/* 삼지창 형태 (10강 이상) */}
        {lv >= 10 && <path d="M 25 74 Q 15 50 20 20 M 55 74 Q 65 50 60 20" fill="none" stroke={c1} strokeWidth="3"/>}
        {/* 에너지 스피어 (15강 이상) */}
        {lv >= 15 && <circle cx="40" cy="0" r="10" fill={c1} style={{filter:`drop-shadow(0 0 10px ${c1})`}}/>}
        {/* 기본 창끝 */}
        <path d={lv >= 5 ? "M 40 -10 L 28 45 L 34 68 L 40 74 L 46 68 L 52 45 Z" : "M 40 5 L 32 48 L 36 68 L 40 74 L 44 68 L 48 48 Z"}
          fill={`url(#${gid})`} stroke={c1} strokeWidth="0.8"
          style={s.flame ? {filter:`drop-shadow(0 0 10px ${c1})`}:{}}/>
        <line x1="40" y1="12" x2="40" y2="64" stroke="white" strokeOpacity="0.4" strokeWidth="1"/>
        <rect x={lv>=5?"20":"25"} y="74" width={lv>=5?"40":"30"} height="7" fill={c1} rx="3" stroke={c2} strokeWidth="0.5"/>
        <Gems count={gems} c1={c1} cx={40} gy={74} gh={7}/>
        {[0,1,2].map(i => lv >= i*5 && (
          <ellipse key={i} cx="40.5" cy={100 + i*28} rx="4" ry="3"
            fill="none" stroke={c1} strokeWidth="1.5" strokeOpacity="0.7"/>
        ))}
        <path d="M 37 208 L 40 218 L 43 208 Z" fill={c1}/>
      </g>
    </svg>
  );
};

/* ══════════════════════════════════════════════
   메인 컴포넌트
══════════════════════════════════════════════ */
const SHAPES = { 1: Dagger, 2: Sword, 3: Greatsword, 4: Axe, 5: Spear };

const WeaponSVG = ({ level = 0, itemId = 1 }) => {
  const lv = Math.max(0, Math.min(20, level));
  const s  = getLvStyle(lv);
  const Shape = SHAPES[itemId] || Sword;
  return <Shape lv={lv} s={s} />;
};

export default WeaponSVG;
