// 이 사이트 서버(/api/lol/*)를 거쳐 Riot API 를 부른다. 키는 서버에만 있다.
import { useEffect, useState } from 'react';
import { loadStatic } from './ddragon';

export const BASE = '/games/lol';

export async function lolGet(path) {
  const r = await fetch(`/api/lol/${path}`);
  let body = null;
  try { body = await r.json(); } catch { /* 본문 없음 */ }
  if (!r.ok) {
    const e = new Error(body?.message || `요청 실패 (${r.status})`);
    e.status = r.status;
    throw e;
  }
  return body;
}

/** Data Dragon 정적 데이터 */
export function useStatic() {
  const [s, setS] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    let alive = true;
    loadStatic().then((v) => alive && setS(v)).catch(() => alive && setErr('게임 데이터를 불러오지 못했습니다.'));
    return () => { alive = false; };
  }, []);
  return [s, err];
}

// ---------- 주소 ↔ Riot ID ----------
// /games/lol/summoner/kr/Hide on bush-KR1  (마지막 '-' 뒤가 태그)
export const summonerPath = (platform, name, tag) => `${BASE}/summoner/${platform}/${encodeURIComponent(`${name}-${tag}`)}`;
export function parseRiotId(slug = '') {
  const s = decodeURIComponent(slug);
  const i = s.lastIndexOf('-');
  return i > 0 ? { name: s.slice(0, i), tag: s.slice(i + 1) } : { name: s, tag: '' };
}
/** 검색창 입력 "이름#태그" (태그 생략 시 기본 태그) */
export function parseInput(text, defTag) {
  const t = text.trim();
  const i = t.lastIndexOf('#');
  if (i < 0) return { name: t, tag: defTag };
  return { name: t.slice(0, i).trim(), tag: t.slice(i + 1).trim() || defTag };
}

/** 로비 채팅이나 쉼표로 이은 이름에서 Riot ID 뽑기 */
export function parseLobby(text, defTag) {
  const out = [];
  for (let line of text.split(/[\n,]+/)) {
    line = line
      .replace(/님이 (로비|방)에 참가(했|하셨)습니다\.?.*$/, '')
      .replace(/\s*(joined the lobby|has joined the lobby|a rejoint le salon).*$/i, '')
      .replace(/님$/, '')
      .trim();
    if (!line) continue;
    const { name, tag } = parseInput(line.replace(/\s*#\s*/, '#'), defTag);
    if (name && name.length <= 32 && !out.some((x) => x.name.toLowerCase() === name.toLowerCase() && x.tag.toLowerCase() === tag.toLowerCase())) out.push({ name, tag });
  }
  return out.slice(0, 5);
}

// ---------- 최근 검색 ----------
const RECENT = 'lol.recent';
export function getRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT)) || []; } catch { return []; }
}
export function pushRecent(item) {
  try {
    const list = getRecent().filter((x) => !(x.platform === item.platform && x.name.toLowerCase() === item.name.toLowerCase() && x.tag.toLowerCase() === item.tag.toLowerCase()));
    localStorage.setItem(RECENT, JSON.stringify([item, ...list].slice(0, 8)));
  } catch { /* 저장 불가 환경 */ }
}
export function removeRecent(item) {
  try { localStorage.setItem(RECENT, JSON.stringify(getRecent().filter((x) => !(x.platform === item.platform && x.name === item.name && x.tag === item.tag)))); } catch { /* 무시 */ }
}

// ---------- 표시 ----------
export const kdaRatio = (k, d, a) => (d === 0 ? (k + a > 0 ? 'Perfect' : '0.00') : ((k + a) / d).toFixed(2));
export const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
export const fmtDur = (s) => `${Math.floor(s / 60)}분 ${String(s % 60).padStart(2, '0')}초`;
export function ago(t) {
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  return d < 30 ? `${d}일 전` : new Date(t).toLocaleDateString('ko-KR');
}
