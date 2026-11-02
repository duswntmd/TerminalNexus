# 배포와 운영

운영 서버는 라즈베리파이(Ubuntu) 한 대입니다. nginx가 정적 파일과 HTTPS를 맡고, Spring Boot 앱은 Docker 컨테이너로 돌며 같은 서버의 MySQL을 씁니다.

```
사용자 ─ HTTPS ─ nginx ─┬─ /var/www/html      정적 파일 (React 빌드, 사전 렌더링 HTML)
                       ├─ /api, /login 등    → 127.0.0.1:8080 (Docker: tn_container)
                       └─ /ws-chat           → WebSocket
```

## 배포 흐름

`main` 브랜치에 푸시하면 Jenkins가 아래 순서로 배포합니다. 작업은 `dev`에서 하고, 운영에 내보낼 때만 `main`에 병합합니다.

| 단계 | 하는 일 |
|---|---|
| Build Frontend | `npm install --legacy-peer-deps`, `npm run build` (Vite 빌드 후 사전 렌더링, sitemap, RSS 생성) |
| Deploy Frontend | 바뀐 페이지 목록 계산 → `dist`를 `/var/www/html`에 복사 → IndexNow로 바뀐 페이지 알림 → nginx 설정 적용 |
| Build Backend | `./mvnw clean package -DskipTests` |
| Build Docker Image | `eclipse-temurin:21-jre` 기반 이미지 생성 |
| Run Docker Container | 기존 컨테이너 교체, 비밀값은 Jenkins Credentials에서 주입 |

### nginx 설정 자동 적용

`nginx/tnhub.conf`가 저장소의 기준입니다. 서버에서 직접 고치면 다음 배포 때 덮어씁니다.

1. 서버 설정과 같으면 건너뜀
2. 다르면 백업 후 복사하고 `nginx -t`로 검사
3. 검사에 성공하면 `reload`, 실패하면 백업으로 되돌리고 빌드를 실패 처리

중요한 변경은 배포 전에 다른 포트로 임시 nginx를 띄워 실제 요청으로 시험합니다.

### 되돌리기

문제가 생기면 이전 커밋으로 되돌린 내용을 `main`에 다시 푸시합니다. nginx 설정은 서버의 `/etc/nginx/sites-available/default.bak-jenkins`에 직전 버전이 남아 있습니다.

## Jenkins Credentials

| ID | 용도 |
|---|---|
| `GitHub_login` | 저장소 클론 |
| `DB_PASSWORD` | MySQL 비밀번호 |
| `ADMIN_PASSWORD` | 관리자 계정 초기 비밀번호 |
| `GEMINI_API_KEY` | 과일 AI |
| `NAVER_CLIENT_SECRET`, `GOOGLE_CLIENT_SECRET` | 소셜 로그인 |

- JWT 서명 키는 첫 배포 때 서버에 무작위로 만들어 두고 계속 재사용합니다. 그래서 재배포해도 로그인이 유지됩니다.
- 선택 환경 파일이 서버에 있으면 `--env-file`로 함께 전달합니다. 메일 설정처럼 Jenkins에 넣기 번거로운 값을 여기에 둡니다.
- 비밀값이 빌드 로그에 찍히지 않도록, 해당 구간은 셸 trace를 끄고 docker에는 변수 이름만 넘깁니다.

## 환경 변수

### 백엔드

