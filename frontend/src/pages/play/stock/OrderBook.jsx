import React from 'react';
import { fmt, tone } from './stockUtils.js';

/**
 * 10단 호가창: 위쪽 매도호가(높은 가격부터), 아래쪽 매수호가
 * 가격을 누르면 주문창 가격으로 설정
 */
const OrderBook = ({ book, onPick, upperLimit, lowerLimit }) => {
  if (!book) return <div className="st-panel st-empty">호가 불러오는 중…</div>;
  const max = Math.max(1, ...book.asks.map((a) => a.quantity), ...book.bids.map((b) => b.quantity));
  const base = book.previousClose;

  const row = (item, side) => {
    const diff = item.price - base;
    const rate = base ? (diff / base) * 100 : 0;
    const isCur = item.price === book.currentPrice;
    return (
      <button
        key={`${side}${item.price}`}
        type="button"
        className={`st-ob-row ${side}${isCur ? ' is-current' : ''}`}
        onClick={() => onPick(item.price)}
        title="이 가격으로 주문"
      >
        <span className="st-ob-qty ask-side">
          {side === 'ask' && (
            <>
              <i style={{ width: `${(item.quantity / max) * 100}%` }} />
              <b>{fmt(item.quantity)}</b>
              {item.myQuantity > 0 && <em>내 {fmt(item.myQuantity)}</em>}
            </>
          )}
        </span>
        <span className={`st-ob-price ${tone(diff)}`}>
          {fmt(item.price)}
          <small>{rate > 0 ? '+' : ''}{rate.toFixed(2)}%</small>
          {item.price === upperLimit && <small className="st-limit-tag up">상</small>}
          {item.price === lowerLimit && <small className="st-limit-tag down">하</small>}
        </span>
        <span className="st-ob-qty bid-side">
          {side === 'bid' && (
            <>
              <i style={{ width: `${(item.quantity / max) * 100}%` }} />
              <b>{fmt(item.quantity)}</b>
              {item.myQuantity > 0 && <em>내 {fmt(item.myQuantity)}</em>}
            </>
          )}
        </span>
      </button>
    );
  };

  return (
    <div className="st-panel st-orderbook">
      <div className="st-panel-title">호가</div>
      <div className="st-ob-head"><span>매도잔량</span><span>가격</span><span>매수잔량</span></div>
      {book.asks.length === 0 && <p className="st-ob-note">상한가 · 매도 잔량 없음</p>}
      {book.asks.map((a) => row(a, 'ask'))}
      {book.bids.map((b) => row(b, 'bid'))}
      {book.bids.length === 0 && <p className="st-ob-note">하한가 · 매수 잔량 없음</p>}
      <div className="st-ob-total">
        <span>{fmt(book.totalAsk)}</span>
        <span>총잔량</span>
        <span>{fmt(book.totalBid)}</span>
      </div>
    </div>
  );
};

export default OrderBook;
