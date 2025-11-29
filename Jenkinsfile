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
                    sh 'npm install'
                    sh 'npm run build'
                }
            }
        }

        stage('Deploy Frontend') {
            steps {
                echo '📂 Frontend 배포 중...'
                sh "sudo mkdir -p ${NGINX_WEB_ROOT}"
                sh "sudo cp -r frontend/dist/* ${NGINX_WEB_ROOT}/"
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
                    sh """
                        docker stop ${CONTAINER_NAME} || true
                        docker rm ${CONTAINER_NAME} || true
                        docker ps --filter "publish=8080" -q | xargs -r docker stop || true
                        
                        docker run -d \
                            -p 8080:8080 \
                            -v ${HOST_UPLOAD_DIR}:${CONTAINER_UPLOAD_DIR} \
                            --name ${CONTAINER_NAME} \
                            ${DOCKER_IMAGE}
                    """
                }
            }
        }
    }
}
