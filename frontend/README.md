# TerminalNexus 프론트엔드

React 19와 Vite로 만든 화면입니다. 프로젝트 전체 설명은 [루트 README](../README.md)를 보세요.

## 명령

```bash
npm install --legacy-peer-deps   # 의존성 설치
npm run dev                      # 개발 서버 http://localhost:5173 (API는 8080으로 프록시)
npm run build                    # 빌드 + 사전 렌더링 → dist/
npm run lint                     # ESLint
```

## 폴더

| 경로 | 내용 |
|---|---|
| `src/pages/` | 화면. 기능별 폴더 (`learn`, `tools`, `cert`, `lotto`, `freeboard`, `play` 등) |
| `src/components/` | 공통 컴포넌트 (헤더, 푸터, 광고 자리, 공유 버튼) |
| `src/content/articles.js` | 학습 글 원문. 화면과 사전 렌더링이 함께 씀 |
| `src/locales/` | 한국어·영어 문구 |
| `src/nav.js` | 메뉴 정의. 헤더, 모바일 메뉴, 메인, 푸터가 함께 씀 |
| `src/util/sanitizeHtml.js` | 게시글 HTML 정화 (스크립트 제거, 유튜브 임베드만 허용) |
| `scripts/prerender.mjs` | 빌드 뒤 공개 페이지 HTML, `sitemap.xml`, `rss.xml` 생성 |
| `scripts/indexnow.mjs` | 배포 때 바뀐 페이지를 검색엔진에 알림 (Jenkins 전용) |

## 학습 글 추가

`src/content/articles.js`의 배열에 항목을 추가하면 화면, 목록, sitemap, RSS가 함께 갱신됩니다.

```js
{
  slug: 'url-path',              // /learn/url-path
  title: '제목',
  desc: '검색 결과에 나올 한 줄 설명',
  date: '2026-11-01',
  tool: 'nginx',                 // 글 끝에 연결할 도구 id
  body: [
    { p: '문단' },
    { h: '소제목' },
    { code: 'sudo nginx -t' },
    { list: ['항목 1', '항목 2'] },
  ],
}
```

## 주의

- `.env`의 `VITE_` 값은 빌드된 화면에 그대로 들어갑니다. 비밀값을 넣지 마세요.
- 공개 페이지를 추가하면 `scripts/prerender.mjs`에도 등록해야 검색엔진이 내용을 읽을 수 있습니다.
