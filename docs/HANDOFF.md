# 작업 현황

이어서 작업할 때 먼저 읽는 문서입니다. 작업은 `dev`에서 하고, 운영 배포는 `main` 병합으로 합니다.

## 진행 중 (2026-11-03)

운영은 `main` `2df726c`(체스, ARC Raiders 정보 포함)이고 `dev`와 같은 내용이다.

섯다와 화투(고스톱 맞고)를 별도 세션에서 각자의 worktree 브랜치로 만드는 중이다.

| 게임 | 브랜치 | worktree | 주소 | 시험 포트 |
|---|---|---|---|---|
| 섯다 | `claude/seotda-game` | `.claude/worktrees/seotda-game` | `/play/seotda` | 18084, 5180 |
| 고스톱 맞고 | `claude/gostop-game` | `.claude/worktrees/gostop-game` | `/play/gostop` | 18085, 5181 |

두 세션이 끝나면 할 일:
1. 각 브랜치의 커밋과 검증 결과를 확인한다 (족보·점수 단위 테스트, AI 자동 대전, build).
2. 화투 카드 그림이 `frontend/src/components/hwatu/`에 두 벌 생기면 하나로 합친다.
3. `dev`에 하나씩 병합한다. `nav.js`, `locales`, `prerender.mjs`, `App.jsx`가 겹치므로 양쪽 내용을 모두 살린다.
4. 빌드 후 로컬에서 두 게임을 한 판씩 확인하고 배포한다.

두 게임의 원칙:
- 가상 포인트만 쓰고 충전, 환전, 결제는 없다.
- 페이지에 광고(`AdSlot`)를 넣지 않는다.
- 카드 그림은 직접 그린 SVG만 쓴다.

## 켜기 전 준비가 필요한 기능

### 자격증 이용권 결제 (`CERT_PAYMENT_ENABLED`, 기본 `false`)
1. 사업자 등록, 통신판매 고지, 이용약관·환불정책 작성 (`/terms`에 반영)
2. 문제 150개 직접 검수, 공식 시험 범위 확인. 모의고사 문항 수와 합격선은 이 사이트의 자체 기준이며 화면에도 그렇게 안내함
3. PortOne 실결제 설정, 웹훅 URL `https://tnhub.kr/api/cert/order/webhook` 등록
4. Jenkins 배포에 `PORTONE_IMP_KEY`, `PORTONE_IMP_SECRET`, 프론트 빌드에 `VITE_PORTONE_IMP_CODE` 추가. 지금은 기본값(테스트 키)이 쓰여 후원 결제도 함께 영향받음
5. 컨테이너에 `CERT_PAYMENT_ENABLED=true` 전달

### 로또 결과 메일
서버의 선택 환경 파일에 `SPRING_MAIL_HOST`, `SPRING_MAIL_PORT`, `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD`, `SPRING_MAIL_PROPERTIES_MAIL_SMTP_AUTH=true`, `SPRING_MAIL_PROPERTIES_MAIL_SMTP_STARTTLS_ENABLE=true`, `LOTTO_MAIL_FROM`을 넣으면 켜짐. 없으면 사이트 안 알림만 보냄.

### 광고
애드센스 광고 단위를 만든 뒤 `frontend/.env`에 `VITE_ADSENSE_SLOT_ARTICLE`, `VITE_ADSENSE_SLOT_TOOL`을 넣고 배포. 자세한 내용은 [MONETIZATION.md](MONETIZATION.md).

## 결정 사항

- 운영 비용이 드는 기능(유료 API 등)은 만들지 않는다. 나이 변환 사진은 이 이유로 취소했다 (커밋 `0d4eb26`).
- 쿠팡 파트너스는 하지 않는다. 수익은 광고 중심.
- 외부 활동 이름은 닉네임 에고수. 공개 문서와 글에 개인정보와 서버 내부 정보를 넣지 않는다.
- 유료 결제는 약관·환불정책·사업자 정보가 준비될 때까지 꺼 둔다.

## 남은 일

- 영어 번역이 안 된 화면: 게시판, 채팅, 강화, 장기, 주식, 타자, 후원, 관리자, 과일 AI (영어 모드에서 한국어로 보임)
- 학습 글 보강: 지금 편당 800~1,600자. 실제 운영 경험 글을 늘린다
- 애드센스 재검토 요청: 색인된 페이지가 늘어난 뒤

## 로컬 검증 방법

- 운영 DB 없이 H2로 백엔드 실행: H2 jar를 `-Dloader.path`로 붙이고
  `--spring.datasource.url=jdbc:h2:mem:tn;MODE=MySQL;DATABASE_TO_LOWER=TRUE;NON_KEYWORDS=USER,VALUE,YEAR,MONTH`
  `--spring.jpa.hibernate.ddl-auto=create --server.port=18080`
- 8080은 IntelliJ로 띄우는 로컬 백엔드이므로 시험용으로 쓰지 않는다
- CORS 허용 Origin은 `http://localhost:5173`뿐이다. 다른 포트로 Vite를 띄우면 프록시에 Origin 헤더를 지정해야 한다
- 외부 API는 가짜 서버로 시험한다 (동행복권, PortOne, Gemini). 설정 값으로 주소를 바꿀 수 있다: `lotto.api-url`, `portone.api-url`
- nginx 설정은 다른 포트의 임시 인스턴스로 실제 요청을 보내 확인한다
