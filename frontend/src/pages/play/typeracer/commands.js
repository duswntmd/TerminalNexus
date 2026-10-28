// 타자 게임 명령어 데이터: [명령어, 한 줄 해설]
export const CATEGORIES = {
  linux: {
    label: '리눅스 기초',
    items: [
      ['ls -alh /var/log', '숨김 파일까지 사람이 읽기 쉬운 크기로 자세히 보기'],
      ['chmod 755 deploy.sh', '소유자는 rwx, 그룹·기타는 r-x 권한 주기'],
      ['chown -R nginx:nginx /var/www/html', '디렉터리 전체의 소유자와 그룹을 nginx로 변경'],
      ['find /etc -name "*.conf" -mtime -7', '최근 7일 안에 바뀐 설정 파일 찾기'],
      ['tar -czvf backup.tar.gz ./src ./public', '여러 디렉터리를 gzip으로 압축해 하나로 묶기'],
      ['tail -f /var/log/messages', '로그 파일에 새로 쌓이는 내용을 실시간으로 보기'],
      ['grep -rn "ERROR" /var/log/app/', '하위 폴더까지 ERROR 문자열과 줄 번호 찾기'],
      ['df -h && free -h', '디스크와 메모리 사용량을 한 번에 확인'],
      ['ps aux --sort=-%mem | head -5', '메모리를 가장 많이 쓰는 프로세스 5개 보기'],
      ['du -sh /home/* | sort -h', '사용자별 홈 디렉터리 크기를 작은 순서로 정렬'],
      ['ln -s /opt/app/current /srv/app', '심볼릭 링크로 바로가기 만들기'],
      ['crontab -e', '현재 사용자의 예약 작업 편집'],
      ['useradd -m -G wheel devops', '홈 디렉터리와 함께 wheel 그룹 사용자 만들기'],
      ['passwd -l olduser', '사용자 계정 잠그기'],
      ['xargs -I{} cp {} /backup/', '앞 명령의 결과를 하나씩 받아 복사하기'],
      ['awk -F: \'{print $1}\' /etc/passwd', '콜론으로 나눈 첫 칸(계정 이름)만 출력'],
      ['sed -i \'s/8080/9090/g\' server.conf', '파일 안의 8080을 모두 9090으로 바꾸기'],
      ['uname -r && cat /etc/os-release', '커널 버전과 OS 정보 확인'],
    ],
  },
  admin: {
    label: '서버 운영',
    items: [
      ['systemctl enable --now httpd', '웹서버를 지금 켜고 부팅 때도 자동 시작'],
      ['systemctl status sshd --no-pager', 'SSH 서비스 상태를 페이지 넘김 없이 보기'],
      ['journalctl -u nginx -n 50 --no-pager', 'nginx 로그의 마지막 50줄 보기'],
      ['firewall-cmd --permanent --add-service=http', '방화벽에 http를 영구 허용'],
      ['firewall-cmd --reload', '영구 설정을 현재 방화벽에 반영'],
      ['dnf install -y vim-enhanced git', '패키지 두 개를 확인 없이 설치'],
      ['nmcli con mod ens18 ipv4.addresses 10.0.0.5/24', '네트워크 연결에 고정 IP 지정'],
      ['ss -tulnp | grep :22', '22번 포트를 누가 열고 있는지 확인'],
      ['setenforce 0 && getenforce', 'SELinux를 잠시 Permissive로 바꾸고 확인'],
      ['timedatectl set-timezone Asia/Seoul', '시스템 시간대를 서울로 설정'],
      ['chronyc sources -v', 'NTP 시간 동기화 서버 상태 보기'],
      ['lsblk -f', '디스크와 파티션, 파일시스템 종류 보기'],
      ['mount -a && df -hT', 'fstab 내용을 모두 마운트하고 결과 확인'],
      ['ssh -i ~/.ssh/id_ed25519 ops@10.0.0.12', '개인 키로 원격 서버 접속'],
      ['scp -r ./dist ops@web01:/srv/app/', '빌드 결과를 원격 서버로 복사'],
      ['rsync -avz --delete ./site/ web01:/var/www/', '바뀐 파일만 원격과 똑같이 맞추기'],
      ['kill -9 $(lsof -t -i:8080)', '8080 포트를 잡고 있는 프로세스 강제 종료'],
    ],
  },
  git: {
    label: 'Git',
    items: [
      ['git checkout -b feature/login', '새 브랜치를 만들고 바로 이동'],
      ['git add -p', '변경 내용을 조각별로 골라서 스테이징'],
      ['git commit -m "fix: null check in login"', '메시지와 함께 커밋'],
      ['git push -u origin feature/login', '원격에 브랜치를 올리고 추적 설정'],
      ['git pull --rebase origin dev', '원격 dev를 받아와 내 커밋을 위에 다시 쌓기'],
      ['git log --oneline --graph -10', '최근 10개 커밋을 그래프로 짧게 보기'],
      ['git stash push -m "wip"', '작업 중인 변경을 잠시 치워두기'],
      ['git merge dev -m "Release: v1.4"', 'dev 브랜치를 현재 브랜치에 병합'],
      ['git reset --soft HEAD~1', '마지막 커밋만 취소하고 변경은 남기기'],
      ['git diff --stat main..dev', '두 브랜치 사이에 바뀐 파일 요약'],
      ['git cherry-pick 3f2a9c1', '특정 커밋 하나만 가져오기'],
      ['git tag -a v1.4.0 -m "release"', '릴리스 태그 달기'],
    ],
  },
  container: {
    label: 'Docker · K8s',
    items: [
      ['docker ps -a --format "{{.Names}}"', '모든 컨테이너 이름만 출력'],
      ['docker run -d -p 8080:80 --name web nginx', 'nginx를 백그라운드로 띄우고 포트 연결'],
      ['docker logs -f --tail 100 web', '컨테이너 로그 마지막 100줄부터 따라가기'],
      ['docker exec -it web /bin/bash', '실행 중인 컨테이너 안으로 들어가기'],
      ['docker compose up -d --build', '이미지를 다시 빌드하고 전체 서비스 실행'],
      ['docker system prune -af', '안 쓰는 이미지·컨테이너를 모두 정리'],
      ['kubectl get pods -n prod -o wide', 'prod 네임스페이스 파드를 노드 정보와 함께 보기'],
      ['kubectl describe pod api-7d9f8 -n prod', '파드가 왜 안 뜨는지 이벤트까지 자세히 보기'],
      ['kubectl rollout restart deploy/api', '배포를 무중단으로 다시 시작'],
      ['kubectl logs -f deploy/api --since=10m', '최근 10분 로그를 계속 보기'],
      ['kubectl scale deploy/api --replicas=5', '파드 수를 5개로 늘리기'],
      ['helm upgrade --install api ./chart', '차트로 설치하거나 이미 있으면 업그레이드'],
    ],
  },
  net: {
    label: '네트워크 · 보안',
    items: [
      ['ping -c 4 8.8.8.8', '구글 DNS로 4번만 핑 보내기'],
      ['curl -I https://tnhub.kr', '응답 헤더만 받아서 상태 코드 확인'],
      ['dig +short tnhub.kr A', '도메인의 IPv4 주소만 짧게 조회'],
      ['traceroute -n 1.1.1.1', '목적지까지 거치는 경로를 IP로 보기'],
      ['tcpdump -i ens18 port 443 -c 20', '443 포트 패킷 20개만 잡아보기'],
      ['openssl s_client -connect tnhub.kr:443', 'TLS 인증서와 연결 상태 확인'],
      ['ssh-keygen -t ed25519 -C "ops@tn"', '새 SSH 키 쌍 만들기'],
      ['nmap -sV -p 22,80,443 10.0.0.0/24', '대역에서 열린 포트와 서비스 버전 스캔'],
      ['iptables -L -n --line-numbers', '방화벽 규칙을 번호와 함께 보기'],
      ['last -n 10 && lastb -n 10', '최근 로그인 성공·실패 기록 확인'],
    ],
  },
};

export const CATEGORY_KEYS = Object.keys(CATEGORIES);

export const ALL_COMMANDS = CATEGORY_KEYS.flatMap((k) => CATEGORIES[k].items.map(([cmd, desc]) => ({ cmd, desc, cat: k })));

// 날짜 시드로 매일 같은 순서를 만드는 난수 (mulberry32)
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const todaySeed = () => {
  const d = new Date(Date.now() + 9 * 3600 * 1000);
  return Number(d.toISOString().slice(0, 10).replace(/-/g, ''));
};

export function buildQueue(pool, rand = Math.random, length = 40) {
  const out = [];
  let bag = [];
  while (out.length < length) {
    if (!bag.length) {
      bag = [...pool];
      for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
    }
    out.push(bag.pop());
  }
  return out;
}
