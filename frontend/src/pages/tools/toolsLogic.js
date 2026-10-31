// 인프라 도구 계산 로직 (화면과 분리해 단독 검증)

/* ───────── IPv4 서브넷 ───────── */
const ipToInt = (ip) => {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p) || Number(p) > 255) return null;
    n = n * 256 + Number(p);
  }
  return n;
};

const intToIp = (n) => [n / 16777216, (n / 65536) % 256, (n / 256) % 256, n % 256].map((x) => Math.floor(x)).join('.');

const prefixToMask = (prefix) => (prefix === 0 ? 0 : 4294967296 - 2 ** (32 - prefix));

/** "192.168.0.10/24", "10.0.0.1 255.255.0.0" 형식 해석. 실패하면 null */
export const parseCidr = (text) => {
  const m = text.trim().match(/^([\d.]+)(?:\s*\/\s*(\d{1,2})|\s+([\d.]+))?$/);
  if (!m) return null;
  const ip = ipToInt(m[1]);
  if (ip === null) return null;
  let prefix = 24;
  if (m[2] !== undefined) {
    prefix = Number(m[2]);
    if (prefix > 32) return null;
  } else if (m[3] !== undefined) {
    const mask = ipToInt(m[3]);
    if (mask === null) return null;
    // 마스크는 1이 왼쪽부터 연속이어야 함
    const inv = 4294967295 - mask;
    if ((inv & (inv + 1)) !== 0 && inv !== 4294967295) return null;
    prefix = 32 - Math.round(Math.log2(inv + 1));
  }
  return { ip, prefix };
};

const ipClass = (ip) => {
  const a = Math.floor(ip / 16777216);
  const b = Math.floor(ip / 65536) % 256;
  if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return 'private';
  if (a === 127) return 'loopback';
  if (a === 169 && b === 254) return 'linklocal';
  if (a === 100 && b >= 64 && b <= 127) return 'cgnat';
  if (a >= 224 && a <= 239) return 'multicast';
  return 'public';
};

export const subnetInfo = ({ ip, prefix }) => {
  const size = 2 ** (32 - prefix);
  const network = Math.floor(ip / size) * size;
  const broadcast = network + size - 1;
  const mask = prefixToMask(prefix);
  let first = network + 1;
  let last = broadcast - 1;
  let hosts = size - 2;
  if (prefix === 32) { first = network; last = network; hosts = 1; }
  if (prefix === 31) { first = network; last = broadcast; hosts = 2; } // RFC 3021 점대점 링크
  return {
    network: intToIp(network), broadcast: intToIp(broadcast), mask: intToIp(mask),
    wildcard: intToIp(4294967295 - mask), first: intToIp(first), last: intToIp(last),
    hosts, cidr: `${intToIp(network)}/${prefix}`, kind: ipClass(ip), prefix, size,
  };
};

/** 네트워크를 newPrefix 크기로 나눈 목록 (많으면 limit개까지) */
export const splitSubnet = ({ ip, prefix }, newPrefix, limit = 64) => {
  if (newPrefix <= prefix || newPrefix > 32) return { total: 0, items: [] };
  const base = Math.floor(ip / 2 ** (32 - prefix)) * 2 ** (32 - prefix);
  const step = 2 ** (32 - newPrefix);
  const total = 2 ** (newPrefix - prefix);
  const items = [];
  for (let i = 0; i < Math.min(total, limit); i++) {
    items.push(subnetInfo({ ip: base + i * step, prefix: newPrefix }));
  }
  return { total, items };
};

/* ───────── RAID ───────── */
export const RAID_LEVELS = {
  0: { min: 2, tolerance: () => '0' },
  1: { min: 2, tolerance: (n) => `${n - 1}` },
  5: { min: 3, tolerance: () => '1' },
  6: { min: 4, tolerance: () => '2' },
  10: { min: 4, even: true, tolerance: () => '1~n/2' },
  50: { min: 6, groups: true, tolerance: () => '1~groups' },
  60: { min: 8, groups: true, tolerance: () => '2~2*groups' },
};

