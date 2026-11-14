// AI 계산을 별도 스레드에서 수행 (화면 멈춤 방지)
import { chooseMove } from './ai.js';

self.onmessage = (e) => {
  const { id, rule, moves, level } = e.data;
  self.postMessage({ id, ...chooseMove(rule, moves, level) });
};
