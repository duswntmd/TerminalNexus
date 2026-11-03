import { WHITE, BLACK } from './engine.js';

// 속이 찬 글리프를 두 색 모두에 쓰고 색칠로 구분. FE0E: 이모지 대신 글자 모양으로 표시
export const GLYPH = ['', '♟︎', '♞︎', '♝︎', '♜︎', '♛︎', '♚︎'];
export const PIECE_KEY = ['', 'p', 'n', 'b', 'r', 'q', 'k'];

export const colorKey = (c) => (c === WHITE ? 'white' : 'black');
export const colorFromName = (name) => (name === 'WHITE' ? WHITE : name === 'BLACK' ? BLACK : null);
export const colorName = (c) => (c === WHITE ? 'WHITE' : 'BLACK');
