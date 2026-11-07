import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Client } from '@stomp/stompjs';
import { playSound } from '../janggi/sound.js';
import { TableView, ActionBar, OpenPicker, SelectPicker, ResultOverlay, HandLog, RankTable } from './parts.jsx';
import {
  REVEAL_GAP, handResult, myHandText, handHint, selectOptions, seatCards, resultTitleKey, resultLines,
  resolveRevealed, onlineActions, logLine,
} from './helpers.js';
import { useAuth } from '../../../context/AuthContext';
import { fetchWithAccessRaw } from '../../../util/fetchUtil';

const wsUrl = () => `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws-chat/websocket`;

/* ── 로비 ── */
const Lobby = ({ onEnter }) => {
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

  const create = async (e) => {
    e.preventDefault();
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
    <div className="ch-layout">
      <div className="ch-panel">
        <h3 className="ch-section-title">{t('seotda.lobby.rooms', { count: rooms.length })}</h3>
        {rooms.length === 0 ? (
          <p className="ch-empty">{t('seotda.lobby.empty')}</p>
        ) : (
          <div className="ch-room-list">
            {rooms.map((r) => (
              <div key={r.roomId} className="ch-room">
                <div style={{ minWidth: 0 }}>
                  <div className="ch-room-title">{r.title}</div>
                  <div className="ch-room-meta">
                    {t(`seotda.modes.${r.mode}`)} · {t('seotda.lobby.players', { n: r.players.length })} · {t(`seotda.lobby.status.${r.status}`)}
                  </div>
                </div>
                <button type="button" className="ch-btn" onClick={() => onEnter(r.roomId)}>
                  {r.status !== 'PLAYING' && r.players.length < 4 ? t('seotda.actions.enter') : t('seotda.actions.watch')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <form className="ch-panel ch-setup" onSubmit={create}>
        <h3 className="ch-section-title" style={{ margin: 0 }}>{t('seotda.lobby.create_title')}</h3>
        <input className="ch-input" placeholder={t('seotda.lobby.title_ph')} value={title} maxLength={40} onChange={(e) => setTitle(e.target.value)} />
        <div className="ch-choices">
          {['two', 'three'].map((k) => (
            <button key={k} type="button" className={`ch-choice${mode === k ? ' is-active' : ''}`} onClick={() => setMode(k)}>
              {t(`seotda.modes.${k}`)} <small>{t(`seotda.mode_desc.${k}`)}</small>
            </button>
          ))}
        </div>
        <p className="ch-hint" style={{ margin: 0 }}>{t('seotda.lobby.room_points')}</p>
        <button type="submit" className="ch-btn primary" disabled={creating}>{t('seotda.actions.create')}</button>
      </form>
    </div>
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
const Room = ({ roomId, me, onExit }) => {
  const { t } = useTranslation();
  const [room, setRoom] = useState(null);
  const [mine, setMine] = useState({ handNo: 0, cards: null });
  const [chat, setChat] = useState([]);
  const [input, setInput] = useState('');
  const [toast, setToast] = useState(null);
  const [resultOpen, setResultOpen] = useState(true);
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
      setResultOpen(true);
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

  const send = (action) => {
    const c = clientRef.current;
    if (!c?.connected) { showToast(t('seotda.error.connecting')); return; }
    c.publish({ destination: `/app/seotda/room/${roomId}/action`, body: JSON.stringify(action) });
  };

  if (!room) return <p className="ch-empty">{t('seotda.entering')}</p>;

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

  const seats = room.seats.map((s, i) => {
    const revealIndex = revealOrder.indexOf(i);
    const known = s.cards || (i === mySeat ? myCards : null);
    const hand = resolved?.hands[i];
    const myOpenIndex = i === mySeat && known && s.openCard != null ? known.indexOf(s.openCard) : null;
    return {
      key: s.nick,
      name: names[i],
      chips: s.chips,
      inHand: s.inHand,
      folded: s.folded,
      last: s.last,
      isTurn: playing && room.phase === 'bet' && room.turn === i,
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
      handText: hand && revealIndex >= 0 ? handResult(t, hand, res.type === 'redo') : i === mySeat && myCards ? myHandText(t, myCards, null) : '',
      win: !!res && res.winners.includes(i),
      payout: res?.payouts?.[i] || 0,
    };
  });

  const acts = playing && room.phase === 'bet' && room.turn === mySeat ? onlineActions(room, mySeat) : [];
  const timer = remaining != null ? ` (${remaining}s)` : '';
  let status;
  if (playing && room.phase === 'bet') {
    const who = room.turn === mySeat ? t('seotda.status.your_turn') : t('seotda.status.turn', { name: names[room.turn] });
    status = `${mySeat < 0 ? `${t('seotda.status.spectating')} · ` : ''}${who}${timer}`;
  } else if (playing) {
    status = `${myPending ? t(room.phase === 'open' ? 'seotda.status.choose_open' : 'seotda.status.choose_pick') : t('seotda.status.waiting_choice')}${timer}`;
  } else if (room.seats.length < 2) status = t('seotda.status.waiting_players');
  else status = t(isHost ? 'seotda.status.ready_host' : 'seotda.status.waiting_host');

  let title = '';
  let lines = [];
  if (res) {
    const key = resultTitleKey(res, meSeat?.inHand ? mySeat : -1);
    title = key ? t(`seotda.result.${key}`) : t('seotda.result.winner', { name: names[res.winners[0]], hand: '' });
    lines = resultLines(t, res, resolved?.hands || {}, names, res.carry);
  }
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
  const dealBtn = canDeal && <button type="button" className="ch-btn primary" onClick={() => send({ type: 'START' })}>{t(dealLabel)}</button>;
  const view = { mode: room.mode, redo: room.redo, phase: playing ? room.phase : null, round: room.round, pot: room.pot, cap: room.cap, handNo: room.handNo, seats };
  const canBet = playing && room.phase === 'bet' && meSeat?.inHand && !meSeat.folded;

  return (
    <>
      <div className="ch-layout sd-layout">
        <div>
          <TableView view={view} mySeat={mySeat} status={status}>
            {res && resultOpen && (
              <ResultOverlay title={title} lines={lines} change={change} delay={revealOrder.length * REVEAL_GAP + 300} onClose={() => setResultOpen(false)}>
                {dealBtn}
              </ResultOverlay>
            )}
          </TableView>
          {canBet && <ActionBar acts={acts} onAct={(bet) => send({ type: 'BET', bet })} />}
          {canBet && myCards && <p className="sd-hint-line">{handHint(t, myCards)}</p>}
          {myPending && room.phase === 'open' && myCards && <OpenPicker cards={myCards} onPick={(card) => send({ type: 'OPEN', card })} />}
          {myPending && room.phase === 'select' && myCards?.length === 3 && <SelectPicker options={selectOptions(t, myCards)} onPick={(pick) => send({ type: 'SELECT', pick })} />}
        </div>

        <div className="ch-side">
          <div className="ch-panel">
            <h3 className="ch-section-title">{room.title}</h3>
            <p className="ch-status">{t(`seotda.modes.${room.mode}`)} · {t('seotda.lobby.players', { n: room.seats.length })}</p>
            <div className="ch-actions" style={{ marginTop: 12 }}>
              {dealBtn}
              <button type="button" className="ch-btn" onClick={leave}>{t('seotda.actions.leave')}</button>
            </div>
          </div>

          <div className="ch-panel ch-chat">
            <h3 className="ch-section-title" style={{ margin: 0 }}>{t('seotda.chat.title')}</h3>
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
      </div>
      {toast && <div className="ch-toast" role="alert">{toast}</div>}
    </>
  );
};

/** 온라인: 로그인 필요(체스와 같음), ?room= 으로 방 유지 */
const OnlineSeotda = () => {
  const { t } = useTranslation();
  const { isLoggedIn, user, loading } = useAuth();
  const [params, setParams] = useSearchParams();
  const roomId = params.get('room');

  const enter = useCallback((id) => setParams({ mode: 'online', room: id }), [setParams]);
  const exit = useCallback(() => setParams({ mode: 'online' }), [setParams]);

  if (loading) return <p className="ch-empty">{t('seotda.loading')}</p>;
  if (!isLoggedIn) {
    return (
      <div className="ch-panel" style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
        <p>{t('seotda.login_needed')}</p>
        <Link className="ch-btn primary" to={`/login?redirect=${encodeURIComponent('/play/seotda?mode=online')}`} style={{ display: 'inline-block', textDecoration: 'none' }}>{t('seotda.actions.login')}</Link>
      </div>
    );
  }
  if (!user) return <p className="ch-empty">{t('seotda.loading')}</p>;
  return roomId ? <Room roomId={roomId} me={user.nickname} onExit={exit} /> : <Lobby onEnter={enter} />;
};

export default OnlineSeotda;
