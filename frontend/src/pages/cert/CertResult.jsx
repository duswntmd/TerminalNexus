import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { authJson } from './certApi';
import './Cert.css';

const CertResult = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [onlyWrong, setOnlyWrong] = useState(true);

  useEffect(() => {
    authJson(`/api/cert/mock/${id}`).then(setData).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="ct-page narrow"><p className="ct-error" role="alert">{error}</p><Link to="/cert">{t('cert.back')}</Link></div>;
  if (!data) return <div className="ct-page narrow"><p className="ct-note">{t('cert.loading')}</p></div>;

  const shown = onlyWrong ? data.review.filter((r) => r.chosen !== r.answer) : data.review;

  return (
    <div className="ct-page narrow">
      <Helmet><title>{`${t('cert.result_title')} | TerminalNexus`}</title></Helmet>
      <nav className="ct-crumb"><Link to="/cert">{t('cert.title')}</Link><span aria-hidden="true">/</span><span>{t('cert.result_title')}</span></nav>

      <section className="ct-panel ct-score">
        <p className={`ct-big ${data.passed ? 'ok' : 'no'}`}>{t('cert.score', { n: data.score })}</p>
        <p>{t(data.passed ? 'cert.passed' : 'cert.failed')} · {t('cert.correct_of', { n: data.correct, total: data.total })}</p>
        <ul className="ct-subscores">
          {data.subjects.map((s) => (
            <li key={s.subject}>
              <span>{t(`cert.subject_${s.subject}`)}</span>
              <div className="ct-bar"><span style={{ width: `${s.score}%` }} /></div>
              <strong>{s.score}</strong>
            </li>
          ))}
        </ul>
        {data.mode === 'TRIAL' && <p className="ct-note">{t('cert.trial_after')} <Link to="/cert">{t('cert.see_plans')}</Link></p>}
      </section>

      <label className="ct-toggle">
        <input type="checkbox" checked={onlyWrong} onChange={(e) => setOnlyWrong(e.target.checked)} /> {t('cert.only_wrong')}
      </label>

      {shown.length === 0 && <p className="ct-note">{t('cert.all_correct')}</p>}
      {shown.map((r) => (
        <article key={r.question.id} className="ct-panel">
          <h2 className="ct-question">{r.question.text}</h2>
          <ol className="ct-choices">
            {r.question.choices.map((c, i) => {
              let cls = '';
              if (i === r.answer) cls = 'correct';
              else if (i === r.chosen) cls = 'wrong';
              return <li key={c}><button type="button" disabled className={cls}><span className="n">{i + 1}</span>{c}</button></li>;
            })}
          </ol>
          {r.chosen == null && <p className="ct-note">{t('cert.no_answer')}</p>}
          <p className="ct-explain-text">{r.explain}</p>
        </article>
      ))}

      <Link className="tn-btn tn-btn-ghost" to="/cert">{t('cert.back')}</Link>
    </div>
  );
};

export default CertResult;
