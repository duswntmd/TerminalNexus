import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BLACK, coordOf, playMove, replay } from './engine.js';
import { fivePoints, isGoodMove, winningFirstMoves } from './puzzle.js';
import { PUZZLES, PUZZLE_RULE } from './puzzles.js';
import { playSound } from './sound.js';
import GameScreen from './GameScreen.jsx';
import { ResultOverlay } from './parts.jsx';
import { useOptions, useToast, useBoardInput, colorKey, resultSide } from './helpers.js';

const KEY = 'tn.omok.puzzles.solved';
const loadSolved = () => {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch { return new Set(); }
};
const saveSolved = (set) => {
  try { localStorage.setItem(KEY, JSON.stringify([...set])); } catch { /* 저장 불가 환경은 무시 */ }
};

const LEVEL_OF = (n) => (n <= 2 ? 'easy' : n <= 4 ? 'normal' : 'hard');

/**
 * 묘수풀이: 연속 4(VCF)로 정해진 수 안에 이기기. 막는 쪽은 컴퓨터가 자동으로 막는다.
 * 정답 수순이 여러 개면 어느 쪽이든 정답으로 인정한다 (puzzle.js 의 풀이기로 매 수 확인).
 */
const PuzzleGame = ({ topbar }) => {
  const { t } = useTranslation();
  const [opts, toggle] = useOptions();
  const [toast, showToast] = useToast();
  const [index, setIndex] = useState(() => {
    const solved = loadSolved();
    const first = PUZZLES.findIndex((p) => !solved.has(p.id));
    return first >= 0 ? first : 0;
  });
  const [solved, setSolved] = useState(loadSolved);
  const puzzle = PUZZLES[index];
  const attacker = puzzle.moves.length % 2 === 0 ? BLACK : 3 - BLACK;
  const start = useMemo(() => replay(PUZZLE_RULE, puzzle.moves), [puzzle]);

  const [game, setGame] = useState(start);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState('playing'); // playing | solved | shown
  const [wrong, setWrong] = useState(0);
  const timer = useRef(null);
  const soundRef = useRef(opts.sound);
  soundRef.current = opts.sound;

  const reset = useCallback(() => {
    clearTimeout(timer.current);
    setGame(start);
    setBusy(false);
    setState('playing');
    setWrong(0);
  }, [start]);
  useEffect(() => { reset(); }, [reset]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const used = Math.ceil((game.moves.length - puzzle.moves.length) / 2);
  const left = puzzle.n - used;

  const markSolved = useCallback(() => {
    setSolved((s) => {
      const next = new Set(s).add(puzzle.id);
      saveSolved(next);
      return next;
    });
  }, [puzzle.id]);

  /** 막는 쪽 응수: 막을 자리가 있으면 거기, 없으면(4-4 등) 5목 자리 중 하나 */
  const defend = useCallback((g) => {
    const threats = fivePoints(g.board, attacker, PUZZLE_RULE);
    for (const idx of threats) {
      const next = playMove(g, idx);
      if (next) return next;
    }
    // 막을 자리가 금수(렌주룰 흑): 막지 못하고 그 근처 빈칸에 둔다
    showToast(t('omok.puzzle.cant_block'));
    const t0 = threats[0] ?? 112;
    const near = Array.from({ length: g.board.length }, (_, i) => i)
      .filter((i) => g.board[i] === 0)
      .sort((a, b) => Math.hypot((a % 15) - (t0 % 15), Math.floor(a / 15) - Math.floor(t0 / 15)) - Math.hypot((b % 15) - (t0 % 15), Math.floor(b / 15) - Math.floor(t0 / 15)));
    for (const idx of near) {
      const next = playMove(g, idx);
      if (next) return next;
    }
    return g;
  }, [attacker, showToast, t]);

  const place = useCallback((idx) => {
    if (busy || state !== 'playing') return;
    const check = isGoodMove(game.board, attacker, PUZZLE_RULE, idx, left);
    if (!check.ok) {
      setWrong((w) => w + 1);
      playSound('error', soundRef.current);
      const why = check.step.type === 'none' ? 'not_four' : check.step.type === 'lose' ? 'lose' : 'wrong';
      showToast(t(`omok.puzzle.${why}`));
      return;
    }
    const next = playMove(game, idx);
    if (!next) return;
    playSound(colorKey(attacker), soundRef.current);
    setGame(next);
    if (next.status === 'FINISHED') {
      setState('solved');
      markSolved();
      setTimeout(() => playSound('win', soundRef.current), 320);
      return;
    }
    setBusy(true);
    timer.current = setTimeout(() => {
      const after = defend(next);
      playSound(colorKey(3 - attacker), soundRef.current);
      setGame(after);
      setBusy(false);
    }, 450);
  }, [busy, state, game, attacker, left, defend, markSolved, showToast, t]);

  const canPlay = state === 'playing' && !busy && game.status === 'PLAYING' && game.turn === attacker;
  const input = useBoardInput({ game, canPlay, opts, place, showToast });

  const hint = () => {
    const firsts = winningFirstMoves(game.board, attacker, PUZZLE_RULE, left);
    if (firsts.length) showToast(t('omok.puzzle.hint_at', { at: coordOf(firsts[0]) }));
  };

  /** 해답 보기: 처음부터 정답 수순을 차례로 둔다 */
  const showAnswer = () => {
    clearTimeout(timer.current);
    let g = start;
    const steps = [];
    for (let k = puzzle.n; k >= 1 && g.status === 'PLAYING'; k -= 1) {
      const m = winningFirstMoves(g.board, attacker, PUZZLE_RULE, k)[0];
      if (m == null) break;
      g = playMove(g, m);
      steps.push(g);
      if (g.status !== 'PLAYING') break;
      g = defend(g);
      steps.push(g);
    }
    setState('shown');
    setBusy(true);
    setGame(start);
    steps.forEach((s, i) => {
      timer.current = setTimeout(() => {
        setGame(s);
        playSound(i % 2 === 0 ? colorKey(attacker) : colorKey(3 - attacker), soundRef.current);
        if (i === steps.length - 1) setBusy(false);
      }, 500 * (i + 1));
    });
  };

  const go = (i) => setIndex(Math.max(0, Math.min(PUZZLES.length - 1, i)));
  const colorName = t(`omok.${colorKey(attacker)}`);
  const levelKey = LEVEL_OF(puzzle.n);

  return (
    <GameScreen
      topbar={topbar}
      opts={opts}
      toggle={toggle}
      toast={toast}
      top={{ color: 3 - attacker, name: t('omok.puzzle.defender'), sub: t(`omok.${colorKey(3 - attacker)}`), active: busy && state === 'playing' }}
      bottom={{ color: attacker, name: t('omok.you'), sub: colorName, active: canPlay }}
      board={{
        moves: game.moves,
        forbidden: input.forbidden,
        turnColor: canPlay ? game.turn : null,
        selected: input.selected,
        winLine: game.winLine,
        onPick: input.pick,
      }}
      status={(
        <div className="om-status om-puzzle-status">
          <span className={`om-rule-chip lv-${levelKey}`}>{t(`omok.puzzle.level_${levelKey}`)}</span>
          <strong>{t('omok.puzzle.title_n', { no: puzzle.id })}</strong>
          <span>{t('omok.puzzle.goal', { color: colorName, n: puzzle.n })}</span>
          {state === 'playing' && <span className="om-puzzle-left">{t('omok.puzzle.left', { n: left })}</span>}
        </div>
      )}
      notice={state === 'playing' && <p className="om-hint">{t('omok.puzzle.how')}</p>}
      overlay={state !== 'playing' && game.status === 'FINISHED' && (
        <ResultOverlay
          kind={state === 'solved' ? 'win' : 'plain'}
          title={t(state === 'solved' ? 'omok.puzzle.solved' : 'omok.puzzle.answer_title')}
          reason={state === 'solved' ? t(wrong ? 'omok.puzzle.solved_tries' : 'omok.puzzle.solved_clean', { n: wrong }) : ''}
          at={resultSide(game.winLine)}
        >
          {index < PUZZLES.length - 1 && <button type="button" className="om-btn primary" onClick={() => go(index + 1)}>{t('omok.puzzle.next')}</button>}
          <button type="button" className="om-btn" onClick={reset}>{t('omok.puzzle.retry')}</button>
        </ResultOverlay>
      )}
      actions={(
        <>
          {opts.confirm && state === 'playing' && (
            <button type="button" className="om-btn primary wide" disabled={input.selected == null} onClick={input.confirm}>{t('omok.actions.place')}</button>
          )}
          <button type="button" className="om-btn" onClick={hint} disabled={!canPlay}>{t('omok.puzzle.hint')}</button>
          <button type="button" className="om-btn" onClick={reset} disabled={game.moves.length === puzzle.moves.length && state === 'playing'}>{t('omok.puzzle.retry')}</button>
          <button type="button" className="om-btn" onClick={showAnswer} disabled={busy}>{t('omok.puzzle.answer')}</button>
        </>
      )}
      moves={{ moves: game.moves.slice(puzzle.moves.length), current: game.moves.length - puzzle.moves.length, onJump: null }}
      extra={(
        <div className="om-puzzles">
          <div className="om-puzzles-head">
            <button type="button" className="om-btn" onClick={() => go(index - 1)} disabled={index === 0} aria-label={t('omok.puzzle.prev')}>◀</button>
            <span>{t('omok.puzzle.progress', { done: solved.size, total: PUZZLES.length })}</span>
            <button type="button" className="om-btn" onClick={() => go(index + 1)} disabled={index === PUZZLES.length - 1} aria-label={t('omok.puzzle.next')}>▶</button>
          </div>
          <ol className="om-puzzles-list">
            {PUZZLES.map((p, i) => (
              <li key={p.id}>
                <button
                  type="button"
                  className={`om-pz lv-${LEVEL_OF(p.n)}${i === index ? ' is-current' : ''}${solved.has(p.id) ? ' is-solved' : ''}`}
                  onClick={() => go(i)}
                  aria-current={i === index}
                  title={t('omok.puzzle.item', { no: p.id, n: p.n })}
                >
                  {solved.has(p.id) ? '✓' : p.id}
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
    />
  );
};

export default PuzzleGame;
