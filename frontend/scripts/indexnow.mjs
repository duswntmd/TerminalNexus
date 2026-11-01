// 바뀐 페이지만 IndexNow로 검색엔진에 알린다. 배포 파이프라인 전용이고 실패해도 배포를 막지 않는다.
//   node indexnow.mjs list <운영 폴더> <새 dist>   바뀐 URL 출력 (파일 복사 전에 실행)
//   node indexnow.mjs send <URL 목록 파일>         전송 (파일 복사 후에 실행)
import fs from 'node:fs';
import path from 'node:path';

const HOST = 'tnhub.kr';
const KEY = '7c2d76c5d4cdea1d3b65901cd4f0f186';
const ENDPOINT = 'https://api.indexnow.org/indexnow';

const htmlFileOf = (dir, url) => {
  const p = new URL(url).pathname;
  return path.join(dir, p === '/' ? 'home.html' : `${p.slice(1)}.html`);
};

// 빌드마다 달라지는 자산 파일 이름은 비교에서 뺀다
const content = (file) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8').replace(/\/assets\/[^"']+/g, '') : null);

const list = (liveDir, distDir) => {
  const sitemap = fs.readFileSync(path.join(distDir, 'sitemap.xml'), 'utf8');
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  for (const url of urls) {
    if (content(htmlFileOf(liveDir, url)) !== content(htmlFileOf(distDir, url))) console.log(url);
  }
};

const send = async (listFile) => {
  const urlList = fs.readFileSync(listFile, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
  if (urlList.length === 0) {
    console.log('IndexNow: 바뀐 페이지 없음');
    return;
  }
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList }),
    signal: AbortSignal.timeout(20000),
  });
  console.log(`IndexNow: ${urlList.length}개 전송, 응답 ${res.status}`);
};

const [cmd, a, b] = process.argv.slice(2);
if (cmd === 'list') list(a, b);
else if (cmd === 'send') await send(a);
else throw new Error('사용법: indexnow.mjs list <운영 폴더> <dist> | send <목록 파일>');
