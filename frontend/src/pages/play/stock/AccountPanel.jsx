import React, { useState } from 'react';
import { fmt, tone, signed, pct } from './stockUtils.js';

const TABS = [
  { key: 'holdings', label: '잔고' },
  { key: 'pending', label: '미체결' },
  { key: 'trades', label: '체결내역' },
  { key: 'news', label: '뉴스' },
  { key: 'rank', label: '랭킹' },
];

const time = (v) => (v ? new Date(v).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '');

/** 하단 계좌·정보 탭 (잔고 평가는 실시간 시세로 계산) */
const AccountPanel = ({ isLoggedIn, holdings, pending, trades, news, leaderboard, priceOf, onCancel, onSelect, me }) => {
  const [tab, setTab] = useState('holdings');
  const needLogin = ['holdings', 'pending', 'trades'].includes(tab) && !isLoggedIn;

  return (
    <div className="st-panel st-account">
      <div className="st-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={tab === t.key ? 'is-active' : ''} onClick={() => setTab(t.key)}>
            {t.label}{t.key === 'pending' && pending.length > 0 ? ` ${pending.length}` : ''}
          </button>
        ))}
      </div>

      <div className="st-table-wrap">
        {needLogin && <p className="st-empty">로그인하면 내 계좌를 볼 수 있어요.</p>}

        {!needLogin && tab === 'holdings' && (holdings.length === 0 ? <p className="st-empty">보유 종목이 없습니다.</p> : (
          <table className="st-table">
            <thead><tr><th>종목</th><th>보유</th><th>평균단가</th><th>현재가</th><th>평가금액</th><th>평가손익</th><th>수익률</th></tr></thead>
            <tbody>
              {holdings.map((h) => {
                const cur = priceOf(h.ticker) ?? h.currentPrice;
                const evalAmt = cur * h.quantity;
                const profit = evalAmt - h.avgPrice * h.quantity;
                const rate = h.avgPrice ? (profit / (h.avgPrice * h.quantity)) * 100 : 0;
                return (
                  <tr key={h.ticker} onClick={() => onSelect(h.ticker)} className="clickable">
                    <td className="name">{h.stockName}</td>
                    <td>{fmt(h.quantity)}{h.sellableQuantity < h.quantity && <small> (매도가능 {fmt(h.sellableQuantity)})</small>}</td>
                    <td>{fmt(h.avgPrice)}</td>
                    <td className={tone(cur - h.avgPrice)}>{fmt(cur)}</td>
                    <td>{fmt(evalAmt)}</td>
                    <td className={tone(profit)}>{signed(profit)}</td>
                    <td className={tone(profit)}>{pct(rate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ))}

        {!needLogin && tab === 'pending' && (pending.length === 0 ? <p className="st-empty">미체결 주문이 없습니다.</p> : (
          <table className="st-table">
            <thead><tr><th>시각</th><th>종목</th><th>구분</th><th>주문가</th><th>수량</th><th /></tr></thead>
            <tbody>
              {pending.map((o) => (
                <tr key={o.orderId}>
                  <td>{time(o.createdAt)}</td>
                  <td className="name">{o.stockName}</td>
                  <td className={o.tradeType === 'BUY' ? 'up' : 'down'}>{o.tradeType === 'BUY' ? '매수' : '매도'}</td>
                  <td>{fmt(o.price)}</td>
                  <td>{fmt(o.quantity)}</td>
                  <td><button type="button" className="st-mini-btn" onClick={() => onCancel(o.orderId)}>취소</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}

        {!needLogin && tab === 'trades' && (trades.length === 0 ? <p className="st-empty">체결 내역이 없습니다.</p> : (
          <table className="st-table">
            <thead><tr><th>시각</th><th>종목</th><th>구분</th><th>체결가</th><th>수량</th><th>금액</th><th>수수료·세금</th></tr></thead>
            <tbody>
              {trades.map((t) => (
                <tr key={t.id}>
                  <td>{time(t.tradedAt)}</td>
                  <td className="name">{t.stockName}</td>
                  <td className={t.tradeType === 'BUY' ? 'up' : 'down'}>{t.tradeType === 'BUY' ? '매수' : '매도'}</td>
                  <td>{fmt(t.price)}</td>
                  <td>{fmt(t.quantity)}</td>
                  <td>{fmt(t.amount)}</td>
                  <td>{fmt(t.fee)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}

        {tab === 'news' && (news.length === 0 ? <p className="st-empty">아직 뉴스가 없습니다.</p> : (
          <ul className="st-news">
            {news.map((n) => (
              <li key={n.id} onClick={() => n.ticker && onSelect(n.ticker)} className={n.ticker ? 'clickable' : ''}>
                <span className="st-news-time">{time(n.createdAt)}</span>
                <span className={`st-news-badge ${n.newsType === 'GOOD' ? 'up' : n.newsType === 'BAD' ? 'down' : 'flat'}`}>
                  {n.newsType === 'GOOD' ? '호재' : n.newsType === 'BAD' ? '악재' : '시장'}
                </span>
                <span className="st-news-title">{n.title}</span>
              </li>
            ))}
          </ul>
        ))}

        {tab === 'rank' && (leaderboard.length === 0 ? <p className="st-empty">아직 참가자가 없습니다.</p> : (
          <table className="st-table">
            <thead><tr><th>순위</th><th>닉네임</th><th>총자산</th><th>수익률</th></tr></thead>
            <tbody>
              {leaderboard.map((r, i) => (
                <tr key={r.userId} className={r.nickname === me ? 'is-me' : ''}>
                  <td>{i + 1}</td>
                  <td className="name">{r.nickname}</td>
                  <td>{fmt(r.totalAsset)}</td>
                  <td className={tone(r.returnRate)}>{pct(r.returnRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}
      </div>
    </div>
  );
};

export default AccountPanel;
