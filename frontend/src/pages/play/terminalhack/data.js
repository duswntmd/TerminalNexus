// 터미널 해킹 데이터
const RAW = `
ADMIN AGENT ALERT ARRAY BLOCK CACHE CHAIN CLASS CLOCK CRASH CRYPT DEBUG DELAY DRIVE ERROR FETCH FLASH FRAME GHOST GUARD INDEX INPUT LAYER LINUX LOGIN MACRO MODEM MOUNT NODES PATCH PIXEL PORTS PROXY QUERY RESET ROUTE SHELL STACK TOKEN TRACE VIRUS WATCH
ACCESS BINARY BRANCH BUFFER CIPHER CLIENT CURSOR DAEMON DEPLOY DOMAIN ENCODE FILTER KERNEL LAMBDA LEGACY MEMORY MIRROR MODULE OBJECT PACKET PARSER PLUGIN REBOOT RECORD REMOTE ROUTER SCRIPT SERVER SIGNAL SOCKET SOURCE SYNTAX SYSTEM TARGET THREAD TUNNEL UPLOAD VECTOR WIDGET
ADAPTER BATTERY CHANNEL CLUSTER COMMAND COMPILE CONSOLE CONTROL CRAWLER DECRYPT DEFAULT DESKTOP DIGITAL DYNAMIC ENCRYPT GATEWAY MACHINE MALWARE MONITOR NETWORK OPTIONS PACKAGE PAYLOAD PRIVATE PROCESS PROGRAM PROJECT PROTECT PUBLISH RUNTIME SANDBOX SESSION STORAGE VERSION VIRTUAL WARNING
BACKDOOR BREAKOUT CALLBACK CHECKSUM COMPILER CONSTANT DATABASE DEBUGGER DOWNLOAD ENDPOINT FIREWALL FIRMWARE FUNCTION HOSTNAME INTERNET KEYBOARD KEYCHAIN MAINLINE OVERFLOW OVERRIDE PASSWORD PIPELINE PROTOCOL REGISTRY SECURITY SHUTDOWN SNAPSHOT TERMINAL VARIABLE WIRELESS
ALGORITHM ANONYMOUS BANDWIDTH BOOTSTRAP COMPONENT CONTAINER DIRECTORY ENCRYPTED EXCEPTION EXECUTION FREQUENCY HANDSHAKE INTERFACE LOCALHOST MAINFRAME NAMESPACE OPERATION OVERCLOCK PROCESSOR RECURSIVE SCHEDULER SIMULATOR SUBMODULE SUPERUSER TIMESTAMP WORKSPACE
ALGORITHMS AUTHORIZED BLOCKCHAIN BREAKPOINT BROADCASTS CONNECTION CONTROLLER CREDENTIAL CYBERSPACE DEPLOYMENT ENCRYPTION FRAMEWORKS INITIALIZE MICROCHIPS NETWORKING PERMISSION PROCESSING QUARANTINE REPOSITORY SUPERVISOR TRANSISTOR
`;

export const WORDS_BY_LEN = RAW.trim().split(/\s+/).reduce((m, w) => { (m[w.length] ||= []).push(w); return m; }, {});

export const SERVERS = [
  '동네 PC방 계산대',
  '아파트 관리사무소',
  '편의점 본사 POS',
  '대학 학사 시스템',
  '물류센터 재고 서버',
  '도서관 대출 시스템',
  '게임사 랭킹 DB',
  '증권사 주문 서버',
  '통신사 코어망',
  '기상청 슈퍼컴퓨터',
  '우주항공 관제 서버',
];

export const serverName = (stage) => (stage <= SERVERS.length ? SERVERS[stage - 1] : `TN 메인프레임 Δ${stage - SERVERS.length}`);

export const stageConfig = (stage) => ({
  len: Math.min(5 + Math.floor((stage - 1) / 2), 10),
  count: Math.min(9 + stage, 16),
  time: Math.max(45, 80 - stage * 3),
});

export const likeness = (a, b) => {
  let n = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] === b[i]) n++;
  return n;
};

export const FILLER = "!@#$%^&*_+=|\\:;\"',.?/~`-".split('');
export const BRACKETS = { '(': ')', '[': ']', '{': '}', '<': '>' };
export const COLS = 12;
export const ROWS = 32;

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// 비밀번호와 일부 글자를 공유하는 단어를 섞어 추리할 거리가 있게 고른다
export function chooseWords(len, count) {
  const pool = [...(WORDS_BY_LEN[len] || WORDS_BY_LEN[5])];
  const secret = pick(pool);
  const others = pool.filter((w) => w !== secret).sort(() => Math.random() - 0.5);
  const close = others.filter((w) => likeness(w, secret) >= 1).slice(0, Math.ceil((count - 1) * 0.6));
  const rest = others.filter((w) => !close.includes(w)).slice(0, count - 1 - close.length);
  const words = [secret, ...close, ...rest].sort(() => Math.random() - 0.5);
  return { secret, words };
}

export function buildBoard(words) {
  const total = COLS * ROWS;
  const cells = Array(total).fill(null);
  const len = words[0].length;
  words.forEach((word, wi) => {
    for (let tries = 0; tries < 2000; tries++) {
      const row = Math.floor(Math.random() * ROWS);
      const col = Math.floor(Math.random() * (COLS - len + 1));
      const start = row * COLS + col;
      let ok = true;
      for (let i = -1; i <= len; i++) {
        const c = start + i;
        if (c >= row * COLS && c < (row + 1) * COLS && cells[c]) { ok = false; break; }
      }
      if (!ok) continue;
      for (let i = 0; i < len; i++) cells[start + i] = { ch: word[i], word: wi };
      return;
    }
  });
  for (let i = 0; i < total; i++) if (!cells[i]) cells[i] = { ch: pick(FILLER) };
  // 같은 줄 안의 괄호쌍 표시 (중간에 단어가 끼면 무효)
  let bid = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c;
      if (Math.random() < 0.13 && cells[i].word === undefined && !cells[i].bracket) {
        const open = pick(Object.keys(BRACKETS));
        const span = 1 + Math.floor(Math.random() * 4);
        const j = i + span;
        if (j >= (r + 1) * COLS) continue;
        let clear = true;
        for (let k = i; k <= j; k++) if (cells[k].word !== undefined || cells[k].bracket) clear = false;
        if (!clear) continue;
        cells[i] = { ch: open };
        cells[j] = { ch: BRACKETS[open] };
        for (let k = i; k <= j; k++) cells[k].bracket = { id: ++bid, start: i, end: j };
      }
    }
  }
  return cells;
}

export const hexAddr = (row) => `0x${(0xf4a0 + row * COLS).toString(16).toUpperCase()}`;
