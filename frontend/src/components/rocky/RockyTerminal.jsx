import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { createRockyShell } from '../../lib/rocky/shell';
import './RockyTerminal.css';

// Rocky Linux 9.6 체험 터미널 (브라우저 안에서만 동작)
// props: user(프롬프트 계정명), onExit(최상위에서 exit), onChange(명령 실행 후 셸 상태), embedded(메인 화면 내장용)

const STORAGE_PREFIX = 'tn-rocky-v1:';

const BOOT_LINES = [
  { t: '[  OK  ] Reached target Local File Systems.', c: 'ok' },
  { t: '[  OK  ] Started Network Manager.', c: 'ok' },
  { t: '[  OK  ] Started OpenSSH server daemon.', c: 'ok' },
  { t: '[  OK  ] Reached target Multi-User System.', c: 'ok' },
  '',
  'Rocky Linux 9.6 (Blue Onyx)',
  'Kernel 5.14.0-570.17.1.el9_6.x86_64 on an x86_64',
  '',
];

const toSafeUser = (name) => {
  const s = String(name || 'guest').toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return /^[a-z_]/.test(s) ? s.slice(0, 16) : 'guest';
};

function loadSaved(user) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + user);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function Line({ line }) {
  if (typeof line === 'string') return <div className="rk-line">{line || ' '}</div>;
  if (Array.isArray(line)) {
    return (
      <div className="rk-line">
        {line.map((s, i) => <span key={i} className={s.c ? `rk-${s.c}` : undefined}>{s.t}</span>)}
      </div>
    );
  }
  return <div className={`rk-line ${line.c ? `rk-${line.c}` : ''}`}>{line.t || ' '}</div>;
}

const RockyTerminal = forwardRef(function RockyTerminal({ user = 'guest', onExit, onChange, embedded = false }, ref) {
  const safeUser = useMemo(() => toSafeUser(user), [user]);
  const shellRef = useRef(null);
  const [lines, setLines] = useState([]);
  const [input, setInput] = useState('');
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(true);
  const histIdx = useRef(-1);
  const draft = useRef('');
  const bodyRef = useRef(null);
  const inputRef = useRef(null);

  const persist = useCallback(() => {
    try { localStorage.setItem(STORAGE_PREFIX + safeUser, JSON.stringify(shellRef.current.serialize())); } catch { /* 저장 불가(사파리 비공개 등) */ }
  }, [safeUser]);

  const boot = useCallback((rebooting) => {
    setBusy(true);
    const sh = shellRef.current;
    const seq = rebooting ? BOOT_LINES : BOOT_LINES.slice(5);
    let i = 0;
    const tick = () => {
      if (i < seq.length) {
        const l = seq[i++];
        setLines((p) => [...p, l]);
        setTimeout(tick, rebooting ? 180 : 40);
      } else {
        setLines((p) => [...p, ...sh.motd()]);
        setPrompt(sh.prompt());
        setBusy(false);
        onChange?.(sh.serialize());
      }
    };
    tick();
  }, [onChange]);

  useEffect(() => {
    shellRef.current = createRockyShell({ user: safeUser, saved: loadSaved(safeUser) });
    setLines([]);
    boot(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeUser]);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [lines, busy]);

  useEffect(() => {
    if (!busy) inputRef.current?.focus({ preventScroll: true });
  }, [busy]);

  const run = useCallback((text) => {
    const sh = shellRef.current;
    const masked = sh.isMasked();
    const promptNow = sh.prompt();
    const cls = promptNow.endsWith('# ') ? 'prompt-root' : promptNow.endsWith(': ') ? null : 'prompt';
    const r = sh.exec(text);
    histIdx.current = -1;
    persist();
    if (r.clear && !r.reboot) setLines([]);
    else setLines((p) => [...p, [{ t: promptNow, c: cls }, { t: masked ? '' : text }], ...r.lines]);
    if (r.exit) { onExit?.(); return; }
    if (r.reboot) {
      setBusy(true);
      setTimeout(() => { setLines(r.clear ? [] : (p) => [...p, '']); boot(true); }, 900);
      return;
    }
    setPrompt(sh.prompt());
    onChange?.(sh.serialize());
  }, [boot, onChange, onExit, persist]);

  useImperativeHandle(ref, () => ({
    insert(text) { setInput(text); inputRef.current?.focus(); },
    run(text) { if (!busy) run(text); },
    focus() { inputRef.current?.focus(); },
  }), [busy, run]);

  const onKeyDown = (e) => {
    const sh = shellRef.current;
    if (busy || !sh) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      const v = input; setInput(''); run(v);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (sh.isMasked()) return;
      const c = sh.complete(input);
      if (!c) return;
      if (c.options && c.value === input) setLines((p) => [...p, [{ t: sh.prompt(), c: 'prompt' }, { t: input }], c.options.join('  ')]);
      setInput(c.value);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      if (sh.isMasked()) return;
      e.preventDefault();
      const h = sh.history();
      if (!h.length) return;
      if (histIdx.current === -1) draft.current = input;
      let i = histIdx.current === -1 ? h.length : histIdx.current;
      i = e.key === 'ArrowUp' ? Math.max(0, i - 1) : i + 1;
      if (i >= h.length) { histIdx.current = -1; setInput(draft.current); return; }
      histIdx.current = i; setInput(h[i]);
    } else if (e.ctrlKey && (e.key === 'l' || e.key === 'L')) {
      e.preventDefault(); setLines([]);
    } else if (e.ctrlKey && (e.key === 'c' || e.key === 'C') && !window.getSelection()?.toString()) {
      e.preventDefault();
      setLines((p) => [...p, [{ t: sh.prompt(), c: 'prompt' }, { t: (sh.isMasked() ? '' : input) + '^C' }]]);
      setInput('');
      if (sh.isMasked() || sh.prompt().endsWith(': ')) { sh.exec(''); setPrompt(sh.prompt()); }
    }
  };

  const masked = shellRef.current?.isMasked();
  const isRootPrompt = prompt.endsWith('# ');

  return (
    <div
      className={`rk-body ${embedded ? 'rk-embedded' : ''}`}
      ref={bodyRef}
      onClick={() => { if (!window.getSelection()?.toString()) inputRef.current?.focus({ preventScroll: true }); }}
    >
      {lines.map((l, i) => <Line key={i} line={l} />)}
      {!busy && (
        <div className="rk-input-line">
          <span className={isRootPrompt ? 'rk-prompt-root' : masked || prompt.endsWith(': ') ? '' : 'rk-prompt'}>{prompt}</span>
          <input
            ref={inputRef}
            className="rk-input"
            type={masked ? 'password' : 'text'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck="false"
            aria-label="Rocky Linux terminal input"
          />
        </div>
      )}
    </div>
  );
});

export default RockyTerminal;
