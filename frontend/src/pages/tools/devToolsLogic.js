// 개발자 도구 계산 로직. 입력값은 브라우저 밖으로 나가지 않는다.

/* ── JSON ── */

/** 문자열 밖의 숫자 중 JSON.parse를 거치면 값이 바뀌는 것이 있는지 확인 */
const hasUnsafeNumber = (text) => {
  const tokens = text.replace(/"(?:[^"\\]|\\.)*"/g, '""').match(/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g) || [];
  return tokens.some((token) => {
    const digits = token.split(/[eE]/)[0].replace(/[-.]/g, '').replace(/^0+/, '').replace(/0+$/, '');
    return digits.length > 15 && !(Number.isSafeInteger(Number(token)) && /^-?\d+$/.test(token));
  });
};

const sortDeep = (value) => {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((k) => [k, sortDeep(value[k])]));
  }
  return value;
};

/** "at position 12" 형태의 오류 메시지를 줄·칸으로 바꾼다 */
const errorPosition = (message, text) => {
  const m = /line (\d+) column (\d+)/.exec(message);
  if (m) return { line: Number(m[1]), column: Number(m[2]) };
  const p = /position (\d+)/.exec(message);
  if (!p) return null;
  const before = text.slice(0, Number(p[1])).split('\n');
  return { line: before.length, column: before[before.length - 1].length + 1 };
};

/** indent 0이면 한 줄로 압축 */
export const formatJson = (text, { indent = 2, sort = false } = {}) => {
  if (!text.trim()) return null;
  try {
    const value = JSON.parse(text);
    return {
      output: JSON.stringify(sort ? sortDeep(value) : value, null, indent),
      unsafeNumber: hasUnsafeNumber(text),
    };
  } catch (e) {
    return { error: true, position: errorPosition(e.message, text) };
  }
};

/* ── Base64, URL ── */

const bytesToBinary = (bytes) => {
  let out = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    out += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return out;
};

export const encodeBase64 = (text, urlSafe = false) => {
  const b64 = btoa(bytesToBinary(new TextEncoder().encode(text)));
  return urlSafe ? b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : b64;
};

const base64ToBytes = (text) => {
  const clean = text.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
  if (!/^[A-Za-z0-9+/]*$/.test(clean) || clean.length % 4 === 1) return null;
  return Uint8Array.from(atob(clean.padEnd(Math.ceil(clean.length / 4) * 4, '=')), (c) => c.charCodeAt(0));
};

/** 일반형과 URL 안전형을 모두 받는다. 형식 오류면 null, 글자가 아닌 데이터면 binary 표시 */
export const decodeBase64 = (text) => {
  const bytes = base64ToBytes(text);
  if (!bytes) return null;
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes) };
  } catch {
    return { binary: true, size: bytes.length };
  }
};

export const encodeUrl = (text) => encodeURIComponent(text);

/** 잘못된 % 표기면 null */
export const decodeUrl = (text, plusAsSpace = true) => {
  try {
    return decodeURIComponent(plusAsSpace ? text.replace(/\+/g, ' ') : text);
  } catch {
    return null;
  }
};

/* ── JWT ── */

const decodeJwtPart = (part) => {
  const decoded = decodeBase64(part);
  if (!decoded || decoded.binary) return null;
  try {
    const value = JSON.parse(decoded.text);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
};

const claimTime = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null);

/** 서명은 검증하지 않고 내용만 읽는다. 형식이 틀리면 null */
export const decodeJwt = (input, nowMs = Date.now()) => {
  const parts = input.trim().replace(/^Bearer\s+/i, '').split('.');
  if (parts.length !== 3 || !parts[0] || !parts[1]) return null;
  const header = decodeJwtPart(parts[0]);
  const payload = decodeJwtPart(parts[1]);
  if (!header || !payload) return null;
  const exp = claimTime(payload.exp);
  const nbf = claimTime(payload.nbf);
  let status = 'none';
  if (exp !== null && exp * 1000 <= nowMs) status = 'expired';
  else if (nbf !== null && nbf * 1000 > nowMs) status = 'notyet';
  else if (exp !== null) status = 'valid';
  return {
    header, payload, status, exp, nbf,
    iat: claimTime(payload.iat),
    unsigned: !parts[2] || String(header.alg).toLowerCase() === 'none',
  };
};

/* ── 타임스탬프 ── */

const MAX_MS = 8.64e15;
const pad = (n, size = 2) => String(n).padStart(size, '0');

/** 숫자는 자릿수로 초·밀리초를 구분하고, 그 외는 날짜 문자열로 읽는다 */
export const parseTimestamp = (input) => {
  const text = input.trim();
  if (!text) return null;
  if (/^-?\d+(\.\d+)?$/.test(text)) {
    const n = Number(text);
    const unit = Math.abs(n) >= 1e11 ? 'ms' : 's';
    const ms = unit === 'ms' ? n : n * 1000;
    return Math.abs(ms) <= MAX_MS ? { ms: Math.trunc(ms), unit } : null;
  }
  const ms = new Date(text.includes(' ') && !/[a-z]{3}/i.test(text) ? text.replace(' ', 'T') : text).getTime();
  return Number.isNaN(ms) ? null : { ms, unit: 'date' };
};

