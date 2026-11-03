import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import HwatuCard from '../../../components/hwatu/HwatuCard.jsx';
import { monthOf } from '../../../components/hwatu/cards.js';
import { legalActions, playerScore } from './engine.js';
import { CapturedArea, Floor, TurnStrip, EventBanner } from './parts.jsx';

/** 상대·내 상태 배지 (고, 흔들기, 뻑, 남은 뒤집기) */
const Badges = ({ view, p }) => {
  const { t } = useTranslation();
  return (
    <span className="gs-badges">
      {view.goCount[p] > 0 && <span className="gs-badge hot">{t('gostop.badge.go', { n: view.goCount[p] })}</span>}
      {view.shakes[p] > 0 && <span className="gs-badge">{t('gostop.badge.shake', { n: view.shakes[p] })}</span>}
      {view.ppeok[p] > 0 && <span className="gs-badge bad">{t('gostop.badge.ppeok', { n: view.ppeok[p] })}</span>}
      {view.dummy[p] > 0 && <span className="gs-badge">{t('gostop.badge.dummy', { n: view.dummy[p] })}</span>}
    </span>
  );
};

/**
 * 맞고 판 화면. view는 me 시점 상태(상대 손패는 -1로 가려져 있어도 됨).
 * canAct: 지금 내가 조작할 수 있는지, onAction(action): 행동 보내기
 */
const GameTable = ({ view, me, names, canAct, onAction, onGukjin, banner, status, children }) => {
  const { t } = useTranslation();
  const opp = 1 - me;
  const [selected, setSelected] = useState(null);
  const myTurn = canAct && view.turn === me && view.phase !== 'end';
  const legal = useMemo(() => (myTurn ? legalActions(view) : []), [myTurn, view]);

  const hand = useMemo(() => view.hands[me].slice().sort((a, b) => a - b), [view.hands, me]);
  const floorMonths = useMemo(() => new Set(view.floor.map(monthOf)), [view.floor]);
  const sel = selected != null && hand.includes(selected) && view.phase === 'play' && myTurn ? selected : null;
  const selMonth = sel != null ? monthOf(sel) : null;
  const highlight = selMonth ? view.floor.filter((c) => monthOf(c) === selMonth) : [];
  const pickable = myTurn && view.phase === 'choose' ? view.pending.options : [];

  const forCard = sel != null ? legal.filter((a) => (a.type === 'play' && a.card === sel) || (a.type === 'bomb' && a.month === selMonth)) : [];
  const flipAct = legal.find((a) => a.type === 'flip');

  const act = (a) => {
    setSelected(null);
    onAction(a);
  };

  const onHand = (id) => {
    if (!myTurn || view.phase !== 'play') return;
    if (sel === id) {
      // 두 번 누르면 바로 낸다
      const plain = legal.find((a) => a.type === 'play' && a.card === id && !a.shake);
      if (plain) act(plain);
      return;
    }
    setSelected(id);
  };

  const myScore = playerScore(view, me).total;
  const oppHandCount = view.hands[opp].length;

  return (
    <div className="gs-table">
      {/* 상대 */}
      <div className="gs-seat is-opp">
        <div className="gs-seat-head">
          <span className={`gs-name${view.turn === opp && view.phase !== 'end' ? ' is-turn' : ''}`}>{names[opp]}</span>
          <Badges view={view} p={opp} />
          <span className="gs-opp-hand" aria-label={t('gostop.opp_hand', { n: oppHandCount })}>
            {Array.from({ length: oppHandCount }, (_, i) => <span key={i} className="gs-back-mini"><HwatuCard back /></span>)}
          </span>
        </div>
        <CapturedArea captured={view.captured[opp]} gukjin={view.gukjin[opp]} label={t('gostop.captured_of', { name: names[opp] })} compact />
      </div>

      {/* 바닥 */}
      <div className="gs-board">
        <Floor
          floor={view.floor}
          ppeokOwner={view.ppeokOwner}
          highlight={highlight}
          pickable={pickable}
          onPick={(id) => act({ type: 'choose', card: id })}
          deckCount={view.deck.length}
          last={view.last ? [view.last.played, view.last.flipped] : null}
        />
        <TurnStrip last={view.last} name={view.last ? names[view.last.player] : ''} />
        <EventBanner banner={banner} />
        {myTurn && view.phase === 'goStop' && (
          <div className="gs-overlay" role="dialog" aria-label={t('gostop.gostop.title')}>
            <div className="gs-overlay-box">
              <strong className="gs-gostop-title">{t('gostop.gostop.title')}</strong>
              <p className="gs-hint">{t('gostop.gostop.desc', { score: myScore, go: view.goCount[me] })}</p>
              <div className="gs-actions center">
                <button type="button" className="gs-btn go" onClick={() => act({ type: 'go' })}>{t('gostop.gostop.go', { n: view.goCount[me] + 1 })}</button>
                <button type="button" className="gs-btn primary" onClick={() => act({ type: 'stop' })}>{t('gostop.gostop.stop')}</button>
              </div>
            </div>
          </div>
        )}
        {children}
      </div>

      {/* 나 */}
      <div className="gs-seat is-me">
        <CapturedArea captured={view.captured[me]} gukjin={view.gukjin[me]} onGukjin={onGukjin} label={t('gostop.captured_of', { name: names[me] })} />
      </div>

      <div className="gs-status-row">
        <span className={`gs-name${myTurn ? ' is-turn' : ''}`}>{names[me]}</span>
        <Badges view={view} p={me} />
        <span className="gs-status">{status}</span>
      </div>

      {myTurn && view.phase === 'choose' && (
        <div className="gs-choose">
          <div className="gs-mini lg"><HwatuCard id={view.pending.chooseCard} /></div>
          <span>{t('gostop.choose_prompt')}</span>
        </div>
      )}

      <div className="gs-hand" role="group" aria-label={t('gostop.my_hand')}>
        {hand.map((id) => (
          <button
            key={id}
            type="button"
            className={`gs-hand-card${sel === id ? ' is-selected' : ''}${floorMonths.has(monthOf(id)) ? ' has-match' : ''}`}
            onClick={() => onHand(id)}
            disabled={!myTurn || view.phase !== 'play'}
          >
            <HwatuCard id={id} />
          </button>
        ))}
      </div>

      <div className="gs-actionbar">
        {sel == null && myTurn && view.phase === 'play' && <span className="gs-hint">{t('gostop.hint_select')}</span>}
        {forCard.map((a) => (
          <button key={`${a.type}-${a.shake ? 1 : 0}`} type="button" className={`gs-btn${a.type === 'play' && !a.shake ? ' primary' : ' hot'}`} onClick={() => act(a)}>
            {a.type === 'bomb' ? t('gostop.actions.bomb') : a.shake ? t('gostop.actions.shake') : t('gostop.actions.play')}
          </button>
        ))}
        {flipAct && <button type="button" className="gs-btn" onClick={() => act(flipAct)}>{t('gostop.actions.flip')}</button>}
      </div>
    </div>
  );
};

export default GameTable;
