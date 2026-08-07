import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box, Container, Typography, Button, Paper, Stack, Grid,
  Chip, Avatar, Tooltip, IconButton, Select, MenuItem, FormControl, InputLabel,
  Dialog, DialogTitle, DialogContent, DialogActions, LinearProgress, Divider,
  ToggleButtonGroup, ToggleButton, Tabs, Tab
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import UndoIcon from '@mui/icons-material/Undo';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PeopleIcon from '@mui/icons-material/People';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import FlagIcon from '@mui/icons-material/Flag';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import SettingsIcon from '@mui/icons-material/Settings';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ShieldIcon from '@mui/icons-material/Shield';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

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
    console.trace('Audio play error', e);
  }
};

/* ──────────────────────────────────────────────
   장기 기물 및 팀 정의
────────────────────────────────────────────── */
const TEAM = { CHO: 'CHO', HAN: 'HAN' };

const PIECE_TYPE = {
  KING: 'KING',     // 궁
  GUARD: 'GUARD',   // 사
  ROOK: 'ROOK',     // 차
  CANNON: 'CANNON', // 포
  KNIGHT: 'KNIGHT', // 마
  ELEPHANT: 'ELEPHANT', // 상
  PAWN: 'PAWN'      // 졸/병
};

const PIECE_SCORE = {
  KING: 0,
  ROOK: 13,
  CANNON: 7,
  KNIGHT: 5,
  GUARD: 3,
  ELEPHANT: 3,
  PAWN: 2
};

const PIECE_DISPLAY = {
  CHO: {
    KING: { text: '楚', color: '#10b981', bg: '#044e37', name: '초 궁' },
    GUARD: { text: '士', color: '#34d399', bg: '#065f46', name: '초 사' },
    ROOK: { text: '車', color: '#38bdf8', bg: '#0c4a6e', name: '초 차' },
    CANNON: { text: '包', color: '#a7f3d0', bg: '#047857', name: '초 포' },
    KNIGHT: { text: '馬', color: '#6ee7b7', bg: '#065f46', name: '초 마' },
    ELEPHANT: { text: '象', color: '#a7f3d0', bg: '#047857', name: '초 상' },
    PAWN: { text: '卒', color: '#34d399', bg: '#065f46', name: '초 졸' }
  },
  HAN: {
    KING: { text: '漢', color: '#f87171', bg: '#6b1313', name: '한 궁' },
    GUARD: { text: '士', color: '#fca5a5', bg: '#881313', name: '한 사' },
    ROOK: { text: '車', color: '#fb923c', bg: '#7c2d12', name: '한 차' },
    CANNON: { text: '包', color: '#fca5a5', bg: '#991b1b', name: '한 포' },
    KNIGHT: { text: '馬', color: '#fca5a5', bg: '#881313', name: '한 마' },
    ELEPHANT: { text: '象', color: '#fca5a5', bg: '#881313', name: '한 상' },
    PAWN: { text: '兵', color: '#f87171', bg: '#6b1313', name: '한 병' }
  }
};

const FORMATION_TYPES = {
  N_E_N_E: 'N_E_N_E',
  E_N_N_E: 'E_N_N_E',
  N_E_E_N: 'N_E_E_N',
  E_N_E_N: 'E_N_E_N'
};

const FORMATION_INFO = {
  N_E_N_E: {
    name: '마 - 상 - 마 - 상',
    badge: '⭐ 표준 추천형',
    desc: '공수 균형이 가장 뛰어난 장기 기사들의 정석 차림',
    pattern: ['車', '馬', '象', '士', '士', '馬', '象', '車']
  },
  E_N_N_E: {
    name: '상 - 마 - 마 - 상',
    badge: '🛡️ 중앙 안상형',
    desc: '중앙에 마(馬) 2개가 모여 견고한 수비와 중앙 방어에 유리',
    pattern: ['車', '象', '馬', '士', '士', '馬', '象', '車']
  },
  N_E_E_N: {
    name: '마 - 상 - 상 - 마',
    badge: '⚔️ 바깥상형',
    desc: '측면에 마(馬)가 배치되어 사이드 측면 기습 공격에 유용',
    pattern: ['車', '馬', '象', '士', '士', '象', '馬', '車']
  },
  E_N_E_N: {
    name: '상 - 마 - 상 - 마',
    badge: '🔥 엇상 공격형',
    desc: '좌우 상과 마가 엇갈려 예측 불가능한 기습 진형 구축',
    pattern: ['車', '象', '馬', '士', '士', '象', '馬', '車']
  }
};

const getFormationPieces = (type) => {
  switch (type) {
    case FORMATION_TYPES.E_N_N_E:
      return [PIECE_TYPE.ELEPHANT, PIECE_TYPE.KNIGHT, PIECE_TYPE.KNIGHT, PIECE_TYPE.ELEPHANT];
    case FORMATION_TYPES.N_E_E_N:
      return [PIECE_TYPE.KNIGHT, PIECE_TYPE.ELEPHANT, PIECE_TYPE.ELEPHANT, PIECE_TYPE.KNIGHT];
    case FORMATION_TYPES.E_N_E_N:
      return [PIECE_TYPE.ELEPHANT, PIECE_TYPE.KNIGHT, PIECE_TYPE.ELEPHANT, PIECE_TYPE.KNIGHT];
    case FORMATION_TYPES.N_E_N_E:
    default:
      return [PIECE_TYPE.KNIGHT, PIECE_TYPE.ELEPHANT, PIECE_TYPE.KNIGHT, PIECE_TYPE.ELEPHANT];
  }
};

