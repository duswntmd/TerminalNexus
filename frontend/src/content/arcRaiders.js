// ARC Raiders 비공식 정보. 화면(pages/games/ArcRaidersPage)과 검색엔진용 정적 페이지(scripts/prerender.mjs)가 함께 쓴다.
// 갱신 방법: 공식 패치노트를 확인한 뒤 해당 배열에 항목을 추가하고 CHECKED 날짜를 바꾼다.
// 확인하지 못한 수치·목록은 넣지 않는다. 출처끼리 다르면 공식을 따르고 note에 차이를 적는다.

export const CHECKED = '2026-11-03';

// 출처. 각 섹션은 id로 참조한다.
export const SOURCES = {
  official: { name: 'ARC Raiders 공식 뉴스', url: 'https://arcraiders.com/news' },
  guide: { name: '공식: Everything you need to know (2025-10-13)', url: 'https://arcraiders.com/news/everything-you-need-to-know' },
  expedition: { name: '공식: Expedition Project (2025-10-09)', url: 'https://arcraiders.com/news/expedition-project' },
  northline: { name: '공식: North Line 업데이트 (2025-11-12)', url: 'https://arcraiders.com/news/north-line-update' },
  riven: { name: '공식: Riven Tides (2026-04-27)', url: 'https://arcraiders.com/news/riven-tides' },
  frozen: { name: '공식: Frozen Trail 2.0 패치노트 (2026-10-08)', url: 'https://arcraiders.com/news/frozen-trail-2-0-update' },
  pve: { name: '공식: PvE Toggle Beta Test (2026-10-12)', url: 'https://arcraiders.com/news/pve-toggle-what-to-know' },
  u210: { name: '공식: Store Update 2.1.0', url: 'https://arcraiders.com/news/store-update-2-1-0' },
  u220: { name: '공식: Store Update 2.2.0', url: 'https://arcraiders.com/news/store-update-2-2-0' },
  u230: { name: '공식: Live Update 2.3.0', url: 'https://arcraiders.com/news/live-update-2-3-0' },
  wiki: { name: '위키백과: ARC Raiders (영문)', url: 'https://en.wikipedia.org/wiki/ARC_Raiders' },
  steam: { name: 'Steam 상점 페이지', url: 'https://store.steampowered.com/app/1808500/' },
  dxMaps: { name: 'Dexerto 위키: 맵', url: 'https://www.dexerto.com/wikis/arc-raiders/maps-2' },
  dxArc: { name: 'Dexerto 위키: ARC 적 목록 (2026-04-28)', url: 'https://www.dexerto.com/wikis/arc-raiders/all-arc-enemies' },
  dxTraders: { name: 'Dexerto 위키: 상인', url: 'https://www.dexerto.com/wikis/arc-raiders/traders' },
};

// 게임 개요 표
export const FACTS = [
  { k: '장르', v: '3인칭 PvPvE 탈출형(익스트랙션) 슈터', src: ['wiki'] },
  { k: '개발·배급', v: 'Embark Studios (THE FINALS 개발사, 넥슨 자회사)', src: ['wiki'] },
  { k: '엔진', v: '언리얼 엔진 5', src: ['wiki'] },
  { k: '출시일', v: '2025년 10월 30일', src: ['wiki'] },
  { k: '플랫폼', v: 'PC(Steam, Epic Games Store), PlayStation 5, Xbox Series X|S', src: ['wiki', 'official'] },
  { k: '가격 정책', v: '유료 구매(바이 투 플레이). 출시 기준 미국 가격 39.99달러. 처음 발표 때는 무료 게임이었으나 개발 중 유료로 바뀌었다', src: ['wiki', 'steam'], note: '한국 원화 가격과 에디션 구성은 상점마다 달라 확인 필요' },
  { k: '추가 결제', v: '외형 아이템 상점, 시즌 보상 패스(Reward Pass), 외형 DLC', src: ['frozen', 'u210'] },
  { k: '분대', v: '혼자 또는 2~3인 분대. 솔로는 솔로끼리 우선 매칭', src: ['guide', 'wiki'] },
  { k: '평가', v: '메타크리틱 PC 86, PS5 85, Xbox 88. The Game Awards 2025 최고의 멀티플레이 게임 수상', src: ['wiki'] },
];

