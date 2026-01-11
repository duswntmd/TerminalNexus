#!/bin/bash

# Nginx 설정 수정 스크립트
# 용도: 배포 환경에서 /api 경로가 404 에러를 반환하는 문제 해결

echo "🔧 Nginx 설정 수정 시작..."
echo ""

# 1. 백업 생성
echo "📦 1. 현재 설정 백업 중..."
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ 백업 완료"
echo ""

# 2. 현재 설정 확인
echo "🔍 2. 현재 /api/ location 블록 확인:"
grep -A 10 "location /api/" /etc/nginx/sites-available/default
echo ""

# 3. 잘못된 설정 수정
echo "🛠️ 3. proxy_pass 설정 수정 중..."
sudo sed -i 's|proxy_pass http://localhost:8080/;|proxy_pass http://localhost:8080;|g' /etc/nginx/sites-available/default
echo "✅ 수정 완료"
echo ""

# 4. 수정된 설정 확인
echo "🔍 4. 수정된 /api/ location 블록 확인:"
grep -A 10 "location /api/" /etc/nginx/sites-available/default
echo ""

# 5. 추가 백엔드 경로 설정 추가 (없는 경우)
echo "🛠️ 5. 추가 백엔드 경로 설정 확인 중..."

if ! grep -q "location /oauth2/" /etc/nginx/sites-available/default; then
    echo "⚠️ OAuth2 프록시 설정이 없습니다. nginx.conf.sample을 참고하여 수동으로 추가하세요."
fi

if ! grep -q "location ~ ^/(login|logout)" /etc/nginx/sites-available/default; then
    echo "⚠️ 로그인/로그아웃 프록시 설정이 없습니다. nginx.conf.sample을 참고하여 수동으로 추가하세요."
fi

if ! grep -q "location ~ ^/(upload|download|display)" /etc/nginx/sites-available/default; then
    echo "⚠️ 파일 업로드/다운로드 프록시 설정이 없습니다. nginx.conf.sample을 참고하여 수동으로 추가하세요."
fi
echo ""

# 6. 설정 파일 문법 검사
echo "✅ 6. Nginx 설정 문법 검사 중..."
if sudo nginx -t; then
    echo "✅ 설정 파일 문법 검사 통과"
else
    echo "❌ 설정 파일에 오류가 있습니다. 백업 파일로 복원하세요:"
    echo "   sudo cp /etc/nginx/sites-available/default.backup.* /etc/nginx/sites-available/default"
    exit 1
fi
echo ""

# 7. Nginx 재시작
echo "🔄 7. Nginx 재시작 중..."
sudo systemctl reload nginx
echo "✅ Nginx 재시작 완료"
echo ""

# 8. 백엔드 컨테이너 상태 확인
echo "🐳 8. 백엔드 컨테이너 상태 확인:"
docker ps | grep tn_container
echo ""

echo "📊 9. 백엔드 로그 확인 (최근 20줄):"
docker logs tn_container --tail 20
echo ""

echo "✅ 모든 작업 완료!"
echo ""
echo "🧪 테스트 방법:"
echo "   1. 브라우저에서 https://tnhub.kr 접속"
echo "   2. 회원가입 페이지에서 아이디 입력 (4자 이상)"
echo "   3. 개발자 도구 Network 탭에서 /api/user/exist 요청 확인"
echo "   4. 200 OK 응답이 오면 성공!"
echo ""
echo "📝 참고:"
echo "   - 백업 파일 위치: /etc/nginx/sites-available/default.backup.*"
echo "   - 전체 설정 예시: nginx.conf.sample 파일 참조"
