import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Client } from '@stomp/stompjs';
import GameTable from './GameTable.jsx';
import { Settlement } from './parts.jsx';
import { bannerFromEvents } from './helpers.js';
import { playSound } from '../janggi/sound.js';
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
    const res = await fetchWithAccessRaw('/api/gostop/rooms');
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
    const res = await fetchWithAccessRaw('/api/gostop/room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    setCreating(false);
    if (res.ok) onEnter((await res.json()).roomId);
  };

  return (
    <div className="gs-lobby">
      <div className="gs-panel">
        <h3 className="gs-section-title">{t('gostop.lobby.rooms', { count: rooms.length })}</h3>
        {rooms.length === 0 ? <p className="gs-empty">{t('gostop.lobby.empty')}</p> : (
          <ul className="gs-room-list">
            {rooms.map((r) => (
              <li key={r.roomId} className="gs-room">
                <div className="gs-room-info">
                  <div className="gs-room-title">{r.title}</div>
                  <div className="gs-room-sub">
                    {r.players.map((p) => p || t('gostop.lobby.empty_seat')).join(' vs ')} · {t(`gostop.lobby.status.${r.status}`)}
                  </div>
                </div>
                <button type="button" className="gs-btn" disabled={r.playerCount >= 2} onClick={() => onEnter(r.roomId)}>
                  {r.playerCount >= 2 ? t('gostop.lobby.full') : t('gostop.actions.enter')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <form className="gs-panel gs-setup" onSubmit={create}>
        <h3 className="gs-section-title">{t('gostop.lobby.create_title')}</h3>
        <input className="gs-input" placeholder={t('gostop.lobby.title_ph')} value={title} maxLength={40} onChange={(e) => setTitle(e.target.value)} />
        <p className="gs-hint">{t('gostop.lobby.no_watch')}</p>
        <button type="submit" className="gs-btn primary" disabled={creating}>{t('gostop.actions.create')}</button>
      </form>
    </div>
  );
};

/* ── 대국 방 ── */
const Room = ({ roomId, onExit }) => {
  const { t } = useTranslation();
  const [room, setRoom] = useState(null);
  const [chat, setChat] = useState([]);
  const [input, setInput] = useState('');
  const [toast, setToast] = useState(null);
  const [banner, setBanner] = useState(null);
  const [resultOpen, setResultOpen] = useState(true);
  const clientRef = useRef(null);
  const sigRef = useRef('');
  const exitRef = useRef(onExit);
  exitRef.current = onExit;
  const tRef = useRef(t);
  tRef.current = t;

  const showToast = (text) => {
    setToast(text);
    setTimeout(() => setToast(null), 2500);
  };
  const errorText = (code) => tRef.current(`gostop.error.${code}`, { defaultValue: tRef.current('gostop.error.generic') });

  // 새 상태: 판이 진행됐을 때만 알림·효과음
  const applyState = useCallback((st) => {
    setRoom(st);
    const g = st.game;
    if (!g) return;
    const sig = `${g.turnNo}-${g.phase}-${g.goCount.join('')}-${st.status}`;
    if (sig === sigRef.current) return;
    const first = sigRef.current === '';
    sigRef.current = sig;
    if (first) return;
    const b = bannerFromEvents(g.events, tRef.current, st.players, st.seat);
    if (b) setBanner(b);
    if (st.status === 'FINISHED') {
      setResultOpen(true);
      const w = st.settlement?.winner;
      playSound(w == null ? 'move' : w === st.seat ? 'win' : 'lose');
    } else playSound(g.last?.took?.length ? 'capture' : 'move');
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await fetchWithAccessRaw(`/api/gostop/room/${roomId}/join`, { method: 'POST' });
      if (!alive) return;
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        showToast(errorText(body.message || 'room_not_found'));
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
        client.subscribe(`/topic/gostop/room/${roomId}`, (m) => {
          const ev = JSON.parse(m.body);
          if (ev.type === 'CHAT') setChat((c) => [...c.slice(-99), { sender: ev.sender, text: ev.text }]);
          else if (ev.type === 'CLOSED') { showToast(tRef.current(`gostop.closed.${ev.text}`)); exitRef.current(); }
        });
        // 판 상태는 내 시점으로 가려진 것만 따로 받는다
        client.subscribe('/user/queue/gostop', (m) => {
          const ev = JSON.parse(m.body);
          if (ev.roomId !== roomId) return;
          if (ev.type === 'STATE') applyState(ev.state);
          else if (ev.type === 'ERROR') showToast(errorText(ev.text));
        });
        const r = await fetchWithAccessRaw(`/api/gostop/room/${roomId}`);
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

  const send = (action) => {
    const c = clientRef.current;
    if (!c?.connected) { showToast(t('gostop.error.connecting')); return; }
    c.publish({ destination: `/app/gostop/room/${roomId}/action`, body: JSON.stringify(action) });
  };
  const sendAct = (a) => send({ type: 'ACT', act: a.type, card: a.card, shake: a.shake, month: a.month, value: a.value });

  if (!room) return <p className="gs-empty">{t('gostop.entering')}</p>;

  const seat = room.seat;
  const isHost = room.host === room.players[seat];
  const names = room.players.map((p) => p || t('gostop.lobby.empty_seat'));
  const g = room.game;
  const playing = room.status === 'PLAYING';

  const leave = () => {
    if (playing && !window.confirm(t('gostop.confirm.leave'))) return;
    send({ type: 'LEAVE' });
    onExit();
  };

  let status;
  if (room.status === 'WAITING') {
    status = room.players[1] ? t(isHost ? 'gostop.status.ready_host' : 'gostop.status.waiting_host') : t('gostop.status.waiting_opponent');
  } else if (playing && g) {
    if (g.turn !== seat) status = t('gostop.status.opp_turn');
    else if (g.phase === 'choose') status = t('gostop.status.choose');
    else if (g.phase === 'goStop') status = t('gostop.status.gostop');
    else status = t('gostop.status.your_turn');
  } else status = t('gostop.status.ended');

  const startBtn = isHost && room.status !== 'PLAYING' && (
    <button type="button" className="gs-btn primary" disabled={!room.players[1]} onClick={() => send({ type: 'START' })}>
      {t(room.status === 'FINISHED' ? 'gostop.actions.next_game' : 'gostop.actions.start')}
    </button>
  );

  return (
    <div className="gs-play">
      <div className="gs-panel">
        <div className="gs-topbar">
          <h3 className="gs-section-title" style={{ margin: 0 }}>{room.title}</h3>
          <div className="gs-actions">
            {startBtn}
            {room.status === 'FINISHED' && !resultOpen && <button type="button" className="gs-btn" onClick={() => setResultOpen(true)}>{t('gostop.actions.show_result')}</button>}
            <button type="button" className="gs-btn" onClick={leave}>{t('gostop.actions.leave')}</button>
          </div>
        </div>
        <div className="gs-scoreboard" style={{ marginTop: 8 }}>
          <span>{t('gostop.online.totals')}</span>
          {names.map((n, i) => <span key={i}><b>{n}</b> {t('gostop.points_unit', { n: room.totals[i] })}</span>)}
          {room.carry > 1 && <span>{t('gostop.carry_notice', { x: room.carry })}</span>}
        </div>
        {!g && <p className="gs-hint" style={{ marginTop: 8 }}>{status}</p>}
      </div>

      {g && (
        <GameTable
          view={g}
          me={seat}
          names={names}
          canAct={playing}
          onAction={sendAct}
          onGukjin={(value) => sendAct({ type: 'gukjin', value })}
          banner={banner}
          status={status}
        >
          {room.status === 'FINISHED' && room.settlement && resultOpen && (
            <Settlement result={room.settlement} names={names}>
              {startBtn}
              {!isHost && <p className="gs-hint">{t('gostop.status.waiting_host')}</p>}
              <button type="button" className="gs-btn" onClick={() => setResultOpen(false)}>{t('gostop.actions.view_board')}</button>
            </Settlement>
          )}
        </GameTable>
      )}

      <div className="gs-panel">
        <h3 className="gs-section-title">{t('gostop.chat.title')}</h3>
        <ul className="gs-chat-log">
          {chat.length === 0 ? <li className="gs-empty">{t('gostop.chat.empty')}</li>
            : chat.map((c, i) => <li key={i}><b>{c.sender}</b>{c.text}</li>)}
        </ul>
        <form className="gs-chat-form" onSubmit={(e) => { e.preventDefault(); if (input.trim()) { send({ type: 'CHAT', text: input }); setInput(''); } }}>
          <input className="gs-input" value={input} maxLength={200} onChange={(e) => setInput(e.target.value)} placeholder={t('gostop.chat.ph')} />
          <button type="submit" className="gs-btn">{t('gostop.actions.send')}</button>
        </form>
      </div>
      {toast && <div className="gs-toast" role="alert">{toast}</div>}
    </div>
  );
};

/** 온라인 맞고: 로그인 필요, ?room= 으로 방 유지 */
const OnlineGostop = () => {
  const { t } = useTranslation();
  const { isLoggedIn, user, loading } = useAuth();
  const [params, setParams] = useSearchParams();
  const roomId = params.get('room');
  const enter = useCallback((id) => setParams({ mode: 'online', room: id }), [setParams]);
  const exit = useCallback(() => setParams({ mode: 'online' }), [setParams]);

  if (loading) return <p className="gs-empty">{t('gostop.loading')}</p>;
  if (!isLoggedIn) {
    return (
      <div className="gs-panel" style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
        <p>{t('gostop.login_needed')}</p>
        <Link className="gs-btn primary" to={`/login?redirect=${encodeURIComponent('/play/gostop?mode=online')}`} style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>{t('gostop.actions.login')}</Link>
      </div>
    );
  }
  if (!user) return <p className="gs-empty">{t('gostop.loading')}</p>;
  return roomId ? <Room roomId={roomId} onExit={exit} /> : <Lobby onEnter={enter} />;
};

export default OnlineGostop;