// 탈출형 루프 단계
export const LOOP = [
  { step: '준비', text: '지하 도시 스페란차(Speranza)에서 장비를 고르고 들어갈 맵과 맵 조건을 고른다. 장비가 부족하면 무료 기본 장비(Free Loadout)로도 출발할 수 있다.' },
  { step: '지상 진입', text: '지상(Topside)에 내려 ARC 기계와 다른 플레이어를 피하거나 상대하면서 재료, 부품, 열쇠를 모은다. 판당 제한 시간은 보통 최대 30분이고 일부 조건은 40분이다.' },
  { step: '탈출', text: '탈출 엘리베이터, 지하철역, 환기구 같은 탈출 지점으로 나간다. 열쇠가 필요한 레이더 해치는 상대적으로 안전한 탈출구다.' },
  { step: '귀환과 성장', text: '가져온 물건을 팔거나 상인 퀘스트에 쓰고, 워크숍에서 장비를 제작·수리·강화한다. 쓰러지면 가지고 있던 장비를 잃고 안전 주머니(Safe Pocket)에 넣은 것만 남는다.' },
];

// 핵심 시스템
export const SYSTEMS = [
  { name: '스페란차와 상인', text: '스페란차는 지하 도시 톨레도의 구역 중 하나로, 플레이어의 거점이다. 상인은 퀘스트를 주고 물건을 사고팔며, 다른 곳에서 구하기 어려운 물건도 판다. 상인 이름은 Apollo, Celeste, Lance, Shani, Tian Wen 다섯 명으로 알려져 있다.', src: ['guide', 'dxTraders'], note: '상인별 판매 품목은 업데이트로 자주 바뀌어 싣지 않음' },
  { name: '워크숍과 제작', text: '워크숍에서 무기와 장비를 제작하고 수리하고 강화한다. 워크숍 자체를 업그레이드하면 더 좋은 물건을 만들 수 있다. 설계도(Blueprint)를 얻어야 만들 수 있는 물건도 있다.', src: ['guide', 'u230'] },
  { name: '스킬 트리', text: '레벨을 올려 얻은 포인트로 능력을 찍는다. Frozen Trail(2.0)에서 스킬 트리가 개편되었다.', src: ['frozen'] },
  { name: '무기 증폭(Amplified Weapons)', text: 'Frozen Trail에서 추가된 무기 강화 단계다. 2.2.0에서 버튼 이름이 Ascend에서 Amplify로 바뀌었다.', src: ['frozen', 'u220'] },
  { name: '아웃포스트(Outpost)', text: 'Frozen Trail에서 추가된 개인 거점 공간이다. 프로젝트를 완료하면 열리고 연구대(Research Bench)가 들어 있다. 가구로 꾸밀 수 있다.', src: ['frozen', 'u220'] },
  { name: '익스페디션(Expedition)', text: '레벨 20부터 참여할 수 있는 자발적 초기화 프로젝트다. 약 8주 주기로 돌아가며, 완료하면 레벨, 스킬, 아이템, 워크숍이 초기화되는 대신 계정 영구 보상과 외형 보상을 받는다. 외형, 업적, 순위는 남는다. 공식 설명은 초기화로 전투 이점을 주지 않는다고 밝혔다.', src: ['expedition'], note: '출시 전 설계 글 기준. 세부 보상은 이후 바뀌었을 수 있음' },
  { name: '보상 패스와 트라이얼', text: 'Frozen Trail에서 기존 Raider Deck과 Cred가 보상 패스(Reward Pass)와 Reward Points로 바뀌었다. 첫 패스는 60단계다. 주간 과제인 트라이얼(Trials)도 시즌제로 운영된다.', src: ['frozen', 'official'] },
  { name: 'PvE 매칭 시험', text: '2026년 10월 13~20일에 플레이어끼리 피해를 주지 않는 PvE 서버를 고를 수 있는 시험이 열렸다. 보상 가치는 낮췄고 일부 맵 조건은 제외됐다. 정식 도입은 설문과 데이터를 보고 정한다고 했다.', src: ['pve', 'u220'], note: '2026-11-03 현재 정식 도입 여부 미발표' },
];

