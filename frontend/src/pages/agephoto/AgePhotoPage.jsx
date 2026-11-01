import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { fetchWithAccessRaw } from '../../util/fetchUtil';
import { prepareUpload, stampAndDownload } from './agePhotoUtils';
import './AgePhoto.css';

const TARGETS = ['young', 'old'];

const readError = async (res) => (await res.json().catch(() => ({}))).message || `HTTP ${res.status}`;

export default function AgePhotoPage() {
  const { t } = useTranslation();
  const [info, setInfo] = useState(null);
  const [upload, setUpload] = useState(null); // { blob, url }
  const [consent, setConsent] = useState(false);
  const [results, setResults] = useState({});
  const [working, setWorking] = useState(null);
  const [error, setError] = useState('');
  const uploadUrl = useRef(null);

  useEffect(() => {
    fetchWithAccessRaw('/api/age-photo')
      .then(async (res) => {
        if (!res.ok) throw new Error(await readError(res));
        setInfo(await res.json());
      })
      .catch((e) => setError(e.message));
    return () => {
      if (uploadUrl.current) URL.revokeObjectURL(uploadUrl.current);
    };
  }, []);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setResults({});
    try {
      const blob = await prepareUpload(file);
      if (uploadUrl.current) URL.revokeObjectURL(uploadUrl.current);
      uploadUrl.current = URL.createObjectURL(blob);
      setUpload({ blob, url: uploadUrl.current });
    } catch {
      setError(t('agephoto.bad_file'));
    }
  };

  const generate = async () => {
    setError('');
    setResults({});
    for (const target of TARGETS) {
      setWorking(target);
      try {
        const body = new FormData();
        body.append('photo', upload.blob, 'photo.jpg');
        body.append('target', target);
        body.append('consent', 'true');
        const res = await fetchWithAccessRaw('/api/age-photo', { method: 'POST', body });
        if (!res.ok) throw new Error(await readError(res));
        const data = await res.json();
        setResults((r) => ({ ...r, [target]: `data:${data.mimeType};base64,${data.imageBase64}` }));
        setInfo((i) => ({ ...i, remaining: data.remaining }));
      } catch (e) {
        setError(e.message);
        break;
      }
    }
    setWorking(null);
  };

  const canRun = upload && consent && !working && info?.enabled && info.remaining > 0;

  return (
    <div className="ap-page">
      <Helmet>
        <title>{t('agephoto.meta_title')}</title>
        <meta name="description" content={t('agephoto.meta_desc')} />
      </Helmet>

      <header className="ap-head">
        <h1>{t('agephoto.title')}</h1>
        <p>{t('agephoto.subtitle')}</p>
      </header>

      {info && !info.enabled && <p className="ap-notice">{t('agephoto.disabled')}</p>}

      <section className="ap-panel">
        <label className="ap-drop">
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} disabled={!!working} />
          {upload ? <img src={upload.url} alt={t('agephoto.original')} /> : <span>{t('agephoto.pick')}</span>}
        </label>
        <div className="ap-side">
          <p className="ap-tip">{t('agephoto.tip')}</p>
          <label className="ap-consent">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>
              {t('agephoto.consent')} <Link to="/privacy">{t('agephoto.privacy_link')}</Link>
            </span>
          </label>
          <button type="button" className="tn-btn tn-btn-primary" disabled={!canRun} onClick={generate}>
            {working ? t(`agephoto.working_${working}`) : t('agephoto.generate')}
          </button>
          {info && <p className="ap-tip">{t('agephoto.remaining', { n: info.remaining, total: info.dailyLimit })}</p>}
          {error && <p className="ap-error" role="alert">{error}</p>}
        </div>
      </section>

      {(working || Object.keys(results).length > 0) && (
        <section className="ap-results" aria-live="polite">
          {TARGETS.map((target) => (
            <figure key={target}>
              <figcaption>{t(`agephoto.label_${target}`)}</figcaption>
              {results[target]
                ? <img src={results[target]} alt={t(`agephoto.label_${target}`)} />
                : <div className="ap-wait">{working === target ? t('agephoto.wait') : ''}</div>}
              {results[target] && (
                <button type="button" className="tn-btn tn-btn-ghost"
                  onClick={() => stampAndDownload(results[target], t('agephoto.stamp'), `tn-age-${target}.png`)}>
                  {t('agephoto.download')}
                </button>
              )}
            </figure>
          ))}
        </section>
      )}

      <p className="ap-note">{t('agephoto.notice')}</p>
    </div>
  );
}
