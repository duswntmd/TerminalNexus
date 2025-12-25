#!/bin/bash

# Nginx 업로드 크기 제한 수정 스크립트
# 413 에러 해결을 위한 client_max_body_size 설정

echo "🔧 Nginx 업로드 크기 제한 수정 중..."

# Nginx 설정 파일 경로
NGINX_CONF="/etc/nginx/nginx.conf"
NGINX_SITE_CONF="/etc/nginx/sites-available/default"

# 백업 생성
echo "📦 기존 설정 백업 중..."
sudo cp $NGINX_CONF ${NGINX_CONF}.backup.$(date +%Y%m%d_%H%M%S)

# nginx.conf의 http 블록에 client_max_body_size 추가/수정
echo "✏️ nginx.conf 수정 중..."
if grep -q "client_max_body_size" $NGINX_CONF; then
    echo "⚠️ client_max_body_size가 이미 존재합니다. 값을 1024M으로 변경합니다."
    sudo sed -i 's/client_max_body_size.*/client_max_body_size 1024M;/' $NGINX_CONF
else
    echo "➕ client_max_body_size를 추가합니다."
    # http 블록 안에 추가
    sudo sed -i '/http {/a \    client_max_body_size 1024M;' $NGINX_CONF
fi

# sites-available/default 파일도 확인 및 수정 (있는 경우)
if [ -f "$NGINX_SITE_CONF" ]; then
    echo "✏️ sites-available/default 수정 중..."
    sudo cp $NGINX_SITE_CONF ${NGINX_SITE_CONF}.backup.$(date +%Y%m%d_%H%M%S)
    
    if grep -q "client_max_body_size" $NGINX_SITE_CONF; then
        sudo sed -i 's/client_max_body_size.*/client_max_body_size 1024M;/' $NGINX_SITE_CONF
    else
        # server 블록 안에 추가
        sudo sed -i '/server {/a \    client_max_body_size 1024M;' $NGINX_SITE_CONF
    fi
fi

# Nginx 설정 테스트
echo "🧪 Nginx 설정 테스트 중..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx 설정이 올바릅니다."
    
    # Nginx 재시작
    echo "🔄 Nginx 재시작 중..."
    sudo systemctl reload nginx
    
    echo "✅ Nginx 업로드 크기 제한이 1024MB로 변경되었습니다!"
    echo ""
    echo "📋 현재 설정 확인:"
    grep -n "client_max_body_size" $NGINX_CONF
    
    if [ -f "$NGINX_SITE_CONF" ]; then
        grep -n "client_max_body_size" $NGINX_SITE_CONF
    fi
else
    echo "❌ Nginx 설정에 오류가 있습니다. 백업 파일을 확인하세요."
    exit 1
fi

echo ""
echo "🎉 작업 완료! 이제 대용량 동영상 업로드가 가능합니다."
