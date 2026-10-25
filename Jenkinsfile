pipeline {
    agent any

    tools {
        nodejs "NodeJS 20" 
        // jdk "JDK 21" 
    }

    environment {
        DOCKER_IMAGE = "duswntmd/tn:1.0"
        // CHANGED: Point to your source code repository
        GITHUB_REPO = "https://github.com/duswntmd/TerminalNexus.git"
        BUILT_JAR = "target/*.jar" 
        HOST_UPLOAD_DIR = "/home/ubuntu/uploads"
        CONTAINER_UPLOAD_DIR = "/app/uploads"
        CONTAINER_NAME = "tn_container"
        NGINX_WEB_ROOT = "/var/www/html"
        JWT_SECRET_FILE = "/home/ubuntu/.tn_jwt_secret"
    }

    stages {
        stage('Cleanup Workspace') {
            steps {
                cleanWs()
                echo '✅ Jenkins 워크스페이스 정리 완료'
            }
        }

        stage('Git Clone') {
            steps {
                echo '📦 Git 저장소 클론 중...'
                checkout([
                    $class: 'GitSCM',
                    branches: [[name: 'main']],
                    userRemoteConfigs: [[
                        credentialsId: 'GitHub_login',
                        url: GITHUB_REPO
                    ]]
                ])
            }
        }

        stage('Build Frontend') {
            steps {
                echo '⚛️ React Frontend 빌드 중...'
                dir('frontend') {
                    sh 'npm install --legacy-peer-deps'
                    sh 'npm run build'
                }
            }
        }

        stage('Deploy Frontend') {
            steps {
                echo '📂 Frontend 배포 중...'
                sh "sudo mkdir -p ${NGINX_WEB_ROOT}"
                sh "sudo cp -r frontend/dist/* ${NGINX_WEB_ROOT}/"
                
                echo '🔧 Nginx 사이트 설정(nginx/tnhub.conf) 적용 중...'
                sh '''
                    SITE=/etc/nginx/sites-available/default
                    BACKUP=/etc/nginx/sites-available/default.bak-jenkins

                    # 변경 없으면 건너뜀
                    if sudo cmp -s nginx/tnhub.conf "$SITE"; then
                        echo "✅ Nginx 설정 변경 없음"
                    else
                        sudo cp "$SITE" "$BACKUP"
                        sudo cp nginx/tnhub.conf "$SITE"
                        if sudo nginx -t; then
                            sudo systemctl reload nginx
                            echo "✅ Nginx 설정 적용 완료 (이전 설정 백업: $BACKUP)"
                        else
                            # 문법 오류 시 이전 설정으로 즉시 복구하고 빌드 실패 처리
                            sudo cp "$BACKUP" "$SITE"
                            sudo nginx -t && sudo systemctl reload nginx
                            echo "❌ Nginx 설정 오류 → 이전 설정으로 복구함"
                            exit 1
                        fi
                    fi
                '''
                
                echo '📁 업로드 디렉토리 생성 중...'
                sh "sudo mkdir -p ${HOST_UPLOAD_DIR}"
                sh "sudo chmod 755 ${HOST_UPLOAD_DIR}"
                echo "✅ 업로드 디렉토리 준비 완료: ${HOST_UPLOAD_DIR}"
            }
        }

        stage('Build Backend') {
            steps {
                echo '☕ Spring Boot Backend 빌드 중...'
                sh 'chmod +x mvnw'
                sh './mvnw clean package -DskipTests'
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    echo "🐳 Dockerfile 생성 및 이미지 빌드 중..."
                    sh "mv ${BUILT_JAR} app.jar"
                    
                    writeFile file: 'Dockerfile', text: """
                        FROM eclipse-temurin:21-jre
                        COPY app.jar /tn.jar
                        VOLUME ${CONTAINER_UPLOAD_DIR}
                        EXPOSE 8080
                        CMD ["java", "-jar", "/tn.jar"]
                    """
                    sh "docker build --no-cache -t ${DOCKER_IMAGE} ."
                    echo "✅ Docker 이미지 빌드 완료"
                }
            }
        }

        stage('Run Docker Container') {
            steps {
                script {
                    echo "🚀 컨테이너 재시작..."
                    // ✅ 민감 정보는 Jenkins Credentials에서 주입 (소스코드에 값 없음)
                    withCredentials([
                        string(credentialsId: 'GEMINI_API_KEY',  variable: 'GEMINI_KEY'),
                        string(credentialsId: 'ADMIN_PASSWORD',  variable: 'ADMIN_PASS'),
                        string(credentialsId: 'DB_PASSWORD', variable: 'DB_PASS'),
                        string(credentialsId: 'NAVER_CLIENT_SECRET', variable: 'NAVER_SECRET'),
                        string(credentialsId: 'GOOGLE_CLIENT_SECRET', variable: 'GOOGLE_SECRET')
                    ]) {
                        sh """
                            # JWT 서명 키: 최초 1회 서버에 랜덤 생성 후 재사용 (재배포해도 로그인 유지)
                            if ! sudo test -s ${JWT_SECRET_FILE}; then
                                openssl rand -hex 32 | sudo tee ${JWT_SECRET_FILE} > /dev/null
                                sudo chmod 600 ${JWT_SECRET_FILE}
                                echo "🔑 JWT 서명 키 신규 생성: ${JWT_SECRET_FILE}"
                            fi
                            # 키 값이 빌드 로그에 찍히지 않도록 trace 끄고 읽은 뒤, docker에는 변수명만 전달
                            { set +x; } 2>/dev/null
                            export JWT_SECRET=\$(sudo cat ${JWT_SECRET_FILE})
                            set -x

                            docker stop ${CONTAINER_NAME} || true
                            docker rm ${CONTAINER_NAME} || true
                            docker ps --filter "publish=8080" -q | xargs -r docker stop || true

                            docker run -d \\
                                -p 127.0.0.1:8080:8080 \\
                                -v ${HOST_UPLOAD_DIR}:${CONTAINER_UPLOAD_DIR} \\
                                --name ${CONTAINER_NAME} \\
                                --restart unless-stopped \\
                                --add-host=host.docker.internal:host-gateway \\
                                -e "UPLOAD_PATH=${CONTAINER_UPLOAD_DIR}" \\
                                -e "SPRING_DATASOURCE_URL=jdbc:mysql://192.168.0.6:3306/tn?useSSL=false&allowPublicKeyRetrieval=true&characterEncoding=UTF-8&serverTimezone=UTC" \\
                                -e "SPRING_DATASOURCE_USERNAME=tn" \\
                                -e "SPRING_DATASOURCE_PASSWORD=\${DB_PASS}" \\
                                -e "SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_NAVER_REDIRECT_URI=https://tnhub.kr/login/oauth2/code/naver" \\
                                -e "SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_GOOGLE_REDIRECT_URI=https://tnhub.kr/login/oauth2/code/google" \\
                                -e "ADMIN_PASSWORD=\${ADMIN_PASS}" \\
                                -e JWT_SECRET \\
                                -e "GEMINI_API_KEY=\${GEMINI_KEY}" \\
                                -e "NAVER_CLIENT_SECRET=\${NAVER_SECRET}" \\
                                -e "GOOGLE_CLIENT_SECRET=\${GOOGLE_SECRET}" \\
                                ${DOCKER_IMAGE}

                            docker image prune -f
                        """
                    }
                }
            }
        }
    }
}
