import { fetchWithAccessRaw } from '../../util/fetchUtil';

/** 비로그인 허용 API: 토큰이 있으면 붙이고, 만료됐으면 토큰 없이 다시 요청 (로그인 페이지로 보내지 않음) */
export const publicFetch = async (url, options = {}) => {
  const token = localStorage.getItem('accessToken');
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401 && token) {
    delete headers.Authorization;
    return fetch(url, { ...options, headers });
  }
  return res;
};

const readError = async (res) => (await res.json().catch(() => ({}))).message || `HTTP ${res.status}`;

/** 로그인 필요 API. 실패하면 서버 메시지를 담은 Error */
export const authJson = async (url, options) => {
  const res = await fetchWithAccessRaw(url, options);
  if (!res.ok) throw new Error(await readError(res));
  return res.status === 204 ? null : res.json();
};

export const postJson = (url, body) => authJson(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body ?? {}),
});

export const checkAnswer = async (questionId, choice) => {
  const res = await publicFetch('/api/cert/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionId, choice }),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
};

export const formatTime = (sec) => {
  const s = Math.max(0, sec);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
