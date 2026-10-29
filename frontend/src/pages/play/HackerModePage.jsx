import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '../../styles/gameFonts';
import { CITIES, CODE, landDots, LOG_LINES, project, SCENARIOS, STAGES } from './hackermode/data';
import './HackerModePage.css';

// 전부 허구의 연출용 시뮬레이션. 실제로 아무 시스템에도 접속하지 않습니다.

const THEMES = {
  green: { label: '포스포어 그린' },
  amber: { label: '앰버 CRT' },
  ice: { label: '아이스 블루' },
};
const CODE_KEYS = Object.keys(CODE);
const rand = (n) => Math.floor(Math.random() * n);
const hex = (n) => Array.from({ length: n }, () => '0123456789ABCDEF'[rand(16)]).join('');

function useBeeper(on) {
  const ctx = useRef(null);
  return useCallback((seq) => {
    if (!on) return;
    try {
      ctx.current ||= new (window.AudioContext || window.webkitAudioContext)();
      const c = ctx.current; if (c.state === 'suspended') c.resume();
      seq.forEach(([f, t, d, type = 'sine', v = 0.08]) => {
        const o = c.createOscillator(); const g = c.createGain(); const at = c.currentTime + t;
        o.type = type; o.frequency.setValueAtTime(f, at);
        g.gain.setValueAtTime(v, at); g.gain.exponentialRampToValueAtTime(0.0001, at + d);
        o.connect(g); g.connect(c.destination); o.start(at); o.stop(at + d + 0.02);
      });
    } catch { /* 오디오 미지원 */ }
  }, [on]);
}

// 세계 지도 + 프록시 경로 애니메이션
function WorldMap({ hops, progress }) {
  const W = 480, H = 240;
  const dots = useMemo(() => landDots(5), []);
  const path = useMemo(() => hops.map((c) => project(CITIES[c], W, H)), [hops]);
  const d = path.length > 1 ? `M ${path.map((p) => p.join(',')).join(' L ')}` : '';
  const lit = Math.min(path.length - 1, Math.floor((progress / 100) * (path.length - 1)) + 1);
  return (
    <svg className="hk-map" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="프록시 경유 지도">
      {dots.map(([lon, lat], i) => { const [x, y] = project([lat, lon], W, H); return <circle key={i} cx={x} cy={y} r="0.8" className="hk-land" />; })}
      {d && <path d={d} className="hk-route" />}
      {d && <path d={d} className="hk-route-lit" style={{ strokeDasharray: 1000, strokeDashoffset: 1000 - (lit / Math.max(1, path.length - 1)) * 1000 }} />}
      {path.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={i === 0 || i === path.length - 1 ? 3.5 : 2.4} className={`hk-node ${i <= lit ? 'on' : ''} ${i === path.length - 1 ? 'target' : ''}`} />
          {i <= lit && <circle cx={x} cy={y} r="3.5" className="hk-ping" />}
        </g>
      ))}
    </svg>
  );
}

// 흐르는 코드 패널
function CodeStream({ codeKey, speed, theme }) {
  const [shown, setShown] = useState('');
  const ref = useRef(null);
  const idx = useRef(0);
  useEffect(() => { setShown(''); idx.current = 0; }, [codeKey]);
  useEffect(() => {
    const src = CODE[codeKey];
    const id = setInterval(() => {
      idx.current = (idx.current + 2 + rand(4)) % src.length;
      setShown((p) => {
        const next = p + src.slice(Math.max(0, idx.current - 3), idx.current);
        return next.length > 2600 ? next.slice(-2200) : next;
      });
    }, speed);
    return () => clearInterval(id);
  }, [codeKey, speed]);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [shown]);
  return <pre className={`hk-code hk-${theme}`} ref={ref}>{shown}<span className="hk-cursor">▊</span></pre>;
}

// 세로 비트 폭포 (매트릭스)
function BitFall() {
  const cols = 22;
  return (
    <div className="hk-fall" aria-hidden="true">
      {Array.from({ length: cols }, (_, i) => (
        <span key={i} style={{ animationDuration: `${2 + (i % 5) * 0.7}s`, animationDelay: `${(i % 7) * 0.3}s` }}>
          {Array.from({ length: 18 }, () => (rand(2) ? '1' : '0')).join('')}
        </span>
      ))}
    </div>
  );
}

