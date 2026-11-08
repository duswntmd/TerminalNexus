// Riot 공식 정적 데이터(Data Dragon). 챔피언·아이템·소환사 주문·룬 이름과 그림.
// 브라우저가 ddragon.leagueoflegends.com 에서 직접 받는다 (CORS 허용, 키 불필요).
const CDN = 'https://ddragon.leagueoflegends.com';
const LANG = 'ko_KR';

let verPromise;
export const getVersion = () => {
  if (!verPromise) {
    verPromise = fetch(`${CDN}/api/versions.json`).then((r) => r.json()).then((v) => v[0])
      .catch(() => { verPromise = null; return '16.22.1'; });
  }
  return verPromise;
};

const jsonCache = new Map();
const data = (file) => {
  if (!jsonCache.has(file)) {
    jsonCache.set(file, getVersion().then((v) => fetch(`${CDN}/cdn/${v}/data/${LANG}/${file}`)).then((r) => {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    }).catch((e) => { jsonCache.delete(file); throw e; }));
  }
  return jsonCache.get(file);
};

/** 챔피언 목록, 아이템, 주문, 룬을 한 번에 받아 찾기 쉬운 형태로 */
let staticPromise;
export const loadStatic = () => {
  if (!staticPromise) {
    staticPromise = Promise.all([getVersion(), data('champion.json'), data('item.json'), data('summoner.json'), data('runesReforged.json')])
      .then(([ver, champ, item, spell, runes]) => {
        const champions = Object.values(champ.data).map((c) => ({
          id: c.id, key: Number(c.key), name: c.name, title: c.title, tags: c.tags, info: c.info, blurb: c.blurb,
          cho: choseong(c.name),
        })).sort((a, b) => a.name.localeCompare(b.name, 'ko'));
        const byKey = Object.fromEntries(champions.map((c) => [c.key, c]));
        const spells = Object.fromEntries(Object.values(spell.data).map((s) => [Number(s.key), { id: s.id, name: s.name, desc: s.description }]));
        const perks = {};
        for (const style of runes) {
          perks[style.id] = { name: style.name, icon: style.icon };
          for (const slot of style.slots) for (const r of slot.runes) perks[r.id] = { name: r.name, icon: r.icon };
        }
        return { ver, champions, byKey, items: item.data, spells, perks };
      })
      .catch((e) => { staticPromise = null; throw e; });
  }
  return staticPromise;
};

export const loadChampion = (id) => data(`champion/${id}.json`).then((d) => d.data[id]);
export const loadRunes = () => data('runesReforged.json');
export const loadSpells = () => data('summoner.json').then((d) => Object.values(d.data));

export const img = {
  champ: (ver, id) => `${CDN}/cdn/${ver}/img/champion/${id}.png`,
  champSplash: (id, num = 0) => `${CDN}/cdn/img/champion/splash/${id}_${num}.jpg`,
  champTile: (id, num = 0) => `${CDN}/cdn/img/champion/loading/${id}_${num}.jpg`,
  item: (ver, id) => `${CDN}/cdn/${ver}/img/item/${id}.png`,
  spell: (ver, file) => `${CDN}/cdn/${ver}/img/spell/${file}`,
  passive: (ver, file) => `${CDN}/cdn/${ver}/img/passive/${file}`,
  profile: (ver, id) => `${CDN}/cdn/${ver}/img/profileicon/${id}.png`,
  perk: (icon) => `${CDN}/cdn/img/${icon}`,
};

// 경기 데이터의 championName 과 Data Dragon id 가 다른 경우
const NAME_FIX = { FiddleSticks: 'Fiddlesticks' };
export const champId = (name) => NAME_FIX[name] || name;

// ---------- 한글 초성 검색 ----------
const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
export function choseong(s) {
  let out = '';
  for (const ch of s) {
    const c = ch.charCodeAt(0) - 0xac00;
    out += c >= 0 && c < 11172 ? CHO[Math.floor(c / 588)] : ch;
  }
  return out;
}
const norm = (s) => s.toLowerCase().replace(/[\s'.&]/g, '');
const isCho = (s) => [...s].every((ch) => CHO.includes(ch));

/** 이름, 초성(ㅇㅅ → 애쉬), 영문 id 로 챔피언 찾기. 0 이면 안 맞음, 클수록 앞에 */
export function champScore(c, q) {
  const n = norm(q);
  if (!n) return 1;
  const name = norm(c.name), cho = norm(c.cho), en = norm(c.id);
  if (name === n || cho === n || en === n) return 5;
  if (name.startsWith(n) || cho.startsWith(n) || en.startsWith(n)) return 4;
  if (isCho(n)) return cho.includes(n) ? 2 : 0;
  return name.includes(n) || en.includes(n) ? 3 : 0;
}

// ---------- 표시용 ----------
export const QUEUES = {
  420: '솔로랭크', 440: '자유랭크', 400: '일반', 430: '일반', 490: '빠른 대전', 480: '신속 대전',
  450: '칼바람 나락', 2400: '칼바람 대혼란', 1700: '아레나', 1710: '아레나', 900: 'URF', 1900: 'URF', 1020: '단일 챔피언',
  830: 'AI 대전', 840: 'AI 대전', 850: 'AI 대전', 870: 'AI 대전', 880: 'AI 대전', 890: 'AI 대전', 0: '사용자 설정',
};
export const queueName = (id, mode) => QUEUES[id] || mode || '기타';

export const TIERS = {
  IRON: '아이언', BRONZE: '브론즈', SILVER: '실버', GOLD: '골드', PLATINUM: '플래티넘', EMERALD: '에메랄드',
  DIAMOND: '다이아몬드', MASTER: '마스터', GRANDMASTER: '그랜드마스터', CHALLENGER: '챌린저',
};
export const POS = { TOP: '탑', JUNGLE: '정글', MIDDLE: '미드', BOTTOM: '원딜', UTILITY: '서폿' };
export const TAGS = { Fighter: '전사', Tank: '탱커', Mage: '마법사', Assassin: '암살자', Marksman: '원거리', Support: '서포터' };

export const PLATFORMS = [
  ['kr', 'KR', 'KR1'], ['jp1', 'JP', 'JP1'], ['na1', 'NA', 'NA1'], ['euw1', 'EUW', 'EUW'], ['eun1', 'EUNE', 'EUNE'],
  ['oc1', 'OCE', 'OCE'], ['br1', 'BR', 'BR1'], ['la1', 'LAN', 'LAN'], ['la2', 'LAS', 'LAS'], ['tr1', 'TR', 'TR1'],
];

/** HTML 이 섞인 Data Dragon 설명을 글자만 남김 */
export const plain = (html = '') => html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
