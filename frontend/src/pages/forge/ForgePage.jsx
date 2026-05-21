import { useState, useEffect, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../../context/AuthContext';
import { fetchWithAccess } from '../../util/fetchUtil';
import WeaponDisplay from './WeaponDisplay';
import WeaponSVG from './WeaponSVG';
import {
  loadSave, writeSave, canAttendToday, markAttendance,
  ACHIEVEMENTS, checkNewAchievements,
  getGrade as utilGetGrade, getGradeColor, getWeaponDisplayName, getWeaponEmoji
} from './forgeUtils';
import './ForgePage.css';

// ─────────────────────────────────────────────
// 상수 정의
// ─────────────────────────────────────────────

import { HuntingGround, POTENTIAL_GRADES, getPotentialGradeIndex, rollPotentials } from './ForgeExtras';

const ITEMS = [
  { id: 1, name: '단검',     emoji: '🗡️',  baseAtk: 15,  price: 200,  sell: 80   },
  { id: 2, name: '롱소드',       emoji: '⚔️',  baseAtk: 30, price: 500,  sell: 200  },
  { id: 3, name: '대검',   emoji: '🔪',  baseAtk: 55, price: 1200, sell: 480  },
  { id: 4, name: '전투 도끼', emoji: '🪓',  baseAtk: 80, price: 2500, sell: 1000 },
  { id: 5, name: '발키리 창', emoji: '🏹',  baseAtk: 120, price: 5000, sell: 2000 },
];

// 강화석 대량구매 팩
const STONE_PACKS = [
  { id: 's1', name: '강화석 30개',   count: 30,   price: 450  },
  { id: 's2', name: '강화석 100개',  count: 100,  price: 1400 },
  { id: 's3', name: '강화석 300개',  count: 300,  price: 3800 },
  { id: 's4', name: '강화석 1000개', count: 1000, price: 11000},
];

// 강화 단계별 판매가 (판매 = base_sell + level^2 * 120)
const getSellValue = (item, level) =>
  Math.floor((item.sell || 80) + level * level * 120);


const GRADES = [
  { name: '일반',   color: '#9ca3af', min: 0,  max: 5  },
  { name: '희귀',   color: '#60a5fa', min: 6,  max: 10 },
  { name: '영웅',   color: '#c084fc', min: 11, max: 15 },
  { name: '전설',   color: '#fb923c', min: 16, max: 19 },
  { name: '신화',   color: '#f59e0b', min: 20, max: 20 },
];

// 강화 단계별 설정 (success + maintain + drop + destroy = 100)
const ENHANCE_CONFIG = [
  { level: 0,  rate: 100, maintain: 0,  drop: 0,  destroy: 0,  gold: 50,    stone: 1 },
  { level: 1,  rate: 95,  maintain: 5,  drop: 0,  destroy: 0,  gold: 80,    stone: 1 },
  { level: 2,  rate: 90,  maintain: 10, drop: 0,  destroy: 0,  gold: 120,   stone: 1 },
  { level: 3,  rate: 85,  maintain: 15, drop: 0,  destroy: 0,  gold: 180,   stone: 1 },
  { level: 4,  rate: 80,  maintain: 20, drop: 0,  destroy: 0,  gold: 250,   stone: 1 },
  { level: 5,  rate: 70,  maintain: 30, drop: 0,  destroy: 0,  gold: 400,   stone: 2 },
  { level: 6,  rate: 60,  maintain: 20, drop: 20, destroy: 0,  gold: 600,   stone: 2 },
  { level: 7,  rate: 50,  maintain: 25, drop: 25, destroy: 0,  gold: 900,   stone: 2 },
  { level: 8,  rate: 40,  maintain: 30, drop: 30, destroy: 0,  gold: 1500,  stone: 3 },
  { level: 9,  rate: 30,  maintain: 35, drop: 35, destroy: 0,  gold: 2500,  stone: 3 },
  { level: 10, rate: 25,  maintain: 35, drop: 35, destroy: 5,  gold: 4000,  stone: 4 },
  { level: 11, rate: 20,  maintain: 35, drop: 35, destroy: 10, gold: 6000,  stone: 5 },
  { level: 12, rate: 15,  maintain: 35, drop: 35, destroy: 15, gold: 9000,  stone: 5 },
  { level: 13, rate: 10,  maintain: 30, drop: 40, destroy: 20, gold: 14000, stone: 6 },
  { level: 14, rate: 8,   maintain: 27, drop: 40, destroy: 25, gold: 20000, stone: 7 },
  { level: 15, rate: 6,   maintain: 24, drop: 40, destroy: 30, gold: 30000, stone: 8 },
  { level: 16, rate: 5,   maintain: 20, drop: 40, destroy: 35, gold: 45000, stone: 9 },
  { level: 17, rate: 4,   maintain: 16, drop: 40, destroy: 40, gold: 60000, stone: 10 },
  { level: 18, rate: 3,   maintain: 12, drop: 35, destroy: 50, gold: 80000, stone: 12 },
  { level: 19, rate: 2,   maintain: 8,  drop: 30, destroy: 60, gold: 100000,stone: 15 },
];

const INITIAL_GOLD  = 300000;
const INITIAL_STONE = 50;
const INITIAL_SHIELD = 5;
const BLESSING_BONUS = 3;

// ─────────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────────
const getGrade = (level) => GRADES.find(g => level >= g.min && level <= g.max) || GRADES[0];
const getConfig = (level) => ENHANCE_CONFIG[Math.min(level, 19)];
const calcAtk = (baseAtk, level) => Math.floor(baseAtk * (1 + level * 0.18));
const calcBonusRate = (base, blessingStack) => Math.min(base + blessingStack * BLESSING_BONUS, 95);

const getProbabilities = (cfg, effectiveRate) => {
  let success = effectiveRate;
  let diff = effectiveRate - cfg.rate;
  let destroy = cfg.destroy;
  let drop = cfg.drop;
  let maintain = cfg.maintain;

  const subtract = (val, amount) => {
    if (amount <= 0) return [val, 0];
    if (val >= amount) return [val - amount, 0];
    return [0, amount - val];
  };

  [destroy, diff] = subtract(destroy, diff);
  [drop, diff]    = subtract(drop, diff);
  [maintain, diff] = subtract(maintain, diff);

  return { success, maintain, drop, destroy };
};

// ─────────────────────────────────────────────
// 컴포넌트
// ─────────────────────────────────────────────
const ForgePage = () => {
  const { user } = useAuth();
  const username = user?.username || null;

  const [gold,           setGold]          = useState(INITIAL_GOLD);
  const [stone,          setStone]         = useState(INITIAL_STONE);
  const [shield,         setShield]        = useState(INITIAL_SHIELD);
  const [equip,          setEquip]         = useState(null);
  const [enhancing,      setEnhancing]     = useState(false);
  const [result,         setResult]        = useState(null);
  const [blessingStack,  setBlessingStack] = useState(0);
  const [useShield,      setUseShield]     = useState(false);
  const [log,            setLog]           = useState([]);
  const [totalTries,     setTotalTries]    = useState(0);
  const [totalSuccess,   setTotalSuccess]  = useState(0);
  const [totalDestroy,   setTotalDestroy]  = useState(0);
  const [maxLevel,       setMaxLevel]      = useState(0);
  const [maxStreak,      setMaxStreak]     = useState(0);
  const [showShop,       setShowShop]      = useState(true);
  const [particles,      setParticles]     = useState([]);
  const [guaranteeCount, setGuaranteeCount]= useState(0);
  const [achievements,   setAchievements]  = useState([]);
  const [newAchiev,      setNewAchiev]     = useState(null);
  const [showHOF,        setShowHOF]       = useState(false);
  const [hofData,        setHofData]       = useState([]);
  const [attendDone,     setAttendDone]    = useState(false);
  const [attendMsg,      setAttendMsg]     = useState(null);
  const [showCodex,      setShowCodex]     = useState(false);
  const [unlockedLevels, setUnlockedLevels]= useState({ 0: { id: 1, name: '단검' } });
  const [codexDetail,    setCodexDetail]   = useState(null); 
  const [showReset,      setShowReset]     = useState(false);
  const [showHunting,    setShowHunting]   = useState(false); // 사냥터 모달
  const [booster,        setBooster]       = useState(0); // 강화 확률 증가 물약 (+5%)
  const [cube,           setCube]          = useState(0); // 잠재능력 재설정 큐브
  const [useBooster,     setUseBooster]    = useState(false); // 부스터 사용 여부
  const [bgmOn,          setBgmOn]         = useState(false); // BGM 토글
  const [hofDetail,      setHofDetail]     = useState(null); // 명예의 전당 상세 무기 정보
  const logRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (bgmOn && audioRef.current) {
      audioRef.current.volume = 0.3;
      audioRef.current.play().catch(() => setBgmOn(false));
    } else if (audioRef.current) {
      audioRef.current.pause();
    }
  }, [bgmOn]);

  const pushLog = useCallback((text, type) => {
    setLog(prev => [...prev.slice(-49), { text, type, id: Date.now() }]);
  }, []);

  useEffect(() => {
    if (!username) return;
    const saved = loadSave(username);
    if (saved) {
      setGold(saved.gold ?? INITIAL_GOLD);
      setStone(saved.stone ?? INITIAL_STONE);
      setShield(saved.shield ?? INITIAL_SHIELD);
      setEquip(saved.equip ?? null);
      setMaxLevel(saved.maxLevel ?? 0);
      setTotalTries(saved.totalTries ?? 0);
      setTotalSuccess(saved.totalSuccess ?? 0);
      setTotalDestroy(saved.totalDestroy ?? 0);
      setAchievements(saved.achievements ?? []);
      setMaxStreak(saved.maxStreak ?? 0);
      setBooster(saved.booster ?? 0);
      setCube(saved.cube ?? 0);

      // 도감 데이터 마이그레이션 (배열 -> 객체)
      if (saved.unlockedLevels) {
        if (Array.isArray(saved.unlockedLevels)) {
          const migrated = {};
          saved.unlockedLevels.forEach(lv => migrated[lv] = { id: 1, name: '단검' });
          setUnlockedLevels(migrated);
        } else {
          setUnlockedLevels(saved.unlockedLevels);
        }
      } else {
        setUnlockedLevels({ 0: { id: 1, name: '단검' } });
      }
    }
    setAttendDone(!canAttendToday(username));
  }, [username]);

  useEffect(() => {
    if (!username) return;
    writeSave(username, { gold, stone, shield, equip, maxLevel, totalTries, totalSuccess, totalDestroy, achievements, maxStreak, unlockedLevels, booster, cube });
  }, [username, gold, stone, shield, equip, maxLevel, totalTries, totalSuccess, totalDestroy, achievements, maxStreak, unlockedLevels, booster, cube]);

  // ── 최고기록 백엔드 동기화 (fetchWithAccess 사용 → 자동 토큰 처리)
  useEffect(() => {
    if (!username || maxLevel === 0 || !equip) return;
    if (equip.level !== maxLevel) return; // 최고 레벨 장비를 들고 있을 때만 백엔드 업데이트

    const gradeName = utilGetGrade(maxLevel);
    const wName = getWeaponDisplayName(equip.name, maxLevel);

    fetchWithAccess('/api/forge/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        maxLevel, 
        weaponName: wName, 
        grade: gradeName, 
        totalTries, 
        totalSuccess,
        potentialGrade: equip.potentialGrade || null,
        potentialOptions: equip.potentialOptions || null,
        potentialAtkBonus: equip.potentialAtkBonus || 0
      }),
    }).catch(() => {}); // 실패 시 무시
  }, [maxLevel, equip?.potentialGrade, equip?.potentialOptions]); // 최고 레벨 갱신 또는 잠재 능력 변경 시 백엔드 업데이트

  // ── 출석 체크 ───────────────────────────────────────────
  const handleAttendance = useCallback(() => {
    if (!username || attendDone) return;
    const reward = markAttendance(username);
    setGold(g => g + reward.gold);
    setStone(s => s + reward.stone);
    setMaxStreak(prev => Math.max(prev, reward.streak));
    setAttendDone(true);
    setAttendMsg(`🎁 출석 완료! 골드 +${reward.gold.toLocaleString()} / 강화석 +${reward.stone} (${reward.streak}일 연속)`);
    setTimeout(() => setAttendMsg(null), 4000);
    pushLog(`📅 ${reward.streak}일 연속 출석! 골드 +${reward.gold.toLocaleString()} / 강화석 +${reward.stone}`, 'buy');
  }, [username, attendDone, pushLog]);

  // ── 명예의 전당 열기 ────────────────────────────────────
  const openHOF = useCallback(async () => {
    setShowHOF(true);
    try {
      const res = await fetch('/api/forge/leaderboard');
      if (res.ok) setHofData(await res.json());
    } catch {}
  }, []);

  // ── 업적 체크 ───────────────────────────────────────────
  const checkAchievements = useCallback((stats) => {
    const newOnes = checkNewAchievements(achievements, stats);
    if (newOnes.length > 0) {
      setAchievements(prev => [...prev, ...newOnes.map(a => a.id)]);
      setNewAchiev(newOnes[0]);
      setTimeout(() => setNewAchiev(null), 3500);
    }
  }, [achievements]);


  // 파티클 생성
  const spawnParticles = (type) => {
    const count = type === 'success' ? 20 : type === 'destroy' ? 15 : 8;
    const newParticles = Array.from({ length: count }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      color: type === 'success' ? (Math.random() > 0.5 ? '#fbbf24' : '#818cf8')
           : type === 'destroy' ? (Math.random() > 0.5 ? '#ef4444' : '#6b7280')
           : '#60a5fa',
      size: Math.random() * 8 + 4,
    }));
    setParticles(newParticles);
    setTimeout(() => setParticles([]), 1200);
  };

  // 아이템 구매
  const buyItem = (item) => {
    if (gold < item.price) { pushLog('골드가 부족합니다!', 'error'); return; }
    setGold(g => g - item.price);
    setEquip({ ...item, level: 0, destroyed: false });
    setBlessingStack(0);
    setGuaranteeCount(0);
    setResult(null);
    setShowShop(false);
    pushLog(`${item.emoji} ${item.name}을(를) 구매했습니다.`, 'buy');
  };

  // 강화 실행
  const enhance = () => {
    if (!equip || equip.destroyed || enhancing) return;
    const cfg = getConfig(equip.level);
    if (gold < cfg.gold)  { pushLog('골드가 부족합니다!', 'error'); return; }
    if (stone < cfg.stone){ pushLog('강화석이 부족합니다!', 'error'); return; }
    if (equip.level >= 20){ pushLog('이미 최고 단계입니다!', 'error'); return; }

    setGold(g  => g  - cfg.gold);
    setStone(s => s  - cfg.stone);
    setEnhancing(true);
    setResult(null);
    setTotalTries(t => t + 1);

    let effectiveRate = guaranteeCount >= 29
      ? 100
      : calcBonusRate(cfg.rate, blessingStack);
      
    const boosterActive = useBooster && booster > 0;
    if (boosterActive) {
      setBooster(b => b - 1);
      effectiveRate = Math.min(100, effectiveRate + 5);
      setUseBooster(false);
    }

    setTimeout(() => {
      const roll = Math.random() * 100;
      const success = roll < effectiveRate;

      if (success) {
        const newLevel = equip.level + 1;
        setEquip(e => ({ ...e, level: newLevel }));
        setBlessingStack(0);
        setGuaranteeCount(0);
        setTotalSuccess(s => s + 1);
        setMaxLevel(m => Math.max(m, newLevel));
        setUnlockedLevels(prev => {
          if (!prev[newLevel]) {
            return { ...prev, [newLevel]: { id: equip.id, name: equip.name } };
          }
          return prev;
        });
        setResult('success');
        spawnParticles('success');
        pushLog(`✅ +${equip.level} → +${newLevel} 강화 성공! (확률 ${effectiveRate}%)`, 'success');
        checkAchievements({ maxLevel: newLevel, totalTries: totalTries + 1, totalSuccess: totalSuccess + 1, totalDestroy, maxStreak });
      } else {
        setGuaranteeCount(g => g + 1);
        const shieldActive = useShield && shield > 0;

        if (shieldActive) {
          setShield(s => s - 1);
          setUseShield(false);
          setBlessingStack(b => b + 1);
          setResult('fail');
          pushLog(`🛡️ 보호권 발동! 단계 유지 (+${equip.level}) (확률 ${effectiveRate}%)`, 'shield');
        } else if (cfg.fail === 'none') {
          setBlessingStack(b => b + 1);
          setResult('fail');
          pushLog(`❌ 강화 실패. 단계 유지 (+${equip.level}) (확률 ${effectiveRate}%)`, 'fail');
        } else if (cfg.fail === 'down1') {
          const newLevel = Math.max(0, equip.level - 1);
          setEquip(e => ({ ...e, level: newLevel }));
          setBlessingStack(b => b + 1);
          setResult('down');
          spawnParticles('down');
          pushLog(`💔 강화 실패. +${equip.level} → +${newLevel} 하락 (확률 ${effectiveRate}%)`, 'fail');
        } else if (cfg.fail === 'down2') {
          const newLevel = Math.max(0, equip.level - 2);
          setEquip(e => ({ ...e, level: newLevel }));
          setBlessingStack(b => b + 1);
          setResult('down');
          spawnParticles('down');
          pushLog(`💔 강화 실패. +${equip.level} → +${newLevel} 하락 (확률 ${effectiveRate}%)`, 'fail');
        } else if (cfg.fail === 'destroy') {
          setEquip(e => ({ ...e, destroyed: true }));
          setBlessingStack(0);
          setTotalDestroy(d => d + 1);
          setResult('destroy');
          spawnParticles('destroy');
          pushLog(`💀 아이템 파괴! +${equip.level} 강화가 실패하여 사라졌습니다.`, 'destroy');
          checkAchievements({ maxLevel, totalTries: totalTries + 1, totalSuccess, totalDestroy: totalDestroy + 1, maxStreak });
        }
      }
      setEnhancing(false);
    }, 1400);
  };

  const cfg = equip && !equip.destroyed ? getConfig(equip.level) : null;
  const grade = equip ? getGrade(equip.level) : null;
  const effectiveRate = cfg
    ? (guaranteeCount >= 29 ? 100 : calcBonusRate(cfg.rate, blessingStack))
    : 0;

  const resetGame = () => {
    setGold(INITIAL_GOLD); setStone(INITIAL_STONE); setShield(INITIAL_SHIELD); setEquip(null);
    setMaxLevel(0); setTotalTries(0); setTotalSuccess(0); setTotalDestroy(0); setAchievements([]); setMaxStreak(0); setUnlockedLevels({ 0: { id: 1, name: '단검' } });
    setBlessingStack(0); setGuaranteeCount(0); setLog([]); setShowReset(false); setBooster(0); setCube(0);
    pushLog('게임을 초기화했습니다. 새로운 시작!', 'success');
  };

  const handleAppraise = () => {
    if (cube < 1) { pushLog('큐브가 부족합니다!', 'error'); return; }
    setCube(c => c - 1);
    const p = rollPotentials(equip.potentialGrade ? getPotentialGradeIndex(equip.potentialGrade) : 0);
    setEquip(e => ({ ...e, potentialGrade: p.grade, potentialOptions: p.options, potentialAtkBonus: p.atkBonus }));
    pushLog(`🔮 잠재 능력 재설정! [${p.grade}]`, 'success');
  };

  // 아이템 판매
  const sellItem = () => {
    if (!equip || equip.destroyed) return;
    const sv = getSellValue(equip, equip.level);
    setGold(g => g + sv);
    pushLog(`💰 ${equip.name} +${equip.level} 판매! +${sv.toLocaleString()} 골드`, 'buy');
    setEquip(null); setResult(null); setBlessingStack(0); setGuaranteeCount(0);
  };

  // 강화석 팝 구매
  const buyStones = (pack) => {
    if (gold < pack.price) { pushLog('골드가 부족합니다!', 'error'); return; }
    setGold(g => g - pack.price);
    setStone(s => s + pack.count);
    pushLog(`🔮 강화석 ${pack.count}개 구매! (-${pack.price.toLocaleString()}골드)`, 'buy');
  };

  return (
    <>
      <Helmet>
        <title>FORGE — 강화 게임 | TerminalNexus</title>
        <meta name="description" content="TerminalNexus 강화 게임 FORGE. 아이템을 강화하고 최고 등급에 도전하세요." />
      </Helmet>
      
      {/* 
        🎵 배경음악 (BGM) 
        현재는 인터넷(위키미디어 공용)에서 무료 판타지 오디오를 바로 불러옵니다.
        만약 본인이 원하는 mp3 파일을 넣고 싶다면:
        1. frontend/public/ 폴더에 'bgm.mp3' 파일을 넣습니다.
        2. 아래 코드의 src 속성을 src="/bgm.mp3" 로 수정하면 됩니다. 
      */}
      <audio ref={audioRef} src="nayuta.mp3" loop preload="auto" />

      <div className="forge-root">
        {/* 파티클 */}
        {particles.map(p => (
          <div key={p.id} className="forge-particle"
            style={{ left: `${p.x}%`, top: `${p.y}%`, background: p.color, width: p.size, height: p.size }} />
        ))}

        {/* 헤더 */}
        <div className="forge-header">
          <div className="forge-title-wrap">
            <span className="forge-logo">⚒️</span>
            <h1 className="forge-title">FORGE</h1>
            <span className="forge-subtitle">강화의 성소</span>
          </div>
        </div>

        <div className="forge-body">
          {/* ── 왼쪽: 아이템 카드 + 강화 버튼 ── */}
          <div className="forge-left">

            <div className={`forge-item-card ${result || ''} ${enhancing ? 'enhancing' : ''}`}>
              <WeaponDisplay equip={equip} enhancing={enhancing} result={result} />
            </div>

            {/* 강화 정보 */}
            {equip && !equip.destroyed && equip.level < 20 && (() => {
              let effectiveRate = guaranteeCount >= 29 ? 100 : calcBonusRate(getConfig(equip.level).rate, blessingStack);
              if (useBooster && booster > 0) effectiveRate = Math.min(100, effectiveRate + 5);
              const probs = getProbabilities(getConfig(equip.level), effectiveRate);
              return (
                <div className="forge-info-box">
                  <div className="forge-info-row">
                    <span>강화 확률 정보</span>
                  </div>
                  <div className="forge-prob-grid">
                    <div style={{color: '#4ade80'}}>성공: {probs.success}%</div>
                    {probs.maintain > 0 && <div style={{color: '#9ca3af'}}>유지: {probs.maintain}%</div>}
                    {probs.drop > 0 && <div style={{color: '#fbbf24'}}>하락: {probs.drop}%</div>}
                    {probs.destroy > 0 && <div style={{color: '#ef4444'}}>파괴: {probs.destroy}%</div>}
                  </div>
                  <div className="forge-info-row" style={{marginTop:'8px', borderTop:'1px solid #3f3f46', paddingTop:'8px'}}>
                    <span>비용</span>
                    <span>🪙 {cfg.gold.toLocaleString()} / 🔮 {cfg.stone}</span>
                  </div>
                  {blessingStack > 0 && (
                    <div className="forge-info-row">
                      <span>✨ 축복 스택 (추가 성공률)</span>
                      <span style={{ color: '#c084fc' }}>+{blessingStack * BLESSING_BONUS}%</span>
                    </div>
                  )}
                  {guaranteeCount > 0 && (
                    <div className="forge-info-row">
                      <span>⚡ 보장까지</span>
                      <span style={{ color: '#fb923c' }}>{Math.max(0, 30 - guaranteeCount)}회</span>
                    </div>
                  )}
                </div>
              );
            })()}
            {equip?.level === 20 && (
              <div className="forge-max-banner">🏆 최고 단계 달성!</div>
            )}

            {/* 보호권 토글 */}
            {equip && !equip.destroyed && shield > 0 && getConfig(equip.level).destroy > 0 && (
              <button
                className={`forge-shield-btn ${useShield ? 'active' : ''}`}
                onClick={() => setUseShield(v => !v)}
              >
                🛡️ 보호권 사용 {useShield ? '(ON)' : '(OFF)'}  — 남은 {shield}개 (파괴 방지)
              </button>
            )}

            {/* 강화 보조제 토글 */}
            {equip && !equip.destroyed && booster > 0 && (
              <button
                className={`forge-shield-btn ${useBooster ? 'active' : ''}`}
                style={useBooster ? {borderColor:'#4ade80', color:'#4ade80'} : {}}
                onClick={() => setUseBooster(v => !v)}
              >
                🧪 강화 보조제 사용 {useBooster ? '(ON)' : '(OFF)'} — 남은 {booster}개 (+5%)
              </button>
            )}

            {/* 잠재 능력 */}
            {equip && !equip.destroyed && (
              <div className="forge-potential-box">
                <div className="forge-potential-header">
                  <span style={{color: equip.potentialGrade ? POTENTIAL_GRADES[getPotentialGradeIndex(equip.potentialGrade)]?.color : '#a1a1aa'}}>
                    {equip.potentialGrade ? `[${equip.potentialGrade}] 잠재 능력` : '감정되지 않은 아이템'}
                  </span>
                  {cube > 0 && (
                    <button className="forge-attend-btn" style={{padding:'2px 8px', fontSize:'0.7rem'}} onClick={handleAppraise}>
                      감정/재설정
                    </button>
                  )}
                </div>
                {equip.potentialOptions && (
                  <div className="forge-potential-list">
                    {equip.potentialOptions.map((opt, i) => <div key={i} className="forge-potential-item">{opt}</div>)}
                  </div>
                )}
                {!equip.potentialOptions && cube === 0 && (
                  <div style={{fontSize:'0.7rem', color:'#71717a'}}>상점에서 신비한 큐브를 구매해 감정하세요.</div>
                )}
              </div>
            )}

            {/* 강화 버튼 */}
            <button
              id="forge-enhance-btn"
              className={`forge-enhance-btn ${enhancing ? 'loading' : ''} ${result || ''}`}
              onClick={enhance}
              disabled={!equip || equip.destroyed || enhancing || equip.level >= 20}
            >
              {enhancing ? (
                <span className="forge-btn-inner">
                  <span className="forge-spinner" />
                  강화 중...
                </span>
              ) : (
                <span className="forge-btn-inner">
                  ⚡ 강화 시작
                  {equip && !equip.destroyed && <span className="forge-next-level">+{equip?.level} → +{(equip?.level ?? 0) + 1}</span>}
                </span>
              )}
            </button>

            {/* 상점 버튼 */}
            <button className="forge-shop-btn" onClick={() => setShowShop(v => !v)}>
              🛒 상점 {showShop ? '닫기' : '열기'}
            </button>

            {/* 상점 패널 */}
            {showShop && (
              <div className="forge-shop">
                <div className="forge-shop-title">⚔️ 장비 상점</div>
                {ITEMS.map(item => (
                  <div key={item.id} className="forge-shop-item">
                    <span className="forge-shop-emoji">
                      <WeaponSVG level={0} itemId={item.id} />
                    </span>
                    <div className="forge-shop-info">
                      <span className="forge-shop-name">{item.name}</span>
                      <span className="forge-shop-atk">기본 공격력 {item.baseAtk} | 판매가 {item.sell.toLocaleString()}G</span>
                    </div>
                    <button className="forge-shop-buy" onClick={() => buyItem(item)} disabled={gold < item.price}>
                      🪙 {item.price.toLocaleString()}
                    </button>
                  </div>
                ))}
                <div className="forge-shop-divider" />
                <div className="forge-shop-title">🔮 강화석 대량구매</div>
                {STONE_PACKS.map(pack => (
                  <div key={pack.id} className="forge-shop-item">
                    <span className="forge-shop-emoji">🔮</span>
                    <div className="forge-shop-info">
                      <span className="forge-shop-name">{pack.name}</span>
                      <span className="forge-shop-atk">개당 {Math.round(pack.price/pack.count)}골드</span>
                    </div>
                    <button className="forge-shop-buy" onClick={() => buyStones(pack)} disabled={gold < pack.price}>
                      🪙 {pack.price.toLocaleString()}
                    </button>
                  </div>
                ))}
                <div className="forge-shop-divider" />
                <div className="forge-shop-divider" />
                <div className="forge-shop-title">🛡️ 특수 아이템</div>
                <div className="forge-shop-item">
                  <span className="forge-shop-emoji">🛡️</span>
                  <div className="forge-shop-info">
                    <span className="forge-shop-name">보호권 ({shield}개)</span>
                    <span className="forge-shop-atk">강화 실패 시 아이템 파괴 1회 방지</span>
                  </div>
                  <button className="forge-shop-buy" onClick={() => { if (gold >= 3000) { setGold(g => g-3000); setShield(s => s+1); pushLog('🛡️ 보호권 구매', 'buy'); }}} disabled={gold < 3000}>
                    🪙 3,000
                  </button>
                </div>
                <div className="forge-shop-item">
                  <span className="forge-shop-emoji">🧪</span>
                  <div className="forge-shop-info">
                    <span className="forge-shop-name">강화 보조제 ({booster}개)</span>
                    <span className="forge-shop-atk">1회 확률 5% 증가</span>
                  </div>
                  <button className="forge-shop-buy" onClick={() => { if (gold >= 1500) { setGold(g => g-1500); setBooster(b => b+1); pushLog('🧪 강화 보조제 구매', 'buy'); }}} disabled={gold < 1500}>
                    🪙 1,500
                  </button>
                </div>
                <div className="forge-shop-item">
                  <span className="forge-shop-emoji">✨</span>
                  <div className="forge-shop-info">
                    <span className="forge-shop-name">신비한 큐브 ({cube}개)</span>
                    <span className="forge-shop-atk">잠재 능력 부여 및 재설정</span>
                  </div>
                  <button className="forge-shop-buy" onClick={() => { if (gold >= 2500) { setGold(g => g-2500); setCube(c => c+1); pushLog('✨ 신비한 큐브 구매', 'buy'); }}} disabled={gold < 2500}>
                    🪙 2,500
                  </button>
                </div>
                {equip && !equip.destroyed && (
                  <>
                    <div className="forge-shop-divider" />
                    <div className="forge-shop-title">💰 판매</div>
                    <div className="forge-shop-item forge-sell-item">
                      <span className="forge-shop-emoji">
                        <WeaponSVG level={equip.level} itemId={equip.id} />
                      </span>
                      <div className="forge-shop-info">
                        <span className="forge-shop-name">{equip.name} +{equip.level}</span>
                        <span className="forge-shop-atk" style={{color:'#4ade80'}}>판매가: {getSellValue(equip, equip.level).toLocaleString()} 골드</span>
                      </div>
                      <button className="forge-shop-buy forge-sell-btn" onClick={sellItem}>
                        판매
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── 중앙: 통계 + 로그 ── */}
          <div className="forge-right">
            {/* 통계 */}
            <div className="forge-stats">
              <div className="forge-stats-title">📊 통계</div>
              <div className="forge-stat-row">
                <span>총 시도</span><span>{totalTries}회</span>
              </div>
              <div className="forge-stat-row">
                <span>성공</span>
                <span style={{ color: '#4ade80' }}>{totalSuccess}회</span>
              </div>
              <div className="forge-stat-row">
                <span>성공률</span>
                <span>{totalTries > 0 ? ((totalSuccess / totalTries) * 100).toFixed(1) : 0}%</span>
              </div>
              <div className="forge-stat-row">
                <span>최고 달성</span>
                <span style={{ color: getGrade(maxLevel).color }}>+{maxLevel}</span>
              </div>
            </div>

            {/* 로그 */}
            <div className="forge-log-wrap">
              <div className="forge-log-title">📜 강화 기록</div>
              <div className="forge-log" ref={logRef}>
                {log.length === 0 && (
                  <div className="forge-log-empty">강화를 시작하세요!</div>
                )}
                {log.map(entry => (
                  <div key={entry.id} className={`forge-log-row forge-log-${entry.type}`}>
                    {entry.text}
                  </div>
                ))}
              </div>
            </div>

            {/* 등급 안내 */}
            <div className="forge-grade-guide">
              <div className="forge-log-title">🏅 등급 안내</div>
              {GRADES.map(g => (
                <div key={g.name} className="forge-grade-row">
                  <span style={{ color: g.color }}>● {g.name}</span>
                  <span style={{ color: '#6b7280' }}>+{g.min}{g.max > g.min ? `~+${g.max}` : ''}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── 오른쪽: 사이드바 (재화 및 메뉴) ── */}
          <div className="forge-sidebar">
            <div className="forge-currency"><span className="forge-currency-icon">🪙</span><span className="forge-currency-val">{gold.toLocaleString()}</span></div>
            <div className="forge-currency"><span className="forge-currency-icon">🔮</span><span className="forge-currency-val">{stone}</span></div>
            <div className="forge-currency"><span className="forge-currency-icon">🛡️</span><span className="forge-currency-val">{shield}</span></div>
            <button className={`forge-attend-btn ${attendDone ? 'done' : 'pulse'}`} onClick={handleAttendance} disabled={attendDone}>
              {attendDone ? '✅ 출석완료' : '📅 출석체크'}
            </button>
            <button className="forge-hof-btn" onClick={() => setBgmOn(v => !v)}>
              {bgmOn ? '🔊 BGM 끄기' : '🔇 BGM 켜기'}
            </button>
            <button className="forge-hof-btn" style={{borderColor:'rgba(74,222,128,0.3)',color:'#4ade80'}} onClick={() => setShowHunting(true)}>⚔️ 몬스터 사냥</button>
            <button className="forge-hof-btn" onClick={openHOF}>🏆 명예의 전당</button>
            <button className="forge-hof-btn" style={{borderColor:'rgba(192,132,252,0.3)',color:'#c084fc'}} onClick={() => setShowCodex(true)}>📖 도감</button>
            <button className="forge-hof-btn" style={{borderColor:'rgba(239,68,68,0.3)',color:'#f87171'}} onClick={() => setShowReset(true)}>🔄 초기화</button>
          </div>
        </div>
      </div>

      {attendMsg && <div className="forge-attend-toast">{attendMsg}</div>}

      {newAchiev && (
        <div className="forge-achiev-popup">
          <div className="forge-achiev-icon">{newAchiev.label.split(' ')[0]}</div>
          <div>
            <div className="forge-achiev-title">업적 달성!</div>
            <div className="forge-achiev-name">{newAchiev.label}</div>
            <div className="forge-achiev-desc">{newAchiev.desc}</div>
          </div>
        </div>
      )}

      {showHOF && (
        <div className="forge-modal-overlay" onClick={() => setShowHOF(false)}>
          <div className="forge-modal" onClick={e => e.stopPropagation()}>
            <div className="forge-modal-header">
              <span>🏆 명예의 전당</span>
              <button className="forge-modal-close" onClick={() => setShowHOF(false)}>✕</button>
            </div>

            {/* 명예의 전당 무기 상세 보기 */}
            {hofDetail !== null && (() => {
              const r = hofData[hofDetail];
              // db에 이미 접두사가 붙은 이름이 저장되어 있으므로 그대로 사용
              const wName = r.weaponName;
              const wGrade = getGrade(r.maxLevel);
              // 임시 가짜 equip 객체를 만들어 WeaponDisplay에 넘김
              let detectedId = 2;
              if (r.weaponName.includes('단검')) detectedId = 1;
              else if (r.weaponName.includes('대검')) detectedId = 3;
              else if (r.weaponName.includes('도끼')) detectedId = 4;
              else if (r.weaponName.includes('창')) detectedId = 5;

              const fakeEquip = { 
                id: detectedId, 
                name: r.weaponName, 
                emoji: '⚔️', 
                baseAtk: 10, 
                level: r.maxLevel, 
                destroyed: false,
                potentialGrade: r.potentialGrade,
                potentialOptions: r.potentialOptions,
                potentialAtkBonus: r.potentialAtkBonus
              };
              return (
                <div className="forge-codex-detail" style={{borderColor: wGrade.color + '44', marginBottom:'16px'}}>
                  <div className="forge-codex-detail-close" onClick={() => setHofDetail(null)}>← 목록으로</div>
                  <WeaponDisplay equip={fakeEquip} enhancing={false} result={null} />
                  <div className="forge-codex-detail-info">
                    <div style={{color: wGrade.color, fontWeight:700, fontSize:'1.1rem'}}>{hofDetail === 0 ? '🥇 1위' : hofDetail === 1 ? '🥈 2위' : hofDetail === 2 ? '🥉 3위' : `#${hofDetail+1}위`} - {r.nickname}</div>
                    <div style={{color:'#f4f4f5', fontSize:'0.9rem'}}>{wName} (+{r.maxLevel})</div>
                  </div>
                  {fakeEquip.potentialGrade && fakeEquip.potentialOptions && (
                    <div className="forge-potential-box" style={{margin:'12px 16px', background:'rgba(0,0,0,0.4)', borderRadius:'6px', padding:'8px'}}>
                      <div className="forge-potential-header" style={{borderBottom:'1px solid #3f3f46', paddingBottom:'4px', marginBottom:'6px'}}>
                        <span style={{color: POTENTIAL_GRADES[getPotentialGradeIndex(fakeEquip.potentialGrade)]?.color || '#a1a1aa'}}>
                          [{fakeEquip.potentialGrade}] 잠재 능력
                        </span>
                      </div>
                      <div className="forge-potential-list" style={{fontSize:'0.8rem', color:'#e4e4e7'}}>
                        {fakeEquip.potentialOptions.map((opt, i) => <div key={i}>{opt}</div>)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {!hofDetail && (
              <>
                <div className="forge-hof-my">
                  <span>내 최고기록</span>
                  <strong style={{ color: '#f59e0b' }}>+{maxLevel}</strong>
                  <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                    ({totalTries}회 시도 / 성공률 {totalTries > 0 ? Math.round(totalSuccess / totalTries * 100) : 0}%)
                  </span>
                </div>
                <div className="forge-hof-list">
                  {hofData.length === 0 && <div className="forge-hof-empty">아직 기록이 없습니다.</div>}
                  {hofData.map((r, i) => (
                    <div key={r.id} className={`forge-hof-row ${i < 3 ? 'rank-top' : ''}`} onClick={() => setHofDetail(i)} style={{cursor:'pointer'}}>
                      <span className="forge-hof-rank">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}</span>
                      <span className="forge-hof-nick">{r.nickname}</span>
                      <span className="forge-hof-weapon" style={{ color: getGradeColor(r.grade) }}>{r.weaponName}</span>
                      <span className="forge-hof-level" style={{ color: getGradeColor(r.grade) }}>+{r.maxLevel}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── 도감 모달 ── */}
      {showCodex && (
        <div className="forge-modal-overlay" onClick={() => { setShowCodex(false); setCodexDetail(null); }}>
          <div className="forge-modal forge-codex-modal" onClick={e => e.stopPropagation()}>
            <div className="forge-modal-header">
              <span>📖 무기 도감 <span style={{color:'#6b7280',fontSize:'0.75rem'}}>{Object.keys(unlockedLevels).length} / 21</span></span>
              <button className="forge-modal-close" onClick={() => { setShowCodex(false); setCodexDetail(null); }}>✕</button>
            </div>

            {/* 상세보기 패널 */}
            {codexDetail !== null && (() => {
              const lv = codexDetail;
              const gradeName = utilGetGrade(lv);
              const gradeColor = getGradeColor(gradeName);
              const unlockedInfo = unlockedLevels[lv];
              const baseName = unlockedInfo?.name || '미확인 무기';
              const wName = getWeaponDisplayName(baseName, lv);
              const fakeEquip = { 
                id: unlockedInfo?.id || 1, 
                name: baseName, 
                emoji: '🗡️', 
                baseAtk: 5, 
                level: lv, 
                destroyed: false 
              };
              return (
                <div className="forge-codex-detail" style={{borderColor: gradeColor + '44'}}>
                  <div className="forge-codex-detail-close" onClick={() => setCodexDetail(null)}>← 돌아가기</div>
                  <WeaponDisplay equip={fakeEquip} enhancing={false} result={null} />
                  <div className="forge-codex-detail-info">
                    <div style={{color: gradeColor, fontWeight:700, fontSize:'1rem'}}>{gradeName} 등급</div>
                    <div style={{color:'#f4f4f5', fontSize:'0.9rem'}}>{wName}</div>
                    <div style={{color:'#71717a', fontSize:'0.78rem'}}>+{lv} 단계 강화 완료</div>
                  </div>
                </div>
              );
            })()}

            <div className="forge-codex-grid">
              {Array.from({length: 21}, (_, lv) => {
                const unlockedInfo = unlockedLevels[lv];
                const unlocked = !!unlockedInfo;
                const gradeName = utilGetGrade(lv);
                const gradeColor = getGradeColor(gradeName);
                const wName = unlocked
                  ? getWeaponDisplayName(unlockedInfo.name, lv)
                  : '???';
                return (
                  <div key={lv}
                    className={`forge-codex-card ${unlocked ? 'unlocked' : 'locked'}`}
                    style={unlocked ? { borderColor: gradeColor + '55' } : {}}
                    onClick={() => unlocked && setCodexDetail(lv)}
                  >
                    {/* 실제 SVG 검 모양 표시 */}
                    <div className="forge-codex-emoji"
                      style={unlocked ? { filter: `drop-shadow(0 0 6px ${gradeColor})` } : {}}>
                      <WeaponSVG level={lv} itemId={unlockedInfo?.id || 1} />
                    </div>
                    <div className="forge-codex-level" style={unlocked ? { color: gradeColor } : {}}>+{lv}</div>
                    <div className="forge-codex-name">{wName}</div>
                    {unlocked && <div className="forge-codex-grade" style={{ color: gradeColor }}>{gradeName}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── 초기화 확인 모달 ── */}
      {showReset && (
        <div className="forge-modal-overlay" onClick={() => setShowReset(false)}>
          <div className="forge-modal forge-reset-modal" onClick={e => e.stopPropagation()}>
            <div className="forge-modal-header" style={{color:'#ef4444'}}>
              <span>⚠️ 게임 초기화</span>
              <button className="forge-modal-close" onClick={() => setShowReset(false)}>✕</button>
            </div>
            <div style={{color:'#a1a1aa', fontSize:'0.9rem', lineHeight:1.6}}>
              모든 골드, 아이템, 강화석, 출석 기록, 도감 등<br/>
              <strong style={{color:'#ef4444'}}>모든 데이터가 영원히 삭제</strong>됩니다.
            </div>
            <button className="forge-reset-confirm-btn" onClick={() => {
              if (username) {
                localStorage.removeItem(`forge_save_${username}`);
                localStorage.removeItem(`forge_attend_${username}`);
                localStorage.removeItem(`forge_streak_${username}`);
              }
              setGold(INITIAL_GOLD); setStone(INITIAL_STONE); setShield(INITIAL_SHIELD);
              setEquip(null); setMaxLevel(0); setTotalTries(0); setTotalSuccess(0);
              setTotalDestroy(0); setMaxStreak(0); setAchievements([]); setUnlockedLevels([0]);
              setBlessingStack(0); setGuaranteeCount(0); setLog([]); setResult(null);
              setShowReset(false);
              pushLog('🔄 게임이 초기화되었습니다. 새로운 시작!', 'buy');
            }}>
              🔄 예, 모든 기록을 삭제하고 다시 시작합니다
            </button>
            <button className="forge-reset-cancel-btn" onClick={() => setShowReset(false)}>
              취소
            </button>
          </div>
        </div>
      )}
      {/* ── 사냥터 모달 ── */}
      {showHunting && (() => {
        // 잠재 옵션에서 치명타 확률 / 치명타 피해 / 방어율 무시 수치 파싱
        let critChance = 0, critDmg = 0, armorPen = 0;
        (equip?.potentialOptions || []).forEach(opt => {
          const match = opt.match(/(\d+)%/);
          const val = match ? parseInt(match[1]) : 0;
          if (opt.startsWith('치명타 확률'))    critChance += val;
          else if (opt.startsWith('치명타 피해')) critDmg    += val;
          else if (opt.startsWith('방어율 무시')) armorPen   += val;
        });
        return (
          <HuntingGround
            totalAtk={Math.floor(calcAtk(equip?.baseAtk || 5, equip?.level || 0)) + (equip?.potentialAtkBonus || 0)}
            critChance={critChance}
            critDmg={critDmg}
            armorPen={armorPen}
            onReward={(amount) => setGold(g => g + amount)}
            pushLog={pushLog}
            onClose={() => setShowHunting(false)}
          />
        );
      })()}
    </>
  );
};

export default ForgePage;
