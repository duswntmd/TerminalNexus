import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './ShareBar.css';

/** 공유 버튼. 휴대폰은 기기 공유창(카카오톡 등)을 열고, 그 외에는 링크 복사와 X를 쓴다 */
const ShareBar = ({ path, text }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const url = `https://tnhub.kr${path}`;
  const native = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const share = async () => {
    try {
      await navigator.share({ title: text, text, url });
    } catch {
      // 사용자가 공유창을 닫은 경우
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };
  const xUrl = `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;

  return (
    <div className="tn-share">
      <span>{t('share.label')}</span>
      {native && <button type="button" onClick={share}>{t('share.native')}</button>}
      <button type="button" onClick={copy}>{copied ? t('share.copied') : t('share.copy')}</button>
      <a href={xUrl} target="_blank" rel="noopener noreferrer">X</a>
    </div>
  );
};

export default ShareBar;
