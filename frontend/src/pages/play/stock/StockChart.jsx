import React, { useEffect, useRef } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';
import { fmt } from './stockUtils.js';

const UP = '#f04452';
const DOWN = '#3182f6';
// 차트 라이브러리는 UTC 기준이므로 브라우저 현지 시각으로 보이도록 보정
const TZ_OFFSET = -new Date().getTimezoneOffset() * 60;

const movingAverage = (candles, n) => {
  const out = [];
  let sum = 0;
  candles.forEach((c, i) => {
    sum += c.close;
    if (i >= n) sum -= candles[i - n].close;
    if (i >= n - 1) out.push({ time: c.time, value: sum / n });
  });
  return out;
};

/**
 * 캔들 + 거래량 + 이동평균(5·20) 차트
 * candles: [{ time(epoch 초), open, high, low, close, volume }]
 * resetKey 가 바뀌면 전체 다시 그리고(종목·주기 변경), 같으면 마지막 봉만 갱신
 */
const StockChart = ({ candles, resetKey }) => {
  const boxRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef({});
  const lastKeyRef = useRef(null);
  const lastTimeRef = useRef(0);

  useEffect(() => {
    const chart = createChart(boxRef.current, {
      autoSize: true,
      layout: { background: { color: '#111114' }, textColor: '#a1a1aa', fontSize: 11 },
      grid: { vertLines: { color: '#1f1f24' }, horzLines: { color: '#1f1f24' } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#27272a' },
      timeScale: { borderColor: '#27272a', timeVisible: true, secondsVisible: false, rightOffset: 4 },
      localization: { priceFormatter: (p) => fmt(p) },
    });
    const candle = chart.addCandlestickSeries({
      upColor: UP, downColor: DOWN, borderUpColor: UP, borderDownColor: DOWN, wickUpColor: UP, wickDownColor: DOWN,
    });
    candle.priceScale().applyOptions({ scaleMargins: { top: 0.08, bottom: 0.25 } });
    const volume = chart.addHistogramSeries({ priceScaleId: 'vol', priceFormat: { type: 'volume' } });
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    const ma5 = chart.addLineSeries({ color: '#facc15', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
    const ma20 = chart.addLineSeries({ color: '#a78bfa', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
    chartRef.current = chart;
    seriesRef.current = { candle, volume, ma5, ma20 };
    return () => chart.remove();
  }, []);

  useEffect(() => {
    const { candle, volume, ma5, ma20 } = seriesRef.current;
    if (!candle || !candles?.length) return;
    const data = candles.map((c) => ({ ...c, time: c.time + TZ_OFFSET }));
    const vols = data.map((c) => ({ time: c.time, value: c.volume, color: c.close >= c.open ? `${UP}88` : `${DOWN}88` }));

    if (lastKeyRef.current !== resetKey) {
      candle.setData(data);
      volume.setData(vols);
      chartRef.current.timeScale().fitContent();
      lastKeyRef.current = resetKey;
    } else {
      // 진행 중인 봉과 새로 시작된 봉만 갱신 (확대/스크롤 위치 유지, 이전 봉은 라이브러리가 수정 불가)
      const off = Math.max(0, data.length - 2);
      data.slice(off).forEach((c, i) => {
        if (c.time < lastTimeRef.current) return;
        candle.update(c);
        volume.update(vols[off + i]);
      });
    }
    lastTimeRef.current = data[data.length - 1].time;
    ma5.setData(movingAverage(data, 5));
    ma20.setData(movingAverage(data, 20));
  }, [candles, resetKey]);

  return (
    <div className="st-chart-wrap">
      <div className="st-chart-legend">
        <span style={{ color: '#facc15' }}>MA5</span>
        <span style={{ color: '#a78bfa' }}>MA20</span>
      </div>
      <div ref={boxRef} className="st-chart" />
    </div>
  );
};

export default StockChart;
