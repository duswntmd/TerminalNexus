import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import RockyTerminal from './rocky/RockyTerminal';
import { ALL_NAV } from '../nav';
import './TerminalHero.css';

const EXTRA_ROUTES = { login: '/login', join: '/join', guide: '/guide', user: '/user', lotto: '/lotto', donation: '/donation' };

// 메인 화면의 대화형 터미널. ls로 기능 목록, 경로를 치면 이동, rocky로 리눅스 셸.
const TerminalHero = forwardRef(function TerminalHero({ className = '' }, ref) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isLoggedIn, user } = useAuth();
  const [lines, setLines] = useState([]);
  const [input, setInput] = useState('');
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState('cmd'); // cmd | rocky
  const hist = useRef([]);
  const histIdx = useRef(-1);
  const bodyRef = useRef(null);
  const inputRef = useRef(null);
  const name = (isLoggedIn && user?.nickname ? String(user.nickname) : 'guest').replace(/\s+/g, '');
  const prompt = `${name}@tnhub:~$`;

  // 첫 인사 (한 줄씩 빠르게)
  useEffect(() => {
    const intro = [
      { c: 'dim', t: 'TerminalNexus shell 2.0 (tnhub.kr)' },
      { c: '', t: t('home.term.intro1') },
      { c: '', t: t('home.term.intro2') },
    ];
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setLines(intro); setReady(true); return undefined; }
    const timers = intro.map((l, i) => setTimeout(() => setLines((p) => [...p, l]), 160 * (i + 1)));
    timers.push(setTimeout(() => setReady(true), 160 * (intro.length + 1)));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight; }, [lines, ready]);

  const print = (cmd, out) => setLines((p) => [...p, { c: 'cmd', t: `${prompt} ${cmd}` }, ...out]);

  const go = (path, label) => {
    setTimeout(() => navigate(path), 450);
    return [{ c: 'ok', t: `→ ${label}` }];
  };

  const exec = useCallback((raw) => {
    const cmd = raw.trim();
    const low = cmd.toLowerCase();
    if (!cmd) { print('', []); return; }
    if (low === 'clear' || low === 'cls') { setLines([]); return; }
    if (['rocky', 'ssh rocky', '/rocky'].includes(low)) { print(cmd, []); setMode('rocky'); return; }
    if (low === 'ls' || low === 'ls -l' || low === 'help' || low === '/help') {
      const out = ALL_NAV.map((n) => ({ c: 'row', t: `${n.path.padEnd(21)}${t(`nav.${n.key}.name`)}${n.login ? `  (${t('header.login')})` : ''}` }));
      out.push({ c: 'dim', t: t('home.term.help_more') });
      print(cmd, out); return;
    }
    if (low === 'whoami') { print(cmd, [{ c: '', t: name }]); return; }
    if (low === 'pwd') { print(cmd, [{ c: '', t: '/home/' + name }]); return; }
    if (low === 'date') { print(cmd, [{ c: '', t: new Date().toString() }]); return; }
    if (low === 'uname -a' || low === 'uname') { print(cmd, [{ c: '', t: 'Linux tnhub 6.8.0-raspi aarch64 GNU/Linux' }]); return; }
    // 경로 이동: /forge, forge, cd /forge, cd forge
    const target = low.replace(/^cd\s+/, '').replace(/^\.?\//, '');
    const hit = ALL_NAV.find((n) => n.path.replace(/^\//, '') === target || n.key === target || n.path.split('/').pop() === target);
    if (hit) { print(cmd, go(hit.path, t(`nav.${hit.key}.name`))); return; }
    if (EXTRA_ROUTES[target]) { print(cmd, go(EXTRA_ROUTES[target], target)); return; }
    if (target === '' || target === '~') { print(cmd, []); return; }
    print(cmd, [{ c: 'err', t: `${cmd.split(' ')[0]}: ${t('home.term.not_found')}` }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, prompt, t]);

  // 바깥(추천 칩)에서 명령을 타이핑하듯 실행
  useImperativeHandle(ref, () => ({
    run(cmd) {
      if (mode !== 'cmd') return;
      let i = 0;
      const step = () => {
        i++;
        setInput(cmd.slice(0, i));
        if (i < cmd.length) setTimeout(step, 35);
        else setTimeout(() => { hist.current.push(cmd); exec(cmd); setInput(''); inputRef.current?.focus({ preventScroll: true }); }, 160);
      };
      step();
    },
  }), [exec, mode]);

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (input.trim()) hist.current.push(input);
      histIdx.current = -1;
      exec(input); setInput('');
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const h = hist.current; if (!h.length) return;
      e.preventDefault();
      let i = histIdx.current === -1 ? h.length : histIdx.current;
      i = e.key === 'ArrowUp' ? Math.max(0, i - 1) : i + 1;
      if (i >= h.length) { histIdx.current = -1; setInput(''); return; }
      histIdx.current = i; setInput(h[i]);
    } else if (e.key === 'Tab') {
      const v = input.trim().replace(/^\//, '');
      if (!v) return;
      const m = ALL_NAV.map((n) => n.path).find((p) => p.replace(/^\//, '').startsWith(v));
      if (m) { e.preventDefault(); setInput(m); }
    } else if (e.ctrlKey && (e.key === 'l' || e.key === 'L')) { e.preventDefault(); setLines([]); }
  };

  const exitRocky = () => {
    setMode('cmd');
    setLines((p) => [...p, { c: 'dim', t: 'Connection to rocky closed.' }]);
    setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 0);
  };

  return (
    <div className={`th2 ${className}`}>
      <div className="th2-bar">
        <span className="th2-dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="th2-title">{mode === 'rocky' ? `${name}@rocky — ssh` : `${name}@tnhub — bash`}</span>
      </div>
      {mode === 'rocky' ? (
        <RockyTerminal embedded user={name} onExit={exitRocky} />
      ) : (
        <div className="th2-body" ref={bodyRef} onClick={() => { if (!window.getSelection()?.toString()) inputRef.current?.focus({ preventScroll: true }); }}>
          {lines.map((l, i) => <div key={i} className={`th2-line ${l.c}`}>{l.t || ' '}</div>)}
          {ready && (
            <label className="th2-input-line">
              <span className="th2-prompt">{prompt}</span>
              <input
                ref={inputRef}
                id="terminal-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck="false"
                aria-label={t('home.term.aria')}
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
});

export default TerminalHero;
