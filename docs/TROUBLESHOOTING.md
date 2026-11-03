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
| 5 | [검색엔진에 모든 페이지가 빈 화면으로 수집](#5-검색엔진에-모든-페이지가-빈-화면으로-수집) | SPA 원본 HTML에 본문 없음 | 2026-11-01 | ✅ 해결 |
| 6 | [사전 렌더링 페이지가 전부 301](#6-사전-렌더링-페이지가-전부-301) | 폴더형 파일에 nginx가 슬래시 추가 | 2026-11-01 | ✅ 해결 |
| 7 | [화면을 옮겨도 제목이 바뀌지 않음](#7-화면을-옮겨도-제목이-바뀌지-않음) | react-helmet-async 2.x와 React 19 비호환 | 2026-11-01 | ✅ 해결 |
| 8 | [게시판 저장형 XSS](#8-게시판-저장형-xss) | 뷰어 HTML 정화가 꺼져 있음 | 2026-11-01 | ✅ 해결 |

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

## 5. 검색엔진에 모든 페이지가 빈 화면으로 수집

### 📅 발생일: 2026-11-01

### 증상
- 애드센스 거절: "게시자 콘텐츠가 없는 화면", "가치가 별로 없는 콘텐츠"
- Search Console에서 발견된 페이지가 5개뿐

### 원인
React 단일 페이지 앱이라 서버가 주는 원본 HTML은 어느 주소든 같은 제목에 빈 `<div id="root">`였다. 브라우저에서는 정상으로 보여서 알아채기 어려웠다.

```bash
curl -s https://tnhub.kr/tools/subnet | grep -o "<title>[^<]*"   # 모든 주소가 같은 제목
```

### 해결
빌드 뒤 `frontend/scripts/prerender.mjs`가 공개 페이지마다 제목, 설명, canonical, 본문을 넣은 HTML을 만든다. `sitemap.xml`과 `rss.xml`도 같은 목록으로 생성한다.

### 예방
- 공개 페이지를 추가하면 `prerender.mjs`에도 등록한다.
- SEO 점검은 브라우저가 아니라 curl로 원본 HTML을 본다.

---

## 6. 사전 렌더링 페이지가 전부 301

### 📅 발생일: 2026-11-01

### 증상
`/tools/json` 요청이 `/tools/json/`으로 301 리다이렉트되어 canonical 주소와 어긋남

### 원인
처음에 `tools/json/index.html`처럼 폴더로 만들었다. nginx는 폴더를 가리키는 주소에 끝 슬래시를 붙여 리다이렉트한다.

### 해결
`tools/json.html` 파일로 만들고 `try_files $uri $uri.html $uri/ /index.html;`로 제공한다. HTML 캐시 방지는 응답 형식으로 판단하는 `map`으로 바꿔 location마다 반복하지 않게 했다.

### 예방
nginx 변경은 운영 전에 다른 포트의 임시 인스턴스로 실제 요청을 보내 확인한다. `nginx -t`는 문법만 본다.

---

## 7. 화면을 옮겨도 제목이 바뀌지 않음

### 📅 발생일: 2026-11-01

### 증상
첫 화면의 제목, 설명, canonical이 다른 화면으로 이동해도 그대로 남음

### 원인
react-helmet-async 2.0.5는 React 19를 지원하지 않는다 (peerDependencies가 React 18까지). 3.0으로 올리자 정적 태그와 새 태그가 함께 남아 canonical이 두 개가 됐다.

### 해결
3.0으로 올리고, `src/seoTags.js`가 React가 같은 태그를 넣는 순간 정적 태그를 지운다.

---

## 8. 게시판 저장형 XSS

### 📅 발생일: 2026-11-01

### 증상
게시글 본문의 `onerror` 속성, `<script>`, `javascript:` 링크가 읽기 화면에 그대로 들어감

### 원인
유튜브 임베드를 살리려고 뷰어의 HTML 정화를 `customHTMLSanitizer={(html) => html}`로 꺼 두었다. 로그인 토큰이 localStorage에 있어 계정 탈취로 이어질 수 있었다.

### 해결
`src/util/sanitizeHtml.js`에서 DOMPurify로 정화하고 iframe은 유튜브 임베드 주소만 허용한다. 글을 읽을 때 정화하므로 이미 저장된 글도 보호된다. 운영 게시글을 검사했을 때 악성 코드는 없었다.

### 예방
안전장치를 끄는 방식으로 기능 문제를 풀지 않는다. 보안 기능은 실제 공격 문자열로 시험한다.

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

> **💡 Tip:** 위 스크립트를 서버에 `health-check.sh`로 저장해두면 `bash health-check.sh` 한 줄로 전체 점검 가능!
