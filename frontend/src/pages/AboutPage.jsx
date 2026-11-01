import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import './learn/Learn.css';

const AboutPage = () => {
  const { t } = useTranslation();
  const sections = t('about.sections', { returnObjects: true });
  return (
    <div className="ln-page">
      <Helmet>
        <title>{t('about.meta_title')}</title>
        <meta name="description" content={t('about.meta_desc')} />
        <link rel="canonical" href="https://tnhub.kr/about" />
      </Helmet>
      <header className="ln-head">
        <h1>{t('about.title')}</h1>
        <p>{t('about.intro')}</p>
      </header>
      <div className="ln-body">
        {Array.isArray(sections) && sections.map((s) => (
          <section key={s.h}>
            <h2>{s.h}</h2>
            <p>{s.p}</p>
          </section>
        ))}
      </div>
    </div>
  );
};

export default AboutPage;