const inOffset = (ms, offsetMinutes) => {
  const d = new Date(ms + offsetMinutes * 60000);
  return `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
};

export const timestampInfo = (ms) => ({
  seconds: Math.floor(ms / 1000),
  millis: ms,
  iso: new Date(ms).toISOString(),
  utc: inOffset(ms, 0),
  kst: inOffset(ms, 9 * 60),
  local: inOffset(ms, -new Date(ms).getTimezoneOffset()),
});

/* ── 정규식 ── */

export const REGEX_FLAGS = ['g', 'i', 'm', 's', 'u'];

/** 패턴 오류면 error. 매치는 limit개까지만 돌려준다 */
export const testRegex = (pattern, flags, text, limit = 500) => {
  let regex;
  try {
    regex = new RegExp(pattern, flags.includes('g') ? flags : `${flags}g`);
  } catch (e) {
    return { error: e.message };
  }
  const single = !flags.includes('g');
  const matches = [];
  let truncated = false;
  for (let m = regex.exec(text); m; m = regex.exec(text)) {
    matches.push({ index: m.index, text: m[0], groups: m.slice(1), named: m.groups ? { ...m.groups } : null });
    if (m[0] === '') { // 빈 매치에서 멈추지 않도록. u 모드는 이모지 가운데로 들어가면 제자리로 돌아온다
      const code = regex.unicode ? text.codePointAt(regex.lastIndex) : 0;
      regex.lastIndex += code > 0xffff ? 2 : 1;
    }
    if (single) break;
    if (matches.length >= limit) {
      truncated = regex.exec(text) !== null;
      break;
    }
  }
  return { matches, truncated };
};

/** 입력을 매치·비매치 구간으로 나눈다 (화면 강조용) */
export const regexSegments = (text, matches) => {
  const out = [];
  let at = 0;
  for (const m of matches) {
    if (m.text === '') continue;
    if (m.index > at) out.push({ text: text.slice(at, m.index) });
    out.push({ text: m.text, match: true });
    at = m.index + m.text.length;
  }
  if (at < text.length) out.push({ text: text.slice(at) });
  return out;
};

/* ── 해시 ── */

const MD5_SHIFT = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
const MD5_K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32));

/** WebCrypto에 MD5가 없어 직접 계산한다 (파일 체크섬 비교용) */
export const md5 = (bytes) => {
  const padded = new Uint8Array((((bytes.length + 8) >>> 6) + 1) * 64);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, (bytes.length * 8) >>> 0, true);
  view.setUint32(padded.length - 4, Math.floor(bytes.length / 2 ** 29), true);

  let [a0, b0, c0, d0] = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476];
  const M = new Uint32Array(16);
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i += 1) M[i] = view.getUint32(offset + i * 4, true);
    let [a, b, c, d] = [a0, b0, c0, d0];
    for (let i = 0; i < 64; i += 1) {
      const round = i >>> 4;
      let f;
      let g;
      if (round === 0) { f = (b & c) | (~b & d); g = i; }
      else if (round === 1) { f = (d & b) | (~d & c); g = (5 * i + 1) % 16; }
      else if (round === 2) { f = b ^ c ^ d; g = (3 * i + 5) % 16; }
      else { f = c ^ (b | ~d); g = (7 * i) % 16; }
      const sum = (a + f + MD5_K[i] + M[g]) >>> 0;
      const s = MD5_SHIFT[round * 4 + (i % 4)];
      a = d;
      d = c;
      c = b;
      b = (b + ((sum << s) | (sum >>> (32 - s)))) >>> 0;
    }
    a0 = (a0 + a) >>> 0;
    b0 = (b0 + b) >>> 0;
    c0 = (c0 + c) >>> 0;
    d0 = (d0 + d) >>> 0;
  }
  const out = new DataView(new ArrayBuffer(16));
  [a0, b0, c0, d0].forEach((v, i) => out.setUint32(i * 4, v, true));
  return toHex(out.buffer);
};

const toHex = (buffer) => [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');

export const HASH_ALGOS = ['MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];

export const hashBytes = async (bytes, algo) => (
  algo === 'MD5' ? md5(bytes) : toHex(await crypto.subtle.digest(algo, bytes))
);

export const hashAll = async (bytes) => Object.fromEntries(
  await Promise.all(HASH_ALGOS.map(async (algo) => [algo, await hashBytes(bytes, algo)])),
);

/** 대소문자·앞뒤 공백·"sha256:" 접두어를 무시하고 비교 */
export const matchHash = (hashes, expected) => {
  const clean = expected.trim().toLowerCase().replace(/^[a-z0-9-]+:/, '');
  if (!clean) return null;
  return Object.keys(hashes).find((algo) => hashes[algo] === clean) || false;
};
