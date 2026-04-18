# 🔧 트러블슈팅 가이드

배포 및 운영 중 발생했던 이슈와 해결 방법을 정리한 문서입니다.

---

## 📋 이슈 목록

| # | 이슈 | 원인 | 발생일 | 상태 |
|---|------|------|--------|------|
| 1 | [Jenkins 빌드 실패 - Failed to exec spawn helper](#1-jenkins-빌드-실패---failed-to-exec-spawn-helper) | Swap 메모리 소진 | 2026-04-18 | ✅ 해결 |
| 2 | [Nginx 502 Bad Gateway](#2-nginx-502-bad-gateway) | WebSocket 설정 오류 | 2026-01-24 | ✅ 해결 |
| 3 | [WebSocket SecurityError (HTTPS)](#3-websocket-securityerror-https) | WS/WSS 프로토콜 불일치 | 2026-01-24 | ✅ 해결 |
| 4 | [Nginx 404/405 API 라우팅 실패](#4-nginx-404405-api-라우팅-실패) | Nginx proxy 설정 누락 | 2026-01-11 | ✅ 해결 |

---

## 1. Jenkins 빌드 실패 - Failed to exec spawn helper

### 📅 발생일: 2026-04-18

### 증상

- GitHub Webhook은 정상 동작 (Jenkins 빌드 트리거 됨)
- 빌드가 시작되자마자 즉시 실패 (23ms 만에 종료)
- 빌드 시간: 0초 (Git Clone 단계조차 진입 못함)

### 에러 메시지

```
java.io.IOException: error=0, Failed to exec spawn helper: pid: 2973698, exit value: 1
Cannot run program "git" (in directory "/var/lib/jenkins/caches/git-..."): 
error=0, Failed to exec spawn helper: pid: 2973698, exit value: 1

Caused: hudson.plugins.git.GitException: Could not init /var/lib/jenkins/caches/git-...
```

### 원인 분석

JVM이 자식 프로세스를 `fork/exec`하지 못하는 **시스템 레벨** 문제였음.  
`git`이 설치되지 않은 것이 아니라, **OS가 새로운 프로세스를 생성할 수 없는 상태**였음.

**근본 원인:**

| 항목 | 상태 | 판정 |
|------|------|------|
| 디스크 | 458G 중 33G 사용 (8%) | ✅ 정상 |
| 메모리 | 7.7G 중 4.6G 가용 | ✅ 정상 |
| **Swap** | **1.0G 중 11MB만 남음** | ❌ **소진** |
| 시스템 | 재시작 필요 메시지 표시, 마지막 재부팅 1달 이상 전 | ⚠️ 불안정 |

- Swap이 거의 0에 가까워져 JVM의 `fork()` 시스템콜이 실패
- 오랜 기간 재부팅하지 않아 좀비 프로세스 및 메모리 누수 누적

### 해결 방법

```bash
# 서버 재부팅 (가장 확실한 해결)
sudo reboot
```

재부팅 후 효과:
- ✅ Swap 메모리 초기화
- ✅ 대기 중인 시스템 업데이트 적용
- ✅ 좀비 프로세스 정리
- ✅ Jenkins 서비스 자동 재시작

### 예방 방법

```bash
# 1. Swap 사용량 모니터링 (80% 이상이면 주의)
free -h

# 2. Swap 수동 초기화 (재부팅 없이)
sudo swapoff -a && sudo swapon -a

# 3. Swap 크기 증설 (1GB → 4GB 권장)
sudo swapoff /swapfile
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 4. 영구 적용 확인
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 5. 주기적 시스템 상태 확인 습관
df -h && free -h && uptime
```

### 진단 체크리스트

Jenkins 빌드가 갑자기 실패할 때 아래 순서로 확인:

```bash
# Step 1: 디스크 확인
df -h
# → 90% 이상이면 docker system prune -af 실행

# Step 2: 메모리 & Swap 확인
free -h
# → Swap 가용이 100MB 이하면 swapoff/swapon 또는 reboot

# Step 3: 프로세스 수 확인
ps aux | wc -l
# → 500개 이상이면 비정상

# Step 4: 시스템 재시작 필요 여부
cat /var/run/reboot-required 2>/dev/null && echo "재부팅 필요!" || echo "정상"
```

---

## 2. Nginx 502 Bad Gateway

### 📅 발생일: 2026-01-24

### 증상

- `https://tnhub.kr` 접속 시 502 Bad Gateway
- WebSocket 관련 Nginx 설정 수정 후 발생

### 원인

Nginx에서 백엔드 서버(Spring Boot, port 8080)로의 프록시 연결 실패.  
WebSocket 설정 추가 시 기존 `proxy_pass` 설정이 꼬여서 발생.

### 해결 방법

```nginx
# /etc/nginx/sites-available/default

# REST API
location /api {
    proxy_pass http://localhost:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# WebSocket - 별도 location 블록으로 분리
location /ws-chat {
    proxy_pass http://localhost:8080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 3600s;
}
```

```bash
# 설정 검증 후 재시작
sudo nginx -t && sudo systemctl reload nginx
```

### 예방 방법

- Nginx 설정 변경 전 반드시 `sudo nginx -t`로 문법 검증
- WebSocket과 일반 HTTP 프록시는 **별도 location 블록**으로 분리

---

## 3. WebSocket SecurityError (HTTPS)

### 📅 발생일: 2026-01-24

### 증상

- 로컬(`http://localhost`)에서는 채팅 정상 동작
- 배포 환경(`https://tnhub.kr`)에서 채팅 시 `SecurityError` 발생

### 원인

프론트엔드에서 WebSocket 연결 시 프로토콜을 `ws://`로 하드코딩.  
HTTPS 페이지에서 `ws://`(비암호화) 연결을 시도하면 브라우저가 차단함.

### 해결 방법

```javascript
// ❌ Before - 하드코딩
const socket = new SockJS('ws://tnhub.kr/ws-chat');

// ✅ After - 프로토콜 자동 감지
const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
const host = window.location.host;
const socket = new SockJS(`${protocol}//${host}/ws-chat`);
```

### 예방 방법

- WebSocket URL에 프로토콜을 하드코딩하지 말 것
- `window.location`을 활용하여 동적으로 결정

---

## 4. Nginx 404/405 API 라우팅 실패

### 📅 발생일: 2026-01-11

### 증상

- 프론트엔드 페이지는 정상 로딩
- 회원가입, 로그인, 게시판 API 호출 시 404 또는 405 에러

### 원인

Nginx에서 `/api/*` 외의 백엔드 경로(`/login`, `/oauth2/*`, `/user/*` 등)에 대한 프록시 설정이 누락됨.  
Nginx가 이 경로들을 React SPA의 정적 파일로 처리하려 해서 404 발생.

### 해결 방법

```nginx
# 백엔드로 프록시해야 할 모든 경로를 명시적으로 등록
location ~ ^/(user|login|oauth2|logout|jwt|cookie|display|download|upload)(/|$) {
    proxy_pass http://localhost:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### 예방 방법

- 새로운 백엔드 API 경로 추가 시 **Nginx 설정도 함께 업데이트**
- `/api` prefix로 통일하면 하나의 location 블록으로 관리 가능

---

## 🛡️ 서버 정기 점검 체크리스트

월 1회 이상 아래 항목을 점검하여 장애를 예방하세요.

```bash
# === 서버 상태 전체 점검 스크립트 ===

echo "=== 디스크 ==="
df -h | grep -E "^/dev"

echo "=== 메모리 & Swap ==="
free -h

echo "=== 시스템 가동 시간 ==="
uptime

echo "=== 재부팅 필요 여부 ==="
cat /var/run/reboot-required 2>/dev/null && echo "⚠️ 재부팅 필요!" || echo "✅ 정상"

echo "=== Docker 컨테이너 ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo "=== Docker 디스크 사용량 ==="
docker system df

echo "=== Nginx 상태 ==="
sudo systemctl status nginx --no-pager -l

echo "=== Jenkins 상태 ==="
sudo systemctl status jenkins --no-pager -l
```

> **💡 Tip:** 위 스크립트를 `/home/ubuntu/health-check.sh`로 저장해두면 `bash health-check.sh` 한 줄로 전체 점검 가능!
