import React, { useState, useEffect, useRef } from 'react';
import './ForgeExtras.css';

// ─── 몬스터 데이터 (총 13종) ───────────────────────────
const MONSTERS = [
  { id:  1, name: '훈련용 허수아비',     emoji: '🪵', hp:        100, reward:     50, color: '#9ca3af' },
  { id:  2, name: '숲의 거대 슬라임',    emoji: '💧', hp:        500, reward:    150, color: '#4ade80' },
  { id:  3, name: '붉은 송곳니 늑대',    emoji: '🐺', hp:      1_500, reward:    400, color: '#f87171' },
  { id:  4, name: '버려진 광산의 오크',  emoji: '👹', hp:      4_000, reward:    800, color: '#fb923c' },
  { id:  5, name: '독 안개 트롤',        emoji: '🧌', hp:     10_000, reward:  1_500, color: '#86efac' },
  { id:  6, name: '타락한 언데드 기사',  emoji: '💀', hp:     25_000, reward:  3_000, color: '#c084fc' },
  { id:  7, name: '화염 거인',           emoji: '🔥', hp:     60_000, reward:  6_000, color: '#f97316' },
  { id:  8, name: '심연의 드래곤',       emoji: '🐉', hp:    150_000, reward: 12_000, color: '#ef4444' },
  { id:  9, name: '공허의 파괴자',       emoji: '👁️', hp:    400_000, reward: 28_000, color: '#f59e0b' },
  { id: 10, name: '천공의 수호자',       emoji: '🦅', hp:  1_000_000, reward: 60_000, color: '#38bdf8' },
  { id: 11, name: '심판의 천사',         emoji: '😇', hp:  3_000_000, reward:140_000, color: '#fde68a' },
  { id: 12, name: '어둠의 군주',         emoji: '😈', hp: 10_000_000, reward:350_000, color: '#a855f7' },
  { id: 13, name: '신화 : 혼돈의 신',   emoji: '💫', hp: 50_000_000, reward:999_999, color: '#f59e0b' },
];