const createBoardWithFormations = (choFormation = FORMATION_TYPES.N_E_N_E, hanFormation = FORMATION_TYPES.N_E_N_E) => {
  const board = Array(10).fill(null).map(() => Array(9).fill(null));

  const hanBack = getFormationPieces(hanFormation);
  const choBack = getFormationPieces(choFormation);

  // HAN (y=0~3)
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

  // CHO (y=6~9)
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

const isInPalace = (x, y) => {
  if (x < 3 || x > 5) return false;
  return (y >= 0 && y <= 2) || (y >= 7 && y <= 9);
};

const PALACE_DIAGONAL_MOVES = {
  '3,0': [{ x: 4, y: 1 }],
  '5,0': [{ x: 4, y: 1 }],
  '4,1': [{ x: 3, y: 0 }, { x: 5, y: 0 }, { x: 3, y: 2 }, { x: 5, y: 2 }],
  '3,2': [{ x: 4, y: 1 }],
  '5,2': [{ x: 4, y: 1 }],
  '3,7': [{ x: 4, y: 8 }],
  '5,7': [{ x: 4, y: 8 }],
  '4,8': [{ x: 3, y: 7 }, { x: 5, y: 7 }, { x: 3, y: 9 }, { x: 5, y: 9 }],
  '3,9': [{ x: 4, y: 8 }],
  '5,9': [{ x: 4, y: 8 }]
};

const getLegalMoves = (board, fromX, fromY) => {
  const piece = board[fromY][fromX];
  if (!piece) return [];

  const moves = [];
  const team = piece.team;

  const addMoveIfValid = (tx, ty) => {
    if (tx < 0 || tx > 8 || ty < 0 || ty > 9) return false;
    const target = board[ty][tx];
    if (!target) {
      moves.push({ x: tx, y: ty });
      return true;
    }
    if (target.team !== team) {
      moves.push({ x: tx, y: ty });
      return false;
    }
    return false;
  };

  switch (piece.type) {
    case PIECE_TYPE.KING:
    case PIECE_TYPE.GUARD: {
      const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
      dirs.forEach(([dx, dy]) => {
        const nx = fromX + dx;
        const ny = fromY + dy;
        if (isInPalace(nx, ny) && (ny <= 2 ? fromY <= 2 : fromY >= 7)) {
          addMoveIfValid(nx, ny);
        }
      });
      const diagKey = `${fromX},${fromY}`;
      if (PALACE_DIAGONAL_MOVES[diagKey]) {
        PALACE_DIAGONAL_MOVES[diagKey].forEach(pos => {
          addMoveIfValid(pos.x, pos.y);
        });
      }
      break;
    }

    case PIECE_TYPE.ROOK: {
      const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
      dirs.forEach(([dx, dy]) => {
        let step = 1;
        while (true) {
          const nx = fromX + dx * step;
          const ny = fromY + dy * step;
          if (nx < 0 || nx > 8 || ny < 0 || ny > 9) break;
          const canContinue = addMoveIfValid(nx, ny);
          if (!canContinue) break;
          step++;
        }
      });
      const diagKey = `${fromX},${fromY}`;
      if (PALACE_DIAGONAL_MOVES[diagKey]) {
        PALACE_DIAGONAL_MOVES[diagKey].forEach(pos => {
          if (addMoveIfValid(pos.x, pos.y)) {
            if (`${pos.x},${pos.y}` in PALACE_DIAGONAL_MOVES) {
              const centerDiag = PALACE_DIAGONAL_MOVES[`${pos.x},${pos.y}`];
              centerDiag.forEach(far => {
                if (far.x !== fromX && far.y !== fromY) {
                  addMoveIfValid(far.x, far.y);
                }
              });
            }
          }
        });
      }
      break;
    }

    case PIECE_TYPE.CANNON: {
      const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
      dirs.forEach(([dx, dy]) => {
        let step = 1;
        let foundScreen = false;
        while (true) {
          const nx = fromX + dx * step;
          const ny = fromY + dy * step;
          if (nx < 0 || nx > 8 || ny < 0 || ny > 9) break;
          const target = board[ny][nx];
          if (!foundScreen) {
            if (target) {
              if (target.type === PIECE_TYPE.CANNON) break;
              foundScreen = true;
            }
          } else {
            if (!target) {
              moves.push({ x: nx, y: ny });
            } else {
              if (target.team !== team && target.type !== PIECE_TYPE.CANNON) {
                moves.push({ x: nx, y: ny });
              }
              break;
            }
          }
          step++;
        }
      });
      break;
    }

    case PIECE_TYPE.KNIGHT: {
      const knightMoves = [
        { dir: [0, -1], landing: [[-1, -2], [1, -2]] },
        { dir: [0, 1],  landing: [[-1, 2], [1, 2]] },
        { dir: [-1, 0], landing: [[-2, -1], [-2, 1]] },
        { dir: [1, 0],  landing: [[2, -1], [2, 1]] }
      ];
      knightMoves.forEach(({ dir, landing }) => {
        const mx = fromX + dir[0];
        const my = fromY + dir[1];
        if (mx >= 0 && mx <= 8 && my >= 0 && my <= 9) {
          if (!board[my][mx]) {
            landing.forEach(([lx, ly]) => {
              addMoveIfValid(fromX + lx, fromY + ly);
            });
          }
        }
      });
      break;
    }

    case PIECE_TYPE.ELEPHANT: {
      const elephantMoves = [
        { dir: [0, -1], diag1: [-1, -2], landing: [-2, -3], diag1_2: [1, -2], landing_2: [2, -3] },
        { dir: [0, 1],  diag1: [-1, 2], landing: [-2, 3], diag1_2: [1, 2], landing_2: [2, 3] },
        { dir: [-1, 0], diag1: [-2, -1], landing: [-3, -2], diag1_2: [-3, 2] },
        { dir: [1, 0],  diag1: [2, -1], landing: [3, -2], diag1_2: [2, 1], landing_2: [3, 2] }
      ];
      elephantMoves.forEach(m => {
        const step1X = fromX + m.dir[0];
        const step1Y = fromY + m.dir[1];
        if (step1X >= 0 && step1X <= 8 && step1Y >= 0 && step1Y <= 9 && !board[step1Y][step1X]) {
          const d1X = fromX + m.diag1[0];
          const d1Y = fromY + m.diag1[1];
          if (d1X >= 0 && d1X <= 8 && d1Y >= 0 && d1Y <= 9 && !board[d1Y][d1X]) {
            addMoveIfValid(fromX + m.landing[0], fromY + m.landing[1]);
          }
          const d2X = fromX + m.diag1_2[0];
          const d2Y = fromY + m.diag1_2[1];
          if (d2X >= 0 && d2X <= 8 && d2Y >= 0 && d2Y <= 9 && !board[d2Y][d2X]) {
            addMoveIfValid(fromX + m.landing_2[0], fromY + m.landing_2[1]);
          }
        }
      });
      break;
    }

    case PIECE_TYPE.PAWN: {
      const forwardDir = team === TEAM.CHO ? -1 : 1;
      const dirs = [[0, forwardDir], [-1, 0], [1, 0]];
      dirs.forEach(([dx, dy]) => {
        addMoveIfValid(fromX + dx, fromY + dy);
      });
      const diagKey = `${fromX},${fromY}`;
      if (PALACE_DIAGONAL_MOVES[diagKey]) {
        PALACE_DIAGONAL_MOVES[diagKey].forEach(pos => {
          if ((team === TEAM.CHO && pos.y < fromY) || (team === TEAM.HAN && pos.y > fromY)) {
            addMoveIfValid(pos.x, pos.y);
          }
        });
      }
      break;
    }

    default:
      break;
  }

  return moves;
};

const isKingInCheck = (board, team) => {
  let kingX = -1, kingY = -1;
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 9; x++) {
      const p = board[y][x];
      if (p && p.team === team && p.type === PIECE_TYPE.KING) {
        kingX = x;
        kingY = y;
        break;
      }
    }
  }
  if (kingX === -1) return false;

  const enemyTeam = team === TEAM.CHO ? TEAM.HAN : TEAM.CHO;
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 9; x++) {
      const p = board[y][x];
      if (p && p.team === enemyTeam) {
        const moves = getLegalMoves(board, x, y);
        if (moves.some(m => m.x === kingX && m.y === kingY)) {
          return true;
        }
      }
    }
  }
  return false;
};

const calculateScores = (board) => {
  let choScore = 0;
  let hanScore = 1.5;

  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 9; x++) {
      const p = board[y][x];
      if (p) {
        const pts = PIECE_SCORE[p.type] || 0;
        if (p.team === TEAM.CHO) {
          choScore += pts;
        } else {
          hanScore += pts;
        }
      }
    }
  }

  return { choScore, hanScore };
};

const formatNotation = (turn, fromX, fromY, toX, toY, piece, captured) => {
  const teamPrefix = turn === TEAM.CHO ? '楚' : '漢';
  const pieceName = PIECE_DISPLAY[turn][piece.type].text;
  const fromStr = `${fromX}${fromY}`;
  const toStr = `${toX}${toY}`;
  const capStr = captured ? ` (x${PIECE_DISPLAY[captured.team][captured.type].text})` : '';
  return `${teamPrefix} ${fromStr}${pieceName} ➔ ${toStr}${capStr}`;
};

const evaluateBoard = (board, aiTeam) => {
  const { choScore, hanScore } = calculateScores(board);
  return aiTeam === TEAM.HAN ? (hanScore - choScore) * 10 : (choScore - hanScore) * 10;
};

