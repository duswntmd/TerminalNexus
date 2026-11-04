import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { newGame, applyAction, settle, viewFor } from './engine.js';
import { decide } from './ai.js';
import { bannerFromEvents } from './helpers.js';
import { Settlement } from './parts.jsx';
import GameTable from './GameTable.jsx';
import { loadPoints, savePoints, applyResult, POINT_PER_SCORE, START_POINTS } from './points.js';
import { playSound } from '../janggi/sound.js';

const LEVELS = ['easy', 'hard'];
const ME = 0;
const AI = 1;

/** AI와 1:1 맞고. 나는 0번, AI는 1번 자리 */
const AiGame = () => {
  const { t } = useTranslation();
  const [phase, setPhase] = useState('setup');
  const [level, setLevel] = useState('hard');
  const [game, setGame] = useState(null);
  const [banner, setBanner] = useState(null);
  const [sound, setSound] = useState(true);
  const [points, setPoints] = useState(loadPoints);
  const [outcome, setOutcome] = useState(null); // { result, delta, refilled }
  const [resultOpen, setResultOpen] = useState(true);
  const nextRef = useRef({ first: null, carry: 1 });
  const pointsRef = useRef(points);
  pointsRef.current = points;

  const names = [t('gostop.you'), t('gostop.ai_name', { level: t(`gostop.levels.${level}`) })];

  /** 새 상태 반영: 알림, 효과음, 끝났으면 정산 */
  const commit = useCallback((next) => {
    setGame(next);
    const b = bannerFromEvents(next.events, t, names, ME);
    if (b) setBanner(b);
    const took = next.last && next.events.some((e) => e.type === 'flip') ? next.last.took.length : 0;
    if (next.phase !== 'end') {
      if (next.events.some((e) => ['ppeok', 'go'].includes(e.type))) playSound('check', sound);
      else playSound(took ? 'capture' : 'move', sound);
      return;
    }
    const result = settle(next);
    const delta = result.winner == null ? 0 : (result.winner === ME ? 1 : -1) * result.final * POINT_PER_SCORE;
    const applied = applyResult(pointsRef.current, delta);
    setPoints(applied.points);
    savePoints(applied.points);
    setOutcome({ result, delta: applied.delta, refilled: applied.refilled });
    setResultOpen(true);
    nextRef.current = { first: result.winner ?? next.first, carry: Math.min(result.nextCarry, 8) };
    playSound(result.winner == null ? 'move' : result.winner === ME ? 'win' : 'lose', sound);
    // names는 렌더마다 새 배열이라 의존성에서 뺀다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, sound, level]);

  // AI 차례
  useEffect(() => {
    if (phase !== 'playing' || !game || game.phase === 'end' || game.turn !== AI) return undefined;
    const delay = game.phase === 'play' ? 750 : 550;
    const timer = setTimeout(() => {
      const action = decide(viewFor(game, AI), AI, level);
      commit(applyAction(game, action));
    }, delay);
    return () => clearTimeout(timer);
  }, [phase, game, level, commit]);

  const start = () => {
    const { first, carry } = nextRef.current;
    setOutcome(null);
    setBanner(null);
    setPhase('playing');
    commit(newGame({ first: first ?? (Math.random() < 0.5 ? ME : AI), carry }));
  };

  const onAction = (a) => {
    if (!game || game.turn !== ME || game.phase === 'end') return;
    commit(applyAction(game, a));
  };

  const pointsLine = (
    <p className="gs-points">
      {t('gostop.points_now', { n: points.toLocaleString() })}
      <small>{t('gostop.points_rule', { per: POINT_PER_SCORE, start: START_POINTS.toLocaleString() })}</small>
    </p>
  );

  if (phase === 'setup' || !game) {
    return (
      <div className="gs-panel gs-setup">
        <h2>{t('gostop.setup.title')}</h2>
        {pointsLine}
        <div>
          <div className="gs-field-label">{t('gostop.setup.level')}</div>
          <div className="gs-choices">
            {LEVELS.map((key) => (
              <button key={key} type="button" className={`gs-choice${level === key ? ' is-active' : ''}`} onClick={() => setLevel(key)}>
                {t(`gostop.levels.${key}`)} <small>{t(`gostop.levels.${key}_desc`)}</small>
              </button>
            ))}
          </div>
        </div>
        {nextRef.current.carry > 1 && <p className="gs-hint">{t('gostop.carry_notice', { x: nextRef.current.carry })}</p>}
        <button type="button" className="gs-btn primary wide" onClick={start}>{t('gostop.actions.start')}</button>
      </div>
    );
  }

  let status;
  if (game.phase === 'end') status = t('gostop.status.ended');
  else if (game.turn === AI) status = t('gostop.status.ai_turn');
  else if (game.phase === 'choose') status = t('gostop.status.choose');
  else if (game.phase === 'goStop') status = t('gostop.status.gostop');
  else status = t('gostop.status.your_turn');

  return (
    <div className="gs-play">
      <div className="gs-topbar">
        {pointsLine}
        <div className="gs-actions">
          <button type="button" className="gs-btn" onClick={() => setSound((v) => !v)}>{t(sound ? 'gostop.actions.sound_off' : 'gostop.actions.sound_on')}</button>
          {game.phase === 'end' && !resultOpen && <button type="button" className="gs-btn" onClick={() => setResultOpen(true)}>{t('gostop.actions.show_result')}</button>}
          <button
            type="button"
            className="gs-btn"
            onClick={() => {
              if (game.phase !== 'end' && !window.confirm(t('gostop.confirm.quit'))) return;
              setPhase('setup');
            }}
          >
            {t('gostop.actions.quit')}
          </button>
        </div>
      </div>
      {game.carry > 1 && <p className="gs-hint">{t('gostop.carry_notice', { x: game.carry })}</p>}
      <GameTable
        view={game}
        me={ME}
        names={names}
        canAct={game.turn === ME}
        onAction={onAction}
        onGukjin={(value) => setGame((g) => applyAction(g, { type: 'gukjin', player: ME, value }))}
        banner={banner}
        status={status}
      >
        {game.phase === 'end' && outcome && resultOpen && (
          <Settlement result={outcome.result} names={names} delta={outcome.delta}>
            {outcome.refilled && <p className="gs-hint">{t('gostop.refilled', { n: START_POINTS.toLocaleString() })}</p>}
            <button type="button" className="gs-btn primary" onClick={start}>{t('gostop.actions.next_game')}</button>
            <button type="button" className="gs-btn" onClick={() => setResultOpen(false)}>{t('gostop.actions.view_board')}</button>
          </Settlement>
        )}
      </GameTable>
    </div>
  );
};

export default AiGame;