export const HuntingGround = ({ totalAtk, critChance = 0, critDmg = 0, armorPen = 0, onReward, onClose, pushLog }) => {
  const [stage, setStage] = useState(0);
  const [hp, setHp] = useState(MONSTERS[0].hp);
  const [particles, setParticles] = useState([]);
  const monster = MONSTERS[stage];
  const particleIdRef = useRef(0);

  const handleAttack = (e) => {
    if (hp <= 0) return;

    // ── 방어율 무시 배율 (항상 적용) ───────────────────────────
    // armorPen %만큼 데미지 추가 배율 부여
    // 예: armorPen=20 → 기본 데미지의 120% 적용
    const penMult = armorPen > 0 ? (1 + armorPen / 100) : 1;

    // ── 치명타 판정 ────────────────────────────────────────────
    // 기본 크리 배율 1.5 (150%) — critDmg가 0이어도 크리는 50% 추가 데미지
    // 치명타 피해(critDmg) % 는 기본 1.5에 추가됨
    // 예: critDmg=20 → 크리 배율 1.7 (170%)
    const isCrit = critChance > 0 && Math.random() * 100 < critChance;
    const critMult = isCrit ? (1.5 + critDmg / 100) : 1;

    // ── 최종 데미지 계산 ──────────────────────────────────────
    // totalAtk × 방어관통 배율 × 치명타 배율
    // · 일반:         totalAtk × 1    × 1
    // · 방어관통:     totalAtk × 1.XX × 1    (눈에 띄게 증가)
    // · 크리:         totalAtk × 1    × 1.5+ (50% 이상 증가)
    // · 크리+관통:    totalAtk × 1.XX × 1.5+ (가장 큰 데미지)
    const damage = Math.floor(totalAtk * penMult * critMult);

    // ── 파티클 레이블 결정 ─────────────────────────────────────
    const hasArmorPen = armorPen > 0;
    let label;
    if (isCrit && hasArmorPen) label = '💥크리+관통';
    else if (isCrit)           label = '💥크리티컬';
    else if (hasArmorPen)      label = '🔴방어관통';
    else                       label = null;

    // ── 타격 파티클 이펙트 ────────────────────────────────────
    if (e) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const pid = ++particleIdRef.current;
      setParticles(prev => [...prev, { id: pid, x, y, damage, isCrit, hasArmorPen, label }]);
      setTimeout(() => {
        setParticles(prev => prev.filter(p => p.id !== pid));
      }, 800);
    }

    const newHp = hp - damage;

    if (newHp <= 0) {
      onReward(monster.reward);
      let effectText = '';
      if (isCrit && hasArmorPen) effectText = ' 💥크리티컬 + 방어 관통!';
      else if (isCrit)           effectText = ' 💥크리티컬!';
      else if (hasArmorPen)      effectText = ' 🔴방어 관통!';
      pushLog(`⚔️ ${monster.name} 처치! (+${monster.reward.toLocaleString()}G)${effectText}`, 'success');

      if (stage < MONSTERS.length - 1) {
        const nextStage = stage + 1;
        setStage(nextStage);
        setHp(MONSTERS[nextStage].hp);
      } else {
        setHp(monster.hp);
      }
    } else {
      setHp(newHp);
    }

  };

  const handlePrev = () => {
    if (stage > 0) {
      setStage(s => s - 1);
      setHp(MONSTERS[stage - 1].hp);
    }
  };

  const handleNext = () => {
    if (stage < MONSTERS.length - 1) {
      setStage(s => s + 1);
      setHp(MONSTERS[stage + 1].hp);
    }
  };

  return (
    <div className="forge-modal-overlay" onClick={onClose}>
      <div className="forge-modal forge-hunting-modal" onClick={e => e.stopPropagation()}>
        <div className="forge-modal-header">
          <span>⚔️ 몬스터 사냥터</span>
          <button className="forge-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="hunting-stage-select">
          <button onClick={handlePrev} disabled={stage === 0}>◀</button>
          <span>Stage {stage + 1}</span>
          <button onClick={handleNext} disabled={stage === MONSTERS.length - 1}>▶</button>
        </div>

        <div className="hunting-arena" onClick={handleAttack}>
          {/* 파티클: 크리티컬=금색, 방어관통=주황, 복합=금+빨, 일반=빨 */}
          {particles.map(p => {
            const both   = p.isCrit && p.hasArmorPen;
            const color  = both     ? '#f59e0b'
                         : p.isCrit ? '#fbbf24'
                         : p.hasArmorPen ? '#fb923c'
                         : '#f87171';
            const size   = both || p.isCrit ? '1.5rem' : p.hasArmorPen ? '1.1rem' : '1rem';
            const shadow = both     ? '0 0 12px #fbbf24, 0 0 6px #ef4444'
                         : p.isCrit ? '0 0 8px #f59e0b'
                         : p.hasArmorPen ? '0 0 6px #fb923c'
                         : 'none';
            return (
              <div
                key={p.id}
                className="hunting-damage-text"
                style={{ left: p.x, top: p.y, color, fontSize: size, fontWeight: 900, textShadow: shadow }}
              >
                -{p.damage.toLocaleString()}
                {p.label && <span style={{ fontSize: '0.65em', marginLeft: 4 }}>{p.label}</span>}
              </div>
            );
          })}

          <div className="hunting-monster" style={{ color: monster.color }}>
            <span className="hunting-monster-emoji">{monster.emoji}</span>
            <div className="hunting-monster-name">{monster.name}</div>
          </div>

          <div className="hunting-hp-bar">
            <div className="hunting-hp-fill" style={{ width: `${Math.max(0, (hp / monster.hp) * 100)}%`, backgroundColor: monster.color }} />
          </div>
          <div className="hunting-hp-text">{Math.max(0, hp).toLocaleString()} / {monster.hp.toLocaleString()}</div>
        </div>

        <div className="hunting-info">
          <div>내 전투력: <strong style={{ color: '#4ade80' }}>{totalAtk.toLocaleString()}</strong></div>
          <div>처치 보상: <strong style={{ color: '#fbbf24' }}>{monster.reward.toLocaleString()}G</strong></div>
          {/* 치명타 정보 */}
          {critChance > 0 && (
            <div style={{ color: '#fbbf24', fontSize: '0.78rem', marginTop: 4 }}>
              💥 치명타 확률 <strong>{critChance}%</strong>
              {critDmg > 0 && <> / 치명타 피해 <strong>+{critDmg}%</strong></>}
            </div>
          )}
          {/* 방어율 무시 정보 */}
          {armorPen > 0 && (
            <div style={{ color: '#fb923c', fontSize: '0.78rem', marginTop: 2 }}>
              🔴 방어율 무시 <strong>+{armorPen}%</strong> <span style={{ color: '#6b7280' }}>(전투력에 반영됨)</span>
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '0.8rem', color: '#71717a' }}>
          몬스터를 클릭하여 공격하세요!
        </div>
      </div>
    </div>
  );
};

