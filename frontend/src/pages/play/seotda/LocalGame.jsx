import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { newHand, applyAction, legalActions, classify } from './engine.js';
import { decide } from './ai.js';
import { playSound } from '../janggi/sound.js';
import { TableView, ActionBar, ResultOverlay, HandLog, RankTable } from './parts.jsx';
import { ANTE, START_POINTS, fmt, handName, handResult, handHint, resultTitleKey, logLine } from './helpers.js';

const LEVEL_KEYS = ['easy', 'normal', 'hard'];
const POINTS_KEY = 'tn.seotda.points';
const AI_DELAY = 800;

// 포인트는 이 브라우저에만 저장 (저장소를 못 쓰면 이번 방문 동안만 유지)
const loadPoints = () => {
  try {
    const raw = localStorage.getItem(POINTS_KEY);
    const v = Number(raw);
    return raw !== null && Number.isFinite(v) && v >= 0 ? Math.floor(v) : START_POINTS;
  } catch {
    return START_POINTS;
  }
};
const savePoints = (v) => {
  try {
    localStorage.setItem(POINTS_KEY, String(v));
  } catch {
    // 저장하지 못해도 게임은 계속
  }
};

/** AI 대전: 나(0번 자리) + 컴퓨터 1~3명 */
const LocalGame = () => {
  const { t } = useTranslation();
  const [phase, setPhase] = useState('setup');
  const [aiCount, setAiCount] = useState(2);
  const [level, setLevel] = useState('normal');
  const [points, setPoints] = useState(loadPoints);
  const [st, setSt] = useState(null);
  const [handNo, setHandNo] = useState(0);
  const [startChips, setStartChips] = useState(0);
  const [notes, setNotes] = useState([]);
  const [resultOpen, setResultOpen] = useState(true);
  const [sound, setSound] = useState(true);
  const soundRef = useRef(sound);
  soundRef.current = sound;

  const names = useMemo(() => [t('seotda.you'), ...Array.from({ length: 3 }, (_, i) => t('seotda.ai_name', { n: i + 1 }))], [t]);

  /** 새 판 시작. players: [{ id, chips }] (0번이 나) */
  const deal = (players, dealer, carry) => {
    const refilled = [];
    const ps = players.map((p, i) => {
      if (i > 0 && p.chips < ANTE) {
        refilled.push(t('seotda.status.ai_refilled', { name: names[i] }));
        return { ...p, chips: START_POINTS };
      }
      return p;
    });
    if (ps[0].chips < ANTE) return false;
    const next = newHand({ players: ps.map((p, i) => ({ id: p.id, name: names[i], chips: p.chips })), dealer, ante: ANTE, carry });
    setNotes(refilled);
    setStartChips(ps[0].chips);
    setSt(next);
    setHandNo((n) => n + 1);
    setResultOpen(true);
    playSound('move', soundRef.current);
    return true;
  };

  const start = () => {
    if (points < ANTE) return;
    const players = [{ id: 'me', chips: points }, ...Array.from({ length: aiCount }, (_, i) => ({ id: `ai${i + 1}`, chips: START_POINTS }))];
    setHandNo(0);
    setPhase('play');
    deal(players, Math.floor(Math.random() * players.length), 0);
  };

  const nextHand = () => {
    if (!st?.result) return;
    deal(st.players.map((p) => ({ id: p.id, chips: p.chips })), st.result.nextDealer, st.result.carry);
  };

  const refill = () => {
    setPoints(START_POINTS);
    savePoints(START_POINTS);
    if (st) setSt({ ...st, players: st.players.map((p, i) => (i === 0 ? { ...p, chips: START_POINTS } : p)) });
  };

  // 컴퓨터 차례: 잠깐 생각하는 척하고 행동 (자기 패와 공개된 베팅만 봄)
  useEffect(() => {
    if (!st || st.phase !== 'betting' || st.turn === 0) return undefined;
    const tm = setTimeout(() => {
      setSt((s) => (s && s.phase === 'betting' && s.turn !== 0 ? applyAction(s, s.turn, decide(s, s.turn, level)) : s));
    }, AI_DELAY);
    return () => clearTimeout(tm);
  }, [st, level]);

  // 포인트 저장 + 효과음
  const logLen = st?.log.length ?? 0;
  const done = st?.phase === 'done';
  useEffect(() => {
    if (!st) return;
    setPoints(st.players[0].chips);
    savePoints(st.players[0].chips);
    // st 전체가 아니라 기록 길이와 끝남 여부가 바뀔 때만 반응
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logLen, done, handNo]);
  useEffect(() => {
    if (!st || logLen === 0) return;
    if (done) {
      const key = resultTitleKey(st.result, 0);
      playSound(key === 'win' ? 'win' : key === 'lose' ? 'lose' : 'move', soundRef.current);
    } else playSound('move', soundRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logLen, done]);

  if (phase === 'setup') {
    return (
      <div className="ch-layout">
        <div className="ch-panel ch-setup">
          <h3 className="ch-section-title" style={{ margin: 0 }}>{t('seotda.setup.ai_title')}</h3>
          <div>
            <div className="ch-field-label">{t('seotda.setup.ai_count')}</div>
            <div className="ch-choices">
              {[1, 2, 3].map((n) => (
                <button key={n} type="button" className={`ch-choice${aiCount === n ? ' is-active' : ''}`} onClick={() => setAiCount(n)}>
                  {t('seotda.setup.ai_count_n', { n })}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="ch-field-label">{t('seotda.setup.level')}</div>
            <div className="ch-choices">
              {LEVEL_KEYS.map((k) => (
                <button key={k} type="button" className={`ch-choice${level === k ? ' is-active' : ''}`} onClick={() => setLevel(k)}>
                  {t(`seotda.levels.${k}`)} <small>{t(`seotda.levels.${k}_desc`)}</small>
                </button>
              ))}
            </div>
          </div>
          <div className="sd-points-row">
            <span>{t('seotda.my_points')}</span>
            <strong>{fmt(points)}P</strong>
          </div>
          <p className="ch-hint" style={{ margin: 0 }}>{t('seotda.setup.ante', { n: ANTE })} · {t('seotda.setup.points_desc')}</p>
          {points < ANTE && <p className="sd-warn">{t('seotda.status.broke')}</p>}
          <div className="ch-actions">
            {points < ANTE && <button type="button" className="ch-btn" onClick={refill}>{t('seotda.actions.refill')}</button>}
            <button type="button" className="ch-btn primary" disabled={points < ANTE} onClick={start}>{t('seotda.actions.start')}</button>
          </div>
        </div>
        <RankTable />
      </div>
    );
  }

  if (!st) return null;
  const res = st.result;
  const reveal = new Set(res?.reveal || []);
  const myHand = classify(st.players[0].cards[0], st.players[0].cards[1]);

  const seats = st.players.map((p, i) => {
    const shownHand = res?.hands?.[i];
    const open = i === 0 || reveal.has(i);
    return {
      key: p.id,
      order: (i - st.dealer + st.players.length) % st.players.length,
      name: names[i],
      chips: p.chips,
      inHand: true,
      cards: open ? p.cards : null, // 공개 전 다른 자리의 패는 화면에 넣지 않음
      open,
      folded: p.folded,
      last: p.last,
      isTurn: st.phase === 'betting' && st.turn === i,
      isDealer: st.dealer === i,
      win: !!res && res.winners.includes(i),
      payout: res?.payouts?.[i] || 0,
      handText: shownHand && reveal.has(i) ? handResult(t, shownHand, res.type === 'redo') : i === 0 ? handName(t, myHand) : '',
      hint: i === 0 && !res ? handHint(t, myHand) : '',
    };
  });

  const acts = st.phase === 'betting' && st.turn === 0 ? legalActions(st, 0) : [];
  let status = '';
  if (st.phase === 'betting') status = st.turn === 0 ? t('seotda.status.your_turn') : t('seotda.status.thinking', { name: names[st.turn] });

  let title = '';
  let lines = [];
  if (res) {
    title = t(`seotda.result.${resultTitleKey(res, 0)}`);
    if (res.type === 'fold') lines = [t('seotda.result.fold_desc', { name: names[res.winners[0]] })];
    else if (res.type === 'redo') {
      lines = [t('seotda.result.redo_desc', { name: names[res.redoSeat], hand: handName(t, res.hands[res.redoSeat]), pot: fmt(res.carry) })];
    } else {
      lines = res.winners.map((w) => t('seotda.result.winner', { name: names[w] }) + ` · ${handResult(t, res.hands[w])}`);
    }
  }
  const change = st.players[0].chips - startChips;
  const broke = done && st.players[0].chips < ANTE;

  const logLines = [
    t('seotda.log.deal', { n: handNo, name: names[st.dealer], pot: fmt(st.carry + ANTE * st.players.length) }),
    ...notes,
    ...st.log.map((e) => logLine(t, e, names)),
  ];

  return (
    <div className="ch-layout sd-layout">
      <div>
        <TableView seats={seats} mySeat={0} pot={st.pot} carry={st.carry} cap={st.cap} dealKey={handNo} status={status}>
          {done && resultOpen && (
            <ResultOverlay title={title} lines={lines} change={change} onClose={() => setResultOpen(false)}>
              {broke
                ? <button type="button" className="ch-btn" onClick={refill}>{t('seotda.actions.refill')}</button>
                : <button type="button" className="ch-btn primary" onClick={nextHand}>{t('seotda.actions.next')}</button>}
            </ResultOverlay>
          )}
        </TableView>
        {st.phase === 'betting' && <ActionBar acts={acts} onAct={(type) => setSt((s) => applyAction(s, 0, type))} />}
        {done && !resultOpen && (
          <div className="ch-actions sd-after">
            {broke
              ? <button type="button" className="ch-btn" onClick={refill}>{t('seotda.actions.refill')}</button>
              : <button type="button" className="ch-btn primary" onClick={nextHand}>{t('seotda.actions.next')}</button>}
          </div>
        )}
      </div>
      <div className="ch-side">
        <div className="ch-panel">
          <div className="sd-points-row">
            <span>{t('seotda.my_points')}</span>
            <strong>{fmt(st.players[0].chips)}P</strong>
          </div>
          <div className="ch-actions" style={{ marginTop: 12 }}>
            <button type="button" className="ch-btn" disabled={st.phase === 'betting'} onClick={() => { setPhase('setup'); setSt(null); }}>{t('seotda.actions.setup')}</button>
            <button type="button" className="ch-btn" onClick={() => setSound((s) => !s)}>{t(sound ? 'seotda.actions.sound_off' : 'seotda.actions.sound_on')}</button>
          </div>
        </div>
        <HandLog lines={logLines} />
        <RankTable />
      </div>
    </div>
  );
};

export default LocalGame;
