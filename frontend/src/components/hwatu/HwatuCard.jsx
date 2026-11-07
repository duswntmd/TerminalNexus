import React, { memo } from 'react';
import { CARDS, cardImage, cardLabel } from './cards.js';
import './HwatuCard.css';

// 화투 카드 한 장. 앞면은 Wikimedia Commons의 한국식 화투 SVG(CC BY-SA 4.0, 출처는 LICENSE.md)를
// public/hwatu/{id}.svg 로 그대로 쓰고, 뒷면과 쌍피 표시는 직접 그린다.

/** 뒷면: 빨간 바탕에 테두리 (실제 화투 뒷면처럼 무늬 없이) */
const CardBack = () => (
  <svg viewBox="0 0 103 168" className="hw-back" aria-hidden="true">
    <rect x="0.5" y="0.5" width="102" height="167" rx="7" fill="#b3201b" stroke="#6e0f0c" strokeWidth="1" />
    <rect x="7" y="7" width="89" height="154" rx="4" fill="#c42a22" stroke="#e0574d" strokeWidth="1.2" />
  </svg>
);

/**
 * id: 0~47 (cards.js), back: 뒷면.
 * marks: 쌍피·국진에 작은 표시를 붙인다 (기본 켬). 실제 화투에는 없지만 작은 화면에서 구분하기 쉽게.
 * 나머지 props(onClick 등)는 바깥 span에 붙는다.
 */
const HwatuCard = ({ id, back = false, marks = true, className = '', title, ...rest }) => {
  const c = back || id == null || id < 0 ? null : CARDS[id];
  const label = title || (c ? cardLabel(id) : '화투 뒷면');
  return (
    <span className={`hw-card ${className}`} role="img" aria-label={label} title={title} {...rest}>
      {c ? (
        <>
          <img src={cardImage(id)} alt="" draggable="false" loading="lazy" decoding="async" />
          {marks && c.pi === 2 && <span className="hw-mark">쌍피</span>}
          {marks && c.gukjin && <span className="hw-mark is-gukjin">국진</span>}
        </>
      ) : <CardBack />}
    </span>
  );
};

export default memo(HwatuCard);
