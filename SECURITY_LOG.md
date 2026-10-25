# 🛡️ 보안 작업 및 장애 대응 일지

> 작성일: 2026-03-08

---

## 📋 목차

1. [서버 장애 대응 - 502 Bad Gateway](#1-서버-장애-대응---502-bad-gateway)
2. [악성코드 공격 분석](#2-악성코드-공격-분석)
3. [Gemini API Key 보안 강화](#3-gemini-api-key-보안-강화)
4. [spring-dotenv 도입 - 로컬 개발환경 개선](#4-spring-dotenv-도입---로컬-개발환경-개선)
5. [서버(라즈베리파이) 보안 점검 및 조치](#5-서버라즈베리파이-보안-점검-및-조치-2026-10-25)

---

## 1. 서버 장애 대응 - 502 Bad Gateway

### 증상

```
POST https://tnhub.kr/api/user/exist 502 (Bad Gateway)
```

### 원인 분석

- Nginx 에러 로그: `connect() failed (111: Connection refused)` → Spring Boot 미실행
- `last` 명령어로 확인: 2025-09-11부터 **178일 무중단 운영** 후 오늘 재부팅됨
- **Spring Boot가 systemd 서비스 미등록** → 재부팅 후 자동시작 안 됨

### 해결

```bash
# Docker 컨테이너 재시작
docker start tn_container

# 또는 deploy-backend.sh 재실행
./deploy-backend.sh
```

### 재발 방지

- `systemd` 서비스 등록 권장 (자동 재시작 설정)
- Spring Boot 서비스 등록 방법은 `DEPLOYMENT.md` 참고

---

## 2. 악성코드 공격 분석

### 발견된 로그

```
client: 89.248.168.239
request: "POST /api/vendor/phpunit/phpunit/src/Util/PHP/eval-stdin.php HTTP/1.1"
```

### 공격 분류

| 항목            | 내용                                          |
| --------------- | --------------------------------------------- |
| **공격 종류**   | 자동화 취약점 스캐닝 (Reconnaissance)         |
| **노린 취약점** | CVE-2017-9841 (PHPUnit Remote Code Execution) |
| **피해 여부**   | ❌ 없음                                       |

### 피해 없는 이유

1. 본 서비스는 **Spring Boot (Java)** 사용 → PHP 파일 자체가 없음
2. 공격 당시 Spring Boot가 꺼져있어 요청이 전달조차 안 됨
3. `lastb` 확인 결과 비정상 SSH 접근 없음 (내부 IP 1건만)

### 보안 조치 (권장)

```nginx
# /etc/nginx/sites-available/tnhub.kr
# PHP 파일 요청 차단
location ~* \.php$ {
    return 444;
}

# 개발/테스트 경로 차단
location ~* /(vendor|phpunit|composer|\.git|\.env) {
    return 444;
}
```

```bash
# Fail2Ban 설치 (반복 공격 IP 자동 차단)
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
```

---

## 3. Gemini API Key 보안 강화

### 문제

GitHub 공개 저장소에 다음 민감정보가 하드코딩되어 노출됨:

- `GEMINI_API_KEY` (deploy-backend.sh, Jenkinsfile)
- `ADMIN_PASSWORD` (deploy-backend.sh)
- OAuth2 Client ID/Secret (application.properties)

### 해결 방법

#### 3-1. Jenkins Credentials 등록

Jenkins에 민감정보를 암호화하여 저장:

```
Jenkins 관리 → Credentials → System
→ Global credentials → Add Credentials
Kind: Secret text
```

등록 항목:
| ID | 용도 |
|----|------|
| `GEMINI_API_KEY` | Gemini AI API Key |
| `ADMIN_PASSWORD` | 관리자 초기 비밀번호 |

#### 3-2. Jenkinsfile 수정 - withCredentials 적용

```groovy
withCredentials([
    string(credentialsId: 'GEMINI_API_KEY', variable: 'GEMINI_KEY'),
    string(credentialsId: 'ADMIN_PASSWORD', variable: 'ADMIN_PASS')
]) {
    sh """
        docker run -d \
            -e "GEMINI_API_KEY=\${GEMINI_KEY}" \
            -e "ADMIN_PASSWORD=\${ADMIN_PASS}" \
            ...
    """
}
```

> ✅ Jenkinsfile은 GitHub에 공개되어도 **실제 키 값은 노출 안 됨**

#### 3-3. 로컬 개발용 .env 파일

```bash
# .env (Git 추적 안 됨 - .gitignore 등록)
GEMINI_API_KEY=실제키값
ADMIN_PASSWORD=관리자비밀번호
```

#### 3-4. .gitignore 업데이트

```gitignore
.env
.env.*
*.env
```

---

## 4. spring-dotenv 도입 - 로컬 개발환경 개선

### 배경

Spring Boot는 `.env` 파일을 기본적으로 읽지 않음.  
기존에는 IntelliJ Run Configuration에 환경변수를 수동 설정해야 했음.

### 해결 - spring-dotenv 라이브러리 추가

**pom.xml:**

```xml
<!-- .env 파일 자동 로드 (로컬 개발용) -->
<dependency>
    <groupId>me.paulschwarz</groupId>
    <artifactId>spring-dotenv</artifactId>
    <version>4.0.0</version>
</dependency>
```

### 동작 방식

```
앱 시작
  └─ spring-dotenv가 프로젝트 루트 .env 파일 자동 읽기
       └─ GEMINI_API_KEY → 시스템 환경변수로 등록
            └─ application.properties의 ${GEMINI_API_KEY} 정상 주입
```

### 환경별 키 주입 방식 비교

| 환경         | 방법                              | 파일                 |
| ------------ | --------------------------------- | -------------------- |
| 로컬 개발    | spring-dotenv → `.env` 자동 로드  | `.env` (gitignore됨) |
| Jenkins 배포 | Jenkins Credentials               | Jenkins 서버 내부    |
| 직접 배포    | `deploy-backend.sh` → `.env` 읽기 | 서버의 `.env`        |

---

## ✅ 오늘 변경된 파일 목록

| 파일                     | 변경 내용                                     |
| ------------------------ | --------------------------------------------- |
| `Jenkinsfile`            | `withCredentials()`로 민감정보 분리           |
| `deploy-backend.sh`      | `.env` 파일에서 읽도록 변경                   |
| `application.properties` | Gemini key 환경변수로 분리                    |
| `pom.xml`                | `spring-dotenv` 의존성 추가                   |
| `.gitignore`             | `.env`, `Dockerfile`, `app.jar` 추가          |
| `.env`                   | 로컬 개발용 환경변수 파일 (신규, gitignore됨) |
| `.env.example`           | 환경변수 템플릿 (신규, 커밋됨)                |

---

## 5. 서버(라즈베리파이) 보안 점검 및 조치 (2026-10-25)

KISA 「주요정보통신기반시설 기술적 취약점 분석·평가 방법 상세가이드」 Unix 서버 항목(U-01~U-67) 기준 점검.
운영 편의를 해치지 않는 선에서 **외부에서 공격 가능한 위험**만 조치함.

### 점검 결과 요약

| 항목 | 결과 | 조치 |
| ---- | ---- | ---- |
| U-28 접속 IP·포트 제한 | 🔴 방화벽 비활성, MySQL(3306)·백엔드(8080)·Jenkins(9090) 인터넷 노출 | ufw 활성화, 8080 내부 바인딩 |
| DB 계정 | 🔴 `tn@'%'` 비밀번호가 추측 가능한 약한 값(과거 코드에 평문 노출) + 3306 인터넷 노출 | 방화벽으로 LAN·Docker만 허용 (비밀번호 변경은 별도 필요) |
| U-45~48 메일 서비스 | 🟡 postfix 전체 인터페이스 리스닝, VRFY 허용 | loopback-only, VRFY 비활성 |
| U-01 root 원격 접속 | ✅ `prohibit-password` | - |
| U-04/16/18 계정·권한 파일 | ✅ 정상 권한, UID 0은 root뿐, 빈 비밀번호 없음 | - |
| U-34~44 불필요 서비스 | ✅ telnet/ftp/nfs/rpc/snmp 없음 | - |
| U-64 보안 패치 | ✅ unattended-upgrades 활성, 대기 업데이트 0 | - |
| U-65 시각 동기화 | ✅ NTP 동기화 | - |
| Jenkins 익명 접근 | ✅ 403 | - |

### 방화벽(ufw) 규칙

| 대상 | 출발지 | 용도 |
| ---- | ------ | ---- |
| 전체 포트 | 192.168.0.0/24 | 집 내부망 (SSH, 원격 데스크톱, DB, InfluxDB 등 기존처럼 사용) |
| 80, 443 | 전체 | 웹 서비스 |
| 9090 | 전체 | Jenkins (GitHub 웹훅) |
| 3306 | 172.16.0.0/12 | Docker 컨테이너 → MySQL |

- Docker가 publish한 포트는 ufw를 우회하므로, 백엔드 컨테이너는 `-p 127.0.0.1:8080:8080`으로 내부에서만 받도록 변경 (Jenkinsfile)
- 규칙 확인: `sudo ufw status numbered`

### 남은 권장 사항

- MySQL `tn` 계정 비밀번호를 강력한 값으로 변경 후 Jenkins Credential `DB_PASSWORD` 갱신
- 공유기 포트포워딩에서 3306, 8080 제거 (서버 방화벽으로 이미 차단됨)
- Jenkins 관리자 비밀번호 강도 확인 (9090이 인터넷에 열려 있음)