// 맵. order: 추가 순서
export const MAPS = [
  { name: 'Dam Battlegrounds', ko: '댐 배틀그라운드', added: '2025-10-30', update: '출시', text: '출시 때부터 있던 네 맵 중 하나. 2.2.0에서 일반 세션의 ARC 터빈 출현이 빠졌다.', keys: ['Control Tower', 'Staff Room', 'Surveillance', 'Testing Annex'], src: ['guide', 'u220', 'dxMaps'] },
  { name: 'Buried City', ko: '버리드 시티', added: '2025-10-30', update: '출시', text: '출시 때부터 있던 맵.', keys: ['Town Hall', 'Residential Master', 'Hospital', 'JKV Employee Access Card'], src: ['guide', 'dxMaps'] },
  { name: 'The Spaceport', ko: '스페이스포트', added: '2025-10-30', update: '출시', text: '출시 때부터 있던 맵.', keys: ['Control Tower', 'Container Storage', 'Trench Tower', 'Warehouse'], src: ['guide', 'dxMaps'] },
  { name: 'The Blue Gate', ko: '블루 게이트', added: '2025-10-30', update: '출시', text: '출시 때부터 있던 맵.', keys: ['Cellar', 'Communication Tower', 'Confiscation Room', 'Village'], src: ['guide', 'dxMaps'] },
  { name: 'Stella Montis', ko: '스텔라 몬티스', added: '2025-11-13', update: 'North Line', text: '다섯 번째 맵. 플레이어들이 기본 재료를 기부해 터널을 복구하는 공동 해금 이벤트(Breaking New Ground)로 열렸다. 근접전에 강한 ARC Shredder가 처음 등장한 맵이다.', keys: ['Archives', 'Assembly Admin', 'Medical Storage'], src: ['northline', 'dxMaps'] },
  { name: 'Riven Tides', ko: '리븐 타이즈', added: '2026-04-27', update: 'Riven Tides', text: '러스트 벨트 서쪽 해안의 버려진 항구와 호텔 지역. 공중을 떠다니는 ARC Turbine과 Beachcombing 조건이 함께 추가됐다. Frozen Trail에서 전체 보상 가치가 약 15% 올랐다.', keys: [], src: ['riven', 'frozen'] },
  { name: 'Pendola Pass', ko: '펜돌라 패스', added: '2026-10-08', update: 'Frozen Trail', text: '눈 덮인 산악 맵. 이 맵에서만 시험 중인 Dynamic Loot Zone이 있고, 출시 직후 패치에서 적 수가 조금 늘었다.', keys: [], src: ['frozen', 'u220'] },
];

// 맵 조건(특수 상황). 공식 글에 이름이 나온 것만
export const CONDITIONS = [
  { name: 'Night Raid', text: '밤 시간대 판. PvE 시험 서버에서는 제외됐다.', src: ['guide', 'pve'] },
  { name: 'Electromagnetic Storm', text: '전자기 폭풍이 부는 판.', src: ['guide'] },
  { name: 'Hidden Bunker', text: '숨겨진 벙커가 열리는 판. 제한 시간이 최대 40분이다.', src: ['guide', 'wiki'] },
  { name: 'Locked Gate', text: '잠긴 문이 열리는 특수 판. 제한 시간이 최대 40분이다. PvE 시험 서버에서는 제외됐다.', src: ['wiki', 'pve'] },
  { name: 'Harvester 계열', text: '최종 보스급 ARC Queen이 나오는 이벤트. 공식 출시 안내에 Harvest 관련 조건으로 소개됐다.', src: ['guide'], note: '정확한 영문 명칭은 매체마다 달라 확인 필요' },
  { name: 'Beachcombing', text: 'Riven Tides와 함께 추가된 소규모 조건. Dockmaster\'s Detector를 쓴다.', src: ['riven'] },
  { name: 'Frigate', text: 'Frozen Trail에서 추가. 2.1.0부터 해치를 열면 화염 지속 피해를 받는다.', src: ['frozen', 'u210'] },
  { name: 'Redirection', text: 'Frozen Trail에서 추가된 조건.', src: ['frozen'] },
];

