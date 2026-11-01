# TerminalNexus 홍보 계획

돈을 쓰지 않고 사람을 데려오는 방법을 효과가 오래가는 순서로 정리했다.
공개 게시는 운영자 이름으로 나가므로 사람이 내용을 확인하고 올린다. 같은 글을 여러 곳에 반복해서 올리지 않는다.
실명, 이메일, 지역, 직장, 집 네트워크 정보는 어떤 글에도 넣지 않는다.

## 자동으로 되는 것

| 항목 | 내용 |
|---|---|
| 페이지별 HTML | 빌드할 때 공개 페이지마다 제목과 본문을 생성 |
| sitemap.xml, rss.xml | 글을 추가하면 자동 갱신 |
| IndexNow | 배포할 때 바뀐 페이지만 검색엔진에 알림 |
| 공유 버튼 | 글, 도구, 모의고사 결과. 휴대폰에서는 카카오톡 등 기기 공유창이 열림 |

## 한 번만 하면 되는 것

- Google Search Console: `sitemap.xml` 제출
- 네이버 서치어드바이저: `sitemap.xml` 제출, 요청 메뉴에서 RSS `https://tnhub.kr/rss.xml` 제출
- Bing Webmaster Tools: Search Console 가져오기
- GitHub 저장소: 소개와 Website 칸에 `https://tnhub.kr` 입력

## 커뮤니티에 올릴 때의 원칙

- 링크만 던지지 않는다. 본문만 읽어도 도움이 되게 쓰고 링크는 마지막에 하나만 둔다.
- 각 커뮤니티의 홍보 규칙을 먼저 읽는다. 금지된 곳에는 올리지 않는다.
- 첫 게시 전에 그곳에서 질문이나 답변으로 활동한다.
- 답글 알바, 자작 추천, 다중 계정은 쓰지 않는다. 계정 정지와 검색 불이익의 위험이 있다.
- 광고를 눌러 달라고 부탁하지 않는다. 애드센스 정책 위반이다.

## 올릴 곳

| 곳 | 무엇을 올릴까 | 주의 |
|---|---|---|
| OKKY, 개발자 커뮤니티 | 운영 경험담 | 사이드 프로젝트 게시판 규칙 확인 |
| velog, 티스토리, 브런치 | 사이트의 글을 다른 각도로 다시 쓴 글 | 복사하면 중복 문서가 된다. 원문 링크를 표시 |
| GeekNews (news.hada.io) | 자체 호스팅 경험담 | 기술 내용 중심 |
| Reddit r/selfhosted, r/homelab | 라즈베리파이 운영기 영어 글 | 자기 홍보 비율 규칙 확인 |
| 리눅스마스터 관련 카페, 오픈채팅 | 무료 문제 안내 | 운영진 허가 후 |
| GitHub | README 정리, Topics 추가 | 공개 저장소일 때 |

## 게시글 초안

### 1. 개발자 커뮤니티 (사이드 프로젝트)

제목: 라즈베리파이 한 대로 웹서비스를 운영하면서 배운 것

```
라즈베리파이 한 대로 Spring Boot, React, MySQL, Jenkins, nginx를 올려 개인 사이트를 운영하고 있습니다.
직접 운영해 보니 책으로는 몰랐던 일이 많았습니다.

- 사이트를 만들어도 검색엔진에는 모든 페이지가 같은 제목의 빈 화면으로 보였습니다.
  빌드할 때 페이지별 HTML을 생성해서 해결했습니다.
- 게시판 에디터의 HTML 정화가 꺼져 있어 저장형 XSS가 가능했습니다.
  직접 공격 문자열을 넣어 보기 전에는 몰랐습니다.
- nginx 폴더 구조 때문에 전 페이지가 301 리다이렉트되는 실수도 시험 서버에서 잡았습니다.

운영하면서 정리한 글과 서브넷, cron, JWT 같은 무료 도구는 여기에 모아 두었습니다.
https://tnhub.kr/learn

비슷하게 자체 호스팅을 하시는 분들은 어떻게 관리하시는지 궁금합니다.
```

### 2. 리눅스마스터 준비 커뮤니티

제목: 리눅스마스터 2급 무료 연습 문제를 만들었습니다

```
공부하면서 과목별로 바로 해설을 볼 수 있는 곳이 있으면 좋겠다고 생각해서 직접 만들었습니다.
가입 없이 문제를 풀 수 있고, 문제마다 해설이 나옵니다. 실제 기출이 아니라 제가 쓴 연습 문제입니다.

틀린 내용이나 개선할 점을 알려 주시면 고치겠습니다.
https://tnhub.kr/cert
```

### 3. X, 짧은 글

```
JSON, JWT, 정규식, 타임스탬프, 해시 도구를 한곳에 모았습니다.
전부 브라우저에서만 처리해서 입력값이 서버로 가지 않습니다.
https://tnhub.kr/tools
```

### 4. Reddit r/selfhosted (영어)

제목: What I learned running a full web app on a single Raspberry Pi

```
I run a Spring Boot, React and MySQL site from a single Raspberry Pi, with Jenkins deploying on every push.
Three surprises so far: crawlers saw every page as the same empty shell until I generated HTML at build time,
a disabled sanitizer in my editor allowed stored XSS, and a trailing-slash redirect nearly broke my canonicals.

Happy to share the nginx rate limiting and deployment setup if anyone is interested.
```

링크는 본문에 넣지 말고, 물어보는 사람이 있으면 댓글로 답한다. 게시 전에 해당 서브레딧 규칙을 확인한다.

## 사이트 안에서 재방문을 만드는 것

- 로또: 토요일 결과 알림이 매주 돌아올 이유가 된다. 번호 저장을 안내한다.
- 자격증: 오답노트와 모의고사 결과 공유
- 새 글: 일주일에 1~2편. `docs/MONETIZATION.md`의 후보를 참고한다.
