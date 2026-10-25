import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchWithAccessRaw } from '../../../util/fetchUtil';
import { FEE_RATE, fee, tax, fmt, tickUp, tickDown, tickSize, floorToTick } from './stockUtils.js';

/**
 * 주문창: 매수/매도 · 지정가/시장가
 * picked: 호가창에서 고른 가격 { price, at }
 */
const OrderPanel = ({ stock, book, wallet, holding, isLoggedIn, picked, onOrdered }) => {
  const [side, setSide] = useState('BUY');
  const [type, setType] = useState('LIMIT');
  const [price, setPrice] = useState(0);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  // 종목이 바뀌면 현재가로 초기화
  useEffect(() => {
    if (stock) setPrice(stock.currentPrice);
    setMsg(null);
  }, [stock?.ticker]); // eslint-disable-line react-hooks/exhaustive-deps

  // 호가창 클릭
  useEffect(() => {
    if (picked) {
      setPrice(picked.price);
      setType('LIMIT');
    }
  }, [picked]);

  if (!stock) return null;

  const bestAsk = book?.asks.length ? book.asks[book.asks.length - 1].price : null;
  const bestBid = book?.bids.length ? book.bids[0].price : null;
  const execPrice = type === 'MARKET' ? (side === 'BUY' ? bestAsk : bestBid) : price;

  const cash = wallet?.cash ?? 0;
  const sellable = holding?.sellableQuantity ?? 0;
  const maxQty = side === 'BUY'
    ? (execPrice ? Math.floor(cash / (execPrice * (1 + FEE_RATE))) : 0)
    : sellable;

  const amount = (execPrice || 0) * qty;
  const f = fee(amount);
  const t = side === 'SELL' ? tax(amount) : 0;
  const total = side === 'BUY' ? amount + f : amount - f - t;

  const clampPrice = (p) => Math.min(stock.upperLimit, Math.max(stock.lowerLimit, floorToTick(p)));

  const submit = async (e) => {
    e.preventDefault();
    if (!qty || qty < 1) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetchWithAccessRaw('/api/stock/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: stock.ticker, tradeType: side, orderType: type, price: type === 'LIMIT' ? price : null, quantity: qty }),
      });
      const data = await res.json().catch(() => ({}));
      setMsg({ ok: res.ok, text: data.message || (res.ok ? '주문 완료' : '주문 실패') });
      if (res.ok) onOrdered?.();
    } catch {
      setMsg({ ok: false, text: '통신 오류가 발생했습니다.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="st-panel st-order" onSubmit={submit}>
      <div className="st-order-tabs">
        <button type="button" className={`buy${side === 'BUY' ? ' is-active' : ''}`} onClick={() => setSide('BUY')}>매수</button>
        <button type="button" className={`sell${side === 'SELL' ? ' is-active' : ''}`} onClick={() => setSide('SELL')}>매도</button>
      </div>

      <div className="st-seg">
        <button type="button" className={type === 'LIMIT' ? 'is-active' : ''} onClick={() => setType('LIMIT')}>지정가</button>
        <button type="button" className={type === 'MARKET' ? 'is-active' : ''} onClick={() => setType('MARKET')}>시장가</button>
      </div>

      <label className="st-field">
        <span>가격</span>
        <div className="st-stepper">
          <button type="button" disabled={type === 'MARKET'} onClick={() => setPrice((p) => clampPrice(tickDown(p)))} aria-label="한 호가 내리기">−</button>
          <input
            type="text"
            inputMode="numeric"
            value={type === 'MARKET' ? '시장가' : fmt(price)}
            disabled={type === 'MARKET'}
            onChange={(e) => setPrice(Number(e.target.value.replace(/[^0-9]/g, '')) || 0)}
            onBlur={() => setPrice((p) => clampPrice(p || stock.currentPrice))}
          />
          <button type="button" disabled={type === 'MARKET'} onClick={() => setPrice((p) => clampPrice(tickUp(p)))} aria-label="한 호가 올리기">+</button>
        </div>
        {type === 'LIMIT' && <small className="st-hint">호가 단위 {fmt(tickSize(price || stock.currentPrice))}원 · {fmt(stock.lowerLimit)} ~ {fmt(stock.upperLimit)}</small>}
        {type === 'MARKET' && <small className="st-hint">{side === 'BUY' ? `매도1호가 ${fmt(bestAsk)}원` : `매수1호가 ${fmt(bestBid)}원`}에 즉시 체결</small>}
      </label>

      <label className="st-field">
        <span>수량</span>
        <div className="st-stepper">
          <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="수량 빼기">−</button>
          <input type="text" inputMode="numeric" value={fmt(qty)} onChange={(e) => setQty(Number(e.target.value.replace(/[^0-9]/g, '')) || 0)} />
          <button type="button" onClick={() => setQty((q) => q + 1)} aria-label="수량 더하기">+</button>
        </div>
        <div className="st-pct">
          {[0.1, 0.25, 0.5, 1].map((r) => (
            <button key={r} type="button" disabled={!isLoggedIn || maxQty < 1} onClick={() => setQty(Math.max(1, Math.floor(maxQty * r)))}>
              {r === 1 ? '최대' : `${r * 100}%`}
            </button>
          ))}
        </div>
      </label>

      <dl className="st-order-info">
        <div><dt>{side === 'BUY' ? '주문가능금액' : '매도가능수량'}</dt><dd>{isLoggedIn ? (side === 'BUY' ? `${fmt(cash)}원` : `${fmt(sellable)}주`) : '-'}</dd></div>
        <div><dt>{side === 'BUY' ? '최대 매수' : '평균단가'}</dt><dd>{isLoggedIn ? (side === 'BUY' ? `${fmt(maxQty)}주` : holding ? `${fmt(holding.avgPrice)}원` : '-') : '-'}</dd></div>
        <div><dt>주문금액</dt><dd>{fmt(amount)}원</dd></div>
        <div><dt>수수료{side === 'SELL' ? ' + 거래세' : ''}</dt><dd>{fmt(f + t)}원</dd></div>
        <div className="total"><dt>{side === 'BUY' ? '총 결제금액' : '예상 입금액'}</dt><dd>{fmt(total)}원</dd></div>
      </dl>

      {isLoggedIn ? (
        <button type="submit" className={`st-submit ${side === 'BUY' ? 'buy' : 'sell'}`} disabled={busy || qty < 1 || !execPrice}>
          {busy ? '주문 중…' : `${type === 'MARKET' ? '시장가 ' : ''}${side === 'BUY' ? '매수' : '매도'}`}
        </button>
      ) : (
        <Link className="st-submit buy" to={`/login?redirect=${encodeURIComponent('/play/stock')}`}>로그인하고 거래하기</Link>
      )}
      {msg && <p className={`st-order-msg ${msg.ok ? 'ok' : 'err'}`} role="status">{msg.text}</p>}
    </form>
  );
};

export default OrderPanel;