// ARC 적. threat/armor는 Dexerto 분류(2026-04-28)이며 공식 수치가 아니다. 그 뒤 추가된 적은 '확인 필요'
export const ARC_TYPES = ['공중', '지상', '고정', '보스급', '확인 필요'];
export const ARC = [
  { name: 'Tick', type: '지상', threat: '낮음', armor: '없음', since: '출시', text: '작은 지상형 ARC.', src: ['guide', 'dxArc'] },
  { name: 'Pop', type: '지상', threat: '보통', armor: '없음', since: '출시', text: '공식 출시 안내에 이름이 나온 ARC.', src: ['guide', 'dxArc'] },
  { name: 'Snitch', type: '공중', threat: '보통', armor: '없음', since: '출시', text: '공식 출시 안내에 이름이 나온 ARC.', src: ['guide', 'dxArc'] },
  { name: 'Wasp', type: '공중', threat: '보통', armor: '없음', since: '출시', text: '소형 비행 드론.', src: ['guide', 'dxArc'] },
  { name: 'Hornet', type: '공중', threat: '높음', armor: '경장갑', since: '출시', text: '비행 드론.', src: ['guide', 'dxArc'] },
  { name: 'Rocketeer', type: '공중', threat: '치명', armor: '중장갑', since: '출시', text: '로켓을 쏘는 비행형. 기동성이 높아 매우 위험하다는 평가가 많다.', src: ['guide', 'dxArc'] },
  { name: 'Fireball', type: '지상', threat: '보통', armor: '중장갑', since: '출시', text: '공식 출시 안내에 이름이 나온 ARC.', src: ['guide', 'dxArc'] },
  { name: 'Leaper', type: '지상', threat: '치명', armor: '중장갑', since: '출시', text: '멀리 도약하는 대형 ARC. 트인 곳에 서 있으면 위험하다.', src: ['guide', 'dxArc'] },
  { name: 'Bastion', type: '지상', threat: '치명', armor: '중장갑', since: '출시', text: '중장갑 대형 ARC.', src: ['guide', 'dxArc'] },
  { name: 'Bombardier', type: '지상', threat: '치명', armor: '경장갑', since: '출시', text: '멀리서 포격하는 ARC.', src: ['guide', 'dxArc'] },
  { name: 'Sentinel', type: '고정', threat: '높음', armor: '경장갑', since: '확인 필요', text: '원거리 감시·사격형.', src: ['dxArc'] },
  { name: 'Turret', type: '고정', threat: '보통', armor: '없음', since: '확인 필요', text: '고정 포탑.', src: ['dxArc'] },
  { name: 'Spotter', type: '확인 필요', threat: '높음', armor: '없음', since: '확인 필요', text: '', src: ['dxArc'] },
  { name: 'Surveyor', type: '확인 필요', threat: '확인 필요', armor: '확인 필요', since: '확인 필요', text: '', src: ['dxArc'] },
  { name: 'Comet', type: '확인 필요', threat: '높음', armor: '중장갑', since: '확인 필요', text: '', src: ['dxArc'] },
  { name: 'Firefly', type: '확인 필요', threat: '높음', armor: '중장갑', since: '확인 필요', text: '', src: ['dxArc'] },
  { name: 'Queen', type: '보스급', threat: '극도', armor: '중장갑', since: '출시', text: '최종 보스급. 특정 이벤트 판에서만 나오며 여러 분대가 함께 상대하는 경우가 많다.', src: ['guide', 'dxArc'] },
  { name: 'Shredder', type: '지상', threat: '높음', armor: '중장갑', since: 'North Line', text: 'Stella Montis에서 처음 등장한 근접전형 ARC.', src: ['northline', 'dxArc'] },
  { name: 'Matriarch', type: '보스급', threat: '극도', armor: '중장갑', since: 'North Line', text: '특정 맵 조건에서 나오는 대형 ARC.', src: ['northline', 'dxArc'] },
  { name: 'ARC Turbine', type: '공중', threat: '확인 필요', armor: '확인 필요', since: 'Riven Tides', text: '하늘을 떠다니며, 가까이 가기 전에는 공격하지 않지만 방어 능력이 있다.', src: ['riven', 'u220'] },
  { name: 'Bully', type: '확인 필요', threat: '확인 필요', armor: '확인 필요', since: 'Frozen Trail', text: 'Frozen Trail에서 추가된 새 ARC.', src: ['frozen'] },
  { name: 'Skulker', type: '확인 필요', threat: '확인 필요', armor: '확인 필요', since: 'Frozen Trail', text: 'Frozen Trail에서 추가된 새 ARC.', src: ['frozen'] },
  { name: 'Hydra', type: '확인 필요', threat: '확인 필요', armor: '확인 필요', since: 'Frozen Trail', text: 'Frozen Trail에서 추가된 새 ARC. 2.2.0에서 피해량이 올랐다.', src: ['frozen', 'u220'] },
];

