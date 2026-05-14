// ─── 무기 등급별 표시 데이터 ───────────────────────────────
export const GRADE_WEAPON = {
  '일반':  { prefix: '',        emoji: '🗡️', glow: '#9ca3af', aura: 'none' },
  '희귀':  { prefix: '빛나는 ', emoji: '⚔️', glow: '#60a5fa', aura: 'rare' },
  '영웅':  { prefix: '신성한 ', emoji: '🔱', glow: '#c084fc', aura: 'epic' },
  '전설':  { prefix: '전설의 ', emoji: '🌟', glow: '#fb923c', aura: 'legend' },
  '신화':  { prefix: '신화의 ', emoji: '👑', glow: '#f59e0b', aura: 'myth' },
};

export const getGrade = (level) => {
  if (level <= 5)  return '일반';
  if (level <= 10) return '희귀';
  if (level <= 15) return '영웅';
  if (level <= 19) return '전설';
  return '신화';
};

export const getGradeColor = (grade) => {
  const map = { '일반':'#9ca3af','희귀':'#60a5fa','영웅':'#c084fc','전설':'#fb923c','신화':'#f59e0b' };
  return map[grade] || '#9ca3af';
};

const LEVEL_PREFIXES = [
  '낡은 ', '무딘 ', '단단한 ', '쓸만한 ', '정교한 ',     // 0~4
  '빛나는 ', '예리한 ', '견고한 ', '날카로운 ', '치명적인 ', // 5~9
  '마력이 깃든 ', '영롱한 ', '심연의 ', '핏빛 ', '파괴적인 ', // 10~14
  '타오르는 ', '혹한의 ', '폭풍의 ', '초월적인 ', '전설의 ', // 15~19
  '신화의 ' // 20
];

export const getWeaponDisplayName = (itemName, level) => {
  const prefix = LEVEL_PREFIXES[Math.min(level, 20)];
  // 기존 이름이 '낡은 단검' 같은 형태라면 앞의 형용사를 자르는 것도 좋으나, 현재는 기본 이름이 명사 위주라고 가정.
  // 사용자의 요청대로 레벨마다 이름이 확연히 달라지도록 설정
  return `${prefix}${itemName}`;
};

export const getWeaponEmoji = (level) => {
  const grade = getGrade(level);
  return GRADE_WEAPON[grade].emoji;
};

// ─── localStorage 저장 키 ──────────────────────────────────
export const getSaveKey = (username) => `forge_save_${username || 'guest'}`;

export const loadSave = (username) => {
  try {
    const raw = localStorage.getItem(getSaveKey(username));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

export const writeSave = (username, data) => {
  localStorage.setItem(getSaveKey(username), JSON.stringify(data));
};

// ─── 출석 체크 ─────────────────────────────────────────────
const ATTENDANCE_KEY = (u) => `forge_attend_${u || 'guest'}`;

export const canAttendToday = (username) => {
  const last = localStorage.getItem(ATTENDANCE_KEY(username));
  if (!last) return true;
  const today = new Date().toDateString();
  return last !== today;
};

export const markAttendance = (username) => {
  const today = new Date().toDateString();
  const streakKey = `forge_streak_${username || 'guest'}`;
  const lastKey = ATTENDANCE_KEY(username);
  const last = localStorage.getItem(lastKey);

  let streak = parseInt(localStorage.getItem(streakKey) || '0');
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (last === yesterday.toDateString()) {
    streak += 1;
  } else {
    streak = 1;
  }
  localStorage.setItem(lastKey, today);
  localStorage.setItem(streakKey, String(streak));

  // 연속 출석 보너스
  const goldBase = 2000;
  const stoneBase = 2;
  const streakBonus = Math.min(streak - 1, 6); // 최대 7일 연속
  return {
    gold: goldBase + streakBonus * 500,
    stone: stoneBase + Math.floor(streakBonus / 2),
    streak,
  };
};

export const getStreak = (username) => {
  return parseInt(localStorage.getItem(`forge_streak_${username || 'guest'}`) || '0');
};

// ─── 업적 목록 ─────────────────────────────────────────────
export const ACHIEVEMENTS = [
  { id: 'first_enhance',  label: '🔰 첫 강화',    desc: '+1 달성',           check: (s) => s.maxLevel >= 1 },
  { id: 'rare_reach',     label: '💙 희귀 등급',   desc: '+6 달성',           check: (s) => s.maxLevel >= 6 },
  { id: 'epic_reach',     label: '💜 영웅 등급',   desc: '+11 달성',          check: (s) => s.maxLevel >= 11 },
  { id: 'legend_reach',   label: '🔥 전설 등급',   desc: '+16 달성',          check: (s) => s.maxLevel >= 16 },
  { id: 'myth_reach',     label: '👑 신화 달성',   desc: '+20 달성',          check: (s) => s.maxLevel >= 20 },
  { id: 'first_destroy',  label: '💀 첫 파괴',     desc: '아이템 파괴 경험',  check: (s) => s.totalDestroy >= 1 },
  { id: 'veteran',        label: '⚔️ 베테란',      desc: '100회 시도',        check: (s) => s.totalTries >= 100 },
  { id: 'attend_7',       label: '📅 7일 연속',    desc: '7일 연속 출석',     check: (s) => s.maxStreak >= 7 },
];

export const checkNewAchievements = (prevAchievements, stats) => {
  const newUnlocked = [];
  ACHIEVEMENTS.forEach(a => {
    if (!prevAchievements.includes(a.id) && a.check(stats)) {
      newUnlocked.push(a);
    }
  });
  return newUnlocked;
};
