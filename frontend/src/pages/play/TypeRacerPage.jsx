import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchWithAccess } from '../../util/fetchUtil';
import { ALL_COMMANDS, CATEGORIES, CATEGORY_KEYS, buildQueue, seededRandom, todaySeed } from './typeracer/commands';
import '../../styles/gameFonts';
import './TypeRacerPage.css';

const DURATION = 60;
const MODES = {
  ranked: { label: '랭크전', desc: '모든 분야의 명령어로 60초를 달려요. 기록을 랭킹에 올릴 수 있어요.' },
  daily: { label: '오늘의 코스', desc: '오늘 하루는 모두가 같은 순서로 달려요. 최고 기록은 이 브라우저에 남아요.' },
  practice: { label: '연습', desc: '분야를 골라 연습해요. 명령어를 끝낼 때마다 뜻을 알려줘요.' },
};

const grade = (wpm, acc) => {
  if (wpm >= 90 && acc >= 97) return { g: 'S', t: '터미널 장인' };
  if (wpm >= 65 && acc >= 94) return { g: 'A', t: '숙련된 운영자' };
  if (wpm >= 45 && acc >= 90) return { g: 'B', t: '믿음직한 엔지니어' };
  if (wpm >= 25) return { g: 'C', t: '손이 풀리는 중' };
  return { g: 'D', t: '이제 출발선' };
};

const readLocal = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const writeLocal = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 저장 불가 */ } };

function useClick(enabled) {
  const ctx = useRef(null);
  return useCallback((err) => {
    if (!enabled) return;
    try {
      ctx.current ||= new (window.AudioContext || window.webkitAudioContext)();
      const c = ctx.current; const o = c.createOscillator(); const g = c.createGain();
      o.type = err ? 'square' : 'triangle';
      o.frequency.value = err ? 140 : 1900 + Math.random() * 300;
      g.gain.setValueAtTime(err ? 0.05 : 0.025, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + (err ? 0.09 : 0.03));
      o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.1);
    } catch { /* 오디오 미지원 */ }
  }, [enabled]);
}

