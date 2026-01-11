#!/bin/bash

echo "🚀 백엔드 배포 시작..."
echo ""

# 1. JAR 파일 확인
if [ ! -f "target/tn-0.0.1-SNAPSHOT.jar" ]; then
    echo "❌ JAR 파일이 없습니다. 먼저 빌드를 실행하세요:"
    echo "   ./mvnw clean package -DskipTests"
    exit 1
fi

echo "✅ JAR 파일 확인 완료"
echo ""

# 2. Docker 이미지 빌드
echo "🐳 Docker 이미지 빌드 중..."
cp target/tn-0.0.1-SNAPSHOT.jar app.jar

cat > Dockerfile << 'EOF'
FROM eclipse-temurin:21-jre
COPY app.jar /tn.jar
VOLUME /app/uploads
EXPOSE 8080
CMD ["java", "-jar", "/tn.jar"]
EOF

docker build --no-cache -t duswntmd/tn:1.0 .
echo "✅ Docker 이미지 빌드 완료"
echo ""

# 3. 기존 컨테이너 중지 및 삭제
echo "🛑 기존 컨테이너 중지 중..."
docker stop tn_container 2>/dev/null || true
docker rm tn_container 2>/dev/null || true
docker ps --filter "publish=8080" -q | xargs -r docker stop 2>/dev/null || true
echo "✅ 기존 컨테이너 정리 완료"
echo ""

# 4. 새 컨테이너 실행
echo "🚀 새 컨테이너 실행 중..."
docker run -d \
    -p 8080:8080 \
    -v /home/ubuntu/uploads:/app/uploads \
    --name tn_container \
    --add-host=host.docker.internal:host-gateway \
    -e "UPLOAD_PATH=/app/uploads" \
    -e "SPRING_DATASOURCE_URL=jdbc:mysql://host.docker.internal:3306/tn?useSSL=false&allowPublicKeyRetrieval=true&characterEncoding=UTF-8&serverTimezone=UTC" \
    -e "SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_NAVER_REDIRECT_URI=https://tnhub.kr/login/oauth2/code/naver" \
    -e "SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_GOOGLE_REDIRECT_URI=https://tnhub.kr/login/oauth2/code/google" \
    duswntmd/tn:1.0

echo "✅ 컨테이너 실행 완료"
echo ""

# 5. 컨테이너 상태 확인
echo "📊 컨테이너 상태:"
docker ps | grep tn_container
echo ""

# 6. 로그 확인 (10초 대기 후)
echo "⏳ 10초 대기 후 로그 확인..."
sleep 10
echo ""
echo "📋 컨테이너 로그 (최근 30줄):"
docker logs tn_container --tail 30
echo ""

# 7. API 테스트
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 API 테스트"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "1️⃣ Spring Boot 직접 호출 (localhost:8080):"
curl -s -o /dev/null -w "   HTTP Status: %{http_code}\n" http://localhost:8080/api/freeboard?page=1\&size=10
echo ""

echo "2️⃣ Nginx 경유 (HTTPS):"
curl -s -o /dev/null -w "   HTTP Status: %{http_code}\n" https://tnhub.kr/api/freeboard?page=1\&size=10
echo ""

echo "3️⃣ 회원가입 API:"
curl -s -o /dev/null -w "   HTTP Status: %{http_code}\n" -X POST https://tnhub.kr/api/user/exist \
  -H "Content-Type: application/json" \
  -d '{"username":"test123"}'
echo ""

echo "4️⃣ 로그인 API:"
curl -s -o /dev/null -w "   HTTP Status: %{http_code}\n" -X POST https://tnhub.kr/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"wjdxhdtkantlf"}'
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 배포 완료!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 결과 해석:"
echo "  - 200: 성공 ✅"
echo "  - 404: 엔드포인트 없음 ❌"
echo "  - 405: 메서드 허용 안 됨 ❌"
echo "  - 500: 서버 내부 오류 ❌"
echo ""
echo "🌐 브라우저에서 테스트:"
echo "   https://tnhub.kr"