// 가짜 막대 그래프
function Bars({ seed }) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const bars = useMemo(() => Array.from({ length: 16 }, () => 20 + rand(80)), [seed]);
  return (
    <div className="hk-bars" aria-hidden="true">
      {bars.map((b, i) => <i key={i} style={{ height: `${b}%` }} />)}
    </div>
  );
}

const HackerModePage = () => {
  const [phase, setPhase] = useState('idle'); // idle | running | granted | denied
  const [scenario, setScenario] = useState(SCENARIOS[0]);
  const [theme, setTheme] = useState('green');
  const [sound, setSound] = useState(false);
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState([]);
  const [hops, setHops] = useState([]);
  const [codeKey, setCodeKey] = useState('python');
  const [tick, setTick] = useState(0);
  const [cracked, setCracked] = useState('');
  const beep = useBeeper(sound);
  const logRef = useRef(null);
  const rootRef = useRef(null);

  const pushLog = useCallback((line) => {
    setLog((l) => [...l, { id: `${Date.now()}-${Math.random()}`, t: new Date().toLocaleTimeString('en-GB'), line }].slice(-80));
  }, []);

  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight }); }, [log]);

  const start = useCallback(() => {
    const keys = Object.keys(CITIES);
    const route = [];
    while (route.length < 5) { const c = keys[rand(keys.length)]; if (!route.includes(c)) route.push(c); }
    route.push(scenario.city);
    setHops(route);
    setStage(0); setProgress(0); setLog([]); setCracked('');
    setPhase('running');
    beep([[523, 0, 0.08], [784, 0.08, 0.1]]);
    pushLog(`대상 지정: ${scenario.name} (${scenario.target})`);
    pushLog('연결 경로를 구성합니다 ...');
  }, [scenario, beep, pushLog]);

  const stop = useCallback((result) => {
    setPhase(result);
    if (result === 'granted') beep([[523, 0, 0.09], [659, 0.09, 0.09], [784, 0.18, 0.09], [1047, 0.27, 0.35]]);
    if (result === 'denied') beep([[300, 0, 0.4, 'sawtooth', 0.12], [200, 0.4, 0.5, 'sawtooth', 0.12]]);
  }, [beep]);

  // 진행 루프
  useEffect(() => {
    if (phase !== 'running') return undefined;
    const id = setInterval(() => {
      setTick((t) => t + 1);
      setProgress((p) => {
        const np = p + 0.6 + Math.random() * 1.6;
        if (np >= 100) { stop('granted'); return 100; }
        return np;
      });
      if (Math.random() < 0.5) {
        const raw = LOG_LINES[rand(LOG_LINES.length)].replace('%n', hex(4));
        pushLog(raw);
      }
      if (Math.random() < 0.15) setCodeKey(CODE_KEYS[rand(CODE_KEYS.length)]);
    }, 220);
    return () => clearInterval(id);
  }, [phase, stop, pushLog]);

  // 스테이지 전환 + 비밀번호 크랙 애니메이션
  useEffect(() => {
    const s = Math.min(STAGES.length - 1, Math.floor((progress / 100) * STAGES.length));
    if (s !== stage) { setStage(s); pushLog(`▶ ${STAGES[s]} 단계 진입`); beep([[660, 0, 0.05, 'square', 0.05]]); }
    const want = scenario.pass;
    const locked = Math.floor((progress / 100) * want.length);
    setCracked(want.slice(0, locked).split('').join('') + Array.from({ length: want.length - locked }, () => '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'[rand(34)]).join(''));
  }, [progress, stage, scenario, pushLog, beep]);

  // 단축키
  useEffect(() => {
    const h = (e) => {
      if (['INPUT', 'BUTTON', 'SELECT'].includes(document.activeElement?.tagName)) return;
      if (e.key === 'Enter' && phase !== 'running') { e.preventDefault(); start(); }
      if (e.key === 'Tab') { e.preventDefault(); stop('granted'); }
      if (e.key === 'Escape') { e.preventDefault(); stop('denied'); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [phase, start, stop]);

  const toggleFull = () => {
    if (!document.fullscreenElement) rootRef.current?.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.();
  };

  const ping = `${20 + (tick % 40)}`;
  const nodes = hops.length;

  return (
    <div className={`hk-page hk-theme-${theme}`} ref={rootRef}>
      <div className="hk-bar">
        <span className="hk-brand">● NEXUS OPS CONSOLE</span>
        <span className="hk-fake">모의 연출 — 실제 시스템에 접속하지 않습니다</span>
        <div className="hk-controls">
          <select value={scenario.id} onChange={(e) => setScenario(SCENARIOS.find((s) => s.id === e.target.value))} disabled={phase === 'running'} aria-label="작전 선택">
            {SCENARIOS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={theme} onChange={(e) => setTheme(e.target.value)} aria-label="테마">
            {Object.entries(THEMES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <label className="hk-sw"><input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} /> 효과음</label>
          <button onClick={toggleFull}>전체화면</button>
        </div>
      </div>

      <div className="hk-grid">
        <section className="hk-panel hk-panel-code">
          <header>소스 스트림 · {codeKey}</header>
          <CodeStream codeKey={codeKey} speed={phase === 'running' ? 45 : 150} theme={theme} />
        </section>

        <section className="hk-panel hk-panel-map">
          <header>프록시 경로 · {nodes ? `${nodes} 홉` : '대기'}</header>
          <WorldMap hops={hops} progress={progress} />
          <div className="hk-maprow">
            {hops.map((c, i) => <span key={i} className={i <= (progress / 100) * (nodes - 1) ? 'on' : ''}>{c.toUpperCase()}</span>)}
          </div>
        </section>

        <section className="hk-panel hk-panel-crack">
          <header>인증 키 복원</header>
          <div className="hk-crack">{(cracked || scenario.pass.replace(/./g, '-')).split('').map((ch, i) => <span key={i} className={i < (progress / 100) * scenario.pass.length ? 'locked' : ''}>{ch}</span>)}</div>
          <div className="hk-stages">
            {STAGES.map((s, i) => <div key={s} className={`${i < stage ? 'done' : ''} ${i === stage && phase === 'running' ? 'active' : ''}`}><i />{s}</div>)}
          </div>
          <div className="hk-progress"><div style={{ width: `${progress}%` }} /><span>{Math.floor(progress)}%</span></div>
        </section>

        <section className="hk-panel hk-panel-fall">
          <header>데이터 덤프</header>
          <BitFall />
        </section>

        <section className="hk-panel hk-panel-stats">
          <header>네트워크 상태</header>
          <ul className="hk-stats">
            <li><span>지연</span><b>{ping}ms</b></li>
            <li><span>처리량</span><b>{(1.2 + (tick % 30) / 10).toFixed(1)} Gbps</b></li>
            <li><span>암호화</span><b>AES-256</b></li>
            <li><span>수신 패킷</span><b>{(tick * 137).toLocaleString()}</b></li>
          </ul>
          <Bars seed={Math.floor(tick / 3)} />
        </section>

        <section className="hk-panel hk-panel-log">
          <header>작전 로그</header>
          <div className="hk-log" ref={logRef}>
            {log.map((l) => <div key={l.id}><time>{l.t}</time>{l.line}</div>)}
            {phase === 'running' && <div className="hk-blink"><time>{new Date().toLocaleTimeString('en-GB')}</time>_</div>}
          </div>
        </section>
      </div>

      <div className="hk-footer">
        <div className="hk-help">[Enter] 작전 시작 · [Tab] ACCESS GRANTED · [Esc] ACCESS DENIED</div>
        <button className="hk-run" onClick={phase === 'running' ? () => stop('denied') : start}>{phase === 'running' ? '■ 중단' : '▶ 작전 시작'}</button>
      </div>

      {phase === 'idle' && (
        <div className="hk-splash">
          <h1>NEXUS OPS</h1>
          <p>영화 속 해커처럼, 작전을 골라 콘솔을 가동해 보세요. 모든 화면은 연출이에요.</p>
          <button className="hk-run big" onClick={start}>▶ 작전 시작</button>
        </div>
      )}
      {(phase === 'granted' || phase === 'denied') && (
        <div className={`hk-result ${phase}`} onClick={start} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && start()}>
          <div className="hk-result-big">{phase === 'granted' ? 'ACCESS GRANTED' : 'ACCESS DENIED'}</div>
          <p>{phase === 'granted' ? `${scenario.name} 장악 완료 · 키 ${scenario.pass}` : '연결이 차단되었어요.'}</p>
          <span className="hk-again">클릭하거나 Enter로 다시 시작</span>
        </div>
      )}
    </div>
  );
};

export default HackerModePage;
