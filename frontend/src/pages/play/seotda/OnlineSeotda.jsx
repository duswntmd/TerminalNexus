import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Client } from '@stomp/stompjs';
import { playSound } from '../janggi/sound.js';
import { Table, BetBar, OpenPicker, SelectPicker, ResultBar, HandLog, RankTable } from './parts.jsx';
import {
  REVEAL_GAP, fmt, handResult, myHandText, handHint, selectOptions, seatCards, resultLines,
  resultBanner, resolveRevealed, onlineActions, logLine,
} from './helpers.js';
import { useAuth } from '../../../context/AuthContext';
import { fetchWithAccessRaw } from '../../../util/fetchUtil';

const wsUrl = () => `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws-chat/websocket`;
const EMPTY_VIEW = { seats: [], pot: 0, handNo: 0 };

/** 판 모양 틀: 위 줄(제목·탭), 판, 아래 줄 */
const Stage = ({ topbar, right, children, bar }) => (
  <section className="sd-stage">
    <div className="sd-topbar">{topbar}<div className="sd-topbar-right">{right}</div></div>
    {children}
    <div className="sd-bar">{bar}</div>
  </section>
);

/* ── 로비 ── */
const Lobby = ({ topbar, onEnter }) => {
  const { t } = useTranslation();
  const [rooms, setRooms] = useState([]);
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState('two');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const res = await fetchWithAccessRaw('/api/seotda/rooms');
    if (res.ok) setRooms(await res.json());
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 3000);
    return () => clearInterval(timer);
  }, [load]);

  const create = async () => {
    setCreating(true);
    const res = await fetchWithAccessRaw('/api/seotda/room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, mode }),
    });
    setCreating(false);
    if (res.ok) onEnter((await res.json()).roomId);
  };

  return (
    <Stage
      topbar={topbar}
      bar={(
        <div className="sd-bar-actions">
          <button type="button" className="sd-bigbtn is-primary" disabled={creating} onClick={create}>{t('seotda.actions.create')}</button>
        </div>
      )}
    >
      <Table view={EMPTY_VIEW} mySeat={-1}>
        <div className="sd-setup sd-lobby">
          <h2>{t('seotda.lobby.rooms', { count: rooms.length })}</h2>
          {rooms.length === 0 ? (
            <p className="sd-setup-desc">{t('seotda.lobby.empty')}</p>
          ) : (
            <div className="sd-room-list">
              {rooms.map((r) => (
                <button key={r.roomId} type="button" className="sd-room" onClick={() => onEnter(r.roomId)}>
                  <b>{r.title}</b>
                  <span>{t(`seotda.modes.${r.mode}`)} · {t('seotda.lobby.players', { n: r.players.length })} · {t(`seotda.lobby.status.${r.status}`)}</span>
                  <em>{r.status !== 'PLAYING' && r.players.length < 4 ? t('seotda.actions.enter') : t('seotda.actions.watch')}</em>
                </button>
              ))}
            </div>
          )}
          <h2 style={{ marginTop: 14 }}>{t('seotda.lobby.create_title')}</h2>
          <input className="ch-input" placeholder={t('seotda.lobby.title_ph')} value={title} maxLength={40} onChange={(e) => setTitle(e.target.value)} />
          <div className="sd-setup-row">
            <span>{t('seotda.setup.mode')}</span>
            <div className="sd-seg">
              {['two', 'three'].map((k) => (
                <button key={k} type="button" className={mode === k ? 'is-active' : ''} onClick={() => setMode(k)}>{t(`seotda.modes.${k}`)}</button>
              ))}
            </div>
          </div>
          <p className="sd-setup-desc">{t('seotda.lobby.room_points')}</p>
        </div>
      </Table>
    </Stage>
  );
};

/** 남은 제한 시간 (초) */
const useCountdown = (endsAt) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!endsAt) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [endsAt]);
  return endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : null;
};

