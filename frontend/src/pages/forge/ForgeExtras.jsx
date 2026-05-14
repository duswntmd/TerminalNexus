import React, { useState, useEffect, useRef } from 'react';
import './ForgeExtras.css';

// ─── 몬스터 데이터 ───────────────────────────────
const MONSTERS = [
  { id: 1, name: '훈련용 허수아비', emoji: '🪵', hp: 100, reward: 50, color: '#9ca3af' },
  { id: 2, name: '숲의 거대 슬라임', emoji: '💧', hp: 500, reward: 150, color: '#4ade80' },
  { id: 3, name: '붉은 송곳니 늑대', emoji: '🐺', hp: 1500, reward: 400, color: '#f87171' },
  { id: 4, name: '버려진 광산의 오크', emoji: '👹', hp: 4000, reward: 800, color: '#fb923c' },
  { id: 5, name: '타락한 언데드 기사', emoji: '💀', hp: 12000, reward: 2000, color: '#c084fc' },
  { id: 6, name: '심연의 드래곤', emoji: '🐉', hp: 45000, reward: 8000, color: '#ef4444' },
  { id: 7, name: '공허의 파괴자', emoji: '👁️', hp: 150000, reward: 25000, color: '#f59e0b' },
];

export const HuntingGround = ({ totalAtk, onReward, onClose, pushLog }) => {
  const [stage, setStage] = useState(0);
  const [hp, setHp] = useState(MONSTERS[0].hp);
  const [particles, setParticles] = useState([]);
  const monster = MONSTERS[stage];

  const handleAttack = (e) => {
    if (hp <= 0) return;
    
    // 타격 이펙트 (마우스 위치 기준)
    if (e) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setParticles(prev => [...prev, { id: Date.now(), x, y }]);
      setTimeout(() => {
        setParticles(prev => prev.filter(p => p.id !== Date.now())); // 대략적 클리어
      }, 500);
    }

    const damage = totalAtk;
    const newHp = hp - damage;
    
    if (newHp <= 0) {
      // 몬스터 처치
      onReward(monster.reward);
      pushLog(`⚔️ ${monster.name} 처치! (+${monster.reward}G)`, 'success');
      
      // 다음 몬스터로
      if (stage < MONSTERS.length - 1) {
        const nextStage = stage + 1;
        setStage(nextStage);
        setHp(MONSTERS[nextStage].hp);
      } else {
        // 최대 스테이지면 다시 부활
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
          {particles.map(p => (
            <div key={p.id} className="hunting-damage-text" style={{left: p.x, top: p.y}}>
              -{totalAtk.toLocaleString()}
            </div>
          ))}
          <div className="hunting-monster" style={{color: monster.color}}>
            <span className="hunting-monster-emoji">{monster.emoji}</span>
            <div className="hunting-monster-name">{monster.name}</div>
          </div>
          
          <div className="hunting-hp-bar">
            <div className="hunting-hp-fill" style={{width: `${Math.max(0, (hp / monster.hp) * 100)}%`, backgroundColor: monster.color}}></div>
          </div>
          <div className="hunting-hp-text">{Math.max(0, hp).toLocaleString()} / {monster.hp.toLocaleString()}</div>
        </div>

        <div className="hunting-info">
          <div>내 전투력: <strong style={{color:'#4ade80'}}>{totalAtk.toLocaleString()}</strong></div>
          <div>처치 보상: <strong style={{color:'#fbbf24'}}>{monster.reward.toLocaleString()}G</strong></div>
        </div>
        
        <div style={{textAlign:'center', marginTop:'12px', fontSize:'0.8rem', color:'#71717a'}}>
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

const POTENTIAL_STATS = ['공격력 증가', '치명타 확률', '치명타 피해', '보스 공격력', '방어율 무시'];

export const rollPotentials = (currentGradeIndex) => {
  // 등급 업/다운 또는 유지 확률
  let nextGradeIndex = currentGradeIndex;
  const roll = Math.random();
  
  if (currentGradeIndex === 0) { // 일반 -> 레어
    nextGradeIndex = 1;
  } else {
    // 10% 확률로 등급업 (레전드리 제외)
    if (roll < 0.1 && currentGradeIndex < 4) {
      nextGradeIndex++;
    } else if (roll > 0.95 && currentGradeIndex > 1) { // 5% 확률로 등급다운
      nextGradeIndex--;
    }
  }

  const grade = POTENTIAL_GRADES[nextGradeIndex];
  
  // 2~3개의 랜덤 잠재능력 생성
  const numOptions = Math.random() > 0.5 ? 3 : 2;
  const options = [];
  
  for (let i = 0; i < numOptions; i++) {
    const stat = POTENTIAL_STATS[Math.floor(Math.random() * POTENTIAL_STATS.length)];
    // 등급에 따른 수치 부여
    const val = Math.floor(Math.random() * (grade.max - grade.min + 1)) + grade.min;
    options.push(`${stat} +${val}%`);
  }
  
  // 합산 공격력 증가 % 계산 (편의상 첫번째 줄의 공격력 증가만 전투력에 반영하거나, 모두 합산)
  let atkBonus = 0;
  options.forEach(opt => {
    if (opt.startsWith('공격력 증가')) {
      atkBonus += parseInt(opt.match(/\d+/)[0] || 0);
    }
  });

  return {
    grade: grade.name,
    options,
    atkBonus
  };
};