// ─── 잠재 능력 시스템 ───────────────────────────────
export const POTENTIAL_GRADES = [
  { name: '일반', color: '#9ca3af', min: 1, max: 3 },
  { name: '레어', color: '#60a5fa', min: 2, max: 5 },
  { name: '에픽', color: '#c084fc', min: 4, max: 8 },
  { name: '유니크', color: '#fbbf24', min: 7, max: 15 },
  { name: '레전드리', color: '#4ade80', min: 12, max: 25 },
];

export const getPotentialGradeIndex = (gradeName) => {
  const i = POTENTIAL_GRADES.findIndex(g => g.name === gradeName);
  return i >= 0 ? i : 0;
};

// 잠재능력 스탯 목록 (공격력 계열 / 치명타 계열 / 특수 계열 분리)
const POTENTIAL_STATS = [
  '공격력 증가',
  '치명타 확률',
  '치명타 피해',
  '보스 공격력',
  '방어율 무시',
];

export const rollPotentials = (currentGradeIndex) => {
  // ── 등급 업 전용 로직 ──────────────────────────────────────
  // 규칙: 현재 등급보다 절대 낮아지지 않는다.
  // - 일반(0) → 항상 레어(1)로 시작
  // - 레어(1) 이상 → 15% 확률로 등급업, 나머지는 현재 등급 유지
  // - 레전드리(4) 는 더 이상 올라갈 수 없으므로 그대로 유지
  let nextGradeIndex = currentGradeIndex;
  const roll = Math.random();

  if (currentGradeIndex === 0) {
    // 일반이면 무조건 레어로 승급
    nextGradeIndex = 1;
  } else if (currentGradeIndex < 4) {
    // 15% 확률로 한 단계 등급업, 나머지는 현재 등급 유지 (다운 없음)
    if (roll < 0.15) {
      nextGradeIndex = currentGradeIndex + 1;
    }
    // else: nextGradeIndex = currentGradeIndex (유지)
  }
  // currentGradeIndex === 4 (레전드리) 이면 그대로 유지

  const grade = POTENTIAL_GRADES[nextGradeIndex];

  // ── 잠재능력 옵션 생성 (2~3개) ──────────────────────────────
  const numOptions = Math.random() > 0.5 ? 3 : 2;
  const options = [];

  for (let i = 0; i < numOptions; i++) {
    const stat = POTENTIAL_STATS[Math.floor(Math.random() * POTENTIAL_STATS.length)];
    // 등급 범위 내 랜덤 수치 부여
    const val = Math.floor(Math.random() * (grade.max - grade.min + 1)) + grade.min;
    options.push(`${stat} +${val}%`);
  }

  // ── 전투력(atkBonus) 계산 ─────────────────────────────────
  // ┌─────────────────────────────────────────────────────────────────┐
  // │  스탯별 전투력 환산 규칙 (이중 계산 방지)                       │
  // │                                                                 │
  // │  ✅ 공격력 증가   → atkBonus에 직접 합산 (totalAtk에 반영)      │
  // │  ❌ 치명타 피해   → atkBonus 미반영. 사냥터 critMult에서만 계산  │
  // │  ❌ 방어율 무시   → atkBonus 미반영. 사냥터 penMult에서만 계산   │
  // │  ❌ 치명타 확률   → atkBonus 미반영. 사냥터 크리 판정에서만 사용 │
  // │  ❌ 보스 공격력   → atkBonus 미반영. (표시 전용)                │
  // └─────────────────────────────────────────────────────────────────┘
  let atkBonus = 0;

  options.forEach(opt => {
    const match = opt.match(/(\d+)%/);
    const val = match ? parseInt(match[1]) : 0;
    // 오직 공격력 증가만 totalAtk에 flat하게 합산
    if (opt.startsWith('공격력 증가')) atkBonus += val;
    // 치명타 피해, 방어율 무시는 HuntingGround에서 배율로 계산 → 여기서는 합산 안 함
  });

  return {
    grade: grade.name,
    options,
    atkBonus,
  };
};