/* ── 방 ── */
const Room = ({ topbar, roomId, me, onExit }) => {
  const { t } = useTranslation();
  const [room, setRoom] = useState(null);
  const [mine, setMine] = useState({ handNo: 0, cards: null });
  const [chat, setChat] = useState([]);
  const [input, setInput] = useState('');
  const [toast, setToast] = useState(null);
  const [startChips, setStartChips] = useState({ handNo: 0, chips: 0 });
  const clientRef = useRef(null);
  const prevRef = useRef(null);
  const chatRef = useRef(null);
  const exitRef = useRef(onExit);
  exitRef.current = onExit;
  const tRef = useRef(t);
  tRef.current = t;

  const showToast = (text) => {
    setToast(text);
    setTimeout(() => setToast(null), 2500);
  };
  const errorText = (code) => tRef.current(`seotda.error.${code}`, { defaultValue: tRef.current('seotda.error.generic') });

  const applyState = useCallback((st) => {
    const prev = prevRef.current;
    prevRef.current = st;
    setRoom(st);
    if (st.myCards) setMine({ handNo: st.handNo, cards: st.myCards });
    if (prev && prev.status !== 'FINISHED' && st.status === 'FINISHED') {
      setTimeout(() => playSound('win'), (st.result?.reveal?.length || 0) * REVEAL_GAP);
    } else if (prev && (st.log.length !== prev.log.length || st.handNo !== prev.handNo)) playSound('move');
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await fetchWithAccessRaw(`/api/seotda/room/${roomId}/join`, { method: 'POST' });
      if (!alive) return;
      if (!res.ok) {
        showToast(errorText('room_not_found'));
        exitRef.current();
        return;
      }
      applyState(await res.json());

      const client = new Client({ brokerURL: wsUrl(), reconnectDelay: 3000, debug: () => {} });
      client.beforeConnect = () => {
        const token = localStorage.getItem('accessToken');
        client.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {};
      };
      client.onConnect = async () => {
        client.subscribe(`/topic/seotda/room/${roomId}`, (m) => {
          const ev = JSON.parse(m.body);
          if (ev.type === 'STATE') applyState(ev.state);
          else if (ev.type === 'CHAT') setChat((c) => [...c.slice(-99), { sender: ev.sender, text: ev.text }]);
          else if (ev.type === 'CLOSED') { showToast(tRef.current(`seotda.closed.${ev.text}`)); exitRef.current(); }
        });
        client.subscribe('/user/queue/seotda', (m) => {
          const ev = JSON.parse(m.body);
          if (ev.type === 'ERROR') showToast(errorText(ev.text));
          else if (ev.type === 'HAND' && ev.text === roomId) setMine({ handNo: ev.handNo, cards: ev.cards });
        });
        // 재연결 시 놓친 상태와 내 패 동기화
        const r = await fetchWithAccessRaw(`/api/seotda/room/${roomId}`);
        if (r.ok) applyState(await r.json());
      };
      client.activate();
      clientRef.current = client;
    })();
    return () => {
      alive = false;
      clientRef.current?.deactivate();
    };
  }, [roomId, applyState]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chat]);

  // 판이 시작될 때 내 포인트(학교 내기 전)를 기억해 결과에서 증감을 보여 준다
  const mySeatNow = room ? room.seats.findIndex((s) => s.nick === me) : -1;
  useEffect(() => {
    if (!room || mySeatNow < 0 || room.status !== 'PLAYING' || room.redo || startChips.handNo === room.handNo) return;
    const s = room.seats[mySeatNow];
    setStartChips({ handNo: room.handNo, chips: s.chips + s.contrib }); // 낸 돈을 되돌리면 판 시작 때 포인트
  }, [room, mySeatNow, startChips.handNo]);

  const remaining = useCountdown(room?.status === 'PLAYING' ? room.turnEndsAt : 0);
  const bets = useMemo(() => (room?.log || []).filter((e) => e.pay > 0), [room]);

  const send = (action) => {
    const c = clientRef.current;
    if (!c?.connected) { showToast(t('seotda.error.connecting')); return; }
    c.publish({ destination: `/app/seotda/room/${roomId}/action`, body: JSON.stringify(action) });
  };

  if (!room) {
    return <Stage topbar={topbar} bar={<div className="sd-statusline">{t('seotda.entering')}</div>}><Table view={EMPTY_VIEW} mySeat={-1} /></Stage>;
  }

  const mySeat = mySeatNow;
  const isHost = room.host === me;
  const playing = room.status === 'PLAYING';
  const res = room.status === 'FINISHED' ? room.result : null;
  const names = room.seats.map((s) => `${s.nick}${s.nick === room.host ? ' 👑' : ''}`);
  const meSeat = mySeat >= 0 ? room.seats[mySeat] : null;
  const myCards = meSeat?.inHand && mine.handNo === room.handNo ? mine.cards : null;
  const resolved = res ? resolveRevealed(room) : null;
  const revealOrder = res?.reveal || [];
  const pending = room.pending || [];
  const myPending = playing && mySeat >= 0 && pending.includes(mySeat);
  const n = room.seats.length;

  const seats = room.seats.map((s, i) => {
    const revealIndex = revealOrder.indexOf(i);
    const known = s.cards || (i === mySeat ? myCards : null);
    const hand = resolved?.hands[i];
    const myOpenIndex = i === mySeat && known && s.openCard != null ? known.indexOf(s.openCard) : null;
    const isTurn = playing && room.phase === 'bet' && room.turn === i;
    return {
      key: s.nick,
      index: i,
      dealOrder: (i - room.dealer + n) % n,
      name: names[i],
      chips: s.chips,
      inHand: s.inHand,
      folded: s.folded,
      last: s.last,
      isTurn,
      timer: isTurn || (playing && pending.includes(i)) ? remaining : null,
      choosing: playing && pending.includes(i),
      isDealer: s.inHand && room.dealer === i,
      cards: seatCards({
        cards: known,
        count: s.cardCount,
        openCard: s.openCard,
        openIndex: myOpenIndex,
        pick: res ? s.pick : null,
        revealed: revealIndex >= 0,
        mine: i === mySeat,
        tag: t('seotda.opened'),
      }),
      revealIndex,
      handText: hand && revealIndex >= 0 ? handResult(t, hand, res.type === 'redo') : i === mySeat && myCards && !res ? myHandText(t, myCards, null) : '',
      win: !!res && res.winners.includes(i),
      payout: res?.payouts?.[i] || 0,
    };
  });

  const myTurn = playing && room.phase === 'bet' && room.turn === mySeat;
  const acts = myTurn ? onlineActions(room, mySeat) : [];
  let status = '';
  if (playing && room.phase === 'bet') {
    status = myTurn ? t('seotda.status.your_turn') : t('seotda.status.turn', { name: names[room.turn] });
    if (mySeat < 0) status = `${t('seotda.status.spectating')} · ${status}`;
  } else if (playing) {
    status = myPending ? '' : t('seotda.status.waiting_choice');
  } else if (!res) {
    status = room.seats.length < 2 ? t('seotda.status.waiting_players') : t(isHost ? 'seotda.status.ready_host' : 'seotda.status.waiting_host');
  }

  const resultDelay = revealOrder.length * REVEAL_GAP + 400;
  const lines = res ? resultLines(t, res, resolved?.hands || {}, names, res.carry) : [];
  const banner = res ? { key: room.handNo, ...resultBanner(t, res, resolved?.hands || {}, names, meSeat?.inHand ? mySeat : -1), delay: resultDelay - 250 } : null;
  // 재경기 판은 처음 판의 시작 포인트와 비교
  const change = res && res.type !== 'redo' && meSeat?.inHand && startChips.handNo > 0 && (startChips.handNo === room.handNo || room.redo)
    ? meSeat.chips - startChips.chips : null;

  const leave = () => {
    if (playing && meSeat?.inHand && !window.confirm(t('seotda.confirm.leave'))) return;
    send({ type: 'LEAVE' });
    onExit();
  };

  const canDeal = isHost && !playing && room.seats.length >= 2;
  const dealLabel = room.nextIsRedo ? 'seotda.actions.redo' : res ? 'seotda.actions.next' : 'seotda.actions.deal';
  const dealBtn = canDeal && <button type="button" className="sd-bigbtn is-primary" onClick={() => send({ type: 'START' })}>{t(dealLabel)}</button>;
  const leaveBtn = <button type="button" className="sd-bigbtn" onClick={leave}>{t('seotda.actions.leave')}</button>;
  const view = { mode: room.mode, redo: room.redo, pot: room.pot, handNo: room.handNo, seats };
  const phaseText = playing
    ? `${t(`seotda.modes.${room.mode}`)}${room.redo ? ` · ${t('seotda.redo_hand')}` : ''} · ${t(`seotda.phase.${room.phase === 'bet' ? `bet${room.round}` : room.phase}`)}`
    : t(`seotda.modes.${room.mode}`);
  const canBet = playing && room.phase === 'bet' && meSeat?.inHand && !meSeat.folded;
  const info = { phase: phaseText, toCall: canBet ? room.level - meSeat.contrib : null };

  let bar;
  if (res) {
    bar = <ResultBar lines={lines} change={change} delay={resultDelay}>{dealBtn}{leaveBtn}</ResultBar>;
  } else if (myPending && room.phase === 'open' && myCards) {
    bar = <OpenPicker cards={myCards} onPick={(card) => send({ type: 'OPEN', card })} />;
  } else if (myPending && room.phase === 'select' && myCards?.length === 3) {
    bar = <SelectPicker options={selectOptions(t, myCards)} onPick={(pick) => send({ type: 'SELECT', pick })} />;
  } else if (canBet || (playing && meSeat?.inHand)) {
    bar = <BetBar acts={acts} onAct={(bet) => send({ type: 'BET', bet })} disabled={!myTurn} />;
  } else {
    bar = <div className="sd-bar-actions">{dealBtn}{leaveBtn}</div>;
  }
  const hint = canBet && myCards ? handHint(t, myCards) : '';

  return (
    <>
      <Stage
        topbar={topbar}
        right={<>{meSeat && <span className="sd-mypoints">{fmt(meSeat.chips)}P</span>}<button type="button" className="sd-iconbtn" onClick={leave} aria-label={t('seotda.actions.leave')}>⎋</button></>}
        bar={<><div className="sd-statusline" aria-live="polite">{status || hint || ' '}</div>{bar}</>}
      >
        <Table view={view} mySeat={mySeat} info={info} banner={banner} bets={bets} payouts={res ? res.payouts : null} payDelay={resultDelay - 200} />
      </Stage>

      <div className="sd-below sd-below-grid">
        <div className="ch-panel ch-chat">
          <h3 className="ch-section-title" style={{ margin: 0 }}>{room.title} · {t('seotda.chat.title')}</h3>
          <div className="ch-chat-log" ref={chatRef}>
            {chat.length === 0 ? <p className="ch-empty" style={{ padding: 0 }}>{t('seotda.chat.empty')}</p>
              : chat.map((c, i) => <p key={i}><b>{c.sender}</b> {c.text}</p>)}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); if (input.trim()) { send({ type: 'CHAT', text: input }); setInput(''); } }}>
            <input className="ch-input" value={input} maxLength={200} onChange={(e) => setInput(e.target.value)} placeholder={t('seotda.chat.ph')} />
            <button type="submit" className="ch-btn">{t('seotda.actions.send')}</button>
          </form>
        </div>
        <HandLog lines={(room.log || []).map((e) => logLine(t, e, names))} />
        <RankTable />
      </div>
      {toast && <div className="ch-toast" role="alert">{toast}</div>}
    </>
  );
};

