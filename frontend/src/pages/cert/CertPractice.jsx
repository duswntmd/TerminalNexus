import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { authJson, checkAnswer, publicFetch } from './certApi';
import './Cert.css';

/**
 * 한 문제씩 풀고 바로 해설을 보는 화면
 * mode=wrong 이면 오답노트 문제로 진행
 */
const CertPractice = ({ wrong = false }) => {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const subject = params.get('subject') || '';
  const [questions, setQuestions] = useState(null);
  const [locked, setLocked] = useState(0);
  const [wrongLocked, setWrongLocked] = useState(false);
  const [wrongCount, setWrongCount] = useState(0);
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState(null);
  const [result, setResult] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    setQuestions(null);
    setIndex(0);
    setChosen(null);
    setResult(null);
    setCorrectCount(0);
    try {
      if (wrong) {
        const note = await authJson('/api/cert/wrong');
        setWrongLocked(note.locked);
        setWrongCount(note.count);
        setQuestions(note.questions);
      } else {
        const q = new URLSearchParams({ count: '10' });
        if (subject) q.set('subject', subject);
        const res = await publicFetch(`/api/cert/practice?${q}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setLocked(data.locked);
        setQuestions(data.questions);
      }
    } catch {
      setError(t('cert.load_error'));
    }
  }, [subject, wrong, t]);

  useEffect(() => { load(); }, [load]);

  const pick = async (i) => {
    if (result) return;
    setChosen(i);
    try {
      const r = await checkAnswer(questions[index].id, i);
      setResult(r);
      if (r.correct) setCorrectCount((n) => n + 1);
    } catch (e) {
      setChosen(null);
      setError(e.message);
    }
  };

  const next = () => {
    setIndex((n) => n + 1);
    setChosen(null);
    setResult(null);
  };

  const title = wrong ? t('cert.wrong_title') : subject ? t(`cert.subject_${subject}`) : t('cert.practice_title');
  const q = questions?.[index];
  const finished = questions && questions.length > 0 && index >= questions.length;

  return (
    <div className="ct-page narrow">
      <Helmet><title>{`${title} | TerminalNexus`}</title></Helmet>
      <nav className="ct-crumb"><Link to="/cert">{t('cert.title')}</Link><span aria-hidden="true">/</span><span>{title}</span></nav>
      <h1 className="ct-h1">{title}</h1>

      {error && <p className="ct-error" role="alert">{error}</p>}
      {!questions && !error && <p className="ct-note">{t('cert.loading')}</p>}

      {wrong && wrongLocked && (
        <div className="ct-panel">
          <p>{t('cert.wrong_locked', { n: wrongCount })}</p>
          <Link className="tn-btn tn-btn-primary" to="/cert">{t('cert.see_plans')}</Link>
        </div>
      )}
      {wrong && !wrongLocked && questions?.length === 0 && <p className="ct-note">{t('cert.wrong_empty')}</p>}

      {q && (
        <article className="ct-panel">
          <p className="ct-progress">{index + 1} / {questions.length}</p>
          <h2 className="ct-question">{q.text}</h2>
          <ol className="ct-choices">
            {q.choices.map((c, i) => {
              let cls = '';
              if (result) {
                if (i === result.answer) cls = 'correct';
                else if (i === chosen) cls = 'wrong';
              } else if (i === chosen) cls = 'chosen';
              return (
                <li key={c}>
                  <button type="button" className={cls} disabled={!!result} onClick={() => pick(i)}>
                    <span className="n">{i + 1}</span>{c}
                  </button>
                </li>
              );
            })}
          </ol>
          {result && (
            <div className="ct-explain" role="status">
              <strong className={result.correct ? 'ok' : 'no'}>{result.correct ? t('cert.correct') : t('cert.incorrect')}</strong>
              <p>{result.explain}</p>
              <button type="button" className="tn-btn tn-btn-primary" onClick={next}>
                {index + 1 === questions.length ? t('cert.see_result') : t('cert.next')}
              </button>
            </div>
          )}
        </article>
      )}

      {finished && (
        <div className="ct-panel">
          <p className="ct-big">{t('cert.practice_done', { n: correctCount, total: questions.length })}</p>
          {locked > 0 && <p className="ct-note">{t('cert.more_locked', { n: locked })}</p>}
          <div className="ct-actions">
            <button type="button" className="tn-btn tn-btn-primary" onClick={load}>{t('cert.again')}</button>
            <Link className="tn-btn tn-btn-ghost" to="/cert">{t('cert.back')}</Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default CertPractice;
