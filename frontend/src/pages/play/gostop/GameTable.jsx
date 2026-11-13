import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import HwatuCard from '../../../components/hwatu/HwatuCard.jsx';
import { cardImage, monthOf } from '../../../components/hwatu/cards.js';
import { GUKJIN_ID, legalActions, playerScore, scoreOf } from './engine.js';
import { LAYOUTS, BASE_W, buildFrames, layoutFrame } from './board.js';

const STEP_MS = 340; // 장면 하나(낸 패, 뒤집기, 먹기) 길이

const headerHeight = () => document.querySelector('header')?.offsetHeight ?? 64;

/** 화면 너비·높이에 맞춰 판 모양(세로/가로)과 배율을 정한다 */
const useStage = (ref) => {
  const [stage, setStage] = useState({ mode: 'portrait', scale: 0.9, width: 390 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = () => {
      const width = el.clientWidth;
      // 헤더(sticky) 아래 남는 높이에 판 전체가 들어가게 한다
      const availH = Math.max(380, window.innerHeight - headerHeight() - 8);
      const mode = width >= 760 ? 'landscape' : 'portrait';
      const L = LAYOUTS[mode];
      const scale = Math.min(width / L.W, availH / L.H);
      setStage((s) => (s.mode === mode && s.width === width && Math.abs(s.scale - scale) < 0.001 ? s : { mode, scale, width }));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => { ro.disconnect(); window.removeEventListener('resize', update); };
  }, [ref]);
  return stage;
};

/** 이전 상태 → 새 상태를 단계별 장면으로 보여 준다 */
const useFrames = (view, me) => {
  const prevRef = useRef(null);
  const [anim, setAnim] = useState(() => ({ frames: buildFrames(null, view, me), idx: 0, key: 0 }));
  useEffect(() => {
    if (prevRef.current === view) return undefined;
    const frames = buildFrames(prevRef.current, view, me);
    prevRef.current = view;
    setAnim((a) => ({ frames, idx: 0, key: a.key + 1 }));
    if (frames.length < 2) return undefined;
    const timers = frames.slice(1).map((_, i) => setTimeout(() => setAnim((a) => ({ ...a, idx: i + 1 })), STEP_MS * (i + 1)));
    return () => timers.forEach(clearTimeout);
  }, [view, me]);
  const idx = Math.min(anim.idx, anim.frames.length - 1);
  return { frame: anim.frames[idx], animating: idx < anim.frames.length - 1, key: anim.key };
};

/** 고·흔들기·뻑·폭탄 뒤집기 배지 */
const Badges = ({ view, p }) => {
  const { t } = useTranslation();
  return (
    <>
      {view.goCount[p] > 0 && <span className="gs-badge hot">{t('gostop.badge.go', { n: view.goCount[p] })}</span>}
      {view.shakes[p] > 0 && <span className="gs-badge">{t('gostop.badge.shake', { n: view.shakes[p] })}</span>}
      {view.ppeok[p] > 0 && <span className="gs-badge bad">{t('gostop.badge.ppeok', { n: view.ppeok[p] })}</span>}
    </>
  );
};

/** 박 경고: 내 쪽 위험과 상대 쪽 가능성 */
const bakFlags = (view, me) => {
  const a = scoreOf(view.captured[me], view.gukjin[me]).counts;
  const b = scoreOf(view.captured[1 - me], view.gukjin[1 - me]).counts;
  const flags = [];
  if (a.pi <= 7 && b.pi >= 7) flags.push(['pibak_risk', 'bad']);
  if (b.pi <= 7 && a.pi >= 7) flags.push(['pibak_chance', 'good']);
  if (a.gwang === 0 && b.gwang >= 2) flags.push(['gwangbak_risk', 'bad']);
  if (b.gwang === 0 && a.gwang >= 2) flags.push(['gwangbak_chance', 'good']);
  if (a.yeol >= 5 && a.yeol < 7) flags.push(['meongtta_near', 'good']);
  return flags;
};

/**
 * 맞고 판. 고정 크기 게임판을 화면에 맞춰 확대·축소하고, 카드는 한 겹에 두어
 * 손패 → 바닥 → 먹은 자리로 움직일 때 위치가 바뀌며 날아가도록 한다.
 * view: me 시점 상태(상대 손패는 -1이어도 됨), canAct: 조작 가능 여부, onAction: 행동 보내기,
 * toolbar: 점수판에 붙일 버튼·포인트, children: 판 위 대화상자(정산 등)
 */
const GameTable = ({ view, me, names, canAct, onAction, onGukjin, banner, status, toolbar, children }) => {
  const { t } = useTranslation();
  const opp = 1 - me;
  const wrapRef = useRef(null);
  const { mode, scale, width } = useStage(wrapRef);
  const L = LAYOUTS[mode];
  const { frame, animating } = useFrames(view, me);
  const [choice, setChoice] = useState(null); // 흔들기·폭탄 고르기 { card, options }
  const slotsRef = useRef({ portrait: new Map(), landscape: new Map() });

  // 카드 그림 미리 불러오기
  useEffect(() => {
    for (let i = 0; i < 48; i += 1) { const img = new Image(); img.src = cardImage(i); }
  }, []);

  // 판이 처음 나타나면 헤더 바로 아래로 스크롤해 판 전체가 한 화면에 보이게
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - headerHeight() - 4;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }, []);

  const myTurn = canAct && view.turn === me && view.phase !== 'end' && !animating;
  const legal = useMemo(() => (myTurn ? legalActions(view) : []), [myTurn, view]);
  const pickable = myTurn && view.phase === 'choose' ? view.pending.options : [];
  const lay = layoutFrame(frame, { mode, me, slots: slotsRef.current[mode], pickable });
  const floorMonths = new Set(frame.floor.map(monthOf));
  const flipAct = legal.find((a) => a.type === 'flip');

  const act = (a) => {
    setChoice(null);
    onAction(a);
  };

  const onHand = (id) => {
    if (!myTurn || view.phase !== 'play') return;
    const options = legal.filter((a) => (a.type === 'play' && a.card === id) || (a.type === 'bomb' && a.month === monthOf(id)));
    if (options.length === 1) act(options[0]);
    else if (options.length > 1) setChoice({ card: id, options });
  };

  const myScore = playerScore(view, me);
  const oppScore = playerScore(view, opp);
  const flags = bakFlags(view, me);
  const counts = { me: myScore.counts, opp: oppScore.counts };
  const gukjinMine = view.captured[me].includes(GUKJIN_ID);

  const seat = (p, score) => (
    <div className={`gs-seatinfo${view.turn === p && view.phase !== 'end' ? ' is-turn' : ''}`}>
      <span className="gs-seatinfo-name">{names[p]}</span>
      <strong className="gs-seatinfo-score">{t('gostop.points_unit', { n: score.total })}</strong>
      <Badges view={view} p={p} />
    </div>
  );

  const flagsEl = flags.length > 0 && (
    <span className="gs-flags">
      {flags.map(([k, tone]) => <span key={k} className={`gs-flag ${tone}`}>{t(`gostop.flags.${k}`)}</span>)}
    </span>
  );

  const gukjinEl = gukjinMine && onGukjin && (
    <button
      type="button"
      className="gs-pill"
      onClick={() => onGukjin(view.gukjin[me] == null ? 'yeol' : view.gukjin[me] === 'yeol' ? 'pi' : null)}
      title={t('gostop.gukjin.label')}
    >
      {t('gostop.gukjin.short', { v: t(`gostop.gukjin.${view.gukjin[me] ?? 'auto'}`) })}
    </button>
  );

  const fromVars = (id, i) => {
    const o = frame.origin[id] === 'opp' ? lay.oppHandPos : lay.deck;
    return { '--fx': `${o.x}px`, '--fy': `${o.y}px`, '--fs': o.w / BASE_W, '--delay': `${Math.min(i, 30) * 18}ms` };
  };

  return (
    <div className="gs-stage-wrap" ref={wrapRef} style={{ height: L.H * scale }}>
      <div className={`gs-stage is-${mode}`} style={{ width: L.W, height: L.H, left: Math.max(0, (width - L.W * scale) / 2), transform: `scale(${scale})` }}>
        <div className="gs-felt" />

        {/* 상대 정보 (세로 화면은 위쪽 줄) */}
        {mode === 'portrait' && (
          <div className="gs-oppbar">
            {seat(opp, oppScore)}
          </div>
        )}

        {/* 먹은 패 칸 이름과 장수 */}
        {lay.labels.map((lb) => (
          <span key={lb.key} className={`gs-caplabel k-${lb.kind}`} style={{ left: lb.x, top: lb.y }}>
            {t(`gostop.kinds.${lb.kind}`)} {counts[lb.owner][lb.kind]}
          </span>
        ))}

        {/* 뻑 표시 */}
        {lay.stacks.filter((s) => s.ppeok).map((s) => (
          <span key={s.month} className="gs-ppeok-mark" style={{ left: s.x - s.w * 0.16 - 6, top: s.y - 6, width: s.w * 1.32 + 12, height: s.h + s.w * 0.2 + 12 }}>
            <em>{t('gostop.events.ppeok')}</em>
          </span>
        ))}

        {/* 뒷패 더미 */}
        <div className="gs-deckpile" style={{ left: lay.deck.x, top: lay.deck.y, width: lay.deck.w }}>
          {lay.deck.count > 0 && <HwatuCard back />}
          <span className="gs-deckcount">{lay.deck.count}</span>
        </div>

        {/* 상대 손패 (뒷면 부채꼴) */}
        {lay.backs.map((b) => (
          <div key={b.key} className="gs-c is-back" style={{ transform: `translate(${b.x}px, ${b.y}px) rotate(${b.rot}deg) scale(${b.w / BASE_W})`, zIndex: 20 }}>
            <HwatuCard back />
          </div>
        ))}

        {/* 카드 (한 겹: 위치가 바뀌면 날아간다) */}
        {lay.cards.map((c, i) => {
          const isHand = c.zone === 'hand';
          const canPick = pickable.includes(c.id);
          const playable = isHand && myTurn && view.phase === 'play';
          const cls = [
            'gs-c',
            isHand ? 'is-hand' : '',
            playable ? 'is-playable' : '',
            isHand && myTurn && !floorMonths.has(monthOf(c.id)) ? 'is-dim' : '',
            isHand && floorMonths.has(monthOf(c.id)) ? 'has-match' : '',
            canPick ? 'is-pick' : '',
            choice?.card === c.id ? 'is-selected' : '',
          ].filter(Boolean).join(' ');
          const style = {
            transform: `translate(${c.x}px, ${c.y}px) scale(${c.w / BASE_W})`,
            zIndex: c.z,
            ...fromVars(c.id, i),
          };
          const onClick = canPick ? () => act({ type: 'choose', card: c.id }) : playable ? () => onHand(c.id) : undefined;
          // 요소 종류를 바꾸면 다시 그려져 덱에서 날아오므로 항상 같은 div를 쓴다
          return (
            <div
              key={c.id}
              className={cls}
              style={style}
              role={onClick ? 'button' : undefined}
              tabIndex={onClick ? 0 : undefined}
              onClick={onClick}
              onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
            >
              <HwatuCard id={c.id} />
            </div>
          );
        })}

        {/* 폭탄으로 받은 뒤집기 패 */}
        {lay.dummies.map((d) => (
          <button
            key={d.key}
            type="button"
            className={`gs-c is-hand is-dummy${flipAct && myTurn ? ' is-playable' : ''}`}
            style={{ transform: `translate(${d.x}px, ${d.y}px) scale(${d.w / BASE_W})`, zIndex: 290 }}
            onClick={() => flipAct && myTurn && act(flipAct)}
            disabled={!flipAct || !myTurn}
            title={t('gostop.hint_flip')}
          >
            <HwatuCard back />
            <span className="gs-dummy-label">{t('gostop.actions.flip')}</span>
          </button>
        ))}

        {/* 점수판 */}
        <div className={`gs-hud is-${mode}`} style={{ left: L.hud.x, top: L.hud.y, width: L.hud.w, height: L.hud.h }}>
          {mode === 'landscape' ? (
            <>
              <div className="gs-hud-block">{seat(opp, oppScore)}<span className="gs-hud-sub">{t('gostop.opp_hand', { n: view.hands[opp].length })}</span></div>
              <div className="gs-hud-mid">
                <p className="gs-hud-status">{status}</p>
                {view.carry > 1 && <p className="gs-hud-sub">{t('gostop.carry_notice', { x: view.carry })}</p>}
                {flagsEl}
                {gukjinEl}
              </div>
              <div className="gs-hud-block">{seat(me, myScore)}</div>
              <div className="gs-hud-tools">{toolbar}</div>
            </>
          ) : (
            <>
              <div className="gs-hud-row">
                {seat(me, myScore)}
                <span className="gs-hud-tools">{toolbar}</span>
              </div>
              <div className="gs-hud-row">
                <span className="gs-hud-status">{status}</span>
                {view.carry > 1 && <span className="gs-flag">{t('gostop.carry_notice', { x: view.carry })}</span>}
                {flagsEl}
                {gukjinEl}
              </div>
            </>
          )}
        </div>

        {/* 큰 글씨 효과 (뻑, 쪽, 고 …) */}
        {banner && !animating && (
          <div key={banner.key} className={`gs-fx tone-${banner.tone}`} style={{ top: L.deck.cy - 50 }}>
            {banner.text}
            {banner.sub && <small>{banner.sub}</small>}
            {banner.cards && <span className="gs-fx-cards">{banner.cards.map((id) => <HwatuCard key={id} id={id} />)}</span>}
          </div>
        )}

        {/* 흔들기·폭탄 고르기 */}
        {choice && myTurn && (
          <div className="gs-overlay" role="dialog" aria-label={t('gostop.choice_title')} onClick={() => setChoice(null)}>
            <div className="gs-overlay-box" onClick={(e) => e.stopPropagation()}>
              <div className="gs-choice-card"><HwatuCard id={choice.card} /></div>
              <strong className="gs-gostop-title">{t('gostop.choice_title')}</strong>
              {choice.options.some((a) => a.type === 'bomb') && <p className="gs-hint">{t('gostop.hint_bomb')}</p>}
              {choice.options.some((a) => a.shake) && <p className="gs-hint">{t('gostop.hint_shake')}</p>}
              <div className="gs-actions center">
                {choice.options.map((a) => (
                  <button key={`${a.type}-${a.shake ? 1 : 0}`} type="button" className={`gs-btn${a.type === 'play' && !a.shake ? '' : ' hot'}`} onClick={() => act(a)}>
                    {a.type === 'bomb' ? t('gostop.actions.bomb') : a.shake ? t('gostop.actions.shake') : t('gostop.actions.play')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 같은 월 두 장 중 고르기 안내 */}
        {myTurn && view.phase === 'choose' && <div className="gs-pickhint" style={{ top: L.deck.cy + L.floor.dy * 1.55 }}>{t('gostop.choose_prompt')}</div>}

        {/* 고/스톱 */}
        {myTurn && view.phase === 'goStop' && (
          <div className="gs-overlay" role="dialog" aria-label={t('gostop.gostop.title')}>
            <div className="gs-overlay-box">
              <strong className="gs-gostop-title">{t('gostop.gostop.title')}</strong>
              <p className="gs-gostop-score">{t('gostop.points_unit', { n: myScore.total })}</p>
              <p className="gs-hint">{t('gostop.gostop.desc', { score: myScore.total, go: view.goCount[me] })}</p>
              <div className="gs-actions center">
                <button type="button" className="gs-btn go big" onClick={() => act({ type: 'go' })}>{t('gostop.gostop.go', { n: view.goCount[me] + 1 })}</button>
                <button type="button" className="gs-btn primary big" onClick={() => act({ type: 'stop' })}>{t('gostop.gostop.stop')}</button>
              </div>
            </div>
          </div>
        )}

        {!animating && children}
        <span className="gs-sr" aria-live="polite">{status}</span>
      </div>
    </div>
  );
};

export default GameTable;