/** 온라인: 로그인 필요(체스와 같음), ?room= 으로 방 유지 */
const OnlineSeotda = ({ topbar }) => {
  const { t } = useTranslation();
  const { isLoggedIn, user, loading } = useAuth();
  const [params, setParams] = useSearchParams();
  const roomId = params.get('room');

  const enter = useCallback((id) => setParams({ mode: 'online', room: id }), [setParams]);
  const exit = useCallback(() => setParams({ mode: 'online' }), [setParams]);

  if (loading || (isLoggedIn && !user)) {
    return <Stage topbar={topbar} bar={<div className="sd-statusline">{t('seotda.loading')}</div>}><Table view={EMPTY_VIEW} mySeat={-1} /></Stage>;
  }
  if (!isLoggedIn) {
    return (
      <Stage
        topbar={topbar}
        bar={(
          <div className="sd-bar-actions">
            <Link className="sd-bigbtn is-primary" to={`/login?redirect=${encodeURIComponent('/play/seotda?mode=online')}`}>{t('seotda.actions.login')}</Link>
          </div>
        )}
      >
        <Table view={EMPTY_VIEW} mySeat={-1}>
          <div className="sd-setup"><p className="sd-setup-desc">{t('seotda.login_needed')}</p></div>
        </Table>
      </Stage>
    );
  }
  return roomId ? <Room topbar={topbar} roomId={roomId} me={user.nickname} onExit={exit} /> : <Lobby topbar={topbar} onEnter={enter} />;
};

export default OnlineSeotda;
