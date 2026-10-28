import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildBoard, chooseWords, COLS, hexAddr, likeness, ROWS, serverName, stageConfig } from './terminalhack/data';
import '../../styles/gameFonts';
import './TerminalHackPage.css';

const MAX_ATTEMPTS = 4;
const BEST_KEY = 'th_best_run';
const readBest = () => { try { return JSON.parse(localStorage.getItem(BEST_KEY)) || { score: 0, stage: 0 }; } catch { return { score: 0, stage: 0 }; } };

function useBeeper(on) {
  const ctx = useRef(null);
  return useCallback((freq, dur = 0.06, type = 'square', vol = 0.04, delay = 0) => {
    if (!on) return;
    try {
      ctx.current ||= new (window.AudioContext || window.webkitAudioContext)();
      const c = ctx.current; if (c.state === 'suspended') c.resume();
      const t = c.currentTime + delay; const o = c.createOscillator(); const g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch { /* 오디오 미지원 */ }
  }, [on]);
}

// 화면 순서(왼쪽 열 0~15행, 오른쪽 열 16~31행) 기준 커서 이동
function moveCursor(i, key) {
  let r = Math.floor(i / COLS), c = i % COLS;
  const half = ROWS / 2;
  if (key === 'ArrowRight') { if (c < COLS - 1) c++; else if (r < half) { r += half; c = 0; } }
  if (key === 'ArrowLeft') { if (c > 0) c--; else if (r >= half) { r -= half; c = COLS - 1; } }
  if (key === 'ArrowUp' && r % half > 0) r--;
  if (key === 'ArrowDown' && r % half < half - 1) r++;
  return r * COLS + c;
}

const TerminalHackPage = () => {
  const [phase, setPhase] = useState('title'); // title | play | cleared | over
  const [stage, setStage] = useState(1);
  const [score, setScore] = useState(0);
  const [cells, setCells] = useState([]);
  const [words, setWords] = useState([]);
  const [secret, setSecret] = useState('');
  const [attempts, setAttempts] = useState(MAX_ATTEMPTS);
  const [removed, setRemoved] = useState(() => new Set());
  const [usedBr, setUsedBr] = useState(() => new Set());
  const [guesses, setGuesses] = useState([]);
  const [log, setLog] = useState([]);
  const [cursor, setCursor] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [assist, setAssist] = useState(false);
  const [sound, setSound] = useState(true);
  const [flash, setFlash] = useState('');
  const [gain, setGain] = useState(null);
  const [best, setBest] = useState(readBest);
  const [cleared, setCleared] = useState(0);
  const boardRef = useRef(null);
  const logRef = useRef(null);
  const beep = useBeeper(sound);

  const cfg = stageConfig(stage);

  const pushLog = useCallback((...lines) => setLog((l) => [...l, ...lines].slice(-40)), []);

  const loadStage = useCallback((n) => {
    const c = stageConfig(n);
    const { secret: s, words: w } = chooseWords(c.len, c.count);
    setSecret(s); setWords(w); setCells(buildBoard(w));
    setAttempts(MAX_ATTEMPTS); setRemoved(new Set()); setUsedBr(new Set()); setGuesses([]);
    setTimeLeft(c.time); setCursor(0); setStage(n); setGain(null);
    setLog([]);
    const boot = [`> 접속 대상: ${serverName(n)}`, `> 암호 길이 ${c.len}자 · 후보 ${c.count}개`, '> 추적 프로그램 가동. 서두르세요.'];
    boot.forEach((line, i) => setTimeout(() => setLog((l) => [...l, line]), 180 * (i + 1)));
    setPhase('play');
    setTimeout(() => boardRef.current?.focus({ preventScroll: true }), 30);
  }, []);

  const startRun = () => { setScore(0); setCleared(0); beep(660, 0.08); beep(990, 0.12, 'square', 0.04, 0.09); loadStage(1); };

  // 추적 타이머: 0이 되면 기회 1회 소모
  useEffect(() => {
    if (phase !== 'play') return undefined;
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  const loseAttempt = useCallback((reason) => {
    setAttempts((a) => {
      const n = a - 1;
      if (n <= 0) {
        beep(110, 0.6, 'sawtooth', 0.08);
        pushLog(reason, '> !!! 터미널 잠김 !!!');
        setTimeout(() => setPhase('over'), 900);
      }
      return Math.max(0, n);
    });
    setFlash('bad'); setTimeout(() => setFlash(''), 350);
  }, [beep, pushLog]);

  useEffect(() => {
    if (phase !== 'play' || timeLeft > 0) return;
    loseAttempt('> 추적 감지됨: 연결을 우회합니다. 기회 -1');
    setTimeLeft(cfg.time);
  }, [timeLeft, phase, cfg.time, loseAttempt]);

  // 런 종료 시 최고 기록 저장
  useEffect(() => {
    if (phase !== 'over') return;
    if (score > best.score) {
      const nb = { score, stage: cleared };
      setBest(nb);
      try { localStorage.setItem(BEST_KEY, JSON.stringify(nb)); } catch { /* 저장 불가 */ }
    }
  }, [phase, score, cleared, best.score]);

  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight }); }, [log]);

  // 지금까지의 유사도 결과와 모순되지 않는 후보
  const candidates = useMemo(() => new Set(words.map((w, i) => (guesses.every((g) => likeness(w, g.word) === g.like) ? i : -1)).filter((i) => i >= 0)), [words, guesses]);

  const groupAt = useCallback((i) => {
    const c = cells[i];
    if (!c) return [i];
    if (c.word !== undefined && !removed.has(c.word)) return cells.map((x, k) => (x.word === c.word ? k : -1)).filter((k) => k >= 0);
    if (c.bracket && !usedBr.has(c.bracket.id) && i === c.bracket.start) {
      return Array.from({ length: c.bracket.end - c.bracket.start + 1 }, (_, k) => c.bracket.start + k);
    }
    return [i];
  }, [cells, removed, usedBr]);

  const hl = useMemo(() => new Set(groupAt(cursor)), [groupAt, cursor]);
  const hoverText = [...hl].sort((a, b) => a - b).map((k) => cells[k]?.ch).join('');

  const select = (i) => {
    if (phase !== 'play') return;
    const c = cells[i];
    if (!c) return;
    beep(880, 0.03, 'square', 0.03);
    if (c.word !== undefined && !removed.has(c.word)) {
      const word = words[c.word];
      if (guesses.some((g) => g.word === word)) return;
      if (word === secret) {
        const timeBonus = timeLeft * 5;
        const attemptBonus = attempts * 60;
        const base = 120 * stage;
        const total = Math.round((base + timeBonus + attemptBonus) * (assist ? 0.6 : 1));
        setScore((s) => s + total);
        setGain({ base, timeBonus, attemptBonus, total, assist });
        setCleared(stage);
        pushLog(`> ${word}`, '> 일치. 접근 허가.');
        [523, 659, 784, 1047].forEach((f, k) => beep(f, 0.12, 'square', 0.04, k * 0.09));
        setFlash('good');
        setTimeout(() => { setFlash(''); setPhase('cleared'); }, 700);
        return;
      }
      const like = likeness(word, secret);
      setGuesses((g) => [...g, { word, like }]);
      pushLog(`> ${word}`, '> 접근 거부.', `> 유사도 ${like}/${secret.length}`);
      beep(196, 0.18, 'sawtooth', 0.05);
      loseAttempt('> 기회를 모두 써버렸습니다.');
      return;
    }
    if (c.bracket && !usedBr.has(c.bracket.id) && i === c.bracket.start) {
      setUsedBr((s) => new Set(s).add(c.bracket.id));
      const duds = words.map((w, k) => (w !== secret && !removed.has(k) ? k : -1)).filter((k) => k >= 0);
      const label = cells.slice(c.bracket.start, c.bracket.end + 1).map((x) => x.ch).join('');
      if ((Math.random() < 0.3 && attempts < MAX_ATTEMPTS) || !duds.length) {
        setAttempts(MAX_ATTEMPTS);
        pushLog(`> ${label}`, '> 우회 성공: 기회 충전');
      } else if (Math.random() < 0.25) {
        setTimeLeft((t) => t + 15);
        pushLog(`> ${label}`, '> 추적 지연: 시간 +15초');
      } else {
        const k = duds[Math.floor(Math.random() * duds.length)];
        setRemoved((s) => new Set(s).add(k));
        pushLog(`> ${label}`, `> 오답 제거: ${words[k]}`);
      }
      beep(440, 0.1, 'triangle', 0.06); beep(880, 0.16, 'triangle', 0.06, 0.1);
      return;
    }
    pushLog(`> ${c.ch}`, '> 오류');
  };

  const onKeyDown = (e) => {
    if (phase !== 'play') return;
    if (e.key.startsWith('Arrow')) { e.preventDefault(); setCursor((i) => moveCursor(i, e.key)); beep(1500, 0.01, 'square', 0.015); }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(cursor); }
  };

  useEffect(() => {
    const h = (e) => {
      if (e.key !== 'Enter' || ['BUTTON', 'INPUT'].includes(document.activeElement?.tagName)) return;
      if (phase === 'title' || phase === 'over') { e.preventDefault(); startRun(); }
      else if (phase === 'cleared') { e.preventDefault(); loadStage(stage + 1); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  const renderRow = (r) => (
    <div className="th-row" key={r}>
      <span className="th-addr">{hexAddr(r)}</span>
      <span className="th-cells">
        {Array.from({ length: COLS }, (_, c) => {
          const i = r * COLS + c; const cell = cells[i];
          if (!cell) return null;
          const isWord = cell.word !== undefined;
          const gone = isWord && removed.has(cell.word);
          const tried = isWord && guesses.some((g) => g.word === words[cell.word]);
          const ruledOut = assist && isWord && !gone && !candidates.has(cell.word);
          const usedB = cell.bracket && usedBr.has(cell.bracket.id);
          const cls = ['th-c', hl.has(i) ? 'hl' : '', gone ? 'gone' : '', tried ? 'tried' : '', ruledOut ? 'out' : '', usedB ? 'usedb' : ''].join(' ');
          return (
            <span key={c} className={cls} onMouseEnter={() => setCursor(i)} onClick={() => { setCursor(i); select(i); }}>
              {gone ? '.' : cell.ch}
            </span>
          );
        })}
      </span>
    </div>
  );

  return (
    <div className="th-page">
      <div className="th-toolbar">
        <h1>터미널 해킹</h1>
        <div className="th-toggles">
          <label><input type="checkbox" checked={assist} onChange={(e) => setAssist(e.target.checked)} disabled={phase === 'play'} /> 추론 보조 <small>(점수 60%)</small></label>
          <label><input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} /> 효과음</label>
        </div>
      </div>

      <div className={`th-crt ${flash}`}>
        <div className="th-screen">
          {phase === 'title' && (
            <div className="th-title">
              <pre className="th-logo" aria-hidden="true">{`████████╗███╗   ██╗
╚══██╔══╝████╗  ██║
   ██║   ██╔██╗ ██║
   ██║   ██║╚██╗██║
   ██║   ██║ ╚████║
   ╚═╝   ╚═╝  ╚═══╝`}</pre>
              <p className="th-lead">서버를 하나씩 뚫고 더 깊이 들어가세요. 단계가 오를수록 암호는 길어지고 추적은 빨라져요.</p>
              <ul className="th-rules">
                <li>화면 속 단어 중 하나가 암호예요. 틀리면 <b>유사도</b>(같은 자리에 같은 글자 수)를 알려줘요.</li>
                <li>기회는 4번. 추적 시간이 끝나도 기회가 하나 줄어요.</li>
                <li>한 줄 안의 괄호쌍 <b>( ) [ ] {'{ }'} &lt; &gt;</b>을 누르면 오답 제거, 기회 충전, 시간 연장 중 하나가 일어나요.</li>
                <li>방향키로 움직이고 Enter로 선택할 수 있어요.</li>
              </ul>
              <button className="th-btn" onClick={startRun}>&gt; 침투 시작</button>
              {best.score > 0 && <p className="th-best">최고 기록 {best.score.toLocaleString()}점 · {best.stage}단계 돌파</p>}
            </div>
          )}

          {(phase === 'play' || phase === 'cleared') && (
            <>
              <div className="th-status">
                <div><span className="th-k">단계</span> {stage} · {serverName(stage)}</div>
                <div><span className="th-k">점수</span> {score.toLocaleString()}</div>
                <div className={`th-trace ${timeLeft <= 10 ? 'low' : ''}`}><span className="th-k">추적</span> {String(Math.max(0, timeLeft)).padStart(2, '0')}초</div>
                <div className="th-att" aria-label={`남은 기회 ${attempts}번`}>
                  <span className="th-k">기회</span>
                  {Array.from({ length: MAX_ATTEMPTS }, (_, k) => <i key={k} className={k < attempts ? 'on' : ''} />)}
                </div>
              </div>
              <div className="th-tracebar"><div style={{ width: `${Math.max(0, timeLeft / cfg.time) * 100}%` }} /></div>

              <div className="th-body">
                <div className="th-board" tabIndex={0} ref={boardRef} onKeyDown={onKeyDown} aria-label="해킹 보드. 방향키로 이동, Enter로 선택">
                  <div className="th-col">{Array.from({ length: ROWS / 2 }, (_, r) => renderRow(r))}</div>
                  <div className="th-col">{Array.from({ length: ROWS / 2 }, (_, r) => renderRow(r + ROWS / 2))}</div>
                </div>
                <div className="th-side">
                  <div className="th-log" ref={logRef}>
                    {log.map((l, k) => <div key={k} className={/거부|잠김|감지/.test(l) ? 'bad' : /허가|충전|제거|지연/.test(l) ? 'good' : ''}>{l}</div>)}
                    <div className="th-hover">&gt; {hoverText}<span className="th-caret">█</span></div>
                  </div>
                  {guesses.length > 0 && (
                    <div className="th-guesses">
                      {guesses.map((g) => (
                        <div key={g.word}><span>{g.word}</span><span className="th-bar">{Array.from({ length: secret.length }, (_, k) => <i key={k} className={k < g.like ? 'on' : ''} />)}</span><b>{g.like}</b></div>
                      ))}
                      {assist && <p className="th-cand">남은 후보 {candidates.size}개</p>}
                    </div>
                  )}
                </div>
              </div>

              {phase === 'cleared' && gain && (
                <div className="th-overlay">
                  <div className="th-granted">접근 허가</div>
                  <p>{serverName(stage)} 장악 완료. 비밀번호는 {secret}였어요.</p>
                  <dl className="th-gain">
                    <div><dt>단계 보상</dt><dd>{gain.base}</dd></div>
                    <div><dt>남은 시간</dt><dd>+{gain.timeBonus}</dd></div>
                    <div><dt>남은 기회</dt><dd>+{gain.attemptBonus}</dd></div>
                    {gain.assist && <div><dt>추론 보조</dt><dd>×0.6</dd></div>}
                    <div className="sum"><dt>획득</dt><dd>{gain.total}</dd></div>
                  </dl>
                  <button className="th-btn" onClick={() => loadStage(stage + 1)} autoFocus>&gt; 다음 서버: {serverName(stage + 1)}</button>
                </div>
              )}
            </>
          )}

          {phase === 'over' && (
            <div className="th-title th-over">
              <div className="th-locked">터미널 잠김</div>
              <p className="th-lead">{serverName(stage)}에서 추적당했어요. 암호는 <b>{secret}</b>였어요.</p>
              <dl className="th-gain">
                <div><dt>돌파한 서버</dt><dd>{cleared}</dd></div>
                <div className="sum"><dt>최종 점수</dt><dd>{score.toLocaleString()}</dd></div>
                <div><dt>최고 기록</dt><dd>{Math.max(best.score, score).toLocaleString()}</dd></div>
              </dl>
              {score > 0 && score >= best.score && <p className="th-best">새 최고 기록이에요.</p>}
              <button className="th-btn" onClick={startRun}>&gt; 처음부터 다시 침투</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TerminalHackPage;
