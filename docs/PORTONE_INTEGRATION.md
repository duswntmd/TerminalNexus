# 💳 포트원(PortOne) 결제 연동 및 트러블슈팅 기록

이 문서는 `TerminalNexus` 프로젝트에 포트원(구 아임포트)을 활용한 **카카오페이 후원(결제) 시스템**을 연동하며 발생한 주요 이슈와 해결 과정을 기록한 문서입니다.

## 📌 1. 연동 개요

- **Frontend**: React (Vite 환경) + PortOne V1 SDK (`iamport.payment-1.2.0.js`)
- **Backend**: Spring Boot + `RestTemplate`을 이용한 REST API 검증
- **테스트 환경**: 포트원 카카오페이 테스트 채널 (`TC0ONETIME`)

### 🔹 주요 워크플로우

1. 프론트엔드에서 결제 금액/방식 선택 후 백엔드에 `/api/donation/prepare` (결제 사전 등록, `READY` 상태)
2. 프론트엔드에서 `IMP.request_pay()` 호출하여 결제창(QR 모달) 팝업
3. 사용자가 **스마트폰 카카오톡 스캐너**로 QR 결제 승인
4. 결제 성공 시 `응답(response.success)`을 받아 백엔드의 `/api/donation/verify` 로 2차 검증 요청
5. 백엔드가 포트원 REST API 서버에서 실제 결제 금액을 대조(위변조 검증) 후 `PAID` 상태로 최종 승인

---

## 🧨 2. 주요 트러블슈팅 (Troubleshooting)

### 이슈 1: 프론트엔드 500 에러 (엉뚱한 가맹점 식별코드 호출)

- **증상**: 프론트엔드 콘솔 응답에 `imp_uid`가 제대로 넘어오지만, 백엔드 검증 시 서버 에러 발생.
- **원인**: `frontend/.env.local` 파일에 가맹점 식별코드(`VITE_PORTONE_IMP_CODE`)를 추가하였으나, **Vite 개발 서버(`npm run dev`)를 재시작하지 않아** 해당 환경 변수가 `undefined`로 평가됨. 결과적으로 포트원 기본 테스트 상점인 `imp00000000`으로 결제가 요청되었음.
- **해결**: Vite 서버를 완전히 종료 후 재시작하여 정상적으로 본인 계정의 `imp62765747` 값으로 초기화하도록 조치함.

### 이슈 2: 백엔드 401 Unauthorized (API Secret 오타)

- **증상**: 백엔드에서 포트원 Access Token 발급 시도(`GET /users/getToken`) 시 `401 Unauthorized` 인증 실패 발생.
- **원인**: 관리자 페이지에서 복사한 `REST API Secret` 문자열 내의 소문자 `l(엘)`과 스크립트 작성 시의 대문자 `I(아이)`가 폰트상 유사하여 생긴 오타로 인해 인증에 실패.
- **해결**: 스크린샷 원본의 정확한 포트원 `REST API Secret`(`vlpx...`) 값을 추출하여 `.env` 파일에 정상 적용함.

### 이슈 3: 백엔드 404 Not Found (가장 치명적이었던 포트원 API 단건조회 버그)

- **증상**: 올바른 Secret을 통해 토큰 발급까지 성공했음에도, 결제 단건 조회(`GET /payments/{imp_uid}`) 호출 시 **`{"code":-1, "message":"존재하지 않는 결제정보입니다."}`** 라며 **404 에러** 반환.
- **원인 파악**:
  - 백엔드에서 포트원 `GET /payments/status/all` 전체 목록 조회 시 정상적으로 해당 결제 내역이 리스트업 되는 것을 포착.
  - 즉, 결제는 정상 동작했으나 **포트원의 V1 API 중 카카오페이 가상 테스트(`TC0ONETIME`) 결제 건을 `imp_uid`로 단건 조회할 때 API 내부망에서 데이터를 찾지 못하는 포트원 서버측 결함(버그)** 이었음.
- **최종 해결 (우회 조치)**:
  - `imp_uid` 경로 대신, 주문번호로 조회하는 API인 **`GET /payments/find/{merchant_uid}`** 로 백엔드 검증 로직(`DonationService.java`)을 전면 교체하여 완벽하게 우회 성공!

---

## 🔒 3. 보안 (보안 권고 준수)

- **실제 키 노출 방지**: 포트원 `IMP_KEY` 및 `IMP_SECRET` 등 민감한 결제 키는 GitHub에 올라가지 않도록 `application.properties`에서 제거 완료.
- 루트 디렉토리의 `.env` 파일에만 실제 시크릿 키를 보관하며, Spring Boot는 `spring-dotenv` 모듈을 통해 런타임 환경에서만 안전하게 키를 주입받아 사용함. (`.gitignore` 적용됨)

---

## 💡 4. 개발 시 참고 사항 (Tip)

- PC 환경에서 카카오페이 테스트 결제를 진행할 경우, 브라우저 화면의 **노란색 QR코드 모달창**은 멈춘 것이 아니라 **"사용자 스마트폰의 실제 카카오톡 코드 스캐너 앱을 기다리고 있는 상태"**입니다. 화면을 끄지 말고 실제 폰으로 스캔하여 결제를 승인해야만 다음 단계(`response.success = true`)로 넘어갑니다.
- 프론트엔드 모달 창에서 발생하는 `webid.ad.daum.net` 500 에러는 카카오페이 내부에 삽입된 '다음 광고 통계 트래커'가 차단된 것으로 무시하셔도 무방합니다.
