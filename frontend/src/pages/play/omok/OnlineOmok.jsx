import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Client } from '@stomp/stompjs';
import { BLACK, WHITE, RULES, enemyOf, replay, finishWith } from './engine.js';
import { playSound } from './sound.js';
import GameScreen from './GameScreen.jsx';
import { OptionButtons, ResultOverlay, Toast } from './parts.jsx';
import { useOptions, useToast, useBoardInput, formatClock, colorKey, colorFromName, resultSide } from './helpers.js';
import { useAuth } from '../../../context/AuthContext';
import { fetchWithAccessRaw } from '../../../util/fetchUtil';

const wsUrl = () => `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws-chat/websocket`;
const TURN_SECONDS = [15, 30, 60];

/* ── 로비 ── */
const Lobby = ({ onEnter, topbar }) => {
  const { t } = useTranslation();
  const [opts, toggle] = useOptions();
  const [rooms, setRooms] = useState([]);
  const [title, setTitle] = useState('');
  const [side, setSide] = useState('BLACK');
  const [rule, setRule] = useState('renju');
  const [turnSeconds, setTurnSeconds] = useState(30);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const res = await fetchWithAccessRaw('/api/omok/rooms');
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
    const res = await fetchWithAccessRaw('/api/omok/room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, side, rule, turnSeconds }),
    });
    setCreating(false);
    if (res.ok) onEnter((await res.json()).roomId);
  };

  const seat = (nick) => nick || t('omok.lobby.empty_seat');

  return (
    <div className="om-stage">
      <div className="om-topbar">
        {topbar}
        <div className="om-topbar-right"><OptionButtons opts={opts} toggle={toggle} /></div>
      </div>
      <div className="om-lobby">
        <div className="om-panel">
          <h2 className="om-panel-title">{t('omok.lobby.rooms', { count: rooms.length })}</h2>
          {rooms.length === 0 ? <p className="om-empty">{t('omok.lobby.empty')}</p> : (
            <div className="om-room-list">
              {rooms.map((r) => (
                <div key={r.roomId} className="om-room">
                  <div className="om-room-text">
                    <div className="om-room-title">{r.title}</div>
                    <div className="om-room-meta">
                      <span className="om-rule-chip">{t(`omok.rule.${r.rule}`)}</span>
                      {t('omok.lobby.seconds', { count: r.turnSeconds })} · {t(`omok.lobby.status.${r.status}`)}
                    </div>
                    <div className="om-room-meta">
                      <span className="om-dot black small" aria-hidden="true" /> {seat(r.black)}
                      <span className="om-dot white small" aria-hidden="true" style={{ marginLeft: 10 }} /> {seat(r.white)}
                    </div>
                  </div>
                  <button type="button" className="om-btn" onClick={() => onEnter(r.roomId)}>
                    {r.status === 'WAITING' && r.playerCount < 2 ? t('omok.actions.enter') : t('omok.actions.watch')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <form className="om-panel om-create" onSubmit={create}>
          <h2 className="om-panel-title">{t('omok.lobby.create_title')}</h2>
          <input className="om-input" placeholder={t('omok.lobby.title_ph')} value={title} maxLength={40} onChange={(e) => setTitle(e.target.value)} />
          <div>
            <div className="om-label">{t('omok.setup.rule')}</div>
            <div className="om-choices">
              {RULES.map((r) => (
                <button key={r} type="button" className={`om-choice${rule === r ? ' is-active' : ''}`} aria-pressed={rule === r} onClick={() => setRule(r)}>
                  {t(`omok.rule.${r}`)}<small>{t(`omok.rule.${r}_desc`)}</small>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="om-label">{t('omok.setup.my_color')}</div>
            <div className="om-choices three">
              {['BLACK', 'WHITE', 'RANDOM'].map((s) => (
                <button key={s} type="button" className={`om-choice${side === s ? ' is-active' : ''}`} aria-pressed={side === s} onClick={() => setSide(s)}>
                  <span className="om-choice-title">{s !== 'RANDOM' && <span className={`om-dot ${s.toLowerCase()} small`} aria-hidden="true" />}{t(`omok.setup.${s.toLowerCase()}`)}</span>
                  <small>{t(`omok.setup.${s.toLowerCase()}_desc`)}</small>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="om-label">{t('omok.lobby.turn_time')}</div>
            <div className="om-choices three">
              {TURN_SECONDS.map((s) => (
                <button key={s} type="button" className={`om-choice center${turnSeconds === s ? ' is-active' : ''}`} aria-pressed={turnSeconds === s} onClick={() => setTurnSeconds(s)}>
                  {t('omok.lobby.seconds', { count: s })}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" className="om-btn primary big" disabled={creating}>{t('omok.actions.create')}</button>
        </form>
      </div>
    </div>
  );
};

/* ── 대국 방 ── */
const Room = ({ roomId, me, onExit, topbar }) => {
  const { t } = useTranslation();
  const [opts, toggle] = useOptions();
  const [toast, showToast] = useToast();
  const [room, setRoom] = useState(null);
  const [chat, setChat] = useState([]);
  const [input, setInput] = useState('');
  const [resultOpen, setResultOpen] = useState(true);
  const [viewPly, setViewPly] = useState(null);
  const [now, setNow] = useState(Date.now());
  const clientRef = useRef(null);
  const prevRef = useRef(null);
  const offsetRef = useRef(0); // 서버 시각 - 내 시각
  const chatRef = useRef(null);
  const exitRef = useRef(onExit);
  exitRef.current = onExit;
  const tRef = useRef(t);
  tRef.current = t;
  const soundRef = useRef(opts.sound);
  soundRef.current = opts.sound;
  const toastRef = useRef(showToast);
  toastRef.current = showToast;
  const meRef = useRef(me);
  meRef.current = me;
  const tickRef = useRef(null);

  const errorText = (code) => {
    if (code?.startsWith('forbidden_')) return tRef.current(`omok.forbidden.${code.slice(10)}`);
    return tRef.current(`omok.error.${code}`, { defaultValue: tRef.current('omok.error.generic') });
  };

  // 상태 수신 시 효과음·알림
  const applyState = useCallback((st) => {
    const prev = prevRef.current;
    prevRef.current = st;
    offsetRef.current = st.serverTime - Date.now();
    setRoom(st);
    setNow(Date.now());
    if (!prev) return;
    const sound = soundRef.current;
    const mine = st.black === meRef.current ? 'BLACK' : st.white === meRef.current ? 'WHITE' : null;
    if (st.gameNo !== prev.gameNo || (prev.status === 'WAITING' && st.status === 'PLAYING')) {
      setViewPly(null);
      setResultOpen(true);
      playSound('start', sound);
      return;
    }
    if (st.moves.length > prev.moves.length) playSound(st.moves.length % 2 === 1 ? 'black' : 'white', sound);
    else if (st.moves.length < prev.moves.length && st.status === 'PLAYING') toastRef.current(tRef.current('omok.undo.done'));
    if (prev.status !== 'FINISHED' && st.status === 'FINISHED') {
      setResultOpen(true);
      setViewPly(null);
      const kind = st.winner == null ? 'draw' : (mine == null || st.winner === mine) ? 'win' : 'lose';
      setTimeout(() => playSound(kind, soundRef.current), 320);
    }
    if (prev.undoRequest && !st.undoRequest && st.status === 'PLAYING' && st.moves.length === prev.moves.length && prev.undoRequest === mine) {
      toastRef.current(tRef.current('omok.undo.declined'));
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await fetchWithAccessRaw(`/api/omok/room/${roomId}/join`, { method: 'POST' });
      if (!alive) return;
      if (!res.ok) {
        toastRef.current(tRef.current('omok.error.room_not_found'));
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
        client.subscribe(`/topic/omok/room/${roomId}`, (m) => {
          const ev = JSON.parse(m.body);
          if (ev.type === 'STATE') applyState(ev.state);
          else if (ev.type === 'CHAT') setChat((c) => [...c.slice(-99), { sender: ev.sender, text: ev.text }]);
          else if (ev.type === 'CLOSED') { toastRef.current(tRef.current(`omok.closed.${ev.text}`)); exitRef.current(); }
        });
        client.subscribe('/user/queue/omok', (m) => {
          const ev = JSON.parse(m.body);
          if (ev.type === 'ERROR') { playSound('error', soundRef.current); toastRef.current(errorText(ev.text)); }
        });
        // 재연결 시 놓친 상태 동기화
        const r = await fetchWithAccessRaw(`/api/omok/room/${roomId}`);
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

  const send = useCallback((action) => {
    const c = clientRef.current;
    if (!c?.connected) { toastRef.current(tRef.current('omok.error.connecting')); return; }
    c.publish({ destination: `/app/omok/room/${roomId}/action`, body: JSON.stringify(action) });
  }, [roomId]);

  // 서버가 보낸 수순으로 판을 재구성 (결과는 서버 판정을 따름)
  const game = useMemo(() => {
    if (!room) return null;
    const g = replay(room.rule, room.moves);
    if (room.status !== 'FINISHED') return g.status === 'PLAYING' ? g : { ...g, status: 'PLAYING' };
    return finishWith(g, colorFromName(room.winner), room.reason, room.winLine);
  }, [room]);

  const playing = room?.status === 'PLAYING';
  const mySide = room ? (room.black === me ? BLACK : room.white === me ? WHITE : null) : null;
  const turnColor = room ? colorFromName(room.turn) : null;
  const myTurn = playing && mySide != null && turnColor === mySide;

  // 남은 시간 시계
  useEffect(() => {
    if (!playing) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [playing]);
  const remain = playing && room.turnEndsAt ? Math.max(0, (room.turnEndsAt - (now + offsetRef.current)) / 1000) : null;
  const remainSec = remain == null ? null : Math.ceil(remain);
  useEffect(() => {
    // 내 차례의 마지막 5초는 초읽기 소리
    if (myTurn && remainSec != null && remainSec <= 5 && remainSec > 0 && tickRef.current !== remainSec) {
      tickRef.current = remainSec;
      playSound('tick', soundRef.current);
    }
  }, [myTurn, remainSec]);

  const place = useCallback((idx) => send({ type: 'MOVE', cell: idx }), [send]);
  const boardInput = useBoardInput({ game, canPlay: myTurn, opts, place, showToast });

  const total = game ? game.moves.length : 0;
  const finished = room?.status === 'FINISHED';
  const ply = finished && viewPly != null ? Math.min(viewPly, total) : total;
  const go = useCallback((n) => setViewPly(Math.max(0, n)), []);

  if (!room || !game) {
    return (
      <div className="om-stage">
        <div className="om-topbar">{topbar}</div>
        <p className="om-empty">{t('omok.entering')}</p>
        <Toast toast={toast} />
      </div>
    );
  }

  const isHost = room.host === me;
  const colorLabel = (c) => t(`omok.${colorKey(c)}`);
  const nickOf = (c) => (c === BLACK ? room.black : room.white);
  const bottomColor = mySide ?? BLACK;
  const topColor = enemyOf(bottomColor);
  const card = (c) => {
    const active = playing && turnColor === c;
    return {
      color: c,
      name: nickOf(c) || t('omok.lobby.empty_seat'),
      tag: nickOf(c) && nickOf(c) === room.host ? '👑' : null,
      sub: `${colorLabel(c)}${c === mySide ? ` · ${t('omok.you')}` : ''}`,
      active,
      clock: active ? formatClock(remainSec) : formatClock(room.turnSeconds),
      low: active && remainSec <= 5,
      progress: active ? remain / room.turnSeconds : null,
    };
  };

  let statusText;
  if (room.status === 'WAITING') {
    statusText = room.black && room.white
      ? t(isHost ? 'omok.status.ready_host' : 'omok.status.waiting_host')
      : t('omok.status.waiting_opponent');
  } else if (playing) {
    statusText = mySide == null
      ? t('omok.status.spectating', { color: colorLabel(turnColor) })
      : t(myTurn ? 'omok.status.your_turn' : 'omok.status.opp_turn');
  } else statusText = ply !== total ? t('omok.status.reviewing', { ply, total }) : t('omok.status.finished');

  const winner = colorFromName(room.winner);
  let resultTitle = t('omok.result.draw');
  let kind = 'draw';
  if (winner != null) {
    kind = mySide == null || winner === mySide ? 'win' : 'lose';
    resultTitle = mySide == null ? t(`omok.result.${colorKey(winner)}_wins`) : t(winner === mySide ? 'omok.result.win' : 'omok.result.lose');
  }
  const resultReason = room.reason ? t(`omok.reason.${room.reason}`, { count: total }) : '';

  const undoFrom = colorFromName(room.undoRequest);
  const myMoves = mySide === BLACK ? Math.ceil(total / 2) : Math.floor(total / 2);
  const rematchMine = mySide != null && room.rematch?.includes(mySide === BLACK ? 'BLACK' : 'WHITE');
  const rematchOther = mySide != null && room.rematch?.includes(mySide === BLACK ? 'WHITE' : 'BLACK');
  const bothSeated = room.black && room.white;

  const leave = () => {
    if (playing && mySide != null && !window.confirm(t('omok.confirm.leave'))) return;
    send({ type: 'LEAVE' });
    onExit();
  };

  const rematchButton = mySide != null && bothSeated && (
    <button type="button" className="om-btn primary" disabled={rematchMine} onClick={() => send({ type: 'REMATCH' })}>
      {rematchMine ? t('omok.rematch.waiting') : rematchOther ? t('omok.rematch.accept') : t('omok.actions.rematch')}
    </button>
  );

  return (
    <GameScreen
      topbar={topbar}
      opts={opts}
      toggle={toggle}
      toast={toast}
      top={card(topColor)}
      bottom={card(bottomColor)}
      board={{
        moves: ply === total ? game.moves : game.moves.slice(0, ply),
        forbidden: boardInput.forbidden,
        turnColor: myTurn ? mySide : null,
        selected: boardInput.selected,
        winLine: finished && ply === total ? game.winLine : null,
        onPick: boardInput.pick,
      }}
      status={(
        <p className="om-status">
          <span className="om-rule-chip">{t(`omok.rule.${room.rule}`)}</span>
          {statusText}
        </p>
      )}
      notice={(
        <>
          <p className="om-room-name">{room.title} · {t('omok.lobby.seconds', { count: room.turnSeconds })}</p>
          {myTurn && Object.keys(boardInput.forbidden).length > 0 && <p className="om-hint">{t('omok.forbidden_hint')}</p>}
          {playing && undoFrom != null && mySide != null && (
            undoFrom === mySide
              ? <p className="om-hint">{t('omok.undo.requested_by_me')}</p>
              : (
                <div className="om-offer">
                  <span>{t('omok.undo.requested_by_opp')}</span>
                  <button type="button" className="om-btn primary" onClick={() => send({ type: 'UNDO_ACCEPT' })}>{t('omok.actions.accept')}</button>
                  <button type="button" className="om-btn" onClick={() => send({ type: 'UNDO_DECLINE' })}>{t('omok.actions.decline')}</button>
                </div>
              )
          )}
          {finished && rematchOther && !rematchMine && <p className="om-hint">{t('omok.rematch.offered')}</p>}
        </>
      )}
      overlay={finished && resultOpen && (
        <ResultOverlay kind={kind} title={resultTitle} reason={resultReason} at={resultSide(game.winLine)}>
          {rematchButton}
          <button type="button" className="om-btn" onClick={() => setResultOpen(false)}>{t('omok.actions.review')}</button>
        </ResultOverlay>
      )}
      actions={(
        <>
          {opts.confirm && playing && mySide != null && (
            <button type="button" className="om-btn primary wide" disabled={boardInput.selected == null} onClick={boardInput.confirm}>{t('omok.actions.place')}</button>
          )}
          {room.status === 'WAITING' && isHost && (
            <button type="button" className="om-btn primary" disabled={!bothSeated} onClick={() => send({ type: 'START' })}>{t('omok.actions.start')}</button>
          )}
          {finished && rematchButton}
          {playing && mySide != null && (
            <>
              <button type="button" className="om-btn" disabled={undoFrom != null || myMoves === 0} onClick={() => send({ type: 'UNDO_REQUEST' })}>{t('omok.actions.undo_request')}</button>
              <button type="button" className="om-btn danger" onClick={() => window.confirm(t('omok.confirm.resign')) && send({ type: 'RESIGN' })}>{t('omok.actions.resign')}</button>
            </>
          )}
          <button type="button" className="om-btn" onClick={leave}>{t('omok.actions.leave')}</button>
        </>
      )}
      review={finished ? { ply, total, onGo: (n) => go(Math.min(total, n)) } : null}
      moves={{ moves: game.moves, current: ply, onJump: finished ? go : null }}
      extra={(
        <div className="om-chat">
          <div className="om-moves-head">{t('omok.chat.title')}</div>
          <div className="om-chat-log" ref={chatRef}>
            {chat.length === 0 ? <p className="om-empty">{t('omok.chat.empty')}</p>
              : chat.map((c, i) => <p key={i}><b>{c.sender}</b> {c.text}</p>)}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); if (input.trim()) { send({ type: 'CHAT', text: input }); setInput(''); } }}>
            <input className="om-input" value={input} maxLength={200} onChange={(e) => setInput(e.target.value)} placeholder={t('omok.chat.ph')} />
            <button type="submit" className="om-btn">{t('omok.actions.send')}</button>
          </form>
        </div>
      )}
    />
  );
};

/** 온라인 대국: 로그인 필요(체스와 같음), ?room= 으로 방 유지 */
const OnlineOmok = ({ topbar }) => {
  const { t } = useTranslation();
  const { isLoggedIn, user, loading } = useAuth();
  const [params, setParams] = useSearchParams();
  const roomId = params.get('room');

  const enter = useCallback((id) => setParams({ mode: 'online', room: id }), [setParams]);
  const exit = useCallback(() => setParams({ mode: 'online' }), [setParams]);

  if (loading || (isLoggedIn && !user)) {
    return <div className="om-stage"><div className="om-topbar">{topbar}</div><p className="om-empty">{t('omok.loading')}</p></div>;
  }
  if (!isLoggedIn) {
    return (
      <div className="om-stage">
        <div className="om-topbar">{topbar}</div>
        <div className="om-setup-wrap">
          <div className="om-setup center">
            <p>{t('omok.login_needed')}</p>
            <Link className="om-btn primary big" to={`/login?redirect=${encodeURIComponent('/play/omok?mode=online')}`}>{t('omok.actions.login')}</Link>
          </div>
        </div>
      </div>
    );
  }
  return roomId
    ? <Room key={roomId} roomId={roomId} me={user.nickname} onExit={exit} topbar={topbar} />
    : <Lobby onEnter={enter} topbar={topbar} />;
};

export default OnlineOmok;