const minimax = (board, depth, alpha, beta, isMaximizing, aiTeam) => {
  if (depth === 0) {
    return { score: evaluateBoard(board, aiTeam) };
  }

  let bestMove = null;
  const currentTeam = isMaximizing ? aiTeam : (aiTeam === TEAM.CHO ? TEAM.HAN : TEAM.CHO);

  const allMoves = [];
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 9; x++) {
      const p = board[y][x];
      if (p && p.team === currentTeam) {
        const legal = getLegalMoves(board, x, y);
        legal.forEach(m => {
          allMoves.push({ from: { x, y }, to: m, piece: p });
        });
      }
    }
  }

  if (allMoves.length === 0) {
    return { score: isMaximizing ? -99999 : 99999 };
  }

  allMoves.sort(() => Math.random() - 0.5);

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of allMoves) {
      const newBoard = board.map(row => [...row]);
      newBoard[move.to.y][move.to.x] = newBoard[move.from.y][move.from.x];
      newBoard[move.from.y][move.from.x] = null;

      const evalRes = minimax(newBoard, depth - 1, alpha, beta, false, aiTeam);
      if (evalRes.score > maxEval) {
        maxEval = evalRes.score;
        bestMove = move;
      }
      alpha = Math.max(alpha, evalRes.score);
      if (beta <= alpha) break;
    }
    return { score: maxEval, move: bestMove };
  } else {
    let minEval = Infinity;
    for (const move of allMoves) {
      const newBoard = board.map(row => [...row]);
      newBoard[move.to.y][move.to.x] = newBoard[move.from.y][move.from.x];
      newBoard[move.from.y][move.from.x] = null;

      const evalRes = minimax(newBoard, depth - 1, alpha, beta, true, aiTeam);
      if (evalRes.score < minEval) {
        minEval = evalRes.score;
        bestMove = move;
      }
      beta = Math.min(beta, evalRes.score);
      if (beta <= alpha) break;
    }
    return { score: minEval, move: bestMove };
  }
};

