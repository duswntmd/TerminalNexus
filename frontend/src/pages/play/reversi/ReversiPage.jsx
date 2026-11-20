import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { N, BLACK, WHITE, PASS, coordOf, legalMoves, countOf, newGame, playMove, replay, resignGame, flipsFor } from './engine.js';
import { playSound } from '../omok/sound.js';
import './Reversi.css';

const MODES = ['ai', 'local'];
const LEVELS = ['easy', 'normal', 'hard'];
const OPTS_KEY = 'tn.reversi.opts';
const colorKey = (c) => (c === BLACK ? 'black' : 'white');

const useOptions = () => {
  const [opts, setOpts] = useState(() => {
    const base = { sound: true, hints: true };
    try { return { ...base, ...JSON.parse(localStorage.getItem(OPTS_KEY) || '{}') }; } catch { return base; }
  });
  const toggle = useCallback((key) => setOpts((o) => {
    const next = { ...o, [key]: !o[key] };
    try { localStorage.setItem(OPTS_KEY, JSON.stringify(next)); } catch { /* 저장 불가 환경 */ }
    return next;
  }), []);
  return [opts, toggle];
};

/** 8×8 판. 둘 수 있는 자리에 점, 마지막 수에 표시, 뒤집힌 돌은 뒤집는 움직임 */
const Board = ({ game, canPlay, hints, onPlay, preview, setPreview }) => {
  const { t } = useTranslation();
  const legal = useMemo(() => (canPlay ? new Set(legalMoves(game.board, game.turn)) : new Set()), [game, canPlay]);
  const flipped = useMemo(() => new Set(game.flipped), [game.flipped]);
  const previewSet = useMemo(() => new Set(preview != null ? flipsFor(game.board, preview, game.turn) : []), [preview, game]);
  return (
    <div className="rv-board" role="grid" aria-label={t('reversi.board_label')}>
      <div className="rv-cols" aria-hidden="true">{'abcdefgh'.split('').map((c) => <span key={c}>{c}</span>)}</div>
      <div className="rv-rows" aria-hidden="true">{Array.from({ length: N }, (_, i) => <span key={i}>{i + 1}</span>)}</div>
      <div className="rv-grid">
        {Array.from(game.board).map((v, i) => {
          const isLegal = legal.has(i);
          return (
            <button
              key={i}
              type="button"
              role="gridcell"
              className={`rv-cell${isLegal ? ' is-legal' : ''}${game.last === i ? ' is-last' : ''}`}
              aria-label={`${coordOf(i)} ${v ? t(`reversi.${colorKey(v)}`) : isLegal ? t('reversi.can_place') : ''}`}
              disabled={!isLegal}
              onClick={() => onPlay(i)}
              onPointerEnter={(e) => { if (e.pointerType === 'mouse' && isLegal) setPreview(i); }}
              onPointerLeave={() => setPreview(null)}
            >
              {v !== 0 && (
                <span
                  key={flipped.has(i) || game.last === i ? `${i}-${game.moves.length}` : i}
                  className={`rv-disc ${colorKey(v)}${flipped.has(i) ? ' is-flip' : ''}${game.last === i ? ' is-new' : ''}${previewSet.has(i) ? ' is-preview' : ''}`}
                />
              )}
              {v === 0 && isLegal && hints && <span className={`rv-hint ${colorKey(game.turn)}`} />}
              {v === 0 && preview === i && <span className={`rv-disc ${colorKey(game.turn)} is-ghost`} />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const ReversiPage = () => {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const mode = MODES.includes(params.get('mode')) ? params.get('mode') : 'ai';
  const isAi = mode === 'ai';
  const [opts, toggle] = useOptions();

  const [phase, setPhase] = useState('setup');
  const [colorChoice, setColorChoice] = useState('black');
  const [level, setLevel] = useState('normal');
  const [playerColor, setPlayerColor] = useState(BLACK);
  const [game, setGame] = useState(newGame);
  const [thinking, setThinking] = useState(false);
  const [resultOpen, setResultOpen] = useState(true);
  const [preview, setPreview] = useState(null);
  const [toast, setToast] = useState(null);

  const gameRef = useRef(game);
  gameRef.current = game;
  const workerRef = useRef(null);
  const requestRef = useRef(0);
  const soundRef = useRef(opts.sound);
  soundRef.current = opts.sound;
  const toastTimer = useRef(null);

  const showToast = useCallback((text) => {
    clearTimeout(toastTimer.current);
    setToast(text);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  useEffect(() => {
    if (!isAi) return undefined;
    const worker = new Worker(new URL('./ai.worker.js', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    return () => worker.terminate();
  }, [isAi]);

  useEffect(() => {
    setPhase('setup');
    setThinking(false);
    requestRef.current += 1;
  }, [mode]);

  const commit = useCallback((next) => {
    const mover = gameRef.current.turn;
    setGame(next);
    setPreview(null);
    playSound(colorKey(mover), soundRef.current);
    if (next.moves[next.moves.length - 1] === PASS) {
      showToast(t('reversi.passed', { color: t(`reversi.${colorKey(3 - mover)}`) }));
    }
    if (next.status === 'FINISHED') {
      setResultOpen(true);
      const kind = next.winner == null ? 'draw' : (!isAi || next.winner === playerColor) ? 'win' : 'lose';
      setTimeout(() => playSound(kind, soundRef.current), 380);
    }
  }, [isAi, playerColor, showToast, t]);

  const aiColor = 3 - playerColor;
  useEffect(() => {
    if (!isAi || phase !== 'playing' || game.status !== 'PLAYING' || game.turn !== aiColor) return;
    const worker = workerRef.current;
    if (!worker) return;
    const id = ++requestRef.current;
    setThinking(true);
    const started = Date.now();
    worker.onmessage = (e) => {
      if (e.data.id !== requestRef.current) return;
      setTimeout(() => {
        if (id !== requestRef.current) return;
        setThinking(false);
        const next = e.data.move >= 0 ? playMove(gameRef.current, e.data.move) : null;
        if (next) commit(next);
      }, Math.max(0, 650 - (Date.now() - started)));
    };
    worker.postMessage({ id, board: game.board, color: aiColor, level });
  }, [isAi, phase, game, aiColor, level, commit]);

  const start = () => {
    requestRef.current += 1;
    const color = colorChoice === 'random' ? (Math.random() < 0.5 ? BLACK : WHITE) : colorChoice === 'white' ? WHITE : BLACK;
    setPlayerColor(color);
    setGame(newGame());
    setThinking(false);
    setResultOpen(true);
    setPhase('playing');
    playSound('start', opts.sound);
  };

  const canPlay = phase === 'playing' && game.status === 'PLAYING' && !thinking && (!isAi || game.turn === playerColor);
  const onPlay = (idx) => {
    if (!canPlay) return;
    const next = playMove(game, idx);
    if (next) commit(next);
    else playSound('error', opts.sound);
  };

  const undo = () => {
    requestRef.current += 1;
    setThinking(false);
    // 내 마지막 수 직전으로 (AI 대국) / 한 수 전으로 (2인)
    const real = game.moves.map((m, i) => ({ m, i })).filter((x) => x.m !== PASS);
    let cut = real.length - 1;
    if (isAi) {
      while (cut >= 0) {
        const g = replay(game.moves, real[cut].i);
        if (g.turn === playerColor) break;
        cut -= 1;
      }
    }
    if (cut < 0) return;
    setGame(replay(game.moves, real[cut].i));
    setPreview(null);
  };

  const resign = () => {
    if (!window.confirm(t('reversi.confirm_resign'))) return;
    requestRef.current += 1;
    setThinking(false);
    commit(resignGame(game, isAi ? playerColor : game.turn));
  };

  const counts = countOf(game.board);
  const finished = game.status === 'FINISHED';
  const nameOf = (c) => (isAi ? (c === playerColor ? t('reversi.you') : t('reversi.ai_name', { level: t(`reversi.levels.${level}`) })) : t(`reversi.player_${colorKey(c)}`));
  const placed = game.moves.filter((m) => m !== PASS).length;

  let status;
  if (finished) status = t('reversi.status.finished');
  else if (thinking) status = t('reversi.status.thinking');
  else if (isAi) status = t('reversi.status.your_turn');
  else status = t('reversi.status.turn', { color: t(`reversi.${colorKey(game.turn)}`) });

  let resultTitle = t('reversi.result.draw');
  let kind = 'draw';
  if (game.winner != null) {
    kind = !isAi || game.winner === playerColor ? 'win' : 'lose';
    resultTitle = isAi ? t(`reversi.result.${kind}`) : t(`reversi.result.${colorKey(game.winner)}_wins`);
  }

  const topbar = (
    <div className="rv-topbar">
      <h1 className="rv-title"><span className="rv-logo" aria-hidden="true" />{t('reversi.title')}</h1>
      <div className="rv-tabs" role="tablist">
        {MODES.map((m) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} className={`rv-tab${mode === m ? ' is-active' : ''}`} onClick={() => setParams({ mode: m })}>
            {t(`reversi.modes.${m}`)}
          </button>
        ))}
      </div>
      <div className="rv-opts">
        {[['sound', opts.sound ? '🔊' : '🔇'], ['hints', '◌']].map(([k, icon]) => (
          <button key={k} type="button" className={`rv-opt${opts[k] ? ' is-on' : ''}`} aria-pressed={opts[k]} title={t(`reversi.opts.${k}`)} aria-label={t(`reversi.opts.${k}`)} onClick={() => toggle(k)}>
            <span aria-hidden="true">{icon}</span><small>{t(`reversi.opts.${k}_short`)}</small>
          </button>
        ))}
      </div>
    </div>
  );

  const choice = (active, onClick, title, desc, key) => (
    <button key={key} type="button" className={`rv-choice${active ? ' is-active' : ''}`} aria-pressed={active} onClick={onClick}>
      {title}<small>{desc}</small>
    </button>
  );

  const rules = t('reversi.rules', { returnObjects: true });

  return (
    <div className="rv-page">
      <Helmet>
        <title>{t('reversi.meta_title')}</title>
        <meta name="description" content={t('reversi.meta_desc')} />
        <link rel="canonical" href="https://tnhub.kr/play/reversi" />
      </Helmet>
      <div className="rv-stage">
        {topbar}
        {phase === 'setup' ? (
          <div className="rv-setup-wrap">
            <div className="rv-setup">
              <h2>{t(isAi ? 'reversi.setup.ai_title' : 'reversi.setup.local_title')}</h2>
              {!isAi && <p className="rv-hint-text">{t('reversi.setup.local_desc')}</p>}
              {isAi && (
                <>
                  <div>
                    <div className="rv-label">{t('reversi.setup.my_color')}</div>
                    <div className="rv-choices">
                      {['black', 'white', 'random'].map((c) => choice(colorChoice === c, () => setColorChoice(c), (
                        <span className="rv-choice-title">{c !== 'random' && <span className={`rv-dot ${c}`} aria-hidden="true" />}{t(`reversi.setup.${c}`)}</span>
                      ), t(`reversi.setup.${c}_desc`), c))}
                    </div>
                  </div>
                  <div>
                    <div className="rv-label">{t('reversi.setup.level')}</div>
                    <div className="rv-choices">
                      {LEVELS.map((k) => choice(level === k, () => setLevel(k), t(`reversi.levels.${k}`), t(`reversi.levels.${k}_desc`), k))}
                    </div>
                  </div>
                </>
              )}
              <button type="button" className="rv-btn primary big" onClick={start}>{t('reversi.actions.start')}</button>
            </div>
          </div>
        ) : (
          <div className="rv-main">
            <div className="rv-score">
              {[BLACK, WHITE].map((c) => (
                <div key={c} className={`rv-player ${colorKey(c)}${!finished && game.turn === c ? ' is-turn' : ''}`}>
                  <span className={`rv-dot ${colorKey(c)}`} aria-hidden="true" />
                  <div className="rv-player-text">
                    <div className="rv-player-name">{nameOf(c)}{isAi && c === aiColor && thinking && <em>{t('reversi.status.thinking_short')}</em>}</div>
                    <div className="rv-player-sub">{t(`reversi.${colorKey(c)}`)}</div>
                  </div>
                  <strong className="rv-count">{counts[c]}</strong>
                </div>
              ))}
              <div className="rv-bar" aria-hidden="true">
                <i className="black" style={{ flexGrow: counts[BLACK] }} />
                <i className="white" style={{ flexGrow: counts[WHITE] }} />
              </div>
            </div>
            <div className="rv-board-area">
              <div className="rv-board-fit">
                <Board game={game} canPlay={canPlay} hints={opts.hints} onPlay={onPlay} preview={preview} setPreview={setPreview} />
                {finished && resultOpen && (
                  <div className={`rv-result is-${kind}`} role="dialog" aria-label={resultTitle}>
                    <div className="rv-result-box">
                      <strong>{resultTitle}</strong>
                      <p>{game.resigned ? t('reversi.result.resigned', { color: t(`reversi.${colorKey(game.resigned)}`) }) : t('reversi.result.score', { b: counts[BLACK], w: counts[WHITE] })}</p>
                      <div className="rv-result-actions">
                        <button type="button" className="rv-btn primary" onClick={start}>{t('reversi.actions.again')}</button>
                        <button type="button" className="rv-btn" onClick={() => setResultOpen(false)}>{t('reversi.actions.view_board')}</button>
                        <button type="button" className="rv-btn" onClick={() => setPhase('setup')}>{t('reversi.actions.new_game')}</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="rv-side">
              <p className="rv-status">
                {!finished && <span className={`rv-dot small ${colorKey(game.turn)}`} aria-hidden="true" />}
                {status}
                <span className="rv-moves-n">{t('reversi.move_count', { n: placed })}</span>
              </p>
              <div className="rv-actions">
                <button type="button" className="rv-btn" onClick={undo} disabled={!placed || finished && game.resigned != null}>{t('reversi.actions.undo')}</button>
                {finished
                  ? <button type="button" className="rv-btn primary" onClick={start}>{t('reversi.actions.again')}</button>
                  : <button type="button" className="rv-btn danger" onClick={resign}>{t('reversi.actions.resign')}</button>}
                <button type="button" className="rv-btn" onClick={() => setPhase('setup')}>{t('reversi.actions.new_game')}</button>
              </div>
              <p className="rv-tip">{t('reversi.tip')}</p>
            </div>
          </div>
        )}
        {toast && <div className="rv-toast" role="status">{toast}</div>}
      </div>

      <div className="rv-below">
        <details className="rv-panel" open>
          <summary>{t('reversi.rules_title')}</summary>
          <ul>{Array.isArray(rules) && rules.map(([name, desc]) => <li key={name}><b>{name}</b>: {desc}</li>)}</ul>
        </details>
      </div>
    </div>
  );
};

export default ReversiPage;
