#!/bin/bash

echo "🔍 서버 상태 진단 시작..."
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣ Nginx 설정 확인"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📄 현재 /api/ location 블록:"
grep -A 10 "location /api/" /etc/nginx/sites-available/default
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣ Nginx 프로세스 상태"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sudo systemctl status nginx --no-pager -l
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣ Spring Boot 컨테이너 상태"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🐳 Docker 컨테이너 목록:"
docker ps -a | grep tn_container
echo ""

echo "📊 컨테이너 로그 (최근 30줄):"
docker logs tn_container --tail 30
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣ 백엔드 API 직접 테스트 (서버 내부에서)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🧪 테스트 1: localhost:8080/api/freeboard (컨테이너 직접 호출)"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:8080/api/freeboard?page=1&size=10
echo ""

echo "🧪 테스트 2: localhost/api/freeboard (Nginx 경유)"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost/api/freeboard?page=1&size=10
echo ""

echo "🧪 테스트 3: tnhub.kr/api/freeboard (외부 도메인)"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" https://tnhub.kr/api/freeboard?page=1&size=10
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣ 포트 사용 확인"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔌 8080 포트 (Spring Boot):"
sudo netstat -tlnp | grep :8080
echo ""

echo "🔌 80/443 포트 (Nginx):"
sudo netstat -tlnp | grep -E '(:80|:443)'
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣ Nginx 에러 로그 (최근 20줄)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sudo tail -20 /var/log/nginx/error.log
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 진단 완료!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 결과 해석:"
echo "  - 테스트 1이 200이면: Spring Boot 정상 작동 ✅"
echo "  - 테스트 2가 200이면: Nginx 프록시 정상 작동 ✅"
echo "  - 테스트 3이 200이면: 외부 접속 정상 작동 ✅"
echo ""
echo "  - 테스트 1이 404면: Spring Boot 문제 (컨트롤러 확인 필요)"
echo "  - 테스트 2가 404면: Nginx 프록시 설정 문제"
echo "  - 테스트 3이 404면: SSL/DNS 문제"
