# 🚀 TerminalNexus (TN)

**개발자를 위한 올인원 플랫폼** - 브라우저 기반 리눅스 터미널, AI 과일 추천, 실시간 채팅, 자유게시판

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Java](https://img.shields.io/badge/Java-17-orange.svg)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.4.1-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://reactjs.org/)
[![WebSocket](https://img.shields.io/badge/WebSocket-STOMP-red.svg)](https://stomp.github.io/)

🌐 **Live Demo**: [https://tnhub.kr](https://tnhub.kr)

---

## 📋 목차

- [주요 기능](#-주요-기능)
- [기술 스택](#-기술-스택)
- [시작하기](#-시작하기)
- [프로젝트 구조](#-프로젝트-구조)
- [API 문서](#-api-문서)
- [배포](#-배포)
- [기여하기](#-기여하기)
- [라이선스](#-라이선스)

---

## ✨ 주요 기능

### 1. 🖥️ **브라우저 기반 리눅스 터미널**

- 웹 브라우저에서 실제 리눅스 명령어 실행
- 실시간 명령어 출력 및 인터랙티브 쉘
- 파일 시스템 탐색 및 관리

### 2. 🍎 **AI 과일 추천 시스템**

- Google Gemini AI 기반 과일 정보 제공
- RAG (Retrieval-Augmented Generation) 기술 활용
- 과일별 영양 정보, 효능, 추천 레시피

### 3. 💬 **실시간 채팅**

- WebSocket (STOMP) 기반 실시간 통신
- 전체 채팅, 익명 채팅, 귓속말 기능
- 채팅 명령어 지원 (`/w`, `/whisper`, `/r`)
- 온라인 사용자 목록 실시간 업데이트

### 4. 📝 **자유게시판**

- Toast UI Editor 기반 마크다운 에디터
- 파일 첨부 및 이미지 업로드
- 좋아요/싫어요 기능
- 댓글 시스템
- 검색 및 페이지네이션

### 5. 🔐 **사용자 인증**

- JWT 기반 인증 시스템
- OAuth 2.0 (Google, Naver) 소셜 로그인
- 역할 기반 접근 제어 (ROLE_USER, ROLE_ADMIN)

---

## 🛠️ 기술 스택

### Backend

- **Java 17**
- **Spring Boot 3.4.1**
  - Spring Security (JWT, OAuth 2.0)
  - Spring Data JPA
  - Spring WebSocket (STOMP)
- **MySQL 8.0**
- **QueryDSL** - 타입 세이프 쿼리
- **Lombok** - 보일러플레이트 코드 감소

### Frontend

- **React 19**
- **Material-UI (MUI)** - UI 컴포넌트 라이브러리
- **React Router** - 클라이언트 사이드 라우팅
- **SockJS + STOMP.js** - WebSocket 통신
- **Toast UI Editor** - 마크다운 에디터
- **Vite** - 빌드 도구

### DevOps & Tools

- **Nginx** - 리버스 프록시 및 정적 파일 서빙
- **Jenkins** - CI/CD 파이프라인
- **Git** - 버전 관리

---

## 🚀 시작하기

### 📋 사전 요구사항

- **Java 17** 이상
- **Node.js 18** 이상
- **MySQL 8.0** 이상
- **Maven 3.8** 이상

### 📥 설치 및 실행

#### 1. 저장소 클론

```bash
git clone https://github.com/duswntmd/TerminalNexus.git
cd TerminalNexus
```

#### 2. 데이터베이스 설정

```sql
CREATE DATABASE tn CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'tn_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON tn.* TO 'tn_user'@'localhost';
FLUSH PRIVILEGES;
```

#### 3. 환경 변수 설정

`src/main/resources/application.properties` 파일 생성:

```properties
# Database
spring.datasource.url=jdbc:mysql://localhost:3306/tn
spring.datasource.username=tn_user
spring.datasource.password=your_password

# JWT
jwt.secret=your-secret-key-min-256-bits
jwt.expiration=86400000

# Google Gemini API
gemini.api.key=your-gemini-api-key

# OAuth 2.0
spring.security.oauth2.client.registration.google.client-id=your-google-client-id
spring.security.oauth2.client.registration.google.client-secret=your-google-client-secret
spring.security.oauth2.client.registration.naver.client-id=your-naver-client-id
spring.security.oauth2.client.registration.naver.client-secret=your-naver-client-secret
```

#### 4. 백엔드 실행

```bash
# Maven으로 빌드 및 실행
./mvnw clean install
./mvnw spring-boot:run

# 또는 JAR 파일로 실행
java -jar target/tn-0.0.1-SNAPSHOT.jar
```

백엔드 서버: `http://localhost:8080`

#### 5. 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

프론트엔드 서버: `http://localhost:5173`

---

## 📁 프로젝트 구조

```
TerminalNexus/
├── src/main/java/kr/pe/tn/
│   ├── api/                    # REST API 컨트롤러
│   │   ├── ChatController.java
│   │   ├── FreeBoardController.java
│   │   └── FruitController.java
│   ├── config/                 # 설정 파일
│   │   ├── SecurityConfig.java
│   │   ├── WebSocketConfig.java
│   │   └── CorsConfig.java
│   ├── domain/                 # 도메인 모델
│   │   ├── chat/              # 채팅 도메인
│   │   ├── freeboard/         # 게시판 도메인
│   │   ├── fruit/             # 과일 AI 도메인
│   │   └── user/              # 사용자 도메인
│   ├── handler/               # WebSocket 이벤트 핸들러
│   └── TnApplication.java     # 메인 애플리케이션
├── frontend/
│   ├── src/
│   │   ├── components/        # React 컴포넌트
│   │   ├── pages/            # 페이지 컴포넌트
│   │   ├── context/          # Context API
│   │   └── App.jsx           # 메인 앱
│   ├── public/               # 정적 파일
│   └── package.json
└── README.md
```

---

## 📚 API 문서

### 인증 API

- `POST /user/loginForm` - 로그인
- `POST /api/user` - 회원가입
- `GET /api/user` - 현재 사용자 정보
- `POST /logout` - 로그아웃

### 게시판 API

- `GET /api/freeboard` - 게시글 목록
- `GET /api/freeboard/{id}` - 게시글 상세
- `POST /api/freeboard` - 게시글 작성
- `PUT /api/freeboard/{id}` - 게시글 수정
- `DELETE /api/freeboard/{id}` - 게시글 삭제
- `POST /api/freeboard/{id}/like` - 좋아요
- `POST /api/freeboard/{id}/dislike` - 싫어요

### 과일 AI API

- `GET /api/fruits` - 과일 목록
- `POST /api/fruits/ask` - AI에게 질문

### 채팅 API

- `GET /api/chat/rooms` - 채팅방 목록
- `GET /api/chat/users` - 온라인 사용자 목록

### WebSocket 엔드포인트

- `/ws-chat` - WebSocket 연결
- `/app/chat.sendMessage/{roomId}` - 메시지 전송
- `/app/chat.addUser/{roomId}` - 사용자 입장
- `/app/chat.whisper` - 귓속말 전송
- `/topic/{roomId}` - 채팅방 구독
- `/user/queue/whisper` - 귓속말 수신

---

## 🎨 채팅 명령어

- `/w 유저이름 메시지` - 귓속말 보내기
- `/whisper 유저이름 메시지` - 귓속말 보내기 (긴 버전)
- `/r 메시지` - 마지막 귓속말 대상에게 답장

---

## 🌐 배포

### 프로덕션 빌드

#### 백엔드

```bash
./mvnw clean package -DskipTests
java -jar target/tn-0.0.1-SNAPSHOT.jar
```

#### 프론트엔드

```bash
cd frontend
npm run build
```

빌드된 파일은 `frontend/dist` 디렉토리에 생성됩니다.

### Nginx 설정 예시

```nginx
server {
    listen 80;
    server_name tnhub.kr;

    location / {
        root /var/www/tn/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /ws-chat {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## 🤝 기여하기

기여를 환영합니다! 다음 단계를 따라주세요:

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

---

## 👨‍💻 개발자

**duswntmd** - [GitHub](https://github.com/duswntmd)

---

## 🙏 감사의 말

- [Spring Boot](https://spring.io/projects/spring-boot)
- [React](https://reactjs.org/)
- [Material-UI](https://mui.com/)
- [Google Gemini AI](https://ai.google.dev/)
- [Toast UI Editor](https://ui.toast.com/tui-editor)

---

## 📞 문의

프로젝트에 대한 질문이나 제안사항이 있으시면 이슈를 생성해주세요.

**Website**: [https://tnhub.kr](https://tnhub.kr)

---

<div align="center">
  Made with ❤️ by duswntmd
</div>
