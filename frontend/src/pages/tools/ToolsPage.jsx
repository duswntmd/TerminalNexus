import React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { ChmodTool, CronTool, NginxTool, RaidTool, SubnetTool, TransferTool } from './ToolPanels';
import { EncodeTool, HashTool, JsonTool, JwtTool, RegexTool, TimestampTool } from './DevToolPanels';
import AdSlot from '../../components/AdSlot';
import './Tools.css';

const TOOLS = [
  { id: 'json', group: 'dev', glyph: '{}', Panel: JsonTool },
  { id: 'encode', group: 'dev', glyph: 'b64', Panel: EncodeTool },
  { id: 'jwt', group: 'dev', glyph: 'JWT', Panel: JwtTool },
  { id: 'timestamp', group: 'dev', glyph: 'UTC', Panel: TimestampTool },
  { id: 'regex', group: 'dev', glyph: '.*', Panel: RegexTool },
  { id: 'hash', group: 'dev', glyph: '#', Panel: HashTool },
  { id: 'subnet', group: 'infra', glyph: '/24', Panel: SubnetTool },
  { id: 'raid', group: 'infra', glyph: 'R5', Panel: RaidTool },
  { id: 'cron', group: 'infra', glyph: '* *', Panel: CronTool },
  { id: 'chmod', group: 'infra', glyph: '755', Panel: ChmodTool },
  { id: 'nginx', group: 'infra', glyph: '{ }', Panel: NginxTool },
  { id: 'transfer', group: 'infra', glyph: 'Gb', Panel: TransferTool },
];

const ToolsIndex = () => {
  const { t } = useTranslation();
  return (
    <>
      <Helmet>
        <title>{t('tools.meta_title')}</title>
        <meta name="description" content={t('tools.meta_desc')} />
        <link rel="canonical" href="https://tnhub.kr/tools" />
      </Helmet>
      <header className="tl-head">
        <h1>{t('tools.title')}</h1>
        <p>{t('tools.subtitle')}</p>
      </header>
      {['dev', 'infra'].map((group) => (
        <section key={group} className="tl-group">
          <h2>{t(`tools.group_${group}`)}</h2>
          <ul className="tl-cards">
            {TOOLS.filter((tool) => tool.group === group).map((tool) => (
              <li key={tool.id}>
                <Link to={`/tools/${tool.id}`} className="tl-card">
                  <span className="tl-glyph" aria-hidden="true">{tool.glyph}</span>
                  <span className="tl-card-name">{t(`tools.${tool.id}.name`)}</span>
                  <span className="tl-card-desc">{t(`tools.${tool.id}.desc`)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <Link to="/cert" className="tl-promo">
        <span>{t('tools.cert_promo')}</span>
        <span aria-hidden="true">→</span>
      </Link>
    </>
  );
};

const ToolDetail = ({ tool }) => {
  const { t } = useTranslation();
  const { Panel, id } = tool;
  const guide = t(`tools.${id}.guide`, { returnObjects: true });
  return (
    <>
      <Helmet>
        <title>{`${t(`tools.${id}.name`)} | TerminalNexus`}</title>
        <meta name="description" content={t(`tools.${id}.desc`)} />
        <link rel="canonical" href={`https://tnhub.kr/tools/${id}`} />
      </Helmet>
      <nav className="tl-crumb" aria-label={t('tools.title')}>
        <Link to="/tools">{t('tools.title')}</Link>
        <span aria-hidden="true">/</span>
        <span>{t(`tools.${id}.name`)}</span>
      </nav>
      <header className="tl-head small">
        <h1>{t(`tools.${id}.name`)}</h1>
        <p>{t(`tools.${id}.desc`)}</p>
      </header>
      <section className="tl-panel"><Panel /></section>
      {Array.isArray(guide) && (
        <section className="tl-guide">
          {guide.map((g) => (
            <div key={g.q}>
              <h2>{g.q}</h2>
              <p>{g.a}</p>
            </div>
          ))}
        </section>
      )}
      <AdSlot slot={import.meta.env.VITE_ADSENSE_SLOT_TOOL} />
      <nav className="tl-others" aria-label={t('tools.others')}>
        {TOOLS.filter((x) => x.id !== id).map((x) => <Link key={x.id} to={`/tools/${x.id}`}>{t(`tools.${x.id}.name`)}</Link>)}
      </nav>
    </>
  );
};

const ToolsPage = () => {
  const { id } = useParams();
  const tool = id ? TOOLS.find((x) => x.id === id) : null;
  if (id && !tool) return <Navigate to="/tools" replace />;
  return <div className="tl-page">{tool ? <ToolDetail tool={tool} /> : <ToolsIndex />}</div>;
};

export default ToolsPage;
