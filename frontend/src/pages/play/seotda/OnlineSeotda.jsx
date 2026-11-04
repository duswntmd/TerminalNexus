import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Client } from '@stomp/stompjs';
import { classify, resolve } from './engine.js';
import { playSound } from '../janggi/sound.js';
import { TableView, ActionBar, ResultOverlay, HandLog, RankTable } from './parts.jsx';
import { fmt, handName, handResult, handHint, resultTitleKey, onlineActions, logLine } from './helpers.js';
import { useAuth } from '../../../context/AuthContext';
import { fetchWithAccessRaw } from '../../../util/fetchUtil';

const wsUrl = () => `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws-chat/websocket`;

/* ── 로비 ── */
const Lobby = ({ onEnter }) => {
  const { t } = useTranslation();
  const [rooms, setRooms] = useState([]);
  const [title, setTitle] = useState('');
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
      body: JSON.stringify({ title }),
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
                    {t('seotda.lobby.players', { n: r.players.length })} · {r.players.join(', ')} · {t(`seotda.lobby.status.${r.status}`)}
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
        <p className="ch-hint" style={{ margin: 0 }}>{t('seotda.lobby.room_points')}</p>
        <button type="submit" className="ch-btn primary" disabled={creating}>{t('seotda.actions.create')}</button>
      </form>
    </div>
  );
};

/** 남은 차례 시간 (초) */
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
      playSound('win');
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

  const remaining = useCountdown(room?.status === 'PLAYING' ? room.turnEndsAt : 0);

  const send = (action) => {
    const c = clientRef.current;
    if (!c?.connected) { showToast(t('seotda.error.connecting')); return; }
    c.publish({ destination: `/app/seotda/room/${roomId}/action`, body: JSON.stringify(action) });
  };

  if (!room) return <p className="ch-empty">{t('seotda.entering')}</p>;

  const mySeat = room.seats.findIndex((s) => s.nick === me);
  const isHost = room.host === me;
  const playing = room.status === 'PLAYING';
  const res = room.status === 'FINISHED' ? room.result : null;
  const names = room.seats.map((s) => `${s.nick}${s.nick === room.host ? ' 👑' : ''}`);
  const myCards = mySeat >= 0 && room.seats[mySeat]?.inHand && mine.handNo === room.handNo ? mine.cards : null;

  // 공개된 패로 화면에서도 승부를 다시 계산 (서버와 같은 규칙)
  const revealed = res ? (res.reveal || []).filter((i) => room.seats[i]?.cards) : [];
  const resolved = revealed.length >= 2 ? resolve(revealed.map((i) => ({ seat: i, cards: room.seats[i].cards }))) : null;

  const seats = room.seats.map((s, i) => {
    const cards = s.cards || (i === mySeat ? myCards : null);
    const hand = resolved?.hands[i];
    const myHand = i === mySeat && myCards ? classify(myCards[0], myCards[1]) : null;
    return {
      key: s.nick,
      order: (i - room.dealer + room.seats.length) % room.seats.length,
      name: names[i],
      chips: s.chips,
      inHand: s.inHand,
      cards,
      open: !!cards,
      folded: s.folded,
      last: s.last,
      isTurn: playing && room.turn === i,
      isDealer: s.inHand && room.dealer === i,
      win: !!res && res.winners.includes(i),
      payout: res?.payouts?.[i] || 0,
      handText: hand ? handResult(t, hand, res.type === 'redo') : myHand ? handName(t, myHand) : '',
      hint: myHand && !res ? handHint(t, myHand) : '',
    };
  });

  const acts = playing && room.turn === mySeat ? onlineActions(room, mySeat) : [];
  let status;
  if (playing) {
    const who = room.turn === mySeat ? t('seotda.status.your_turn') : t('seotda.status.turn', { name: names[room.turn] });
    status = `${mySeat < 0 ? `${t('seotda.status.spectating')} · ` : ''}${who}${remaining != null ? ` (${remaining}s)` : ''}`;
  } else if (room.seats.length < 2) status = t('seotda.status.waiting_players');
  else status = t(isHost ? 'seotda.status.ready_host' : 'seotda.status.waiting_host');

  let title = '';
  let lines = [];
  if (res) {
    const key = resultTitleKey(res, mySeat);
    title = key ? t(`seotda.result.${key}`) : res.winners.map((w) => t('seotda.result.winner', { name: names[w] })).join(', ');
    if (res.type === 'fold') lines = [t('seotda.result.fold_desc', { name: names[res.winners[0]] })];
    else if (res.type === 'redo' && resolved) {
      lines = [t('seotda.result.redo_desc', { name: names[res.redoSeat], hand: handName(t, resolved.hands[res.redoSeat]), pot: fmt(room.carry) })];
    } else if (resolved) {
      lines = res.winners.map((w) => `${t('seotda.result.winner', { name: names[w] })} · ${handResult(t, resolved.hands[w])}`);
    }
  }
  const myContrib = mySeat >= 0 && room.seats[mySeat].inHand ? room.seats[mySeat].contrib : 0;
  const change = res && mySeat >= 0 && room.seats[mySeat].inHand ? (res.payouts?.[mySeat] || 0) - myContrib : null;

  const leave = () => {
    if (playing && mySeat >= 0 && room.seats[mySeat].inHand && !window.confirm(t('seotda.confirm.leave'))) return;
    send({ type: 'LEAVE' });
    onExit();
  };

  const canDeal = isHost && !playing && room.seats.length >= 2;
  const dealBtn = canDeal && <button type="button" className="ch-btn primary" onClick={() => send({ type: 'START' })}>{t(res ? 'seotda.actions.next' : 'seotda.actions.deal')}</button>;

  return (
    <>
      <div className="ch-layout sd-layout">
        <div>
          <TableView seats={seats} mySeat={mySeat} pot={room.pot} carry={room.carry} cap={playing ? room.cap : 0} dealKey={room.handNo} status={status}>
            {res && resultOpen && (
              <ResultOverlay title={title} lines={lines} change={change} onClose={() => setResultOpen(false)}>
                {dealBtn}
              </ResultOverlay>
            )}
          </TableView>
          {playing && mySeat >= 0 && room.seats[mySeat].inHand && <ActionBar acts={acts} onAct={(bet) => send({ type: 'BET', bet })} />}
        </div>

        <div className="ch-side">
          <div className="ch-panel">
            <h3 className="ch-section-title">{room.title}</h3>
            <p className="ch-status">{t('seotda.lobby.players', { n: room.seats.length })}</p>
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

          <HandLog lines={room.log.map((e) => logLine(t, e, names))} />
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