/**
 * 디스크 수·용량으로 RAID 계산
 * - groups: RAID 50/60의 패리티 그룹 수
 * - 반환 usable/raw 단위는 입력과 같음, tib는 제조사 표기(TB)를 OS 표기(TiB)로 환산한 값
 */
export const raidCapacity = ({ level, disks, size, groups = 2 }) => {
  const def = RAID_LEVELS[level];
  if (!def || !Number.isInteger(disks) || disks < 1 || !(size > 0)) return { error: 'input' };
  if (disks < def.min) return { error: 'min', min: def.min };
  if (def.even && disks % 2 !== 0) return { error: 'even' };
  if (def.groups && (groups < 2 || disks % groups !== 0 || disks / groups < (level === 50 ? 3 : 4))) {
    return { error: 'groups', perGroup: level === 50 ? 3 : 4 };
  }
  let dataDisks;
  if (level === 0) dataDisks = disks;
  else if (level === 1) dataDisks = 1;
  else if (level === 5) dataDisks = disks - 1;
  else if (level === 6) dataDisks = disks - 2;
  else if (level === 10) dataDisks = disks / 2;
  else if (level === 50) dataDisks = disks - groups;
  else dataDisks = disks - 2 * groups;

  const usable = dataDisks * size;
  const raw = disks * size;
  let tolerance;
  if (level === 0) tolerance = { min: 0, max: 0 };
  else if (level === 1) tolerance = { min: disks - 1, max: disks - 1 };
  else if (level === 5) tolerance = { min: 1, max: 1 };
  else if (level === 6) tolerance = { min: 2, max: 2 };
  else if (level === 10) tolerance = { min: 1, max: disks / 2 };
  else if (level === 50) tolerance = { min: 1, max: groups };
  else tolerance = { min: 2, max: 2 * groups };

  // 디스크 쓰기 성능 비용: 논리 쓰기 1회당 실제 디스크 쓰기 횟수
  const writePenalty = { 0: 1, 1: 2, 5: 4, 6: 6, 10: 2, 50: 4, 60: 6 }[level];
  return {
    usable, raw, parity: raw - usable, efficiency: (usable / raw) * 100,
    usableTiB: (usable * 1e12) / 2 ** 40, tolerance, writePenalty,
  };
};

/* ───────── chmod ───────── */
const WHO = ['owner', 'group', 'other'];

/** "755" → { owner: {r,w,x}, ... } (4자리면 특수 비트 포함) */
export const octalToPerms = (octal) => {
  if (!/^[0-7]{3,4}$/.test(octal)) return null;
  const s = octal.padStart(4, '0');
  const perms = { special: Number(s[0]) };
  WHO.forEach((w, i) => {
    const d = Number(s[i + 1]);
    perms[w] = { r: !!(d & 4), w: !!(d & 2), x: !!(d & 1) };
  });
  return perms;
};

export const permsToOctal = (p) => {
  const d = WHO.map((w) => (p[w].r ? 4 : 0) + (p[w].w ? 2 : 0) + (p[w].x ? 1 : 0)).join('');
  return p.special ? `${p.special}${d}` : d;
};

/** ls -l 처럼 "rwxr-xr-x" */
export const permsToSymbolic = (p) => {
  const part = (who, bit, ch) => {
    const { r, w, x } = p[who];
    let last = x ? 'x' : '-';
    if (p.special & bit) last = x ? ch : ch.toUpperCase();
    return `${r ? 'r' : '-'}${w ? 'w' : '-'}${last}`;
  };
  return part('owner', 4, 's') + part('group', 2, 's') + part('other', 1, 't');
};

/** "rwxr-xr--" → 권한 객체 (앞의 파일 종류 글자는 무시) */
export const symbolicToPerms = (text) => {
  const t = text.trim().replace(/^[-dlbcps]?(?=.{9}$)/, '');
  if (!/^[r-][w-][xsS-][r-][w-][xsS-][r-][w-][xtT-]$/.test(t)) return null;
  const perms = { special: 0 };
  WHO.forEach((w, i) => {
    const c = t.slice(i * 3, i * 3 + 3);
    perms[w] = { r: c[0] === 'r', w: c[1] === 'w', x: /[xst]/.test(c[2]) };
  });
  if (/[sS]/.test(t[2])) perms.special |= 4;
  if (/[sS]/.test(t[5])) perms.special |= 2;
  if (/[tT]/.test(t[8])) perms.special |= 1;
  return perms;
};

