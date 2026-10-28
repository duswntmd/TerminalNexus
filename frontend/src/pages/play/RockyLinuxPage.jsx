import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import RockyTerminal from '../../components/rocky/RockyTerminal';
import './RockyLinuxPage.css';

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

// 실습 미션: 셸 상태(serialize 결과)로 완료 여부 판단
const has = (st, re) => (st?.history || []).some((h) => re.test(h));
const MISSIONS = [
  { id: 'os', cmd: 'cat /etc/os-release', done: (st) => has(st, /cat\s+\/etc\/(os|redhat|rocky)-release/) },
  { id: 'files', cmd: 'mkdir -p ~/lab && echo "hello rocky" > ~/lab/note.txt', done: (st) => !!st?.fs?.children?.home?.children?.[st.base]?.children?.lab?.children?.['note.txt'] },
  { id: 'perm', cmd: 'chmod 600 ~/lab/note.txt && ls -l ~/lab', done: (st) => st?.fs?.children?.home?.children?.[st.base]?.children?.lab?.children?.['note.txt']?.mode === '600' },
  { id: 'httpd', cmd: 'sudo dnf install -y httpd', done: (st) => st?.installed?.includes('httpd') },
  { id: 'service', cmd: 'sudo systemctl enable --now httpd', done: (st) => st?.services?.httpd?.active && st?.services?.httpd?.enabled },
  { id: 'firewall', cmd: 'sudo firewall-cmd --permanent --add-service=http && sudo firewall-cmd --reload', done: (st) => st?.fw?.pServices?.includes('http') && st?.fw?.services?.includes('http') },
  { id: 'curl', cmd: 'curl -I localhost', done: (st) => has(st, /^curl\b.*localhost|127\.0\.0\.1/) && st?.services?.httpd?.active },
  { id: 'user', cmd: 'sudo useradd -m dev01 && sudo usermod -aG wheel dev01 && id dev01', done: (st) => (st?.users || []).some((u) => u.uid >= 1001 && u.groups.includes('wheel')) },
];

const CHEATS = [
  ['ls -la', 'pwd', 'cd /etc', 'cat ~/README.txt', 'find /etc -name "*.conf"'],
  ['ip a', 'ss -tulnp', 'nmcli device', 'ping -c 3 google.com'],
  ['df -h', 'free -h', 'lsblk', 'ps aux | grep sshd', 'uptime'],
  ['systemctl status sshd', 'journalctl -u sshd', 'getenforce', 'sudo firewall-cmd --list-all'],
];

const RockyLinuxPage = () => {
  const { t } = useTranslation();
  const { isLoggedIn } = useAuth();
  const termRef = useRef(null);
  const [user, setUser] = useState('guest');
  const [state, setState] = useState(null);
  const [session, setSession] = useState(0);

  useEffect(() => {
    if (!isLoggedIn) { setUser('guest'); return; }
    fetch(`${BACKEND_API_BASE_URL}/user`, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const n = String(d?.username || d?.nickname || '').toLowerCase().replace(/[^a-z0-9_-]/g, '');
        if (/^[a-z_]/.test(n)) setUser(n.slice(0, 16));
      })
      .catch(() => {});
  }, [isLoggedIn]);

  const onChange = useCallback((s) => setState({ ...s }), []);
  const doneCount = MISSIONS.filter((m) => m.done(state)).length;

  return (
    <div className="rocky-page">
      <div className="rocky-head">
        <div>
          <h1>{t('linux.title', 'Rocky Linux 9.6 실습 터미널')}</h1>
          <p>{t('linux.subtitle', '브라우저에서 리눅스 명령어를 바로 연습해 보세요. 서버에 연결되지 않는 안전한 시뮬레이터예요.')}</p>
        </div>
        <span className="rocky-badge">Rocky Linux 9.6 · x86_64</span>
      </div>

      <div className="rocky-layout">
        <section className="rocky-window" aria-label="terminal">
          <div className="rocky-titlebar">
            <span className="dot red" /><span className="dot yellow" /><span className="dot green" />
            <span className="rocky-title">{user}@rocky: ~ (ssh)</span>
          </div>
          <RockyTerminal key={`${user}-${session}`} ref={termRef} user={user} onChange={onChange} onExit={() => setTimeout(() => setSession((n) => n + 1), 600)} />
        </section>

        <aside className="rocky-side">
          <div className="rocky-card">
            <div className="rocky-card-head">
              <h2>{t('linux.missions', '실습 미션')}</h2>
              <span className="rocky-progress">{doneCount}/{MISSIONS.length}</span>
            </div>
            <div className="rocky-bar"><div style={{ width: `${(doneCount / MISSIONS.length) * 100}%` }} /></div>
            <ol className="rocky-missions">
              {MISSIONS.map((m) => {
                const ok = m.done(state);
                return (
                  <li key={m.id} className={ok ? 'done' : ''}>
                    <span className="mark">{ok ? '✓' : ''}</span>
                    <div>
                      <div className="m-title">{t(`linux.m.${m.id}`)}</div>
                      <button type="button" className="chip" onClick={() => termRef.current?.insert(m.cmd)} title={t('linux.insert', '클릭하면 입력창에 넣어줘요')}>{m.cmd}</button>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="rocky-card">
            <h2>{t('linux.cheats', '자주 쓰는 명령어')}</h2>
            <div className="rocky-chips">
              {CHEATS.flat().map((c) => (
                <button key={c} type="button" className="chip" onClick={() => termRef.current?.insert(c)}>{c}</button>
              ))}
            </div>
            <ul className="rocky-tips">
              <li>{t('linux.tip1', 'Tab 자동완성 · ↑↓ 이전 명령 · Ctrl+L 화면 지우기 · Ctrl+C 취소')}</li>
              <li>{t('linux.tip2', '파일과 설정은 이 브라우저에 저장돼요. 처음부터 하려면 tn-reset')}</li>
              <li>{t('linux.tip3', '외부 인터넷 접속, vi 편집기, 실시간 top은 지원하지 않아요')}</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default RockyLinuxPage;