/* ──────────────────────────────────────────────
   장기 메인 페이지 컴포넌트
────────────────────────────────────────────── */
const JanggiPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [playerTeam, setPlayerTeam] = useState(TEAM.CHO);

  const [choFormation, setChoFormation] = useState(FORMATION_TYPES.N_E_N_E);
  const [hanFormation, setHanFormation] = useState(FORMATION_TYPES.N_E_N_E);

  const [overlayTab, setOverlayTab] = useState(0);
  const [isSetupOpen, setIsSetupOpen] = useState(false);

  const [board, setBoard] = useState(() => createBoardWithFormations(FORMATION_TYPES.N_E_N_E, FORMATION_TYPES.N_E_N_E));
  const [currentTurn, setCurrentTurn] = useState(TEAM.CHO);
  const [selectedPos, setSelectedPos] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [gameMode, setGameMode] = useState('AI');
  const [aiDifficulty, setAiDifficulty] = useState('NORMAL');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [capturedHan, setCapturedHan] = useState([]);
  const [capturedCho, setCapturedCho] = useState([]);
  const [moveHistory, setMoveHistory] = useState([]);
  const [notationLogs, setNotationLogs] = useState([]);

  const [gameStatus, setGameStatus] = useState('READY');
  const [statusMessage, setStatusMessage] = useState('');
  const [isCheck, setIsCheck] = useState(false);

  // ★ [장군 / 멍군] 대형 이펙트 배너 상태
  const [checkEffect, setCheckEffect] = useState(null);

  const [timeLeft, setTimeLeft] = useState(30);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);

  const { choScore, hanScore } = calculateScores(board);

  // 배너 자동 소멸 타이머 (1.2초 후)
  useEffect(() => {
    if (checkEffect) {
      const timer = setTimeout(() => {
        setCheckEffect(null);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [checkEffect]);

  // 상차림 선택 핸들러
  const handleFormationSelect = (targetTeam, formType) => {
    let nextCho = choFormation;
    let nextHan = hanFormation;
    if (targetTeam === TEAM.CHO) {
      nextCho = formType;
      setChoFormation(formType);
    } else {
      nextHan = formType;
      setHanFormation(formType);
    }
    setBoard(createBoardWithFormations(nextCho, nextHan));
  };

  // 대국 시작
  const handleStartGame = () => {
    setGameStatus('PLAYING');
    setTimeLeft(30);
    const startMsg = playerTeam === TEAM.CHO
      ? '대국이 시작되었습니다. 유저(楚 - 선제 공격) 차례입니다.'
      : '대국이 시작되었습니다. AI(楚 - 선제 공격)가 먼저 착수합니다.';
    setStatusMessage(startMsg);
    playSound('move', soundEnabled);
  };

  // 턴 타이머
  useEffect(() => {
    if (gameStatus !== 'PLAYING' || isAiThinking) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handlePassTurn();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentTurn, gameStatus, isAiThinking]);

  // 대국 시작 / 재시작 처리
  const handleRestart = (newChoForm = choFormation, newHanForm = hanFormation) => {
    setBoard(createBoardWithFormations(newChoForm, newHanForm));
    setCurrentTurn(TEAM.CHO);
    setSelectedPos(null);
    setLegalMoves([]);
    setLastMove(null);
    setCapturedHan([]);
    setCapturedCho([]);
    setMoveHistory([]);
    setNotationLogs([]);
    setGameStatus('READY');
    setStatusMessage('');
    setIsCheck(false);
    setCheckEffect(null);
    setTimeLeft(30);
    setIsSetupOpen(false);
  };

  // 한수 쉬기 (Pass)
  const handlePassTurn = () => {
    if (gameStatus !== 'PLAYING' || isAiThinking) return;

    const passNotation = `${currentTurn === TEAM.CHO ? '楚' : '漢'} 한수 쉬기 (Pass)`;
    setNotationLogs(prev => [passNotation, ...prev]);
    playSound('move', soundEnabled);

    setCurrentTurn(prevTurn => (prevTurn === TEAM.CHO ? TEAM.HAN : TEAM.CHO));
    setSelectedPos(null);
    setLegalMoves([]);
    setTimeLeft(30);
  };

  // 기권 (Resign)
  const handleResign = () => {
    if (gameStatus !== 'PLAYING') return;
    const winner = currentTurn === TEAM.CHO ? TEAM.HAN : TEAM.CHO;
    setGameStatus(winner === TEAM.CHO ? 'CHO_WIN' : 'HAN_WIN');
    setStatusMessage(winner === TEAM.CHO ? '🏁 한(漢) 기권으로 초(楚) 승리입니다!' : '🏁 초(楚) 기권으로 한(漢) 승리입니다!');
    playSound('win', soundEnabled);
  };

  // 수 되물리기 (Undo)
  const handleUndo = () => {
    if (moveHistory.length === 0 || isAiThinking) return;
    const stepsToUndo = (gameMode === 'AI' && moveHistory.length >= 2) ? 2 : 1;
    let prevHistory = [...moveHistory];
    let prevNotations = [...notationLogs];
    let targetState = null;

    for (let i = 0; i < stepsToUndo; i++) {
      targetState = prevHistory.pop();
      prevNotations.shift();
    }

    if (targetState) {
      setBoard(targetState.board);
      setCurrentTurn(targetState.turn);
      setCapturedHan(targetState.capturedHan);
      setCapturedCho(targetState.capturedCho);
      setLastMove(targetState.lastMove);
      setSelectedPos(null);
      setLegalMoves([]);
      setMoveHistory(prevHistory);
      setNotationLogs(prevNotations);
      setGameStatus('PLAYING');
      setStatusMessage('');
      setIsCheck(false);
      setCheckEffect(null);
      setTimeLeft(30);
    }
  };

  // 착수 실행 메소드
  const makeMove = useCallback((fromX, fromY, toX, toY) => {
    setBoard(prevBoard => {
      const newBoard = prevBoard.map(row => [...row]);
      const movingPiece = newBoard[fromY][fromX];
      const targetPiece = newBoard[toY][toX];

      if (targetPiece) {
        playSound('capture', soundEnabled);
        if (targetPiece.team === TEAM.HAN) {
          setCapturedHan(prev => [...prev, targetPiece]);
        } else {
          setCapturedCho(prev => [...prev, targetPiece]);
        }

        if (targetPiece.type === PIECE_TYPE.KING) {
          setGameStatus(movingPiece.team === TEAM.CHO ? 'CHO_WIN' : 'HAN_WIN');
          setStatusMessage(movingPiece.team === TEAM.CHO ? '🎉 초(楚) 외통승! 한(漢)의 궁을 잡았습니다.' : '🎉 한(漢) 외통승! 초(楚)의 궁을 잡았습니다.');
          playSound('win', soundEnabled);
        }
      } else {
        playSound('move', soundEnabled);
      }

      newBoard[toY][toX] = movingPiece;
      newBoard[fromY][fromX] = null;

      const notation = formatNotation(movingPiece.team, fromX, fromY, toX, toY, movingPiece, targetPiece);
      setNotationLogs(prev => [notation, ...prev]);

      const movingTeam = movingPiece.team;
      const enemyTeam = movingTeam === TEAM.CHO ? TEAM.HAN : TEAM.CHO;

      // ★ [엄격한 장군/멍군 수비 판정 알고리즘]
      // 1) 착수한 팀(movingTeam)의 궁이 더 이상 장군 상태가 아닌가? (수비 완벽 성공)
      const myKingNowSafe = !isKingInCheck(newBoard, movingTeam);

      // 2) 착수 결과 상대 팀(enemyTeam)의 궁이 장군에 걸렸는가?
      const enemyKingInCheck = isKingInCheck(newBoard, enemyTeam);

      setIsCheck(enemyKingInCheck);

      if (enemyKingInCheck) {
        if (isCheck && myKingNowSafe) {
          // 장군 상태에서 내 궁을 수비하면서 동시에 상대에게 역장군을 친 경우 -> "⚡ 멍군 장군!"
          setCheckEffect({ text: '⚡ 멍군 장군!', type: 'CHECK' });
        } else {
          // 일점 장군
          setCheckEffect({ text: '🚨 장군!', type: 'CHECK' });
        }
        playSound('check', soundEnabled);
        setStatusMessage(`🚨 ${enemyTeam === TEAM.CHO ? '초(楚)' : '한(漢)'} 장군입니다!`);
      } else if (isCheck && myKingNowSafe) {
        // ★ 이전 턴에 내 궁이 장군 위협에 처했었고, 이번 착수로 내 궁을 안전하게 피하거나 막아서 장군을 해소함 -> 오직 이때만 "🛡️ 멍군!"
        setCheckEffect({ text: '🛡️ 멍군!', type: 'MEONG' });
        playSound('meong', soundEnabled);
        setStatusMessage('');
      } else {
        setStatusMessage('');
      }

      setMoveHistory(prev => [
        ...prev,
        {
          board: prevBoard,
          turn: currentTurn,
          capturedHan,
          capturedCho,
          lastMove: { from: { x: fromX, y: fromY }, to: { x: toX, y: toY } }
        }
      ]);

      setLastMove({ from: { x: fromX, y: fromY }, to: { x: toX, y: toY } });
      setSelectedPos(null);
      setLegalMoves([]);
      setTimeLeft(30);

      setCurrentTurn(enemyTeam);
      return newBoard;
    });
  }, [currentTurn, capturedHan, capturedCho, soundEnabled, isCheck]);

  // 셀 클릭 핸들러
  const handleCellClick = (x, y) => {
    if (gameStatus !== 'PLAYING' || isAiThinking) return;
    if (gameMode === 'AI' && currentTurn !== playerTeam) return;

    const clickedPiece = board[y][x];

    if (selectedPos) {
      const isLegal = legalMoves.some(m => m.x === x && m.y === y);
      if (isLegal) {
        makeMove(selectedPos.x, selectedPos.y, x, y);
        return;
      }
    }

    if (clickedPiece && clickedPiece.team === currentTurn) {
      setSelectedPos({ x, y });
      const moves = getLegalMoves(board, x, y);
      setLegalMoves(moves);
    } else {
      setSelectedPos(null);
      setLegalMoves([]);
    }
  };

  // AI 자동 착수
  useEffect(() => {
    const aiTeam = playerTeam === TEAM.CHO ? TEAM.HAN : TEAM.CHO;

    if (gameMode === 'AI' && currentTurn === aiTeam && gameStatus === 'PLAYING') {
      setIsAiThinking(true);
      const depth = aiDifficulty === 'EASY' ? 1 : aiDifficulty === 'NORMAL' ? 2 : 3;

      const timer = setTimeout(() => {
        const isMaximizing = aiTeam === TEAM.HAN;
        const result = minimax(board, depth, -Infinity, Infinity, isMaximizing, aiTeam);
        if (result && result.move) {
          const { from, to } = result.move;
          makeMove(from.x, from.y, to.x, to.y);
        } else {
          setStatusMessage(`${aiTeam === TEAM.CHO ? '초(楚)' : '한(漢)'} AI가 둘 수가 없어 한수 쉼 처리합니다.`);
          handlePassTurn();
        }
        setIsAiThinking(false);
      }, 700);

      return () => clearTimeout(timer);
    }
  }, [currentTurn, gameMode, gameStatus, board, aiDifficulty, playerTeam, makeMove]);

  const opponentTeam = playerTeam === TEAM.CHO ? TEAM.HAN : TEAM.CHO;

  return (
    <Box sx={{ minHeight: 'calc(100vh - 64px)', bgcolor: '#090a0f', color: '#fff', py: 4, px: { xs: 2, md: 4 }, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* 1400px 수평 중앙 정렬 컨테이너 */}
      <Container maxWidth="xl" sx={{ width: '100%', maxWidth: '1400px !important', mx: 'auto', px: { xs: 1, sm: 2, md: 3 } }}>
        
        {/* 상단 툴바 */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3.5} flexWrap="wrap" gap={2} sx={{ width: '100%' }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/')}
              sx={{ color: '#a1a1aa', '&:hover': { color: '#fff' } }}
            >
              메인으로
            </Button>
            <Typography variant="h4" fontWeight={800} sx={{ background: 'linear-gradient(135deg,#34d399,#38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              🩵 정통 장기 (Janggi v2.0)
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" gap={1}>
            <IconButton onClick={() => setSoundEnabled(!soundEnabled)} sx={{ color: soundEnabled ? '#34d399' : '#71717a' }}>
              {soundEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
            </IconButton>

            {/* 내 진영 선택 토글 */}
            <ToggleButtonGroup
              value={playerTeam}
              exclusive
              onChange={(e, newTeam) => { if (newTeam) { setPlayerTeam(newTeam); handleRestart(); } }}
              disabled={gameStatus === 'PLAYING'}
              size="small"
              sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}
            >
              <ToggleButton value={TEAM.CHO} sx={{ color: '#34d399', '&.Mui-selected': { bgcolor: 'rgba(16,185,129,0.2)', color: '#34d399', fontWeight: 800 } }}>
                🟢 초(楚) 선수
              </ToggleButton>
              <ToggleButton value={TEAM.HAN} sx={{ color: '#f87171', '&.Mui-selected': { bgcolor: 'rgba(239,68,68,0.2)', color: '#f87171', fontWeight: 800 } }}>
                🔴 한(漢) 후수연습
              </ToggleButton>
            </ToggleButtonGroup>

            <FormControl size="small" sx={{ minWidth: 110, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
              <Select
                value={gameMode}
                onChange={(e) => { setGameMode(e.target.value); handleRestart(); }}
                disabled={gameStatus === 'PLAYING'}
                sx={{ color: '#fff', '.MuiSelect-icon': { color: '#fff' } }}
              >
                <MenuItem value="AI">🤖 AI 대국</MenuItem>
                <MenuItem value="2P">👥 2인 대국</MenuItem>
              </Select>
            </FormControl>

            {gameMode === 'AI' && (
              <FormControl size="small" sx={{ minWidth: 100, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                <Select
                  value={aiDifficulty}
                  onChange={(e) => setAiDifficulty(e.target.value)}
                  disabled={gameStatus === 'PLAYING'}
                  sx={{ color: '#fff', '.MuiSelect-icon': { color: '#fff' } }}
                >
                  <MenuItem value="EASY">쉬움 (D1)</MenuItem>
                  <MenuItem value="NORMAL">보통 (D2)</MenuItem>
                  <MenuItem value="HARD">어려움 (D3)</MenuItem>
                </Select>
              </FormControl>
            )}

            <Button
              variant="outlined"
              color="info"
              startIcon={<SettingsIcon />}
              onClick={() => setIsSetupOpen(true)}
              disabled={gameStatus === 'PLAYING'}
              sx={{ borderRadius: '10px' }}
            >
              상차림 상세설정
            </Button>

            {gameStatus === 'READY' ? (
              <Button
                variant="contained"
                color="success"
                startIcon={<PlayArrowIcon />}
                onClick={handleStartGame}
                sx={{
                  borderRadius: '10px',
                  px: 3,
                  py: 1,
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  boxShadow: '0 0 20px rgba(16,185,129,0.4)',
                  '&:hover': { transform: 'scale(1.03)', boxShadow: '0 0 30px rgba(16,185,129,0.6)' }
                }}
              >
                ▶️ 대국 시작 (Start)
              </Button>
            ) : (
              <>
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<UndoIcon />}
                  onClick={handleUndo}
                  disabled={moveHistory.length === 0 || isAiThinking}
                  sx={{ borderRadius: '10px' }}
                >
                  무르기
                </Button>

                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={<PauseCircleIcon />}
                  onClick={handlePassTurn}
                  disabled={gameStatus !== 'PLAYING' || isAiThinking}
                  sx={{ borderRadius: '10px' }}
                >
                  한수 쉬기
                </Button>

                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<FlagIcon />}
                  onClick={handleResign}
                  disabled={gameStatus !== 'PLAYING'}
                  sx={{ borderRadius: '10px' }}
                >
                  기권
                </Button>

                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<RestartAltIcon />}
                  onClick={() => handleRestart()}
                  sx={{ borderRadius: '10px', background: 'linear-gradient(135deg, #10b981, #059669)' }}
                >
                  재시작
                </Button>
              </>
            )}
          </Stack>
        </Stack>

        {/* 대칭형 3컬럼 반응형 그리드 */}
        <Grid container spacing={3} justifyContent="center" alignItems="flex-start" sx={{ width: '100%', mx: 'auto' }}>
          
          {/* [좌측 컬럼] (lg={3.5}) */}
          <Grid item xs={12} md={4} lg={3.5}>
            <Stack spacing={2.5}>
              <Paper sx={{ p: 2.5, borderRadius: '18px', bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Avatar sx={{ bgcolor: playerTeam === TEAM.CHO ? '#044e37' : '#6b1313', border: `2px solid ${playerTeam === TEAM.CHO ? '#34d399' : '#f87171'}`, width: 40, height: 40, fontWeight: 900 }}>
                      {playerTeam === TEAM.CHO ? '楚' : '漢'}
                    </Avatar>
                    <Box>
                      <Typography fontWeight={800} color={playerTeam === TEAM.CHO ? '#34d399' : '#f87171'} variant="body1">
                        {playerTeam === TEAM.CHO ? '초(楚) 진영' : '한(漢) 진영'} [내 진영]
                      </Typography>
                      <Typography variant="caption" color="#a1a1aa">
                        상차림: {FORMATION_INFO[playerTeam === TEAM.CHO ? choFormation : hanFormation].name}
                      </Typography>
                    </Box>
                  </Stack>
                  <Chip label={`${playerTeam === TEAM.CHO ? choScore : hanScore}점`} size="small" sx={{ bgcolor: playerTeam === TEAM.CHO ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)', color: playerTeam === TEAM.CHO ? '#34d399' : '#f87171', fontWeight: 800 }} />
                </Stack>

                <Typography variant="caption" color="#71717a" mb={1} display="block">내가 잡은 상대 기물:</Typography>
                <Stack direction="row" flexWrap="wrap" gap={0.6}>
                  {(playerTeam === TEAM.CHO ? capturedHan : capturedCho).map((p, idx) => (
                    <Chip key={idx} label={PIECE_DISPLAY[p.team][p.type].text} size="small" sx={{ bgcolor: p.team === TEAM.CHO ? '#065f46' : '#6b1313', color: p.team === TEAM.CHO ? '#34d399' : '#f87171', fontWeight: 800, height: 22 }} />
                  ))}
                </Stack>
              </Paper>

              <Button
                variant="outlined"
                startIcon={<HelpOutlineIcon />}
                onClick={() => setIsRuleModalOpen(true)}
                sx={{ borderRadius: '12px', borderColor: 'rgba(255,255,255,0.15)', color: '#a1a1aa', py: 1.2 }}
              >
                장기 정통 규칙 & 기물 이동 설명서
              </Button>
            </Stack>
          </Grid>

          {/* [중앙 컬럼: 장기판] (lg={5}) */}
          <Grid item xs={12} md={8} lg={5} display="flex" justifyContent="center">
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
              {/* ★ [장군 / 멍군] 줄바꿈 없이 한 줄로 나오는 3D 대형 이펙트 배너 */}
              {checkEffect && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: '42%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 100,
                    pointerEvents: 'none',
                    py: 1.5,
                    px: 3.5,
                    borderRadius: '20px',
                    bgcolor: checkEffect.type === 'CHECK' ? 'rgba(225, 29, 72, 0.95)' : 'rgba(16, 185, 129, 0.95)',
                    color: '#fff',
                    boxShadow: checkEffect.type === 'CHECK' ? '0 0 50px rgba(225,29,72,0.9), 0 0 100px rgba(239,68,68,0.6)' : '0 0 50px rgba(16,185,129,0.9), 0 0 100px rgba(52,211,153,0.6)',
                    backdropFilter: 'blur(10px)',
                    border: `2px solid ${checkEffect.type === 'CHECK' ? '#f43f5e' : '#34d399'}`,
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1.5,
                    whiteSpace: 'nowrap',
                    width: 'max-content',
                    minWidth: 'auto',
                    animation: 'zoomPulse 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
                    '@keyframes zoomPulse': {
                      '0%': { transform: 'translate(-50%, -50%) scale(0.3)', opacity: 0 },
                      '70%': { transform: 'translate(-50%, -50%) scale(1.15)', opacity: 1 },
                      '100%': { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 }
                    }
                  }}
                >
                  {checkEffect.type === 'CHECK' ? <WarningAmberIcon sx={{ fontSize: '2.4rem', color: '#fef08a' }} /> : <ShieldIcon sx={{ fontSize: '2.4rem', color: '#a7f3d0' }} />}
                  <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: '3px', whiteSpace: 'nowrap', textShadow: '0 2px 10px rgba(0,0,0,0.6)', lineHeight: 1 }}>
                    {checkEffect.text}
                  </Typography>
                </Box>
              )}

              {/* 상단 턴/타이머 상태바 */}
              <Box
                sx={{
                  width: '100%',
                  py: 1.2,
                  px: 2.5,
                  mb: 2,
                  borderRadius: '14px',
                  bgcolor: gameStatus === 'READY' ? 'rgba(56,189,248,0.1)' : isCheck ? 'rgba(239,68,68,0.25)' : currentTurn === TEAM.CHO ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                  border: `1px solid ${gameStatus === 'READY' ? 'rgba(56,189,248,0.3)' : isCheck ? '#ef4444' : currentTurn === TEAM.CHO ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.8
                }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography sx={{ fontWeight: 800, color: gameStatus === 'READY' ? '#38bdf8' : isCheck ? '#ef4444' : currentTurn === TEAM.CHO ? '#34d399' : '#f87171', fontSize: '1rem' }}>
                    {gameStatus === 'READY'
                      ? `⏸️ 대국 준비 중 (내 진영: ${playerTeam === TEAM.CHO ? '🟢 초(楚) 선수' : '🔴 한(漢) 후수연습'})`
                      : isCheck
                      ? '🚨 장군! 멍군을 취하세요'
                      : currentTurn === TEAM.CHO
                      ? `🟢 초(楚) 차례 ${currentTurn === playerTeam ? '(내 턴)' : '(AI 턴)'}`
                      : `🔴 한(漢) 차례 ${currentTurn === playerTeam ? '(내 턴)' : '(AI 턴)'}`}
                  </Typography>
                  
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Typography variant="caption" sx={{ color: '#34d399', fontWeight: 700 }}>
                      楚 {choScore}점
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#f87171', fontWeight: 700 }}>
                      漢 {hanScore}점 (덤 1.5)
                    </Typography>
                  </Stack>
                </Stack>

                {gameStatus === 'PLAYING' && (
                  <Box sx={{ width: '100%', mt: 0.5 }}>
                    <LinearProgress
                      variant="determinate"
                      value={(timeLeft / 30) * 100}
                      sx={{
                        height: 5,
                        borderRadius: 2.5,
                        bgcolor: 'rgba(255,255,255,0.1)',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: timeLeft <= 5 ? '#ef4444' : currentTurn === TEAM.CHO ? '#10b981' : '#f87171'
                        }
                      }}
                    />
                  </Box>
                )}
              </Box>

              {/* 9x10 정통 나무 장기판 뷰어 */}
              <Box
                sx={{
                  position: 'relative',
                  width: { xs: '310px', sm: '440px', md: '500px' },
                  height: { xs: '350px', sm: '490px', md: '550px' },
                  bgcolor: '#ba8847',
                  borderRadius: '8px',
                  boxShadow: 'inset 0 0 24px rgba(0,0,0,0.65), 0 8px 30px rgba(0,0,0,0.5)',
                  p: { xs: '16px 12px', sm: '26px 20px', md: '30px 24px' },
                  boxSizing: 'border-box'
                }}
              >
                {/* READY 대국 준비 오버레이 카드 */}
                {gameStatus === 'READY' && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      bgcolor: 'rgba(9, 10, 15, 0.92)',
                      backdropFilter: 'blur(6px)',
                      borderRadius: '8px',
                      zIndex: 20,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      p: { xs: 2, sm: 3 },
                      textAlign: 'center',
                      overflowY: 'auto'
                    }}
                  >
                    <Typography variant="h6" fontWeight={900} color="#fff" mb={0.5} sx={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                      🩵 진영 & 상차림 완벽 세팅
                    </Typography>
                    <Typography variant="caption" color="#a1a1aa" mb={1.5}>
                      내 진영과 상대 진영의 상차림(마/상 배치)을 고른 후 <b>[대국 시작]</b>을 누르세요.
                    </Typography>

                    {/* 진영 선택 토글 */}
                    <Stack direction="row" spacing={1.5} mb={2}>
                      <Button
                        size="small"
                        variant={playerTeam === TEAM.CHO ? 'contained' : 'outlined'}
                        color="success"
                        onClick={() => setPlayerTeam(TEAM.CHO)}
                        sx={{ fontWeight: 800, borderRadius: '8px', px: 2 }}
                      >
                        🟢 초(楚) 선수 플레이
                      </Button>
                      <Button
                        size="small"
                        variant={playerTeam === TEAM.HAN ? 'contained' : 'outlined'}
                        color="error"
                        onClick={() => setPlayerTeam(TEAM.HAN)}
                        sx={{ fontWeight: 800, borderRadius: '8px', px: 2 }}
                      >
                        🔴 한(漢) 후수 연습
                      </Button>
                    </Stack>

                    {/* 내 진영 vs 상대 진영 탭 선택 */}
                    <Tabs
                      value={overlayTab}
                      onChange={(e, val) => setOverlayTab(val)}
                      variant="fullWidth"
                      sx={{
                        width: '100%',
                        maxWidth: '400px',
                        mb: 1.5,
                        minHeight: 36,
                        bgcolor: 'rgba(255,255,255,0.05)',
                        borderRadius: '10px',
                        '& .MuiTab-root': { color: '#a1a1aa', fontWeight: 700, fontSize: '0.8rem', minHeight: 36, py: 0.5 }
                      }}
                    >
                      <Tab label={`내 진영 상차림 (${playerTeam === TEAM.CHO ? '楚' : '漢'})`} sx={{ '&.Mui-selected': { color: playerTeam === TEAM.CHO ? '#34d399' : '#f87171', fontWeight: 900 } }} />
                      <Tab label={`상대 진영 상차림 (${opponentTeam === TEAM.CHO ? '楚' : '漢'})`} sx={{ '&.Mui-selected': { color: opponentTeam === TEAM.CHO ? '#34d399' : '#f87171', fontWeight: 900 } }} />
                    </Tabs>

                    {/* 시각적 4개 카드 */}
                    {(() => {
                      const activeTeam = overlayTab === 0 ? playerTeam : opponentTeam;
                      const currentForm = activeTeam === TEAM.CHO ? choFormation : hanFormation;
                      const activeColor = activeTeam === TEAM.CHO ? '#34d399' : '#f87171';
                      const activeBg = activeTeam === TEAM.CHO ? 'rgba(52,211,153,0.18)' : 'rgba(248,113,113,0.18)';

                      return (
                        <Grid container spacing={1} mb={2} sx={{ maxWidth: '400px' }}>
                          {Object.keys(FORMATION_TYPES).map(key => {
                            const info = FORMATION_INFO[key];
                            const isSelected = currentForm === key;

                            return (
                              <Grid item xs={6} key={key}>
                                <Paper
                                  onClick={() => handleFormationSelect(activeTeam, key)}
                                  sx={{
                                    p: 1.2,
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    bgcolor: isSelected ? activeBg : 'rgba(255,255,255,0.03)',
                                    border: isSelected ? `2px solid ${activeColor}` : '1px solid rgba(255,255,255,0.08)',
                                    boxShadow: isSelected ? `0 0 14px ${activeColor}55` : 'none',
                                    textAlign: 'center',
                                    transition: 'all 0.2s',
                                    '&:hover': { bgcolor: activeBg, transform: 'translateY(-2px)' }
                                  }}
                                >
                                  <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.5}>
                                    <Typography variant="caption" fontWeight={800} color={isSelected ? activeColor : '#e4e4e7'}>
                                      {info.name}
                                    </Typography>
                                    {isSelected && <CheckCircleIcon sx={{ fontSize: '0.85rem', color: activeColor }} />}
                                  </Stack>

                                  <Stack direction="row" justifyContent="center" spacing={0.4} mb={0.5}>
                                    {info.pattern.map((pt, idx) => (
                                      <Box
                                        key={idx}
                                        sx={{
                                          width: 16,
                                          height: 16,
                                          borderRadius: '50%',
                                          bgcolor: (pt === '馬' || pt === '象') ? (activeTeam === TEAM.CHO ? '#044e37' : '#6b1313') : 'rgba(255,255,255,0.08)',
                                          border: `1px solid ${(pt === '馬' || pt === '象') ? activeColor : 'rgba(255,255,255,0.2)'}`,
                                          color: (pt === '馬' || pt === '象') ? activeColor : '#aaa',
                                          fontSize: '0.6rem',
                                          fontWeight: 900,
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center'
                                        }}
                                      >
                                        {pt}
                                      </Box>
                                    ))}
                                  </Stack>

                                  <Typography variant="caption" sx={{ fontSize: '0.62rem', color: isSelected ? activeColor : '#71717a', display: 'block', lineHeight: 1.2 }}>
                                    {info.badge}
                                  </Typography>
                                </Paper>
                              </Grid>
                            );
                          })}
                        </Grid>
                      );
                    })()}

                    <Button
                      variant="contained"
                      size="medium"
                      startIcon={<PlayArrowIcon sx={{ fontSize: '1.8rem !important' }} />}
                      onClick={handleStartGame}
                      sx={{
                        px: 3.5,
                        py: 1.2,
                        borderRadius: '14px',
                        fontSize: '1.05rem',
                        fontWeight: 900,
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        boxShadow: '0 0 30px rgba(16,185,129,0.5)',
                        '&:hover': { background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', transform: 'scale(1.04)' },
                        transition: 'all 0.2s ease-out'
                      }}
                    >
                      ▶️ 대국 시작 (Start Game)
                    </Button>
                  </Box>
                )}

                {/* 9x10 교차점 격자 인터랙션 */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(9, 1fr)',
                    gridTemplateRows: 'repeat(10, 1fr)',
                    width: '100%',
                    height: '100%',
                    position: 'relative'
                  }}
                >
                  {board.map((row, y) =>
                    row.map((cell, x) => {
                      const isSelected = selectedPos && selectedPos.x === x && selectedPos.y === y;
                      const isLegalMove = legalMoves.some(m => m.x === x && m.y === y);
                      const isLastMoveSrc = lastMove && lastMove.from.x === x && lastMove.from.y === y;
                      const isLastMoveDst = lastMove && lastMove.to.x === x && lastMove.to.y === y;

                      // 장군 위협에 처한 왕(KING) 기물 파악
                      const isKingTargetedByCheck = isCheck && cell && cell.type === PIECE_TYPE.KING && cell.team === currentTurn;

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
                            cursor: gameStatus === 'PLAYING' ? 'pointer' : 'default',
                            '&::before': {
                              content: '""',
                              position: 'absolute',
                              width: '100%',
                              height: '1px',
                              bgcolor: '#503316',
                              top: '50%',
                              zIndex: 1
                            },
                            '&::after': {
                              content: '""',
                              position: 'absolute',
                              height: '100%',
                              width: '1px',
                              bgcolor: '#503316',
                              left: '50%',
                              zIndex: 1
                            }
                          }}
                        >
                          {((x >= 3 && x <= 5 && (y <= 2 || y >= 7))) && (
                            <Box
                              sx={{
                                position: 'absolute',
                                width: '100%',
                                height: '100%',
                                border: '1px solid rgba(80,51,22,0.3)',
                                pointerEvents: 'none'
                              }}
                            />
                          )}

                          {isLegalMove && (
                            <Box
                              sx={{
                                position: 'absolute',
                                width: cell ? '85%' : '18px',
                                height: cell ? '85%' : '18px',
                                borderRadius: '50%',
                                bgcolor: cell ? 'transparent' : 'rgba(16,185,129,0.7)',
                                border: cell ? '3px solid #10b981' : 'none',
                                zIndex: 10,
                                boxShadow: '0 0 12px #10b981',
                                animation: 'pulse 1.2s infinite'
                              }}
                            />
                          )}

                          {(isLastMoveSrc || isLastMoveDst) && (
                            <Box
                              sx={{
                                position: 'absolute',
                                width: '90%',
                                height: '90%',
                                borderRadius: '50%',
                                border: '2px dashed #fb923c',
                                zIndex: 5
                              }}
                            />
                          )}

                          {cell && disp && (
                            <Paper
                              elevation={6}
                              sx={{
                                position: 'relative',
                                zIndex: 8,
                                width: cell.type === PIECE_TYPE.KING ? { xs: '32px', sm: '42px', md: '48px' } : { xs: '26px', sm: '34px', md: '40px' },
                                height: cell.type === PIECE_TYPE.KING ? { xs: '32px', sm: '42px', md: '48px' } : { xs: '26px', sm: '34px', md: '40px' },
                                borderRadius: '50%',
                                bgcolor: disp.bg,
                                border: isKingTargetedByCheck ? '3px solid #ef4444' : `2px solid ${disp.color}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: isKingTargetedByCheck
                                  ? '0 0 30px #ef4444, inset 0 0 15px #ef4444'
                                  : isSelected
                                  ? `0 0 20px ${disp.color}, 0 0 10px #fff`
                                  : '0 4px 10px rgba(0,0,0,0.5)',
                                transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                                animation: isKingTargetedByCheck ? 'dangerPulse 0.8s infinite alternate' : 'none',
                                transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                                userSelect: 'none',
                                '@keyframes dangerPulse': {
                                  '0%': { transform: 'scale(1)', boxShadow: '0 0 15px #ef4444' },
                                  '100%': { transform: 'scale(1.15)', boxShadow: '0 0 35px #ef4444, 0 0 20px #f87171' }
                                }
                              }}
                            >
                              <Typography
                                sx={{
                                  fontWeight: 900,
                                  color: isKingTargetedByCheck ? '#fef08a' : disp.color,
                                  fontSize: cell.type === PIECE_TYPE.KING ? { xs: '0.95rem', sm: '1.3rem', md: '1.45rem' } : { xs: '0.78rem', sm: '1.05rem', md: '1.2rem' },
                                  fontFamily: '"Gungsuh", "Batang", serif',
                                  textShadow: isKingTargetedByCheck ? '0 0 8px #ef4444' : '0 1px 3px rgba(0,0,0,0.8)'
                                }}
                              >
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
          </Grid>

          {/* [우측 컬럼] (lg={3.5}) */}
          <Grid item xs={12} md={4} lg={3.5}>
            <Stack spacing={2.5}>
              <Paper sx={{ p: 2.5, borderRadius: '18px', bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Avatar sx={{ bgcolor: opponentTeam === TEAM.CHO ? '#044e37' : '#6b1313', border: `2px solid ${opponentTeam === TEAM.CHO ? '#34d399' : '#f87171'}`, width: 40, height: 40, fontWeight: 900 }}>
                      {opponentTeam === TEAM.CHO ? '楚' : '漢'}
                    </Avatar>
                    <Box>
                      <Typography fontWeight={800} color={opponentTeam === TEAM.CHO ? '#34d399' : '#f87171'} variant="body1">
                        {opponentTeam === TEAM.CHO ? '초(楚) 진영' : '한(漢) 진영'} {gameMode === 'AI' ? `[AI ${aiDifficulty}]` : '[2P]'}
                      </Typography>
                      <Typography variant="caption" color="#a1a1aa">
                        상차림: {FORMATION_INFO[opponentTeam === TEAM.CHO ? choFormation : hanFormation].name}
                      </Typography>
                    </Box>
                  </Stack>
                  <Chip label={`${opponentTeam === TEAM.CHO ? choScore : hanScore}점`} size="small" sx={{ bgcolor: opponentTeam === TEAM.CHO ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)', color: opponentTeam === TEAM.CHO ? '#34d399' : '#f87171', fontWeight: 800 }} />
                </Stack>

                <Typography variant="caption" color="#71717a" mb={1} display="block">상대가 잡은 내 기물:</Typography>
                <Stack direction="row" flexWrap="wrap" gap={0.6}>
                  {(opponentTeam === TEAM.CHO ? capturedHan : capturedCho).map((p, idx) => (
                    <Chip key={idx} label={PIECE_DISPLAY[p.team][p.type].text} size="small" sx={{ bgcolor: p.team === TEAM.CHO ? '#065f46' : '#6b1313', color: p.team === TEAM.CHO ? '#34d399' : '#f87171', fontWeight: 800, height: 22 }} />
                  ))}
                </Stack>
              </Paper>

              <Paper sx={{ p: 2.5, borderRadius: '18px', bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Typography fontWeight={700} color="#e4e4e7" mb={1.5} display="flex" alignItems="center" gap={1} variant="body2">
                  <FormatListNumberedIcon fontSize="small" color="primary" /> 실시간 기보 (Notation)
                </Typography>
                <Box
                  sx={{
                    maxHeight: 180,
                    overflowY: 'auto',
                    pr: 1,
                    '&::-webkit-scrollbar': { width: '4px' },
                    '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.2)', borderRadius: '2px' }
                  }}
                >
                  {notationLogs.length > 0 ? (
                    notationLogs.map((log, i) => (
                      <Typography key={i} variant="caption" display="block" sx={{ py: 0.4, color: i === 0 ? '#34d399' : '#a1a1aa', fontFamily: 'monospace', fontWeight: i === 0 ? 800 : 400 }}>
                        [{notationLogs.length - i}수] {log}
                      </Typography>
                    ))
                  ) : (
                    <Typography variant="caption" color="#71717a">아직 착수 기록이 없습니다.</Typography>
                  )}
                </Box>
              </Paper>

            </Stack>
          </Grid>
        </Grid>
      </Container>

      {/* 상차림 상세 모달 */}
      <Dialog open={isSetupOpen} onClose={() => setIsSetupOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#12141c', color: '#fff', borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>⚙️ 상차림 (Formations) 시각적 선택</DialogTitle>
        <DialogContent dividers sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <Stack spacing={3} py={1}>
            <Box>
              <Typography variant="subtitle2" fontWeight={800} color="#34d399" mb={1.5}>
                🟢 초(楚) 상차림 선택:
              </Typography>
              <Grid container spacing={1.5}>
                {Object.keys(FORMATION_TYPES).map(key => {
                  const info = FORMATION_INFO[key];
                  const isSelected = choFormation === key;
                  return (
                    <Grid item xs={6} key={key}>
                      <Paper
                        onClick={() => handleFormationSelect(TEAM.CHO, key)}
                        sx={{
                          p: 1.5,
                          borderRadius: '12px',
                          cursor: 'pointer',
                          bgcolor: isSelected ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.03)',
                          border: isSelected ? '2px solid #34d399' : '1px solid rgba(255,255,255,0.08)',
                          textAlign: 'center'
                        }}
                      >
                        <Typography variant="body2" fontWeight={800} color={isSelected ? '#34d399' : '#fff'} mb={0.5}>
                          {info.name}
                        </Typography>
                        <Stack direction="row" justifyContent="center" spacing={0.5} mb={0.5}>
                          {info.pattern.map((pt, idx) => (
                            <Box key={idx} sx={{ width: 18, height: 18, borderRadius: '50%', bgcolor: '#044e37', color: '#34d399', fontSize: '0.65rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {pt}
                            </Box>
                          ))}
                        </Stack>
                        <Typography variant="caption" color="#a1a1aa" sx={{ fontSize: '0.68rem', display: 'block' }}>
                          {info.desc}
                        </Typography>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

            <Box>
              <Typography variant="subtitle2" fontWeight={800} color="#f87171" mb={1.5}>
                🔴 한(漢) 상차림 선택:
              </Typography>
              <Grid container spacing={1.5}>
                {Object.keys(FORMATION_TYPES).map(key => {
                  const info = FORMATION_INFO[key];
                  const isSelected = hanFormation === key;
                  return (
                    <Grid item xs={6} key={key}>
                      <Paper
                        onClick={() => handleFormationSelect(TEAM.HAN, key)}
                        sx={{
                          p: 1.5,
                          borderRadius: '12px',
                          cursor: 'pointer',
                          bgcolor: isSelected ? 'rgba(248,113,113,0.15)' : 'rgba(255,255,255,0.03)',
                          border: isSelected ? `2px solid #f87171` : '1px solid rgba(255,255,255,0.08)',
                          textAlign: 'center'
                        }}
                      >
                        <Typography variant="body2" fontWeight={800} color={isSelected ? '#f87171' : '#fff'} mb={0.5}>
                          {info.name}
                        </Typography>
                        <Stack direction="row" justifyContent="center" spacing={0.5} mb={0.5}>
                          {info.pattern.map((pt, idx) => (
                            <Box key={idx} sx={{ width: 18, height: 18, borderRadius: '50%', bgcolor: '#6b1313', color: '#f87171', fontSize: '0.65rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {pt}
                            </Box>
                          ))}
                        </Stack>
                        <Typography variant="caption" color="#a1a1aa" sx={{ fontSize: '0.68rem', display: 'block' }}>
                          {info.desc}
                        </Typography>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsSetupOpen(false)} variant="contained" color="success">
            완료
          </Button>
        </DialogActions>
      </Dialog>

      {/* 도움말 가이드 모달 */}
      <Dialog open={isRuleModalOpen} onClose={() => setIsRuleModalOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#12141c', color: '#fff', borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <HelpOutlineIcon color="primary" /> 정통 한국 장기 규칙 및 점수 가이드
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <Stack spacing={2} py={1}>
            <Typography variant="subtitle2" fontWeight={800} color="#34d399">1. 민속 기물 점수 및 덤 (Score System)</Typography>
            <Typography variant="body2" color="#a1a1aa" lineHeight={1.6}>
              · 차(車): 13점 | 포(包): 7점 | 마(馬): 5점 | 상(象): 3점 | 사(士): 3점 | 졸/병: 2점<br />
              · <b>한(漢) 후수 덤 1.5점</b>이 자동으로 부여됩니다.
            </Typography>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

            <Typography variant="subtitle2" fontWeight={800} color="#38bdf8">2. 기물 이동 및 특수 룰 (Piece Rules)</Typography>
            <Typography variant="body2" color="#a1a1aa" lineHeight={1.6}>
              · <b>마(馬) / 상(象)의 멱(길목)</b>: 이동 중간 경로(1차 또는 2차)에 기물이 막혀 있으면 이동할 수 없습니다.<br />
              · <b>포(包) 넘기</b>: 직선상 기물 1개를 뛰어넘어야만 이동/잡기가 가능합니다. (포는 포를 넘거나 잡을 수 없음)<br />
              · <b>궁성(宮城) 대각선</b>: 궁, 사, 차, 포, 졸/병은 궁성 안 대각선 길을 따라 이동할 수 있습니다.
            </Typography>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

            <Typography variant="subtitle2" fontWeight={800} color="#fb923c">3. 한수 쉬기 & 승패 조건</Typography>
            <Typography variant="body2" color="#a1a1aa" lineHeight={1.6}>
              · 전술적으로 둘 수가 없거나 쉴 때 <b>[한수 쉬기]</b> 버튼을 눌러 턴을 넘길 수 있습니다.<br />
              · 상대 궁(KING)을 잡거나 기권을 받아내면 외통승이 됩니다.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsRuleModalOpen(false)} variant="contained">확인</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default JanggiPage;
