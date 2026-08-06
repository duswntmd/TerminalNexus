import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../../context/AuthContext';
import { Client } from '@stomp/stompjs';
import './StockPage.css';

const BACKEND_URL = import.meta.env.VITE_API_URL ||
  (window.location.hostname === 'localhost'
    ? 'http://localhost:8080'
    : `${window.location.protocol}//${window.location.host}`);

const StockPage = () => {
  const { user } = useAuth();
  const [stocks, setStocks] = useState([]);
  const [selectedTicker, setSelectedTicker] = useState('NEXUS');
  const [history, setHistory] = useState([]);
  const [candles, setCandles] = useState([]);
  const [orderBook, setOrderBook] = useState(null);
  const [companyDetail, setCompanyDetail] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const [wallet, setWallet] = useState(null);
  const [holdings, setHoldings] = useState([]);
  const [trades, setTrades] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [newsList, setNewsList] = useState([]);
  const [latestNews, setLatestNews] = useState(null);
  const [tab, setTab] = useState('portfolio'); // 'portfolio' | 'pending' | 'trades' | 'news' | 'rank'

  // 차트 설정 (line vs candle)
  const [chartType, setChartType] = useState('line');

  // 고급 주문 설정
  const [positionType, setPositionType] = useState('LONG'); // 'LONG' | 'SHORT'
  const [orderType, setOrderType] = useState('MARKET'); // 'MARKET' | 'LIMIT'
  const [leverage, setLeverage] = useState(1); // 1 | 2
  const [targetPrice, setTargetPrice] = useState(50000);
  const [orderQty, setOrderQty] = useState(1);
  const [msg, setMsg] = useState({ text: '', type: '' });

  const canvasRef = useRef(null);

  // 1. 초기 종목 / 뉴스 / 랭킹 조회
  const fetchStocks = async () => {
    try {
      const res = await fetch('/api/stock/prices');
      if (res.ok) setStocks(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchNews = async () => {
    try {
      const res = await fetch('/api/stock/news');
      if (res.ok) {
        const data = await res.json();
        setNewsList(data);
        if (data.length > 0) setLatestNews(data[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 2. 종목 히스토리 & 호가창 & 캔들 조회
  const fetchTickerData = async (ticker) => {
    try {
      const [hRes, cRes, obRes] = await Promise.all([
        fetch(`/api/stock/history/${ticker}`),
        fetch(`/api/stock/candles/${ticker}`),
        fetch(`/api/stock/orderbook/${ticker}`)
      ]);

      if (hRes.ok) setHistory(await hRes.json());
      if (cRes.ok) setCandles(await cRes.json());
      if (obRes.ok) setOrderBook(await obRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  // 3. 기업 정보 모달 조회
  const openCompanyModal = async (ticker) => {
    try {
      const res = await fetch(`/api/stock/detail/${ticker}`);
      if (res.ok) {
        setCompanyDetail(await res.json());
        setShowModal(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 4. 유저 자산 / 미체결 주문 / 거래내역
  const fetchUserData = async () => {
    if (!user) return;
    try {
      const [wRes, hRes, tRes, pRes] = await Promise.all([
        fetch('/api/stock/wallet'),
        fetch('/api/stock/holdings'),
        fetch('/api/stock/trades'),
        fetch('/api/stock/orders/pending')
      ]);

      if (wRes.ok) setWallet(await wRes.json());
      if (hRes.ok) setHoldings(await hRes.json());
      if (tRes.ok) setTrades(await tRes.json());
      if (pRes.ok) setPendingOrders(await pRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/stock/leaderboard');
      if (res.ok) setLeaderboard(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStocks();
    fetchNews();
    fetchLeaderboard();
  }, []);

  useEffect(() => {
    fetchUserData();
  }, [user]);

  useEffect(() => {
    if (selectedTicker) {
      fetchTickerData(selectedTicker);
      const curStock = stocks.find(s => s.ticker === selectedTicker);
      if (curStock) setTargetPrice(curStock.currentPrice);
    }
  }, [selectedTicker]);

  // 5. 웹소켓 실시간 수신
  useEffect(() => {
    const wsUrl = BACKEND_URL.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
    const client = new Client({
      brokerURL: `${wsUrl}/ws-chat`,
      debug: () => {},
      reconnectDelay: 5000,
    });

    client.onConnect = () => {
      client.subscribe('/topic/stock-prices', (message) => {
        try {
          const updatedStocks = JSON.parse(message.body);
          setStocks(updatedStocks);

          const curStock = updatedStocks.find(s => s.ticker === selectedTicker);
          if (curStock) {
            setHistory(prev => {
              const newHist = [...prev, { price: curStock.currentPrice, recordedAt: new Date().toISOString() }];
              return newHist.slice(-50);
            });
          }
        } catch (e) {
          console.error(e);
        }
      });

      client.subscribe('/topic/stock-news', (message) => {
        try {
          const news = JSON.parse(message.body);
          setLatestNews(news);
          setNewsList(prev => [news, ...prev].slice(0, 20));
        } catch (e) {
          console.error(e);
        }
      });
    };

    client.activate();

    const interval = setInterval(() => {
      fetchStocks();
      if (selectedTicker) fetchTickerData(selectedTicker);
      if (user) fetchUserData();
    }, 3000);

    return () => {
      client.deactivate();
      clearInterval(interval);
    };
  }, [selectedTicker, user]);

  // 6. Canvas 렌더링 (라인 차트 vs 캔들스틱 봉차트)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    ctx.clearRect(0, 0, width, height);

    // 그리드 선
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let y = 30; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    if (chartType === 'line') {
      if (history.length < 2) return;
      const prices = history.map(h => h.price);
      const minPrice = Math.min(...prices) * 0.995;
      const maxPrice = Math.max(...prices) * 1.005;

      const currentStock = stocks.find(s => s.ticker === selectedTicker);
      const isUp = currentStock ? currentStock.changeAmount >= 0 : true;
      const lineColor = isUp ? '#ef4444' : '#3b82f6';
      const gradientTop = isUp ? 'rgba(239, 68, 68, 0.22)' : 'rgba(59, 130, 246, 0.22)';

      const points = prices.map((price, idx) => {
        const x = (idx / Math.max(1, prices.length - 1)) * (width - 40) + 20;
        const y = height - 20 - ((price - minPrice) / (maxPrice - minPrice)) * (height - 40);
        return { x, y, price };
      });

      // Gradient Fill
      const areaGradient = ctx.createLinearGradient(0, 0, 0, height);
      areaGradient.addColorStop(0, gradientTop);
      areaGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.beginPath();
      ctx.moveTo(points[0].x, height - 20);
      points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(points[points.length - 1].x, height - 20);
      ctx.closePath();
      ctx.fillStyle = areaGradient;
      ctx.fill();

      // MA5
      if (prices.length >= 5) {
        ctx.beginPath();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        for (let i = 4; i < points.length; i++) {
          const avg = prices.slice(i - 4, i + 1).reduce((a, b) => a + b, 0) / 5;
          const y = height - 20 - ((avg - minPrice) / (maxPrice - minPrice)) * (height - 40);
          if (i === 4) ctx.moveTo(points[i].x, y);
          else ctx.lineTo(points[i].x, y);
        }
        ctx.stroke();
      }

      // MA20
      if (prices.length >= 20) {
        ctx.beginPath();
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 1.5;
        for (let i = 19; i < points.length; i++) {
          const avg = prices.slice(i - 19, i + 1).reduce((a, b) => a + b, 0) / 20;
          const y = height - 20 - ((avg - minPrice) / (maxPrice - minPrice)) * (height - 40);
          if (i === 19) ctx.moveTo(points[i].x, y);
          else ctx.lineTo(points[i].x, y);
        }
        ctx.stroke();
      }

      // 메인 주가 라인
      ctx.beginPath();
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      points.forEach((p, idx) => {
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();

      // 포인트 Glow
      const lastPoint = points[points.length - 1];
      ctx.beginPath();
      ctx.arc(lastPoint.x, lastPoint.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = lineColor;
      ctx.shadowColor = lineColor;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

    } else if (chartType === 'candle') {
      // ── 캔들스틱 OHLC 봉차트 렌더링 ──
      if (candles.length === 0) return;

      const allLows = candles.map(c => c.low);
      const allHighs = candles.map(c => c.high);
      const minP = Math.min(...allLows) * 0.995;
      const maxP = Math.max(...allHighs) * 1.005;

      const candleWidth = Math.max(6, (width - 40) / candles.length - 4);

      candles.forEach((c, idx) => {
        const x = (idx / Math.max(1, candles.length - 1)) * (width - 40) + 20;

        const openY = height - 20 - ((c.open - minP) / (maxP - minP)) * (height - 40);
        const closeY = height - 20 - ((c.close - minP) / (maxP - minP)) * (height - 40);
        const highY = height - 20 - ((c.high - minP) / (maxP - minP)) * (height - 40);
        const lowY = height - 20 - ((c.low - minP) / (maxP - minP)) * (height - 40);

        const isBull = c.close >= c.open;
        const color = isBull ? '#ef4444' : '#3b82f6';

        // 윗꼬리 / 아래꼬리 선
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();

        // 캔들 몸통
        const bodyTop = Math.min(openY, closeY);
        const bodyHeight = Math.max(2, Math.abs(closeY - openY));

        ctx.fillStyle = color;
        ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
      });
    }

  }, [history, candles, chartType, selectedTicker, stocks]);

  // 7. 신규 고도화 주문 접수
  const handleOrderSubmit = async (tradeType) => {
    if (!user) {
      setMsg({ text: '로그인이 필요합니다.', type: 'error' });
      return;
    }
    try {
      const res = await fetch('/api/stock/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: selectedTicker,
          tradeType,
          positionType,
          orderType,
          leverage,
          targetPrice: Number(targetPrice),
          quantity: Number(orderQty)
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMsg({ text: data.message || '주문이 접수되었습니다.', type: 'success' });
        fetchUserData();
      } else {
        setMsg({ text: data.message || '주문 오류', type: 'error' });
      }
    } catch (e) {
      setMsg({ text: '통신 오류가 발생했습니다.', type: 'error' });
    }
  };

  // 8. 미체결 주문 취소
  const handleCancelOrder = async (orderId) => {
    try {
      const res = await fetch(`/api/stock/order/${orderId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: '주문이 취소되었습니다.', type: 'success' });
        fetchUserData();
      } else {
        setMsg({ text: data.message || '취소 실패', type: 'error' });
      }
    } catch (e) {
      setMsg({ text: '통신 오류가 발생했습니다.', type: 'error' });
    }
  };

  const selectedStock = stocks.find(s => s.ticker === selectedTicker) || {
    name: selectedTicker,
    currentPrice: 0,
    changeAmount: 0,
    changeRate: 0,
    isUpperLimit: false,
    isLowerLimit: false,
    isCircuitBreaker: false,
  };

  const isUp = selectedStock.changeAmount >= 0;

  return (
    <div className="stock-container">
      <Helmet>
        <title>미니 주식 시뮬레이터 (거래소 HTS) | TerminalNexus</title>
      </Helmet>

      {/* 헤더 */}
      <div className="stock-header">
        <h1 className="stock-title">
          📈 Terminal Market <span className="stock-badge">EXCHANGE HTS v2.0</span>
        </h1>
        {msg.text && (
          <div style={{
            color: msg.type === 'error' ? '#ef4444' : '#10b981',
            fontWeight: 700,
            fontSize: '0.85rem',
            background: 'rgba(0,0,0,0.4)',
            padding: '4px 12px',
            borderRadius: '20px',
            border: `1px solid ${msg.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`
          }}>
            {msg.text}
          </div>
        )}
      </div>

      {/* 실시간 속보 전광판 티커 바 */}
      <div className="news-ticker-bar">
        <div className="news-ticker-label">
          📰 LIVE NEWS
        </div>
        <div className="news-ticker-content">
          {latestNews ? (
            <span className={latestNews.newsType === 'GOOD' ? 'news-good' : 'news-bad'}>
              [{latestNews.stockName}] {latestNews.title} ({latestNews.priceImpactPercent >= 0 ? '+' : ''}{latestNews.priceImpactPercent}%)
            </span>
          ) : (
            <span style={{ color: '#64748b' }}>실시간 주식 속보 뉴스가 수신 대기 중입니다...</span>
          )}
        </div>
      </div>

      {/* 4단 레이아웃 (종목리스트 | 차트&주문 | 호가창 | 포트폴리오&랭킹) */}
      <div className="stock-grid">

        {/* 1. 좌측 종목 리스트 */}
        <div className="stock-card">
          <div className="stock-list-header">
            <span>종목명 / 티커</span>
            <span>현재가 / 등락률</span>
          </div>
          <div className="stock-list">
            {stocks.map(item => {
              const itemUp = item.changeAmount >= 0;
              const isActive = item.ticker === selectedTicker;
              return (
                <div
                  key={item.ticker}
                  className={`stock-item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedTicker(item.ticker);
                    setTargetPrice(item.currentPrice);
                    setMsg({ text: '', type: '' });
                  }}
                >
                  <div>
                    <div className="stock-item-name">
                      {item.name}
                      {item.isCircuitBreaker && <span className="circuit-badge">CB</span>}
                    </div>
                    <div className="stock-item-ticker">{item.ticker}</div>
                  </div>
                  <div className="stock-item-price">
                    <div>{item.currentPrice.toLocaleString()}원</div>
                    <div className={`stock-item-rate ${itemUp ? 'up' : 'down'}`}>
                      {itemUp ? '▲' : '▼'} {Math.abs(item.changeRate)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. 중앙 메인 차트 및 종합 주문 컨트롤러 */}
        <div className="stock-card stock-main-content">
          <div className="stock-detail-header">
            <div>
              <div className="stock-detail-title">
                {selectedStock.name} ({selectedStock.ticker})
                <button className="btn-info-modal" onClick={() => openCompanyModal(selectedStock.ticker)}>
                  🔍 기업정보
                </button>
                {selectedStock.isCircuitBreaker && <span className="circuit-badge">서킷브레이커 발동</span>}
                {selectedStock.isUpperLimit && <span className="limit-badge limit-upper">상한가 (+30%)</span>}
                {selectedStock.isLowerLimit && <span className="limit-badge limit-lower">하한가 (-30%)</span>}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className={`stock-detail-price ${isUp ? 'up' : 'down'}`}>
                {selectedStock.currentPrice.toLocaleString()}원
              </span>
              <span className={`stock-detail-change ${isUp ? 'up' : 'down'}`}>
                {isUp ? '▲' : '▼'} {Math.abs(selectedStock.changeAmount).toLocaleString()} ({selectedStock.changeRate}%)
              </span>
            </div>
          </div>

          {/* 차트 헤더 & 유형 토글 (라인 ↔ 캔들스틱) */}
          <div className="chart-header-bar">
            <div className="chart-legend">
              <div className="legend-item">
                <div className="legend-line" style={{ background: isUp ? '#ef4444' : '#3b82f6' }} /> 시세
              </div>
              <div className="legend-item">
                <div className="legend-line" style={{ background: '#f59e0b' }} /> MA5
              </div>
              <div className="legend-item">
                <div className="legend-line" style={{ background: '#a855f7' }} /> MA20
              </div>
            </div>

            <div className="chart-type-toggle">
              <button
                className={`chart-type-btn ${chartType === 'line' ? 'active' : ''}`}
                onClick={() => setChartType('line')}
              >
                📈 라인 차트
              </button>
              <button
                className={`chart-type-btn ${chartType === 'candle' ? 'active' : ''}`}
                onClick={() => setChartType('candle')}
              >
                📊 캔들 봉차트
              </button>
            </div>
          </div>

          {/* Canvas 차트 */}
          <div className="chart-wrapper">
            <canvas ref={canvasRef} className="chart-canvas" />
          </div>

          {/* 고도화 주문 컨트롤 패널 */}
          <div className="order-control-panel">
            {/* 서브 탭 (포지션 선택 / 주문 유형 선택) */}
            <div className="order-tab-group">
              <button
                className={`order-sub-tab ${positionType === 'LONG' ? 'active-long' : ''}`}
                onClick={() => setPositionType('LONG')}
              >
                📈 LONG (매수/상승베팅)
              </button>
              <button
                className={`order-sub-tab ${positionType === 'SHORT' ? 'active-short' : ''}`}
                onClick={() => setPositionType('SHORT')}
              >
                📉 SHORT (공매도/하락베팅)
              </button>

              <div style={{ flex: 1 }} />

              <button
                className={`order-sub-tab ${orderType === 'MARKET' ? 'active-type' : ''}`}
                onClick={() => setOrderType('MARKET')}
              >
                ⚡ 시장가
              </button>
              <button
                className={`order-sub-tab ${orderType === 'LIMIT' ? 'active-type' : ''}`}
                onClick={() => setOrderType('LIMIT')}
              >
                🎯 지정가 (예약)
              </button>
            </div>

            {/* 주문 폼 필드 */}
            <div className="order-form-grid">
              <div>
                <div className="order-field-label">
                  {orderType === 'LIMIT' ? '목표 지정가 (원)' : '현재 시장가 (원)'}
                </div>
                <input
                  type="number"
                  className="order-input"
                  value={orderType === 'LIMIT' ? targetPrice : selectedStock.currentPrice}
                  onChange={(e) => setTargetPrice(Number(e.target.value))}
                  disabled={orderType === 'MARKET'}
                />
              </div>

              <div>
                <div className="order-field-label">주문 수량 (주)</div>
                <input
                  type="number"
                  min="1"
                  className="order-input"
                  value={orderQty}
                  onChange={(e) => setOrderQty(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                레버리지 선택:
              </div>
              <div className="leverage-selector" style={{ width: '140px' }}>
                <button className={`leverage-btn ${leverage === 1 ? 'active' : ''}`} onClick={() => setLeverage(1)}>
                  1x (기본)
                </button>
                <button className={`leverage-btn ${leverage === 2 ? 'active' : ''}`} onClick={() => setLeverage(2)}>
                  2x (레버리지)
                </button>
              </div>
            </div>

            {/* 제출 버튼 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                className="btn-order-submit long"
                onClick={() => handleOrderSubmit('BUY')}
                disabled={selectedStock.isCircuitBreaker}
              >
                {positionType === 'LONG' ? '매수 진입' : '숏 포지션 청산'} (BUY)
              </button>
              <button
                className="btn-order-submit short"
                onClick={() => handleOrderSubmit('SELL')}
                disabled={selectedStock.isCircuitBreaker}
              >
                {positionType === 'SHORT' ? '공매도 진입' : '롱 포지션 청산'} (SELL)
              </button>
            </div>
          </div>
        </div>

        {/* 3. 실시간 10호가창 (Order Book) 패널 */}
        <div className="stock-card orderbook-panel">
          <div className="orderbook-header">
            <span>실시간 10호가</span>
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>단위: 원/주</span>
          </div>

          <div className="orderbook-body">
            {/* 매도 5호가 */}
            {orderBook && orderBook.askOrders && orderBook.askOrders.map((ask, idx) => (
              <div
                key={`ask-${idx}`}
                className="orderbook-row orderbook-ask"
                onClick={() => setTargetPrice(ask.price)}
              >
                <div className="orderbook-bar-ask" style={{ width: `${Math.min(100, ask.ratio)}%` }} />
                <span className="orderbook-price">{ask.price.toLocaleString()}</span>
                <span className="orderbook-qty">{ask.quantity}</span>
              </div>
            ))}

            {/* 현재가 경계 라인 */}
            <div style={{
              padding: '6px 0', textAlign: 'center', fontWeight: 900,
              color: isUp ? '#ef4444' : '#3b82f6', background: 'rgba(0,0,0,0.5)',
              margin: '4px 0', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)'
            }}>
              현재가: {selectedStock.currentPrice.toLocaleString()}원
            </div>

            {/* 매수 5호가 */}
            {orderBook && orderBook.bidOrders && orderBook.bidOrders.map((bid, idx) => (
              <div
                key={`bid-${idx}`}
                className="orderbook-row orderbook-bid"
                onClick={() => setTargetPrice(bid.price)}
              >
                <div className="orderbook-bar-bid" style={{ width: `${Math.min(100, bid.ratio)}%` }} />
                <span className="orderbook-price">{bid.price.toLocaleString()}</span>
                <span className="orderbook-qty">{bid.quantity}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 4. 우측 자산 / 미체결 / 거래내역 / 뉴스 / 랭킹 */}
        <div className="stock-card">
          <div className="tab-header">
            <div className={`tab-item ${tab === 'portfolio' ? 'active' : ''}`} onClick={() => setTab('portfolio')}>
              포트폴리오
            </div>
            <div className={`tab-item ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>
              미체결 ({pendingOrders.length})
            </div>
            <div className={`tab-item ${tab === 'trades' ? 'active' : ''}`} onClick={() => setTab('trades')}>
              거래내역
            </div>
            <div className={`tab-item ${tab === 'news' ? 'active' : ''}`} onClick={() => setTab('news')}>
              속보
            </div>
            <div className={`tab-item ${tab === 'rank' ? 'active' : ''}`} onClick={() => setTab('rank')}>
              랭킹
            </div>
          </div>

          <div className="tab-body">
            {/* 탭 1: 포트폴리오 */}
            {tab === 'portfolio' && (
              <div>
                {!user ? (
                  <div style={{ color: '#64748b', padding: '40px 0', textAlign: 'center' }}>
                    로그인 후 포트폴리오 관리가 가능합니다.
                  </div>
                ) : (
                  <>
                    {wallet && (
                      <div className="asset-summary">
                        <div className="asset-row">
                          <span className="asset-label">총 자산</span>
                          <span className="asset-value" style={{ color: '#38bdf8' }}>{wallet.totalAsset.toLocaleString()}원</span>
                        </div>
                        <div className="asset-row">
                          <span className="asset-label">보유 현금</span>
                          <span className="asset-value">{wallet.cash.toLocaleString()}원</span>
                        </div>
                        <div className="asset-row">
                          <span className="asset-label">전체 수익률</span>
                          <span className={`asset-value ${wallet.totalReturnRate >= 0 ? 'up' : 'down'}`}>
                            {wallet.totalReturnRate >= 0 ? '+' : ''}{wallet.totalReturnRate}%
                          </span>
                        </div>
                      </div>
                    )}

                    <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '8px', color: '#94a3b8' }}>
                      보유 포지션 목록 ({holdings.length})
                    </div>

                    {holdings.length === 0 ? (
                      <div style={{ color: '#64748b', fontSize: '0.78rem', textAlign: 'center', padding: '20px 0' }}>
                        보유 중인 포지션이 없습니다.
                      </div>
                    ) : (
                      <table className="table-mini">
                        <thead>
                          <tr>
                            <th>포지션</th>
                            <th>수량/평단</th>
                            <th>평가금액</th>
                            <th>수익률</th>
                          </tr>
                        </thead>
                        <tbody>
                          {holdings.map(h => (
                            <tr key={h.holdingId}>
                              <td>
                                <div style={{ fontWeight: 700 }}>{h.stockName}</div>
                                <div style={{ fontSize: '0.68rem', color: h.positionType === 'LONG' ? '#ef4444' : '#3b82f6' }}>
                                  {h.positionType} · {h.leverage}x
                                </div>
                              </td>
                              <td>
                                <div>{h.quantity}주</div>
                                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{h.avgPrice.toLocaleString()}원</div>
                              </td>
                              <td style={{ fontWeight: 700 }}>
                                {h.totalEvaluation.toLocaleString()}원
                              </td>
                              <td className={h.returnRate >= 0 ? 'up' : 'down'} style={{ fontWeight: 700 }}>
                                {h.returnRate >= 0 ? '+' : ''}{h.returnRate}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </>
                )}
              </div>
            )}

            {/* 탭 2: 미체결 지정가 예약 주문 */}
            {tab === 'pending' && (
              <div>
                {!user ? (
                  <div style={{ color: '#64748b', textAlign: 'center', padding: '40px 0' }}>
                    로그인 후 미체결 내역을 확인할 수 있습니다.
                  </div>
                ) : pendingOrders.length === 0 ? (
                  <div style={{ color: '#64748b', textAlign: 'center', padding: '40px 0' }}>
                    미체결 지정가 주문이 없습니다.
                  </div>
                ) : (
                  <table className="table-mini">
                    <thead>
                      <tr>
                        <th>종목/타입</th>
                        <th>지정가</th>
                        <th>수량</th>
                        <th>취소</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingOrders.map(o => (
                        <tr key={o.orderId}>
                          <td>
                            <div style={{ fontWeight: 700 }}>{o.stockName}</div>
                            <div style={{ fontSize: '0.68rem', color: o.positionType === 'LONG' ? '#ef4444' : '#3b82f6' }}>
                              {o.tradeType} · {o.positionType}
                            </div>
                          </td>
                          <td style={{ fontWeight: 700 }}>
                            {o.targetPrice.toLocaleString()}원
                          </td>
                          <td>{o.quantity}주</td>
                          <td>
                            <button className="btn-cancel-order" onClick={() => handleCancelOrder(o.orderId)}>
                              취소
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* 탭 3: 체결 거래 내역 */}
            {tab === 'trades' && (
              <div>
                {!user ? (
                  <div style={{ color: '#64748b', textAlign: 'center', padding: '40px 0' }}>
                    로그인 후 거래 내역을 확인할 수 있습니다.
                  </div>
                ) : trades.length === 0 ? (
                  <div style={{ color: '#64748b', textAlign: 'center', padding: '40px 0' }}>
                    거래 내역이 없습니다.
                  </div>
                ) : (
                  <table className="table-mini">
                    <thead>
                      <tr>
                        <th>구분</th>
                        <th>종목</th>
                        <th>수량/단가</th>
                        <th>총액</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trades.map(t => (
                        <tr key={t.id}>
                          <td className={t.tradeType === 'BUY' ? 'up' : 'down'} style={{ fontWeight: 800 }}>
                            {t.tradeType === 'BUY' ? '매수' : '매도'}
                          </td>
                          <td>
                            <div style={{ fontWeight: 700 }}>{t.stockName}</div>
                          </td>
                          <td>
                            <div>{t.quantity}주</div>
                            <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{t.price.toLocaleString()}원</div>
                          </td>
                          <td style={{ fontWeight: 700 }}>
                            {t.totalAmount.toLocaleString()}원
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* 탭 4: 실시간 뉴스 */}
            {tab === 'news' && (
              <div>
                {newsList.map(item => (
                  <div key={item.id} className="news-item">
                    <div className={`news-title ${item.newsType === 'GOOD' ? 'news-good' : 'news-bad'}`}>
                      [{item.stockName}] {item.title}
                    </div>
                    <div className="news-meta">
                      <span>영향: {item.priceImpactPercent >= 0 ? '+' : ''}{item.priceImpactPercent}%</span>
                      <span>{new Date(item.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 탭 5: 랭킹 TOP 20 */}
            {tab === 'rank' && (
              <div>
                <table className="table-mini">
                  <thead>
                    <tr>
                      <th>순위</th>
                      <th>트레이더</th>
                      <th>총 자산</th>
                      <th>수익률</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((item, index) => (
                      <tr key={item.userId}>
                        <td style={{ fontWeight: 800, color: index < 3 ? '#f9ca24' : '#94a3b8' }}>
                          #{index + 1}
                        </td>
                        <td style={{ fontWeight: 700 }}>{item.nickname}</td>
                        <td>{item.totalAsset.toLocaleString()}원</td>
                        <td className={item.returnRate >= 0 ? 'up' : 'down'} style={{ fontWeight: 700 }}>
                          {item.returnRate >= 0 ? '+' : ''}{item.returnRate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 기업 상세 정보 모달 팝업 */}
      {showModal && companyDetail && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="company-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <div className="modal-title">{companyDetail.name} ({companyDetail.ticker})</div>
                <div style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 700 }}>
                  테마: {companyDetail.theme}
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer', fontWeight: 'bold' }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.6, marginBottom: '16px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px' }}>
              {companyDetail.description}
            </div>

            <div className="financial-grid">
              <div className="financial-card">
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>시가총액</div>
                <div className="financial-val">{(companyDetail.marketCap / 100000000).toLocaleString()} 억원</div>
              </div>
              <div className="financial-card">
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>현재가</div>
                <div className="financial-val">{companyDetail.currentPrice.toLocaleString()} 원</div>
              </div>
              <div className="financial-card">
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>PER (주가수익비율)</div>
                <div className="financial-val" style={{ color: '#38bdf8' }}>{companyDetail.per} 배</div>
              </div>
              <div className="financial-card">
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>PBR (주가순자산비율)</div>
                <div className="financial-val" style={{ color: '#a855f7' }}>{companyDetail.pbr} 배</div>
              </div>
            </div>

            <button
              onClick={() => setShowModal(false)}
              style={{
                width: '100%', padding: '10px', background: 'rgba(56,189,248,0.15)',
                color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '8px',
                fontWeight: 700, cursor: 'pointer', marginTop: '8px'
              }}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockPage;
