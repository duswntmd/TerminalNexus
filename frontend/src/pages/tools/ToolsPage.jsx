import React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { ChmodTool, CronTool, NginxTool, RaidTool, SubnetTool, TransferTool } from './ToolPanels';
import './Tools.css';

const TOOLS = [
  { id: 'subnet', glyph: '/24', Panel: SubnetTool },
  { id: 'raid', glyph: 'R5', Panel: RaidTool },
  { id: 'cron', glyph: '* *', Panel: CronTool },
  { id: 'chmod', glyph: '755', Panel: ChmodTool },
  { id: 'nginx', glyph: '{ }', Panel: NginxTool },
  { id: 'transfer', glyph: 'Gb', Panel: TransferTool },
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
      <ul className="tl-cards">
        {TOOLS.map((tool) => (
          <li key={tool.id}>
            <Link to={`/tools/${tool.id}`} className="tl-card">
              <span className="tl-glyph" aria-hidden="true">{tool.glyph}</span>
              <span className="tl-card-name">{t(`tools.${tool.id}.name`)}</span>
              <span className="tl-card-desc">{t(`tools.${tool.id}.desc`)}</span>
            </Link>
          </li>
        ))}
      </ul>
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
