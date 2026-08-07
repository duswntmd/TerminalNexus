import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box, Container, Typography, Button, Paper, Stack, Grid,
  Chip, Avatar, Tooltip, IconButton, Select, MenuItem, FormControl,
  Dialog, DialogTitle, DialogContent, DialogActions, LinearProgress, Divider,
  TextField, Card, CardContent, Badge, Tabs, Tab, Alert, Snackbar, Switch, FormControlLabel
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import SendIcon from '@mui/icons-material/Send';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import ChatIcon from '@mui/icons-material/Chat';
import ShieldIcon from '@mui/icons-material/Shield';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import DeleteIcon from '@mui/icons-material/Delete';

import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { useAuth } from '../../context/AuthContext';

/* ──────────────────────────────────────────────
   Web Audio API 기반 효과음 합성기
────────────────────────────────────────────── */
const playSound = (type, soundEnabled = true) => {
  if (!soundEnabled) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'move') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'capture') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.12);
      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'check') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1174, now + 0.12);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'meong') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'win') {
      [523, 659, 783, 1046].forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.frequency.setValueAtTime(freq, now + i * 0.12);
        g.gain.setValueAtTime(0.25, now + i * 0.12);
        g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.2);
        o.start(now + i * 0.12);
        o.stop(now + i * 0.12 + 0.2);
      });
    }
  } catch (e) {
    console.trace('Audio error', e);
  }
};

/* ──────────────────────────────────────────────
   기물 및 규칙 정의
────────────────────────────────────────────── */
const TEAM = { CHO: 'CHO', HAN: 'HAN' };

const PIECE_TYPE = {
  KING: 'KING', GUARD: 'GUARD', ROOK: 'ROOK',
  CANNON: 'CANNON', KNIGHT: 'KNIGHT', ELEPHANT: 'ELEPHANT', PAWN: 'PAWN'
};

const PIECE_DISPLAY = {
  CHO: {
    KING: { text: '楚', color: '#10b981', bg: '#044e37' },
    GUARD: { text: '士', color: '#34d399', bg: '#065f46' },
    ROOK: { text: '車', color: '#38bdf8', bg: '#0c4a6e' },
    CANNON: { text: '包', color: '#a7f3d0', bg: '#047857' },
    KNIGHT: { text: '馬', color: '#6ee7b7', bg: '#065f46' },
    ELEPHANT: { text: '象', color: '#a7f3d0', bg: '#047857' },
    PAWN: { text: '卒', color: '#34d399', bg: '#065f46' }
  },
  HAN: {
    KING: { text: '漢', color: '#f87171', bg: '#6b1313' },
    GUARD: { text: '士', color: '#fca5a5', bg: '#881313' },
    ROOK: { text: '車', color: '#fb923c', bg: '#7c2d12' },
    CANNON: { text: '包', color: '#fca5a5', bg: '#991b1b' },
    KNIGHT: { text: '馬', color: '#fca5a5', bg: '#881313' },
    ELEPHANT: { text: '象', color: '#fca5a5', bg: '#881313' },
    PAWN: { text: '兵', color: '#f87171', bg: '#6b1313' }
  }
};

const FORMATION_TYPES = {
  N_E_N_E: 'N_E_N_E', E_N_N_E: 'E_N_N_E', N_E_E_N: 'N_E_E_N', E_N_E_N: 'E_N_E_N'
};

const FORMATION_INFO = {
  N_E_N_E: { name: '마 - 상 - 마 - 상', badge: '⭐ 표준 추천형', pattern: ['車', '馬', '象', '士', '士', '馬', '象', '車'] },
  E_N_N_E: { name: '상 - 마 - 마 - 상', badge: '🛡️ 중앙 안상형', pattern: ['車', '象', '馬', '士', '士', '馬', '象', '車'] },
  N_E_E_N: { name: '마 - 상 - 상 - 마', badge: '⚔️ 바깥상형', pattern: ['車', '馬', '象', '士', '士', '象', '馬', '車'] },
  E_N_E_N: { name: '상 - 마 - 상 - 마', badge: '🔥 엇상 공격형', pattern: ['車', '象', '馬', '士', '士', '象', '馬', '車'] }
};

const getFormationPieces = (type) => {
  switch (type) {
    case FORMATION_TYPES.E_N_N_E: return [PIECE_TYPE.ELEPHANT, PIECE_TYPE.KNIGHT, PIECE_TYPE.KNIGHT, PIECE_TYPE.ELEPHANT];
    case FORMATION_TYPES.N_E_E_N: return [PIECE_TYPE.KNIGHT, PIECE_TYPE.ELEPHANT, PIECE_TYPE.ELEPHANT, PIECE_TYPE.KNIGHT];
    case FORMATION_TYPES.E_N_E_N: return [PIECE_TYPE.ELEPHANT, PIECE_TYPE.KNIGHT, PIECE_TYPE.ELEPHANT, PIECE_TYPE.KNIGHT];
    default: return [PIECE_TYPE.KNIGHT, PIECE_TYPE.ELEPHANT, PIECE_TYPE.KNIGHT, PIECE_TYPE.ELEPHANT];
  }
};

