import WeaponSVG from './WeaponSVG';
import './WeaponDisplay.css';
import { getGrade, getGradeColor, getWeaponDisplayName } from './forgeUtils';

const WeaponDisplay = ({ equip, enhancing, result }) => {
  if (!equip) return (
    <div className="wd-empty">
      <div className="wd-empty-icon">⚒️</div>
      <div className="wd-empty-text">아이템을 구매하세요</div>
    </div>
  );

  if (equip.destroyed) return (
    <div className="wd-destroyed">
      <div className="wd-destroyed-icon">💀</div>
      <div className="wd-destroyed-text">아이템 파괴</div>
      <div className="wd-destroyed-sub">새 아이템을 구매하세요</div>
    </div>
  );

  const grade    = getGrade(equip.level);
  const color    = getGradeColor(grade);
  const dispName = getWeaponDisplayName(equip.name, equip.level);

  return (
    <div className={`wd-wrap wd-${grade} ${result || ''} ${enhancing ? 'enhancing' : ''}`}>
      <div className="wd-grade-badge" style={{ color }}>{grade}</div>

      {/* 레벨별 SVG 무기 */}
      <div className="wd-weapon-art">
        {grade === '신화' && <div className="wd-myth-ring" />}
        {grade === '전설' && <div className="wd-flame-aura" />}
        <div
          className={`wd-svg-wrap wd-emoji-${grade}`}
          style={{ filter: `drop-shadow(0 0 14px ${color})` }}
        >
          <WeaponSVG level={equip.level} itemId={equip.id} />
        </div>
        {grade === '영웅' && <div className="wd-magic-circle" />}
      </div>

      <div className="wd-name" style={{ color }}>
        {dispName}
        <span className="wd-level-badge" style={{ background: color }}>+{equip.level}</span>
      </div>

      <div className="wd-atk">
        공격력 <strong>{Math.floor(equip.baseAtk * (1 + equip.level * 0.18)) + (equip.potentialAtkBonus || 0)}</strong>
        {equip.potentialAtkBonus > 0 && <span style={{color:'#4ade80', fontSize:'0.8rem', marginLeft:'4px'}}>(+{equip.potentialAtkBonus}%)</span>}
      </div>

      <div className="wd-bar-wrap">
        {Array.from({ length: 20 }, (_, i) => (
          <div
            key={i}
            className={`wd-pip ${i < equip.level ? 'filled' : ''}`}
            style={i < equip.level ? { background: color, boxShadow: `0 0 4px ${color}` } : {}}
          />
        ))}
      </div>
      <div className="wd-progress">{equip.level} / 20</div>
    </div>
  );
};

export default WeaponDisplay;
