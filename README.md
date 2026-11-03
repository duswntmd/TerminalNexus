# TerminalNexus

리눅스와 서버를 배우는 사람을 위한 사이트입니다. 서버 학습 글, 개발·인프라 도구, 리눅스마스터 2급 연습 문제를 중심으로 커뮤니티와 터미널 테마의 미니게임을 함께 제공합니다.
라즈베리파이 한 대로 직접 운영합니다.

**사이트: [tnhub.kr](https://tnhub.kr)**

![Java](https://img.shields.io/badge/Java-21-ED8B00?logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5.4-6DB33F?logo=springboot&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql&logoColor=white)

| 바로가기 | 내용 |
|---|---|
| [서버 학습 글](https://tnhub.kr/learn) | 서브넷, RAID, cron, nginx, systemd, SSH 보안과 실제 운영 기록 |
| [개발·인프라 도구](https://tnhub.kr/tools) | JSON, Base64, JWT, 타임스탬프, 정규식, 해시, 서브넷, RAID, cron, chmod, nginx 설정 생성 |
| [리눅스마스터 2급 연습](https://tnhub.kr/cert) | 과목별 문제와 해설, 모의고사, 오답노트 |
| [로또 6/45](https://tnhub.kr/lotto) | 회차별 당첨번호와 통계, 내 번호 저장과 결과 알림 |

## 주요 기능

### 학습과 도구

| 기능 | 주소 | 설명 |
|---|---|---|
| 서버 학습 글 | `/learn` | 명령어 예제가 있는 글 14편. 검색엔진용 정적 HTML과 RSS를 빌드할 때 생성 |
| 개발·인프라 도구 | `/tools` | 12종. 모두 브라우저에서만 처리하고 입력값을 서버로 보내지 않음 |
| 리눅스마스터 2급 연습 | `/cert` | 3과목 150문항. 무료 문제와 미니 모의고사, 이용권으로 전체 문제와 오답노트 (결제는 기본 꺼짐) |
| 리눅스 실습 | `/play/linux` | 브라우저에서 동작하는 Rocky Linux 9.6 셸 체험 |

### 커뮤니티 (로그인 필요)

| 기능 | 주소 | 설명 |
|---|---|---|
| 자유게시판 | `/freeboard` | Toast UI 마크다운 에디터, 이미지·영상 업로드, 좋아요, 댓글과 대댓글 |
| 실시간 채팅 | `/chat` | WebSocket(STOMP) 전체 채팅, 익명 채팅, 귓속말(`/w`, `/r`) |
| 과일 AI | `/fruit-ai` | Gemini API와 RAG로 과일 효능 질의응답 |

### 놀이

| 기능 | 주소 | 설명 |
|---|---|---|
| 모의 주식 | `/play/stock` | 가상 머니로 실시간 시세 매매, 캔들 차트 |
| 장기 | `/play/janggi` | AI 대국과 온라인 대국 |
| 강화 | `/forge` | 무기 강화 시뮬레이터와 랭킹 |
| 타자 게임 | `/play/typeracer` | 실무 명령어 타자 레이스 |
| 터미널 해킹, 해커 모드 | `/play/terminalhack`, `/play/hackermode` | 터미널 테마 미니게임 |
| 로또 | `/lotto` | 동행복권 당첨번호 자동 갱신, 통계, 번호 생성, 저장한 번호의 결과 알림 |

### 공통

- 회원가입과 로그인: JWT(액세스·리프레시 토큰), Google·Naver OAuth2
- 한국어와 영어 (i18next)
- 후원: PortOne 결제

## 기술 스택

| 영역 | 사용 기술 |
|---|---|
| Backend | Java 21, Spring Boot 3.5.4, Spring Security, JJWT 0.12, OAuth2 Client, Spring Data JPA, QueryDSL, MyBatis, WebSocket(STOMP), Spring Mail |
| Frontend | React 19, Vite, MUI 7, React Router 7, i18next, react-helmet-async, Toast UI Editor, DOMPurify, Lightweight Charts, SockJS·STOMP.js |
| Database | MySQL 8 |
| 외부 API | Google Gemini, PortOne, 동행복권 당첨번호 |
| 인프라 | Raspberry Pi (Ubuntu), Docker, Jenkins, nginx, Let's Encrypt |

## 구조

```
TerminalNexus/
├── src/main/java/kr/pe/tn/
│   ├── api/          REST 컨트롤러
│   ├── config/       Security, WebSocket 등 설정
│   ├── domain/       기능별 도메인 (cert, chat, donation, forge, freeboard,
│   │                 fruit, janggi, jwt, lotto, stock, typeracer, user)
│   ├── filter/       JWT, 로그인 필터
│   └── handler/      예외·WebSocket 처리
├── src/main/resources/
│   ├── application.properties
│   └── cert/         자격증 문제 은행 (서버에만 있음)
├── frontend/
│   ├── src/
│   │   ├── pages/    화면 (learn, tools, cert, lotto, freeboard, play 등)
│   │   ├── content/  학습 글 원문
│   │   ├── locales/  한국어·영어 문구
│   │   └── nav.js    메뉴 정의
│   └── scripts/      빌드 후 처리 (사전 렌더링, IndexNow)
├── nginx/tnhub.conf  운영 nginx 설정 (배포 때 자동 적용)
├── Jenkinsfile       CI/CD 파이프라인
└── docs/             운영 문서
```

## 로컬에서 실행하기

필요한 것: Java 21, Node.js 20 이상, MySQL 8

### 1. 데이터베이스

```sql
CREATE DATABASE tn CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'tn'@'localhost' IDENTIFIED BY '비밀번호';
GRANT ALL PRIVILEGES ON tn.* TO 'tn'@'localhost';
```

테이블은 JPA가 시작할 때 만듭니다 (`ddl-auto=update`).

### 2. 환경 변수

프로젝트 루트에 `.env` 파일을 만듭니다. `spring-dotenv`가 자동으로 읽고, Git에는 올라가지 않습니다.

```env
DB_PASSWORD=비밀번호
ADMIN_PASSWORD=관리자_초기_비밀번호
GEMINI_API_KEY=선택
NAVER_CLIENT_SECRET=선택
GOOGLE_CLIENT_SECRET=선택
```

전체 목록은 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#환경-변수)에 있습니다.

### 3. 실행

```bash
./mvnw spring-boot:run          # 백엔드 http://localhost:8080
```

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev                     # 프론트엔드 http://localhost:5173
```

`npm run build`는 Vite 빌드 뒤 `scripts/prerender.mjs`로 공개 페이지의 정적 HTML, `sitemap.xml`, `rss.xml`을 만듭니다.

## 문서

| 문서 | 내용 |
|---|---|
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | 배포 파이프라인, 환경 변수, nginx, 운영 점검 |
| [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | 실제로 겪은 장애와 해결 기록 |
| [docs/FRUIT_AI.md](docs/FRUIT_AI.md) | 과일 AI(RAG) 구조 |
| [docs/PORTONE_INTEGRATION.md](docs/PORTONE_INTEGRATION.md) | PortOne 결제 연동 기록 |
| [docs/MONETIZATION.md](docs/MONETIZATION.md), [docs/PROMOTION.md](docs/PROMOTION.md) | 광고 수익과 홍보 계획 |
| [docs/HANDOFF.md](docs/HANDOFF.md) | 진행 중인 작업과 남은 일 |

## 만든 사람

에고수 · [사이트 소개](https://tnhub.kr/about)
