# 🚀 배포 가이드

## 배포 전 체크리스트

- [ ] 모든 환경 변수 준비 완료 ([ENV_SETUP.md](ENV_SETUP.md) 참고)
- [ ] 로컬 테스트 완료
- [ ] `application.properties`에 하드코딩된 시크릿 없음
- [ ] `.env` 파일이 Git에 포함되지 않음

---

## 1. Jenkins CI/CD 파이프라인 (권장)

### 사전 설정

Jenkins에 다음 환경 변수를 **Credentials** 또는 **Global Properties**로 등록:

| 변수 | Jenkins 등록 방법 |
|------|-------------------|
| `GEMINI_API_KEY` | Secret text |
| `ADMIN_PASSWORD` | Secret text |
| `NAVER_CLIENT_ID` | Secret text |
| `NAVER_CLIENT_SECRET` | Secret text |
| `GOOGLE_CLIENT_ID` | Secret text |
| `GOOGLE_CLIENT_SECRET` | Secret text |
| `PORTONE_IMP_KEY` | Secret text |
| `PORTONE_IMP_SECRET` | Secret text |

> **Jenkins Global Properties 설정:**
> Jenkins → Manage Jenkins → System → Global properties → Environment variables

### 배포 실행

1. `main` 브랜치에 push
2. Jenkins가 자동으로 빌드 및 배포
3. 파이프라인 순서: Git Clone → Frontend Build → Deploy Frontend → Backend Build → Docker Build → Run Container

---

## 2. 수동 배포

### Backend 빌드

```bash
./mvnw clean package -DskipTests
```

### Frontend 빌드

```bash
cd frontend
npm install --legacy-peer-deps
npm run build
# dist/ 디렉토리 생성됨
```

### Frontend 배포 (Nginx)

```bash
sudo cp -r frontend/dist/* /var/www/html/
sudo nginx -t && sudo systemctl reload nginx
```

### Backend 배포 (Docker)

```bash
# 기존 컨테이너 중지/제거
docker stop tn_container || true
docker rm tn_container || true

# 새 이미지 빌드
docker build --no-cache -t duswntmd/tn:1.0 .

# 컨테이너 실행
docker run -d \
  -p 8080:8080 \
  -v /home/ubuntu/uploads:/app/uploads \
  --name tn_container \
  --add-host=host.docker.internal:host-gateway \
  -e "UPLOAD_PATH=/app/uploads" \
  -e "SPRING_DATASOURCE_URL=jdbc:mysql://host.docker.internal:3306/tn?useSSL=false&allowPublicKeyRetrieval=true&characterEncoding=UTF-8&serverTimezone=UTC" \
  -e "GEMINI_API_KEY=your_key" \
  -e "ADMIN_PASSWORD=your_password" \
  -e "NAVER_CLIENT_ID=your_id" \
  -e "NAVER_CLIENT_SECRET=your_secret" \
  -e "GOOGLE_CLIENT_ID=your_id" \
  -e "GOOGLE_CLIENT_SECRET=your_secret" \
  -e "OAUTH2_BASE_URL=https://tnhub.kr" \
  -e "PORTONE_IMP_KEY=your_key" \
  -e "PORTONE_IMP_SECRET=your_secret" \
  duswntmd/tn:1.0
```

---

## 3. Nginx 설정

```nginx
server {
    listen 80;
    server_name tnhub.kr www.tnhub.kr;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name tnhub.kr www.tnhub.kr;

    ssl_certificate     /etc/letsencrypt/live/tnhub.kr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tnhub.kr/privkey.pem;

    client_max_body_size 50M;

    # React SPA
    location / {
        root /var/www/html;
        try_files $uri $uri/ /index.html;
    }

    # REST API
    location /api {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /ws-chat {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 3600s;
    }

    # Backend 경로 (로그인, OAuth2 등)
    location ~ ^/(user|login|oauth2|logout|jwt|cookie|display|download|upload)(/|$) {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 4. 배포 후 확인

### 서비스 상태 확인

```bash
# Docker 컨테이너 상태
docker ps

# 컨테이너 로그
docker logs -f tn_container

# Nginx 상태
sudo systemctl status nginx
```

### 기능 테스트

- [ ] `https://tnhub.kr` 접속
- [ ] 회원가입 / 로그인 (자체 + 소셜)
- [ ] 과일 AI 질문/답변
- [ ] 채팅 (전체/익명/귓속말)
- [ ] 자유게시판 CRUD
- [ ] 파일 업로드

### 에러 발생 시

```bash
# 컨테이너 로그 확인
docker logs tn_container --tail 100

# 환경 변수 확인
docker exec tn_container env | grep -E "GEMINI|ADMIN|NAVER|GOOGLE"

# 컨테이너 재시작
docker restart tn_container
```

---

## 5. SSL 인증서 갱신 (Let's Encrypt)

```bash
# 자동 갱신 테스트
sudo certbot renew --dry-run

# 수동 갱신
sudo certbot renew
sudo systemctl reload nginx
```

---

## 🆘 긴급 대응

### API 키 유출 시

1. 해당 서비스에서 키 즉시 삭제/비활성화
2. 새 키 발급
3. Docker 환경 변수 업데이트 후 컨테이너 재시작
4. Git 히스토리 정리 (BFG Repo-Cleaner 권장)
