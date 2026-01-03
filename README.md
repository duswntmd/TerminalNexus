# TerminalNexus (TN)

차세대 클라우드 터미널 생태계 플랫폼

## 📋 프로젝트 개요

TN은 개발자와 엔지니어를 위한 직관적이고 강력한 클라우드 터미널 접속 관리 서비스입니다.

## 🛠️ 기술 스택

### Backend

- **Spring Boot** 3.x
- **Spring Security** (JWT + OAuth2)
- **Spring Data JPA**
- **MySQL** 8.x
- **Java** 17+

### Frontend

- **React** 18.x
- **Vite** 7.x
- **Material-UI** (MUI)
- **React Router** 6.x
- **i18next** (다국어 지원)

## 🚀 시작하기

### 사전 요구사항

- Java 17 이상
- Node.js 18 이상
- MySQL 8.0 이상

### 백엔드 실행

```bash
# 프로젝트 루트 디렉토리에서
./mvnw spring-boot:run
```

또는 IntelliJ IDEA에서:

1. `src/main/java/kr/pe/tn/TnApplication.java` 열기
2. `main` 메서드 옆 ▶️ 버튼 클릭
3. "Run 'TnApplication'" 선택

### 프론트엔드 실행

```bash
# frontend 디렉토리로 이동
cd frontend

# 의존성 설치 (최초 1회)
npm install

# 개발 서버 실행
npm run dev
```

브라우저에서 `http://localhost:5173` 접속

## 👤 초기 관리자 계정

애플리케이션 최초 실행 시 자동으로 생성됩니다:

```
아이디: admin
비밀번호: wjdxhdtkantlf
```

> ⚠️ **보안 경고**: 운영 환경에서는 반드시 비밀번호를 변경하세요!

환경변수로 커스터마이징 가능:

```properties
admin.init.username=${ADMIN_USERNAME:admin}
admin.init.password=${ADMIN_PASSWORD:wjdxhdtkantlf}
admin.init.nickname=${ADMIN_NICKNAME:관리자}
admin.init.email=${ADMIN_EMAIL:admin@tnhub.kr}
```

## 📁 프로젝트 구조

```
TN/
├── src/
│   ├── main/
│   │   ├── java/kr/pe/tn/
│   │   │   ├── api/              # REST API Controllers
│   │   │   ├── config/           # 설정 (Security, Admin 등)
│   │   │   ├── domain/
│   │   │   │   ├── user/         # 사용자 도메인
│   │   │   │   └── freeboard/    # 게시판 도메인
│   │   │   └── security/         # JWT, OAuth2 설정
│   │   └── resources/
│   │       └── application.properties
│   └── test/
└── frontend/
    ├── src/
    │   ├── components/       # 공통 컴포넌트
    │   ├── pages/           # 페이지 컴포넌트
    │   ├── locales/         # 다국어 번역 파일
    │   └── context/         # React Context (인증 등)
    └── vite.config.js
```

## 🔑 주요 기능

### 사용자 기능

- ✅ 회원가입 / 로그인 (자체 + OAuth2)
- ✅ 마이페이지 (정보 수정 / 탈퇴)
- ✅ 자유게시판 (CRUD, 좋아요/싫어요, 댓글, 파일 첨부)
- ✅ 다국어 지원 (한국어/영어)

### 관리자 기능

- ✅ 초기 관리자 계정 자동 생성
- ✅ 전체 회원 목록 조회
- ✅ 회원 정보 수정 (닉네임, 이메일, 비밀번호, 권한, 잠금 상태)
- ✅ 회원 삭제
- ✅ 모든 게시글 수정/삭제 권한

## 🔐 보안 설정

### JWT 인증

- Access Token: 30분 유효
- Refresh Token: 7일 유효
- HTTP-Only 쿠키로 안전하게 저장

### OAuth2 지원

- Google 로그인
- Naver 로그인

### 권한 계층

```
ADMIN > USER
```

관리자는 자동으로 USER 권한도 포함

## 🌐 API 엔드포인트

### 사용자 API

```
POST   /api/user              # 회원가입
GET    /api/user              # 사용자 정보 조회
PUT    /api/user              # 사용자 정보 수정
DELETE /api/user              # 회원 탈퇴
POST   /api/user/exist        # 아이디 중복 확인
POST   /api/user/exist/nickname  # 닉네임 중복 확인
```

### 관리자 API

```
GET    /admin/users           # 전체 회원 목록
GET    /admin/users/{id}      # 특정 회원 조회
PUT    /admin/users/{id}      # 회원 정보 수정
DELETE /admin/users/{id}      # 회원 삭제
```

### 게시판 API

```
GET    /freeboard             # 게시글 목록
POST   /freeboard             # 게시글 작성
GET    /freeboard/{id}        # 게시글 조회
PUT    /freeboard/{id}        # 게시글 수정
DELETE /freeboard/{id}        # 게시글 삭제
POST   /freeboard/{id}/like   # 좋아요 토글
POST   /freeboard/{id}/dislike # 싫어요 토글
```

## 🔧 환경 설정

### application.properties 주요 설정

```properties
# Database
spring.datasource.url=jdbc:mysql://localhost:3306/tn
spring.datasource.username=root
spring.datasource.password=your_password

# JWT
jwt.secret=your-secret-key
jwt.access-token-validity=1800000
jwt.refresh-token-validity=604800000

# OAuth2
spring.security.oauth2.client.registration.google.client-id=your-client-id
spring.security.oauth2.client.registration.google.client-secret=your-client-secret

# File Upload
spring.servlet.multipart.max-file-size=1024MB
spring.servlet.multipart.max-request-size=1024MB
```

## 📝 개발 가이드

### 코드 스타일

- **Backend**: Clean Code 원칙 (SOLID, DRY, KISS)
- **Frontend**: 함수형 컴포넌트 + Hooks
- **명명 규칙**:
  - Java: camelCase (메서드), PascalCase (클래스)
  - JavaScript: camelCase (변수/함수), PascalCase (컴포넌트)

### Git 커밋 메시지

```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 포맷팅
refactor: 코드 리팩토링
test: 테스트 코드
chore: 빌드 설정 등
```

## 🐛 트러블슈팅

### 포트 충돌

```bash
# 8080 포트 사용 중인 프로세스 확인 (Windows)
netstat -ano | findstr :8080

# 프로세스 종료
taskkill /PID <PID> /F
```

### 프론트엔드 빌드 오류

```bash
# node_modules 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install
```

### 데이터베이스 연결 오류

1. MySQL 서버 실행 확인
2. 데이터베이스 생성 확인: `CREATE DATABASE tn;`
3. 계정 권한 확인

## 📞 문의

- Email: contact@tn.pe.kr
- GitHub Issues: [프로젝트 이슈 페이지]

## 📄 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.

---

**Made with ❤️ by TN Team**
