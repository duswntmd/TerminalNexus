# 🚀 TerminalNexus (TN)

**개발자를 위한 올인원 플랫폼** — 실시간 채팅, AI 과일 추천, 자유게시판, 로또 시뮬레이터

[![Java](https://img.shields.io/badge/Java-21-ED8B00?logo=openjdk&logoColor=white)](https://openjdk.org/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5.4-6DB33F?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

🌐 **Live**: [https://tnhub.kr](https://tnhub.kr)

---

## ✨ 주요 기능

| 기능 | 설명 |
|------|------|
| 💬 **실시간 채팅** | WebSocket(STOMP) 기반 전체 채팅 · 익명 채팅 · 귓속말(`/w`, `/r`) |
| 🍎 **AI 과일 추천** | Google Gemini AI + RAG 기반 과일 영양 정보 · 효능 · 레시피 |
| 📝 **자유게시판** | Toast UI 마크다운 에디터 · 이미지 업로드 · 좋아요/싫어요 · 댓글 |
| 🎰 **로또 시뮬레이터** | 물리 기반 애니메이션 로또 추첨 시뮬레이터 |
| 🔐 **인증 시스템** | JWT + OAuth 2.0 (Google, Naver) · 역할 기반 접근 제어 |
| 🌐 **다국어 지원** | 한국어 / English (i18next) |

---

## 🛠️ 기술 스택

### Backend

- **Java 21** · **Spring Boot 3.5.4**
- Spring Security (JWT, OAuth 2.0)
- Spring Data JPA · QueryDSL
- Spring WebSocket (STOMP + SockJS)
- Spring AI (Gemini)
- MySQL 8.0 · Lombok

### Frontend

- **React 19** · **Vite**
- Material-UI (MUI 7)
- React Router 7 · React i18next
- SockJS + STOMP.js
- Toast UI Editor

### Infra & DevOps

- Nginx (Reverse Proxy + Static)
- Jenkins (CI/CD)
- Docker
- Let's Encrypt (SSL)

---

## 🚀 시작하기

### 사전 요구사항

- Java 21+
- Node.js 20+
- MySQL 8.0+
- Maven 3.8+

### 1. 저장소 클론

```bash
git clone https://github.com/duswntmd/TerminalNexus.git
cd TerminalNexus
```

### 2. 데이터베이스 설정

```sql
CREATE DATABASE tn CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'tn'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON tn.* TO 'tn'@'localhost';
FLUSH PRIVILEGES;
```

### 3. 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성합니다. (`spring-dotenv`가 자동 로드)

```env
# Database
DB_USERNAME=tn
DB_PASSWORD=your_password

# OAuth2
NAVER_CLIENT_ID=your_naver_client_id
NAVER_CLIENT_SECRET=your_naver_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_secret

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Admin
ADMIN_PASSWORD=your_admin_password

# PortOne 결제 (선택)
PORTONE_IMP_KEY=your_imp_key
PORTONE_IMP_SECRET=your_imp_secret
```

> ⚠️ `.env` 파일은 `.gitignore`에 포함되어 있으므로 Git에 올라가지 않습니다.

### 4. 백엔드 실행

```bash
./mvnw clean install
./mvnw spring-boot:run
# → http://localhost:8080
```

### 5. 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## 📁 프로젝트 구조

```
TerminalNexus/
├── src/main/java/kr/pe/tn/
│   ├── api/                    # REST 컨트롤러
│   │   ├── ChatController      # 채팅 WebSocket
│   │   ├── FreeBoardController  # 게시판 CRUD
│   │   ├── FruitController      # AI 과일 추천
│   │   └── UserController       # 사용자 관리
│   ├── config/                 # Security, WebSocket, CORS
│   ├── domain/                 # 도메인 계층
│   │   ├── chat/               # 채팅 (DTO, Service)
│   │   ├── freeboard/          # 게시판 (Entity, Repo, Service)
│   │   ├── fruit/              # 과일 AI (RAG, Service)
│   │   ├── jwt/                # JWT 토큰 관리
│   │   └── user/               # 사용자 (Entity, OAuth2)
│   ├── filter/                 # JWT, Login 필터
│   └── handler/                # WebSocket 이벤트
├── frontend/
│   ├── src/
│   │   ├── components/         # 공통 컴포넌트 (Navbar, Footer)
│   │   ├── context/            # AuthContext
│   │   ├── pages/              # 페이지 컴포넌트
│   │   │   ├── MainPage        # 메인 (Hero + 로또)
│   │   │   ├── ChatPage        # 실시간 채팅
│   │   │   ├── FruitAIPage     # AI 과일 추천
│   │   │   ├── GuidePage       # 이용 안내
│   │   │   ├── freeboard/      # 게시판 (목록/상세/작성)
│   │   │   └── member/         # 로그인/회원가입/마이페이지
│   │   └── App.jsx
│   └── package.json
├── Jenkinsfile                 # CI/CD 파이프라인
├── .env                        # 환경 변수 (Git 제외)
└── README.md
```

---

## 📚 API 엔드포인트

### 인증

| Method | Path | 설명 |
|--------|------|------|
| `POST` | `/user/loginForm` | 로그인 |
| `POST` | `/api/user` | 회원가입 |
| `GET` | `/api/user` | 현재 사용자 정보 |
| `PUT` | `/api/user` | 사용자 정보 수정 |
| `POST` | `/logout` | 로그아웃 |

### 게시판

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/api/freeboard` | 게시글 목록 (페이지네이션, 검색) |
| `GET` | `/api/freeboard/{id}` | 게시글 상세 |
| `POST` | `/api/freeboard` | 게시글 작성 |
| `PUT` | `/api/freeboard/{id}` | 게시글 수정 |
| `DELETE` | `/api/freeboard/{id}` | 게시글 삭제 |
| `POST` | `/api/freeboard/{id}/like` | 좋아요 |
| `POST` | `/api/freeboard/{id}/dislike` | 싫어요 |

### 과일 AI

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/api/fruits` | 과일 목록 |
| `POST` | `/api/fruits/ask` | AI에게 질문 |

### 채팅 (WebSocket)

| 경로 | 방향 | 설명 |
|------|------|------|
| `/ws-chat` | → | WebSocket 핸드셰이크 |
| `/app/chat.sendMessage/{roomId}` | → | 메시지 전송 |
| `/app/chat.addUser/{roomId}` | → | 채팅방 입장 |
| `/app/chat.whisper` | → | 귓속말 전송 |
| `/topic/{roomId}` | ← | 채팅 메시지 구독 |
| `/user/queue/whisper` | ← | 귓속말 수신 |

**채팅 명령어**: `/w 유저 메시지` · `/whisper 유저 메시지` · `/r 메시지` (답장)

---

## 🌐 배포

### 프로덕션 빌드

```bash
# Backend
./mvnw clean package -DskipTests

# Frontend
cd frontend && npm run build
```

### Docker 실행

```bash
docker run -d \
  -p 8080:8080 \
  -v /home/ubuntu/uploads:/app/uploads \
  --name tn_container \
  --add-host=host.docker.internal:host-gateway \
  -e "SPRING_DATASOURCE_URL=jdbc:mysql://host.docker.internal:3306/tn?useSSL=false&characterEncoding=UTF-8&serverTimezone=UTC" \
  -e "GEMINI_API_KEY=your_key" \
  -e "ADMIN_PASSWORD=your_password" \
  -e "NAVER_CLIENT_ID=..." \
  -e "NAVER_CLIENT_SECRET=..." \
  -e "GOOGLE_CLIENT_ID=..." \
  -e "GOOGLE_CLIENT_SECRET=..." \
  duswntmd/tn:1.0
```

### Nginx 설정

```nginx
server {
    listen 80;
    server_name tnhub.kr;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name tnhub.kr;

    ssl_certificate     /etc/letsencrypt/live/tnhub.kr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tnhub.kr/privkey.pem;

    client_max_body_size 50M;

    location / {
        root /var/www/html;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws-chat {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    location ~ ^/(user|login|oauth2|logout|jwt|cookie|display|download|upload)(/|$) {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

자세한 배포 가이드: [DEPLOYMENT.md](DEPLOYMENT.md)

---

## 👨‍💻 개발자

**duswntmd** — [GitHub](https://github.com/duswntmd)

## 📝 라이선스

MIT License — [LICENSE](LICENSE)

---

<div align="center">
  Made with ❤️ by duswntmd
</div>
