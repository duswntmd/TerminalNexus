/* Web Audio API 기반 효과음 (외부 파일 없이 합성) */
let ctx = null;

export const playSound = (type, enabled = true) => {
  if (!enabled) return;
  try {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    const tone = (freq, endFreq, dur, wave = 'sine', vol = 0.35, at = now) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = wave;
      osc.frequency.setValueAtTime(freq, at);
      if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, at + dur);
      gain.gain.setValueAtTime(vol, at);
      gain.gain.exponentialRampToValueAtTime(0.01, at + dur);
      osc.start(at);
      osc.stop(at + dur);
    };
    if (type === 'move') tone(320, 80, 0.08);
    else if (type === 'capture') tone(520, 120, 0.12, 'triangle', 0.5);
    else if (type === 'check') { tone(880, null, 0.15, 'sawtooth', 0.25); tone(1174, null, 0.2, 'sawtooth', 0.25, now + 0.13); }
    else if (type === 'win') [523, 659, 783, 1046].forEach((f, i) => tone(f, null, 0.2, 'sine', 0.25, now + i * 0.12));
    else if (type === 'lose') [392, 330, 262].forEach((f, i) => tone(f, null, 0.25, 'sine', 0.25, now + i * 0.15));
  } catch {
    // 오디오 미지원 환경은 무시
  }
};
