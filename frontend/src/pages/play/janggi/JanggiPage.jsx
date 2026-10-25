import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import LocalGame from './LocalGame.jsx';
import OnlineJanggi from './OnlineJanggi.jsx';
import './Janggi.css';

const MODES = [
  { key: 'ai', label: 'AI 대국' },
  { key: 'local', label: '2인 대국' },
  { key: 'online', label: '온라인' },
];

const RULES = [
  ['궁·사', '궁성 안에서 선을 따라 한 칸'],
  ['차', '직선으로 원하는 만큼, 궁성 안에서는 대각선도'],
  ['포', '기물 하나를 반드시 넘어서 이동 (포끼리는 넘거나 잡을 수 없음)'],
  ['마', '직선 한 칸 + 대각선 한 칸 (가는 길이 막히면 못 감)'],
  ['상', '직선 한 칸 + 대각선 두 칸 (가는 길이 막히면 못 감)'],
  ['졸·병', '앞이나 옆으로 한 칸, 상대 궁성에서는 앞 대각선도'],
];

const JanggiPage = () => {
  const [params, setParams] = useSearchParams();
  const mode = MODES.some((m) => m.key === params.get('mode')) ? params.get('mode') : 'ai';

  return (
    <div className="jg-page">
      <Helmet>
        <title>장기 - TerminalNexus | AI·온라인 장기</title>
        <meta name="description" content="AI와 대국하거나 친구와 한 화면에서, 또는 온라인으로 실시간 장기를 두세요. 상차림 선택, 장군·외통·빅장 규칙 지원." />
        <link rel="canonical" href="https://tnhub.kr/play/janggi" />
      </Helmet>

      <div className="jg-container">
        <div className="jg-header">
          <h1 className="jg-title">♟️ 장기</h1>
          <div className="jg-tabs" role="tablist">
            {MODES.map((m) => (
              <button
                key={m.key}
                type="button"
                role="tab"
                aria-selected={mode === m.key}
                className={`jg-tab${mode === m.key ? ' is-active' : ''}`}
                onClick={() => setParams({ mode: m.key })}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {mode === 'online' ? <OnlineJanggi /> : <LocalGame mode={mode} />}

        <details className="jg-panel" style={{ marginTop: 24 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 700 }}>장기 규칙 간단 정리</summary>
          <ul style={{ margin: '12px 0 0', paddingLeft: 20, lineHeight: 1.8, color: '#d4d4d8', fontSize: '0.9rem' }}>
            {RULES.map(([name, desc]) => <li key={name}><b>{name}</b>: {desc}</li>)}
            <li><b>장군</b>: 궁을 잡을 수 있는 상태. 반드시 피해야 하며, 피할 수 없으면 <b>외통</b>으로 집니다.</li>
            <li><b>빅장</b>: 두 궁이 사이에 아무것도 없이 마주보는 것. 상대가 풀지 않으면 점수로 승부를 가립니다.</li>
            <li><b>점수</b>: 차 13 · 포 7 · 마 5 · 상 3 · 사 3 · 졸 2 (한은 덤 1.5점). 200수에 도달해도 점수 판정.</li>
          </ul>
        </details>
      </div>
    </div>
  );
};

export default JanggiPage;