const createBoardWithFormations = (choForm = FORMATION_TYPES.N_E_N_E, hanForm = FORMATION_TYPES.N_E_N_E) => {
  const board = Array(10).fill(null).map(() => Array(9).fill(null));
  const hanBack = getFormationPieces(hanForm);
  const choBack = getFormationPieces(choForm);

  board[0][0] = { team: TEAM.HAN, type: PIECE_TYPE.ROOK, id: 'h_r1' };
  board[0][1] = { team: TEAM.HAN, type: hanBack[0], id: 'h_b1' };
  board[0][2] = { team: TEAM.HAN, type: hanBack[1], id: 'h_b2' };
  board[0][3] = { team: TEAM.HAN, type: PIECE_TYPE.GUARD, id: 'h_g1' };
  board[0][5] = { team: TEAM.HAN, type: PIECE_TYPE.GUARD, id: 'h_g2' };
  board[0][6] = { team: TEAM.HAN, type: hanBack[2], id: 'h_b3' };
  board[0][7] = { team: TEAM.HAN, type: hanBack[3], id: 'h_b4' };
  board[0][8] = { team: TEAM.HAN, type: PIECE_TYPE.ROOK, id: 'h_r2' };
  board[1][4] = { team: TEAM.HAN, type: PIECE_TYPE.KING, id: 'h_k' };
  board[2][1] = { team: TEAM.HAN, type: PIECE_TYPE.CANNON, id: 'h_c1' };
  board[2][7] = { team: TEAM.HAN, type: PIECE_TYPE.CANNON, id: 'h_c2' };
  board[3][0] = { team: TEAM.HAN, type: PIECE_TYPE.PAWN, id: 'h_p1' };
  board[3][2] = { team: TEAM.HAN, type: PIECE_TYPE.PAWN, id: 'h_p2' };
  board[3][4] = { team: TEAM.HAN, type: PIECE_TYPE.PAWN, id: 'h_p3' };
  board[3][6] = { team: TEAM.HAN, type: PIECE_TYPE.PAWN, id: 'h_p4' };
  board[3][8] = { team: TEAM.HAN, type: PIECE_TYPE.PAWN, id: 'h_p5' };

  board[6][0] = { team: TEAM.CHO, type: PIECE_TYPE.PAWN, id: 'c_p1' };
  board[6][2] = { team: TEAM.CHO, type: PIECE_TYPE.PAWN, id: 'c_p2' };
  board[6][4] = { team: TEAM.CHO, type: PIECE_TYPE.PAWN, id: 'c_p3' };
  board[6][6] = { team: TEAM.CHO, type: PIECE_TYPE.PAWN, id: 'c_p4' };
  board[6][8] = { team: TEAM.CHO, type: PIECE_TYPE.PAWN, id: 'c_p5' };
  board[7][1] = { team: TEAM.CHO, type: PIECE_TYPE.CANNON, id: 'c_c1' };
  board[7][7] = { team: TEAM.CHO, type: PIECE_TYPE.CANNON, id: 'c_c2' };
  board[8][4] = { team: TEAM.CHO, type: PIECE_TYPE.KING, id: 'c_k' };
  board[9][0] = { team: TEAM.CHO, type: PIECE_TYPE.ROOK, id: 'c_r1' };
  board[9][1] = { team: TEAM.CHO, type: choBack[0], id: 'c_b1' };
  board[9][2] = { team: TEAM.CHO, type: choBack[1], id: 'c_b2' };
  board[9][3] = { team: TEAM.CHO, type: PIECE_TYPE.GUARD, id: 'c_g1' };
  board[9][5] = { team: TEAM.CHO, type: PIECE_TYPE.GUARD, id: 'c_g2' };
  board[9][6] = { team: TEAM.CHO, type: choBack[2], id: 'c_b3' };
  board[9][7] = { team: TEAM.CHO, type: choBack[3], id: 'c_b4' };
  board[9][8] = { team: TEAM.CHO, type: PIECE_TYPE.ROOK, id: 'c_r2' };

  return board;
};

const isInPalace = (x, y) => (x >= 3 && x <= 5) && ((y >= 0 && y <= 2) || (y >= 7 && y <= 9));

const PALACE_DIAGONAL_MOVES = {
  '3,0': [{ x: 4, y: 1 }], '5,0': [{ x: 4, y: 1 }],
  '4,1': [{ x: 3, y: 0 }, { x: 5, y: 0 }, { x: 3, y: 2 }, { x: 5, y: 2 }],
  '3,2': [{ x: 4, y: 1 }], '5,2': [{ x: 4, y: 1 }],
  '3,7': [{ x: 4, y: 8 }], '5,7': [{ x: 4, y: 8 }],
  '4,8': [{ x: 3, y: 7 }, { x: 5, y: 7 }, { x: 3, y: 9 }, { x: 5, y: 9 }],
  '3,9': [{ x: 4, y: 8 }], '5,9': [{ x: 4, y: 8 }]
};

