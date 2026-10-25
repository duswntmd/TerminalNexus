# 작업 인수인계 (2026-10-25)

다음 세션은 이 문서부터 읽고 "남은 작업"을 이어서 진행한다.

## 완료 (dev 브랜치 커밋 `61b2b48`, 아직 main 미배포)

- 서비스 소개 페이지(`/guide`) 재작성: 실제 기능만 안내 (`GuidePage.jsx`, `locales/*.json`의 `guide`)
- 장기 전면 개편 (`frontend/src/pages/play/janggi/`, 서버 `domain/janggi/`)
  - 규칙 엔진 `engine.js` = 서버 `JanggiEngine.java` (100판 교차 검증 일치)
  - AI는 Web Worker (`ai.js`, `ai.worker.js`), 난이도 3단계
  - AI 대국 / 2인 / 온라인을 `/play/janggi?mode=` 한 페이지로 통합, `/play/janggi-online`은 리다이렉트
  - 온라인: 서버가 수 검증·승패 판정, STOMP `/app/janggi/room/{id}/action`, 방 상태 `/topic/janggi/room/{id}`
- `vite.config.js` define `global: 'globalThis'` (Worker 호환)

배포하려면: dev → main 병합 후 push (Jenkins 자동 배포).

## 남은 작업: 주식(`/play/stock`)을 실제 거래소처럼 개편

### 현재 문제 (서버 `domain/stock/service/StockService.java`)
- 🔴 매도 수량을 보유 수량과 비교하지 않음 → 보유보다 많이 팔면 돈이 생김, 미보유 종목 매도도 체결 처리
- 지정가 매도 시 주식 예약(잠금) 없음 → 중복 매도 주문 가능
- 시세가 3초마다 최대 ±6% 변동, `previousClose`(기준가)가 갱신되지 않아 종목들이 상한가에 붙음
- 호가창이 0.5% 간격 무작위 값, 호가 단위·수수료·세금 없음
- 공매도/레버리지가 매수와 섞여 계산이 꼬임
- `processPendingOrders`가 종목마다 전체 미체결 주문을 조회 (N×M)

### 개편 계획 (사용자에게 설명한 내용)
- 한국 거래소 규칙: 호가 단위(<2천 1, <5천 5, <2만 10, <5만 50, <20만 100, <50만 500, 이상 1000),
  상·하한가 ±30%(기준가 대비), 수수료 0.015%, 매도 시 거래세 0.18%
- 체결: 시장가 매수 = 매도1호가, 시장가 매도 = 매수1호가. 지정가는 호가 단위·가격제한폭 안에서만,
  가격이 닿으면 지정가로 체결
- 1시간 = 1거래일: 매 정시에 장 마감, 종가 → 다음 기준가, 일봉 저장
- 시세 모델: 틱(3초) 변동성은 시간당 약 3%(종목별 배수), 추세 + 적정가 회귀 + 뉴스 충격, 거래량 시뮬레이션
- 계좌: 주문가능금액(미체결 매수 금액·수수료 예약), 매도가능수량(미체결 매도 잠금)
- 공매도·레버리지 제거. 기존 SHORT/레버리지 보유분은 최초 기동 시 현재가로 정산해 현금 반환,
  해당 미체결 주문은 취소·환불 (엔티티 컬럼은 유지, 항상 LONG/1)
- 캔들: 분봉·일봉(거래일) 엔티티 신설, 차트는 `lightweight-charts`(4.2.x)로 캔들+거래량+이동평균
- 화면(HTS형): 종목 리스트, 종목 헤더(현재가·등락·시고저·거래량·상하한가·장 마감 카운트다운),
  차트, 10단 호가창(클릭 시 주문가 입력), 실시간 체결, 주문창(지정가/시장가, 호가 ±, 수량 % 버튼,
  예상 금액·수수료·세금), 하단 탭(잔고·미체결·체결내역·뉴스·랭킹). 상승 빨강 / 하락 파랑
- 호환: 메인 페이지가 `/api/stock/prices`의 `ticker, name, currentPrice, changeRate` 사용 → 유지

### 참고
- 예외 응답 형식: `{ "message": ... }` (`CustomControllerAdvice`)
- 프론트 인증 요청: `fetchWithAccessRaw` (`util/fetchUtil.js`), WebSocket 주소는 `/ws-chat/websocket`
- 실시간 시세 토픽: `/topic/stock-prices`, 뉴스 `/topic/stock-news`

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
