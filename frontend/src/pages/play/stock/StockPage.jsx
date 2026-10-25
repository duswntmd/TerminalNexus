import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import { useAuth } from '../../../context/AuthContext';
import { fetchWithAccessRaw } from '../../../util/fetchUtil';
import StockChart from './StockChart.jsx';
import OrderBook from './OrderBook.jsx';
import OrderPanel from './OrderPanel.jsx';
import AccountPanel from './AccountPanel.jsx';
import { fmt, fmtBig, tone, arrow, signed, pct, getJson } from './stockUtils.js';
import './Stock.css';

const wsUrl = () => `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws-chat/websocket`;

const StockPage = () => {
  const { isLoggedIn, user } = useAuth();
  const [params, setParams] = useSearchParams();

  const [stocks, setStocks] = useState([]);
  const [sessionEndsAt, setSessionEndsAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [connected, setConnected] = useState(false);
  const [interval, setIntervalKey] = useState('M1');
  const [candles, setCandles] = useState([]);
  const [book, setBook] = useState(null);
  const [ticks, setTicks] = useState([]);
  const [news, setNews] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [account, setAccount] = useState({ wallet: null, holdings: [], pending: [], trades: [] });
  const [picked, setPicked] = useState(null);
  const [detail, setDetail] = useState(null);

  const ticker = (params.get('t') || 'NEXUS').toUpperCase();
  const tickerRef = useRef(ticker);
  tickerRef.current = ticker;

  const select = (t) => {
    setParams({ t }, { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ── 시장 전체 ── */
  useEffect(() => {
    getJson('/api/stock/prices').then(setStocks).catch(() => {});
    getJson('/api/stock/market').then((m) => setSessionEndsAt(m.sessionEndsAt)).catch(() => {});
    getJson('/api/stock/news').then(setNews).catch(() => {});
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(clock);
  }, []);

  // 실시간 방송
  useEffect(() => {
    const client = new Client({ brokerURL: wsUrl(), reconnectDelay: 5000, debug: () => {} });
    client.onConnect = () => {
      setConnected(true);
      client.subscribe('/topic/stock-market', (m) => {
        const snap = JSON.parse(m.body);
        setStocks(snap.stocks);
        setSessionEndsAt(snap.sessionEndsAt);
        const mine = snap.ticks.filter((t) => t.ticker === tickerRef.current);
        if (mine.length) setTicks((prev) => [...mine, ...prev].slice(0, 40));
      });
      client.subscribe('/topic/stock-news', (m) => setNews((prev) => [JSON.parse(m.body), ...prev].slice(0, 30)));
    };
    client.onWebSocketClose = () => setConnected(false);
    client.activate();
    return () => client.deactivate();
  }, []);

  // 방송이 끊기면 조회로 대체
  useEffect(() => {
    if (connected) return undefined;
    const t = setInterval(() => getJson('/api/stock/prices').then(setStocks).catch(() => {}), 3000);
    return () => clearInterval(t);
  }, [connected]);

  /* ── 선택 종목 ── */
  useEffect(() => {
    let alive = true;
    setTicks([]);
    setBook(null);
    setDetail(null);
    getJson(`/api/stock/ticks/${ticker}`).then((d) => alive && setTicks(d)).catch(() => {});
    getJson(`/api/stock/detail/${ticker}`).then((d) => alive && setDetail(d)).catch(() => {});
    const load = () => {
      getJson(`/api/stock/candles/${ticker}?interval=${interval}`).then((d) => alive && setCandles(d)).catch(() => {});
      getJson(`/api/stock/orderbook/${ticker}`).then((d) => alive && setBook(d)).catch(() => {});
    };
    load();
    const t = setInterval(load, 3000);
    return () => { alive = false; clearInterval(t); };
  }, [ticker, interval]);

  /* ── 내 계좌 ── */
  const loadAccount = useCallback(async () => {
    if (!isLoggedIn) return;
    const get = async (url) => {
      const res = await fetchWithAccessRaw(url);
      return res.ok ? res.json() : null;
    };
    const [wallet, holdings, pending, trades] = await Promise.all([
      get('/api/stock/wallet'), get('/api/stock/holdings'), get('/api/stock/orders/pending'), get('/api/stock/trades'),
    ]);
    setAccount({ wallet, holdings: holdings || [], pending: pending || [], trades: trades || [] });
  }, [isLoggedIn]);

  useEffect(() => {
    loadAccount();
    if (!isLoggedIn) return undefined;
    const t = setInterval(loadAccount, 4000);
    return () => clearInterval(t);
  }, [isLoggedIn, loadAccount]);

  useEffect(() => {
    const load = () => getJson('/api/stock/leaderboard').then(setLeaderboard).catch(() => {});
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  const afterOrder = () => {
    loadAccount();
    getJson(`/api/stock/orderbook/${ticker}`).then(setBook).catch(() => {});
  };

  const cancelOrder = async (id) => {
    await fetchWithAccessRaw(`/api/stock/order/${id}`, { method: 'DELETE' });
    afterOrder();
  };

  /* ── 계산 ── */
  const stock = stocks.find((s) => s.ticker === ticker);
  const priceMap = useMemo(() => Object.fromEntries(stocks.map((s) => [s.ticker, s.currentPrice])), [stocks]);
  const priceOf = useCallback((t) => priceMap[t], [priceMap]);
  const holding = account.holdings.find((h) => h.ticker === ticker);

  const live = useMemo(() => {
    const w = account.wallet;
    if (!w) return null;
    const evaluation = account.holdings.reduce((sum, h) => sum + (priceMap[h.ticker] ?? h.currentPrice) * h.quantity, 0);
    const purchase = account.holdings.reduce((sum, h) => sum + h.avgPrice * h.quantity, 0);
    const total = w.cash + w.reservedCash + evaluation;
    return { ...w, evaluation, purchase, evalProfit: evaluation - purchase, total, rate: ((total - w.initialCash) / w.initialCash) * 100 };
  }, [account, priceMap]);

  const remain = Math.max(0, sessionEndsAt - now);
  const mm = String(Math.floor(remain / 60000)).padStart(2, '0');
  const ss = String(Math.floor((remain % 60000) / 1000)).padStart(2, '0');

  return (
    <div className="st-page">
      <Helmet>
        <title>모의 주식 거래소 - TerminalNexus</title>
        <meta name="description" content="가상 머니로 즐기는 모의 주식 거래소. 실시간 시세, 10단 호가, 캔들 차트, 지정가·시장가 주문, 수익률 랭킹." />
      </Helmet>

      <div className="st-container">
        {/* 상단: 장 상태 + 내 계좌 요약 */}
        <div className="st-topbar">
          <div>
            <h1 className="st-title">📈 모의 주식 거래소</h1>
            <p className="st-sub">
              <span className={`st-dot ${connected ? 'on' : ''}`} /> 장 운영 중 · 마감까지 <b>{mm}:{ss}</b>
              <span className="st-sub-note"> (1시간 = 1거래일, 종가가 다음 기준가)</span>
            </p>
          </div>
          {live && (
            <div className="st-summary">
              <div><span>총자산</span><b>{fmt(live.total)}</b></div>
              <div><span>평가손익</span><b className={tone(live.evalProfit)}>{signed(live.evalProfit)}</b></div>
              <div><span>수익률</span><b className={tone(live.rate)}>{pct(live.rate)}</b></div>
              <div><span>주문가능</span><b>{fmt(live.cash)}</b></div>
            </div>
          )}
        </div>

        {/* 종목 헤더 */}
        {stock && (
          <div className="st-panel st-head">
            <div className="st-head-name">
              <h2>{stock.name}</h2>
              <span>{stock.ticker} · {stock.theme}</span>
            </div>
            <div className={`st-head-price ${tone(stock.changeAmount)}`}>
              <b>{fmt(stock.currentPrice)}</b>
              <span>{arrow(stock.changeAmount)} {fmt(Math.abs(stock.changeAmount))} ({pct(stock.changeRate)})</span>
              {stock.upperLimitHit && <em className="st-limit-tag up">상한가</em>}
              {stock.lowerLimitHit && <em className="st-limit-tag down">하한가</em>}
            </div>
            <dl className="st-head-stats">
              <div><dt>시가</dt><dd className={tone(stock.open - stock.previousClose)}>{fmt(stock.open)}</dd></div>
              <div><dt>고가</dt><dd className={tone(stock.high - stock.previousClose)}>{fmt(stock.high)}</dd></div>
              <div><dt>저가</dt><dd className={tone(stock.low - stock.previousClose)}>{fmt(stock.low)}</dd></div>
              <div><dt>기준가</dt><dd>{fmt(stock.previousClose)}</dd></div>
              <div><dt>상한가</dt><dd className="up">{fmt(stock.upperLimit)}</dd></div>
              <div><dt>하한가</dt><dd className="down">{fmt(stock.lowerLimit)}</dd></div>
              <div><dt>거래량</dt><dd>{fmt(stock.volume)}</dd></div>
              <div><dt>거래대금</dt><dd>{fmtBig(stock.tradeValue)}</dd></div>
              <div><dt>시가총액</dt><dd>{fmtBig(stock.marketCap)}</dd></div>
              {detail && <div><dt>PER / PBR</dt><dd>{detail.per} / {detail.pbr}</dd></div>}
            </dl>
          </div>
        )}

        <div className="st-grid">
          {/* 종목 리스트 */}
          <div className="st-panel st-list">
            <div className="st-panel-title">종목</div>
            <div className="st-list-body">
              {stocks.map((s) => (
                <button key={s.ticker} type="button" className={`st-list-row${s.ticker === ticker ? ' is-active' : ''}`} onClick={() => select(s.ticker)}>
                  <span className="st-list-name"><b>{s.name}</b><small>{s.ticker} · 거래량 {fmtBig(s.volume)}</small></span>
                  <span className={`st-list-price ${tone(s.changeAmount)}`}>
                    <b key={s.currentPrice} className="st-flash">{fmt(s.currentPrice)}</b>
                    <small>{pct(s.changeRate)}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 차트 + 체결 */}
          <div className="st-center">
            <div className="st-panel">
              <div className="st-chart-head">
                <div className="st-seg small">
                  <button type="button" className={interval === 'M1' ? 'is-active' : ''} onClick={() => setIntervalKey('M1')}>1분</button>
                  <button type="button" className={interval === 'D1' ? 'is-active' : ''} onClick={() => setIntervalKey('D1')} title="1시간 = 1거래일">일봉</button>
                </div>
              </div>
              <StockChart candles={candles} resetKey={`${ticker}-${interval}`} />
            </div>
            <div className="st-panel st-ticks">
              <div className="st-panel-title">실시간 체결</div>
              <table className="st-table compact">
                <thead><tr><th>시각</th><th>체결가</th><th>등락</th><th>체결량</th></tr></thead>
                <tbody>
                  {ticks.slice(0, 12).map((t, i) => (
                    <tr key={`${t.time}-${i}`}>
                      <td>{new Date(t.time).toLocaleTimeString('ko-KR', { hour12: false })}</td>
                      <td className={stock ? tone(t.price - stock.previousClose) : ''}>{fmt(t.price)}</td>
                      <td className={stock ? tone(t.price - stock.previousClose) : ''}>{stock ? pct(((t.price - stock.previousClose) / stock.previousClose) * 100) : ''}</td>
                      <td className={t.side === 'BUY' ? 'up' : 'down'}>{fmt(t.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 호가 + 주문 */}
          <div className="st-right">
            <OrderBook book={book} onPick={(price) => setPicked({ price, at: Date.now() })} upperLimit={stock?.upperLimit} lowerLimit={stock?.lowerLimit} />
            <OrderPanel stock={stock} book={book} wallet={account.wallet} holding={holding} isLoggedIn={isLoggedIn} picked={picked} onOrdered={afterOrder} />
          </div>
        </div>

        <AccountPanel
          isLoggedIn={isLoggedIn}
          holdings={account.holdings}
          pending={account.pending}
          trades={account.trades}
          news={news}
          leaderboard={leaderboard}
          priceOf={priceOf}
          onCancel={cancelOrder}
          onSelect={select}
          me={user?.nickname}
        />

        <p className="st-footnote">
          가상 머니로 하는 모의 투자입니다. 실제 돈·실제 주식과 관계없습니다. 수수료 0.015% · 매도 시 거래세 0.18% · 상·하한가 ±30%
        </p>
      </div>
    </div>
  );
};

export default StockPage;
