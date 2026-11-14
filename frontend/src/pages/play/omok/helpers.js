import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BLACK, WHITE, moveError, forbiddenPoints, isRestricted } from './engine.js';
import { playSound } from './sound.js';

const OPTS_KEY = 'tn.omok.opts';

/** 화면 옵션 (소리·수순 번호·선택 후 착수). 기기에 저장한다 */
export const useOptions = () => {
  const [opts, setOpts] = useState(() => {
    const coarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
    const base = { sound: true, numbers: false, confirm: !!coarse };
    try {
      return { ...base, ...JSON.parse(localStorage.getItem(OPTS_KEY) || '{}') };
    } catch {
      return base;
    }
  });
  const toggle = useCallback((key) => setOpts((o) => {
    const next = { ...o, [key]: !o[key] };
    try { localStorage.setItem(OPTS_KEY, JSON.stringify(next)); } catch { /* 저장 불가 환경 */ }
    return next;
  }), []);
  return [opts, toggle];
};

export const formatClock = (sec) => {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export const colorKey = (c) => (c === BLACK ? 'black' : 'white');
export const colorFromName = (name) => (name === 'BLACK' ? BLACK : name === 'WHITE' ? WHITE : null);

/** 잠깐 떴다 사라지는 안내 */
export const useToast = () => {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const show = useCallback((text) => {
    clearTimeout(timer.current);
    setToast({ text, key: Date.now() });
    timer.current = setTimeout(() => setToast(null), 2600);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return [toast, show];
};

/**
 * 판 입력 공통 처리: 금수 표시, "선택 후 착수", 금수·둔 자리 안내
 * @param game     engine.js 의 대국 상태
 * @param canPlay  지금 이 화면의 사용자가 둘 수 있는가
 * @param place    (idx) => void 실제 착수
 */
export const useBoardInput = ({ game, canPlay, opts, place, showToast }) => {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(null);
  const moveCount = game ? game.moves.length : 0;

  // 판이 바뀌거나 내 차례가 아니게 되면 선택 해제
  useEffect(() => { setSelected(null); }, [moveCount, canPlay, opts.confirm]);

  const forbidden = useMemo(() => {
    if (!game || !canPlay || !isRestricted(game.rule, game.turn)) return {};
    return forbiddenPoints(game.board, game.turn, game.rule);
  }, [game, canPlay]);

  const pick = useCallback((idx) => {
    if (!game || !canPlay) return;
    const err = moveError(game, idx);
    if (err) {
      if (err !== 'occupied' && err !== 'finished') {
        playSound('error', opts.sound);
        showToast(t(`omok.forbidden.${err}`));
      }
      setSelected(null);
      return;
    }
    if (opts.confirm && selected !== idx) {
      playSound('select', opts.sound);
      setSelected(idx);
      return;
    }
    setSelected(null);
    place(idx);
  }, [game, canPlay, opts.confirm, opts.sound, selected, place, showToast, t]);

  const confirm = useCallback(() => {
    if (selected != null) pick(selected);
  }, [selected, pick]);

  return { forbidden, selected, pick, confirm };
};
