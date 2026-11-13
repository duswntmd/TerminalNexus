import React from 'react';
import { useTranslation } from 'react-i18next';

/** 결과 정산 */
export const Settlement = ({ result, names, delta, children }) => {
  const { t } = useTranslation();
  const title = result.winner == null ? t('gostop.result.nagari') : t('gostop.result.wins', { name: names[result.winner] });
  return (
    <div className="gs-overlay" role="dialog" aria-label={title}>
      <div className="gs-overlay-box gs-settle">
        <strong className="gs-settle-title">{title}</strong>
        <p className="gs-settle-reason">{t(`gostop.reason.${result.reason}`)}</p>
        {result.winner != null && (
          <table className="gs-settle-table">
            <tbody>
              {result.score && result.score.items.map(([key, n]) => (
                <tr key={key}><td>{t(`gostop.score_items.${key}`)}</td><td>{n}</td></tr>
              ))}
              {result.goCount > 0 && <tr><td>{t('gostop.settle.go_bonus', { n: result.goCount })}</td><td>+{result.goCount}</td></tr>}
              <tr className="is-sum"><td>{t('gostop.settle.base')}</td><td>{result.base}</td></tr>
              {result.multipliers.map(([key, x]) => (
                <tr key={key}><td>{t(`gostop.settle.mul.${key}`)}</td><td>×{x}</td></tr>
              ))}
              <tr className="is-total"><td>{t('gostop.settle.final')}</td><td>{t('gostop.points_unit', { n: result.final })}</td></tr>
            </tbody>
          </table>
        )}
        {result.winner == null && <p className="gs-hint">{t('gostop.settle.nagari_next', { x: result.nextCarry })}</p>}
        {result.bonus && result.bonus.some((b) => b > 0) && (
          <p className="gs-hint">
            {result.bonus.map((b, i) => (b > 0 ? t('gostop.settle.ppeok_bonus', { name: names[i], n: b }) : null)).filter(Boolean).join(' · ')}
          </p>
        )}
        {delta != null && (
          <p className={`gs-delta${delta >= 0 ? ' up' : ' down'}`}>{delta >= 0 ? '+' : ''}{delta.toLocaleString()}P</p>
        )}
        <div className="gs-actions">{children}</div>
      </div>
    </div>
  );
};
