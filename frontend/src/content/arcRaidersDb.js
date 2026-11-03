// ARC Raiders 데이터베이스(무기, 재료, 워크숍, 상인, 퀘스트, ARC 상세). 화면과 scripts/prerender.mjs가 함께 쓴다.
// 원칙: 출처 페이지에서 직접 읽은 값만 넣는다. 두 출처가 다르면 최근 수정된 쪽을 따르고 note에 적는다.
// 이름은 게임 속 영문 표기를 그대로 쓴다(공식 한국어 표기를 확인하지 못해 임의 번역하지 않음).
import { ARC } from './arcRaiders.js';

export const DB_CHECKED = '2026-11-03';

const WIKI = 'https://arcraiders.wiki/wiki/';
export const wikiUrl = (title) => WIKI + title.replace(/ /g, '_').replace(/'/g, '%27');
export const slugify = (s) => s.toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// 데이터베이스 출처. 커뮤니티 위키 본문은 CC BY-SA 4.0, 게임 자료의 권리는 Embark Studios에 있다
export const DB_SOURCES = {
  wWeapons: { name: 'ARC Raiders Wiki: Weapons (2026-10-21 수정본)', url: wikiUrl('Weapons') },
  wItems: { name: 'ARC Raiders Wiki: Loot(아이템 목록)', url: wikiUrl('Items') },
  wWorkshop: { name: 'ARC Raiders Wiki: Workshop (2026-10-31 수정본)', url: wikiUrl('Workshop') },
  wTraders: { name: 'ARC Raiders Wiki: Traders (2026-10-09 수정본)', url: wikiUrl('Traders') },
  wQuests: { name: 'ARC Raiders Wiki: Quests', url: wikiUrl('Quests') },
  wArc: { name: 'ARC Raiders Wiki: ARC (2026-10-27 수정본)', url: wikiUrl('ARC') },
  dxWeapons: { name: 'Dexerto 위키: 무기 목록 (2026-04-27)', url: 'https://www.dexerto.com/wikis/arc-raiders/all-arc-raiders-weapons' },
  dx: { name: 'Dexerto 위키: 재료별 페이지 (2026-03-25)', url: 'https://www.dexerto.com/wikis/arc-raiders/items/refined-material/mechanical-components' },
  dxEnemy: { name: 'Dexerto 위키: 적별 페이지 (2026-03-25)', url: 'https://www.dexerto.com/wikis/arc-raiders/all-arc-enemies' },
  dxQuests: { name: 'Dexerto 위키: 상인별 퀘스트 목록(의뢰인 대조)', url: 'https://www.dexerto.com/wikis/arc-raiders/traders' },
  gfinity: { name: 'Gfinity: 워크숍·Scrappy 업그레이드 (2025-11-05)', url: 'https://www.gfinityesports.com/article/arc-raiders-all-workshop-scrappy-and-expedition-upgrades-guide' },
  shack: { name: 'Shacknews: 퀘스트 목록 (2025-11-19)', url: 'https://www.shacknews.com/article/146909/all-quests-arc-raiders' },
};

export const RARITIES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
export const RARITY_KO = { Common: '일반', Uncommon: '고급', Rare: '희귀', Epic: '영웅', Legendary: '전설' };

// ── 무기 26종 ── class·ammo: 위키 / rarity: Dexerto(위키에는 희귀도 칸이 없음)
// craft: 워크숍 제작대와 단계(위키 Workshop 제작 목록), shop: Tian Wen 판매 목록에 있음(위키 Tian Wen 문서)
export const WEAPON_CLASSES = ['Assault Rifle', 'Battle Rifle', 'SMG', 'Shotgun', 'Pistol', 'Hand Cannon', 'LMG', 'Sniper Rifle', 'Special'];
export const WEAPON_CLASS_KO = { 'Assault Rifle': '돌격소총', 'Battle Rifle': '전투소총', SMG: '기관단총', Shotgun: '산탄총', Pistol: '권총', 'Hand Cannon': '핸드캐넌', LMG: '경기관총', 'Sniper Rifle': '저격소총', Special: '특수' };
export const AMMO = ['Light Ammo', 'Medium Ammo', 'Heavy Ammo', 'Shotgun Ammo', 'Energy Clip', 'Launcher Ammo'];
export const WEAPONS = [
  { name: 'Kettle', cls: 'Assault Rifle', ammo: 'Light Ammo', rarity: 'Common', craft: 'Workbench, Gunsmith 1', shop: true },
  { name: 'Rattler', cls: 'Assault Rifle', ammo: 'Medium Ammo', rarity: 'Common', craft: 'Gunsmith 1' },
  { name: 'Arpeggio', cls: 'Assault Rifle', ammo: 'Medium Ammo', rarity: 'Uncommon', craft: 'Gunsmith 2', shop: true },
  { name: 'Tempest', cls: 'Assault Rifle', ammo: 'Medium Ammo', rarity: 'Epic', craft: 'Gunsmith 3' },
  { name: 'Bettina', cls: 'Assault Rifle', ammo: 'Heavy Ammo', rarity: 'Epic', craft: 'Gunsmith 3' },
  { name: 'Ferro', cls: 'Battle Rifle', ammo: 'Heavy Ammo', rarity: 'Common', craft: 'Workbench, Gunsmith 1', shop: true },
  { name: 'Stiletto', cls: 'Battle Rifle', ammo: 'Light Ammo', rarity: '', craft: '', note: 'Frozen Trail 추가. 위키 기준 반자동, 피해 19. 희귀도 미확인' },
  { name: 'Renegade', cls: 'Battle Rifle', ammo: 'Medium Ammo', rarity: 'Rare', craft: 'Gunsmith 3', shop: true },
  { name: 'Aphelion', cls: 'Battle Rifle', ammo: 'Energy Clip', rarity: 'Legendary', craft: 'Gunsmith 3' },
  { name: 'Stitcher', cls: 'SMG', ammo: 'Light Ammo', rarity: 'Common', craft: 'Workbench, Gunsmith 1', shop: true },
  { name: 'Canto', cls: 'SMG', ammo: 'Medium Ammo', rarity: 'Rare', craft: 'Gunsmith 3' },
  { name: 'Bobcat', cls: 'SMG', ammo: 'Light Ammo', rarity: 'Epic', craft: 'Gunsmith 3' },
  { name: 'Il Toro', cls: 'Shotgun', ammo: 'Shotgun Ammo', rarity: 'Uncommon', craft: 'Gunsmith 1', shop: true },
  { name: 'Vulcano', cls: 'Shotgun', ammo: 'Shotgun Ammo', rarity: 'Epic', craft: 'Gunsmith 3' },
  { name: 'Dolabra', cls: 'Shotgun', ammo: 'Energy Clip', rarity: 'Legendary', craft: 'Gunsmith 3' },
  { name: 'Hairpin', cls: 'Pistol', ammo: 'Light Ammo', rarity: 'Common', craft: 'Workbench, Gunsmith 1' },
  { name: 'Burletta', cls: 'Pistol', ammo: 'Light Ammo', rarity: 'Uncommon', craft: 'Gunsmith 1', shop: true },
  { name: 'Venator', cls: 'Pistol', ammo: 'Medium Ammo', rarity: 'Rare', craft: 'Gunsmith 2' },
  { name: 'Bantam', cls: 'Hand Cannon', ammo: 'Heavy Ammo', rarity: '', craft: '', shop: true, note: 'Frozen Trail 추가. 위키 기준 더블 액션, 피해 24. 희귀도 미확인' },
  { name: 'Anvil', cls: 'Hand Cannon', ammo: 'Heavy Ammo', rarity: 'Uncommon', craft: 'Gunsmith 1' },
  { name: 'Torrente', cls: 'LMG', ammo: 'Medium Ammo', rarity: 'Rare', craft: 'Gunsmith 2', shop: true },
  { name: 'Osprey', cls: 'Sniper Rifle', ammo: 'Medium Ammo', rarity: 'Rare', craft: 'Gunsmith 2', shop: true },
  { name: 'Jupiter', cls: 'Sniper Rifle', ammo: 'Energy Clip', rarity: 'Legendary', craft: 'Gunsmith 3' },
  { name: 'Rascal', cls: 'Special', ammo: 'Launcher Ammo', rarity: '', craft: 'Gunsmith 2', shop: true, note: '희귀도 미확인' },
  { name: 'Hullcracker', cls: 'Special', ammo: 'Launcher Ammo', rarity: 'Epic', craft: 'Gunsmith 3' },
  { name: 'Equalizer', cls: 'Special', ammo: 'Energy Clip', rarity: 'Legendary', craft: 'Gunsmith 3' },
].map((w) => ({ ...w, slug: slugify(w.name) }));

// ── 재료 ── cat: 위키 분류. recycle: [수량, 이름] 목록, null = 재활용 불가, undefined = 미확인
// src: wItems(목록 표) / page(해당 아이템 위키 문서) / dx(Dexerto) / wWorkshop
export const ITEM_CATS = { Basic: '기본 재료', Refined: '가공 재료', Topside: '지상 재료', Recyclable: '재활용품', Research: '연구 재료', Nature: '자연물' };
export const ITEMS = [
  { name: 'Metal Parts', cat: 'Basic', rarity: 'Common', sell: 75, stack: 50, recycle: null, src: ['wItems'] },
  { name: 'Plastic Parts', cat: 'Basic', rarity: 'Common', sell: 60, stack: 50, recycle: null, src: ['wItems'] },
  { name: 'Rubber Parts', cat: 'Basic', rarity: 'Common', sell: 50, stack: 50, recycle: null, src: ['page'] },
  { name: 'Fabric', cat: 'Basic', rarity: 'Common', sell: 50, stack: 50, src: ['page'], note: '재활용 가능 여부 미확인. Refiner에서 Durable Cloth 재료로 쓰지만 필요 수량은 출처마다 달라 싣지 않음' },
  { name: 'Chemicals', cat: 'Basic', rarity: 'Common', sell: 50, stack: 50, recycle: null, src: ['page'], craft: 'Medical Lab 1에서 Chemicals 3 + Plastic Parts 3으로 Adrenaline Shot 제작' },
  { name: 'Planks', cat: 'Basic', rarity: 'Common', sell: 100, stack: 50, recycle: null, src: ['wItems'] },
  { name: 'Mechanical Components', cat: 'Refined', rarity: 'Uncommon', sell: 640, stack: 10, recycle: [[2, 'Rubber Parts'], [3, 'Metal Parts']], src: ['wItems', 'dx'] },
  { name: 'Advanced Mechanical Components', cat: 'Refined', rarity: 'Rare', sell: 1750, stack: 5, recycle: [[1, 'Mechanical Components'], [1, 'Steel Spring']], src: ['wItems', 'dx'] },
  { name: 'Electrical Components', cat: 'Refined', rarity: 'Uncommon', sell: 640, stack: 10, recycle: [[3, 'Plastic Parts'], [3, 'Rubber Parts']], src: ['page'], craft: 'Refiner 1에서 Plastic Parts 8 + Rubber Parts 4' },
  { name: 'Advanced Electrical Components', cat: 'Refined', rarity: 'Rare', sell: 1750, stack: 5, recycle: [[1, 'Electrical Components'], [1, 'Wires']], src: ['wItems', 'page'], craft: 'Refiner 2에서 Wires 3 + Electrical Components 2' },
  { name: 'Antiseptic', cat: 'Refined', rarity: 'Rare', sell: 1000, stack: 5, recycle: [[10, 'Chemicals']], src: ['wItems', 'page'] },
  { name: 'Mod Components', cat: 'Refined', rarity: 'Rare', sell: 1750, stack: 5, recycle: [[1, 'Mechanical Components'], [1, 'Steel Spring']], src: ['wItems'] },
  { name: 'Magnetic Accelerator', cat: 'Refined', rarity: 'Epic', sell: 5500, stack: 3, recycle: [[1, 'Advanced Mechanical Components'], [1, 'ARC Motion Core']], src: ['wItems', 'wWorkshop'], note: '위키 Workshop 문서는 Gunsmith 4 업그레이드 재료, 아이템 목록 표는 Gunsmith 3으로 적어 서로 다름' },
  { name: 'Oil', cat: 'Topside', rarity: 'Uncommon', sell: 300, stack: 15, recycle: [[3, 'Chemicals']], src: ['wItems', 'page'] },
  { name: 'Wires', cat: 'Topside', rarity: 'Uncommon', sell: 200, stack: 15, recycle: [[2, 'Rubber Parts']], src: ['page'] },
  { name: 'Battery', cat: 'Topside', rarity: 'Uncommon', sell: 250, stack: 15, recycle: [[2, 'Metal Parts']], src: ['wItems'] },
  { name: 'Magnet', cat: 'Topside', rarity: 'Uncommon', sell: 300, stack: 15, recycle: [[2, 'Metal Parts']], src: ['wItems'] },
  { name: 'ARC Alloy', cat: 'Topside', rarity: 'Uncommon', sell: 200, stack: 15, recycle: [[2, 'Metal Parts']], src: ['wItems', 'wWorkshop'] },
  { name: 'ARC Circuitry', cat: 'Topside', rarity: 'Rare', sell: 1000, stack: 5, recycle: [[2, 'ARC Alloy']], src: ['wItems', 'wWorkshop'] },
  { name: 'ARC Motion Core', cat: 'Topside', rarity: 'Rare', sell: 1000, stack: 5, recycle: [[2, 'ARC Alloy']], src: ['wItems', 'wWorkshop'] },
  { name: 'ARC Powercell', cat: 'Topside', rarity: 'Common', sell: 270, stack: 5, recycle: null, src: ['wItems', 'wWorkshop'] },
  { name: 'Advanced ARC Powercell', cat: 'Topside', rarity: 'Rare', sell: 640, stack: 5, recycle: [[2, 'ARC Powercell']], src: ['wItems'] },
  { name: 'Light Gun Parts', cat: 'Topside', rarity: 'Rare', sell: 700, stack: 5, recycle: [[2, 'Simple Gun Parts']], src: ['wItems', 'wWorkshop'] },
  { name: 'Medium Gun Parts', cat: 'Topside', rarity: 'Rare', sell: 700, stack: 5, recycle: [[2, 'Simple Gun Parts']], src: ['wItems', 'wWorkshop'] },
  { name: 'Amplified Fragments', cat: 'Topside', rarity: 'Epic', sell: 500, stack: 50, recycle: null, src: ['wItems'], craft: 'Amplification Module Mk. I~V에 각 7개씩 들어감' },
  { name: 'ARC Performance Steel', cat: 'Recyclable', rarity: 'Rare', sell: 1000, stack: 3, recycle: [[12, 'Metal Parts']], src: ['wItems'] },
  { name: 'ARC Synthetic Resin', cat: 'Recyclable', rarity: 'Rare', sell: 1000, stack: 3, recycle: [[14, 'Plastic Parts']], src: ['wItems'] },
  { name: 'ARC Thermo Lining', cat: 'Recyclable', rarity: 'Rare', sell: 1000, stack: 3, recycle: [[16, 'Fabric']], src: ['wItems', 'page'] },
  { name: 'ARC Flex Rubber', cat: 'Recyclable', rarity: 'Rare', sell: 1000, stack: 3, recycle: [[16, 'Rubber Parts']], src: ['wItems', 'page'] },
  { name: 'ARC Coolant', cat: 'Recyclable', rarity: 'Rare', sell: 1000, stack: 3, recycle: [[16, 'Chemicals']], src: ['wItems', 'page'] },
  { name: 'Bastion Cell', cat: 'Recyclable', rarity: 'Epic', sell: 3000, stack: 3, recycle: [[1, 'Advanced Mechanical Components'], [3, 'ARC Alloy']], src: ['wItems', 'wWorkshop'] },
  { name: 'Leaper Pulse Unit', cat: 'Recyclable', rarity: 'Epic', sell: 3000, stack: 3, recycle: [[1, 'Advanced Mechanical Components'], [3, 'ARC Alloy']], src: ['wItems', 'wWorkshop'] },
  { name: 'ARC Data Module', cat: 'Research', rarity: 'Epic', sell: 2000, stack: 3, recycle: null, src: ['wItems', 'wWorkshop'] },
  { name: 'Assorted Seeds', cat: 'Nature', rarity: 'Common', sell: 100, stack: 100, recycle: null, src: ['wItems', 'wWorkshop'], craft: 'Scrappy가 모아 오며, 상인 Celeste와 거래할 때 쓰는 화폐' },
  { name: 'Apricot', cat: 'Nature', rarity: 'Uncommon', sell: 640, stack: 10, recycle: [[3, 'Assorted Seeds']], src: ['wItems', 'wWorkshop'] },
  { name: 'Lemon', cat: 'Nature', rarity: 'Uncommon', sell: 640, stack: 10, recycle: [[3, 'Assorted Seeds']], src: ['wItems', 'wWorkshop'] },
  { name: 'Olives', cat: 'Nature', rarity: 'Uncommon', sell: 640, stack: 10, recycle: [[2, 'Assorted Seeds']], src: ['wItems', 'wWorkshop', 'gfinity'] },
  { name: 'Mushroom', cat: 'Nature', rarity: 'Uncommon', sell: 1000, stack: 10, recycle: null, src: ['wItems', 'wWorkshop', 'gfinity'] },
].map((i) => ({ ...i, slug: slugify(i.name) }));

// ── 워크숍 ── 위키 Workshop 문서. 업그레이드 비용은 Gfinity(Gunsmith 3·Refiner 2까지)와 일치 확인
// up: 단계별 업그레이드 재료 [수량, 이름]. crafts: 단계별 대표 제작품(무기는 WEAPONS와 연결)
export const STATIONS = [
  { name: 'Workbench', levels: 1, text: '처음부터 있는 기본 작업대. 기본 무기 4종, 탄약, Light Shield, Bandage 등을 만든다.', up: [], crafts: [['Kettle', 'Ferro', 'Hairpin', 'Stitcher', 'Light Shield', 'Bandage', 'Shield Recharger']] },
  { name: 'Gunsmith', levels: 4, text: '무기와 무기 부품(개머리판, 탄창, 소음기 등)을 만든다. 4단계는 아웃포스트가 필요하며 무기 증폭(Weapon Amplification)이 열린다.', up: [[[20, 'Metal Parts'], [30, 'Rubber Parts']], [[3, 'Rusted Tools'], [5, 'Mechanical Components'], [8, 'Wasp Driver']], [[3, 'Rusted Gear'], [5, 'Advanced Mechanical Components'], [4, 'Sentinel Firing Core']], [[3, 'Radial Press'], [3, 'Magnetic Accelerator'], [1, 'Emperor Modulator']]], crafts: [['Anvil', 'Burletta', 'Il Toro', 'Rattler'], ['Osprey', 'Rascal', 'Torrente', 'Venator', 'Arpeggio'], ['Aphelion', 'Dolabra', 'Equalizer', 'Jupiter', 'Bettina', 'Bobcat', 'Hullcracker', 'Tempest', 'Vulcano', 'Canto', 'Renegade'], ['Weapon Amplification']] },
  { name: 'Gear Bench', levels: 3, text: '증강 장치(Augment)와 실드를 만든다.', up: [[[25, 'Plastic Parts'], [30, 'Fabric']], [[3, 'Power Cable'], [5, 'Electrical Components'], [5, 'Hornet Driver']], [[3, 'Industrial Battery'], [5, 'Advanced Electrical Components'], [6, 'Bastion Cell']]], crafts: [['Combat Mk. 1', 'Looting Mk. 1', 'Tactical Mk. 1', 'Medium Shield'], ['Combat Mk. 2', 'Looting Mk. 2', 'Tactical Mk. 2', 'Heavy Shield'], ['Mk. 3 증강 장치 9종']] },
  { name: 'Medical Lab', levels: 3, text: '붕대, 주사, 실드 충전기 같은 회복 물품을 만든다.', up: [[[50, 'Fabric'], [6, 'ARC Alloy']], [[2, 'Cracked Bioscanner'], [5, 'Durable Cloth'], [8, 'Tick Pod']], [[3, 'Rusted Shut Medical Kit'], [8, 'Antiseptic'], [5, 'Surveyor Vault']]], crafts: [['Herbal Bandage', 'Shield Recharger', 'Adrenaline Shot', 'Bandage'], ['Defibrillator', 'Sterilized Bandage', 'Surge Shield Recharger'], ['Vita Spray', 'Vita Shot']] },
  { name: 'Explosives Station', levels: 3, text: '수류탄과 지뢰를 만든다.', up: [[[50, 'Chemicals'], [6, 'ARC Alloy']], [[3, 'Synthesized Fuel'], [5, 'Crude Explosives'], [5, 'Pop Trigger']], [[3, 'Laboratory Reagents'], [5, 'Explosive Compound'], [3, 'Rocketeer Driver']]], crafts: [['Seeker Grenade', 'Gas Grenade', 'Light Impact Grenade', 'Pulse Mine', 'Gas Mine'], ['Shrapnel Grenade', 'Snap Blast Grenade', 'Jolt Mine', "Trigger 'Nade", 'Fireworks Box'], ['Wolfpack', 'Blaze Grenade', 'Heavy Fuze Grenade', 'Showstopper', 'Trailblazer', 'Deadline', 'Explosive Mine', 'Surge Coil']] },
  { name: 'Utility Station', levels: 3, text: '쌍안경, 짚라인, 연막탄, 레이더 해치 열쇠 같은 도구를 만든다.', up: [[[50, 'Plastic Parts'], [6, 'ARC Alloy']], [[2, 'Damaged Heat Sink'], [5, 'Electrical Components'], [6, 'Snitch Scanner']], [[3, 'Fried Motherboard'], [5, 'Advanced Electrical Components'], [4, 'Leaper Pulse Unit']]], crafts: [['Binoculars', 'Crash Mat', 'Light Stick', 'Barricade Kit', 'Door Blocker'], ['Smoke Grenade', 'Lure Grenade', 'Raider Hatch Key', 'Zipline'], ['Snap Hook', 'Photoelectric Cloak', 'Powered Descender', 'Tagging Grenade']] },
  { name: 'Refiner', levels: 3, text: '기본 재료를 가공 재료로 바꾼다. 3단계는 아웃포스트가 필요하다.', up: [[[60, 'Metal Parts'], [5, 'ARC Powercell']], [[3, 'Toaster'], [5, 'ARC Motion Core'], [8, 'Fireball Burner']], [[3, 'Motor'], [10, 'ARC Circuitry'], [6, 'Bombardier Cell']]], crafts: [['Crude Explosives', 'Durable Cloth', 'Electrical Components', 'Mechanical Components'], ['Advanced Electrical Components', 'Advanced Mechanical Components', 'Antiseptic', 'ARC Circuitry', 'ARC Motion Core', 'Explosive Compound', 'Light Gun Parts', 'Medium Gun Parts', 'Heavy Gun Parts', 'Mod Components'], ['Complex Gun Parts', 'Magnetic Accelerator', 'Power Rod']] },
  { name: 'Research Station', levels: 4, text: 'Frozen Trail에서 추가된 연구대. 각 단계는 같은 단계의 아웃포스트가 필요하다. 제작 목록은 확인하지 못했다.', up: [[[3, 'Mini Pump'], [35, 'Planks'], [5, 'Battered Paperback']], [[3, 'Calculator'], [3, 'Raider Logbook'], [5, 'Skulker Targeter']], [[3, 'Differential Microphone'], [3, 'Exodus Technical Handbook'], [6, 'Bully Fragmenter']], [[3, 'Thermal Shaker'], [3, 'ARC Data Module'], [1, 'Frigate Inductor']]], crafts: [] },
  { name: 'Scrappy', levels: 5, text: '판마다 기본 재료(Metal Parts, Fabric, Plastic Parts, Chemicals, Rubber Parts)와 Assorted Seeds를 모아 오는 동료. 자연물과 생활용품으로 업그레이드한다.', up: [[], [[1, 'Dog Collar']], [[3, 'Lemon'], [3, 'Apricot']], [[6, 'Prickly Pear'], [6, 'Olives'], [1, 'Cat Bed']], [[12, 'Mushroom'], [12, 'Apricot'], [3, 'Very Comfortable Pillow']]], crafts: [] },
].map((s) => ({ ...s, slug: slugify(s.name), src: s.name === 'Research Station' ? ['wWorkshop'] : ['wWorkshop', 'gfinity'] }));

// ── 상인 ── 위키 상인별 문서 기준(Traders 요약표보다 최근 수정)
export const TRADERS = [
  { name: 'Celeste', role: '재료 교환', pay: 'Assorted Seeds(이 씨앗을 받는 유일한 상인)', sells: '기본·지상 재료(Metal Parts, Duct Tape, Wires, Battery, 총기 부품 등)' },
  { name: 'Shani', role: '보안', pay: 'Coins', sells: 'Frozen Trail 이후 주로 사회·유틸리티 물품(Remote Raider Flare, Binoculars, Light Stick, 카메라, Fireworks Box, Raider Hatch Key)', note: '위키 Traders 요약표는 증강 장치·무기 부품·의료품으로 적어 서로 다름. 더 최근에 수정된 개별 문서를 따름' },
  { name: 'Tian Wen', role: '총포상', pay: 'Coins', sells: '탄약 6종, 무기, 무기 부품' },
  { name: 'Lance', role: '진료소', pay: 'Coins', sells: '증강 장치(Mk. 1~3), 회복 물품, 실드와 실드 충전기', note: '위키 Traders 요약표에는 Free Loadout Augment도 결제 수단으로 적혀 있음' },
  { name: 'Apollo', role: '수류탄·장치', pay: 'Coins', sells: '수류탄 10종, Noisemaker, Zipline, Barricade Kit, Pulse Mine, Door Blocker 등' },
  { name: 'Nomadic Envoys', role: '자원', pay: '확인 필요', sells: '창고 확장, 외형, 자원, 설계도', note: 'Frozen Trail 무렵 위키에 추가된 상인. 세부는 확인 필요' },
].map((t) => ({ ...t, slug: slugify(t.name), src: ['wTraders', 'page'] }));

// ── 퀘스트 ── 위키 Quests 표에서 원문으로 확인한 50개만. 의뢰인은 Dexerto 안내와 대조해 모두 일치
// maps: Dam·BC·SP·BG·SM·PP·RT, 비어 있으면 맵 제한 없음. turnIn: 제출 물품(없으면 빈 배열)
export const QUEST_MAPS = { Dam: 'Dam Battlegrounds', BC: 'Buried City', SP: 'The Spaceport', BG: 'The Blue Gate', SM: 'Stella Montis', RT: 'Riven Tides', PP: 'Pendola Pass' };
const q = (name, giver, maps, turnIn, reward) => ({ name, giver, maps, turnIn, reward, slug: slugify(name) });
export const QUESTS = [
  q('Picking Up The Pieces', 'Shani', [], [], [[1, 'Rattler III'], [80, 'Medium Ammo']]),
  q('Clearer Skies', 'Shani', [], [[3, 'ARC Alloy']], [[1, 'Light Shield'], [3, 'Sterilized Bandage'], [1, '배낭 색상(Hiker, Black)']]),
  q('Trash Into Treasure', 'Shani', [], [[1, 'Battery'], [6, 'Wires']], [[1, 'Tactical Mk. 1'], [3, 'Adrenaline Shot']]),
  q('Off The Radar', 'Shani', [], [], [[2, 'Defibrillator'], [1, '의상(Origin, Black White)']]),
  q('A Bad Feeling', 'Celeste', [], [], [[5, 'Duct Tape'], [5, 'Steel Spring'], [10, 'Metal Parts']]),
  q('Hatch Repairs', 'Shani', [], [], [[1, 'Binoculars'], [1, 'Raider Hatch Key']]),
  q('The Right Tool', 'Tian Wen', [], [], [[1, 'Stitcher II'], [1, 'Extended Light Mag I'], [1, '감정 표현(Cheer)']]),
  q('Down To Earth', 'Shani', [], [], [[1, 'Combat Mk. 1'], [1, 'Medium Shield']]),
  q('A Better Use', 'Tian Wen', ['Dam', 'BC', 'SP', 'BG'], [], [[1, 'Extended Light Mag I'], [1, 'Muzzle Brake II'], [1, 'Stable Stock I']]),
  q('The Trifecta', 'Shani', [], [[2, 'Hornet Driver'], [2, 'Snitch Scanner'], [2, 'Wasp Driver']], [[1, 'Combat Mk. 2'], [1, 'Dam Control Tower Key'], [1, 'Raider Hatch Key'], [2, 'Defibrillator'], [3, 'Synthesized Fuel'], [1, '의상(Origin, Orange Camo)']]),
  q('Greasing Her Palms', 'Celeste', ['Dam', 'BC', 'SP'], [], [[1, 'Lure Grenade Blueprint'], [3, 'Electrical Components'], [3, 'Speaker Component']]),
  q('Dormant Barons', 'Shani', ['Dam', 'SP', 'BG'], [], [[3, 'Door Blocker'], [3, "Li'l Smoke Grenade"]]),
  q('What We Left Behind', 'Tian Wen', ['Dam', 'BC', 'SP'], [], [[1, 'Muzzle Brake II'], [1, 'Stable Stock II'], [1, 'Vertical Grip II']]),
  q('Broken Monument', 'Tian Wen', ['Dam'], [[1, 'First Wave Compass'], [1, 'First Wave Rations'], [1, 'First Wave Tape']], [[1, 'Arpeggio I'], [1, 'Compensator II'], [80, 'Medium Ammo']]),
  q('Marked For Death', 'Tian Wen', ['BC'], [], [[1, 'Angled Grip II'], [1, 'Shotgun Choke II']]),
  q('Straight Record', 'Celeste', ['Dam'], [], [[3, 'Advanced Mechanical Components'], [5, 'Medium Gun Parts']]),
  q('Market Correction', 'Tian Wen', ['BC'], [], [[1, 'Compensator I'], [1, 'Extended Light Mag I'], [1, 'Silencer II']]),
  q("Doctor's Orders", 'Lance', [], [[1, 'Durable Cloth'], [1, 'Great Mullein'], [1, 'Syringe'], [2, 'Antiseptic']], [[1, 'Surge Shield Recharger'], [3, 'Adrenaline Shot'], [3, 'Sterilized Bandage']]),
  q('Keeping The Memory', 'Celeste', ['Dam'], [], [[5, 'Duct Tape'], [5, 'Magnet'], [5, 'Simple Gun Parts']]),
  q('Eyes On The Prize', 'Tian Wen', ['BC'], [[3, 'Wires']], [[1, 'Extended Medium Mag II'], [1, 'Extended Shotgun Mag II']]),
  q('Medical Merchandise', 'Lance', ['Dam', 'BC', 'SP'], [], [[2, 'Vita Shot'], [3, 'Defibrillator'], [1, '장식(Banana)']]),
  q('Echoes Of Victory Ridge', 'Celeste', ['Dam'], [[1, "Major Aiva's Patch"]], [[1, 'Music Box'], [2, 'Processor'], [6, 'Crude Explosives']]),
  q('Industrial Espionage', 'Tian Wen', ['BC'], [], [[1, 'Burletta Blueprint'], [3, 'Mechanical Components'], [3, 'Simple Gun Parts']]),
  q('A Reveal In Ruins', 'Lance', ['BC'], [[1, 'ESR Analyzer']], [[1, 'Surge Shield Recharger'], [1, 'Tactical Mk. 3 (Healing)']]),
  q('Unexpected Initiative', 'Tian Wen', ['BC'], [[1, 'Moisture Meter'], [1, 'Nutrient Meter']], [[1, 'Il Toro I'], [1, 'Shotgun Choke II'], [40, 'Shotgun Ammo']]),
  q('A Lay Of The Land', 'Shani', ['SP'], [[1, 'LiDAR Scanner']], [[1, 'Dam Testing Annex Key'], [2, 'Smoke Grenade'], [3, 'Zipline']]),
  q('A Symbol Of Unification', 'Celeste', ['Dam'], [[1, 'Raider Flag']], [[3, 'Mod Components'], [5, 'Duct Tape'], [1, '의상(Aviator, Dusted Cream)']]),
  q('Eyes In The Sky', 'Shani', ['Dam', 'BC', 'SP'], [], [[1, 'Vita Spray'], [3, 'Tagging Grenade'], [5, 'Yellow Light Stick']]),
  q("Celeste's Journals", 'Celeste', ['Dam'], [[2, "Celeste's Journal"]], [[1, 'Exodus Modules'], [1, 'Magnetic Accelerator'], [3, 'Heavy Gun Parts']]),
  q("The Major's Footlocker", 'Tian Wen', ['Dam'], [[1, "Major Aiva's Mementos"]], [[1, 'Hullcracker Blueprint']]),
  q('A Balanced Harvest', 'Celeste', ['Dam'], [], [[3, 'Advanced Mechanical Components'], [3, 'Medium Gun Parts'], [10, 'Steel Spring']]),
  q('Back on Top', 'Tian Wen', ['Dam', 'BC', 'SP', 'BG'], [], [[1, 'Renegade I'], [1, 'Stable Stock III'], [80, 'Medium Ammo']]),
  q('Untended Garden', 'Celeste', ['Dam'], [], [[3, 'Advanced Mechanical Components'], [3, 'Heavy Gun Parts'], [5, 'Canister']]),
  q('Our Presence Up There', 'Shani', ['Dam'], [], [[1, 'Buried City Town Hall Key'], [1, 'Raider Hatch Key'], [3, 'Jolt Mine']]),
  q('After Rain Comes', 'Celeste', ['BC'], [[2, 'Battery'], [5, 'Wires']], [[3, 'Antiseptic'], [5, 'Blue Light Stick'], [5, 'Durable Cloth']]),
  q('The Root Of The Matter', 'Celeste', ['BC'], [[1, 'Experimental Seed Sample']], [[1000, 'Coins'], [1, '장식(Succulent)']]),
  q('Lost In Transmission', 'Shani', ['SP'], [], [[1, 'Snap Hook']]),
  q('Water Troubles', 'Celeste', ['Dam'], [], [[3, 'Mechanical Components'], [3, 'Simple Gun Parts'], [3, 'Steel Spring']]),
  q('Communication Hideout', 'Shani', ['BC'], [], [[1, 'Anvil III'], [40, 'Heavy Ammo'], [1, '의상(Aviator, Crimson Racer)']]),
  q('Into The Fray', 'Shani', [], [[1, 'Leaper Pulse Unit']], [[1, 'Vulcano III'], [1, 'Combat Mk. 3 (Aggressive)'], [1, 'Heavy Shield'], [40, 'Shotgun Ammo'], [1, '의상(Radio Renegade, Grey)']]),
  q('Source Of The Contamination', 'Celeste', ['Dam'], [], [[1, 'Mod Components'], [5, 'Duct Tape'], [5, 'Steel Spring']]),
  q('Paving The Way', 'Apollo', ['Dam', 'BC', 'BG'], [], [[1, 'Advanced Electrical Components'], [1, 'Raider Hatch Key'], [3, 'Seeker Grenade']]),
  q('Switching The Supply', 'Celeste', ['SP'], [], [[1, 'Spaceport Trench Tower Key'], [3, 'Synthesized Fuel'], [1, '의상(Radio Renegade, Blue)']]),
  q('Deciphering The Data', 'Shani', ['SP'], [], [[3, 'Defibrillator'], [3, 'Trailblazer']]),
  q('A Warm Place To Rest', 'Apollo', ['BC'], [], [[1, 'Rosary'], [3, 'Noisemaker'], [5, 'Blue Light Stick'], [1, '의상(Radio Renegade, Goggles)']]),
  q('Groundbreaking', 'Apollo', ['BG'], [], [[1, 'Power Rod'], [1, '의상(Warden, Tangerine)']]),
  q('Dust On The Wires', 'Shani', ['SP'], [[1, 'Scout Patrol Note']], [[1, '장식(Fax Machine)']]),
  q('Prescriptions Of The Past', 'Lance', ['SP'], [], [[1, 'Heavy Shield'], [1, 'Tactical Mk. 3 (Healing)'], [3, 'Adrenaline Shot']]),
  q('A Dead End', 'Shani', ['BG'], [[1, 'Dusty Film Reel']], [[2000, 'Coins'], [1, '외형(Patchwork, Warden)']]),
  q('Power Out', 'Celeste', ['SP'], [], [[5, 'Explosive Compound'], [5, 'Oil'], [5, 'Wires'], [1, '의상(Radio Renegade, Bag)']]),
].map((x) => ({ ...x, src: ['wQuests', 'dxQuests'] }));

// ── ARC 상세 ── 위키 적별 문서(2026-10 수정본)와 Dexerto 적별 문서 대조. 12종만 확인
// drops: 고유 부품을 맨 앞에. 다른 값은 note에
export const ARC_DETAIL = {
  Tick: { weak: '따로 표시된 약점 없음(어떤 무기로도 쉽게 부서짐)', act: '뛰어올라 머리에 달라붙어 체력과 실드를 깎는다', drops: ['Tick Pod', 'ARC Powercell', 'ARC Alloy', 'ARC Flex Rubber', 'ARC Thermo Lining'] },
  Pop: { weak: '따로 표시된 약점 없음(어떤 무기로도 쉽게 부서짐)', act: '빠르게 굴러와 경고음 뒤에 폭발한다', drops: ['Pop Trigger', 'Crude Explosives', 'ARC Alloy', 'ARC Coolant', 'ARC Thermo Lining'] },
  Snitch: { weak: '추진기', act: '레이더를 발견하면 증원(Wasp, Hornet, Rocketeer 등)을 부른다', drops: ['Snitch Scanner', 'Sensors', 'ARC Synthetic Resin', 'ARC Thermo Lining'] },
  Wasp: { weak: '추진기', act: '붉은 레이저로 조준한 뒤 탄을 연속 발사한다', drops: ['Wasp Driver', 'Light Ammo', 'Simple Gun Parts', 'ARC Synthetic Resin'] },
  Hornet: { weak: '뒤쪽 추진기(앞면은 장갑)', act: '레이저 조준 뒤 기절탄을 쏴 움직임을 막고 실드를 깎는다', drops: ['Hornet Driver', 'Medium Ammo', 'Simple Gun Parts', 'ARC Performance Steel', 'ARC Synthetic Resin'] },
  Rocketeer: { weak: '추진기, 스캐너 위쪽', act: '레이저 네 줄로 고정한 뒤 미사일을 쏟아붓는다', drops: ['Rocketeer Driver', 'Launcher Ammo', 'Heavy Gun Parts', 'Electrical Components', 'ARC Circuitry'], note: '위키는 1.33.0에서 Heavy Ammo가 Launcher Ammo로 바뀌었다고 적음. Dexerto(2026-03)는 Heavy Ammo·ARC Flex Rubber로 적음' },
  Leaper: { weak: '눈, 다리 관절', act: '뛰어올라 내리찍고 충격파를 낸다', drops: ['Leaper Pulse Unit', 'Advanced ARC Powercell', 'ARC Performance Steel', 'Explosive Compound'] },
  Bastion: { weak: '등의 판·용기, 다리 관절(노란 무릎)', act: '날카로운 경고음 뒤 약 3초간 개틀링을 쏜다. 느리게 움직인다', drops: ['Bastion Cell', 'ARC Performance Steel', 'ARC Circuitry'], note: '총기 부품은 위키 문서끼리 Heavy·Medium으로 달라 뺌' },
  Bombardier: { weak: '등의 판·원통, 다리 관절', act: 'Spotter 드론의 도움을 받아 박격포를 쏘고 충격파를 낸다', drops: ['Bombardier Cell', 'Launcher Ammo', 'Heavy Gun Parts', 'ARC Performance Steel'] },
  Fireball: { weak: '앞판이 열릴 때 드러나는 코어', act: '굴러와 앞판을 열고 화염을 뿜는다. 부서질 때 불이 붙는다', drops: ['Fireball Burner', 'Crude Explosives', 'ARC Coolant', 'ARC Thermo Lining'] },
  Sentinel: { weak: '회전 팔에 달린 노란 용기', act: '레이저로 고정한 뒤 강한 한 발을 쏘는 고정 포탑', drops: ['Sentinel Firing Core', 'Heavy Ammo', 'Advanced ARC Powercell', 'ARC Flex Rubber'] },
  Turret: { weak: '따로 표시된 약점 없음', act: '조준이 맞으면 탄을 계속 퍼붓는 고정 포탑', drops: ['Light Ammo', 'ARC Powercell', 'ARC Alloy', 'Simple Gun Parts'], note: '고유 부품 없음(위키). Dexerto는 Simple Gun Parts 대신 Light Gun Parts로 적음' },
};

export const ARC_LIST = ARC.map((a) => ({ ...a, slug: slugify(a.name), detail: ARC_DETAIL[a.name] }));

// ── 상호 링크 ──
const itemBySlug = new Map(ITEMS.map((i) => [i.slug, i]));
const weaponBySlug = new Map(WEAPONS.map((w) => [w.slug, w]));
const arcBySlug = new Map(ARC_LIST.map((a) => [a.slug, a]));
export const findItem = (slug) => itemBySlug.get(slug);
export const findArc = (slug) => arcBySlug.get(slug);

// 이름 → 이 사이트 안의 주소(없으면 null). 무기는 "Rattler III"처럼 등급이 붙어도 연결한다
export const BASE = '/games/arc-raiders';
export const pathFor = (name) => {
  const s = slugify(name);
  if (itemBySlug.has(s)) return `${BASE}/items/${s}`;
  const w = weaponBySlug.get(s) || weaponBySlug.get(slugify(name.replace(/\s+(I|II|III|IV)$/, '')));
  if (w) return `${BASE}/weapons#${w.slug}`;
  if (arcBySlug.has(s)) return `${BASE}/arc/${s}`;
  return null;
};

// 아이템이 쓰이는 곳: 워크숍 업그레이드, 퀘스트 제출, 퀘스트 보상, 다른 재료의 재활용 결과, ARC 드롭
export const itemUses = (name) => ({
  upgrades: STATIONS.flatMap((s) => s.up.flatMap((lv, i) => lv.filter(([, n]) => n === name).map(([n2]) => ({ station: s, level: i + 1, qty: n2 })))),
  turnIns: QUESTS.filter((x) => x.turnIn.some(([, n]) => n === name)),
  rewards: QUESTS.filter((x) => x.reward.some(([, n]) => n === name)),
  recycledFrom: ITEMS.filter((i) => i.recycle?.some(([, n]) => n === name)),
  droppedBy: ARC_LIST.filter((a) => a.detail?.drops.includes(name)),
});

// ARC 고유 부품이 필요한 곳
export const arcPartUses = (arc) => {
  const part = arc.detail?.drops[0];
  if (!part) return { part: null, upgrades: [], turnIns: [] };
  const u = itemUses(part);
  return { part, upgrades: u.upgrades, turnIns: u.turnIns };
};

// 상세 페이지 제목·설명. 화면과 정적 페이지가 같은 문구를 쓴다
export const itemMeta = (i) => ({
  title: `${i.name} - ARC Raiders 재료 정보`,
  desc: `ARC Raiders ${i.name}: ${ITEM_CATS[i.cat]}, ${RARITY_KO[i.rarity]}(${i.rarity}), 판매가 ${i.sell.toLocaleString('en-US')}코인. 재활용 결과와 워크숍·퀘스트·ARC 드롭 등 쓰이는 곳을 정리했습니다.`,
});
export const arcMeta = (a) => ({
  title: `${a.name} - ARC Raiders 적(ARC) 정보`,
  desc: a.detail
    ? `ARC Raiders ${a.name}의 약점(${a.detail.weak}), 행동, 드롭 부품과 그 부품이 필요한 워크숍·퀘스트를 정리했습니다.`
    : `ARC Raiders ${a.name}의 분류, 위협도, 등장 업데이트를 정리했습니다. 약점과 드롭은 아직 확인하지 못했습니다.`,
});