// 초보자 팁. 공식 설명에서 확인한 규칙을 바탕으로 정리
export const TIPS = [
  { h: '처음엔 잃어도 되는 장비로', p: '쓰러지면 들고 간 장비를 잃는다. 손에 익을 때까지는 무료 기본 장비로 들어가 맵 구조와 탈출 지점을 익히는 편이 손해가 적다.', src: ['guide', 'wiki'] },
  { h: '귀한 물건은 안전 주머니에', p: '안전 주머니에 넣은 물건은 쓰러져도 남는다. 퀘스트 물건이나 비싼 부품을 우선 넣는다.', src: ['wiki'] },
  { h: '탈출 시간을 먼저 정한다', p: '판에는 제한 시간이 있다. 가방이 다 차지 않았더라도 남은 시간과 가까운 탈출 지점을 보고 미리 움직인다. 열쇠가 있으면 레이더 해치가 더 안전한 선택이 될 수 있다.', src: ['wiki'] },
  { h: '소리를 아낀다', p: 'ARC와 다른 플레이어 모두 위협이다. 큰 ARC와 굳이 싸우지 않고 지나가는 것도 선택지다. Leaper처럼 도약하는 적 앞에서는 트인 곳을 피한다.', src: ['guide'] },
  { h: '안 쓰는 물건은 상인에게', p: '상인은 필요 없는 물건을 사 준다. 창고가 차기 전에 퀘스트 재료와 판매용을 나눠 둔다. 창고 최대 칸은 Frozen Trail에서 328칸으로 늘었다.', src: ['guide', 'frozen'] },
  { h: '혼자라도 괜찮다', p: '솔로는 솔로끼리 우선 매칭된다. 2026년 1월부터는 솔로가 3인 매칭에 들어가 더 큰 보상을 노리는 선택도 생겼다.', src: ['guide', 'wiki'] },
  { h: '익스페디션은 서두르지 않아도 된다', p: '레벨 20부터 열리지만 자발적이다. 완료 시점을 놓쳐도 진행도는 다음 주기까지 남는다고 공식 설명에 나와 있다.', src: ['expedition'] },
];

// 업데이트 기록. kind: major(대형) | patch(패치) | event(이벤트·시험)
export const UPDATES = [
  { date: '2025-10-30', name: '정식 출시', kind: 'major', text: 'PC, PS5, Xbox Series X|S 출시. 맵 4개(Dam Battlegrounds, Buried City, Spaceport, Blue Gate).', src: ['wiki', 'guide'] },
  { date: '2025-11-12', name: '듀오 매칭 추가', kind: 'patch', text: '2인 분대 매칭이 생겼다.', src: ['wiki'] },
  { date: '2025-11-13', name: 'North Line', kind: 'major', text: '공동 해금 이벤트로 다섯 번째 맵 Stella Montis 개방. Shredder, Matriarch 등장.', src: ['northline'] },
  { date: '2026-01-27', name: 'Headwinds (1.13.0)', kind: 'patch', text: '솔로가 3인 매칭에 들어가 더 큰 보상을 노릴 수 있게 됐다.', src: ['wiki'] },
  { date: '2026-04-27', name: 'Riven Tides', kind: 'major', text: '여섯 번째 맵 Riven Tides, ARC Turbine, Beachcombing 조건, 이벤트 Last Resort(5월 25일까지).', src: ['riven'], note: '위키백과는 버전 1.26.0, 4월 28일로 적음. 공식 글 날짜를 따름' },
  { date: '2026-05-14', name: '대형 업데이트 연 2회 발표', kind: 'event', text: '대형 콘텐츠 업데이트를 1년에 두 번 내겠다고 발표. 첫 번째가 10월 Frozen Trail.', src: ['wiki'] },
  { date: '2026-10-08', name: 'Frozen Trail (2.0)', kind: 'major', text: '일곱 번째 맵 Pendola Pass, 맵 조건 Frigate·Redirection, ARC Bully·Skulker·Hydra, 무기 Bantam·Stiletto, 무기 증폭, 스킬 트리 개편, 아웃포스트, 보상 패스, 그래플링 훅.', src: ['frozen'] },
  { date: '2026-10-13', name: 'Store Update 2.1.0', kind: 'patch', text: 'PvE 매칭 시험 시작, Frigate 해치 화염 피해, 그래플링 훅과 Pendola Pass 수정.', src: ['u210', 'pve'] },
  { date: '2026-10-20', name: 'Store Update 2.2.0', kind: 'patch', text: 'PvE 시험 종료, Hydra 피해 상향, ARC Turbine 출현 정리, Pendola Pass 적 소폭 증가, Expedition Vault 탭 제거.', src: ['u220'] },
  { date: '2026-10-27', name: 'Live Update 2.3.0', kind: 'patch', text: '새 플레이어 프로젝트 Souls Offering, 회복·화염 장비 조정, 일부 설계도가 모든 주요 맵 조건에서 나오도록 변경. 이후 수정 패치는 3주마다, 상점 갱신은 매주로 돌아간다고 안내.', src: ['u230'] },
];

