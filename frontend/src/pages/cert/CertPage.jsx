import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { authJson, postJson, publicFetch } from './certApi';
import './Cert.css';

const IMP_SCRIPT = 'https://cdn.iamport.kr/js/iamport.payment-1.2.0.js';

const loadImp = () => new Promise((resolve, reject) => {
  if (window.IMP) { resolve(window.IMP); return; }
  const s = document.createElement('script');
  s.src = IMP_SCRIPT;
  s.onload = () => resolve(window.IMP);
  s.onerror = reject;
  document.body.appendChild(s);
});

const CertPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuth();
  const [exam, setExam] = useState(null);
  const [me, setMe] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [paying, setPaying] = useState(false);
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'ko-KR';

  useEffect(() => {
    publicFetch('/api/cert/exam').then((r) => r.json()).then(setExam).catch(() => setError(t('cert.load_error')));
  }, [t]);

  useEffect(() => {
    if (!isLoggedIn) { setMe(null); return; }
    authJson('/api/cert/me').then(setMe).catch(() => {});
  }, [isLoggedIn]);

  const buy = async (plan) => {
    if (!isLoggedIn) { navigate(`/login?redirect=${encodeURIComponent('/cert')}`); return; }
    setPaying(true);
    setMessage('');
    try {
      const IMP = await loadImp();
      const order = await postJson('/api/cert/order/prepare', { planId: plan.id });
      IMP.init(import.meta.env.VITE_PORTONE_IMP_CODE || 'imp00000000');
      IMP.request_pay({
        pg: 'html5_inicis',
        pay_method: 'card',
        merchant_uid: order.merchantUid,
        name: order.name,
        amount: order.amount,
        buyer_name: user?.nickname || '',
        buyer_email: user?.email || '',
      }, async (res) => {
        if (res.success) {
          try {
            await postJson('/api/cert/order/verify', { merchantUid: order.merchantUid });
            setMessage(t('cert.pay_done'));
            setMe(await authJson('/api/cert/me'));
          } catch (e) {
            setMessage(e.message);
          }
        } else {
          setMessage(res.error_msg || t('cert.pay_failed'));
        }
        setPaying(false);
      });
    } catch (e) {
      setMessage(e.message || t('cert.pay_failed'));
      setPaying(false);
    }
  };

  const mockLabel = () => {
    if (me?.inProgressId) return t('cert.mock_resume');
    if (me?.hasPass) return t('cert.mock_full');
    return t('cert.mock_trial');
  };
  const mockBlocked = me && !me.hasPass && me.trialUsed && !me.inProgressId;

  return (
    <div className="ct-page">
      <Helmet>
        <title>{t('cert.meta_title')}</title>
        <meta name="description" content={t('cert.meta_desc')} />
        <link rel="canonical" href="https://tnhub.kr/cert" />
      </Helmet>

      <header className="ct-head">
        <h1>{t('cert.title')}</h1>
        <p>{t('cert.subtitle')}</p>
      </header>

      {error && <p className="ct-error" role="alert">{error}</p>}
      {!exam && !error && <p className="ct-note">{t('cert.loading')}</p>}

      {exam && (
        <>
          <section aria-labelledby="ct-practice">
            <h2 id="ct-practice">{t('cert.practice_title')}</h2>
            <p className="ct-note">{t('cert.practice_desc')}</p>
            <div className="ct-subjects">
              {exam.subjects.map((s) => (
                <Link key={s.id} to={`/cert/practice?subject=${s.id}`} className="ct-card">
                  <strong>{t(`cert.subject_${s.id}`)}</strong>
                  <span>{me?.hasPass ? t('cert.count_all', { n: s.total }) : t('cert.count_free', { free: s.free, total: s.total })}</span>
                </Link>
              ))}
            </div>
          </section>

          <section aria-labelledby="ct-mock">
            <h2 id="ct-mock">{t('cert.mock_title')}</h2>
            <div className="ct-panel">
              <p>{me?.hasPass
                ? t('cert.mock_desc_full', { q: exam.fullQuestions, m: exam.fullMinutes })
                : t('cert.mock_desc_trial', { q: exam.trialQuestions, m: exam.trialMinutes })}</p>
              <p className="ct-note">{t('cert.own_criteria', { pass: exam.passScore, min: exam.subjectMinScore })}</p>
              {!isLoggedIn ? (
                <Link className="tn-btn tn-btn-primary" to={`/login?redirect=${encodeURIComponent('/cert')}`}>{t('cert.login_to_mock')}</Link>
              ) : mockBlocked ? (
                <p className="ct-note strong">{t('cert.trial_used')}</p>
              ) : (
                <Link className="tn-btn tn-btn-primary" to="/cert/mock">{mockLabel()}</Link>
              )}
            </div>
          </section>

          {me && (
            <section aria-labelledby="ct-my">
              <h2 id="ct-my">{t('cert.my_title')}</h2>
              <div className="ct-panel">
                {me.hasPass && me.passExpiresAt && (
                  <p>{t('cert.pass_until', { date: new Date(me.passExpiresAt).toLocaleDateString(locale) })}</p>
                )}
                <p>
                  <Link to="/cert/wrong">{t('cert.wrong_link', { n: me.wrongCount })}</Link>
                </p>
                {me.history.length > 0 && (
                  <ul className="ct-history">
                    {me.history.map((h) => (
                      <li key={h.id}>
                        <Link to={`/cert/result/${h.id}`}>
                          <span>{new Date(h.submittedAt).toLocaleDateString(locale)}</span>
                          <span>{t(h.mode === 'FULL' ? 'cert.mode_full' : 'cert.mode_trial')}</span>
                          <strong className={h.passed ? 'ok' : 'no'}>{t('cert.score', { n: h.score })}</strong>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          )}

          {!me?.hasPass && (
            <section aria-labelledby="ct-plan">
              <h2 id="ct-plan">{t('cert.plan_title')}</h2>
              <ul className="ct-benefits">
                {t('cert.benefits', { returnObjects: true, q: exam.fullQuestions, m: exam.fullMinutes }).map((b) => <li key={b}>{b}</li>)}
              </ul>
              <div className="ct-plans">
                {exam.plans.map((p) => (
                  <div key={p.id} className="ct-card plan">
                    <strong>{t('cert.plan_days', { n: p.days })}</strong>
                    <span className="price">{t('cert.price', { v: p.amount.toLocaleString(locale) })}</span>
                    <button type="button" className="tn-btn tn-btn-primary" disabled={!exam.paymentEnabled || paying} onClick={() => buy(p)}>
                      {exam.paymentEnabled ? t('cert.buy') : t('cert.pay_soon')}
                    </button>
                  </div>
                ))}
              </div>
              {message && <p className="ct-note strong" role="status">{message}</p>}
            </section>
          )}

          <p className="ct-note">{t('cert.disclaimer')}</p>
        </>
      )}
    </div>
  );
};

export default CertPage;
