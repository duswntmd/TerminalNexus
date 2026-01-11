#!/bin/bash

# Nginx 설정 완전 수정 스크립트
# 용도: /api, /login, /oauth2 등 모든 백엔드 경로 프록시 설정

echo "🔧 Nginx 설정 완전 수정 시작..."
echo ""

# 1. 백업 생성
BACKUP_FILE="/etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S)"
echo "📦 1. 현재 설정 백업 중..."
sudo cp /etc/nginx/sites-available/default "$BACKUP_FILE"
echo "✅ 백업 완료: $BACKUP_FILE"
echo ""

# 2. nginx.conf.sample 파일이 있는지 확인
if [ ! -f "nginx.conf.sample" ]; then
    echo "❌ nginx.conf.sample 파일을 찾을 수 없습니다."
    echo "   이 스크립트는 프로젝트 루트 디렉토리에서 실행해야 합니다."
    exit 1
fi

# 3. 현재 설정 확인
echo "🔍 2. 현재 Nginx 설정 확인:"
echo "   - /api/ 프록시 설정:"
grep -A 5 "location /api/" /etc/nginx/sites-available/default || echo "     ❌ 없음"
echo ""
echo "   - /login 프록시 설정:"
grep -A 5 "location.*login" /etc/nginx/sites-available/default || echo "     ❌ 없음"
echo ""
echo "   - /oauth2/ 프록시 설정:"
grep -A 5 "location /oauth2/" /etc/nginx/sites-available/default || echo "     ❌ 없음"
echo ""

# 4. 수동 수정 안내
echo "⚠️ 3. Nginx 설정을 수동으로 수정해야 합니다."
echo ""
echo "다음 명령어로 설정 파일을 열어주세요:"
echo "   sudo nano /etc/nginx/sites-available/default"
echo ""
echo "그리고 nginx.conf.sample 파일의 내용을 참고하여"
echo "다음 location 블록들을 추가/수정해주세요:"
echo ""
echo "   ✅ location /api/ { ... }"
echo "   ✅ location /oauth2/ { ... }"
echo "   ✅ location ~ ^/(login|logout) { ... }"
echo "   ✅ location ~ ^/(upload|download|display)/ { ... }"
echo ""
echo "📝 nginx.conf.sample 파일 내용 미리보기:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat nginx.conf.sample
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

read -p "설정 파일 수정을 완료하셨나요? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 설정 수정이 취소되었습니다."
    exit 1
fi

# 5. 설정 파일 문법 검사
echo ""
echo "✅ 4. Nginx 설정 문법 검사 중..."
if sudo nginx -t; then
    echo "✅ 설정 파일 문법 검사 통과"
else
    echo "❌ 설정 파일에 오류가 있습니다. 백업 파일로 복원하세요:"
    echo "   sudo cp $BACKUP_FILE /etc/nginx/sites-available/default"
    exit 1
fi
echo ""

# 6. Nginx 재시작
echo "🔄 5. Nginx 재시작 중..."
sudo systemctl reload nginx
echo "✅ Nginx 재시작 완료"
echo ""

# 7. 백엔드 컨테이너 상태 확인
echo "🐳 6. 백엔드 컨테이너 상태 확인:"
docker ps | grep tn_container
echo ""

echo "📊 7. 백엔드 로그 확인 (최근 20줄):"
docker logs tn_container --tail 20
echo ""

echo "✅ 모든 작업 완료!"
echo ""
echo "🧪 테스트 방법:"
echo ""
echo "1. 회원가입 테스트:"
echo "   curl -X POST https://tnhub.kr/api/user/exist \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"username\":\"test123\"}'"
echo "   → 응답: true 또는 false (404가 아니면 성공!)"
echo ""
echo "2. 로그인 테스트:"
echo "   curl -X POST https://tnhub.kr/login \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"username\":\"admin\",\"password\":\"wjdxhdtkantlf\"}'"
echo "   → 응답: JSON with accessToken (405가 아니면 성공!)"
echo ""
echo "📝 참고:"
echo "   - 백업 파일 위치: $BACKUP_FILE"
echo "   - 전체 설정 예시: nginx.conf.sample 파일 참조"
