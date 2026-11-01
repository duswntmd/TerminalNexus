import React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { ARTICLES, findArticle } from '../../content/articles';
import AdSlot from '../../components/AdSlot';
import ShareBar from '../../components/ShareBar';
import './Learn.css';

const Block = ({ block }) => {
  if (block.h) return <h2>{block.h}</h2>;
  if (block.code) return <pre className="ln-code"><code>{block.code}</code></pre>;
  if (block.list) return <ul>{block.list.map((item) => <li key={item}>{item}</li>)}</ul>;
  return <p>{block.p}</p>;
};

const LearnIndex = () => {
  const { t } = useTranslation();
  return (
    <>
      <Helmet>
        <title>{t('learn.meta_title')}</title>
        <meta name="description" content={t('learn.meta_desc')} />
        <link rel="canonical" href="https://tnhub.kr/learn" />
      </Helmet>
      <header className="ln-head">
        <h1>{t('learn.title')}</h1>
        <p>{t('learn.subtitle')}</p>
      </header>
      <ul className="ln-list">
        {ARTICLES.map((a) => (
          <li key={a.slug}>
            <Link to={`/learn/${a.slug}`}>
              <strong>{a.title}</strong>
              <span>{a.desc}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
};

const LearnArticle = ({ article }) => {
  const { t } = useTranslation();
  const others = ARTICLES.filter((a) => a.slug !== article.slug).slice(0, 4);
  return (
    <article>
      <Helmet>
        <title>{`${article.title} | TerminalNexus`}</title>
        <meta name="description" content={article.desc} />
        <link rel="canonical" href={`https://tnhub.kr/learn/${article.slug}`} />
      </Helmet>
      <nav className="ln-crumb" aria-label={t('learn.title')}>
        <Link to="/learn">{t('learn.title')}</Link>
      </nav>
      <header className="ln-head">
        <h1>{article.title}</h1>
        <p>{article.desc}</p>
      </header>
      <div className="ln-body">
        {article.body.map((block, i) => <Block key={i} block={block} />)}
      </div>
      <Link to={`/tools/${article.tool}`} className="ln-tool">
        <span>{t('learn.try_tool', { name: t(`tools.${article.tool}.name`) })}</span>
        <span aria-hidden="true">→</span>
      </Link>
      <ShareBar path={`/learn/${article.slug}`} text={article.title} />
      <AdSlot slot={import.meta.env.VITE_ADSENSE_SLOT_ARTICLE} />
      <nav className="ln-more" aria-label={t('learn.more')}>
        <h2>{t('learn.more')}</h2>
        {others.map((a) => <Link key={a.slug} to={`/learn/${a.slug}`}>{a.title}</Link>)}
      </nav>
    </article>
  );
};

const LearnPage = () => {
  const { slug } = useParams();
  const article = slug ? findArticle(slug) : null;
  if (slug && !article) return <Navigate to="/learn" replace />;
  return <div className="ln-page">{article ? <LearnArticle article={article} /> : <LearnIndex />}</div>;
};

export default LearnPage;
