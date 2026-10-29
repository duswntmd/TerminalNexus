import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const CODES = (c) => {
  if (c === 0) return ['clear', '☀️'];
  if (c === 1) return ['mostly_clear', '🌤️'];
  if (c === 2) return ['partly_cloudy', '⛅'];
  if (c === 3) return ['cloudy', '☁️'];
  if (c === 45 || c === 48) return ['fog', '🌫️'];
  if (c >= 51 && c <= 57) return ['drizzle', '🌦️'];
  if (c >= 61 && c <= 67) return ['rain', '🌧️'];
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return ['snow', '❄️'];
  if (c >= 80 && c <= 82) return ['showers', '🌧️'];
  if (c >= 95) return ['thunder', '⚡'];
  return ['unknown', '🌡️'];
};

const SEOUL = { lat: 37.5665, lon: 126.978 };
const TABS = { temp: { key: 'temperature_2m', unit: '°', color: 'var(--tn-tape)' }, precip: { key: 'precipitation_probability', unit: '%', color: 'var(--tn-blue)' }, wind: { key: 'wind_speed_10m', unit: '', color: 'var(--tn-led)' } };

// 위치 권한을 처음부터 묻지 않는다: IP 기반 대략 위치 → 사용자가 원할 때만 GPS
const WeatherPanel = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('en') ? 'en' : 'ko';
  const locale = lang === 'en' ? 'en-US' : 'ko-KR';
  const [data, setData] = useState(null);
  const [place, setPlace] = useState('');
  const [source, setSource] = useState('ip'); // ip | gps | default
  const [state, setState] = useState('loading'); // loading | ok | error
  const [tab, setTab] = useState('temp');
  const [locating, setLocating] = useState(false);

  const load = useCallback(async (lat, lon, src) => {
    try {
      if (src !== 'default') {
        try {
          const g = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=${lang}`);
          if (g.ok) { const d = await g.json(); setPlace(d.locality ? `${d.city || d.principalSubdivision || ''} ${d.locality}`.trim() : (d.city || d.principalSubdivision || '')); }
        } catch { /* 지명 없이 진행 */ }
      } else setPlace(t('main.weather.default_location'));
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&wind_speed_unit=ms&timezone=auto`);
      if (!r.ok) throw new Error();
      setData(await r.json()); setSource(src); setState('ok');
    } catch { setState((s) => (s === 'ok' ? s : 'error')); }
  }, [lang, t]);

  const loadByIp = useCallback(async () => {
    setState('loading');
    try {
      const r = await fetch('https://freeipapi.com/api/json');
      const d = r.ok ? await r.json() : null;
      if (d?.latitude && d?.longitude) return load(d.latitude, d.longitude, 'ip');
    } catch { /* 기본 위치로 */ }
    return load(SEOUL.lat, SEOUL.lon, 'default');
  }, [load]);

  useEffect(() => { loadByIp(); }, [loadByIp]);

  const useGps = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (p) => { await load(p.coords.latitude, p.coords.longitude, 'gps'); setLocating(false); },
      () => setLocating(false),
      { timeout: 8000 },
    );
  };

  if (state === 'error' && !data) {
    return (
      <section className="panel weather">
        <div className="panel-empty">
          <p>{t('main.weather.error')}</p>
          <button type="button" className="tn-btn tn-btn-ghost" onClick={loadByIp}>{t('main.weather.retry')}</button>
        </div>
      </section>
    );
  }
  if (!data) return <section className="panel weather skeleton-block" aria-busy="true" />;

  const cur = data.current;
  const [curKey, curIcon] = CODES(cur.weather_code);
  const h = data.hourly;
  const now = Math.max(0, h.time.findIndex((x) => x.slice(0, 13) === (cur.time || '').slice(0, 13)));
  const hourFmt = new Intl.DateTimeFormat(locale, { hour: 'numeric' });
  const pts = [];
  for (let i = now; i < now + 24 && i < h.time.length; i += 3) {
    pts.push({ label: hourFmt.format(new Date(2000, 0, 1, Number(h.time[i].slice(11, 13)))), v: Math.round(h[TABS[tab].key][i]), code: h.weather_code[i] });
  }
  const W = 640, H = 120, px = 28, py = 26;
  const vals = pts.map((p) => p.v);
  const lo = Math.min(...vals), hi = Math.max(...vals), span = hi - lo || 1;
  const xy = pts.map((p, i) => [px + (i / Math.max(1, pts.length - 1)) * (W - px * 2), H - py - ((p.v - lo) / span) * (H - py * 2)]);
  const line = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${line} L${xy[xy.length - 1][0]} ${H} L${xy[0][0]} ${H} Z`;
  const dayFmt = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  const days = data.daily.time.slice(0, 7).map((d, i) => ({ d: i === 0 ? t('main.weather.today') : dayFmt.format(new Date(`${d}T12:00:00`)), max: Math.round(data.daily.temperature_2m_max[i]), min: Math.round(data.daily.temperature_2m_min[i]), code: data.daily.weather_code[i] }));
  const unit = tab === 'wind' ? 'm/s' : TABS[tab].unit;

  return (
    <section className="panel weather" aria-labelledby="wx-title">
      <div className="wx-now">
        <h3 id="wx-title" className="wx-place">{place || t('main.weather.here')}</h3>
        <p className="wx-src">{source === 'gps' ? t('home.weather_gps') : source === 'ip' ? t('home.weather_ip') : t('main.weather.default_location')}</p>
        <div className="wx-temp"><span className="wx-icon" aria-hidden="true">{curIcon}</span>{Math.round(cur.temperature_2m)}<small>°C</small></div>
        <p className="wx-desc">{t(`main.weather.codes.${curKey}`)}</p>
        <dl className="wx-stats">
          <div><dt>{t('main.weather.precip')}</dt><dd>{Math.round(h.precipitation_probability[now] ?? 0)}%</dd></div>
          <div><dt>{t('main.weather.humidity')}</dt><dd>{cur.relative_humidity_2m}%</dd></div>
          <div><dt>{t('main.weather.wind_speed')}</dt><dd>{(Math.round(cur.wind_speed_10m * 10) / 10)} m/s</dd></div>
        </dl>
        {source !== 'gps' && (
          <button type="button" className="tn-btn tn-btn-ghost wx-gps" onClick={useGps} disabled={locating}>
            {locating ? t('main.weather.locating') : t('main.weather.use_location')}
          </button>
        )}
      </div>

      <div className="wx-hourly">
        <div className="wx-tabs" role="tablist">
          {[['temp', t('main.weather.tab_temp')], ['precip', t('main.weather.precip')], ['wind', t('main.weather.tab_wind')]].map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{label}</button>
          ))}
        </div>
        <svg viewBox={`0 0 ${W} ${H + 34}`} className="wx-chart" role="img" aria-label={pts.map((p) => `${p.label} ${p.v}${unit}`).join(', ')} style={{ '--wx': TABS[tab].color }}>
          <path d={area} className="wx-area" />
          <path d={line} className="wx-line" />
          {xy.map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="3.5" className="wx-dot" />
              <text x={x} y={y - 10} className="wx-val">{pts[i].v}{TABS[tab].unit}</text>
              <text x={x} y={H + 18} className="wx-hour">{pts[i].label}</text>
            </g>
          ))}
        </svg>
      </div>

      <ol className="wx-days">
        {days.map((d, i) => {
          const [k, ic] = CODES(d.code);
          return (
            <li key={i} className={i === 0 ? 'today' : ''} title={t(`main.weather.codes.${k}`)}>
              <span className="wx-day">{d.d}</span>
              <span className="wx-day-icon" aria-hidden="true">{ic}</span>
              <span className="wx-range"><b>{d.max}°</b><span>{d.min}°</span></span>
            </li>
          );
        })}
      </ol>
    </section>
  );
};

export default WeatherPanel;