function Sparkline({ data, best }) {
  if (data.length < 2) return null;
  const w = 520, h = 110, max = Math.max(40, ...data, best || 0) * 1.1;
  const y = (v) => h - (v / max) * h;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${y(v)}`).join(' ');
  return (
    <figure className="tr-spark-wrap">
      <svg className="tr-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label="경기 중 WPM 변화">
        {best ? <line x1="0" x2={w} y1={y(best)} y2={y(best)} className="tr-spark-best" /> : null}
        <polygon points={`0,${h} ${pts} ${w},${h}`} className="tr-spark-area" />
        <polyline points={pts} className="tr-spark-line" />
      </svg>
      <figcaption>시간에 따른 속도{best ? ' · 점선은 이전 최고 기록' : ''}</figcaption>
    </figure>
  );
}

function Track({ lanes, finishChars, running }) {
  return (
    <div className={`tr-track ${running ? 'running' : ''}`} aria-hidden="true">
      {lanes.map((l) => (
        <div key={l.key} className={`tr-lane tr-lane-${l.key}`}>
          <span className="tr-lane-name">{l.name}</span>
          <div className="tr-lane-road">
            <div className="tr-car" style={{ left: `${Math.min(100, (l.chars / finishChars) * 100)}%` }}>
              <span className="tr-car-body">{l.icon}</span>
              <span className="tr-car-wpm">{l.wpm}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const TypeRacerPage = () => {
  const { isLoggedIn, user } = useAuth();
  const [mode, setMode] = useState('ranked');
  const [cat, setCat] = useState('linux');
  const [phase, setPhase] = useState('ready'); // ready | countdown | running | done
  const [count, setCount] = useState(3);
  const [queue, setQueue] = useState([]);
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [stats, setStats] = useState({ done: 0, keys: 0, correct: 0, errors: 0, combo: 0, bestCombo: 0, cmds: 0 });
  const [missed, setMissed] = useState({});
  const [samples, setSamples] = useState([]);
  const [explain, setExplain] = useState([]);
  const [shake, setShake] = useState(false);
  const [sound, setSound] = useState(() => readLocal('tr_sound', false));
  const [final, setFinal] = useState(null);

  const [leaderboard, setLeaderboard] = useState([]);
  const [myBest, setMyBest] = useState(null);
  const [myHistory, setMyHistory] = useState([]);
  const [submit, setSubmit] = useState({ busy: false, msg: '', done: false });
  const [localBest, setLocalBest] = useState(() => readLocal('tr_local_best', {}));

  const inputRef = useRef(null);
  const startRef = useRef(0);
  const live = useRef({ done: 0, prefix: 0 });
  const cmdErrRef = useRef(0);
  const click = useClick(sound);

  const fetchBoards = useCallback(async () => {
    try { const r = await fetch('/api/typeracer/leaderboard'); if (r.ok) setLeaderboard(await r.json()); } catch { /* 오프라인 */ }
    if (!isLoggedIn) { setMyBest(null); setMyHistory([]); return; }
    try { const r = await fetchWithAccess('/api/typeracer/my-best'); setMyBest(r.status === 200 ? await r.json() : null); } catch { /* 무시 */ }
    try { const r = await fetchWithAccess('/api/typeracer/history'); if (r.ok) setMyHistory(await r.json()); } catch { /* 무시 */ }
  }, [isLoggedIn]);

  useEffect(() => { fetchBoards(); }, [fetchBoards]);
  useEffect(() => { writeLocal('tr_sound', sound); }, [sound]);

  const bestKey = mode === 'daily' ? `daily_${todaySeed()}` : mode === 'practice' ? `practice_${cat}` : 'ranked';
  const ghostBest = mode === 'ranked' ? Math.max(myBest?.wpm || 0, localBest.ranked || 0) : (localBest[bestKey] || 0);
  const ghostTop = mode === 'ranked' ? (leaderboard[0]?.wpm || 0) : 0;

  const current = queue[idx];
  const correctPrefix = useMemo(() => {
    if (!current) return 0;
    let n = 0; while (n < input.length && input[n] === current.cmd[n]) n++;
    return n;
  }, [input, current]);
  live.current = { done: stats.done, prefix: correctPrefix };

  const typedChars = stats.done + correctPrefix;
  const wpm = phase === 'running' || phase === 'done' ? Math.round(typedChars / 5 / (Math.max(elapsed, 3) / 60)) : 0;
  const acc = stats.keys ? Math.round((stats.correct / stats.keys) * 1000) / 10 : 100;
  const timeLeft = Math.max(0, Math.ceil(DURATION - elapsed));

  const begin = useCallback(() => {
    const pool = mode === 'practice' ? CATEGORIES[cat].items.map(([c, d]) => ({ cmd: c, desc: d, cat })) : ALL_COMMANDS;
    const rand = mode === 'daily' ? seededRandom(todaySeed()) : Math.random;
    setQueue(buildQueue(pool, rand));
    setIdx(0); setInput(''); setElapsed(0); setMissed({}); setSamples([]); setExplain([]); setFinal(null);
    setStats({ done: 0, keys: 0, correct: 0, errors: 0, combo: 0, bestCombo: 0, cmds: 0 });
    setSubmit({ busy: false, msg: '', done: false });
    cmdErrRef.current = 0;
    setCount(3); setPhase('countdown');
  }, [mode, cat]);

  useEffect(() => {
    if (phase !== 'countdown') return undefined;
    if (count === 0) {
      const t = setTimeout(() => {
        startRef.current = performance.now();
        setPhase('running');
        setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 0);
      }, 350);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setCount((c) => c - 1), 650);
    return () => clearTimeout(t);
  }, [phase, count]);

  // 경기 중에는 입력창이 항상 포커스를 갖도록 (어디를 눌러도, 어떤 키를 쳐도)
  useEffect(() => {
    if (phase !== 'running') return undefined;
    const focus = () => inputRef.current?.focus({ preventScroll: true });
    focus();
    const onKey = (e) => { if (document.activeElement !== inputRef.current && e.key.length === 1) focus(); };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'running') return undefined;
    let lastSec = 0;
    const id = setInterval(() => {
      const e = (performance.now() - startRef.current) / 1000;
      const { done, prefix } = live.current;
      if (e >= DURATION) {
        setElapsed(DURATION);
        setPhase('done');
        return;
      }
      setElapsed(e);
      const s = Math.floor(e);
      if (s > lastSec && s >= 2) {
        lastSec = s;
        setSamples((p) => [...p, Math.round((done + prefix) / 5 / (e / 60))]);
      }
    }, 100);
    return () => clearInterval(id);
  }, [phase]);

  // 경기 종료 → 결과 확정, 로컬 최고 기록 갱신
  useEffect(() => {
    if (phase !== 'done' || final) return;
    const w = Math.round((stats.done + correctPrefix) / 5);
    const a = stats.keys ? Math.round((stats.correct / stats.keys) * 1000) / 10 : 0;
    const isBest = w > 0 && w > ghostBest;
    setFinal({ wpm: w, acc: a, ...grade(w, a), prevBest: ghostBest, isBest });
    if (isBest) {
      const next = { ...localBest, [bestKey]: w };
      setLocalBest(next); writeLocal('tr_local_best', next);
    }
  }, [phase, final, stats, correctPrefix, ghostBest, localBest, bestKey]);

  const onChange = (e) => {
    if (phase !== 'running' || !current) return;
    const v = e.target.value.slice(0, current.cmd.length);
    if (v.length > input.length) {
      let keys = 0, correct = 0, errors = 0; const miss = {};
      for (let p = input.length; p < v.length; p++) {
        keys++;
        if (v[p] === current.cmd[p]) correct++;
        else { errors++; const k = current.cmd[p] === ' ' ? '␣' : current.cmd[p]; miss[k] = (miss[k] || 0) + 1; }
      }
      click(errors > 0);
      if (errors) {
        cmdErrRef.current += errors;
        setShake(true); setTimeout(() => setShake(false), 180);
        setMissed((m) => { const n = { ...m }; Object.entries(miss).forEach(([k, c]) => { n[k] = (n[k] || 0) + c; }); return n; });
      }
      setStats((s) => ({ ...s, keys: s.keys + keys, correct: s.correct + correct, errors: s.errors + errors }));
    }
    if (v === current.cmd) {
      const clean = cmdErrRef.current === 0;
      cmdErrRef.current = 0;
      setStats((s) => {
        const combo = clean ? s.combo + 1 : 0;
        return { ...s, done: s.done + current.cmd.length + 1, cmds: s.cmds + 1, combo, bestCombo: Math.max(s.bestCombo, combo) };
      });
      setExplain((x) => [{ ...current, clean, id: `c${idx}` }, ...x].slice(0, 3));
      setIdx((i) => i + 1);
      setInput('');
      return;
    }
    setInput(v);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); setPhase('ready'); }
  };

  useEffect(() => {
    const h = (e) => {
      if ((phase === 'ready' || phase === 'done') && e.key === 'Enter' && !e.isComposing && !['BUTTON', 'A', 'INPUT'].includes(document.activeElement?.tagName)) { e.preventDefault(); begin(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [phase, begin]);

  const submitScore = async () => {
    if (!final || submit.busy || submit.done) return;
    setSubmit({ busy: true, msg: '', done: false });
    try {
      const r = await fetchWithAccess('/api/typeracer/score', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wpm: final.wpm, accuracy: final.acc }),
      });
      const text = await r.text();
      setSubmit({ busy: false, msg: text || '기록을 등록했어요.', done: true });
      fetchBoards();
    } catch (err) {
      let msg = '서버와 연결하지 못했어요. 잠시 후 다시 등록해 주세요.';
      try { const t = await err.response?.text(); if (t) msg = t.startsWith('{') ? (JSON.parse(t).message || JSON.parse(t).error || msg) : t; } catch { /* 무시 */ }
      setSubmit({ busy: false, msg, done: false });
    }
  };

  const finishChars = Math.max(ghostBest, ghostTop, wpm, 70) * 1.15 * 5;
  const lanes = [
    { key: 'me', name: '나', icon: '▶', chars: typedChars, wpm },
    ...(ghostBest ? [{ key: 'best', name: '내 최고', icon: '◆', chars: (ghostBest * 5 * elapsed) / 60, wpm: ghostBest }] : []),
    ...(ghostTop ? [{ key: 'top', name: '1위', icon: '★', chars: (ghostTop * 5 * elapsed) / 60, wpm: ghostTop }] : []),
  ];
  const topMissed = Object.entries(missed).sort((a, b) => b[1] - a[1]).slice(0, 6);

  return (
    <div className="tr-page">
      <header className="tr-head">
        <div>
          <h1 className="tr-title">커맨드 그랑프리</h1>
          <p className="tr-sub">실무 명령어로 달리는 60초 타자 레이스</p>
        </div>
        <div className="tr-modes" role="tablist" aria-label="게임 모드">
          {Object.entries(MODES).map(([k, m]) => (
            <button key={k} role="tab" aria-selected={mode === k} className={mode === k ? 'on' : ''} disabled={phase === 'running' || phase === 'countdown'} onClick={() => { setMode(k); setPhase('ready'); }}>{m.label}</button>
          ))}
        </div>
      </header>

      <div className="tr-layout">
        <main className="tr-main">
          <Track lanes={lanes} finishChars={finishChars} running={phase === 'running'} />

          {phase === 'ready' && (
            <section className="tr-panel tr-ready">
              <p className="tr-mode-desc">{MODES[mode].desc}</p>
              {mode === 'practice' && (
                <div className="tr-cats">
                  {CATEGORY_KEYS.map((k) => (
                    <button key={k} className={cat === k ? 'on' : ''} onClick={() => setCat(k)}>{CATEGORIES[k].label}<small>{CATEGORIES[k].items.length}개</small></button>
                  ))}
                </div>
              )}
              <div className="tr-ready-row">
                <button className="tr-go" onClick={begin}>출발하기</button>
                <span className="tr-hint">Enter로 출발, 경기 중에는 Esc로 중단</span>
              </div>
              {ghostBest > 0 && <p className="tr-ghost-note">◆ 고스트가 내 최고 기록인 {ghostBest} WPM 속도로 함께 달려요.</p>}
            </section>
          )}

          {phase === 'countdown' && (
            <section className="tr-panel tr-countdown" aria-live="assertive">
              <span key={count} className={`tr-count ${count === 0 ? 'go' : ''}`}>{count || 'GO'}</span>
            </section>
          )}

          {phase === 'running' && current && (
            <section className={`tr-panel tr-run ${shake ? 'shake' : ''}`} onClick={() => inputRef.current?.focus({ preventScroll: true })}>
              <div className="tr-hud">
                <div className={`tr-time ${timeLeft <= 10 ? 'low' : ''}`}><b>{timeLeft}</b><span>초 남음</span></div>
                <div><b>{wpm}</b><span>WPM</span></div>
                <div><b>{acc}</b><span>% 정확도</span></div>
                <div className={stats.combo >= 3 ? 'hot' : ''}><b>{stats.combo}</b><span>연속 무결점</span></div>
              </div>
              <div className="tr-timebar"><div style={{ width: `${(1 - elapsed / DURATION) * 100}%` }} /></div>

              <div className="tr-prompt">
                <span className="tr-ps1">$</span>
                <code className="tr-line">
                  {current.cmd.split('').map((ch, i) => {
                    let c = 'up';
                    if (i < input.length) c = input[i] === ch ? 'ok' : 'bad';
                    else if (i === input.length) c = 'cur';
                    return <span key={i} className={c}>{ch === ' ' && c === 'bad' ? '·' : ch}</span>;
                  })}
                </code>
              </div>
              <div className="tr-next">
                {queue.slice(idx + 1, idx + 3).map((q, i) => <code key={i}><span>다음</span>{q.cmd}</code>)}
              </div>
              <input
                ref={inputRef}
                className="tr-input"
                value={input}
                onChange={onChange}
                onKeyDown={onKeyDown}
                onPaste={(e) => e.preventDefault()}
                onDrop={(e) => e.preventDefault()}
                autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck="false"
                aria-label="명령어 입력"
              />
              <ul className="tr-explain" aria-live="polite">
                {explain.map((x) => (
                  <li key={x.id}><code>{x.cmd.split(' ').slice(0, 2).join(' ')}</code><span>{x.desc}</span>{x.clean && <em>무결점</em>}</li>
                ))}
              </ul>
            </section>
          )}

          {phase === 'done' && final && (
            <section className="tr-panel tr-result">
              <div className={`tr-grade g-${final.g}`}>
                <span className="tr-grade-letter">{final.g}</span>
                <span className="tr-grade-title">{final.t}</span>
              </div>
              <div className="tr-result-main">
                {final.isBest && <p className="tr-newbest">개인 최고 기록 경신{final.prevBest ? ` (이전 ${final.prevBest} WPM)` : ''}</p>}
                <div className="tr-result-stats">
                  <div><b>{final.wpm}</b><span>WPM</span></div>
                  <div><b>{final.acc}%</b><span>정확도</span></div>
                  <div><b>{stats.cmds}</b><span>완주한 명령어</span></div>
                  <div><b>{stats.bestCombo}</b><span>최고 연속 무결점</span></div>
                </div>
                <Sparkline data={samples} best={final.prevBest} />
                {topMissed.length > 0 && (
                  <div className="tr-missed">
                    <span>자주 틀린 키</span>
                    {topMissed.map(([k, c]) => <kbd key={k}>{k}<small>{c}</small></kbd>)}
                  </div>
                )}
                <div className="tr-actions">
                  <button className="tr-go" onClick={begin}>다시 달리기</button>
                  {mode === 'ranked' && (isLoggedIn
                    ? <button className="tr-ghostbtn" onClick={submitScore} disabled={submit.busy || submit.done}>{submit.busy ? '등록하는 중' : submit.done ? '랭킹에 등록됨' : '랭킹에 등록'}</button>
                    : <Link className="tr-ghostbtn" to="/login">로그인하고 랭킹 등록</Link>)}
                </div>
                {submit.msg && <p className="tr-submit-msg">{submit.msg}</p>}
              </div>
            </section>
          )}
        </main>

        <aside className="tr-side">
          <section className="tr-board">
            <h2>랭킹 Top 10</h2>
            {leaderboard.length ? (
              <ol>
                {leaderboard.map((it, i) => {
                  const me = user && user.nickname === it.nickname;
                  return (
                    <li key={i} className={`${me ? 'me' : ''} r${it.rank}`}>
                      <span className="rk">{it.rank}</span>
                      <span className="nm" title={it.nickname}>{it.nickname}{me ? ' (나)' : ''}</span>
                      <span className="wp">{it.wpm}</span>
                      <span className="ac">{it.accuracy}%</span>
                    </li>
                  );
                })}
              </ol>
            ) : <p className="tr-empty">아직 등록된 기록이 없어요. 랭크전을 완주하고 첫 기록을 남겨보세요.</p>}
          </section>
          {isLoggedIn && (
            <section className="tr-board">
              <h2>내 최근 기록</h2>
              {myHistory.length ? (
                <ol className="hist">
                  {myHistory.map((h, i) => (
                    <li key={i}><span className="nm">{h.updatedDate ? new Date(h.updatedDate).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</span><span className="wp">{h.wpm}</span><span className="ac">{h.accuracy}%</span></li>
                  ))}
                </ol>
              ) : <p className="tr-empty">랭크전 기록을 등록하면 여기에 쌓여요.</p>}
            </section>
          )}
          <section className="tr-board tr-local">
            <h2>이 브라우저의 최고 기록</h2>
            <ul>
              <li><span>오늘의 코스</span><b>{localBest[`daily_${todaySeed()}`] || '-'}</b></li>
              {CATEGORY_KEYS.map((k) => <li key={k}><span>연습 · {CATEGORIES[k].label}</span><b>{localBest[`practice_${k}`] || '-'}</b></li>)}
            </ul>
            <label className="tr-sound"><input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} /> 타건음 켜기</label>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default TypeRacerPage;