const getLegalMoves = (board, fromX, fromY) => {
  const piece = board[fromY][fromX];
  if (!piece) return [];
  const moves = [];
  const team = piece.team;

  const addMoveIfValid = (tx, ty) => {
    if (tx < 0 || tx > 8 || ty < 0 || ty > 9) return false;
    const target = board[ty][tx];
    if (!target) { moves.push({ x: tx, y: ty }); return true; }
    if (target.team !== team) { moves.push({ x: tx, y: ty }); return false; }
    return false;
  };

  switch (piece.type) {
    case PIECE_TYPE.KING:
    case PIECE_TYPE.GUARD: {
      [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dx, dy]) => {
        const nx = fromX + dx, ny = fromY + dy;
        if (isInPalace(nx, ny) && (ny <= 2 ? fromY <= 2 : fromY >= 7)) addMoveIfValid(nx, ny);
      });
      const diagKey = `${fromX},${fromY}`;
      if (PALACE_DIAGONAL_MOVES[diagKey]) PALACE_DIAGONAL_MOVES[diagKey].forEach(pos => addMoveIfValid(pos.x, pos.y));
      break;
    }
    case PIECE_TYPE.ROOK: {
      [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dx, dy]) => {
        let step = 1;
        while (true) {
          const nx = fromX + dx * step, ny = fromY + dy * step;
          if (nx < 0 || nx > 8 || ny < 0 || ny > 9) break;
          if (!addMoveIfValid(nx, ny)) break;
          step++;
        }
      });
      break;
    }
    case PIECE_TYPE.CANNON: {
      [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dx, dy]) => {
        let step = 1, foundScreen = false;
        while (true) {
          const nx = fromX + dx * step, ny = fromY + dy * step;
          if (nx < 0 || nx > 8 || ny < 0 || ny > 9) break;
          const target = board[ny][nx];
          if (!foundScreen) {
            if (target) { if (target.type === PIECE_TYPE.CANNON) break; foundScreen = true; }
          } else {
            if (!target) moves.push({ x: nx, y: ny });
            else { if (target.team !== team && target.type !== PIECE_TYPE.CANNON) moves.push({ x: nx, y: ny }); break; }
          }
          step++;
        }
      });
      break;
    }
    case PIECE_TYPE.KNIGHT: {
      [
        { dir: [0, -1], landing: [[-1, -2], [1, -2]] },
        { dir: [0, 1], landing: [[-1, 2], [1, 2]] },
        { dir: [-1, 0], landing: [[-2, -1], [-2, 1]] },
        { dir: [1, 0], landing: [[2, -1], [2, 1]] }
      ].forEach(({ dir, landing }) => {
        const mx = fromX + dir[0], my = fromY + dir[1];
        if (mx >= 0 && mx <= 8 && my >= 0 && my <= 9 && !board[my][mx]) {
          landing.forEach(([lx, ly]) => addMoveIfValid(fromX + lx, fromY + ly));
        }
      });
      break;
    }
    case PIECE_TYPE.ELEPHANT: {
      [
        { dir: [0, -1], diag1: [-1, -2], landing: [-2, -3] },
        { dir: [0, 1], diag1: [-1, 2], landing: [-2, 3] },
        { dir: [-1, 0], diag1: [-2, -1], landing: [-3, -2] },
        { dir: [1, 0], diag1: [2, -1], landing: [3, -2] }
      ].forEach(m => {
        const step1X = fromX + m.dir[0], step1Y = fromY + m.dir[1];
        if (step1X >= 0 && step1X <= 8 && step1Y >= 0 && step1Y <= 9 && !board[step1Y][step1X]) {
          const d1X = fromX + m.diag1[0], d1Y = fromY + m.diag1[1];
          if (d1X >= 0 && d1X <= 8 && d1Y >= 0 && d1Y <= 9 && !board[d1Y][d1X]) addMoveIfValid(fromX + m.landing[0], fromY + m.landing[1]);
        }
      });
      break;
    }
    case PIECE_TYPE.PAWN: {
      const forwardDir = team === TEAM.CHO ? -1 : 1;
      [[0, forwardDir], [-1, 0], [1, 0]].forEach(([dx, dy]) => addMoveIfValid(fromX + dx, fromY + dy));
      break;
    }
    default: break;
  }
  return moves;
};

const isKingInCheck = (board, team) => {
  let kingX = -1, kingY = -1;
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 9; x++) {
      const p = board[y][x];
      if (p && p.team === team && p.type === PIECE_TYPE.KING) {
        kingX = x; kingY = y; break;
      }
    }
  }
  if (kingX === -1) return false;
  const enemyTeam = team === TEAM.CHO ? TEAM.HAN : TEAM.CHO;
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 9; x++) {
      const p = board[y][x];
      if (p && p.team === enemyTeam) {
        if (getLegalMoves(board, x, y).some(m => m.x === kingX && m.y === kingY)) return true;
      }
    }
  }
  return false;
};

