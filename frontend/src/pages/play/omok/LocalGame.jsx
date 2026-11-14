import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BLACK, WHITE, RULES, enemyOf, newGame, playMove, finishWith, replay } from './engine.js';
import { playSound } from './sound.js';
import GameScreen from './GameScreen.jsx';
import { OptionButtons, ResultOverlay } from './parts.jsx';
import { useOptions, useToast, useBoardInput, formatClock, colorKey } from './helpers.js';

const LEVELS = ['easy', 'normal', 'hard'];
const turnAt = (n) => (n % 2 === 0 ? BLACK : WHITE);

/**
 * AI 대국(mode="ai") / 한 기기 2인 대국(mode="local")
 */
const LocalGame = ({ mode, topbar }) => {
  const { t } = useTranslation();
  const isAi = mode === 'ai';
  const [opts, toggle] = useOptions();
  const [toast, showToast] = useToast();

  // 설정
  const [phase, setPhase] = useState('setup');
  const [rule, setRule] = useState('renju');
  const [colorChoice, setColorChoice] = useState('black'); // black | white | random
  const [level, setLevel] = useState('normal');
  const [playerColor, setPlayerColor] = useState(BLACK);

  // 대국
  const [game, setGame] = useState(null);
  const [thinking, setThinking] = useState(false);
  const [viewPly, setViewPly] = useState(null); // 복기 위치 (null = 끝)
  const [resultOpen, setResultOpen] = useState(true);
  const [clock, setClock] = useState({ [BLACK]: 0, [WHITE]: 0 });

  const gameRef = useRef(game);
  gameRef.current = game;
  const workerRef = useRef(null);
  const requestRef = useRef(0);
  const soundRef = useRef(opts.sound);
  soundRef.current = opts.sound;

  // AI 워커 (페이지 수명 동안 1개)
  useEffect(() => {
    if (!isAi) return undefined;
    const worker = new Worker(new URL('./ai.worker.js', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    return () => worker.terminate();
  }, [isAi]);

  // 모드가 바뀌면 설정 화면으로
  useEffect(() => {
    setPhase('setup');
    setGame(null);
    setThinking(false);
    requestRef.current += 1;
  }, [mode]);

  /** 새 상태 반영 + 효과음 */
  const commit = useCallback((next, human) => {
    setGame(next);
    setViewPly(null);
    const mover = turnAt(next.moves.length - 1);
    if (next.reason !== 'resign') playSound(colorKey(mover), soundRef.current);
    if (next.status === 'FINISHED') {
      setResultOpen(true);
      const kind = next.winner == null ? 'draw' : (!isAi || next.winner === human) ? 'win' : 'lose';
      setTimeout(() => playSound(kind, soundRef.current), 320);
    }
  }, [isAi]);

  const aiColor = enemyOf(playerColor);

  // AI 차례면 워커에 계산 요청
  useEffect(() => {
    if (!isAi || phase !== 'playing' || !game || game.status !== 'PLAYING' || game.turn !== aiColor) return;
    const worker = workerRef.current;
    if (!worker) return;
    const id = ++requestRef.current;
    setThinking(true);
    const started = Date.now();
    worker.onmessage = (e) => {
      if (e.data.id !== requestRef.current) return; // 무르기·새 대국 이후의 낡은 응답
      // 너무 빨리 두면 어색하므로 최소 500ms 뒤에 둔다
      setTimeout(() => {
        if (id !== requestRef.current) return;
        setThinking(false);
        const next = e.data.move >= 0 ? playMove(gameRef.current, e.data.move) : null;
        if (next) commit(next, playerColor);
      }, Math.max(0, 500 - (Date.now() - started)));
    };
    worker.postMessage({ id, rule: game.rule, moves: game.moves, level });
  }, [isAi, phase, game, aiColor, level, commit, playerColor]);

  // 생각 시간 (차례인 쪽의 누적 시간)
  const live = phase === 'playing' && game?.status === 'PLAYING';
  const turn = game?.turn;
  useEffect(() => {
    if (!live) return undefined;
    const timer = setInterval(() => setClock((c) => ({ ...c, [turn]: c[turn] + 1 })), 1000);
    return () => clearInterval(timer);
  }, [live, turn, game?.moves.length]);

  const startGame = () => {
    requestRef.current += 1;
    const color = colorChoice === 'random' ? (Math.random() < 0.5 ? BLACK : WHITE) : colorChoice === 'white' ? WHITE : BLACK;
    setPlayerColor(color);
    setGame(newGame(rule));
    setThinking(false);
    setViewPly(null);
    setResultOpen(true);
    setClock({ [BLACK]: 0, [WHITE]: 0 });
    setPhase('playing');
    playSound('start', opts.sound);
  };

  const canPlay = !!game && game.status === 'PLAYING' && !thinking && (!isAi || game.turn === playerColor);
  const place = useCallback((idx) => {
    const next = playMove(gameRef.current, idx);
    if (next) commit(next, playerColor);
  }, [commit, playerColor]);
  const input = useBoardInput({ game, canPlay, opts, place, showToast });

  const total = game ? game.moves.length : 0;
  const finished = game?.status === 'FINISHED';
  const ply = finished && viewPly != null ? viewPly : total;
  const go = useCallback((n) => setViewPly(Math.max(0, Math.min(gameRef.current.moves.length, n))), []);

  // 복기: 방향키로 앞뒤 이동
  useEffect(() => {
    if (!finished) return undefined;
    const onKey = (e) => {
      if (e.target.closest?.('input, textarea')) return;
      if (e.key === 'ArrowLeft') setViewPly((v) => Math.max(0, (v ?? gameRef.current.moves.length) - 1));
      else if (e.key === 'ArrowRight') setViewPly((v) => Math.min(gameRef.current.moves.length, (v ?? gameRef.current.moves.length) + 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finished]);

  /* ── 설정 화면 ── */
  if (phase === 'setup' || !game) {
    const choice = (active, onClick, title, desc, key) => (
      <button key={key} type="button" className={`om-choice${active ? ' is-active' : ''}`} aria-pressed={active} onClick={onClick}>
        {title}<small>{desc}</small>
      </button>
    );
    return (
      <div className="om-stage">
        <div className="om-topbar">
          {topbar}
          <div className="om-topbar-right"><OptionButtons opts={opts} toggle={toggle} /></div>
        </div>
        <div className="om-setup-wrap">
          <div className="om-setup">
            <h2>{t(isAi ? 'omok.setup.ai_title' : 'omok.setup.local_title')}</h2>
            {!isAi && <p className="om-hint">{t('omok.setup.local_desc')}</p>}
            <div>
              <div className="om-label">{t('omok.setup.rule')}</div>
              <div className="om-choices">
                {RULES.map((r) => choice(rule === r, () => setRule(r), t(`omok.rule.${r}`), t(`omok.rule.${r}_desc`), r))}
              </div>
            </div>
            {isAi && (
              <>
                <div>
                  <div className="om-label">{t('omok.setup.my_color')}</div>
                  <div className="om-choices three">
                    {['black', 'white', 'random'].map((c) => choice(colorChoice === c, () => setColorChoice(c), (
                      <span className="om-choice-title">{c !== 'random' && <span className={`om-dot ${c} small`} aria-hidden="true" />}{t(`omok.setup.${c}`)}</span>
                    ), t(`omok.setup.${c}_desc`), c))}
                  </div>
                </div>
                <div>
                  <div className="om-label">{t('omok.setup.level')}</div>
                  <div className="om-choices three">
                    {LEVELS.map((k) => choice(level === k, () => setLevel(k), t(`omok.levels.${k}`), t(`omok.levels.${k}_desc`), k))}
                  </div>
                </div>
              </>
            )}
            <button type="button" className="om-btn primary big" onClick={startGame}>{t('omok.actions.start')}</button>
          </div>
        </div>
      </div>
    );
  }

  /* ── 대국 화면 ── */
  const colorLabel = (c) => t(`omok.${colorKey(c)}`);
  const nameOf = (c) => (isAi ? (c === playerColor ? t('omok.you') : t('omok.ai_name', { level: t(`omok.levels.${level}`) })) : t(`omok.player_${colorKey(c)}`));
  const topColor = isAi ? aiColor : WHITE;
  const bottomColor = enemyOf(topColor);
  const card = (c) => ({
    color: c,
    name: nameOf(c),
    sub: colorLabel(c),
    active: !finished && game.turn === c,
    clock: formatClock(clock[c]),
    tag: isAi && c === aiColor && thinking ? t('omok.status.thinking_short') : null,
  });

  let statusText;
  if (finished && ply !== total) statusText = t('omok.status.reviewing', { ply, total });
  else if (finished) statusText = t('omok.status.finished');
  else if (thinking) statusText = t('omok.status.thinking');
  else if (isAi) statusText = t('omok.status.your_turn');
  else statusText = t('omok.status.turn', { color: colorLabel(game.turn) });

  let resultTitle = t('omok.result.draw');
  let kind = 'draw';
  if (game.winner != null) {
    kind = !isAi || game.winner === playerColor ? 'win' : 'lose';
    resultTitle = isAi ? t(kind === 'win' ? 'omok.result.win' : 'omok.result.lose') : t(`omok.result.${colorKey(game.winner)}_wins`);
  }
  const resultReason = game.reason ? t(`omok.reason.${game.reason}`, { count: total }) : '';

  const playerMoves = playerColor === BLACK ? Math.ceil(total / 2) : Math.floor(total / 2);
  const canUndo = isAi ? playerMoves > 0 : total > 0;
  const undo = () => {
    requestRef.current += 1;
    setThinking(false);
    let n = total - 1;
    if (isAi) while (n > 0 && turnAt(n) !== playerColor) n -= 1;
    if (n < 0 || (isAi && turnAt(n) !== playerColor)) return;
    setGame(replay(game.rule, game.moves, n));
    setViewPly(null);
  };
  const doResign = () => {
    if (!window.confirm(t('omok.confirm.resign'))) return;
    requestRef.current += 1;
    setThinking(false);
    commit(finishWith(game, enemyOf(isAi ? playerColor : game.turn), 'resign'), playerColor);
  };
  const newSetup = () => { requestRef.current += 1; setThinking(false); setPhase('setup'); };

  return (
    <GameScreen
      topbar={topbar}
      opts={opts}
      toggle={toggle}
      toast={toast}
      top={card(topColor)}
      bottom={card(bottomColor)}
      board={{
        moves: ply === total ? game.moves : game.moves.slice(0, ply),
        forbidden: input.forbidden,
        turnColor: canPlay ? game.turn : null,
        selected: input.selected,
        winLine: ply === total ? game.winLine : null,
        onPick: input.pick,
      }}
      status={(
        <p className="om-status">
          <span className="om-rule-chip">{t(`omok.rule.${game.rule}`)}</span>
          {statusText}
        </p>
      )}
      notice={canPlay && Object.keys(input.forbidden).length > 0 && <p className="om-hint">{t('omok.forbidden_hint')}</p>}
      overlay={finished && resultOpen && (
        <ResultOverlay kind={kind} title={resultTitle} reason={resultReason}>
          <button type="button" className="om-btn primary" onClick={startGame}>{t('omok.actions.again')}</button>
          <button type="button" className="om-btn" onClick={() => setResultOpen(false)}>{t('omok.actions.review')}</button>
          <button type="button" className="om-btn" onClick={newSetup}>{t('omok.actions.new_game')}</button>
        </ResultOverlay>
      )}
      actions={(
        <>
          {opts.confirm && !finished && (
            <button type="button" className="om-btn primary wide" disabled={input.selected == null} onClick={input.confirm}>{t('omok.actions.place')}</button>
          )}
          <button type="button" className="om-btn" onClick={undo} disabled={!canUndo}>{t('omok.actions.undo')}</button>
          {finished
            ? <button type="button" className="om-btn primary" onClick={startGame}>{t('omok.actions.again')}</button>
            : <button type="button" className="om-btn danger" onClick={doResign}>{t('omok.actions.resign')}</button>}
          <button type="button" className="om-btn" onClick={newSetup}>{t('omok.actions.new_game')}</button>
        </>
      )}
      review={finished ? { ply, total, onGo: go } : null}
      moves={{ moves: game.moves, current: ply, onJump: finished ? go : null }}
    />
  );
};

export default LocalGame;
