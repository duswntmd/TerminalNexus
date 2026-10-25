import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import JanggiBoard from './JanggiBoard.jsx';
import {
  CHO, HAN, PASS, DEFAULT_FORMATION, replay, legalMovesFrom, inCheck, findKing, teamOf, teamFromName, scores,
} from './engine.js';
import { playSound } from './sound.js';
import { PlayerCard, FormationPicker, MoveList } from './parts.jsx';
import { useNotations, capturedBy, TEAM_LABEL } from './helpers.js';
import { useAuth } from '../../../context/AuthContext';
import { fetchWithAccessRaw } from '../../../util/fetchUtil';

const wsUrl = () => `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws-chat/websocket`;

/* ── 로비 ── */
const Lobby = ({ onEnter }) => {
  const [rooms, setRooms] = useState([]);
  const [title, setTitle] = useState('');
  const [side, setSide] = useState('CHO');
  const [formation, setFormation] = useState(DEFAULT_FORMATION);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const res = await fetchWithAccessRaw('/api/janggi/rooms');
    if (res.ok) setRooms(await res.json());
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [load]);

  const create = async (e) => {
    e.preventDefault();
    setCreating(true);
    const res = await fetchWithAccessRaw('/api/janggi/room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, side, formation }),
    });
    setCreating(false);
    if (res.ok) onEnter((await res.json()).roomId);
  };

  const statusLabel = { WAITING: '대기 중', PLAYING: '대국 중', FINISHED: '종료' };

  return (
    <div className="jg-layout">
      <div className="jg-panel">
        <h3 className="jg-section-title">대국 방 ({rooms.length})</h3>
        {rooms.length === 0 ? (
          <p className="jg-empty">열린 방이 없습니다. 오른쪽에서 방을 만들어 보세요.</p>
        ) : (
          <div className="jg-room-list">
            {rooms.map((r) => (
              <div key={r.roomId} className="jg-room">
                <div style={{ minWidth: 0 }}>
                  <div className="jg-room-title">{r.title}</div>
                  <div className="jg-room-meta">
                    초 {r.cho || '빈자리'} · 한 {r.han || '빈자리'} · {statusLabel[r.status]}
                  </div>
                </div>
                <button type="button" className="jg-btn" onClick={() => onEnter(r.roomId)}>
                  {r.status === 'WAITING' && r.playerCount < 2 ? '입장' : '관전'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <form className="jg-panel jg-setup" onSubmit={create}>
        <h3 className="jg-section-title" style={{ margin: 0 }}>방 만들기</h3>
        <input className="jg-input" placeholder="방 제목 (선택)" value={title} maxLength={40} onChange={(e) => setTitle(e.target.value)} />
        <div>
          <div className="jg-field-label">내 진영</div>
          <div className="jg-choices">
            <button type="button" className={`jg-choice${side === 'CHO' ? ' is-active' : ''}`} onClick={() => setSide('CHO')}>초(楚) <small>먼저 둠</small></button>
            <button type="button" className={`jg-choice${side === 'HAN' ? ' is-active' : ''}`} onClick={() => setSide('HAN')}>한(漢) <small>덤 1.5점</small></button>
          </div>
        </div>
        <div>
          <div className="jg-field-label">내 상차림</div>
          <FormationPicker value={formation} onChange={setFormation} />
        </div>
        <button type="submit" className="jg-btn primary" disabled={creating}>방 만들기</button>
      </form>
    </div>
  );
};

/* ── 대국 방 ── */
const Room = ({ roomId, me, onExit }) => {
  const [room, setRoom] = useState(null);
  const [selected, setSelected] = useState(null);
  const [chat, setChat] = useState([]);
  const [input, setInput] = useState('');
  const [toast, setToast] = useState(null);
  const [banner, setBanner] = useState(null);
  const clientRef = useRef(null);
  const prevRef = useRef(null);
  const chatRef = useRef(null);
  const exitRef = useRef(onExit);
  exitRef.current = onExit;

  const showToast = (text) => {
    setToast(text);
    setTimeout(() => setToast(null), 2500);
  };

  // 상태 수신 시 효과음/알림
  const applyState = useCallback((st) => {
    const prev = prevRef.current;
    prevRef.current = st;
    setRoom(st);
    setSelected(null);
    if (!prev || st.moves.length <= prev.moves.length) {
      if (prev && prev.status !== 'FINISHED' && st.status === 'FINISHED') playSound('win');
      return;
    }
    const last = st.moves[st.moves.length - 1];
    if (st.status === 'FINISHED') playSound('win');
    else if (st.inCheck) { playSound('check'); setBanner({ text: '장군!', key: Date.now() }); }
    else if (st.bikjang) setBanner({ text: '빅장!', info: true, key: Date.now() });
    else if (last[0] === PASS) setBanner({ text: '한수쉼', info: true, key: Date.now() });
    else playSound('move');
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await fetchWithAccessRaw(`/api/janggi/room/${roomId}/join`, { method: 'POST' });
      if (!alive) return;
      if (!res.ok) {
        showToast('방을 찾을 수 없습니다.');
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
        client.subscribe(`/topic/janggi/room/${roomId}`, (m) => {
          const ev = JSON.parse(m.body);
          if (ev.type === 'STATE') applyState(ev.state);
          else if (ev.type === 'CHAT') setChat((c) => [...c.slice(-99), { sender: ev.sender, text: ev.text }]);
          else if (ev.type === 'CLOSED') { showToast(ev.text); exitRef.current(); }
        });
        client.subscribe('/user/queue/janggi', (m) => {
          const ev = JSON.parse(m.body);
          if (ev.type === 'ERROR') showToast(ev.text);
        });
        // 재연결 시 놓친 상태 동기화
        const r = await fetchWithAccessRaw(`/api/janggi/room/${roomId}`);
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
    if (!c?.connected) { showToast('서버에 연결 중입니다. 잠시 후 다시 시도하세요.'); return; }
    c.publish({ destination: `/app/janggi/room/${roomId}/action`, body: JSON.stringify(action) });
  };

  const game = useMemo(
    () => (room ? replay(room.choFormation, room.hanFormation, room.moves) : null),
    [room],
  );
  const notations = useNotations(room?.choFormation, room?.hanFormation, room?.moves || []);
  const captured = useMemo(
    () => (room ? capturedBy(room.choFormation, room.hanFormation, room.moves) : { [CHO]: [], [HAN]: [] }),
    [room],
  );

  if (!room || !game) return <p className="jg-empty">방에 들어가는 중…</p>;

  const mySide = room.cho === me ? CHO : room.han === me ? HAN : null;
  const isHost = room.host === me;
  const playing = room.status === 'PLAYING';
  const myTurn = playing && mySide != null && teamFromName(room.turn) === mySide;
  const targets = selected != null && myTurn ? legalMovesFrom(game.board, selected) : [];

  const onSquare = (i) => {
    if (!myTurn) return;
    if (selected != null && targets.includes(i)) {
      send({ type: 'MOVE', from: selected, to: i });
      setSelected(null);
      return;
    }
    const p = game.board[i];
    setSelected(p && teamOf(p) === mySide && i !== selected ? i : null);
  };

  const leave = () => {
    if (playing && mySide != null && !window.confirm('대국 중에 나가면 기권패 처리됩니다. 나가시겠습니까?')) return;
    send({ type: 'LEAVE' });
    onExit();
  };

  const s = scores(game.board);
  const flipped = mySide === HAN;
  const topTeam = flipped ? CHO : HAN;
  const bottomTeam = flipped ? HAN : CHO;
  const nameOf = (team) => (team === CHO ? room.cho : room.han) || '빈자리';
  const card = (team) => (
    <PlayerCard
      team={team}
      name={`${nameOf(team)}${(team === CHO ? room.cho : room.han) === room.host ? ' 👑' : ''}`}
      sub={`${TEAM_LABEL[team]}${team === mySide ? ' · 나' : ''}`}
      isTurn={playing && room.turn === (team === CHO ? 'CHO' : 'HAN')}
      score={team === CHO ? s.cho : s.han}
      captured={captured[team]}
    />
  );
  const checkSq = playing && room.inCheck ? findKing(game.board, teamFromName(room.inCheck)) : null;
  const myFormation = mySide === CHO ? room.choFormation : room.hanFormation;

  let status;
  if (room.status === 'WAITING') {
    status = room.cho && room.han
      ? (isHost ? '상대가 들어왔습니다. 대국을 시작하세요.' : '방장이 시작하기를 기다리는 중…')
      : '상대를 기다리는 중… (방 주소를 공유해도 됩니다)';
  } else if (playing) {
    status = mySide == null ? `관전 중 · ${TEAM_LABEL[teamFromName(room.turn)]} 차례` : myTurn ? '내 차례입니다' : '상대 차례';
  }

  return (
    <>
      <div className="jg-layout">
        <div>
          <div style={{ marginBottom: 10 }}>{card(topTeam)}</div>
          <div className="jg-board-wrap">
            <JanggiBoard
              board={game.board}
              flipped={flipped}
              selected={selected}
              targets={targets}
              lastMove={room.moves[room.moves.length - 1]}
              checkSq={checkSq}
              onSquare={onSquare}
              disabled={!myTurn}
            />
            {banner && <div key={banner.key} className={`jg-banner${banner.info ? ' is-info' : ''}`}>{banner.text}</div>}
          </div>
          <div style={{ marginTop: 10 }}>{card(bottomTeam)}</div>
        </div>

        <div className="jg-side">
          <div className="jg-panel">
            <h3 className="jg-section-title">{room.title}</h3>
            {room.status === 'FINISHED' ? (
              <div className="jg-result">
                <strong>
                  {mySide == null
                    ? `${TEAM_LABEL[teamFromName(room.winner)]} 승리`
                    : room.winner === (mySide === CHO ? 'CHO' : 'HAN') ? '승리!' : '패배'}
                </strong>
                {room.reason}
              </div>
            ) : (
              <p className="jg-status">{status}{room.bikjang && playing && <><br />빅장! 풀지 않으면 점수로 판정합니다.</>}</p>
            )}

            {room.status === 'WAITING' && mySide != null && (
              <div style={{ marginTop: 12 }}>
                <div className="jg-field-label">내 상차림 ({TEAM_LABEL[mySide]})</div>
                <FormationPicker value={myFormation} onChange={(f) => send({ type: 'FORMATION', formation: f })} />
              </div>
            )}

            <div className="jg-actions" style={{ marginTop: 12 }}>
              {room.status === 'WAITING' && isHost && (
                <button type="button" className="jg-btn primary" disabled={!(room.cho && room.han)} onClick={() => send({ type: 'START' })}>대국 시작</button>
              )}
              {room.status === 'FINISHED' && isHost && (
                <button type="button" className="jg-btn primary" onClick={() => send({ type: 'REMATCH' })}>다시 두기 (진영 교체)</button>
              )}
              {playing && mySide != null && (
                <>
                  <button type="button" className="jg-btn" disabled={!myTurn || inCheck(game.board, mySide)} onClick={() => send({ type: 'PASS' })}>한수쉼</button>
                  <button type="button" className="jg-btn danger" onClick={() => window.confirm('기권하시겠습니까?') && send({ type: 'RESIGN' })}>기권</button>
                </>
              )}
              <button type="button" className="jg-btn" onClick={leave}>나가기</button>
            </div>
          </div>

          <div className="jg-panel jg-chat">
            <h3 className="jg-section-title" style={{ margin: 0 }}>대화</h3>
            <div className="jg-chat-log" ref={chatRef}>
              {chat.length === 0 ? <p className="jg-empty" style={{ padding: 0 }}>인사를 건네 보세요.</p>
                : chat.map((c, i) => <p key={i}><b>{c.sender}</b> {c.text}</p>)}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); if (input.trim()) { send({ type: 'CHAT', text: input }); setInput(''); } }}>
              <input className="jg-input" value={input} maxLength={200} onChange={(e) => setInput(e.target.value)} placeholder="메시지 입력" />
              <button type="submit" className="jg-btn">전송</button>
            </form>
          </div>

          <MoveList notations={notations} />
        </div>
      </div>
      {toast && <div className="jg-toast" role="alert">{toast}</div>}
    </>
  );
};

/** 온라인 대국: 로그인 필요, ?room= 으로 방 유지 */
const OnlineJanggi = () => {
  const { isLoggedIn, user, loading } = useAuth();
  const [params, setParams] = useSearchParams();
  const roomId = params.get('room');

  const enter = useCallback((id) => setParams({ mode: 'online', room: id }), [setParams]);
  const exit = useCallback(() => setParams({ mode: 'online' }), [setParams]);

  if (loading) return <p className="jg-empty">불러오는 중…</p>;
  if (!isLoggedIn) {
    return (
      <div className="jg-panel" style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
        <p>온라인 대국은 로그인 후 이용할 수 있어요.</p>
        <Link className="jg-btn primary" to={`/login?redirect=${encodeURIComponent('/play/janggi?mode=online')}`} style={{ display: 'inline-block', textDecoration: 'none' }}>로그인</Link>
      </div>
    );
  }
  if (!user) return <p className="jg-empty">불러오는 중…</p>;
  return roomId ? <Room roomId={roomId} me={user.nickname} onExit={exit} /> : <Lobby onEnter={enter} />;
};

export default OnlineJanggi;