/* ──────────────────────────────────────────────
   프로급 실시간 온라인 장기 메인 컴포넌트
────────────────────────────────────────────── */
const OnlineJanggiPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetRoomId = searchParams.get('room');

  // 로그인 인증 정보 바인딩
  const { user } = useAuth();
  const nickname = user?.nickname || user?.userId || '기사_온라인';

  const [viewState, setViewState] = useState(targetRoomId ? 'GAME' : 'LOBBY');
  const [rooms, setRooms] = useState([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [isCreating, setIsCreating] = useState(false);
  const [sandboxMode, setSandboxMode] = useState(false);

  // 방 생성 모달
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [preferredTeam, setPreferredTeam] = useState(TEAM.CHO);

  // 대국실 상태
  const [currentRoom, setCurrentRoom] = useState(null);
  const [roomStatus, setRoomStatus] = useState('WAITING');
  const [board, setBoard] = useState(() => createBoardWithFormations());
  const [myTeam, setMyTeam] = useState(TEAM.CHO);
  const [currentTurn, setCurrentTurn] = useState(TEAM.CHO);

  const [selectedPos, setSelectedPos] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [isCheck, setIsCheck] = useState(false);
  const [checkEffect, setCheckEffect] = useState(null);

  const [capturedHan, setCapturedHan] = useState([]);
  const [capturedCho, setCapturedCho] = useState([]);
  const [notationLogs, setNotationLogs] = useState([]);

  const [chatMessages, setChatMessages] = useState([]);
  const [inputChat, setInputChat] = useState('');
  const chatEndRef = useRef(null);

  const stompClientRef = useRef(null);

  // 방 목록 조회
  const fetchRooms = async () => {
    setIsLoadingRooms(true);
    try {
      const res = await fetch('/api/janggi/rooms', { headers: { 'Accept': 'application/json' } });
      if (res.ok) {
        const data = await res.json();
        setRooms(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.trace('Fetch rooms error', e);
    } finally {
      setIsLoadingRooms(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 3500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // STOMP 접속
  const connectStomp = (roomId) => {
    if (stompClientRef.current) {
      try { stompClientRef.current.deactivate(); } catch (e) {}
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws-chat`;

    const client = new Client({
      webSocketFactory: () => {
        try {
          return new WebSocket(wsUrl);
        } catch (e) {
          return new SockJS('/ws-chat');
        }
      },
      reconnectDelay: 4000,
      debug: () => {},
      onConnect: () => {
        client.subscribe(`/topic/janggi/room/${roomId}`, (message) => {
          try {
            const body = JSON.parse(message.body);
            handleReceiveGameMessage(body);
          } catch (err) {
            console.trace('Parse websocket msg error', err);
          }
        });

        client.publish({
          destination: `/app/janggi/room/${roomId}/action`,
          body: JSON.stringify({
            type: 'JOIN',
            roomId,
            sender: nickname,
            team: myTeam
          })
        });
      }
    });

    client.activate();
    stompClientRef.current = client;
  };

  // 수신 메시지 처리
  const handleReceiveGameMessage = (msg) => {
    if (msg.type === 'CHAT') {
      setChatMessages(prev => [...prev, { sender: msg.sender, text: msg.text }]);
    } else if (msg.type === 'MOVE') {
      executeRemoteMove(msg.fromX, msg.fromY, msg.toX, msg.toY);
    } else if (msg.type === 'PASS') {
      const passText = `${msg.team === TEAM.CHO ? '楚' : '漢'} 한수 쉬기 (Pass)`;
      setNotationLogs(prev => [passText, ...prev]);
      setCurrentTurn(msg.currentTurn || (msg.team === TEAM.CHO ? TEAM.HAN : TEAM.CHO));
      playSound('move', soundEnabled);
    } else if (msg.type === 'RESIGN') {
      setCheckEffect({ text: `🏁 ${msg.team === TEAM.CHO ? '초' : '한'} 기권승!`, type: 'MEONG' });
      playSound('win', soundEnabled);
    } else if (msg.type === 'START' || msg.type === 'READY') {
      setRoomStatus('PLAYING');
      playSound('win', soundEnabled);
    } else if (msg.type === 'LEAVE') {
      setErrorMessage(msg.text || '상대방이 퇴장했습니다.');
      if (msg.text && msg.text.includes('해산')) {
        setViewState('LOBBY');
        setCurrentRoom(null);
      } else {
        fetchRoomDetail(msg.roomId);
      }
    } else if (msg.type === 'JOIN') {
      fetchRoomDetail(msg.roomId);
    }
  };

  const fetchRoomDetail = async (roomId) => {
    try {
      const res = await fetch(`/api/janggi/room/${roomId}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentRoom(data);
        setRoomStatus(data.status || 'WAITING');
        if (data.choNickname === nickname) setMyTeam(TEAM.CHO);
        else if (data.hanNickname === nickname) setMyTeam(TEAM.HAN);

        setBoard(createBoardWithFormations(data.choFormation, data.hanFormation));
      }
    } catch (e) {
      console.trace('Fetch room detail error', e);
    }
  };

  const executeRemoteMove = (fromX, fromY, toX, toY) => {
    setBoard(prevBoard => {
      const newBoard = prevBoard.map(row => [...row]);
      const movingPiece = newBoard[fromY][fromX];
      const targetPiece = newBoard[toY][toX];

      if (targetPiece) {
        playSound('capture', soundEnabled);
        if (targetPiece.team === TEAM.HAN) setCapturedHan(prev => [...prev, targetPiece]);
        else setCapturedCho(prev => [...prev, targetPiece]);
      } else {
        playSound('move', soundEnabled);
      }

      newBoard[toY][toX] = movingPiece;
      newBoard[fromY][fromX] = null;

      const movingTeam = movingPiece.team;
      const enemyTeam = movingTeam === TEAM.CHO ? TEAM.HAN : TEAM.CHO;

      const myKingNowSafe = !isKingInCheck(newBoard, movingTeam);
      const enemyKingInCheck = isKingInCheck(newBoard, enemyTeam);

      setIsCheck(enemyKingInCheck);

      if (enemyKingInCheck) {
        setCheckEffect({ text: '🚨 장군!', type: 'CHECK' });
        playSound('check', soundEnabled);
      } else if (isCheck && myKingNowSafe) {
        setCheckEffect({ text: '🛡️ 멍군!', type: 'MEONG' });
        playSound('meong', soundEnabled);
      }

      setCurrentTurn(enemyTeam);
      return newBoard;
    });
  };

  const handleStartGame = () => {
    setRoomStatus('PLAYING');
    if (stompClientRef.current && currentRoom) {
      stompClientRef.current.publish({
        destination: `/app/janggi/room/${currentRoom.roomId}/action`,
        body: JSON.stringify({
          type: 'START',
          roomId: currentRoom.roomId,
          sender: nickname
        })
      });
    }
    playSound('move', soundEnabled);
  };

  // ★ 방 나가기 (Leave)
  const handleLeaveRoom = () => {
    if (stompClientRef.current && currentRoom) {
      stompClientRef.current.publish({
        destination: `/app/janggi/room/${currentRoom.roomId}/action`,
        body: JSON.stringify({
          type: 'LEAVE',
          roomId: currentRoom.roomId,
          sender: nickname
        })
      });
    }
    setViewState('LOBBY');
    setCurrentRoom(null);
    fetchRooms();
  };

  // ★ 방 삭제 (Delete Room - 방장 전용)
  const handleDeleteRoom = async (roomId) => {
    if (!window.confirm('정말로 이 대국 방을 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/janggi/room/${roomId}?hostNickname=${encodeURIComponent(nickname)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchRooms();
      } else {
        setErrorMessage('방 삭제 권한이 없거나 오류가 발생했습니다.');
      }
    } catch (e) {
      console.trace('Delete room error', e);
    }
  };

  const handleCellClick = (x, y) => {
    if (!sandboxMode && roomStatus !== 'PLAYING') return;
    if (!sandboxMode && currentTurn !== myTeam) return;

    const clickedPiece = board[y][x];

    if (selectedPos) {
      const isLegal = legalMoves.some(m => m.x === x && m.y === y);
      if (isLegal) {
        if (sandboxMode) {
          executeRemoteMove(selectedPos.x, selectedPos.y, x, y);
        } else if (stompClientRef.current && currentRoom) {
          stompClientRef.current.publish({
            destination: `/app/janggi/room/${currentRoom.roomId}/action`,
            body: JSON.stringify({
              type: 'MOVE',
              roomId: currentRoom.roomId,
              sender: nickname,
              team: myTeam,
              fromX: selectedPos.x,
              fromY: selectedPos.y,
              toX: x,
              toY: y
            })
          });
        }
        setSelectedPos(null);
        setLegalMoves([]);
        return;
      }
    }

    if (clickedPiece && (sandboxMode || clickedPiece.team === currentTurn)) {
      setSelectedPos({ x, y });
      setLegalMoves(getLegalMoves(board, x, y));
    } else {
      setSelectedPos(null);
      setLegalMoves([]);
    }
  };

  const handleCreateRoom = async (e) => {
    if (e) e.preventDefault();
    if (isCreating) return;

    setIsCreating(true);
    setIsCreateModalOpen(false);

    try {
      const res = await fetch('/api/janggi/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          title: newRoomTitle.trim() || `${nickname}의 승부 한 판!`,
          hostNickname: nickname,
          preferredTeam,
          formation: FORMATION_TYPES.N_E_N_E
        })
      });

      if (res.ok) {
        const roomData = await res.json();
        setNewRoomTitle('');
        setMyTeam(preferredTeam);
        setCurrentRoom(roomData);
        setRoomStatus('WAITING');
        setViewState('GAME');
        connectStomp(roomData.roomId);
        fetchRooms();
      } else {
        setErrorMessage('방 생성 실패: 서버 응답 오류입니다.');
      }
    } catch (err) {
      console.trace('Create room error', err);
      setErrorMessage('방 생성 통신 오류가 발생했습니다.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async (roomId) => {
    connectStomp(roomId);
    await fetchRoomDetail(roomId);
    setViewState('GAME');
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!inputChat.trim() || !stompClientRef.current || !currentRoom) return;

    stompClientRef.current.publish({
      destination: `/app/janggi/room/${currentRoom.roomId}/action`,
      body: JSON.stringify({
        type: 'CHAT',
        roomId: currentRoom.roomId,
        sender: nickname,
        text: inputChat.trim()
      })
    });
    setInputChat('');
  };

  return (
    <Box sx={{ minHeight: 'calc(100vh - 64px)', bgcolor: '#090a0f', color: '#fff', py: 4, px: { xs: 2, md: 4 }, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Container maxWidth="xl" sx={{ width: '100%', maxWidth: '1400px !important', mx: 'auto' }}>

        {/* 로비 뷰 (LOBBY VIEW) */}
        {viewState === 'LOBBY' && (
          <Box sx={{ width: '100%' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={4} flexWrap="wrap" gap={2}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')} sx={{ color: '#a1a1aa' }}>메인으로</Button>
                <Typography variant="h4" fontWeight={900} sx={{ background: 'linear-gradient(135deg,#38bdf8,#34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  🌐 실시간 1:1 온라인 장기 (Multiplayer Lobby)
                </Typography>
              </Stack>

              <Stack direction="row" spacing={2} alignItems="center">
                <Chip
                  avatar={<Avatar sx={{ bgcolor: '#044e37', color: '#34d399', fontWeight: 900 }}>{nickname.charAt(0)}</Avatar>}
                  label={`접속자: ${nickname}`}
                  color="success"
                  variant="outlined"
                  sx={{ color: '#fff', fontWeight: 800, py: 2.2, px: 1, borderRadius: '12px' }}
                />
                <Button startIcon={<RefreshIcon />} variant="outlined" color="info" onClick={fetchRooms} disabled={isLoadingRooms}>새로고침</Button>
                <Button startIcon={<AddIcon />} variant="contained" color="success" onClick={() => setIsCreateModalOpen(true)} disabled={isCreating} sx={{ fontWeight: 800 }}>
                  방 만들기
                </Button>
              </Stack>
            </Stack>

            {/* 방 목록 카드 그리드 */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 3 }}>
              {rooms.length > 0 ? (
                rooms.map(room => {
                  const isMyRoom = room.hostNickname === nickname;

                  return (
                    <Paper
                      key={room.roomId}
                      sx={{
                        p: 3,
                        borderRadius: '16px',
                        bgcolor: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        transition: 'all 0.2s',
                        '&:hover': { transform: 'translateY(-4px)', borderColor: '#38bdf8', boxShadow: '0 10px 30px rgba(56,189,248,0.2)' }
                      }}
                    >
                      <Stack spacing={2}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="h6" fontWeight={800} color="#fff">{room.title}</Typography>
                          <Chip
                            label={room.status === 'WAITING' ? '대기 중' : '대국 중'}
                            size="small"
                            color={room.status === 'WAITING' ? 'success' : 'warning'}
                            sx={{ fontWeight: 800 }}
                          />
                        </Stack>

                        <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="caption" color="#a1a1aa" display="block">방장: <b>{room.hostNickname}</b></Typography>
                            <Typography variant="caption" color="#71717a">인원: {room.userCount}/2명</Typography>
                          </Box>

                          <Stack direction="row" spacing={1}>
                            {isMyRoom && (
                              <IconButton color="error" size="small" onClick={() => handleDeleteRoom(room.roomId)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            )}

                            <Button
                              variant="contained"
                              color="primary"
                              disabled={room.userCount >= 2 && !isMyRoom}
                              onClick={() => handleJoinRoom(room.roomId)}
                              sx={{ fontWeight: 800, borderRadius: '10px' }}
                            >
                              입장하기
                            </Button>
                          </Stack>
                        </Stack>
                      </Stack>
                    </Paper>
                  );
                })
              ) : (
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Paper sx={{ p: 6, textCenter: 'center', bgcolor: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px dashed rgba(255,255,255,0.1)', textAlign: 'center' }}>
                    <Typography color="#a1a1aa" mb={2}>현재 개설된 온라인 대국 방이 없습니다.</Typography>
                    <Button variant="contained" color="success" startIcon={<AddIcon />} onClick={() => setIsCreateModalOpen(true)}>
                      첫 번째 대국 방 만들기
                    </Button>
                  </Paper>
                </Box>
              )}
            </Box>
          </Box>
        )}

        {/* 대국실 뷰 (GAME VIEW) */}
        {viewState === 'GAME' && currentRoom && (
          <Box sx={{ width: '100%' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Button startIcon={<ExitToAppIcon />} onClick={handleLeaveRoom} variant="outlined" color="error" sx={{ fontWeight: 800, borderRadius: '10px' }}>
                  🚪 방 나가기
                </Button>
                <Typography variant="h5" fontWeight={900} color="#38bdf8">
                  ⚔️ {currentRoom.title} (방 코드: {currentRoom.roomId})
                </Typography>
              </Stack>

              <Stack direction="row" spacing={1.5} alignItems="center">
                <FormControlLabel
                  control={<Switch checked={sandboxMode} onChange={(e) => setSandboxMode(e.target.checked)} color="warning" />}
                  label={<Typography variant="caption" color="#fb923c" fontWeight={700}>1인 자유연습 모드</Typography>}
                />

                {roomStatus === 'WAITING' ? (
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<PlayArrowIcon />}
                    onClick={handleStartGame}
                    sx={{ fontWeight: 800, borderRadius: '10px', px: 3, boxShadow: '0 0 20px rgba(16,185,129,0.5)' }}
                  >
                    ▶️ 대국 시작 (Start)
                  </Button>
                ) : (
                  <Chip label="🟢 대국 진행 중 (PLAYING)" color="success" sx={{ fontWeight: 900 }} />
                )}
              </Stack>
            </Stack>

            {/* 대칭형 3컬럼 반응형 레이아웃 */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '3.5fr 5fr 3.5fr' }, gap: 3, alignItems: 'start' }}>
              
              {/* [좌측 패널] */}
              <Paper sx={{ p: 2.5, borderRadius: '18px', bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Typography fontWeight={800} color={myTeam === TEAM.CHO ? '#34d399' : '#f87171'} mb={1}>
                  {myTeam === TEAM.CHO ? '🟢 초(楚)' : '🔴 한(漢)'} 내 플레이어 ({nickname})
                </Typography>
                <Typography variant="caption" color="#a1a1aa" display="block" mb={2}>
                  상차림: {FORMATION_INFO[myTeam === TEAM.CHO ? currentRoom.choFormation : currentRoom.hanFormation]?.name}
                </Typography>

                <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mb: 2 }} />

                <Typography fontWeight={700} color="#e4e4e7" mb={1} display="flex" alignItems="center" gap={1} variant="body2">
                  <ChatIcon fontSize="small" color="primary" /> 실시간 대국 채팅
                </Typography>

                <Box sx={{ height: 160, overflowY: 'auto', bgcolor: 'rgba(0,0,0,0.3)', p: 1.5, borderRadius: '10px', mb: 1.5 }}>
                  {chatMessages.map((msg, i) => (
                    <Typography key={i} variant="caption" display="block" color={msg.sender === nickname ? '#38bdf8' : '#e4e4e7'} sx={{ mb: 0.5 }}>
                      <b>{msg.sender}:</b> {msg.text}
                    </Typography>
                  ))}
                  <div ref={chatEndRef} />
                </Box>

                <form onSubmit={handleSendChat}>
                  <Stack direction="row" spacing={1}>
                    <TextField
                      size="small"
                      fullWidth
                      placeholder="실시간 대국 채팅..."
                      value={inputChat}
                      onChange={(e) => setInputChat(e.target.value)}
                      sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1.5, input: { color: '#fff' } }}
                    />
                    <IconButton type="submit" color="primary"><SendIcon /></IconButton>
                  </Stack>
                </form>
              </Paper>

              {/* [중앙 패널: 장기판] */}
              <Paper
                elevation={24}
                sx={{
                  position: 'relative',
                  p: { xs: 2, sm: 3 },
                  borderRadius: '24px',
                  background: 'linear-gradient(145deg, #1a1c23 0%, #111319 100%)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
                  width: '100%',
                  maxWidth: '560px',
                  mx: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  overflow: 'hidden'
                }}
              >
                {/* 준비 오버레이 */}
                {roomStatus === 'WAITING' && !sandboxMode && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      bgcolor: 'rgba(9,10,15,0.85)',
                      backdropFilter: 'blur(4px)',
                      zIndex: 30,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      p: 3,
                      textAlign: 'center'
                    }}
                  >
                    <Typography variant="h5" fontWeight={900} color="#fff" mb={1}>
                      ⏸️ 대국 시작 대기 중
                    </Typography>
                    <Typography variant="body2" color="#a1a1aa" mb={3}>
                      [대국 시작] 버튼을 누르면 즉시 착수가 활성화됩니다.
                    </Typography>
                    <Button
                      variant="contained"
                      color="success"
                      size="large"
                      startIcon={<PlayArrowIcon sx={{ fontSize: '2rem !important' }} />}
                      onClick={handleStartGame}
                      sx={{ py: 1.5, px: 4, borderRadius: '14px', fontWeight: 900, fontSize: '1.1rem', boxShadow: '0 0 30px rgba(16,185,129,0.6)' }}
                    >
                      ▶️ 대국 시작 (Start Game)
                    </Button>
                  </Box>
                )}

                {/* 장군 / 멍군 배너 */}
                {checkEffect && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '42%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      zIndex: 100,
                      py: 1.5,
                      px: 3.5,
                      borderRadius: '20px',
                      bgcolor: checkEffect.type === 'CHECK' ? 'rgba(225, 29, 72, 0.95)' : 'rgba(16, 185, 129, 0.95)',
                      color: '#fff',
                      whiteSpace: 'nowrap',
                      width: 'max-content',
                      animation: 'zoomPulse 0.35s ease-out forwards'
                    }}
                  >
                    <Typography variant="h4" fontWeight={900}>{checkEffect.text}</Typography>
                  </Box>
                )}

                {/* 턴 상태바 */}
                <Box sx={{ width: '100%', py: 1.2, px: 2.5, mb: 2, borderRadius: '14px', bgcolor: currentTurn === TEAM.CHO ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }}>
                  <Typography fontWeight={800} color={currentTurn === TEAM.CHO ? '#34d399' : '#f87171'} textAlign="center">
                    {currentTurn === TEAM.CHO ? '🟢 초(楚) 차례' : '🔴 한(漢) 차례'} {sandboxMode ? '(자유 연습 턴)' : currentTurn === myTeam ? '(내 턴!)' : '(상대방 턴)'}
                  </Typography>
                </Box>

                {/* 9x10 장기판 */}
                <Box sx={{ width: { xs: '310px', sm: '440px', md: '500px' }, height: { xs: '350px', sm: '490px', md: '550px' }, bgcolor: '#ba8847', borderRadius: '8px', p: '24px 20px', boxSizing: 'border-box' }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gridTemplateRows: 'repeat(10, 1fr)', width: '100%', height: '100%', position: 'relative' }}>
                    {board.map((row, y) =>
                      row.map((cell, x) => {
                        const isSelected = selectedPos && selectedPos.x === x && selectedPos.y === y;
                        const isLegalMove = legalMoves.some(m => m.x === x && m.y === y);
                        const disp = cell ? PIECE_DISPLAY[cell.team][cell.type] : null;

                        return (
                          <Box
                            key={`${x}-${y}`}
                            onClick={() => handleCellClick(x, y)}
                            sx={{
                              position: 'relative',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: (sandboxMode || roomStatus === 'PLAYING') ? 'pointer' : 'default',
                              '&::before': { content: '""', position: 'absolute', width: '100%', height: '1px', bgcolor: '#503316', top: '50%' },
                              '&::after': { content: '""', position: 'absolute', height: '100%', width: '1px', bgcolor: '#503316', left: '50%' }
                            }}
                          >
                            {isLegalMove && (
                              <Box sx={{ position: 'absolute', width: '18px', height: '18px', borderRadius: '50%', bgcolor: '#10b981', zIndex: 10 }} />
                            )}

                            {cell && disp && (
                              <Paper
                                elevation={6}
                                sx={{
                                  position: 'relative',
                                  zIndex: 8,
                                  width: { xs: '26px', sm: '34px', md: '40px' },
                                  height: { xs: '26px', sm: '34px', md: '40px' },
                                  borderRadius: '50%',
                                  bgcolor: disp.bg,
                                  border: `2px solid ${disp.color}`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxShadow: isSelected ? `0 0 20px ${disp.color}` : 'none'
                                }}
                              >
                                <Typography sx={{ fontWeight: 900, color: disp.color, fontSize: { xs: '0.78rem', sm: '1.05rem', md: '1.2rem' } }}>
                                  {disp.text}
                                </Typography>
                              </Paper>
                            )}
                          </Box>
                        );
                      })
                    )}
                  </Box>
                </Box>
              </Paper>

              {/* [우측 패널] */}
              <Paper sx={{ p: 2.5, borderRadius: '18px', bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Typography fontWeight={800} color={myTeam === TEAM.CHO ? '#f87171' : '#34d399'} mb={1}>
                  {myTeam === TEAM.CHO ? '🔴 한(漢)' : '🟢 초(楚)'} 상대 플레이어
                </Typography>
                <Typography variant="caption" color="#a1a1aa" display="block" mb={2}>
                  닉네임: <b>{myTeam === TEAM.CHO ? (currentRoom.hanNickname || '대기 중...') : (currentRoom.choNickname || '대기 중...')}</b>
                </Typography>

                <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mb: 2 }} />

                <Typography fontWeight={700} color="#e4e4e7" mb={1} display="flex" alignItems="center" gap={1} variant="body2">
                  <FormatListNumberedIcon fontSize="small" color="primary" /> 실시간 착수 기보
                </Typography>
                <Box sx={{ maxHeight: 180, overflowY: 'auto' }}>
                  {notationLogs.map((log, i) => (
                    <Typography key={i} variant="caption" display="block" color="#a1a1aa">
                      [{notationLogs.length - i}수] {log}
                    </Typography>
                  ))}
                </Box>
              </Paper>
            </Box>
          </Box>
        )}

      </Container>

      {/* 방 만들기 모달 */}
      <Dialog open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { bgcolor: '#12141c', color: '#fff', borderRadius: 4 } }}>
        <form onSubmit={handleCreateRoom}>
          <DialogTitle sx={{ fontWeight: 800 }}>➕ 실시간 1:1 대국 방 생성</DialogTitle>
          <DialogContent dividers sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            <Stack spacing={2.5} py={1}>
              <TextField
                label="대국 방 제목"
                fullWidth
                value={newRoomTitle}
                onChange={(e) => setNewRoomTitle(e.target.value)}
                placeholder="예: 온라인 장기 한 판 겨루실 분!"
                sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1.5, input: { color: '#fff' }, label: { color: '#a1a1aa' } }}
              />

              <Box>
                <Typography variant="caption" color="#a1a1aa" mb={1} display="block">선호 진영 선택:</Typography>
                <Stack direction="row" spacing={1.5}>
                  <Button variant={preferredTeam === TEAM.CHO ? 'contained' : 'outlined'} color="success" onClick={() => setPreferredTeam(TEAM.CHO)} fullWidth type="button">
                    🟢 초(楚) 선수
                  </Button>
                  <Button variant={preferredTeam === TEAM.HAN ? 'contained' : 'outlined'} color="error" onClick={() => setPreferredTeam(TEAM.HAN)} fullWidth type="button">
                    🔴 한(漢) 후수
                  </Button>
                </Stack>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setIsCreateModalOpen(false)} sx={{ color: '#a1a1aa' }} type="button">취소</Button>
            <Button type="submit" variant="contained" color="success" disabled={isCreating} sx={{ fontWeight: 800 }}>
              {isCreating ? '생성 중...' : '방 만들기'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 에러 스낵바 */}
      <Snackbar open={Boolean(errorMessage)} autoHideDuration={4000} onClose={() => setErrorMessage('')}>
        <Alert severity="error" sx={{ width: '100%' }}>{errorMessage}</Alert>
      </Snackbar>
    </Box>
  );
};

export default OnlineJanggiPage;
