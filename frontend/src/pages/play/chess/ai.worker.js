// AI 계산을 별도 스레드에서 수행 (화면 멈춤 방지)
import { search } from './ai.js';

self.onmessage = (e) => {
  const { id, startFen, moves, level } = e.data;
  self.postMessage({ id, ...search(startFen, moves, level) });
};
