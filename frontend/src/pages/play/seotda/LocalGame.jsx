import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { newHand, applyAction, legalActions, pendingSeats, nextHandArgs } from './engine.js';
import { aiAction } from './ai.js';
import { playSound } from '../janggi/sound.js';
import { TableView, ActionBar, OpenPicker, SelectPicker, ResultOverlay, HandLog, RankTable } from './parts.jsx';
import {
  UNIT, START_POINTS, REVEAL_GAP, fmt, handResult, myHandText, handHint, selectOptions, seatCards,
  resultTitleKey, resultLines, logLine,
} from './helpers.js';

const LEVEL_KEYS = ['easy', 'normal', 'hard'];
const MODE_KEYS = ['two', 'three'];
const POINTS_KEY = 'tn.seotda.points';
const AI_DELAY = 900;

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

/** AI 대전: 나(0번 자리) + 컴퓨터 1~3명, 2장·3장 섯다 */
const LocalGame = () => {
  const { t } = useTranslation();
  const [phase, setPhase] = useState('setup');
  const [mode, setMode] = useState('two');
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

  /** 새 판. args: newHand 인자 (재경기면 redo 포함) */
  const deal = (args) => {
    const refilled = [];
    let players = args.players;
    if (!args.redo) {
      players = players.map((p, i) => {
        if (i > 0 && p.chips < UNIT) {
          refilled.push(t('seotda.status.ai_refilled', { name: names[i] }));
          return { ...p, chips: START_POINTS };
        }
        return p;
      });
      if (players[0].chips < UNIT) return;
    }
    setNotes(refilled);
    if (!args.redo) setStartChips(players[0].chips);
    setSt(newHand({ ...args, players: players.map((p, i) => ({ ...p, name: names[i] })) }));
    setHandNo((n) => n + 1);
    setResultOpen(true);
    playSound('move', soundRef.current);
  };

  const start = () => {
    if (points < UNIT) return;
    const players = [{ id: 'me', chips: points }, ...Array.from({ length: aiCount }, (_, i) => ({ id: `ai${i + 1}`, chips: START_POINTS }))];
    setHandNo(0);
    setPhase('play');
    deal({ players, dealer: Math.floor(Math.random() * players.length), unit: UNIT, mode }); // 첫 판 선은 무작위
  };

  const nextHand = () => {
    if (st?.result) deal(nextHandArgs(st));
  };

  const refill = () => {
    setPoints(START_POINTS);
    savePoints(START_POINTS);
    if (st) setSt({ ...st, players: st.players.map((p, i) => (i === 0 ? { ...p, chips: START_POINTS } : p)) });
  };

  const act = (a) => setSt((s) => applyAction(s, 0, a));

  // 컴퓨터 차례 (베팅) 또는 컴퓨터가 고를 차례 (공개·패 고르기): 잠깐 뒤 행동
  useEffect(() => {
    if (!st || st.phase === 'done') return undefined;
    const seats = st.phase === 'bet' ? (st.turn !== 0 ? [st.turn] : []) : pendingSeats(st).filter((i) => i !== 0);
    if (seats.length === 0) return undefined;
    const tm = setTimeout(() => {
      setSt((s) => {
        let cur = s;
        for (const seat of seats) {
          const ok = cur.phase === 'bet' ? cur.turn === seat : pendingSeats(cur).includes(seat);
          if (ok) cur = applyAction(cur, seat, aiAction(cur, seat, level));
        }
        return cur;
      });
    }, st.phase === 'bet' ? AI_DELAY : 500);
    return () => clearTimeout(tm);
  }, [st, level]);

  // 포인트 저장 + 효과음
  const logLen = st?.log.length ?? 0;
  const done = st?.phase === 'done';
  useEffect(() => {
    if (!st) return;
    setPoints(st.players[0].chips);
    savePoints(st.players[0].chips);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logLen, done, handNo]);
  useEffect(() => {
    if (!st || logLen === 0) return undefined;
    if (!done) { playSound('move', soundRef.current); return undefined; }
    const key = resultTitleKey(st.result, 0);
    const tm = setTimeout(() => playSound(key === 'win' ? 'win' : key === 'lose' ? 'lose' : 'move', soundRef.current), st.result.reveal.length * REVEAL_GAP);
    return () => clearTimeout(tm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logLen, done]);

  if (phase === 'setup') {
    return (
      <div className="ch-layout">
        <div className="ch-panel ch-setup">
          <h3 className="ch-section-title" style={{ margin: 0 }}>{t('seotda.setup.ai_title')}</h3>
          <div>
            <div className="ch-field-label">{t('seotda.setup.mode')}</div>
            <div className="ch-choices">
              {MODE_KEYS.map((k) => (
                <button key={k} type="button" className={`ch-choice${mode === k ? ' is-active' : ''}`} onClick={() => setMode(k)}>
                  {t(`seotda.modes.${k}`)} <small>{t(`seotda.mode_desc.${k}`)}</small>
                </button>
              ))}
            </div>
          </div>
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
          <p className="ch-hint" style={{ margin: 0 }}>{t('seotda.setup.ante', { n: UNIT })} · {t('seotda.setup.points_desc')}</p>
          {points < UNIT && <p className="sd-warn">{t('seotda.status.broke')}</p>}
          <div className="ch-actions">
            {points < UNIT && <button type="button" className="ch-btn" onClick={refill}>{t('seotda.actions.refill')}</button>}
            <button type="button" className="ch-btn primary" disabled={points < UNIT} onClick={start}>{t('seotda.actions.start')}</button>
          </div>
        </div>
        <RankTable />
      </div>
    );
  }

  if (!st) return null;
  const res = st.result;
  const revealOrder = res ? res.reveal : [];
  const me = st.players[0];
  const myPending = pendingSeats(st).includes(0);

  const seats = st.players.map((p, i) => {
    const revealIndex = revealOrder.indexOf(i);
    const shown = i === 0 || revealIndex >= 0;
    const hand = res?.hands?.[i];
    return {
      key: p.id,
      name: names[i],
      chips: p.chips,
      inHand: p.inHand,
      folded: p.folded,
      last: p.last,
      isTurn: st.phase === 'bet' && st.turn === i,
      choosing: (st.phase === 'open' || st.phase === 'select') && pendingSeats(st).includes(i),
      isDealer: st.dealer === i,
      cards: seatCards({
        cards: shown ? p.cards : null,
        count: p.cards.length,
        openCard: p.open != null ? p.cards[p.open] : null,
        openIndex: p.open,
        pick: res && p.pick ? p.pick : null,
        revealed: revealIndex >= 0,
        mine: i === 0,
        tag: t('seotda.opened'),
      }),
      revealIndex,
      handText: hand && revealIndex >= 0 ? handResult(t, hand, res.type === 'redo') : i === 0 ? myHandText(t, p.cards, p.pick) : '',
      win: !!res && res.winners.includes(i),
      payout: res?.payouts?.[i] || 0,
    };
  });

  const acts = st.phase === 'bet' && st.turn === 0 ? legalActions(st, 0) : [];
  let status = '';
  if (st.phase === 'bet') status = st.turn === 0 ? t('seotda.status.your_turn') : t('seotda.status.thinking', { name: names[st.turn] });
  else if (st.phase === 'open') status = myPending ? t('seotda.status.choose_open') : t('seotda.status.waiting_choice');
  else if (st.phase === 'select') status = myPending ? t('seotda.status.choose_pick') : t('seotda.status.waiting_choice');
  else if (!me.inHand) status = t('seotda.status.sitting_out');

  const view = { mode: st.mode, redo: st.redo, phase: st.phase, round: st.round, pot: st.pot, cap: st.cap, handNo, seats };
  const title = res ? t(`seotda.result.${resultTitleKey(res, 0) || 'redo'}`) : '';
  const lines = res ? resultLines(t, res, res.hands, names, res.carry) : [];
  const change = res && res.type !== 'redo' ? me.chips - startChips : null;
  const broke = done && res.type !== 'redo' && me.chips < UNIT;
  const resultDelay = revealOrder.length * REVEAL_GAP + 300;
  const nextBtn = broke
    ? <button type="button" className="ch-btn" onClick={refill}>{t('seotda.actions.refill')}</button>
    : <button type="button" className="ch-btn primary" onClick={nextHand}>{t(res?.type === 'redo' ? 'seotda.actions.redo' : 'seotda.actions.next')}</button>;

  const logLines = [
    t(st.redo ? 'seotda.log.redo_deal' : 'seotda.log.deal', { n: handNo, name: names[st.dealer], pot: fmt(st.pot - st.log.reduce((s, e) => s + (e.pay || 0), 0)) }),
    ...notes,
    ...st.log.map((e) => logLine(t, e, names)),
  ];

  return (
    <div className="ch-layout sd-layout">
      <div>
        <TableView view={view} mySeat={0} status={status}>
          {done && resultOpen && (
            <ResultOverlay title={title} lines={lines} change={change} delay={resultDelay} onClose={() => setResultOpen(false)}>
              {nextBtn}
            </ResultOverlay>
          )}
        </TableView>
        {st.phase === 'bet' && me.inHand && !me.folded && <ActionBar acts={acts} onAct={act} />}
        {st.phase === 'bet' && me.inHand && !me.folded && <p className="sd-hint-line">{handHint(t, me.cards)}</p>}
        {st.phase === 'open' && myPending && <OpenPicker cards={me.cards} onPick={(card) => act({ type: 'open', card })} />}
        {st.phase === 'select' && myPending && <SelectPicker options={selectOptions(t, me.cards)} onPick={(pick) => act({ type: 'select', pick })} />}
        {done && !resultOpen && <div className="ch-actions sd-after">{nextBtn}</div>}
      </div>
      <div className="ch-side">
        <div className="ch-panel">
          <div className="sd-points-row">
            <span>{t('seotda.my_points')}</span>
            <strong>{fmt(me.chips)}P</strong>
          </div>
          <div className="ch-actions" style={{ marginTop: 12 }}>
            <button type="button" className="ch-btn" disabled={!done || res.type === 'redo'} onClick={() => { setPhase('setup'); setSt(null); }}>{t('seotda.actions.setup')}</button>
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
