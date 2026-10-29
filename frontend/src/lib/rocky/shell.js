// Rocky Linux 9.6 체험 셸 엔진 (순수 JS, 브라우저 안에서만 동작)
// exec(line) => { lines, clear?, exit?, reboot?, ask? }
//   lines: 출력 줄 배열. 각 줄은 string 또는 { t, c } (c: CSS 클래스) 또는 그 배열
//   ask: { prompt, mask } 가 있으면 다음 입력은 그 질문의 답으로 처리된다
import { initialFs, INITIAL_USERS, INITIAL_SERVICES, PACKAGES, KERNEL, HOSTNAME } from './fs.js';

const DEFAULT_TIME = 'Oct 28 09:00';
const BOOT_EPOCH = Date.UTC(2026, 9, 28, 0, 0, 1); // 09:00:01 KST

const clone = (o) => JSON.parse(JSON.stringify(o));
const pad = (s, n) => String(s).padEnd(n);
const lpad = (s, n) => String(s).padStart(n);

// 명령어 → 필요한 패키지 (미설치면 command not found)
const CMD_PKG = {
  tree: 'tree', ifconfig: 'net-tools', netstat: 'net-tools', route: 'net-tools',
  dig: 'bind-utils', nslookup: 'bind-utils', host: 'bind-utils', wget: 'wget', git: 'git',
  htop: 'htop', lsof: 'lsof', tcpdump: 'tcpdump', mysql: 'mariadb-server', docker: 'docker-ce',
};

// 패키지 설치 시 생기는 파일
const PKG_FILES = {
  httpd: { '/etc/httpd/conf/httpd.conf': 'ServerRoot "/etc/httpd"\nListen 80\nUser apache\nGroup apache\nDocumentRoot "/var/www/html"\nIncludeOptional conf.d/*.conf', '/etc/httpd/conf.d/README': '' },
  nginx: { '/etc/nginx/nginx.conf': 'user nginx;\nworker_processes auto;\nerror_log /var/log/nginx/error.log;\n\nevents {\n    worker_connections 1024;\n}\n\nhttp {\n    server {\n        listen       80;\n        server_name  _;\n        root         /usr/share/nginx/html;\n    }\n}', '/usr/share/nginx/html/index.html': '<h1>Welcome to nginx on Rocky Linux!</h1>' },
  'mariadb-server': { '/etc/my.cnf.d/mariadb-server.cnf': '[mysqld]\ndatadir=/var/lib/mysql\nsocket=/var/lib/mysql/mysql.sock\nlog-error=/var/log/mariadb/mariadb.log' },
  vsftpd: { '/etc/vsftpd/vsftpd.conf': 'anonymous_enable=NO\nlocal_enable=YES\nwrite_enable=YES\nlisten=NO\nlisten_ipv6=YES' },
  'nfs-utils': { '/etc/exports': '' },
  'epel-release': { '/etc/yum.repos.d/epel.repo': '[epel]\nname=Extra Packages for Enterprise Linux 9 - $basearch\nmetalink=https://mirrors.fedoraproject.org/metalink?repo=epel-9&arch=$basearch\nenabled=1\ngpgcheck=1' },
};

export const HELP = [
  ['파일/디렉터리', 'ls cd pwd cat head tail touch mkdir rmdir rm cp mv find stat file du tree* chmod chown ln wc sort uniq grep echo'],
  ['시스템 정보', 'uname hostname hostnamectl uptime date timedatectl whoami id groups w who free df lsblk lscpu nproc dmesg'],
  ['프로세스/서비스', 'ps top kill systemctl journalctl'],
  ['패키지', 'dnf yum rpm   (예: sudo dnf install -y httpd)'],
  ['네트워크', 'ip nmcli ss ping curl ifconfig* netstat* dig* nslookup*'],
  ['보안/계정', 'firewall-cmd getenforce setenforce sestatus useradd userdel usermod groupadd passwd su sudo'],
  ['셸', 'history alias export env which type man clear exit reboot tn-reset'],
  ['', '* 표시는 패키지 설치 후 사용 가능 (예: sudo dnf install -y tree)'],
];

const MAN = {
  ls: 'ls - 디렉터리 내용 표시  (-l 자세히, -a 숨김 포함, -h 사람이 읽기 쉬운 크기)',
  cd: 'cd - 작업 디렉터리 변경 (cd, cd ~, cd -, cd ..)',
  cat: 'cat - 파일 내용 출력', grep: 'grep - 패턴 검색 (-i 대소문자 무시, -v 반전, -n 줄번호, -c 개수, -r 재귀)',
  find: 'find - 파일 찾기 (find /etc -name "*.conf" -type f)',
  chmod: 'chmod - 권한 변경 (chmod 755 file, chmod +x script.sh)',
  systemctl: 'systemctl - 서비스 관리 (status|start|stop|restart|enable|disable|is-active|is-enabled|list-units)',
  dnf: 'dnf - 패키지 관리 (install|remove|list installed|search|info|repolist|update)',
  'firewall-cmd': 'firewall-cmd - 방화벽 (--state, --list-all, --add-service=, --add-port=, --remove-service=, --permanent, --reload)',
  ip: 'ip - 네트워크 (ip a, ip r, ip link)', ss: 'ss - 소켓 상태 (ss -tulnp)',
  useradd: 'useradd - 사용자 추가 (useradd -m user)', passwd: 'passwd - 비밀번호 변경',
  su: 'su - 사용자 전환 (su -, su - user)', sudo: 'sudo - root 권한으로 실행',
  journalctl: 'journalctl - 로그 조회 (journalctl -u sshd, journalctl -n 20)',
};

