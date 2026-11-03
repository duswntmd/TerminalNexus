import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ChessBoard from './ChessBoard.jsx';
import { WHITE, BLACK, enemyOf, newGame, playMove, resign, capturedBy, materialDiff } from './engine.js';
import { playSound } from '../janggi/sound.js';
import { PlayerCard, MoveList, PromotionPicker, ResultOverlay } from './parts.jsx';
import { colorKey } from './helpers.js';

const LEVEL_KEYS = ['easy', 'normal', 'hard'];

/**
 * AI 대국(mode="ai") / 한 화면 2인 대국(mode="local")
 */
const LocalGame = ({ mode }) => {
  const { t } = useTranslation();
  const isAi = mode === 'ai';

  // 설정
  const [phase, setPhase] = useState('setup');
  const [colorChoice, setColorChoice] = useState('white'); // white | black | random
  const [playerColor, setPlayerColor] = useState(WHITE);
  const [level, setLevel] = useState('normal');

  // 대국
  const [history, setHistory] = useState([]); // 무르기용 상태 스택
  const [thinking, setThinking] = useState(false);
  const [banner, setBanner] = useState(null);
  const [sound, setSound] = useState(true);
  const [flip, setFlip] = useState(false);
  const [promo, setPromo] = useState(null); // { from, to }
  const [resultOpen, setResultOpen] = useState(true);

  const game = history[history.length - 1];
  const gameRef = useRef(game);
  gameRef.current = game;
  const workerRef = useRef(null);
  const requestRef = useRef(0);

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
    setHistory([]);
    setThinking(false);
    setPromo(null);
    requestRef.current += 1;
  }, [mode]);

  const aiColor = enemyOf(playerColor);
  const flipped = isAi ? (playerColor === BLACK) !== flip : flip;

  /** 새 상태 반영 + 효과음/알림 */
  const commit = useCallback((next) => {
    setHistory((h) => [...h, next]);
    setResultOpen(true);
    const last = next.moves[next.moves.length - 1];
    if (next.status === 'FINISHED') {
      const won = next.winner != null && (!isAi || next.winner === playerColor);
      playSound(next.winner == null ? 'move' : won ? 'win' : 'lose', sound);
      return;
    }
    if (next.check) {
      playSound('check', sound);
      setBanner({ text: t('chess.status.check'), key: Date.now() });
    } else playSound(last.captured ? 'capture' : 'move', sound);
  }, [isAi, playerColor, sound, t]);

  // AI 차례면 워커에 계산 요청
  useEffect(() => {
    if (!isAi || phase !== 'playing' || !game || game.status !== 'PLAYING' || game.turn !== aiColor) return;
    const worker = workerRef.current;
    if (!worker) return;
    const id = ++requestRef.current;
    setThinking(true);
    const started = Date.now();
    worker.onmessage = (e) => {
      if (e.data.id !== requestRef.current) return; // 무르기/새 게임 이후의 낡은 응답
      // 너무 빨리 두면 어색하므로 최소 400ms 대기
      const wait = Math.max(0, 400 - (Date.now() - started));
      setTimeout(() => {
        if (id !== requestRef.current) return;
        setThinking(false);
        if (e.data.uci) commit(playMove(gameRef.current, e.data.uci));
      }, wait);
    };
    worker.postMessage({ id, startFen: game.startFen, moves: game.moves.map((m) => m.uci), level });
  }, [isAi, phase, game, aiColor, level, commit]);

  const startGame = () => {
    requestRef.current += 1;
    const color = colorChoice === 'random' ? (Math.random() < 0.5 ? WHITE : BLACK) : colorChoice === 'black' ? BLACK : WHITE;
    setPlayerColor(color);
    setHistory([newGame()]);
    setThinking(false);
    setFlip(false);
    setPromo(null);
    setPhase('playing');
  };

  const myTurn = game && game.status === 'PLAYING' && !thinking && (!isAi || game.turn === playerColor);
  const legal = myTurn && !promo ? game.legal : [];

  const onMove = (from, to) => {
    const options = game.legal.filter((m) => m.from === from && m.to === to);
    if (!options.length) return;
    if (options.length > 1) setPromo({ from, to });
    else commit(playMove(game, options[0].uci));
  };

  const onPromote = (type) => {
    const { from, to } = promo;
    setPromo(null);
    const m = game.legal.find((x) => x.from === from && x.to === to && x.promo === type);
    if (m) commit(playMove(game, m.uci));
  };

  const undo = () => {
    requestRef.current += 1;
    setThinking(false);
    setPromo(null);
    setHistory((h) => {
      let n = h.slice(0, -1);
      // AI 대국은 내 차례가 될 때까지 되돌림
      if (isAi && n.length > 1 && n[n.length - 1].turn !== playerColor) n = n.slice(0, -1);
      return n.length ? n : h;
    });
  };

  const doResign = () => {
    if (!window.confirm(t('chess.confirm.resign'))) return;
    commit(resign(game, isAi ? playerColor : game.turn));
  };

  const captured = useMemo(() => (game ? capturedBy(game.moves) : { [WHITE]: [], [BLACK]: [] }), [game]);

  /* ── 설정 화면 ── */
  if (phase === 'setup') {
    return (
      <div className="ch-panel ch-setup" style={{ maxWidth: 640, margin: '0 auto' }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{t(isAi ? 'chess.setup.ai_title' : 'chess.setup.local_title')}</h2>
        {isAi ? (
          <>
            <div>
              <div className="ch-field-label">{t('chess.setup.my_color')}</div>
              <div className="ch-choices">
                {['white', 'black', 'random'].map((c) => (
                  <button key={c} type="button" className={`ch-choice${colorChoice === c ? ' is-active' : ''}`} onClick={() => setColorChoice(c)}>
                    {t(`chess.setup.${c}`)} <small>{t(`chess.setup.${c}_desc`)}</small>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="ch-field-label">{t('chess.setup.level')}</div>
              <div className="ch-choices">
                {LEVEL_KEYS.map((key) => (
                  <button key={key} type="button" className={`ch-choice${level === key ? ' is-active' : ''}`} onClick={() => setLevel(key)}>
                    {t(`chess.levels.${key}`)} <small>{t(`chess.levels.${key}_desc`)}</small>
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : <p className="ch-hint">{t('chess.setup.local_desc')}</p>}
        <button type="button" className="ch-btn primary" onClick={startGame}>{t('chess.actions.start')}</button>
      </div>
    );
  }

  /* ── 대국 화면 ── */
  const diff = materialDiff(game.board);
  const lastMove = game.moves[game.moves.length - 1];
  const colorLabel = (c) => t(`chess.${colorKey(c)}`);
  const nameOf = (c) => (isAi ? (c === playerColor ? t('chess.you') : t('chess.ai_name', { level: t(`chess.levels.${level}`) })) : colorLabel(c));

  let status;
  if (thinking) status = t('chess.status.thinking');
  else if (isAi) status = game.turn === playerColor ? t('chess.status.your_turn') : t('chess.status.ai_turn');
  else status = t('chess.status.turn', { color: colorLabel(game.turn) });

  let resultTitle = t('chess.result.draw');
  if (game.winner != null) {
    resultTitle = isAi ? t(game.winner === playerColor ? 'chess.result.win' : 'chess.result.lose') : t(`chess.result.${colorKey(game.winner)}_wins`);
  }
  const resultReason = game.reason ? t(`chess.reason.${game.reason}`) : '';

  const topColor = flipped ? WHITE : BLACK;
  const bottomColor = flipped ? BLACK : WHITE;
  const card = (c) => (
    <PlayerCard
      color={c}
      name={nameOf(c)}
      sub={colorLabel(c)}
      isTurn={game.status === 'PLAYING' && game.turn === c}
      captured={captured[c]}
      advantage={c === WHITE ? diff : -diff}
    />
  );

  return (
    <div className="ch-layout">
      <div>
        <div style={{ marginBottom: 10 }}>{card(topColor)}</div>
        <div className="ch-board-wrap">
          <ChessBoard
            board={game.board}
            flipped={flipped}
            legal={legal}
            lastMove={lastMove}
            checkSq={game.check ? game.kingSq : null}
            onMove={onMove}
            label={t('chess.board_label')}
          />
          {banner && <div key={banner.key} className="ch-banner">{banner.text}</div>}
          {promo && <PromotionPicker color={game.turn} onPick={onPromote} onCancel={() => setPromo(null)} />}
          {game.status === 'FINISHED' && resultOpen && (
            <ResultOverlay title={resultTitle} reason={resultReason} onClose={() => setResultOpen(false)}>
              <button type="button" className="ch-btn primary" onClick={() => setPhase('setup')}>{t('chess.actions.new_game')}</button>
            </ResultOverlay>
          )}
        </div>
        <div style={{ marginTop: 10 }}>{card(bottomColor)}</div>
      </div>

      <div className="ch-side">
        <div className="ch-panel">
          {game.status === 'FINISHED' ? (
            <div className="ch-result">
              <strong>{resultTitle}</strong>
              {resultReason}
            </div>
          ) : (
            <p className="ch-status">{status}</p>
          )}
          <div className="ch-actions" style={{ marginTop: 12 }}>
            <button type="button" className="ch-btn" onClick={undo} disabled={history.length < 2}>{t('chess.actions.undo')}</button>
            <button type="button" className="ch-btn" onClick={() => setFlip((f) => !f)}>{t('chess.actions.flip')}</button>
            <button type="button" className="ch-btn danger" onClick={doResign} disabled={game.status !== 'PLAYING'}>{t('chess.actions.resign')}</button>
            <button type="button" className="ch-btn" onClick={() => setSound((v) => !v)}>{t(sound ? 'chess.actions.sound_off' : 'chess.actions.sound_on')}</button>
            <button type="button" className="ch-btn primary" onClick={() => setPhase('setup')}>{t('chess.actions.new_game')}</button>
          </div>
        </div>
        <MoveList moves={game.moves} />
      </div>
    </div>
  );
};

export default LocalGame;
