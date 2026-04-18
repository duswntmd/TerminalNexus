# 🔐 환경 변수 설정 가이드

## 개요

이 프로젝트는 `spring-dotenv`를 사용하여 루트 디렉토리의 `.env` 파일을 자동으로 로드합니다.
배포 환경에서는 Docker `-e` 옵션 또는 Jenkins Credentials를 통해 주입합니다.

> ⚠️ **절대로 API 키나 비밀번호를 코드에 하드코딩하지 마세요!**

---

## 📋 전체 환경 변수 목록

| 변수명 | 필수 | 설명 | 기본값 |
|--------|:----:|------|--------|
| `DB_URL` | | MySQL 접속 URL | `jdbc:mysql://localhost/tn?...` |
| `DB_USERNAME` | | DB 사용자명 | `tn` |
| `DB_PASSWORD` | | DB 비밀번호 | `tn` |
| `GEMINI_API_KEY` | ✅ | Google Gemini AI API 키 | — |
| `ADMIN_PASSWORD` | ✅ | 관리자 초기 비밀번호 | — |
| `NAVER_CLIENT_ID` | ✅ | 네이버 OAuth2 Client ID | — |
| `NAVER_CLIENT_SECRET` | ✅ | 네이버 OAuth2 Client Secret | — |
| `GOOGLE_CLIENT_ID` | ✅ | 구글 OAuth2 Client ID | — |
| `GOOGLE_CLIENT_SECRET` | ✅ | 구글 OAuth2 Client Secret | — |
| `OAUTH2_BASE_URL` | | OAuth2 리다이렉트 베이스 URL | `http://localhost:8080` |
| `PORTONE_IMP_KEY` | | PortOne REST API Key | — |
| `PORTONE_IMP_SECRET` | | PortOne REST API Secret | — |
| `UPLOAD_PATH` | | 파일 업로드 경로 | `${user.dir}/upload` |
| `SERVER_PORT` | | 서버 포트 | `8080` |
| `JPA_DDL_AUTO` | | JPA DDL 전략 | `update` |

---

## 🖥️ 로컬 개발 환경

### 방법 1: `.env` 파일 (권장)

프로젝트 루트에 `.env` 파일을 생성합니다:

```env
# Database
DB_USERNAME=tn
DB_PASSWORD=tn

# OAuth2
NAVER_CLIENT_ID=your_naver_client_id
NAVER_CLIENT_SECRET=your_naver_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_secret

# AI
GEMINI_API_KEY=your_gemini_api_key

# Admin
ADMIN_PASSWORD=your_admin_password
```

> `.env` 파일은 `.gitignore`에 포함되어 Git에 올라가지 않습니다.

### 방법 2: IntelliJ IDEA

1. **Run** → **Edit Configurations**
2. **Environment variables** 섹션에 필요한 변수 추가
3. **Apply** → **OK**

### 방법 3: 터미널에서 직접 설정

```powershell
# Windows PowerShell
$env:GEMINI_API_KEY="your_api_key"
$env:ADMIN_PASSWORD="your_password"
```

```bash
# Linux/Mac
export GEMINI_API_KEY="your_api_key"
export ADMIN_PASSWORD="your_password"
```

---

## 🚀 배포 환경 (Docker + Jenkins)

### Docker 실행 시

```bash
docker run -d \
  -e "GEMINI_API_KEY=your_key" \
  -e "ADMIN_PASSWORD=your_password" \
  -e "NAVER_CLIENT_ID=..." \
  -e "NAVER_CLIENT_SECRET=..." \
  -e "GOOGLE_CLIENT_ID=..." \
  -e "GOOGLE_CLIENT_SECRET=..." \
  -e "OAUTH2_BASE_URL=https://tnhub.kr" \
  ...
```

### Jenkins Credentials

1. **Jenkins** → **Manage Jenkins** → **Manage Credentials**
2. Secret text로 각 환경 변수 등록
3. Jenkinsfile에서 `credentials()` 바인딩 사용

---

## 🔑 API 키 발급 방법

### Gemini API

1. [Google AI Studio](https://aistudio.google.com/app/apikey) 접속
2. **Create API Key** 클릭
3. 발급받은 키를 `.env`에 설정

### Naver OAuth2

1. [네이버 개발자 센터](https://developers.naver.com/) 접속
2. 애플리케이션 등록 → Client ID/Secret 확인
3. 콜백 URL: `http://localhost:8080/login/oauth2/code/naver` (로컬)
4. 콜백 URL: `https://tnhub.kr/login/oauth2/code/naver` (운영)

### Google OAuth2

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. **API 및 서비스** → **사용자 인증 정보** → OAuth 2.0 클라이언트 ID
3. 승인된 리디렉션 URI 추가

---

## ⚠️ 키 유출 시 대응

1. 해당 서비스에서 즉시 키 삭제/비활성화
2. 새 키 발급
3. `.env` 및 운영 환경 변수 업데이트
4. Git 히스토리에 키가 포함된 경우 `git filter-branch` 또는 BFG Repo-Cleaner로 제거
