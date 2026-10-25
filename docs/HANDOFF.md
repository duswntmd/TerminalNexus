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
