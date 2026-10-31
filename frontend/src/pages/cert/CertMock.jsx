import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { formatTime, postJson } from './certApi';
import './Cert.css';

const draftKey = (id) => `cert_mock_${id}`;

/** 모의고사: 답안은 브라우저에 임시 저장해 새로고침해도 유지 */
const CertMock = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [left, setLeft] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submitted = useRef(false);

  useEffect(() => {
    postJson('/api/cert/mock/start')
      .then((a) => {
        setAttempt(a);
        setLeft(a.remainingSeconds);
        try {
          setAnswers(JSON.parse(localStorage.getItem(draftKey(a.id)) || '{}'));
        } catch {
          setAnswers({});
        }
      })
      .catch((e) => setError(e.message));
  }, []);

  const submit = useCallback(async () => {
    if (!attempt || submitted.current) return;
    submitted.current = true;
    setSubmitting(true);
    try {
      await postJson(`/api/cert/mock/${attempt.id}/submit`, { answers });
      try { localStorage.removeItem(draftKey(attempt.id)); } catch { /* 무시 */ }
      navigate(`/cert/result/${attempt.id}`, { replace: true });
    } catch (e) {
      submitted.current = false;
      setSubmitting(false);
      setError(e.message);
    }
  }, [attempt, answers, navigate]);

  // 남은 시간: 0이 되면 자동 제출
  useEffect(() => {
    if (left === null) return undefined;
    if (left <= 0) { submit(); return undefined; }
    const id = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(id);
  }, [left, submit]);

  const choose = (qid, i) => {
    setAnswers((prev) => {
      const next = { ...prev, [qid]: i };
      try { localStorage.setItem(draftKey(attempt.id), JSON.stringify(next)); } catch { /* 저장 불가 환경 */ }
      return next;
    });
  };

  const answered = useMemo(() => Object.keys(answers).length, [answers]);

  const confirmSubmit = () => {
    const blank = attempt.questions.length - answered;
    if (blank > 0 && !window.confirm(t('cert.confirm_blank', { n: blank }))) return;
    submit();
  };

  if (error && !attempt) {
    return (
      <div className="ct-page narrow">
        <p className="ct-error" role="alert">{error}</p>
        <Link className="tn-btn tn-btn-ghost" to="/cert">{t('cert.back')}</Link>
      </div>
    );
  }
  if (!attempt) return <div className="ct-page narrow"><p className="ct-note">{t('cert.loading')}</p></div>;

  return (
    <div className="ct-page narrow">
      <Helmet><title>{`${t('cert.mock_title')} | TerminalNexus`}</title></Helmet>
      <div className="ct-timer" role="timer">
        <span>{t('cert.answered', { n: answered, total: attempt.questions.length })}</span>
        <strong className={left <= 60 ? 'no' : ''}>{formatTime(left)}</strong>
      </div>
      <h1 className="ct-h1">{t(attempt.mode === 'FULL' ? 'cert.mode_full' : 'cert.mode_trial')}</h1>

      {attempt.questions.map((q, n) => (
        <article key={q.id} className="ct-panel">
          <p className="ct-progress">{t('cert.q_no', { n: n + 1 })} · {t(`cert.subject_${q.subject}`)}</p>
          <h2 className="ct-question">{q.text}</h2>
          <ol className="ct-choices">
            {q.choices.map((c, i) => (
              <li key={c}>
                <button type="button" className={answers[q.id] === i ? 'chosen' : ''} aria-pressed={answers[q.id] === i} onClick={() => choose(q.id, i)}>
                  <span className="n">{i + 1}</span>{c}
                </button>
              </li>
            ))}
          </ol>
        </article>
      ))}

      {error && <p className="ct-error" role="alert">{error}</p>}
      <button type="button" className="tn-btn tn-btn-primary ct-submit" disabled={submitting} onClick={confirmSubmit}>
        {t('cert.submit')}
      </button>
    </div>
  );
};

export default CertMock;