export function createRockyShell({ user = 'guest', saved = null } = {}) {
  const base = user.replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'guest';
  let S;
  const fresh = () => ({
    v: 1, base, fs: initialFs(base), users: INITIAL_USERS(base), services: clone(INITIAL_SERVICES),
    installed: Object.entries(PACKAGES).filter(([, p]) => p[3]).map(([n]) => n),
    fw: { services: ['cockpit', 'dhcpv6-client', 'ssh'], ports: [], pServices: ['cockpit', 'dhcpv6-client', 'ssh'], pPorts: [] },
    selinux: 'Enforcing', hostname: HOSTNAME, history: [], aliases: { ll: 'ls -l --color=auto', 'l.': 'ls -d .* --color=auto' },
    stack: [{ user: base, cwd: `/home/${base}` }], oldpwd: null, env: {}, last: 0, boots: 0, journal: [],
  });
  S = saved && saved.v === 1 && saved.base === base ? saved : fresh();
  S.stack = [{ user: base, cwd: `/home/${base}` }]; // 새 접속은 항상 일반 계정으로 로그인
  let pending = null; // 대화형 질문 콜백
  let piping = false; // 출력이 파이프/파일로 가는지 (ls 한 줄에 하나씩)

  const cur = () => S.stack[S.stack.length - 1];
  const isRoot = () => cur().user === 'root';
  const userInfo = (n) => S.users.find((u) => u.name === n);
  const homeOf = (n) => (userInfo(n) || {}).home || '/';

  syncPasswd();

  function syncPasswd() {
    const etc = S.fs.children.etc.children;
    etc.passwd.content = S.users.map((u) => `${u.name}:x:${u.uid}:${u.gid}::${u.home}:${u.shell}`).join('\n');
    const groups = {};
    S.users.forEach((u) => u.groups.forEach((g) => { (groups[g] ||= []); if (g !== u.name) groups[g].push(u.name); }));
    if (!groups.wheel) groups.wheel = [];
    etc.group.content = Object.entries(groups).map(([g, m], i) => `${g}:x:${g === 'root' ? 0 : g === 'wheel' ? 10 : (userInfo(g)?.gid ?? 1000 + i)}:${m.join(',')}`).join('\n');
  }

  // ---------- 경로/파일시스템 ----------
  function resolve(p) {
    if (!p) p = '.';
    if (p === '~' || p.startsWith('~/')) p = homeOf(cur().user) + p.slice(1);
    const parts = p.startsWith('/') ? [] : cur().cwd.split('/').filter(Boolean);
    for (const seg of p.split('/')) {
      if (!seg || seg === '.') continue;
      if (seg === '..') parts.pop(); else parts.push(seg);
    }
    return parts;
  }
  const toPath = (parts) => '/' + parts.join('/');
  function getNode(parts) {
    let n = S.fs;
    for (const seg of parts) {
      if (n.type !== 'dir' || !n.children[seg]) return null;
      n = n.children[seg];
    }
    return n;
  }
  function permBits(node) {
    const m = node.mode.padStart(3, '0').slice(-3);
    if (isRoot()) return 7;
    if (node.owner === cur().user) return +m[0];
    return +m[2];
  }
  const canRead = (node) => isRoot() || (permBits(node) & 4) !== 0;
  function canWriteDir(parts) {
    if (isRoot()) return true;
    const p = toPath(parts);
    const h = homeOf(cur().user);
    return p === h || p.startsWith(h + '/') || p === '/tmp' || p.startsWith('/tmp/') || p.startsWith('/var/tmp');
  }
  function canTraverse(parts) {
    let n = S.fs;
    for (const seg of parts) {
      if (n.type !== 'dir') return false;
      if (!isRoot() && !(permBits(n) & 1)) return false;
      n = n.children[seg];
      if (!n) return true;
    }
    return true;
  }
  function now() {
    const d = new Date();
    return d.toLocaleString('en-US', { month: 'short', timeZone: 'Asia/Seoul' }) + ' ' +
      lpad(d.toLocaleString('en-US', { day: 'numeric', timeZone: 'Asia/Seoul' }), 2) + ' ' +
      d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' });
  }
  function writeFile(parts, content, append = false) {
    const name = parts[parts.length - 1];
    const dirParts = parts.slice(0, -1);
    const dir = getNode(dirParts);
    if (!dir || dir.type !== 'dir') return `${toPath(parts)}: No such file or directory`;
    const ex = dir.children[name];
    if (ex && ex.type === 'dir') return `${toPath(parts)}: Is a directory`;
    if (ex ? !(isRoot() || (permBits(ex) & 2) || (ex.owner === cur().user)) : !canWriteDir(dirParts)) return `${toPath(parts)}: Permission denied`;
    if (!ex && !canWriteDir(dirParts)) return `${toPath(parts)}: Permission denied`;
    if (ex) { ex.content = append ? (ex.content ? ex.content + '\n' : '') + content : content; ex.mtime = now(); }
    else dir.children[name] = { type: 'file', content, mode: '644', owner: cur().user, mtime: now() };
    return null;
  }
  function mkdirp(parts) {
    let n = S.fs;
    for (const seg of parts) {
      if (!n.children[seg]) n.children[seg] = { type: 'dir', children: {}, mode: '755', owner: 'root', mtime: now() };
      n = n.children[seg];
    }
    return n;
  }
  function installFiles(pkg) {
    Object.entries(PKG_FILES[pkg] || {}).forEach(([p, c]) => {
      const parts = p.split('/').filter(Boolean);
      const dir = mkdirp(parts.slice(0, -1));
      dir.children[parts[parts.length - 1]] = { type: 'file', content: c, mode: '644', owner: 'root', mtime: now() };
    });
  }
  function glob(word) {
    if (!/[*?]/.test(word)) return [word];
    const abs = word.startsWith('/');
    const parts = word.split('/');
    const pat = parts.pop();
    const dirWord = parts.join('/') || (abs ? '/' : '.');
    const dir = getNode(resolve(dirWord));
    if (!dir || dir.type !== 'dir') return [word];
    const re = new RegExp('^' + pat.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
    const hits = Object.keys(dir.children).filter((n) => re.test(n) && (pat.startsWith('.') || !n.startsWith('.'))).sort();
    if (!hits.length) return [word];
    const prefix = parts.length ? parts.join('/') + '/' : (abs ? '/' : '');
    return hits.map((h) => prefix + h);
  }

  // ---------- 파서 ----------
  function tokenize(line) {
    const toks = [];
    let cur = '', q = null, has = false, globOk = true;
    const push = () => { if (has) toks.push({ t: 'w', v: cur, g: globOk }); cur = ''; has = false; globOk = true; };
    const expand = (i) => {
      const m = line.slice(i).match(/^\$(\?|\{(\w+)\}|(\w+))/);
      if (!m) return [null, 0];
      const name = m[1] === '?' ? '?' : (m[2] || m[3]);
      return [envGet(name), m[0].length];
    };
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q === "'") { if (c === "'") q = null; else cur += c; continue; }
      if (q === '"') {
        if (c === '"') q = null;
        else if (c === '\\' && i + 1 < line.length) cur += line[++i];
        else if (c === '$') { const [v, n] = expand(i); if (n) { cur += v; i += n - 1; } else cur += c; }
        else cur += c;
        continue;
      }
      if (c === "'" || c === '"') { q = c; has = true; globOk = false; continue; }
      if (c === '\\' && i + 1 < line.length) { cur += line[++i]; has = true; continue; }
      if (c === ' ' || c === '\t') { push(); continue; }
      if (c === '$') { const [v, n] = expand(i); if (n) { cur += v; has = true; i += n - 1; continue; } }
      if (c === '#' && !has) break;
      const two = line.slice(i, i + 2);
      if (['&&', '||', '>>', '2>'].includes(two) && !(two === '2>' && has)) { push(); toks.push({ t: 'o', v: two }); i++; continue; }
      if ('|;>'.includes(c)) { push(); toks.push({ t: 'o', v: c }); continue; }
      cur += c; has = true;
    }
    if (q) return { error: 'syntax error: unexpected end of file (따옴표가 닫히지 않았어요)' };
    push();
    return { toks };
  }
  function envGet(n) {
    const u = cur();
    const map = { HOME: homeOf(u.user), USER: u.user, LOGNAME: u.user, PWD: u.cwd, SHELL: '/bin/bash', HOSTNAME: S.hostname, '?': String(S.last), PATH: '/usr/local/bin:/usr/bin:/usr/local/sbin:/usr/sbin', LANG: 'ko_KR.UTF-8', OLDPWD: S.oldpwd || '' };
    return S.env[n] ?? map[n] ?? '';
  }

  // ---------- 출력 헬퍼 ----------
  const R = (out = [], code = 0, extra = {}) => ({ out, err: [], code, ...extra });
  const E = (err, code = 1, out = []) => ({ out, err: Array.isArray(err) ? err : [err], code });
  const flagsOf = (args) => {
    const fl = new Set(); const rest = [];
    args.forEach((a) => { if (/^-[a-zA-Z]+$/.test(a)) a.slice(1).split('').forEach((x) => fl.add(x)); else rest.push(a); });
    return [fl, rest];
  };
  const modeStr = (n) => (n.type === 'dir' ? 'd' : n.type === 'link' ? 'l' : '-') +
    n.mode.padStart(3, '0').slice(-3).split('').map((x) => { const b = +x; return (b & 4 ? 'r' : '-') + (b & 2 ? 'w' : '-') + (b & 1 ? 'x' : '-'); }).join('') + '.';
  const sizeOf = (n) => (n.type === 'dir' ? (Object.keys(n.children).length * 24 + 6) : new TextEncoder().encode(n.content || '').length);
  const human = (b) => (b < 1024 ? String(b) : b < 1048576 ? (b / 1024).toFixed(1) + 'K' : (b / 1048576).toFixed(1) + 'M');
  const nameCls = (n, name) => (n.type === 'dir' ? 'dir' : /x/.test(modeStr(n).slice(1, 10)) ? 'exec' : /\.(tar|gz|zip|rpm)$/.test(name) ? 'arch' : null);
  const svcName = (s) => (s || '').replace(/\.service$/, '');
  const installed = (p) => S.installed.includes(p);
  const uptimeStr = () => {
    const m = Math.max(1, Math.floor((Date.now() - (S.bootAt || BOOT_EPOCH)) / 60000) % (60 * 24 * 3));
    return m >= 60 ? `${Math.floor(m / 60)}:${lpad(m % 60, 2).replace(' ', '0')}` : `${m} min`;
  };
  const sinceStr = (s) => {
    if (!s.since) return `Wed 2026-10-28 09:00:01 KST; ${uptimeStr()} ago`;
    const sec = Math.max(1, Math.floor((Date.now() - s.since) / 1000));
    const t = new Date(s.since + 9 * 3600 * 1000).toISOString();
    return `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(s.since + 9 * 3600 * 1000).getUTCDay()]} ${t.slice(0, 10)} ${t.slice(11, 19)} KST; ${sec < 60 ? sec + 's' : Math.floor(sec / 60) + 'min ' + (sec % 60) + 's'} ago`;
  };
  const kst = () => new Date(Date.now() + 9 * 3600 * 1000);
  const dateStr = () => {
    const d = kst(); const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const t = d.toISOString().slice(11, 19);
    return `${days[d.getUTCDay()]} ${mon[d.getUTCMonth()]} ${lpad(d.getUTCDate(), 2)} ${t} KST ${d.getUTCFullYear()}`;
  };
  const log = (unit, msg) => { S.journal.push(`${now().replace(/^(\w+) +/, '$1 ')} ${S.hostname} ${unit}: ${msg}`); if (S.journal.length > 200) S.journal.shift(); };
  const needRoot = (name) => E(name === 'dnf' || name === 'yum'
    ? 'Error: This command has to be run with superuser privileges (under the root user on most systems).'
    : `${name}: Permission denied.`);

  // ---------- 명령어 ----------
  const C = {};

  C.help = () => R([
    { t: 'Rocky Linux 9.6 체험 셸 - 지원 명령어', c: 'ok' },
    ...HELP.map(([k, v]) => (k ? `  ${pad(k, 14)} ${v}` : `  ${v}`)),
    '', '  자세히: man <명령어>   /   README: cat ~/README.txt',
  ]);
  C.man = (a) => (a[0] ? (MAN[a[0]] || C[a[0]] ? R([MAN[a[0]] || `${a[0]} - 시뮬레이터에서 지원하는 명령어입니다. 옵션은 실제와 일부만 같아요.`]) : E(`No manual entry for ${a[0]}`, 16)) : E('What manual page do you want?\nFor example, try \'man man\'.'));
  C.clear = () => R([], 0, { clear: true });
  C.pwd = () => R([cur().cwd]);
  C.whoami = () => R([cur().user]);
  C.hostname = (a) => {
    if (a[0] === '-I') return R(['192.168.10.50 ']);
    if (a[0] === '-f' || !a[0]) return R([S.hostname]);
    if (!isRoot()) return E('hostname: you must be root to change the host name');
    S.hostname = a[0]; S.fs.children.etc.children.hostname.content = a[0]; return R();
  };
  C.hostnamectl = (a) => {
    if (a[0] === 'set-hostname' && a[1]) {
      if (!isRoot()) return E('Could not set static hostname: Access denied');
      S.hostname = a[1]; S.fs.children.etc.children.hostname.content = a[1]; return R();
    }
    return R([` Static hostname: ${S.hostname}`, '       Icon name: computer-vm', '         Chassis: vm 🖴', '      Machine ID: 9a3f0c1e2b7d4e8f9a1b2c3d4e5f6a7b',
      '         Boot ID: 1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f', '  Virtualization: kvm', 'Operating System: Rocky Linux 9.6 (Blue Onyx)',
      '     CPE OS Name: cpe:/o:rocky:rocky:9::baseos', `          Kernel: Linux ${KERNEL}`, '    Architecture: x86-64', ' Hardware Vendor: QEMU', '  Hardware Model: Standard PC _Q35 + ICH9, 2009_', 'Firmware Version: 4.2023.08-4']);
  };
  C.uname = (a) => {
    const [fl] = flagsOf(a);
    if (fl.has('a')) return R([`Linux ${S.hostname} ${KERNEL} #1 SMP PREEMPT_DYNAMIC Wed May 21 12:00:00 UTC 2025 x86_64 x86_64 x86_64 GNU/Linux`]);
    const o = [];
    if (fl.has('s') || !fl.size) o.push('Linux');
    if (fl.has('n')) o.push(S.hostname);
    if (fl.has('r')) o.push(KERNEL);
    if (fl.has('m') || fl.has('p') || fl.has('i')) o.push('x86_64');
    if (fl.has('o')) o.push('GNU/Linux');
    return R([o.join(' ')]);
  };
  C.date = () => R([dateStr()]);
  C.uptime = () => R([` ${kst().toISOString().slice(11, 19)} up ${uptimeStr()},  1 user,  load average: 0.00, 0.01, 0.05`]);
  C.w = () => R([...C.uptime().out, 'USER     TTY        LOGIN@   IDLE   JCPU   PCPU WHAT', `${pad(S.base, 8)} pts/0      09:00    0.00s  0.03s  0.00s w`]);
  C.who = () => R([`${pad(S.base, 8)} pts/0        2026-10-28 09:00 (192.168.10.2)`]);
  C.id = (a) => {
    const u = userInfo(a[0] || cur().user);
    if (!u) return E(`id: '${a[0]}': no such user`);
    const gs = u.groups.map((g) => `${g === 'wheel' ? 10 : g === u.name ? u.gid : userInfo(g)?.gid ?? 0}(${g})`).join(',');
    return R([`uid=${u.uid}(${u.name}) gid=${u.gid}(${u.groups[0]}) groups=${gs}${!a[0] ? ' context=unconfined_u:unconfined_r:unconfined_t:s0-s0:c0.c1023' : ''}`]);
  };
  C.groups = (a) => { const u = userInfo(a[0] || cur().user); return u ? R([(a[0] ? `${u.name} : ` : '') + u.groups.join(' ')]) : E(`groups: '${a[0]}': no such user`); };
  C.echo = (a) => {
    let nl = true, esc = false;
    while (a[0] && /^-[neE]+$/.test(a[0])) { if (a[0].includes('n')) nl = false; if (a[0].includes('e')) esc = true; a = a.slice(1); }
    let s = a.join(' ');
    if (esc) s = s.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
    return R(s.split('\n'), 0, { noNl: !nl });
  };

  C.cd = (a) => {
    let t = a[0];
    if (!t || t === '~') t = homeOf(cur().user);
    if (t === '-') { if (!S.oldpwd) return E('-bash: cd: OLDPWD not set'); t = S.oldpwd; }
    const parts = resolve(t);
    const n = getNode(parts);
    if (!n) return E(`-bash: cd: ${a[0]}: No such file or directory`);
    if (n.type !== 'dir') return E(`-bash: cd: ${a[0]}: Not a directory`);
    if (!canTraverse(parts) || !(isRoot() || permBits(n) & 1)) return E(`-bash: cd: ${a[0]}: Permission denied`);
    S.oldpwd = cur().cwd; cur().cwd = toPath(parts);
    return R(a[0] === '-' ? [cur().cwd] : []);
  };

  C.ls = (a) => {
    const [fl, rest] = flagsOf(a.filter((x) => !x.startsWith('--')));
    const targets = rest.length ? rest : ['.'];
    const out = []; const err = [];
    const long = fl.has('l'), all = fl.has('a') || fl.has('A'), h = fl.has('h'), dirOnly = fl.has('d');
    const fmt = (n, name) => {
      if (!long) return { t: name, c: nameCls(n, name) };
      const sz = sizeOf(n);
      return [{ t: `${modeStr(n)} ${n.type === 'dir' ? 2 : 1} ${pad(n.owner, 5)} ${pad(n.owner === 'root' ? 'root' : n.owner, 5)} ${lpad(h ? human(sz) : sz, 5)} ${n.mtime || DEFAULT_TIME} ` }, { t: name, c: nameCls(n, name) }];
    };
    const files = []; const dirs = [];
    targets.forEach((t) => {
      const parts = resolve(t); const n = getNode(parts);
      if (!n) err.push(`ls: cannot access '${t}': No such file or directory`);
      else if (n.type === 'dir' && !dirOnly) dirs.push([t, n, parts]);
      else files.push([t, n]);
    });
    const row = (items) => {
      if (long) items.forEach((i) => out.push(fmt(i[1], i[0])));
      else if (items.length && piping) items.forEach((i) => out.push(i[0]));
      else if (items.length) { const segs = []; items.forEach((i, k) => { if (k) segs.push({ t: '  ' }); segs.push(fmt(i[1], i[0])); }); out.push(segs); }
    };
    row(files);
    dirs.forEach(([t, n, parts], idx) => {
      if (!canRead(n) || !canTraverse(parts)) { err.push(`ls: cannot open directory '${t}': Permission denied`); return; }
      if (files.length || dirs.length > 1) { if (idx || files.length) out.push(''); out.push(`${t}:`); }
      let names = Object.keys(n.children).sort();
      if (!all) names = names.filter((x) => !x.startsWith('.'));
      if (fl.has('t')) names.reverse();
      if (long) out.push(`total ${names.length * 4}`);
      const items = names.map((x) => [x, n.children[x]]);
      if (fl.has('a')) items.unshift(['.', n], ['..', n]);
      row(items);
    });
    return { out, err, code: err.length ? 2 : 0 };
  };

  C.cat = (a, stdin) => {
    const [fl, files] = flagsOf(a);
    if (!files.length) return R(stdin || []);
    const out = []; const err = [];
    files.forEach((p) => {
      const n = getNode(resolve(p));
      if (!n) err.push(`cat: ${p}: No such file or directory`);
      else if (n.type === 'dir') err.push(`cat: ${p}: Is a directory`);
      else if (!canRead(n) || !canTraverse(resolve(p))) err.push(`cat: ${p}: Permission denied`);
      else if (n.content !== '') out.push(...n.content.split('\n'));
    });
    const res = fl.has('n') ? out.map((l, i) => `${lpad(i + 1, 6)}\t${l}`) : out;
    return { out: res, err, code: err.length ? 1 : 0 };
  };
  const readInput = (files, stdin, cmd) => {
    if (!files.length) return { lines: stdin || [] };
    const n = getNode(resolve(files[0]));
    if (!n) return { e: `${cmd}: cannot open '${files[0]}' for reading: No such file or directory` };
    if (n.type === 'dir') return { e: `${cmd}: error reading '${files[0]}': Is a directory` };
    if (!canRead(n)) return { e: `${cmd}: cannot open '${files[0]}' for reading: Permission denied` };
    return { lines: n.content === '' ? [] : n.content.split('\n') };
  };
  const nArg = (a, def) => {
    let n = def; const rest = [];
    for (let i = 0; i < a.length; i++) {
      if (a[i] === '-n') n = +a[++i];
      else if (/^-n\d+$/.test(a[i])) n = +a[i].slice(2);
      else if (/^-\d+$/.test(a[i])) n = +a[i].slice(1);
      else if (a[i] !== '-f') rest.push(a[i]);
    }
    return [n, rest];
  };
  C.head = (a, stdin) => { const [n, f] = nArg(a, 10); const r = readInput(f, stdin, 'head'); return r.e ? E(r.e) : R(r.lines.slice(0, n)); };
  C.tail = (a, stdin) => { const [n, f] = nArg(a, 10); const r = readInput(f, stdin, 'tail'); return r.e ? E(r.e) : R(n ? r.lines.slice(-n) : []); };
  C.less = C.more = (a, stdin) => C.cat(a, stdin);
  C.wc = (a, stdin) => {
    const [fl, f] = flagsOf(a); const r = readInput(f, stdin, 'wc'); if (r.e) return E(r.e);
    const L = r.lines.length, W = r.lines.join(' ').split(/\s+/).filter(Boolean).length, B = r.lines.join('\n').length + (L ? 1 : 0);
    const name = f[0] ? ' ' + f[0] : '';
    if (fl.has('l')) return R([`${L}${name}`]);
    if (fl.has('w')) return R([`${W}${name}`]);
    if (fl.has('c')) return R([`${B}${name}`]);
    return R([`${lpad(L, 2)} ${lpad(W, 2)} ${lpad(B, 3)}${name}`]);
  };
  C.sort = (a, stdin) => { const [fl, f] = flagsOf(a); const r = readInput(f, stdin, 'sort'); if (r.e) return E(r.e); let l = [...r.lines].sort(fl.has('n') ? (x, y) => parseFloat(x) - parseFloat(y) : undefined); if (fl.has('r')) l.reverse(); if (fl.has('u')) l = [...new Set(l)]; return R(l); };
  C.uniq = (a, stdin) => { const [fl, f] = flagsOf(a); const r = readInput(f, stdin, 'uniq'); if (r.e) return E(r.e); const o = []; r.lines.forEach((x) => { if (o.length && o[o.length - 1][0] === x) o[o.length - 1][1]++; else o.push([x, 1]); }); return R(o.map(([x, c]) => (fl.has('c') ? `${lpad(c, 7)} ${x}` : x))); };
  C.grep = (a, stdin) => {
    const [fl, rest] = flagsOf(a.map((x) => (x === '--color=auto' ? '' : x)).filter(Boolean));
    if (!rest.length) return E('Usage: grep [OPTION]... PATTERNS [FILE]...', 2);
    const [pat, ...files] = rest;
    let re; try { re = new RegExp(pat, fl.has('i') ? 'i' : ''); } catch { return E(`grep: Invalid regular expression`, 2); }
    const match = (l) => re.test(l) !== fl.has('v');
    const out = []; const err = []; let count = 0;
    const scan = (lines, label) => {
      let c = 0;
      lines.forEach((l, i) => { if (match(l)) { c++; if (!fl.has('c') && !fl.has('l')) out.push(hl(`${label ? label + ':' : ''}${fl.has('n') ? i + 1 + ':' : ''}`, l)); } });
      if (fl.has('c')) out.push(`${label ? label + ':' : ''}${c}`);
      if (fl.has('l') && c) out.push(label);
      count += c;
    };
    const hl = (prefix, l) => {
      if (fl.has('v')) return prefix + l;
      const m = l.match(re); if (!m) return prefix + l;
      return [{ t: prefix, c: 'grep-pre' }, { t: l.slice(0, m.index) }, { t: m[0], c: 'grep-hit' }, { t: l.slice(m.index + m[0].length) }];
    };
    if (!files.length) scan(stdin || [], '');
    const walk = (parts, label) => {
      const n = getNode(parts);
      if (!n) { err.push(`grep: ${label}: No such file or directory`); return; }
      if (n.type === 'dir') {
        if (!fl.has('r') && !fl.has('R')) { err.push(`grep: ${label}: Is a directory`); return; }
        if (!canRead(n)) { err.push(`grep: ${label}: Permission denied`); return; }
        Object.keys(n.children).sort().forEach((c) => walk([...parts, c], `${label.replace(/\/$/, '')}/${c}`));
        return;
      }
      if (!canRead(n)) { err.push(`grep: ${label}: Permission denied`); return; }
      scan(n.content ? n.content.split('\n') : [], files.length > 1 || fl.has('r') || fl.has('R') ? label : '');
    };
    files.forEach((f) => walk(resolve(f), f));
    return { out, err, code: count ? 0 : err.length ? 2 : 1 };
  };

  C.touch = (a) => {
    const err = [];
    a.filter((x) => !x.startsWith('-')).forEach((p) => {
      const parts = resolve(p); const n = getNode(parts);
      if (n) { if (canWriteDir(parts.slice(0, -1)) || n.owner === cur().user || isRoot()) n.mtime = now(); else err.push(`touch: cannot touch '${p}': Permission denied`); return; }
      const e = writeFile(parts, ''); if (e) err.push(`touch: cannot touch '${p}': ${e.split(': ').pop()}`);
    });
    return { out: [], err, code: err.length ? 1 : 0 };
  };
  C.mkdir = (a) => {
    const [fl, rest] = flagsOf(a); const err = [];
    if (!rest.length) return E('mkdir: missing operand');
    rest.forEach((p) => {
      const parts = resolve(p);
      if (getNode(parts)) { if (!fl.has('p')) err.push(`mkdir: cannot create directory '${p}': File exists`); return; }
      let n = S.fs;
      for (let i = 0; i < parts.length; i++) {
        const seg = parts[i];
        if (!n.children[seg]) {
          if (i < parts.length - 1 && !fl.has('p')) { err.push(`mkdir: cannot create directory '${p}': No such file or directory`); return; }
          if (!canWriteDir(parts.slice(0, i))) { err.push(`mkdir: cannot create directory '${p}': Permission denied`); return; }
          n.children[seg] = { type: 'dir', children: {}, mode: '755', owner: cur().user, mtime: now() };
        }
        n = n.children[seg];
        if (n.type !== 'dir') { err.push(`mkdir: cannot create directory '${p}': Not a directory`); return; }
      }
    });
    return { out: [], err, code: err.length ? 1 : 0 };
  };
  C.rmdir = (a) => {
    const err = [];
    a.forEach((p) => {
      const parts = resolve(p); const n = getNode(parts);
      if (!n) err.push(`rmdir: failed to remove '${p}': No such file or directory`);
      else if (n.type !== 'dir') err.push(`rmdir: failed to remove '${p}': Not a directory`);
      else if (Object.keys(n.children).length) err.push(`rmdir: failed to remove '${p}': Directory not empty`);
      else if (!canWriteDir(parts.slice(0, -1))) err.push(`rmdir: failed to remove '${p}': Permission denied`);
      else delete getNode(parts.slice(0, -1)).children[parts[parts.length - 1]];
    });
    return { out: [], err, code: err.length ? 1 : 0 };
  };
  C.rm = (a) => {
    const [fl, rest] = flagsOf(a); const err = [];
    if (!rest.length) return E('rm: missing operand');
    const rec = fl.has('r') || fl.has('R');
    rest.forEach((p) => {
      const parts = resolve(p); const n = getNode(parts);
      if (!parts.length) { err.push(`rm: it is dangerous to operate recursively on '/'\nrm: use --no-preserve-root to override this failsafe`); return; }
      if (!n) { if (!fl.has('f')) err.push(`rm: cannot remove '${p}': No such file or directory`); return; }
      if (n.type === 'dir' && !rec) { err.push(`rm: cannot remove '${p}': Is a directory`); return; }
      if (!canWriteDir(parts.slice(0, -1))) { err.push(`rm: cannot remove '${p}': Permission denied`); return; }
      if (['bin', 'boot', 'dev', 'etc', 'lib', 'lib64', 'proc', 'sbin', 'usr', 'var'].includes(parts[0]) && parts.length === 1) { err.push(`rm: cannot remove '${p}': Device or resource busy (체험판 보호)`); return; }
      delete getNode(parts.slice(0, -1)).children[parts[parts.length - 1]];
    });
    return { out: [], err, code: err.length ? 1 : 0 };
  };
  const copyTo = (a, move) => {
    const [fl, rest] = flagsOf(a); const cmd = move ? 'mv' : 'cp';
    if (rest.length < 2) return E(`${cmd}: missing destination file operand after '${rest[0] || ''}'`);
    const dest = rest.pop(); const dParts = resolve(dest); const dNode = getNode(dParts); const err = [];
    if (rest.length > 1 && (!dNode || dNode.type !== 'dir')) return E(`${cmd}: target '${dest}' is not a directory`);
    rest.forEach((src) => {
      const sParts = resolve(src); const sNode = getNode(sParts);
      if (!sNode) { err.push(`${cmd}: cannot stat '${src}': No such file or directory`); return; }
      if (!canRead(sNode)) { err.push(`${cmd}: cannot open '${src}' for reading: Permission denied`); return; }
      if (sNode.type === 'dir' && !move && !fl.has('r') && !fl.has('R') && !fl.has('a')) { err.push(`cp: -r not specified; omitting directory '${src}'`); return; }
      const target = dNode && dNode.type === 'dir' ? [...dParts, sParts[sParts.length - 1]] : dParts;
      if (toPath(target).startsWith(toPath(sParts) + '/')) { err.push(`${cmd}: cannot copy a directory, '${src}', into itself`); return; }
      if (!canWriteDir(target.slice(0, -1)) || (move && !canWriteDir(sParts.slice(0, -1)))) { err.push(`${cmd}: cannot create regular file '${dest}': Permission denied`); return; }
      const parent = getNode(target.slice(0, -1));
      if (!parent || parent.type !== 'dir') { err.push(`${cmd}: cannot create regular file '${dest}': No such file or directory`); return; }
      const copy = clone(sNode); if (!move) { copy.owner = cur().user; copy.mtime = now(); }
      parent.children[target[target.length - 1]] = copy;
      if (move) delete getNode(sParts.slice(0, -1)).children[sParts[sParts.length - 1]];
    });
    return { out: [], err, code: err.length ? 1 : 0 };
  };
  C.cp = (a) => copyTo(a, false);
  C.mv = (a) => copyTo(a, true);
  C.ln = (a) => { const [, rest] = flagsOf(a); if (rest.length < 2) return E('ln: missing file operand'); const s = getNode(resolve(rest[0])); if (!s) return E(`ln: failed to access '${rest[0]}': No such file or directory`); const e = writeFile(resolve(rest[1]), s.content || ''); return e ? E(`ln: failed to create symbolic link: ${e}`) : R(); };
  C.chmod = (a) => {
    const [, rest] = flagsOf(a.filter((x) => !/^[+-][rwx]+$/.test(x) || false));
    const modeArg = a.find((x) => /^[0-7]{3,4}$/.test(x) || /^[ugoa]*[+-=][rwx]+$/.test(x));
    const files = a.filter((x) => x !== modeArg && !x.startsWith('-'));
    if (!modeArg || !files.length) return E(`chmod: missing operand`);
    void rest; const err = [];
    files.forEach((p) => {
      const n = getNode(resolve(p));
      if (!n) { err.push(`chmod: cannot access '${p}': No such file or directory`); return; }
      if (!isRoot() && n.owner !== cur().user) { err.push(`chmod: changing permissions of '${p}': Operation not permitted`); return; }
      if (/^[0-7]+$/.test(modeArg)) { n.mode = modeArg.slice(-3); return; }
      const m = modeArg.match(/^([ugoa]*)([+-=])([rwx]+)$/);
      const who = m[1] || 'a'; const bits = (m[3].includes('r') ? 4 : 0) | (m[3].includes('w') ? 2 : 0) | (m[3].includes('x') ? 1 : 0);
      const ds = n.mode.padStart(3, '0').slice(-3).split('').map(Number);
      [['u', 0], ['g', 1], ['o', 2]].forEach(([w, i]) => {
        if (who.includes(w) || who.includes('a')) ds[i] = m[2] === '+' ? ds[i] | bits : m[2] === '-' ? ds[i] & ~bits : bits;
      });
      n.mode = ds.join('');
    });
    return { out: [], err, code: err.length ? 1 : 0 };
  };
  C.chown = (a) => {
    const [, rest] = flagsOf(a); if (rest.length < 2) return E('chown: missing operand');
    if (!isRoot()) return E(`chown: changing ownership of '${rest[1]}': Operation not permitted`);
    const owner = rest[0].split(/[:.]/)[0];
    if (owner && !userInfo(owner)) return E(`chown: invalid user: '${rest[0]}'`);
    const err = [];
    rest.slice(1).forEach((p) => { const n = getNode(resolve(p)); if (!n) err.push(`chown: cannot access '${p}': No such file or directory`); else if (owner) n.owner = owner; });
    return { out: [], err, code: err.length ? 1 : 0 };
  };
  C.stat = (a) => {
    const p = a[0]; if (!p) return E('stat: missing operand');
    const n = getNode(resolve(p)); if (!n) return E(`stat: cannot statx '${p}': No such file or directory`);
    const u = userInfo(n.owner) || { uid: 0 };
    return R([`  File: ${p}`, `  Size: ${pad(sizeOf(n), 15)} Blocks: 8          IO Block: 4096   ${n.type === 'dir' ? 'directory' : 'regular file'}`,
      `Device: fd00h/64768d    Inode: ${100000 + p.length * 37}      Links: 1`, `Access: (0${n.mode.slice(-3)}/${modeStr(n).slice(0, 10)})  Uid: (${lpad(u.uid, 5)}/${lpad(n.owner, 8)})   Gid: (${lpad(u.uid, 5)}/${lpad(n.owner, 8)})`,
      `Context: ${n.owner === 'root' ? 'system_u:object_r:etc_t:s0' : 'unconfined_u:object_r:user_home_t:s0'}`, `Modify: 2026-10-28 09:00:00.000000000 +0900`]);
  };
  C.file = (a) => R(a.map((p) => { const n = getNode(resolve(p)); if (!n) return `${p}: cannot open \`${p}' (No such file or directory)`; if (n.type === 'dir') return `${p}: directory`; if (!n.content) return `${p}: empty`; if (n.content.startsWith('#!')) return `${p}: Bourne-Again shell script, ASCII text executable`; return `${p}: ${/[^\t\n\r -~]/.test(n.content) ? 'Unicode text, UTF-8 text' : 'ASCII text'}`; }));
  C.du = (a) => {
    const [fl, rest] = flagsOf(a); const t = rest[0] || '.';
    const n = getNode(resolve(t)); if (!n) return E(`du: cannot access '${t}': No such file or directory`);
    const total = (x) => (x.type === 'dir' ? Object.values(x.children).reduce((s, c) => s + total(c), 4) : Math.max(4, Math.ceil(sizeOf(x) / 1024)));
    const k = total(n);
    return R([`${fl.has('h') ? (k >= 1024 ? (k / 1024).toFixed(1) + 'M' : k + 'K') : k}\t${t}`]);
  };
  C.find = (a) => {
    let start = '.'; let i = 0;
    if (a[0] && !a[0].startsWith('-')) { start = a[0]; i = 1; }
    let name = null, type = null, iname = false;
    for (; i < a.length; i++) {
      if (a[i] === '-name' || a[i] === '-iname') { iname = a[i] === '-iname'; name = a[++i]; }
      else if (a[i] === '-type') type = a[++i];
    }
    const re = name ? new RegExp('^' + name.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', iname ? 'i' : '') : null;
    const out = []; const err = [];
    const walk = (parts, label) => {
      const n = getNode(parts); if (!n) { err.push(`find: '${label}': No such file or directory`); return; }
      const base = parts[parts.length - 1] || '/';
      if ((!re || re.test(base)) && (!type || (type === 'd' ? n.type === 'dir' : n.type !== 'dir'))) out.push(label);
      if (n.type === 'dir') {
        if (!canRead(n)) { err.push(`find: '${label}': Permission denied`); return; }
        Object.keys(n.children).sort().forEach((c) => walk([...parts, c], (label === '/' ? '' : label) + '/' + c));
      }
    };
    walk(resolve(start), start.replace(/\/$/, '') || '/');
    return { out, err, code: err.length ? 1 : 0 };
  };
  C.tree = (a) => {
    const t = a.find((x) => !x.startsWith('-')) || '.'; const n = getNode(resolve(t));
    if (!n || n.type !== 'dir') return E(`${t} [error opening dir]`);
    const out = [{ t, c: 'dir' }]; let dc = 0, fc = 0;
    const walk = (node, pre, depth) => {
      const names = Object.keys(node.children).filter((x) => !x.startsWith('.')).sort();
      names.forEach((nm, i) => {
        const c = node.children[nm]; const last = i === names.length - 1;
        out.push([{ t: pre + (last ? '└── ' : '├── ') }, { t: nm, c: nameCls(c, nm) }]);
        if (c.type === 'dir') { dc++; if (depth < 6 && canRead(c)) walk(c, pre + (last ? '    ' : '│   '), depth + 1); } else fc++;
      });
    };
    walk(n, '', 0);
    out.push('', `${dc} directories, ${fc} files`);
    return R(out);
  };

  // ---------- 시스템 ----------
  C.free = (a) => {
    const [fl] = flagsOf(a);
    if (fl.has('h')) return R(['               total        used        free      shared  buff/cache   available', 'Mem:           3.7Gi       724Mi       2.4Gi       8.0Mi       746Mi       3.0Gi', 'Swap:          4.0Gi          0B       4.0Gi']);
    if (fl.has('m')) return R(['               total        used        free      shared  buff/cache   available', 'Mem:            3753         724        2430           8         746        3029', 'Swap:           4055           0        4055']);
    return R(['               total        used        free      shared  buff/cache   available', 'Mem:         3843584      741532     2489240        8284      764328     3101936', 'Swap:        4153340           0     4153340']);
  };
  C.df = (a) => {
    const [fl] = flagsOf(a);
    if (fl.has('h')) return R(['Filesystem           Size  Used Avail Use% Mounted on', 'devtmpfs             4.0M     0  4.0M   0% /dev', 'tmpfs                1.9G     0  1.9G   0% /dev/shm', 'tmpfs                751M  8.6M  742M   2% /run', `/dev/mapper/rl-root   35G  ${installed('docker-ce') ? '2.6G' : '2.1G'}   33G   ${installed('docker-ce') ? 8 : 6}% /`, '/dev/sda1            960M  327M  634M  35% /boot', 'tmpfs                376M     0  376M   0% /run/user/1000']);
    return R(['Filesystem          1K-blocks    Used Available Use% Mounted on', 'devtmpfs                 4096       0      4096   0% /dev', 'tmpfs                 1921792       0   1921792   0% /dev/shm', 'tmpfs                  768720    8812    759908   2% /run', '/dev/mapper/rl-root  36636672 2201564  34435108   6% /', '/dev/sda1              983040  334848    648192  35% /boot', 'tmpfs                  384356       0    384356   0% /run/user/1000']);
  };
  C.lsblk = () => R(['NAME        MAJ:MIN RM  SIZE RO TYPE MOUNTPOINTS', 'sda           8:0    0   40G  0 disk ', '├─sda1        8:1    0    1G  0 part /boot', '└─sda2        8:2    0   39G  0 part ', '  ├─rl-root 253:0    0   35G  0 lvm  /', '  └─rl-swap 253:1    0    4G  0 lvm  [SWAP]', 'sr0          11:0    1 1024M  0 rom  ']);
  C.lscpu = () => R(['Architecture:            x86_64', '  CPU op-mode(s):        32-bit, 64-bit', '  Byte Order:            Little Endian', 'CPU(s):                  2', '  On-line CPU(s) list:   0,1', 'Vendor ID:               GenuineIntel', '  Model name:            Intel(R) Xeon(R) CPU @ 2.20GHz', '    Thread(s) per core:  1', '    Core(s) per socket:  2', '    Socket(s):           1', 'Virtualization features:', '  Hypervisor vendor:     KVM', '  Virtualization type:   full']);
  C.nproc = () => R(['2']);
  C.mount = () => R(['/dev/mapper/rl-root on / type xfs (rw,relatime,seclabel,attr2,inode64,logbufs=8,logbsize=32k,noquota)', '/dev/sda1 on /boot type xfs (rw,relatime,seclabel,attr2,inode64,logbufs=8,logbsize=32k,noquota)', 'tmpfs on /run type tmpfs (rw,nosuid,nodev,seclabel,size=768720k,nr_inodes=819200,mode=755,inode64)']);
  C.dmesg = () => (isRoot() ? R([`[    0.000000] Linux version ${KERNEL} (mockbuild@rockylinux.org)`, '[    0.000000] Command line: BOOT_IMAGE=(hd0,gpt2)/vmlinuz root=/dev/mapper/rl-root ro resume=/dev/mapper/rl-swap rd.lvm.lv=rl/root rd.lvm.lv=rl/swap', '[    0.012000] DMI: QEMU Standard PC (Q35 + ICH9, 2009)', '[    1.204511] XFS (dm-0): Mounting V5 Filesystem', '[    2.101233] SELinux:  policy capability network_peer_controls=1', '[    3.450120] virtio_net virtio0 ens18: renamed from eth0']) : E('dmesg: read kernel buffer failed: Operation not permitted'));
  C.lsmod = () => R(['Module                  Size  Used by', 'xfs                  2465792  2', 'virtio_net             77824  0', 'nf_tables             335872  ' + (S.services.firewalld.active ? 220 : 0), 'virtio_scsi            28672  2', 'dm_mod                258048  9 dm_log,dm_mirror']);
  C.timedatectl = () => R([`               Local time: ${dateStr().replace(/ KST (\d+)$/, ' $1 KST')}`, '                Time zone: Asia/Seoul (KST, +0900)', `System clock synchronized: ${S.services.chronyd.active ? 'yes' : 'no'}`, `              NTP service: ${S.services.chronyd.active ? 'active' : 'inactive'}`, '          RTC in local TZ: no']);
  C.chronyc = (a) => {
    if (!S.services.chronyd.active) return E('506 Cannot talk to daemon');
    if (a[0] === 'tracking') return R(['Reference ID    : CBF8F08C (time.bora.net)', 'Stratum         : 3', 'System time     : 0.000012345 seconds fast of NTP time', 'Leap status     : Normal']);
    return R(['MS Name/IP address         Stratum Poll Reach LastRx Last sample', '===============================================================================', '^* time.bora.net                 2   6   377    34   +112us[ +140us] +/-   12ms', '^- ntp.kornet.net                2   6   377    35   -320us[ -292us] +/-   21ms']);
  };
  C.getenforce = () => R([S.selinux]);
  C.setenforce = (a) => {
    if (!isRoot()) return E('setenforce:  setenforce() failed');
    if (S.selinux === 'Disabled') return E('setenforce: SELinux is disabled');
    if (['0', 'Permissive', 'permissive'].includes(a[0])) S.selinux = 'Permissive';
    else if (['1', 'Enforcing', 'enforcing'].includes(a[0])) S.selinux = 'Enforcing';
    else return E('usage:  setenforce [ Enforcing | Permissive | 1 | 0 ]');
    return R();
  };
  C.sestatus = () => {
    const cfg = (S.fs.children.etc.children.selinux.children.config.content.match(/^SELINUX=(\w+)/m) || [])[1] || 'enforcing';
    return R(['SELinux status:                 ' + (S.selinux === 'Disabled' ? 'disabled' : 'enabled'), 'SELinuxfs mount:                /sys/fs/selinux', 'Loaded policy name:             targeted', `Current mode:                   ${S.selinux.toLowerCase()}`, `Mode from config file:          ${cfg}`, 'Policy MLS status:              enabled', 'Max kernel policy version:      33']);
  };

  // ---------- 프로세스 ----------
  const procs = () => {
    const base = [[1, 'root', '/usr/lib/systemd/systemd --switched-root --system --deserialize 31'], [2, 'root', '[kthreadd]'], [556, 'root', '/usr/lib/systemd/systemd-journald']];
    Object.entries(S.services).forEach(([n, s]) => { if (s.active && n !== 'systemd-journald') base.push([s.pid, n === 'chronyd' ? 'chrony' : n === 'httpd' ? 'root' : n === 'mariadb' ? 'mysql' : 'root', ({ sshd: 'sshd: /usr/sbin/sshd -D [listener] 0 of 10-100 startups', firewalld: '/usr/bin/python3 -s /usr/sbin/firewalld --nofork --nopid', chronyd: '/usr/sbin/chronyd -F 2', NetworkManager: '/usr/sbin/NetworkManager --no-daemon', crond: '/usr/sbin/crond -n', rsyslog: '/usr/sbin/rsyslogd -n', auditd: '/sbin/auditd', httpd: '/usr/sbin/httpd -DFOREGROUND', nginx: 'nginx: master process /usr/sbin/nginx', mariadb: '/usr/libexec/mariadbd --basedir=/usr', vsftpd: '/usr/sbin/vsftpd /etc/vsftpd/vsftpd.conf', 'nfs-server': '[nfsd]', docker: '/usr/bin/dockerd -H fd:// --containerd=/run/containerd/containerd.sock' })[n] || n]); });
    base.push([1201, S.base, `sshd: ${S.base}@pts/0`], [1202, S.base, '-bash']);
    if (S.stack.length > 1) base.push([1290, 'root', '-bash']);
    return base.sort((x, y) => x[0] - y[0]);
  };
  C.ps = (a) => {
    const all = a.some((x) => /aux|ef|-e|ax/.test(x));
    const list = all ? procs() : [[1202, cur().user, '-bash'], [1311, cur().user, 'ps' + (a.length ? ' ' + a.join(' ') : '')]];
    if (!all) return R(['    PID TTY          TIME CMD', ...list.map(([p, , c]) => `${lpad(p, 7)} pts/0    00:00:00 ${c.split(' ')[0]}`)]);
    if (a.some((x) => x.includes('f') && x.includes('e')) || a.includes('-ef')) return R(['UID          PID    PPID  C STIME TTY          TIME CMD', ...list.map(([p, u, c]) => `${pad(u, 8)} ${lpad(p, 7)} ${lpad(p === 1 ? 0 : 1, 7)}  0 09:00 ${p > 1200 ? 'pts/0   ' : '?       '} 00:00:00 ${c}`)]);
    return R(['USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND', ...list.map(([p, u, c]) => `${pad(u, 8)} ${lpad(p, 7)}  0.0  0.${(p % 7) + 1} ${lpad(20000 + p * 13, 6)} ${lpad(3000 + p, 5)} ${p > 1200 ? 'pts/0   ' : '?       '} Ss   09:00   0:00 ${c}`)]);
  };
  C.top = () => R([`top - ${kst().toISOString().slice(11, 19)} up ${uptimeStr()},  1 user,  load average: 0.00, 0.01, 0.05`, `Tasks: ${procs().length + 110} total,   1 running, ${procs().length + 109} sleeping,   0 stopped,   0 zombie`, '%Cpu(s):  0.3 us,  0.2 sy,  0.0 ni, 99.5 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st', 'MiB Mem :   3753.5 total,   2430.9 free,    724.2 used,    746.4 buff/cache', 'MiB Swap:   4056.0 total,   4056.0 free,      0.0 used.   3029.2 avail Mem', '', '    PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND', ...procs().slice(0, 12).map(([p, u, c]) => `${lpad(p, 7)} ${pad(u, 9)} 20   0 ${lpad(20000 + p * 13, 7)} ${lpad(3000 + p, 6)}   2048 S   0.0   0.${(p % 7) + 1}   0:00.12 ${c.split(' ')[0].split('/').pop()}`), '', { t: '(실제 top은 실시간 화면이지만 체험판은 한 번만 출력해요)', c: 'dim' }]);
  C.htop = C.top;
  C.kill = (a) => {
    const pid = +a.filter((x) => !x.startsWith('-')).pop();
    if (!pid) return E('kill: usage: kill [-s sigspec | -n signum | -sigspec] pid | jobspec ... or kill -l [sigspec]');
    const p = procs().find((x) => x[0] === pid);
    if (!p) return E(`-bash: kill: (${pid}) - No such process`);
    if (!isRoot() && p[1] !== cur().user) return E(`-bash: kill: (${pid}) - Operation not permitted`);
    const svc = Object.entries(S.services).find(([, s]) => s.pid === pid && s.active);
    if (svc) { svc[1].active = false; log('systemd[1]', `${svc[0]}.service: Main process exited, code=killed, status=15/TERM`); }
    if (pid === 1 || pid === 1202) return E(`-bash: kill: (${pid}) - Operation not permitted (체험판 보호)`);
    return R();
  };
  C.killall = (a) => { const n = a.filter((x) => !x.startsWith('-'))[0]; const s = S.services[n] || S.services[n?.replace(/d$/, '')]; if (!s || !s.active) return E(`${n}: no process found`); if (!isRoot()) return E(`${n}(${s.pid}): Operation not permitted`); s.active = false; return R(); };

  C.systemctl = (a) => {
    const args = a.filter((x) => !['--no-pager', '-l', '--now', '--type=service', '--all'].includes(x));
    const now_ = a.includes('--now');
    const [sub, ...units] = args;
    if (!sub || sub === 'list-units') {
      const rows = Object.entries(S.services).filter(([, s]) => installed(s.pkg) && (s.active || a.includes('--all')));
      return R(['  UNIT                        LOAD   ACTIVE SUB     DESCRIPTION', ...rows.map(([n, s]) => `  ${pad(n + '.service', 27)} loaded ${pad(s.active ? 'active' : 'inactive', 6)} ${pad(s.active ? 'running' : 'dead', 7)} ${s.desc}`), '', `${rows.length} loaded units listed.`]);
    }
    if (sub === 'list-unit-files') return R(['UNIT FILE                     STATE    PRESET', ...Object.entries(S.services).filter(([, s]) => installed(s.pkg)).map(([n, s]) => `${pad(n + '.service', 29)} ${pad(s.enabled ? 'enabled' : 'disabled', 8)} ${s.enabled ? 'enabled' : 'disabled'}`)]);
    if (sub === 'daemon-reload') return isRoot() ? R() : E('Failed to reload daemon: Access denied');
    if (['poweroff', 'reboot'].includes(sub)) return C[sub]([]);
    if (!units.length) return E(`Too few arguments.`);
    const out = []; const err = []; let code = 0;
    for (const raw of units) {
      const n = svcName(raw); const s = S.services[n];
      const exists = s && installed(s.pkg);
      if (sub === 'status') {
        if (!exists) { err.push(`Unit ${n}.service could not be found.`); code = 4; continue; }
        const unitPath = `/usr/lib/systemd/system/${n}.service`;
        out.push([{ t: s.active ? '● ' : '○ ', c: s.active ? 'ok' : 'dim' }, { t: `${n}.service - ${s.desc}` }],
          `     Loaded: loaded (${unitPath}; ${s.enabled ? 'enabled' : 'disabled'}; preset: ${INITIAL_SERVICES[n]?.enabled ? 'enabled' : 'disabled'})`,
          s.active ? [{ t: '     Active: ' }, { t: 'active (running)', c: 'ok' }, { t: ` since ${sinceStr(s)}` }] : `     Active: inactive (dead)`);
        if (s.active) out.push(`   Main PID: ${s.pid} (${n === 'httpd' ? 'httpd' : n})`, '      Tasks: 1 (limit: 23116)', `     Memory: ${(s.pid % 9) + 1}.${s.pid % 10}M`, `     CGroup: /system.slice/${n}.service`, `             └─${s.pid} ${(procs().find((x) => x[0] === s.pid) || [])[2] || n}`);
        if (!s.active) code = 3;
        continue;
      }
      if (sub === 'is-active') { out.push(exists && s.active ? 'active' : 'inactive'); if (!(exists && s.active)) code = 3; continue; }
      if (sub === 'is-enabled') { if (!exists) { err.push(`Failed to get unit file state for ${n}.service: No such file or directory`); code = 1; continue; } out.push(s.enabled ? 'enabled' : 'disabled'); if (!s.enabled) code = 1; continue; }
      if (!['start', 'stop', 'restart', 'reload', 'enable', 'disable', 'mask', 'unmask'].includes(sub)) return E(`Unknown command verb ${sub}.`);
      if (!exists) {
        if (['enable', 'disable'].includes(sub)) err.push(`Failed to ${sub} unit: Unit file ${n}.service does not exist.`);
        else err.push(`Failed to ${sub} ${n}.service: Unit ${n}.service not found.`);
        code = sub === 'start' || sub === 'stop' ? 5 : 1; continue;
      }
      if (!isRoot()) {
        err.push(`==== AUTHENTICATING FOR org.freedesktop.systemd1.${['enable', 'disable'].includes(sub) ? 'manage-unit-files' : 'manage-units'} ====`, `Authentication is required to ${sub} '${n}.service'.`, `==== AUTHENTICATION FAILED ====`, `Failed to ${sub} ${n}.service: Access denied`, { t: '→ sudo를 앞에 붙여 다시 실행해 보세요.', c: 'dim' });
        code = 1; continue;
      }
      if (sub === 'enable' || sub === 'disable') {
        if (sub === 'enable' && !s.enabled) out.push(`Created symlink /etc/systemd/system/multi-user.target.wants/${n}.service → /usr/lib/systemd/system/${n}.service.`);
        if (sub === 'disable' && s.enabled) out.push(`Removed "/etc/systemd/system/multi-user.target.wants/${n}.service".`);
        s.enabled = sub === 'enable';
        if (now_) { s.active = sub === 'enable'; s.since = Date.now(); if (s.active) s.pid = s.pid || 2000 + Math.floor(Math.random() * 3000); }
        continue;
      }
      if (sub === 'start' || sub === 'restart' || sub === 'reload') {
        if (sub === 'reload' && !s.active) { err.push(`${n}.service is not active, cannot reload.`); code = 1; continue; }
        if (s.port && Object.entries(S.services).some(([o, x]) => o !== n && x.active && x.port === s.port)) {
          err.push(`Job for ${n}.service failed because the control process exited with error code.`, `See "systemctl status ${n}.service" and "journalctl -xeu ${n}.service" for details.`);
          log(n, `(98)Address already in use: could not bind to address 0.0.0.0:${s.port}`); code = 1; continue;
        }
        s.active = true; s.since = Date.now(); s.pid = 2000 + Math.floor(Math.random() * 3000); log('systemd[1]', `Started ${s.desc}.`);
      }
      if (sub === 'stop') { s.active = false; log('systemd[1]', `Stopped ${s.desc}.`); }
    }
    return { out, err, code };
  };
  C.service = (a) => C.systemctl([a[1], a[0]]);
  C.journalctl = (a) => {
    if (!isRoot() && !userInfo(cur().user).groups.includes('wheel')) return E('Hint: You are currently not seeing messages from other users and the system.');
    const ui = a.indexOf('-u'); let unit = ui >= 0 ? svcName(a[ui + 1]) : null;
    const xeu = a.find((x) => /^-x?e?u$/.test(x) && x !== '-u'); if (xeu) unit = svcName(a[a.indexOf(xeu) + 1]);
    const ni = a.indexOf('-n'); const n = ni >= 0 ? +a[ni + 1] : 20;
    const baseLog = ['Oct 28 09:00:01 rocky systemd[1]: Started OpenSSH server daemon.', 'Oct 28 09:00:01 rocky sshd[1102]: Server listening on 0.0.0.0 port 22.', 'Oct 28 09:00:02 rocky systemd[1]: Started firewalld - dynamic firewall daemon.', 'Oct 28 09:00:03 rocky chronyd[812]: Selected source 203.248.240.140 (2.rocky.pool.ntp.org)', `Oct 28 09:00:05 rocky sshd[1201]: Accepted password for ${S.base} from 192.168.10.2 port 51022 ssh2`].map((l) => l.replace('rocky', S.hostname));
    let lines = [...baseLog, ...S.journal];
    if (unit) lines = lines.filter((l) => l.includes(unit) || l.includes(S.services[unit]?.desc || '@@'));
    if (!lines.length) return R(['-- No entries --']);
    return R(lines.slice(-n));
  };

  // ---------- 패키지 ----------
  function pkgTable(names, verb) {
    const rows = names.map((n) => { const p = PACKAGES[n]; return ` ${pad(n, 16)} ${pad('x86_64', 12)} ${pad(p[0], 26)} ${pad(p[4], 10)} ${lpad(p[1], 6)}`; });
    return ['Dependencies resolved.', '='.repeat(80), ` ${pad('Package', 16)} ${pad('Architecture', 12)} ${pad('Version', 26)} ${pad('Repository', 10)} ${lpad('Size', 6)}`, '='.repeat(80), `${verb}:`, ...rows, '', 'Transaction Summary', '='.repeat(80), `${verb === 'Installing' ? 'Install' : 'Remove '}  ${names.length} Package${names.length > 1 ? 's' : ''}`, ''];
  }
  const repoOk = (n) => { const r = PACKAGES[n][4]; return r !== 'epel' || installed('epel-release') ? r !== 'docker-ce-stable' || !!getNode(['etc', 'yum.repos.d', 'docker-ce.repo']) : false; };
  C.dnf = C.yum = (a) => {
    const assume = a.includes('-y') || a.includes('--assumeyes');
    const args = a.filter((x) => !x.startsWith('-'));
    const [sub, ...pk] = args;
    const meta = `Last metadata expiration check: 0:${lpad(Math.floor((Date.now() / 60000) % 60), 2).replace(' ', '0')}:12 ago on ${dateStr().replace(/ KST (\d+)$/, ' $1')}.`;
    if (!sub) return E(['usage: dnf [options] COMMAND', '', 'List of Main Commands:', '', 'install      install a package or packages on your system', 'remove       remove a package or packages from your system', 'list         list a package or groups of packages', 'search       search package details for the given string', 'info         display details about a package', 'repolist     display the configured software repositories', 'update       upgrade a package or packages on your system'], 1);
    if (sub === 'repolist') return R(['repo id                       repo name', 'appstream                     Rocky Linux 9 - AppStream', 'baseos                        Rocky Linux 9 - BaseOS', 'extras                        Rocky Linux 9 - Extras', ...(installed('epel-release') ? ['epel                          Extra Packages for Enterprise Linux 9 - x86_64'] : []), ...(getNode(['etc', 'yum.repos.d', 'docker-ce.repo']) ? ['docker-ce-stable              Docker CE Stable - x86_64'] : [])]);
    if (sub === 'list') {
      const inst = pk[0] === 'installed'; const names = Object.keys(PACKAGES).filter((n) => (inst ? installed(n) : pk[0] === 'available' ? !installed(n) && repoOk(n) : installed(n) || repoOk(n))).filter((n) => !pk[inst ? 1 : 0] || n.includes(pk[inst ? 1 : 0].replace(/\*/g, '')));
      return R([...(inst ? [] : [meta]), inst ? 'Installed Packages' : 'Available Packages', ...names.map((n) => `${pad(n + '.x86_64', 34)} ${pad(PACKAGES[n][0], 28)} ${installed(n) ? '@' + PACKAGES[n][4] : PACKAGES[n][4]}`)]);
    }
    if (sub === 'search') {
      const q = (pk[0] || '').toLowerCase(); const hits = Object.keys(PACKAGES).filter((n) => repoOk(n) && (n.includes(q) || PACKAGES[n][2].toLowerCase().includes(q)));
      if (!hits.length) return E([meta, `No matches found.`]);
      return R([meta, `================================ Name Matched: ${q} =================================`, ...hits.map((n) => `${n}.x86_64 : ${PACKAGES[n][2]}`)]);
    }
    if (sub === 'info') {
      const n = pk[0]; if (!PACKAGES[n] || !repoOk(n)) return E([meta, 'Error: No matching Packages to list']);
      const p = PACKAGES[n];
      return R([meta, installed(n) ? 'Installed Packages' : 'Available Packages', `Name         : ${n}`, `Version      : ${p[0].split('-')[0]}`, `Release      : ${p[0].split('-').slice(1).join('-')}`, 'Architecture : x86_64', `Size         : ${p[1]}`, `Repository   : ${installed(n) ? '@System' : p[4]}`, `Summary      : ${p[2]}`]);
    }
    if (['check-update', 'update', 'upgrade', 'makecache', 'clean'].includes(sub)) {
      if (sub === 'clean') return isRoot() ? R(['0 files removed']) : needRoot('dnf');
      if (sub === 'makecache') return R(['Rocky Linux 9 - BaseOS                          2.1 MB/s | 2.4 MB     00:01', 'Rocky Linux 9 - AppStream                       5.3 MB/s | 8.6 MB     00:01', 'Rocky Linux 9 - Extras                           29 kB/s |  16 kB     00:00', 'Metadata cache created.']);
      if (sub !== 'check-update' && !isRoot()) return needRoot('dnf');
      return R([meta, 'Dependencies resolved.', 'Nothing to do.', 'Complete!']);
    }
    if (['install', 'remove', 'erase', 'reinstall'].includes(sub)) {
      if (!pk.length) return E(`Error: Need to pass a list of pkgs to ${sub}`);
      if (!isRoot()) return needRoot('dnf');
      const remove = sub !== 'install' && sub !== 'reinstall';
      const out = remove ? [] : [meta]; const todo = []; const errs = [];
      pk.forEach((raw) => {
        const n = raw.replace(/\.x86_64$/, '');
        if (!PACKAGES[n] || (!remove && !repoOk(n))) { (remove ? out : errs).push(remove ? `No match for argument: ${n}` : `No match for argument: ${n}`); return; }
        if (!remove && installed(n) && sub === 'install') { out.push(`Package ${n}-${PACKAGES[n][0]}.x86_64 is already installed.`); return; }
        if (remove && !installed(n)) { out.push(`No match for argument: ${n}`); return; }
        if (remove && PACKAGES[n][3] && ['bash', 'systemd', 'dnf', 'sudo', 'kernel'].includes(n)) { errs.push(`Error: Problem: The operation would result in removing the following protected packages: ${n}`); return; }
        todo.push(n);
      });
      if (errs.length && !todo.length) {
        const hint = pk.some((x) => x === 'htop') && !installed('epel-release') ? ['', { t: '힌트: htop은 EPEL 저장소에 있어요 → sudo dnf install -y epel-release', c: 'dim' }] : pk.some((x) => x === 'docker-ce') ? ['', { t: '힌트: docker-ce는 Docker 저장소 등록이 필요해요 → sudo dnf config-manager --add-repo https://download.docker.com/linux/rhel/docker-ce.repo', c: 'dim' }] : [];
        return E([...errs, 'Error: Unable to find a match: ' + pk.join(' '), ...hint], 1, out);
      }
      if (!todo.length) return R([...out, 'Dependencies resolved.', 'Nothing to do.', 'Complete!']);
      out.push(...pkgTable(todo, remove ? 'Removing' : 'Installing'));
      const finish = () => {
        const done = [];
        if (!remove) done.push('Downloading Packages:', ...todo.map((n) => `${pad(`${n}-${PACKAGES[n][0]}.x86_64.rpm`, 50)} 3.1 MB/s | ${lpad(PACKAGES[n][1], 6)}     00:00`));
        done.push('Running transaction check', 'Transaction check succeeded.', 'Running transaction test', 'Transaction test succeeded.', 'Running transaction');
        todo.forEach((n, i) => done.push(`  ${remove ? 'Erasing  ' : 'Installing'}       : ${pad(`${n}-${PACKAGES[n][0]}.x86_64`, 48)} ${i + 1}/${todo.length}`));
        todo.forEach((n, i) => done.push(`  Verifying        : ${pad(`${n}-${PACKAGES[n][0]}.x86_64`, 48)} ${i + 1}/${todo.length}`));
        done.push('', remove ? 'Removed:' : 'Installed:', ...todo.map((n) => `  ${n}-${PACKAGES[n][0]}.x86_64`), '', { t: 'Complete!', c: 'ok' });
        todo.forEach((n) => {
          if (remove) { S.installed = S.installed.filter((x) => x !== n); Object.values(S.services).forEach((s) => { if (s.pkg === n) { s.active = false; s.enabled = false; } }); }
          else { S.installed.push(n); installFiles(n); }
          log('dnf', `${remove ? 'Erased' : 'Installed'}: ${n}-${PACKAGES[n][0]}.x86_64`);
        });
        return done;
      };
      if (assume) return R([...out, ...finish()]);
      return R(out, 0, { ask: { prompt: 'Is this ok [y/N]: ', handle: (ans) => (/^y(es)?$/i.test(ans.trim()) ? R(finish()) : E('Operation aborted.')) } });
    }
    if (sub === 'config-manager') {
      if (!isRoot()) return needRoot('dnf');
      const repo = a[a.indexOf('--add-repo') + 1];
      if (repo && /docker/.test(repo)) { writeFile(['etc', 'yum.repos.d', 'docker-ce.repo'], '[docker-ce-stable]\nname=Docker CE Stable - $basearch\nbaseurl=https://download.docker.com/linux/rhel/$releasever/$basearch/stable\nenabled=1\ngpgcheck=1'); return R([`Adding repo from: ${repo}`]); }
      return R(repo ? [`Adding repo from: ${repo}`] : []);
    }
    return E(`No such command: ${sub}. Please use /usr/bin/dnf --help`);
  };
  C.rpm = (a) => {
    const [fl, rest] = flagsOf(a);
    if (fl.has('q') && fl.has('a')) return R(S.installed.map((n) => `${n}-${PACKAGES[n][0]}.x86_64`).sort());
    if (fl.has('q') && rest.length) {
      if (fl.has('i')) { const n = rest[0]; if (!installed(n)) return E(`package ${n} is not installed`); const p = PACKAGES[n]; return R([`Name        : ${n}`, `Version     : ${p[0].split('-')[0]}`, `Release     : ${p[0].split('-').slice(1).join('-')}`, 'Architecture: x86_64', `Size        : ${p[1]}`, `Summary     : ${p[2]}`]); }
      const out = []; const err = []; rest.forEach((n) => (installed(n) ? out.push(`${n}-${PACKAGES[n][0]}.x86_64`) : err.push(`package ${n} is not installed`)));
      return { out, err, code: err.length ? 1 : 0 };
    }
    return E('rpm: no operation specified (예: rpm -qa, rpm -q httpd, rpm -qi bash)');
  };

  // ---------- 네트워크 ----------
  C.ip = (a) => {
    const sub = a[0] || '';
    if (/^a(ddr)?$/.test(sub) || (!sub)) return R(['1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000', '    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00', '    inet 127.0.0.1/8 scope host lo', '       valid_lft forever preferred_lft forever', '2: ens18: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000', '    link/ether bc:24:11:5a:3e:7f brd ff:ff:ff:ff:ff:ff', '    altname enp0s18', [{ t: '    inet ' }, { t: '192.168.10.50/24', c: 'ok' }, { t: ' brd 192.168.10.255 scope global noprefixroute ens18' }], '       valid_lft forever preferred_lft forever']);
    if (/^r(oute)?$/.test(sub)) return R(['default via 192.168.10.1 dev ens18 proto static metric 100', '192.168.10.0/24 dev ens18 proto kernel scope link src 192.168.10.50 metric 100']);
    if (/^l(ink)?$/.test(sub)) return R(['1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN mode DEFAULT group default qlen 1000', '    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00', '2: ens18: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP mode DEFAULT group default qlen 1000', '    link/ether bc:24:11:5a:3e:7f brd ff:ff:ff:ff:ff:ff']);
    return E(`Object "${sub}" is unknown, try "ip help".`, 255);
  };
  C.ifconfig = () => R(['ens18: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500', '        inet 192.168.10.50  netmask 255.255.255.0  broadcast 192.168.10.255', '        ether bc:24:11:5a:3e:7f  txqueuelen 1000  (Ethernet)', '', 'lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536', '        inet 127.0.0.1  netmask 255.0.0.0']);
  C.nmcli = (a) => {
    const s = (a[0] || '').replace(/^-.*/, '');
    if (/^d(ev(ice)?)?$/.test(s)) return R(['DEVICE  TYPE      STATE                   CONNECTION', 'ens18   ethernet  connected               ens18', 'lo      loopback  connected (externally)  lo']);
    if (/^c(on(nection)?)?$/.test(s)) {
      if (a[1] === 'show' && a[2]) return R(['connection.id:                          ens18', 'connection.type:                        802-3-ethernet', 'connection.interface-name:              ens18', 'connection.autoconnect:                 yes', 'ipv4.method:                            manual', 'ipv4.dns:                               8.8.8.8', 'ipv4.addresses:                         192.168.10.50/24', 'ipv4.gateway:                           192.168.10.1']);
      if (['modify', 'mod', 'up', 'down', 'add', 'delete', 'reload'].includes(a[1])) return isRoot() ? R(a[1] === 'up' ? ['Connection successfully activated (D-Bus active path: /org/freedesktop/NetworkManager/ActiveConnection/3)'] : []) : E('Error: Failed to modify connection: Insufficient privileges');
      return R(['NAME   UUID                                  TYPE      DEVICE', 'ens18  6a1e5c2b-3f4d-4e8a-9b7c-1d2e3f4a5b6c  ethernet  ens18', 'lo     0c9a8b7d-6e5f-4a3b-2c1d-0e9f8a7b6c5d  loopback  lo']);
    }
    return R(['ens18: connected to ens18', '        "Red Hat Virtio"', '        ethernet (virtio_net), BC:24:11:5A:3E:7F, hw, mtu 1500', '        ip4 default', '        inet4 192.168.10.50/24', '        route4 default via 192.168.10.1 metric 100', '', 'DNS configuration:', '        servers: 8.8.8.8', '        interface: ens18']);
  };
  C.ss = (a) => {
    const rows = [['tcp', 'LISTEN', '0.0.0.0:22', 'sshd', 1102], ['tcp', 'LISTEN', '[::]:22', 'sshd', 1102], ['udp', 'UNCONN', '127.0.0.1:323', 'chronyd', 812]];
    Object.entries(S.services).forEach(([n, s]) => { if (s.active && s.port && n !== 'sshd') rows.push(['tcp', 'LISTEN', `${n === 'mariadb' ? '0.0.0.0' : '*'}:${s.port}`, n, s.pid]); });
    if (!S.services.sshd.active) rows.splice(0, 2);
    const showP = a.some((x) => x.includes('p'));
    return R(['Netid State  Recv-Q Send-Q Local Address:Port  Peer Address:Port' + (showP ? 'Process' : ''), ...rows.map(([nt, st, la, n, pid]) => `${pad(nt, 5)} ${pad(st, 6)} 0      128    ${pad(la, 19)} ${pad('0.0.0.0:*', 18)}${showP && isRoot() ? `users:(("${n}",pid=${pid},fd=3))` : ''}`)]);
  };
  C.netstat = (a) => R(['Active Internet connections (only servers)', 'Proto Recv-Q Send-Q Local Address           Foreign Address         State', ...C.ss(a).out.slice(1).map((l) => { const p = l.split(/\s+/); return `${pad(p[0], 5)} 0      0      ${pad(p[4], 23)} ${pad('0.0.0.0:*', 23)} LISTEN`; })]);
  C.ping = (a) => {
    const host = a.filter((x) => !x.startsWith('-') && !/^\d+$/.test(x)).pop();
    if (!host) return E('ping: usage error: Destination address required', 2);
    const ci = a.indexOf('-c'); const n = Math.min(ci >= 0 ? +a[ci + 1] || 4 : 4, 10);
    const ip = /^\d+\.\d+\.\d+\.\d+$/.test(host) ? host : host === 'localhost' ? '127.0.0.1' : ({ 'google.com': '142.250.206.238', 'naver.com': '223.130.200.219', 'tnhub.kr': '211.36.148.7' })[host] || `203.0.113.${(host.length * 17) % 250}`;
    const t = () => (host === 'localhost' || ip.startsWith('127.') ? 0.03 : ip.startsWith('192.168.') ? 0.4 : 8 + Math.random() * 6).toFixed(ip.startsWith('127.') ? 3 : 1);
    const out = [`PING ${host} (${ip}) 56(84) bytes of data.`];
    for (let i = 1; i <= n; i++) out.push(`64 bytes from ${host === ip ? ip : `${host} (${ip})`}: icmp_seq=${i} ttl=${ip.startsWith('127.') ? 64 : 117} time=${t()} ms`);
    out.push('', `--- ${host} ping statistics ---`, `${n} packets transmitted, ${n} received, 0% packet loss, time ${(n - 1) * 1001}ms`);
    if (ci < 0) out.push({ t: '(실제 ping은 Ctrl+C 전까지 계속 보내요. 체험판은 4번만 보내요)', c: 'dim' });
    return R(out);
  };
  C.curl = (a) => {
    const url = a.filter((x) => !x.startsWith('-')).pop();
    if (!url) return E("curl: try 'curl --help' or 'curl --manual' for more information", 2);
    const head = a.includes('-I') || a.includes('--head');
    const m = url.match(/^(?:https?:\/\/)?(localhost|127\.0\.0\.1|192\.168\.10\.50)(?::(\d+))?/);
    if (!m) return E(`curl: (6) Could not resolve host: ${url.replace(/^https?:\/\//, '').split('/')[0]}`, 6, [{ t: '(체험판은 외부 인터넷에 접속하지 않아요. curl localhost 로 내 웹서버를 확인해 보세요)', c: 'dim' }]);
    const port = +(m[2] || 80);
    const svc = Object.entries(S.services).find(([, s]) => s.active && s.port === port);
    if (!svc) return E(`curl: (7) Failed to connect to ${m[1]} port ${port} after 0 ms: Couldn't connect to server`, 7);
    if (m[1] === '192.168.10.50' && !S.fw.services.includes('http') && !S.fw.ports.includes(`${port}/tcp`) && port === 80) { /* 같은 호스트에서는 방화벽 영향 없음 */ }
    let body;
    if (svc[0] === 'httpd') { const idx = getNode(['var', 'www', 'html', 'index.html']); body = idx ? idx.content : '<!doctype html>\n<html><head><title>HTTP Server Test Page powered by: Rocky Linux</title></head>\n<body><h1>HTTP Server <strong>Test Page</strong></h1>\n<p>This page is used to test the proper operation of an HTTP server after it has been installed on a Rocky Linux system.</p></body></html>'; }
    else if (svc[0] === 'nginx') body = (getNode(['usr', 'share', 'nginx', 'html', 'index.html']) || { content: '<h1>Welcome to nginx!</h1>' }).content;
    else return E(`curl: (52) Empty reply from server`, 52);
    const server = svc[0] === 'httpd' ? 'Apache/2.4.62 (Rocky Linux)' : 'nginx/1.20.1';
    if (head) return R([`HTTP/1.1 ${svc[0] === 'httpd' && !getNode(['var', 'www', 'html', 'index.html']) ? '403 Forbidden' : '200 OK'}`, `Date: ${new Date().toUTCString()}`, `Server: ${server}`, 'Content-Type: text/html; charset=UTF-8']);
    return R(body.split('\n'));
  };
  C.wget = (a) => { const url = a.filter((x) => !x.startsWith('-')).pop(); return url ? E([`--${kst().toISOString().slice(0, 19).replace('T', ' ')}--  ${url}`, `Resolving ${url.replace(/^https?:\/\//, '').split('/')[0]}... failed: Name or service not known.`, { t: '(체험판은 외부 인터넷에 접속하지 않아요)', c: 'dim' }], 4) : E('wget: missing URL'); };
  C.dig = C.nslookup = C.host = (a) => { const h = a.filter((x) => !x.startsWith('-') && !x.startsWith('@'))[0]; if (!h) return E('Usage: nslookup [HOST]'); const ip = C.ping([h, '-c', '1']).out[0].match(/\(([\d.]+)\)/)[1]; return R(['Server:\t\t8.8.8.8', 'Address:\t8.8.8.8#53', '', 'Non-authoritative answer:', `Name:\t${h}`, `Address: ${ip}`]); };

  C['firewall-cmd'] = (a) => {
    if (a.includes('--state')) return S.services.firewalld.active ? R(['running']) : E('not running', 252);
    if (!S.services.firewalld.active) return E('FirewallD is not running', 252);
    const changing = a.some((x) => /^--(add|remove)-|^--reload|^--set-default-zone|^--runtime-to-permanent/.test(x));
    if (changing && !isRoot()) return E(['Authorization failed.', '    Make sure polkit agent is running or run the application as superuser.'], 252);
    const perm = a.includes('--permanent');
    if (a.includes('--reload')) { S.fw.services = [...S.fw.pServices]; S.fw.ports = [...S.fw.pPorts]; return R(['success']); }
    if (a.includes('--runtime-to-permanent')) { S.fw.pServices = [...S.fw.services]; S.fw.pPorts = [...S.fw.ports]; return R(['success']); }
    if (a.includes('--get-default-zone')) return R(['public']);
    if (a.includes('--get-active-zones')) return R(['public', '  interfaces: ens18']);
    if (a.includes('--get-services')) return R(['cockpit dhcpv6-client dns ftp http https mysql nfs ntp samba ssh ...']);
    const svcList = perm ? S.fw.pServices : S.fw.services; const portList = perm ? S.fw.pPorts : S.fw.ports;
    if (a.includes('--list-services')) return R([svcList.join(' ')]);
    if (a.includes('--list-ports')) return R([portList.join(' ')]);
    const out = [];
    for (const x of a) {
      let m;
      if ((m = x.match(/^--(add|remove)-service=(.+)$/))) {
        const known = ['http', 'https', 'ssh', 'ftp', 'mysql', 'nfs', 'dns', 'ntp', 'samba', 'cockpit', 'dhcpv6-client'];
        if (!known.includes(m[2])) return E(`Error: INVALID_SERVICE: '${m[2]}' not among existing services`, 101);
        const has = svcList.includes(m[2]);
        if (m[1] === 'add') { if (has) out.push(`Warning: ALREADY_ENABLED: ${m[2]}`); else svcList.push(m[2]); }
        else { if (!has) out.push(`Warning: NOT_ENABLED: ${m[2]}`); else svcList.splice(svcList.indexOf(m[2]), 1); }
        out.push('success');
      } else if ((m = x.match(/^--(add|remove)-port=(\d+(?:-\d+)?\/(tcp|udp))$/))) {
        const has = portList.includes(m[2]);
        if (m[1] === 'add') { if (has) out.push(`Warning: ALREADY_ENABLED: ${m[2]}`); else portList.push(m[2]); }
        else { if (!has) out.push(`Warning: NOT_ENABLED: ${m[2]}`); else portList.splice(portList.indexOf(m[2]), 1); }
        out.push('success');
      } else if (/^--(add|remove)-port=/.test(x)) return E(`Error: INVALID_PORT: ${x.split('=')[1]} (예: 8080/tcp)`, 102);
    }
    if (out.length) return R(out);
    if (a.includes('--list-all') || !a.length) return R(['public (active)', '  target: default', '  icmp-block-inversion: no', '  interfaces: ens18', '  sources: ', `  services: ${svcList.join(' ')}`, `  ports: ${portList.join(' ')}`, '  protocols: ', '  forward: yes', '  masquerade: no', '  forward-ports: ', '  source-ports: ', '  icmp-blocks: ', '  rich rules: ']);
    return E(`usage: see firewall-cmd man page\nfirewall-cmd: error: unrecognized arguments: ${a.join(' ')}`, 2);
  };

  // ---------- 계정 ----------
  C.useradd = (a) => {
    if (!isRoot()) return E(['useradd: Permission denied.', 'useradd: cannot lock /etc/passwd; try again later.']);
    const gi = a.indexOf('-G'); const extra = gi >= 0 ? a[gi + 1].split(',') : [];
    const name = a.filter((x, i) => !x.startsWith('-') && a[i - 1] !== '-G' && a[i - 1] !== '-s' && a[i - 1] !== '-c' && a[i - 1] !== '-d' && a[i - 1] !== '-u').pop();
    if (!name) return E('Usage: useradd [options] LOGIN');
    if (!/^[a-z_][a-z0-9_-]{0,31}$/.test(name)) return E(`useradd: invalid user name '${name}': use --badname to ignore`, 3);
    if (userInfo(name)) return E(`useradd: user '${name}' already exists`, 9);
    const uid = Math.max(...S.users.filter((u) => u.uid >= 1000 && u.uid < 60000).map((u) => u.uid)) + 1;
    S.users.push({ name, uid, gid: uid, home: `/home/${name}`, shell: '/bin/bash', groups: [name, ...extra] });
    S.fs.children.home.children[name] = { type: 'dir', children: {}, mode: '700', owner: name, mtime: now() };
    syncPasswd(); return R();
  };
  C.adduser = C.useradd;
  C.userdel = (a) => {
    if (!isRoot()) return E(['userdel: Permission denied.', 'userdel: cannot lock /etc/passwd; try again later.']);
    const name = a.filter((x) => !x.startsWith('-')).pop(); const u = userInfo(name);
    if (!u) return E(`userdel: user '${name}' does not exist`, 6);
    if (u.uid < 1000 || name === S.base) return E(`userdel: user ${name} is currently used by process ${name === S.base ? 1202 : 1}`, 8);
    S.users = S.users.filter((x) => x.name !== name);
    if (a.includes('-r')) delete S.fs.children.home.children[name];
    syncPasswd(); return R();
  };
  C.usermod = (a) => {
    if (!isRoot()) return E(['usermod: Permission denied.', 'usermod: cannot lock /etc/passwd; try again later.']);
    const name = a[a.length - 1]; const u = userInfo(name); if (!u) return E(`usermod: user '${name}' does not exist`, 6);
    const gi = a.findIndex((x) => /^-a?G$|^-aG$/.test(x));
    if (gi >= 0) { const gs = a[gi + 1].split(','); u.groups = a[gi] === '-G' ? [u.groups[0], ...gs] : [...new Set([...u.groups, ...gs])]; }
    const si = a.indexOf('-s'); if (si >= 0) u.shell = a[si + 1];
    syncPasswd(); return R();
  };
  C.groupadd = (a) => { if (!isRoot()) return E('groupadd: Permission denied.'); const g = a.filter((x) => !x.startsWith('-')).pop(); if (!g) return E('Usage: groupadd [options] GROUP'); const etc = S.fs.children.etc.children; if (new RegExp(`^${g}:`, 'm').test(etc.group.content)) return E(`groupadd: group '${g}' already exists`, 9); etc.group.content += `\n${g}:x:${2000 + etc.group.content.split('\n').length}:`; return R(); };
  C.passwd = (a) => {
    const target = a.filter((x) => !x.startsWith('-'))[0] || cur().user;
    if (target !== cur().user && !isRoot()) return E('passwd: Only root can specify a user name.');
    if (!userInfo(target)) return E(`passwd: Unknown user name '${target}'.`);
    if (a.includes('--stdin')) return R(['Changing password for user ' + target + '.', 'passwd: all authentication tokens updated successfully.']);
    let first = null;
    const ask2 = { prompt: 'Retype new password: ', mask: true, handle: (p2) => (p2 === first ? R(['passwd: all authentication tokens updated successfully.']) : E(['Sorry, passwords do not match.', 'passwd: Authentication token manipulation error'])) };
    const ask1 = { prompt: 'New password: ', mask: true, handle: (p1) => { first = p1; if (p1.length < 8) return R(['BAD PASSWORD: The password is shorter than 8 characters'], 0, { ask: ask2 }); return R([], 0, { ask: ask2 }); } };
    return R([`Changing password for user ${target}.`], 0, { ask: ask1 });
  };
  C.su = (a) => {
    const target = a.filter((x) => x !== '-' && x !== '-l' && x !== '--login')[0] || 'root';
    const login = a.includes('-') || a.includes('-l') || a.includes('--login');
    const u = userInfo(target); if (!u) return E(`su: user ${target} does not exist or the user entry does not contain all the required fields`);
    const go = () => { S.stack.push({ user: target, cwd: login ? u.home : cur().cwd }); return R(login && target === 'root' ? [`Last login: ${dateStr().replace(' KST', '')} on pts/0`] : []); };
    if (isRoot()) return go();
    return R([], 0, { ask: { prompt: 'Password: ', mask: true, handle: () => go() } });
  };
  C.sudo = (a, stdin) => {
    if (!a.length) return E('usage: sudo -h | -K | -k | -V\nusage: sudo [-u user] command');
    if (!userInfo(cur().user).groups.includes('wheel') && !isRoot()) return E(`${cur().user} is not in the sudoers file.  This incident will be reported.`);
    if (a[0] === '-i' || (a[0] === 'su' && (a.includes('-') || a.length === 1)) || a[0] === '-s') { S.stack.push({ user: 'root', cwd: a[0] === '-s' ? cur().cwd : '/root' }); return R(); }
    const frame = cur(); const prev = frame.user; frame.user = 'root';
    const args = a.filter((x) => x !== '-E');
    try { return runSimple(args.map((v) => ({ t: 'w', v, g: false })), stdin, 1); } finally { frame.user = prev; }
  };
  C.exit = C.logout = () => { if (S.stack.length > 1) { S.stack.pop(); return R(['logout']); } return R(['logout'], 0, { exit: true }); };

  // ---------- 셸 기능 ----------
  C.history = (a) => { if (a[0] === '-c') { S.history = []; return R(); } return R(S.history.map((h, i) => `${lpad(i + 1, 5)}  ${h}`).slice(-(+a[0] || 1000))); };
  C.alias = (a) => {
    if (!a.length) return R(Object.entries(S.aliases).map(([k, v]) => `alias ${k}='${v}'`));
    a.forEach((x) => { const m = x.match(/^([^=]+)=(.*)$/); if (m) S.aliases[m[1]] = m[2]; });
    return R();
  };
  C.unalias = (a) => { a.forEach((x) => delete S.aliases[x]); return R(); };
  C.export = (a) => { a.forEach((x) => { const m = x.match(/^(\w+)=(.*)$/); if (m) S.env[m[1]] = m[2]; }); return R(); };
  C.env = () => R(['HOME', 'USER', 'LOGNAME', 'PWD', 'SHELL', 'HOSTNAME', 'PATH', 'LANG'].map((k) => `${k}=${envGet(k)}`).concat(Object.entries(S.env).map(([k, v]) => `${k}=${v}`)));
  C.printenv = (a) => (a[0] ? R([envGet(a[0])]) : C.env());
  const binPath = (n) => (['firewall-cmd', 'useradd', 'userdel', 'usermod', 'groupadd', 'setenforce', 'getenforce', 'sestatus', 'reboot', 'poweroff', 'shutdown', 'ip', 'ifconfig', 'ss', 'lsmod'].includes(n) ? `/usr/sbin/${n}` : `/usr/bin/${n}`);
  C.which = (a) => { const out = []; const err = []; a.forEach((n) => { if (S.aliases[n]) out.push(`alias ${n}='${S.aliases[n]}'`, `\t/usr/bin/${S.aliases[n].split(' ')[0]}`); else if (C[n] && !['cd', 'export', 'alias', 'history', 'exit', 'logout', 'unalias'].includes(n) && (!CMD_PKG[n] || installed(CMD_PKG[n]))) out.push(binPath(n)); else err.push(`/usr/bin/which: no ${n} in (${envGet('PATH')})`); }); return { out, err, code: err.length ? 1 : 0 }; };
  C.type = (a) => R(a.map((n) => (S.aliases[n] ? `${n} is aliased to \`${S.aliases[n]}'` : ['cd', 'echo', 'export', 'alias', 'history', 'exit', 'pwd', 'type'].includes(n) ? `${n} is a shell builtin` : C[n] ? `${n} is ${binPath(n)}` : `-bash: type: ${n}: not found`)));
  C.tee = (a, stdin) => {
    const app = a.includes('-a'); const err = [];
    a.filter((x) => !x.startsWith('-')).forEach((p) => { const e = writeFile(resolve(p), (stdin || []).join('\n'), app); if (e) err.push(`tee: ${e}`); });
    return { out: stdin || [], err, code: err.length ? 1 : 0 };
  };
  C.true = () => R(); C.false = () => E([], 1);
  C.sleep = () => R();
  C.vi = C.vim = (a) => E([`${a[0] ? `"${a[0]}" ` : ''}체험판에서는 편집기(vi/vim)를 지원하지 않아요.`, '대신 이렇게 파일을 써보세요:', '  echo "내용" > 파일       (덮어쓰기)', '  echo "내용" >> 파일      (뒤에 추가)'], 1);
  C.nano = () => E(['-bash: nano: command not found', { t: '(Rocky 최소 설치에는 nano가 없어요. 체험판은 echo > 파일 로 편집하세요)', c: 'dim' }], 127);
  C.yes = (a) => R(Array(10).fill(a[0] || 'y'));
  C.cal = () => { const d = kst(); const y = d.getUTCFullYear(); const m = d.getUTCMonth(); const first = new Date(Date.UTC(y, m, 1)).getUTCDay(); const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); const names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']; const out = [`${names[m]} ${y}`.padStart(13 + Math.floor(`${names[m]} ${y}`.length / 2)), 'Su Mo Tu We Th Fr Sa']; let row = '   '.repeat(first); for (let i = 1; i <= days; i++) { row += lpad(i, 2) + ' '; if ((first + i) % 7 === 0) { out.push(row.trimEnd()); row = ''; } } if (row) out.push(row.trimEnd()); return R(out); };
  C.reboot = C.poweroff = C.shutdown = C.halt = C.init = (a) => {
    if (!isRoot()) return E(['Failed to set wall message, ignoring: Interactive authentication required.', 'Call to Reboot failed: Interactive authentication required.']);
    if (a.includes('-c')) return R();
    Object.values(S.services).forEach((s) => { s.active = s.enabled && installed(s.pkg); if (s.active && !s.pid) s.pid = 2000 + Math.floor(Math.random() * 3000); });
    S.fw.services = [...S.fw.pServices]; S.fw.ports = [...S.fw.pPorts];
    const cfg = (S.fs.children.etc.children.selinux.children.config.content.match(/^SELINUX=(\w+)/m) || [])[1] || 'enforcing';
    S.selinux = cfg === 'disabled' ? 'Disabled' : cfg === 'permissive' ? 'Permissive' : 'Enforcing';
    S.stack = [{ user: S.base, cwd: `/home/${S.base}` }]; S.journal = []; S.boots++; S.bootAt = Date.now();
    Object.values(S.services).forEach((s) => { if (s.active) s.since = Date.now(); });
    return R([`Connection to ${S.hostname} closed by remote host.`], 0, { reboot: true });
  };
  C['tn-reset'] = () => ({ out: [], err: [], code: 0, ask: { prompt: '모든 파일·설정을 처음 상태로 되돌릴까요? [y/N]: ', handle: (x) => { if (!/^y/i.test(x)) return E('취소했어요.'); S = fresh(); syncPasswd(); return R(['초기화했어요.'], 0, { clear: true, reboot: true }); } } });

  function runScript(path, depth) {
    const parts = resolve(path); const n = getNode(parts);
    if (!n) return E(`-bash: ${path}: No such file or directory`, 127);
    if (n.type === 'dir') return E(`-bash: ${path}: Is a directory`, 126);
    if (!canRead(n)) return E(`-bash: ${path}: Permission denied`, 126);
    if (depth > 3) return E('-bash: 재귀 실행은 3단계까지만 돼요');
    const out = []; let code = 0;
    for (const line of n.content.split('\n')) {
      if (!line.trim() || line.trim().startsWith('#')) continue;
      const r = run(line, true, depth + 1);
      r.lines.forEach((l) => out.push(l)); code = S.last;
      if (r.exit) break;
    }
    return { out, err: [], code };
  }

  // ---------- 실행기 ----------
  function runSimple(words, stdin, depth) {
    let toks = words;
    if (toks[0] && S.aliases[toks[0].v]) toks = [...tokenize(S.aliases[toks[0].v]).toks.filter((t) => t.t === 'w'), ...toks.slice(1)];
    if (!toks.length) return R();
    const cmd = toks[0].v;
    const args = toks.slice(1).flatMap((t) => (t.g ? glob(t.v) : [t.v]));
    if (/^\w+=/.test(cmd) && !args.length) { const m = cmd.match(/^(\w+)=(.*)$/); S.env[m[1]] = m[2]; return R(); }
    if (cmd.includes('/')) {
      const n = getNode(resolve(cmd));
      if (n && n.type === 'file' && !/x/.test(modeStr(n).slice(1, 10))) return E(`-bash: ${cmd}: Permission denied`, 126);
      return runScript(cmd, depth);
    }
    if ((cmd === 'bash' || cmd === 'sh') && args[0] === '-c') { const r = run(args[1] || '', true, depth + 1); return { out: r.lines, err: [], code: S.last }; }
    if ((cmd === 'bash' || cmd === 'sh' || cmd === 'source' || cmd === '.') && args[0]) return runScript(args[0], depth);
    if (cmd === 'bash' || cmd === 'sh') return R([{ t: '(새 셸 대신 현재 셸을 계속 사용해요)', c: 'dim' }]);
    if (CMD_PKG[cmd] && !installed(CMD_PKG[cmd])) return E(`-bash: ${cmd}: command not found`, 127);
    const fn = Object.prototype.hasOwnProperty.call(C, cmd) ? C[cmd] : null;
    if (!fn) return E(`-bash: ${cmd}: command not found`, 127);
    try { return fn(args, stdin); } catch (e) { return E(`${cmd}: 내부 오류 (${e.message})`); }
  }

  function run(line, nested = false, depth = 0) {
    const tk = tokenize(line);
    if (tk.error) { S.last = 2; return { lines: [{ t: `-bash: ${tk.error}`, c: 'err' }] }; }
    const lines = []; const flags = {};
    // && || ; 로 분리
    const chain = []; let curList = []; let op = ';';
    tk.toks.forEach((t) => { if (t.t === 'o' && ['&&', '||', ';'].includes(t.v)) { chain.push([op, curList]); curList = []; op = t.v; } else curList.push(t); });
    chain.push([op, curList]);
    for (const [cop, toks] of chain) {
      if (!toks.length) continue;
      if (cop === '&&' && S.last !== 0) continue;
      if (cop === '||' && S.last === 0) continue;
      // | 로 분리
      const segs = [[]]; toks.forEach((t) => (t.t === 'o' && t.v === '|' ? segs.push([]) : segs[segs.length - 1].push(t)));
      let stdin = null; let res = R();
      for (let i = 0; i < segs.length; i++) {
        const seg = segs[i]; const words = []; let redir = null; let errNull = false;
        for (let k = 0; k < seg.length; k++) {
          const t = seg[k];
          if (t.t === 'o' && (t.v === '>' || t.v === '>>')) { const nx = seg[++k]; if (!nx || nx.t !== 'w') { S.last = 2; lines.push({ t: "-bash: syntax error near unexpected token `newline'", c: 'err' }); return { lines }; } redir = [t.v, nx.v]; }
          else if (t.t === 'o' && t.v === '2>') { const nx = seg[++k]; if (nx && nx.v === '/dev/null') errNull = true; else if (nx && nx.v === '&1') errNull = false; }
          else words.push(t);
        }
        if (!words.length && !redir) { S.last = 2; lines.push({ t: "-bash: syntax error near unexpected token `|'", c: 'err' }); return { lines }; }
        piping = i < segs.length - 1 || !!redir;
        res = words.length ? runSimple(words, stdin, depth) : R();
        piping = false;
        Object.assign(flags, { clear: res.clear || flags.clear, exit: res.exit || flags.exit, reboot: res.reboot || flags.reboot, ask: res.ask || flags.ask });
        if (res.clear) lines.length = 0;
        const pushErr = () => { if (!errNull) res.err.forEach((l) => lines.push(typeof l === 'string' ? { t: l, c: 'err' } : l)); };
        if (redir || i < segs.length - 1) pushErr();
        if (redir) {
          if (redir[1] === '/dev/null') { stdin = []; continue; }
          const text = res.out.map((l) => (typeof l === 'string' ? l : Array.isArray(l) ? l.map((s) => s.t).join('') : l.t)).join('\n');
          const e = writeFile(resolve(redir[1]), text, redir[0] === '>>');
          if (e) { lines.push({ t: `-bash: ${e}`, c: 'err' }); res.code = 1; }
          stdin = [];
        } else if (i < segs.length - 1) {
          stdin = res.out.map((l) => (typeof l === 'string' ? l : Array.isArray(l) ? l.map((s) => s.t).join('') : l.t));
        } else { res.out.forEach((l) => lines.push(l)); pushErr(); }
      }
      S.last = res.code;
      if (flags.exit || flags.ask) break;
    }
    void nested;
    return { lines, ...flags };
  }

  // ---------- 공개 API ----------
  return {
    prompt() {
      if (pending) return pending.prompt;
      const c = cur(); const h = homeOf(c.user);
      const dir = c.cwd === h ? '~' : c.cwd === '/' ? '/' : c.cwd.split('/').pop();
      return `[${c.user}@${S.hostname} ${dir}]${c.user === 'root' ? '#' : '$'} `;
    },
    isMasked() { return !!(pending && pending.mask); },
    isRoot,
    exec(input) {
      if (pending) {
        const p = pending; pending = null;
        const r = p.handle(input);
        const lines = [...(r.out || []), ...(r.err || []).map((l) => (typeof l === 'string' ? { t: l, c: 'err' } : l))];
        if (r.ask) pending = r.ask;
        S.last = r.code;
        return { lines, clear: r.clear, reboot: r.reboot, exit: r.exit };
      }
      let line = input.replace(/\s+$/, '');
      if (line.trim() === '!!') { line = S.history[S.history.length - 1] || ''; if (!line) return { lines: [{ t: '-bash: !!: event not found', c: 'err' }] }; }
      if (line.trim()) { S.history.push(line); if (S.history.length > 500) S.history.shift(); }
      const r = run(line);
      if (r.ask) pending = r.ask;
      return r;
    },
    complete(input) {
      const m = input.match(/^(.*?)([^\s]*)$/); const before = m[1]; const word = m[2];
      const first = !before.trim() || /(\||&&|;|sudo)\s*$/.test(before);
      let cands;
      if (first && !word.includes('/')) cands = [...Object.keys(C).filter((c) => !CMD_PKG[c] || installed(CMD_PKG[c])), ...Object.keys(S.aliases)].filter((c) => c.startsWith(word)).map((c) => c + ' ');
      else if (/(?:^|\s)(systemctl|service)\s+\S+\s+$/.test(before)) cands = Object.keys(S.services).filter((s) => installed(S.services[s].pkg) && s.startsWith(word)).map((s) => s + ' ');
      else {
        const slash = word.lastIndexOf('/'); const dirW = slash >= 0 ? word.slice(0, slash + 1) : ''; const part = word.slice(slash + 1);
        const dir = getNode(resolve(dirW || '.'));
        if (!dir || dir.type !== 'dir' || !canRead(dir)) return null;
        cands = Object.keys(dir.children).filter((n) => n.startsWith(part) && (part.startsWith('.') || !n.startsWith('.'))).map((n) => dirW + n + (dir.children[n].type === 'dir' ? '/' : ' '));
      }
      if (!cands.length) return null;
      if (cands.length === 1) return { value: before + cands[0] };
      let pre = cands[0]; cands.forEach((c) => { while (!c.startsWith(pre)) pre = pre.slice(0, -1); });
      return { value: before + pre, options: cands.map((c) => c.trim().split('/').filter(Boolean).pop() + (c.endsWith('/') ? '/' : '')) };
    },
    history() { return S.history; },
    motd() {
      return [
        `Last login: ${dateStr().replace(' KST', '')} from 192.168.10.2`,
        { t: 'Activate the web console with: systemctl enable --now cockpit.socket', c: 'dim' },
      ];
    },
    serialize() { return S; },
  };
}
