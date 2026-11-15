/* 오목 효과음: 음원 파일 없이 Web Audio 로 직접 합성 */
let ctx = null;
let noise = null;

const audio = () => {
  ctx ||= new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
};

/** 짧은 백색 소음 (돌이 판에 닿는 "딱" 소리의 재료) */
const noiseBuffer = (ac) => {
  if (noise) return noise;
  noise = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.08), ac.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  return noise;
};

const tone = (ac, { freq, to, dur, wave = 'sine', vol = 0.25, at = 0 }) => {
  const start = ac.currentTime + at;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(freq, start);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, start + dur);
  gain.gain.setValueAtTime(vol, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
};

/** 돌 놓는 소리: 나무판을 치는 높은 "딱" + 낮게 울리는 통 소리 */
const stone = (ac, bright) => {
  const now = ac.currentTime;
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac);
  const band = ac.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = bright ? 2600 : 2100;
  band.Q.value = 1.4;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.9, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  src.connect(band).connect(gain).connect(ac.destination);
  src.start(now);
  src.stop(now + 0.07);
  tone(ac, { freq: bright ? 420 : 360, to: 150, dur: 0.07, wave: 'triangle', vol: 0.5 });
  tone(ac, { freq: 150, to: 70, dur: 0.12, vol: 0.35 });
};

/**
 * @param {'black'|'white'|'error'|'win'|'lose'|'draw'|'start'|'tick'|'select'} type
 */
export const playSound = (type, enabled = true) => {
  if (!enabled) return;
  try {
    const ac = audio();
    if (type === 'black') stone(ac, false);
    else if (type === 'white') stone(ac, true);
    else if (type === 'select') tone(ac, { freq: 900, dur: 0.04, vol: 0.08 });
    else if (type === 'error') {
      tone(ac, { freq: 170, dur: 0.14, wave: 'square', vol: 0.12 });
      tone(ac, { freq: 130, dur: 0.18, wave: 'square', vol: 0.12, at: 0.1 });
    } else if (type === 'tick') tone(ac, { freq: 1200, dur: 0.05, wave: 'square', vol: 0.06 });
    else if (type === 'start') [392, 587].forEach((f, i) => tone(ac, { freq: f, dur: 0.18, vol: 0.2, at: i * 0.12 }));
    else if (type === 'win') [523, 659, 784, 1047, 1319].forEach((f, i) => tone(ac, { freq: f, dur: 0.28, wave: 'triangle', vol: 0.22, at: i * 0.11 }));
    else if (type === 'lose') [392, 330, 262, 196].forEach((f, i) => tone(ac, { freq: f, dur: 0.3, vol: 0.2, at: i * 0.16 }));
    else if (type === 'draw') [440, 440].forEach((f, i) => tone(ac, { freq: f, dur: 0.2, vol: 0.18, at: i * 0.22 }));
  } catch {
    // 오디오를 쓸 수 없는 환경은 조용히 넘어감
  }
};
