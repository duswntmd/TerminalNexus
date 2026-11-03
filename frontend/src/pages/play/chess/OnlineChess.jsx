import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Client } from '@stomp/stompjs';
import ChessBoard from './ChessBoard.jsx';
import { WHITE, BLACK, replay, capturedBy, materialDiff, finishWith } from './engine.js';
import { playSound } from '../janggi/sound.js';
import { PlayerCard, MoveList, PromotionPicker, ResultOverlay } from './parts.jsx';
import { colorKey, colorFromName } from './helpers.js';
import { useAuth } from '../../../context/AuthContext';
import { fetchWithAccessRaw } from '../../../util/fetchUtil';

const wsUrl = () => `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws-chat/websocket`;

/* ── 로비 ── */
const Lobby = ({ onEnter }) => {
  const { t } = useTranslation();
  const [rooms, setRooms] = useState([]);
  const [title, setTitle] = useState('');
  const [side, setSide] = useState('WHITE');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const res = await fetchWithAccessRaw('/api/chess/rooms');
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
    const res = await fetchWithAccessRaw('/api/chess/room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, side }),
    });
    setCreating(false);
    if (res.ok) onEnter((await res.json()).roomId);
  };

  const seat = (nick) => nick || t('chess.lobby.empty_seat');

  return (
    <div className="ch-layout">
      <div className="ch-panel">
        <h3 className="ch-section-title">{t('chess.lobby.rooms', { count: rooms.length })}</h3>
        {rooms.length === 0 ? (
          <p className="ch-empty">{t('chess.lobby.empty')}</p>
        ) : (
          <div className="ch-room-list">
            {rooms.map((r) => (
              <div key={r.roomId} className="ch-room">
                <div style={{ minWidth: 0 }}>
                  <div className="ch-room-title">{r.title}</div>
                  <div className="ch-room-meta">
                    {t('chess.white')} {seat(r.white)} · {t('chess.black')} {seat(r.black)} · {t(`chess.lobby.status.${r.status}`)}
                  </div>
                </div>
                <button type="button" className="ch-btn" onClick={() => onEnter(r.roomId)}>
                  {r.status === 'WAITING' && r.playerCount < 2 ? t('chess.actions.enter') : t('chess.actions.watch')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <form className="ch-panel ch-setup" onSubmit={create}>
        <h3 className="ch-section-title" style={{ margin: 0 }}>{t('chess.lobby.create_title')}</h3>
        <input className="ch-input" placeholder={t('chess.lobby.title_ph')} value={title} maxLength={40} onChange={(e) => setTitle(e.target.value)} />
        <div>
          <div className="ch-field-label">{t('chess.setup.my_color')}</div>
          <div className="ch-choices">
            {['WHITE', 'BLACK', 'RANDOM'].map((s) => (
              <button key={s} type="button" className={`ch-choice${side === s ? ' is-active' : ''}`} onClick={() => setSide(s)}>
                {t(`chess.setup.${s.toLowerCase()}`)} <small>{t(`chess.setup.${s.toLowerCase()}_desc`)}</small>
              </button>
            ))}
          </div>
        </div>
        <button type="submit" className="ch-btn primary" disabled={creating}>{t('chess.actions.create')}</button>
      </form>
    </div>
  );
};

/* ── 대국 방 ── */
const Room = ({ roomId, me, onExit }) => {
  const { t } = useTranslation();
  const [room, setRoom] = useState(null);
  const [chat, setChat] = useState([]);
  const [input, setInput] = useState('');
  const [toast, setToast] = useState(null);
  const [banner, setBanner] = useState(null);
  const [promo, setPromo] = useState(null);
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
  const errorText = (code) => tRef.current(`chess.error.${code}`, { defaultValue: tRef.current('chess.error.generic') });

  // 상태 수신 시 효과음/알림
  const applyState = useCallback((st) => {
    const prev = prevRef.current;
    prevRef.current = st;
    setRoom(st);
    setPromo(null);
    if (prev && prev.status !== 'FINISHED' && st.status === 'FINISHED') {
      setResultOpen(true);
      playSound('win');
      return;
    }
    if (!prev || st.moves.length <= prev.moves.length) return;
    if (st.inCheck) {
      playSound('check');
      setBanner({ text: tRef.current('chess.status.check'), key: Date.now() });
    } else playSound('move');
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await fetchWithAccessRaw(`/api/chess/room/${roomId}/join`, { method: 'POST' });
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
        client.subscribe(`/topic/chess/room/${roomId}`, (m) => {
          const ev = JSON.parse(m.body);
          if (ev.type === 'STATE') applyState(ev.state);
          else if (ev.type === 'CHAT') setChat((c) => [...c.slice(-99), { sender: ev.sender, text: ev.text }]);
          else if (ev.type === 'CLOSED') { showToast(tRef.current(`chess.closed.${ev.text}`)); exitRef.current(); }
        });
        client.subscribe('/user/queue/chess', (m) => {
          const ev = JSON.parse(m.body);
          if (ev.type === 'ERROR') showToast(errorText(ev.text));
        });
        // 재연결 시 놓친 상태 동기화
        const r = await fetchWithAccessRaw(`/api/chess/room/${roomId}`);
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

  const send = (action) => {
    const c = clientRef.current;
    if (!c?.connected) { showToast(t('chess.error.connecting')); return; }
    c.publish({ destination: `/app/chess/room/${roomId}/action`, body: JSON.stringify(action) });
  };

  // 서버가 보낸 기보로 판을 재구성 (결과는 서버 판정을 따름)
  const game = useMemo(() => {
    if (!room) return null;
    const g = replay(room.startFen, room.moves);
    return room.status === 'FINISHED' ? finishWith(g, colorFromName(room.winner), room.reason) : g;
  }, [room]);
  const captured = useMemo(() => (game ? capturedBy(game.moves) : { [WHITE]: [], [BLACK]: [] }), [game]);

  if (!room || !game) return <p className="ch-empty">{t('chess.entering')}</p>;

  const mySide = room.white === me ? WHITE : room.black === me ? BLACK : null;
  const isHost = room.host === me;
  const playing = room.status === 'PLAYING';
  const myTurn = playing && mySide != null && colorFromName(room.turn) === mySide;
  const colorLabel = (c) => t(`chess.${colorKey(c)}`);

  const onMove = (from, to) => {
    const options = game.legal.filter((m) => m.from === from && m.to === to);
    if (!options.length) return;
    if (options.length > 1) setPromo({ from, to });
    else send({ type: 'MOVE', move: options[0].uci });
  };
  const onPromote = (type) => {
    const m = game.legal.find((x) => x.from === promo.from && x.to === promo.to && x.promo === type);
    setPromo(null);
    if (m) send({ type: 'MOVE', move: m.uci });
  };

  const leave = () => {
    if (playing && mySide != null && !window.confirm(t('chess.confirm.leave'))) return;
    send({ type: 'LEAVE' });
    onExit();
  };

  const diff = materialDiff(game.board);
  const flipped = mySide === BLACK;
  const topColor = flipped ? WHITE : BLACK;
  const bottomColor = flipped ? BLACK : WHITE;
  const nickOf = (c) => (c === WHITE ? room.white : room.black);
  const card = (c) => (
    <PlayerCard
      color={c}
      name={`${nickOf(c) || t('chess.lobby.empty_seat')}${nickOf(c) && nickOf(c) === room.host ? ' 👑' : ''}`}
      sub={`${colorLabel(c)}${c === mySide ? ` · ${t('chess.you')}` : ''}`}
      isTurn={playing && colorFromName(room.turn) === c}
      captured={captured[c]}
      advantage={c === WHITE ? diff : -diff}
    />
  );

  let status;
  if (room.status === 'WAITING') {
    status = room.white && room.black
      ? t(isHost ? 'chess.status.ready_host' : 'chess.status.waiting_host')
      : t('chess.status.waiting_opponent');
  } else if (playing) {
    status = mySide == null
      ? t('chess.status.spectating', { color: colorLabel(colorFromName(room.turn)) })
      : t(myTurn ? 'chess.status.your_turn' : 'chess.status.opp_turn');
  }

  const winner = colorFromName(room.winner);
  let resultTitle = t('chess.result.draw');
  if (winner != null) {
    resultTitle = mySide == null ? t(`chess.result.${colorKey(winner)}_wins`) : t(winner === mySide ? 'chess.result.win' : 'chess.result.lose');
  }
  const resultReason = room.reason ? t(`chess.reason.${room.reason}`) : '';
  const drawFrom = colorFromName(room.drawOffer);

  return (
    <>
      <div className="ch-layout">
        <div>
          <div style={{ marginBottom: 10 }}>{card(topColor)}</div>
          <div className="ch-board-wrap">
            <ChessBoard
              board={game.board}
              flipped={flipped}
              legal={myTurn && !promo ? game.legal : []}
              lastMove={game.moves[game.moves.length - 1]}
              checkSq={playing && room.inCheck ? game.kingSq : null}
              onMove={onMove}
              label={t('chess.board_label')}
            />
            {banner && <div key={banner.key} className="ch-banner">{banner.text}</div>}
            {promo && <PromotionPicker color={mySide} onPick={onPromote} onCancel={() => setPromo(null)} />}
            {room.status === 'FINISHED' && resultOpen && (
              <ResultOverlay title={resultTitle} reason={resultReason} onClose={() => setResultOpen(false)}>
                {isHost && <button type="button" className="ch-btn primary" onClick={() => send({ type: 'REMATCH' })}>{t('chess.actions.rematch')}</button>}
              </ResultOverlay>
            )}
          </div>
          <div style={{ marginTop: 10 }}>{card(bottomColor)}</div>
        </div>

        <div className="ch-side">
          <div className="ch-panel">
            <h3 className="ch-section-title">{room.title}</h3>
            {room.status === 'FINISHED' ? (
              <div className="ch-result">
                <strong>{resultTitle}</strong>
                {resultReason}
              </div>
            ) : (
              <p className="ch-status">{status}</p>
            )}

            {playing && drawFrom != null && mySide != null && (
              drawFrom === mySide
                ? <p className="ch-hint">{t('chess.draw.offered_by_me')}</p>
                : (
                  <div className="ch-draw-offer">
                    <span>{t('chess.draw.offered_by_opp')}</span>
                    <button type="button" className="ch-btn primary" onClick={() => send({ type: 'DRAW_ACCEPT' })}>{t('chess.actions.accept')}</button>
                    <button type="button" className="ch-btn" onClick={() => send({ type: 'DRAW_DECLINE' })}>{t('chess.actions.decline')}</button>
                  </div>
                )
            )}

            <div className="ch-actions" style={{ marginTop: 12 }}>
              {room.status === 'WAITING' && isHost && (
                <button type="button" className="ch-btn primary" disabled={!(room.white && room.black)} onClick={() => send({ type: 'START' })}>{t('chess.actions.start')}</button>
              )}
              {room.status === 'FINISHED' && isHost && (
                <button type="button" className="ch-btn primary" onClick={() => send({ type: 'REMATCH' })}>{t('chess.actions.rematch')}</button>
              )}
              {playing && mySide != null && (
                <>
                  <button type="button" className="ch-btn" disabled={drawFrom === mySide} onClick={() => send({ type: 'DRAW_OFFER' })}>{t('chess.actions.draw_offer')}</button>
                  <button type="button" className="ch-btn danger" onClick={() => window.confirm(t('chess.confirm.resign')) && send({ type: 'RESIGN' })}>{t('chess.actions.resign')}</button>
                </>
              )}
              <button type="button" className="ch-btn" onClick={leave}>{t('chess.actions.leave')}</button>
            </div>
          </div>

          <div className="ch-panel ch-chat">
            <h3 className="ch-section-title" style={{ margin: 0 }}>{t('chess.chat.title')}</h3>
            <div className="ch-chat-log" ref={chatRef}>
              {chat.length === 0 ? <p className="ch-empty" style={{ padding: 0 }}>{t('chess.chat.empty')}</p>
                : chat.map((c, i) => <p key={i}><b>{c.sender}</b> {c.text}</p>)}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); if (input.trim()) { send({ type: 'CHAT', text: input }); setInput(''); } }}>
              <input className="ch-input" value={input} maxLength={200} onChange={(e) => setInput(e.target.value)} placeholder={t('chess.chat.ph')} />
              <button type="submit" className="ch-btn">{t('chess.actions.send')}</button>
            </form>
          </div>

          <MoveList moves={game.moves} />
        </div>
      </div>
      {toast && <div className="ch-toast" role="alert">{toast}</div>}
    </>
  );
};

/** 온라인 대국: 로그인 필요(장기와 같음), ?room= 으로 방 유지 */
const OnlineChess = () => {
  const { t } = useTranslation();
  const { isLoggedIn, user, loading } = useAuth();
  const [params, setParams] = useSearchParams();
  const roomId = params.get('room');

  const enter = useCallback((id) => setParams({ mode: 'online', room: id }), [setParams]);
  const exit = useCallback(() => setParams({ mode: 'online' }), [setParams]);

  if (loading) return <p className="ch-empty">{t('chess.loading')}</p>;
  if (!isLoggedIn) {
    return (
      <div className="ch-panel" style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
        <p>{t('chess.login_needed')}</p>
        <Link className="ch-btn primary" to={`/login?redirect=${encodeURIComponent('/play/chess?mode=online')}`} style={{ display: 'inline-block', textDecoration: 'none' }}>{t('chess.actions.login')}</Link>
      </div>
    );
  }
  if (!user) return <p className="ch-empty">{t('chess.loading')}</p>;
  return roomId ? <Room roomId={roomId} me={user.nickname} onExit={exit} /> : <Lobby onEnter={enter} />;
};

export default OnlineChess;
