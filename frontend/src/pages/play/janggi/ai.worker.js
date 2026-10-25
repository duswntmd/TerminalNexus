// AI 계산을 별도 스레드에서 수행 (화면 멈춤 방지)
import { search } from './ai.js';

self.onmessage = (e) => {
  const { id, board, team, level } = e.data;
  const move = search(board, team, level);
  self.postMessage({ id, ...move });
};