| 변수 | 필수 | 기본값 | 설명 |
|---|:-:|---|---|
| `DB_PASSWORD` | ✅ | | 로컬 MySQL 비밀번호 |
| `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD` | | 로컬 설정 | 운영 DB 접속 정보 (Spring이 직접 읽음) |
| `JWT_SECRET` | 운영 ✅ | 임시 랜덤 키 | 32바이트 이상. 없으면 재시작할 때마다 모든 로그인이 풀림 |
| `ADMIN_PASSWORD` | ✅ | | 관리자 계정 초기 비밀번호 |
| `ADMIN_USERNAME`, `ADMIN_NICKNAME`, `ADMIN_EMAIL` | | `admin` 등 | 관리자 계정 정보 |
| `GEMINI_API_KEY` | | | 과일 AI. 없으면 해당 기능만 동작하지 않음 |
| `NAVER_CLIENT_SECRET`, `GOOGLE_CLIENT_SECRET` | | | 소셜 로그인 |
| `SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_{NAVER,GOOGLE}_REDIRECT_URI` | 운영 ✅ | localhost | 소셜 로그인 콜백 주소 |
| `UPLOAD_PATH` | | `./upload` | 게시판 업로드 경로 |
| `PORTONE_IMP_KEY`, `PORTONE_IMP_SECRET` | | 테스트 값 | 후원·이용권 결제 검증 |
| `CERT_PAYMENT_ENABLED` | | `false` | 자격증 이용권 결제 |
| `LOTTO_CHECK_CRON` | | 10분마다 | 새 당첨번호 확인 주기 |
| `LOTTO_MAIL_FROM`, `SPRING_MAIL_*` | | | 로또 결과 메일. 없으면 사이트 안 알림만 보냄 |

### 프론트엔드 (`frontend/.env`)

빌드할 때 화면 코드에 들어가는 값이므로 비밀값을 넣으면 안 됩니다.

| 변수 | 설명 |
|---|---|
| `VITE_BACKEND_API_BASE_URL` | API 주소 (비우면 같은 도메인) |
| `VITE_PORTONE_IMP_CODE` | PortOne 가맹점 식별코드 |
| `VITE_ADSENSE_SLOT_ARTICLE`, `VITE_ADSENSE_SLOT_TOOL` | 애드센스 광고 단위 번호. 없으면 광고 자리를 그리지 않음 |

## nginx

전체 설정은 [`nginx/tnhub.conf`](../nginx/tnhub.conf)에 있습니다. 핵심만 정리하면 다음과 같습니다.

| 설정 | 이유 |
|---|---|
| `try_files $uri $uri.html $uri/ /index.html` | 사전 렌더링한 `tools/json.html`을 `/tools/json`으로 제공. 폴더로 만들면 끝에 `/`가 붙는 301이 생김 |
| HTML만 `Cache-Control: no-cache` | 배포 직후에도 새 화면을 받도록. `/assets`는 파일 이름에 해시가 있어 캐시해도 안전 |
| 로그인 POST 분당 20회, 가입 POST 분당 5회 제한 | 무차별 대입 완화. 초과하면 429 |
| `www.tnhub.kr`, `http` → `https://tnhub.kr` | 대표 주소 하나로 통일 |
| 백엔드는 `127.0.0.1:8080`에만 바인딩 | nginx를 거치지 않는 직접 접속 차단 |
| 보안 헤더 | HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` |

## 검색엔진

- 빌드 결과로 공개 페이지마다 제목, 설명, canonical, 본문이 있는 HTML이 생깁니다. 크롤러는 자바스크립트 없이도 내용을 읽고, 사용자 화면은 React가 대체합니다.
- `sitemap.xml`과 `rss.xml`은 같은 목록으로 자동 생성합니다. 손으로 고치지 않습니다.
- 배포할 때 바뀐 페이지만 IndexNow로 알립니다. 키 파일은 `frontend/public/`에 있습니다.

## 배포 후 확인

```bash
curl -s https://tnhub.kr/tools/json | grep -o "<title>[^<]*"   # 페이지별 제목
curl -sI https://tnhub.kr/tools/json | grep -i cache-control    # no-cache
docker ps --filter name=tn_container                            # 컨테이너 상태
docker logs tn_container 2>&1 | grep -c " ERROR "               # 오류 수
sudo nginx -t                                                   # nginx 설정
```

## SSL 인증서

Let's Encrypt 인증서는 certbot이 자동으로 갱신합니다. 갱신이 정상인지는 아래 명령으로 확인합니다.

```bash
sudo certbot renew --dry-run
```

## 비밀값이 유출됐을 때

1. 해당 서비스 콘솔에서 키를 즉시 폐기하고 새로 발급합니다.
2. Jenkins Credentials를 새 값으로 바꾸고 다시 배포합니다.
3. 저장소에 올라갔다면 커밋을 지우는 것만으로는 부족합니다. 이미 노출된 것으로 보고 반드시 교체합니다.