export const UPDATE_KINDS = ['major', 'patch', 'event'];

// 하위 페이지. 화면 탭과 정적 페이지가 함께 쓴다
export const ARC_PAGES = [
  { id: '', title: 'ARC Raiders 아크 레이더스 정보 정리', short: '개요', desc: 'ARC Raiders의 출시 정보, 가격 정책, 탈출형 게임 방식, 스페란차·워크숍·익스페디션 시스템과 초보자 팁을 공식 자료 기준으로 정리했습니다.' },
  { id: 'maps', title: 'ARC Raiders 맵 7종과 맵 조건 정리', short: '맵', desc: 'Dam Battlegrounds부터 Pendola Pass까지 ARC Raiders 맵 7개의 추가 시기, 특징, 알려진 열쇠와 맵 조건을 표로 정리했습니다.' },
  { id: 'arc', title: 'ARC Raiders 적(ARC) 종류 검색', short: '적(ARC)', desc: 'ARC Raiders에 나오는 ARC 기계 적 23종을 이름, 형태, 위협도, 장갑, 등장 업데이트로 검색하고 거를 수 있습니다.' },
  { id: 'weapons', title: 'ARC Raiders 무기 26종 목록과 제작 단계', short: '무기', desc: 'ARC Raiders 무기 26종을 종류, 탄약, 희귀도, 워크숍 제작 단계, 상인 판매 여부로 검색하고 거를 수 있습니다.' },
  { id: 'items', title: 'ARC Raiders 재료 데이터베이스', short: '재료', desc: 'ARC Raiders 재료 38종의 희귀도, 판매가, 묶음 수, 재활용 결과와 쓰이는 곳(워크숍, 퀘스트, ARC 드롭)을 정리했습니다.' },
  { id: 'workshop', title: 'ARC Raiders 워크숍 업그레이드 재료 정리', short: '워크숍', desc: 'ARC Raiders 워크숍 작업대 9종의 단계별 업그레이드 재료와 단계별 제작품을 정리했습니다.' },
  { id: 'traders', title: 'ARC Raiders 상인 6명 정리', short: '상인', desc: 'ARC Raiders 스페란차 상인 Celeste, Shani, Tian Wen, Lance, Apollo, Nomadic Envoys가 파는 물건과 맡은 퀘스트를 정리했습니다.' },
  { id: 'quests', title: 'ARC Raiders 퀘스트 목록과 보상', short: '퀘스트', desc: 'ARC Raiders 퀘스트 50개의 의뢰인, 맵, 제출 물품, 보상을 검색하고 상인·맵별로 거를 수 있습니다.' },
  { id: 'updates', title: 'ARC Raiders 업데이트 기록', short: '업데이트', desc: 'ARC Raiders 출시부터 Frozen Trail 2.0, 2.3.0 패치까지 주요 업데이트를 날짜순으로 정리했습니다.' },
];
