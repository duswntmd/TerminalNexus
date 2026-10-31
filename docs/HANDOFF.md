# 진행 중 작업 (2026-10-31 시작) — 새 세션은 여기부터

사용자 요청: 아래 3개를 순서대로 만든다. 끊기면 이 체크리스트에서 이어서 진행.
완료할 때마다 체크하고 dev에 커밋한다. main 병합(=운영 배포)은 사용자 승인 후에만.

- [x] 1. 로또 내 번호 저장 + 토요일 결과 알림 (가짜 추첨 서버로 1·2·5등 알림까지 검증)
  - 메일을 켜려면 서버에 `/home/ubuntu/.tn_mail.env`를 만들면 됨 (없으면 사이트 안 알림만 동작)
    내용: `SPRING_MAIL_HOST`, `SPRING_MAIL_PORT`, `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD`,
    `SPRING_MAIL_PROPERTIES_MAIL_SMTP_AUTH=true`, `SPRING_MAIL_PROPERTIES_MAIL_SMTP_STARTTLS_ENABLE=true`, `LOTTO_MAIL_FROM`
  - 서버 `domain/lotto`: 번호 저장(1인 20개), 새 회차 반영 시 알림 생성, 메일은 SMTP 설정 있을 때만
  - 프론트 `/lotto?tab=my`, 헤더 미확인 알림 표시
- [x] 2. 인프라 도구 모음 `/tools`, `/tools/:id` (검증 스크립트 전부 통과)
  - 프론트 전용: 서브넷, RAID, cron, chmod, nginx 설정 생성, 전송 시간
  - 계산 로직은 `pages/tools/toolsLogic.js`로 분리해 node로 검증, sitemap 추가
- [x] 3. 자격증 플랫폼 `/cert` (dev 커밋, 운영 미배포)
  - 서버 `domain/cert`: 문제 150개는 `resources/cert/`에만 있음(프론트 번들에 안 들어감), 과목별 40% 무료
  - 무료: 과목별 연습, 미니 모의고사 1회 / 이용권: 전체 문제, 50문항 60분 모의고사, 오답노트
  - 결제: `PortOneClient`를 후원과 공용으로 분리, 가짜 포트원 서버로 금액 조작·중복·웹훅 시나리오 검증
  - 관리자 계정은 이용권 없이 전체 이용 가능
  - 모의고사 문항 수·합격선은 자체 기준 (공식 시험 형식은 확인하지 못해 화면에 그렇게 안내함)

유료 결제를 켜기 전에 사용자가 할 일:
1. 사업자 등록, 통신판매 고지, 이용약관·환불정책 작성 (`/terms`에 반영)
2. 문제 내용 직접 검수, 공식 시험 범위 확인
3. 포트원 실결제 설정, 웹훅 URL `https://tnhub.kr/api/cert/order/webhook` 등록
4. 컨테이너에 `CERT_PAYMENT_ENABLED=true` 전달

결정 사항: 유료 결제는 약관·환불정책·사업자 정보 확인 전까지 꺼 둔다.

---

# 작업 인수인계 (2026-10-25)

다음 세션은 이 문서부터 읽고 "남은 작업"을 이어서 진행한다.

## 완료: 장기·소개 (dev 브랜치 커밋 `61b2b48`, 아직 main 미배포)

- 서비스 소개 페이지(`/guide`) 재작성: 실제 기능만 안내 (`GuidePage.jsx`, `locales/*.json`의 `guide`)
- 장기 전면 개편 (`frontend/src/pages/play/janggi/`, 서버 `domain/janggi/`)
  - 규칙 엔진 `engine.js` = 서버 `JanggiEngine.java` (100판 교차 검증 일치)
  - AI는 Web Worker (`ai.js`, `ai.worker.js`), 난이도 3단계
  - AI 대국 / 2인 / 온라인을 `/play/janggi?mode=` 한 페이지로 통합, `/play/janggi-online`은 리다이렉트
  - 온라인: 서버가 수 검증·승패 판정, STOMP `/app/janggi/room/{id}/action`, 방 상태 `/topic/janggi/room/{id}`
- `vite.config.js` define `global: 'globalThis'` (Worker 호환)

배포하려면: dev → main 병합 후 push (Jenkins 자동 배포).

## 완료: 주식(`/play/stock`) 거래소형 개편 (dev, 아직 main 미배포)

- 서버 `domain/stock/`: `StockRules`(호가 단위·상하한가·수수료 0.015%·거래세 0.18%), `StockService` 재작성
  - 1시간 = 1거래일(정시 마감, 종가 → 기준가, 일봉 저장), 추세 + 적정가 회귀 + 뉴스 충격 시세
  - 시장가 매수 = 매도1호가 / 매도 = 매수1호가, 지정가는 가격이 닿으면 지정가 체결
  - 매도가능수량 검증·미체결 매도 잠금(돈 복사 버그 수정), 매수 예약금, 지갑·주문 쓰기 잠금
  - 최초 기동 시 기존 공매도/레버리지 정산, 기존 미체결 주문 전부 취소·환불 (`migrateLegacyPositions`)
  - 신규 테이블 `stock_candle`(분봉 6시간·일봉 180일 보관), 컬럼 추가는 ddl-auto=update
  - 실시간 방송 `/topic/stock-market` (시세·체결·장 마감 시각), API `/api/stock/candles/{t}?interval=M1|D1`, `/ticks/{t}`, `/market`
- 프론트 `pages/play/stock/`: HTS형 화면, 차트는 `lightweight-charts@4.2.3`
- 검증: 서버 API 33개 항목 통과 (H2), 화면 주문·호가 클릭·모바일 확인

## 남은 일
- dev → main 병합·배포 (사용자 승인 필요)
- 배포 후 운영에서 기존 사용자 데이터 정리 결과 확인 (서버 로그 "주식 개편 데이터 정리")

## 로컬 검증 방법 (지난 세션에서 사용)
- 운영 DB 없이 H2로 백엔드 실행: H2 jar를 `-Dloader.path`로 붙이고
  `--spring.datasource.url=jdbc:h2:mem:tn;MODE=MySQL;DATABASE_TO_LOWER=TRUE;NON_KEYWORDS=USER,VALUE,YEAR,MONTH`
  `--spring.jpa.hibernate.ddl-auto=create --server.port=18080`
- 8080은 사용자가 IntelliJ로 띄우는 로컬 백엔드이므로 건드리지 않는다
- CORS 허용 Origin은 `http://localhost:5173`뿐 → 다른 포트로 Vite를 띄우면 프록시에 Origin 헤더 지정 필요

## 사용자가 직접 해야 할 일 (보안)
- MySQL `tn` 계정 비밀번호 변경 (새 값을 먼저 Jenkins Credential `DB_PASSWORD`에 넣은 뒤 요청하면 서버 쪽 변경)
- Gemini API 키 2개 폐기·재발급, 운영 관리자 비밀번호 변경, Jenkins 관리자 비밀번호 확인
- 공유기 포트포워딩에서 3306·8080 제거 (서버 방화벽으로 이미 차단됨)
