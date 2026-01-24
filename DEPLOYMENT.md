# 🚀 운영 서버 배포 가이드

## ⚠️ 배포 전 필수 체크리스트

- [ ] 새로운 Gemini API 키 발급 완료
- [ ] 운영 서버에 환경 변수 설정 완료
- [ ] 로컬에서 테스트 완료
- [ ] Git에 API 키가 커밋되지 않았는지 확인

---

## 📋 1단계: 운영 서버 환경 변수 설정

### Jenkins 서버에서 설정

Jenkins가 실행되는 서버에 SSH로 접속한 후:

```bash
# 1. 시스템 환경 변수 파일 편집 (영구 설정)
sudo nano /etc/environment

# 2. 다음 내용 추가
GEMINI_API_KEY="여기에_새로_발급받은_API_키_입력"

# 3. 저장 후 시스템에 적용
source /etc/environment

# 4. 확인
echo $GEMINI_API_KEY
```

### 또는 Jenkins에서 직접 설정

1. Jenkins 대시보드 접속
2. **Manage Jenkins** → **Configure System**
3. **Global properties** → **Environment variables** 체크
4. **Add** 클릭:
   - Name: `GEMINI_API_KEY`
   - Value: `여기에_새로_발급받은_API_키_입력`
5. **Save**

### 또는 Systemd Service 파일에 설정

Spring Boot를 systemd 서비스로 실행하는 경우:

```bash
# 1. 서비스 파일 편집
sudo nano /etc/systemd/system/tn.service

# 2. [Service] 섹션에 추가
[Service]
Environment="GEMINI_API_KEY=여기에_새로_발급받은_API_키_입력"
Environment="UPLOAD_PATH=/app/uploads"

# 3. 서비스 재시작
sudo systemctl daemon-reload
sudo systemctl restart tn
```

---

## 📋 2단계: 애플리케이션 빌드 및 배포

### 로컬에서 빌드

```bash
# 1. 최신 코드 pull
git pull origin main

# 2. 백엔드 빌드
./mvnw clean package -DskipTests

# 3. 프론트엔드 빌드
cd frontend
npm install
npm run build
cd ..
```

### 운영 서버로 전송

```bash
# JAR 파일 전송
scp target/tn-0.0.1-SNAPSHOT.jar user@tnhub.kr:/app/

# 프론트엔드 빌드 파일 전송
scp -r frontend/dist/* user@tnhub.kr:/var/www/tn/
```

### 또는 Jenkins CI/CD 사용

Jenkins 파이프라인이 설정되어 있다면:

1. GitHub에 코드 push
2. Jenkins가 자동으로 빌드 및 배포
3. 환경 변수는 위에서 설정한 것을 자동으로 사용

---

## 📋 3단계: 배포 후 확인

### 1. 애플리케이션 로그 확인

```bash
# Systemd 서비스 로그
sudo journalctl -u tn -f

# 또는 애플리케이션 로그 파일
tail -f /var/log/tn/application.log
```

### 2. Gemini API 테스트

브라우저에서 접속:

```
https://tnhub.kr/fruit-ai
```

과일 관련 질문을 입력하고 AI 응답이 정상적으로 오는지 확인

### 3. 에러 발생 시 체크사항

#### 403 PERMISSION_DENIED 에러

```
원인: API 키가 잘못되었거나 환경 변수가 설정되지 않음
해결:
1. 환경 변수 확인: echo $GEMINI_API_KEY
2. API 키 재발급: https://aistudio.google.com/app/apikey
3. 서비스 재시작
```

#### API 키를 찾을 수 없다는 에러

```
원인: 환경 변수가 애플리케이션에 전달되지 않음
해결:
1. 서비스 파일에 Environment 설정 확인
2. systemctl daemon-reload 실행
3. 서비스 재시작
```

---

## 🔒 보안 체크리스트

### 배포 전 확인사항

```bash
# 1. Git 히스토리에 API 키가 없는지 확인
git log --all --full-history -p -- src/main/resources/application.properties | grep -i "AIza"

# 2. 현재 코드에 하드코딩된 키가 없는지 확인
grep -r "AIza" src/ --include="*.java" --include="*.properties"

# 3. .gitignore 확인
cat .gitignore | grep -E "(\.env|runConfigurations)"
```

### 모두 깨끗하면 배포 진행!

---

## 📊 배포 후 모니터링

### 1. API 사용량 모니터링

[Google AI Studio](https://aistudio.google.com/app/apikey)에서:

- API 키 사용량 확인
- 할당량 초과 여부 확인
- 비정상적인 사용 패턴 감지

### 2. 애플리케이션 로그 모니터링

```bash
# Gemini API 호출 로그 확인
sudo journalctl -u tn | grep "Gemini API"

# 에러 로그 확인
sudo journalctl -u tn | grep "ERROR"
```

---

## 🆘 긴급 상황 대응

### API 키가 다시 유출된 경우

1. **즉시 조치**:

   ```bash
   # 1. Google AI Studio에서 해당 키 삭제
   # 2. 새 키 발급
   # 3. 운영 서버 환경 변수 업데이트
   sudo nano /etc/environment
   # 또는
   sudo nano /etc/systemd/system/tn.service

   # 4. 서비스 재시작
   sudo systemctl daemon-reload
   sudo systemctl restart tn
   ```

2. **Git 히스토리 정리** (필요시):
   ```bash
   # BFG Repo-Cleaner 사용 권장
   # 또는 새 저장소 생성
   ```

---

## ✅ 배포 완료 확인

- [ ] https://tnhub.kr 접속 가능
- [ ] 로그인/회원가입 정상 작동
- [ ] 과일 AI 페이지에서 질문/답변 정상 작동
- [ ] 채팅 기능 정상 작동
- [ ] 자유게시판 정상 작동
- [ ] 서버 로그에 에러 없음

---

## 📞 문제 발생 시

1. 서버 로그 확인
2. 환경 변수 설정 재확인
3. API 키 유효성 확인
4. 필요시 서비스 재시작

**모든 설정이 완료되면 안전하게 배포할 수 있습니다!** 🚀
