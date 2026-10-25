import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import JanggiBoard from './JanggiBoard.jsx';
import {
  CHO, HAN, PASS, DEFAULT_FORMATION, newGame, playMove, resign, legalMovesFrom, inCheck, findKing, teamOf, scores,
} from './engine.js';
import { LEVELS } from './ai.js';
import { playSound } from './sound.js';
import { PlayerCard, FormationPicker, MoveList } from './parts.jsx';
import { useNotations, capturedBy, TEAM_LABEL } from './helpers.js';

/**
 * AI 대국(mode="ai") / 한 화면 2인 대국(mode="local")
 */
const LocalGame = ({ mode }) => {
  const isAi = mode === 'ai';

  // 설정
  const [phase, setPhase] = useState('setup');
  const [playerTeam, setPlayerTeam] = useState(CHO);
  const [level, setLevel] = useState('normal');
  const [choFormation, setChoFormation] = useState(DEFAULT_FORMATION);
  const [hanFormation, setHanFormation] = useState(DEFAULT_FORMATION);

  // 대국
  const [history, setHistory] = useState([]); // 무르기용 상태 스택
  const [selected, setSelected] = useState(null);
  const [thinking, setThinking] = useState(false);
  const [banner, setBanner] = useState(null);
  const [sound, setSound] = useState(true);
  const [flip, setFlip] = useState(false);

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
    setSelected(null);
    setThinking(false);
    requestRef.current += 1;
  }, [mode]);

  const aiTeam = playerTeam === CHO ? HAN : CHO;
  const flipped = isAi ? (playerTeam === HAN) !== flip : flip;

  const showBanner = (text, type = 'alert') => setBanner({ text, type, key: Date.now() });

  /** 새 상태 반영 + 효과음/알림 */
  const commit = useCallback((next, prev) => {
    setHistory((h) => [...h, next]);
    setSelected(null);
    const last = next.moves[next.moves.length - 1];
    if (next.status === 'FINISHED') {
      const won = !isAi || next.winner === (playerTeam === CHO ? 'CHO' : 'HAN');
      playSound(won ? 'win' : 'lose', sound);
      return;
    }
    if (inCheck(next.board, next.turn)) {
      playSound('check', sound);
      showBanner('장군!');
    } else if (prev && inCheck(prev.board, prev.turn) && last[0] !== PASS) {
      showBanner('멍군!', 'info');
      playSound('move', sound);
    } else if (next.bikjang) {
      showBanner('빅장!', 'info');
      playSound('check', sound);
    } else if (last[0] === PASS) {
      showBanner('한수쉼', 'info');
    } else {
      playSound(last[2] ? 'capture' : 'move', sound);
    }
  }, [isAi, playerTeam, sound]);

  // AI 차례면 워커에 계산 요청
  useEffect(() => {
    if (!isAi || phase !== 'playing' || !game || game.status !== 'PLAYING' || game.turn !== aiTeam) return;
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
        const cur = gameRef.current;
        commit(playMove(cur, e.data.from, e.data.to), cur);
      }, wait);
    };
    worker.postMessage({ id, board: game.board, team: aiTeam, level });
  }, [isAi, phase, game, aiTeam, level, commit]);

  const startGame = () => {
    requestRef.current += 1;
    setHistory([newGame(choFormation, hanFormation)]);
    setSelected(null);
    setThinking(false);
    setFlip(false);
    setPhase('playing');
  };

  const myTurn = game && game.status === 'PLAYING' && !thinking && (!isAi || game.turn === playerTeam);

  const targets = useMemo(
    () => (selected != null && game ? legalMovesFrom(game.board, selected) : []),
    [selected, game],
  );

  const onSquare = (i) => {
    if (!myTurn) return;
    const p = game.board[i];
    if (selected != null && targets.includes(i)) {
      commit(playMove(game, selected, i), game);
      return;
    }
    if (p && teamOf(p) === game.turn) setSelected(i === selected ? null : i);
    else setSelected(null);
  };

  const undo = () => {
    requestRef.current += 1;
    setThinking(false);
    setSelected(null);
    setHistory((h) => {
      let n = h.slice(0, -1);
      // AI 대국은 내 차례가 될 때까지 되돌림
      if (isAi && n.length > 1 && n[n.length - 1].turn !== playerTeam) n = n.slice(0, -1);
      return n.length ? n : h;
    });
  };

  const pass = () => commit(playMove(game, PASS, PASS), game);
  const doResign = () => {
    if (!window.confirm('기권하시겠습니까?')) return;
    commit(resign(game, isAi ? playerTeam : game.turn), game);
  };

  const notations = useNotations(game?.choFormation, game?.hanFormation, game?.moves || []);
  const captured = useMemo(
    () => (game ? capturedBy(game.choFormation, game.hanFormation, game.moves) : { [CHO]: [], [HAN]: [] }),
    [game],
  );

  /* ── 설정 화면 ── */
  if (phase === 'setup') {
    return (
      <div className="jg-panel jg-setup" style={{ maxWidth: 640, margin: '0 auto' }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{isAi ? 'AI와 대국' : '한 화면에서 둘이 대국'}</h2>
        {isAi && (
          <>
            <div>
              <div className="jg-field-label">내 진영</div>
              <div className="jg-choices">
                <button type="button" className={`jg-choice${playerTeam === CHO ? ' is-active' : ''}`} onClick={() => setPlayerTeam(CHO)}>
                  초(楚) <small>먼저 둠</small>
                </button>
                <button type="button" className={`jg-choice${playerTeam === HAN ? ' is-active' : ''}`} onClick={() => setPlayerTeam(HAN)}>
                  한(漢) <small>나중에 둠 · 덤 1.5점</small>
                </button>
              </div>
            </div>
            <div>
              <div className="jg-field-label">AI 난이도</div>
              <div className="jg-choices">
                {Object.entries(LEVELS).map(([key, lv]) => (
                  <button key={key} type="button" className={`jg-choice${level === key ? ' is-active' : ''}`} onClick={() => setLevel(key)}>
                    {lv.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
        <div>
          <div className="jg-field-label">초(楚) 상차림</div>
          <FormationPicker value={choFormation} onChange={setChoFormation} />
        </div>
        <div>
          <div className="jg-field-label">한(漢) 상차림</div>
          <FormationPicker value={hanFormation} onChange={setHanFormation} />
        </div>
        <button type="button" className="jg-btn primary" onClick={startGame}>대국 시작</button>
      </div>
    );
  }

  /* ── 대국 화면 ── */
  const s = scores(game.board);
  const checkSq = game.status === 'PLAYING' && inCheck(game.board, game.turn) ? findKing(game.board, game.turn) : null;
  const lastMove = game.moves[game.moves.length - 1];
  const nameOf = (team) => (isAi ? (team === playerTeam ? '나' : `AI (${LEVELS[level].label})`) : TEAM_LABEL[team]);
  const winnerLabel = game.winner === 'CHO' ? TEAM_LABEL[CHO] : TEAM_LABEL[HAN];

  let status;
  if (game.status === 'FINISHED') status = null;
  else if (thinking) status = <>AI가 수를 생각하는 중…</>;
  else if (isAi) status = game.turn === playerTeam ? <><strong>내 차례</strong>입니다</> : <>AI 차례</>;
  else status = <><strong>{TEAM_LABEL[game.turn]}</strong> 차례</>;

  const topTeam = flipped ? CHO : HAN;
  const bottomTeam = flipped ? HAN : CHO;
  const card = (team) => (
    <PlayerCard
      team={team}
      name={nameOf(team)}
      sub={TEAM_LABEL[team]}
      isTurn={game.status === 'PLAYING' && game.turn === team}
      score={team === CHO ? s.cho : s.han}
      captured={captured[team]}
    />
  );

  return (
    <div className="jg-layout">
      <div>
        <div style={{ marginBottom: 10 }}>{card(topTeam)}</div>
        <div className="jg-board-wrap">
          <JanggiBoard
            board={game.board}
            flipped={flipped}
            selected={selected}
            targets={targets}
            lastMove={lastMove}
            checkSq={checkSq}
            onSquare={onSquare}
            disabled={!myTurn}
          />
          {banner && <div key={banner.key} className={`jg-banner${banner.type === 'info' ? ' is-info' : ''}`}>{banner.text}</div>}
        </div>
        <div style={{ marginTop: 10 }}>{card(bottomTeam)}</div>
      </div>

      <div className="jg-side">
        <div className="jg-panel">
          {game.status === 'FINISHED' ? (
            <div className="jg-result">
              <strong>{isAi ? (game.winner === (playerTeam === CHO ? 'CHO' : 'HAN') ? '승리!' : '패배') : `${winnerLabel} 승리`}</strong>
              {game.reason} · 초 {s.cho}점 / 한 {s.han}점
            </div>
          ) : (
            <p className="jg-status">{status}{game.bikjang && <><br />빅장! 풀지 않으면 점수로 판정합니다.</>}</p>
          )}
          <div className="jg-actions" style={{ marginTop: 12 }}>
            <button type="button" className="jg-btn" onClick={undo} disabled={history.length < 2 || (isAi && thinking)}>무르기</button>
            <button
              type="button"
              className="jg-btn"
              onClick={pass}
              disabled={!myTurn || inCheck(game.board, game.turn)}
              title="장군 상태가 아니면 한 수를 쉴 수 있습니다"
            >
              한수쉼
            </button>
            <button type="button" className="jg-btn danger" onClick={doResign} disabled={game.status !== 'PLAYING'}>기권</button>
            <button type="button" className="jg-btn" onClick={() => setFlip((f) => !f)}>판 돌리기</button>
            <button type="button" className="jg-btn" onClick={() => setSound((v) => !v)}>{sound ? '소리 끄기' : '소리 켜기'}</button>
            <button type="button" className="jg-btn primary" onClick={() => setPhase('setup')}>새 대국</button>
          </div>
        </div>
        <MoveList notations={notations} />
      </div>
    </div>
  );
};

export default LocalGame;
