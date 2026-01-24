# 환경 변수 설정 가이드

## 🔐 보안 중요 사항

이 프로젝트는 다음의 민감한 정보를 환경 변수로 관리합니다:

- Gemini API Key
- OAuth2 Client Secrets
- 데이터베이스 비밀번호
- 관리자 계정 정보

**절대로 API 키나 비밀번호를 코드에 하드코딩하지 마세요!**

## 📋 필수 환경 변수

### 1. Gemini API Key (필수)

```powershell
# Windows PowerShell
$env:GEMINI_API_KEY="your_gemini_api_key_here"

# Linux/Mac
export GEMINI_API_KEY="your_gemini_api_key_here"
```

**새 API 키 발급 방법:**

1. [Google AI Studio](https://aistudio.google.com/app/apikey) 접속
2. "Create API Key" 클릭
3. 발급받은 키를 위 명령어로 설정

### 2. 데이터베이스 설정 (선택사항)

```powershell
# Windows PowerShell
$env:DB_URL="jdbc:mysql://localhost/tn?useSSL=false&allowPublicKeyRetrieval=true&characterEncoding=UTF-8&serverTimezone=UTC"
$env:DB_USERNAME="tn"
$env:DB_PASSWORD="tn"

# Linux/Mac
export DB_URL="jdbc:mysql://localhost/tn?useSSL=false&allowPublicKeyRetrieval=true&characterEncoding=UTF-8&serverTimezone=UTC"
export DB_USERNAME="tn"
export DB_PASSWORD="tn"
```

### 3. 관리자 계정 설정 (선택사항)

```powershell
# Windows PowerShell
$env:ADMIN_USERNAME="admin"
$env:ADMIN_PASSWORD="강력한비밀번호"
$env:ADMIN_NICKNAME="관리자"
$env:ADMIN_EMAIL="admin@tnhub.kr"

# Linux/Mac
export ADMIN_USERNAME="admin"
export ADMIN_PASSWORD="강력한비밀번호"
export ADMIN_NICKNAME="관리자"
export ADMIN_EMAIL="admin@tnhub.kr"
```

## 🚀 애플리케이션 실행

### 개발 환경 (로컬)

```powershell
# 1. 환경 변수 설정
$env:GEMINI_API_KEY="your_api_key_here"

# 2. Spring Boot 실행
./mvnw spring-boot:run

# 3. Frontend 실행 (별도 터미널)
cd frontend
npm run dev
```

### IntelliJ IDEA에서 실행

1. **Run/Debug Configurations** 열기
2. **Environment variables** 섹션에 추가:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```
3. **Apply** → **OK** → 실행

### Docker 환경

```bash
# docker-compose.yml에서 environment 섹션 사용
environment:
  - GEMINI_API_KEY=${GEMINI_API_KEY}
  - DB_PASSWORD=${DB_PASSWORD}
```

## 🔍 환경 변수 확인

```powershell
# Windows PowerShell
echo $env:GEMINI_API_KEY

# Linux/Mac
echo $GEMINI_API_KEY
```

## ⚠️ 주의사항

1. **Git에 절대 커밋하지 마세요**
   - `.env` 파일을 사용하는 경우 반드시 `.gitignore`에 추가
   - `application.properties`에 실제 키 값을 넣지 마세요

2. **API 키가 유출된 경우**
   - 즉시 [Google AI Studio](https://aistudio.google.com/app/apikey)에서 키 삭제
   - 새 키 발급 후 환경 변수 업데이트
   - Git 히스토리에서 유출된 키 제거 필요 시 `git filter-branch` 사용

3. **운영 환경**
   - CI/CD 파이프라인(Jenkins, GitHub Actions 등)의 Secret 관리 기능 사용
   - 서버 환경 변수로 설정 (`/etc/environment` 또는 systemd service 파일)

## 📚 참고 자료

- [Spring Boot Externalized Configuration](https://docs.spring.io/spring-boot/docs/current/reference/html/features.html#features.external-config)
- [Google AI Studio](https://aistudio.google.com/)