/* ───────── cron ───────── */
const FIELDS = [
  { name: 'minute', min: 0, max: 59 },
  { name: 'hour', min: 0, max: 23 },
  { name: 'dom', min: 1, max: 31 },
  { name: 'month', min: 1, max: 12, names: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'], offset: 1 },
  { name: 'dow', min: 0, max: 7, names: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'], offset: 0 },
];

const MACROS = {
  '@yearly': '0 0 1 1 *', '@annually': '0 0 1 1 *', '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0', '@daily': '0 0 * * *', '@midnight': '0 0 * * *', '@hourly': '0 * * * *',
};

const parseValue = (v, f) => {
  const up = v.toUpperCase();
  if (f.names) {
    const i = f.names.indexOf(up);
    if (i >= 0) return i + f.offset;
  }
  return /^\d+$/.test(v) ? Number(v) : NaN;
};

const parseField = (text, f) => {
  const set = new Set();
  for (const part of text.split(',')) {
    const m = part.match(/^(\*|[A-Za-z0-9]+(?:-[A-Za-z0-9]+)?)(?:\/(\d+))?$/);
    if (!m) throw new Error(f.name);
    const step = m[2] ? Number(m[2]) : 1;
    if (step < 1) throw new Error(f.name);
    let lo;
    let hi;
    if (m[1] === '*') {
      lo = f.min;
      hi = f.name === 'dow' ? 6 : f.max;
    } else if (m[1].includes('-')) {
      const [a, b] = m[1].split('-');
      lo = parseValue(a, f);
      hi = parseValue(b, f);
    } else {
      lo = parseValue(m[1], f);
      hi = m[2] ? (f.name === 'dow' ? 6 : f.max) : lo;
    }
    if (Number.isNaN(lo) || Number.isNaN(hi) || lo < f.min || hi > f.max || lo > hi) throw new Error(f.name);
    for (let i = lo; i <= hi; i += step) set.add(f.name === 'dow' ? i % 7 : i);
  }
  return set;
};

/** crontab 5필드 해석. 실패하면 { error: 필드이름 } */
export const parseCron = (expr) => {
  const text = MACROS[expr.trim().toLowerCase()] || expr.trim();
  const parts = text.split(/\s+/);
  if (parts.length !== 5) return { error: 'fields' };
  try {
    const sets = parts.map((p, i) => parseField(p, FIELDS[i]));
    return {
      minute: sets[0], hour: sets[1], dom: sets[2], month: sets[3], dow: sets[4],
      domStar: parts[2] === '*', dowStar: parts[4] === '*', raw: parts,
    };
  } catch (e) {
    return { error: e.message };
  }
};

/** 다음 실행 시각들 (crontab 규칙: 일·요일이 둘 다 지정되면 둘 중 하나만 맞아도 실행) */
export const nextRuns = (cron, count = 5, from = new Date()) => {
  const out = [];
  const d = new Date(from);
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() + 1);
  const dayOk = (x) => {
    const dom = cron.dom.has(x.getDate());
    const dow = cron.dow.has(x.getDay());
    if (cron.domStar && cron.dowStar) return true;
    if (cron.domStar) return dow;
    if (cron.dowStar) return dom;
    return dom || dow;
  };
  const limit = from.getTime() + 12 * 366 * 86400000; // 2월 29일 같은 드문 일정까지 탐색
  while (out.length < count && d.getTime() < limit) {
    if (!cron.month.has(d.getMonth() + 1)) {
      d.setMonth(d.getMonth() + 1, 1);
      d.setHours(0, 0, 0, 0);
    } else if (!dayOk(d)) {
      d.setDate(d.getDate() + 1);
      d.setHours(0, 0, 0, 0);
    } else if (!cron.hour.has(d.getHours())) {
      d.setHours(d.getHours() + 1, 0, 0, 0);
    } else if (!cron.minute.has(d.getMinutes())) {
      d.setMinutes(d.getMinutes() + 1, 0, 0);
    } else {
      out.push(new Date(d));
      d.setMinutes(d.getMinutes() + 1, 0, 0);
    }
  }
  return out;
};

/* ───────── nginx 설정 생성 ───────── */
export const buildNginx = ({
  domain, upstream, ssl, websocket, maxBody, gzip, hsts, spaRoot,
}) => {
  const name = domain.trim() || 'example.com';
  const target = upstream.trim() || 'http://127.0.0.1:8080';
  const body = maxBody > 0 ? `${maxBody}M` : null;
  const lines = [];
  if (websocket) {
    lines.push('map $http_upgrade $connection_upgrade {', '    default upgrade;', "    ''      close;", '}', '');
  }
  if (ssl) {
    lines.push('server {', '    listen 80;', '    listen [::]:80;', `    server_name ${name};`, '    return 301 https://$host$request_uri;', '}', '');
  }
  lines.push('server {');
  if (ssl) {
    lines.push('    listen 443 ssl http2;', '    listen [::]:443 ssl http2;');
  } else {
    lines.push('    listen 80;', '    listen [::]:80;');
  }
  lines.push(`    server_name ${name};`, '');
  if (ssl) {
    lines.push(
      `    ssl_certificate /etc/letsencrypt/live/${name}/fullchain.pem;`,
      `    ssl_certificate_key /etc/letsencrypt/live/${name}/privkey.pem;`,
      '    ssl_protocols TLSv1.2 TLSv1.3;',
      '    ssl_session_cache shared:SSL:10m;',
      '',
    );
    if (hsts) lines.push('    add_header Strict-Transport-Security "max-age=31536000" always;', '');
  }
  lines.push('    server_tokens off;');
  if (body) lines.push(`    client_max_body_size ${body};`);
  if (gzip) {
    lines.push('', '    gzip on;', '    gzip_types text/plain text/css application/json application/javascript image/svg+xml;', '    gzip_min_length 1024;');
  }
  lines.push('');
  const proxyBlock = (path) => {
    const b = [
      `    location ${path} {`,
      `        proxy_pass ${target};`,
      '        proxy_set_header Host $host;',
      '        proxy_set_header X-Real-IP $remote_addr;',
      '        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;',
      '        proxy_set_header X-Forwarded-Proto $scheme;',
    ];
    if (websocket) {
      b.push(
        '',
        '        proxy_http_version 1.1;',
        '        proxy_set_header Upgrade $http_upgrade;',
        '        proxy_set_header Connection $connection_upgrade;',
        '        proxy_read_timeout 3600s;',
      );
    }
    b.push('    }');
    return b;
  };
  if (spaRoot.trim()) {
    lines.push(`    root ${spaRoot.trim()};`, '    index index.html;', '', ...proxyBlock('/api/'), '');
    lines.push('    location / {', '        try_files $uri $uri/ /index.html;', '    }');
  } else {
    lines.push(...proxyBlock('/'));
  }
  lines.push('}');
  return `${lines.join('\n')}\n`;
};

/* ───────── 전송 시간 ───────── */
const SIZE_BYTES = { MB: 1e6, GB: 1e9, TB: 1e12, GiB: 2 ** 30, TiB: 2 ** 40 };
const SPEED_BPS = { Mbps: 1e6, Gbps: 1e9, 'MB/s': 8e6, 'GB/s': 8e9 };

/** overhead: 프로토콜 오버헤드 비율(%) */
export const transferSeconds = ({ size, sizeUnit, speed, speedUnit, overhead = 0 }) => {
  if (!(size > 0) || !(speed > 0)) return null;
  const bits = size * SIZE_BYTES[sizeUnit] * 8;
  const effective = speed * SPEED_BPS[speedUnit] * (1 - overhead / 100);
  return effective > 0 ? bits / effective : null;
};

export const formatDuration = (seconds) => {
  const s = Math.max(1, Math.ceil(seconds));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const parts = [];
  if (d) parts.push({ v: d, u: 'd' });
  if (h) parts.push({ v: h, u: 'h' });
  if (m) parts.push({ v: m, u: 'm' });
  if (!d && (s % 60 || !parts.length)) parts.push({ v: s % 60, u: 's' });
  return parts;
};
