import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { NAV_GROUPS } from '../nav';
import './Header.css';

const group = (k) => NAV_GROUPS.find((g) => g.key === k);

// 드롭다운 패널 (게임·체험 / 도구)
function MenuPanel({ items, t, onPick, wide }) {
  return (
    <div className={`hd-panel ${wide ? 'wide' : ''}`} role="menu">
      {items.map((it) => (
        <Link key={it.key} to={it.path} className="hd-panel-item" role="menuitem" onClick={onPick}>
          <span className="hd-glyph" aria-hidden="true">{it.glyph}</span>
          <span className="hd-panel-text">
            <span className="hd-panel-name">
              {t(`nav.${it.key}.name`)}
              {it.login && <span className="hd-lock" title={t("nav.login_needed")}>{t("header.login")}</span>}
            </span>
            <span className="hd-panel-desc">{t(`nav.${it.key}.desc`)}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}

const Header = () => {
  const { isLoggedIn, logout, user } = useAuth();
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [lottoAlerts, setLottoAlerts] = useState(0);
  const [open, setOpen] = useState(null); // 'play' | 'tools' | null (데스크톱 드롭다운)
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef(null);

  // 관리자 여부
  useEffect(() => {
    if (!isLoggedIn) { setIsAdmin(false); return; }
    fetch('/api/user', { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setIsAdmin(d?.roleType === 'ADMIN'))
      .catch(() => setIsAdmin(false));
  }, [isLoggedIn]);

  // 로또 결과 알림 수 (토큰이 만료돼도 로그인 페이지로 보내지 않도록 일반 fetch)
  useEffect(() => {
    if (!isLoggedIn) { setLottoAlerts(0); return undefined; }
    const load = () => fetch('/api/lotto/my/unread', { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } })
      .then((r) => (r.ok ? r.json() : { count: 0 }))
      .then((d) => setLottoAlerts(d.count || 0))
      .catch(() => {});
    load();
    window.addEventListener('lotto-alerts-read', load);
    return () => window.removeEventListener('lotto-alerts-read', load);
  }, [isLoggedIn, location.pathname]);

  // 페이지 이동 시 메뉴 닫기
  useEffect(() => { setOpen(null); setMobileOpen(false); }, [location.pathname]);

  // 바깥 클릭·Esc로 닫기
  useEffect(() => {
    const onDown = (e) => { if (navRef.current && !navRef.current.contains(e.target)) setOpen(null); };
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(null); setMobileOpen(false); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, []);

  // 모바일 메뉴 열렸을 때 본문 스크롤 잠금
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const close = () => { setOpen(null); setMobileOpen(false); };
  const handleLogout = () => { logout(); setIsAdmin(false); close(); };
  const lang = i18n.language?.startsWith('en') ? 'en' : 'ko';
  const inGroup = (k) => group(k).items.some((i) => location.pathname.startsWith(i.path));

  const dropdown = (k, wide) => (
    <li
      className={`hd-item has-panel ${open === k ? 'open' : ''}`}
      onMouseEnter={() => setOpen(k)}
      onMouseLeave={() => setOpen((o) => (o === k ? null : o))}
    >
      <button
        type="button"
        className={`hd-link ${inGroup(k) ? 'active' : ''}`}
        aria-expanded={open === k}
        aria-haspopup="true"
        onClick={() => setOpen((o) => (o === k ? null : k))}
      >
        {t(`nav.groups.${k}`)}
        <svg className="hd-caret" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
      </button>
      {open === k && <MenuPanel items={group(k).items} t={t} onPick={close} wide={wide} />}
    </li>
  );

  const LangSwitch = (
    <div className="hd-lang" role="group" aria-label="Language">
      {['ko', 'en'].map((l) => (
        <button key={l} type="button" aria-pressed={lang === l} className={lang === l ? 'on' : ''} onClick={() => { i18n.changeLanguage(l); }}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );

  return (
    <header className="hd">
      <a href="#main" className="hd-skip">{t('nav.skip')}</a>
      <div className="hd-inner" ref={navRef}>
        <Link to="/" className="hd-brand" onClick={close} aria-label="TerminalNexus 홈">
          <img src="/favicon-192.png" alt="" className="hd-logo" />
          <span className="hd-word">TerminalNexus</span>
        </Link>

        <nav className="hd-nav" aria-label="주 메뉴">
          <ul>
            <li className="hd-item"><NavLink to="/freeboard" className="hd-link">{t('nav.freeboard.name')}</NavLink></li>
            <li className="hd-item"><NavLink to="/chat" className="hd-link">{t('nav.chat.name')}</NavLink></li>
            {dropdown('play', true)}
            {dropdown('tools', false)}
            <li className="hd-item"><NavLink to="/guide" className="hd-link">{t('nav.guide')}</NavLink></li>
          </ul>
        </nav>

        <div className="hd-right">
          {isLoggedIn ? (
            <>
              {isAdmin && <Link to="/admin/users" className="hd-text-link">{t('header.admin_users')}</Link>}
              {lottoAlerts > 0 && <Link to="/lotto?tab=my" className="hd-alert">{t('lotto.my_header_alert')}</Link>}
              <Link to="/user" className="hd-user" title={t('header.mypage')}>
                <span className="tn-led" aria-hidden="true" />
                <span className="hd-user-name">{user?.nickname || t('header.mypage')}</span>
              </Link>
              <button type="button" className="hd-text-link" onClick={handleLogout}>{t('header.logout')}</button>
            </>
          ) : (
            <>
              <Link to="/login" className="hd-text-link">{t('header.login')}</Link>
              <Link to="/join" className="tn-btn tn-btn-primary hd-join">{t('header.signup')}</Link>
            </>
          )}
          {LangSwitch}
        </div>

        <button
          type="button"
          className={`hd-burger ${mobileOpen ? 'open' : ''}`}
          aria-label={mobileOpen ? t('nav.close') : t('nav.menu')}
          aria-expanded={mobileOpen}
          aria-controls="hd-mobile"
          onClick={() => setMobileOpen((v) => !v)}
        >
          <span /><span /><span />
        </button>
      </div>

      {mobileOpen && (
        <div className="hd-mobile" id="hd-mobile">
          <div className="hd-mobile-scroll">
            <div className="hd-mobile-account">
              {isLoggedIn ? (
                <>
                  <Link to="/user" className="hd-user" onClick={close}><span className="tn-led" aria-hidden="true" /><span>{user?.nickname || t('header.mypage')}</span></Link>
                  <div className="hd-mobile-account-actions">
                    {lottoAlerts > 0 && <Link to="/lotto?tab=my" className="tn-btn tn-btn-primary" onClick={close}>{t('lotto.my_header_alert')}</Link>}
                    {isAdmin && <Link to="/admin/users" className="tn-btn tn-btn-ghost" onClick={close}>{t('header.admin_users')}</Link>}
                    <button type="button" className="tn-btn tn-btn-ghost" onClick={handleLogout}>{t('header.logout')}</button>
                  </div>
                </>
              ) : (
                <div className="hd-mobile-account-actions">
                  <Link to="/login" className="tn-btn tn-btn-ghost" onClick={close}>{t('header.login')}</Link>
                  <Link to="/join" className="tn-btn tn-btn-primary" onClick={close}>{t('header.signup')}</Link>
                </div>
              )}
            </div>
            {NAV_GROUPS.map((g) => (
              <section key={g.key} className="hd-mobile-group">
                <h2>{t(`nav.groups.${g.key}`)}</h2>
                {g.items.map((it) => (
                  <Link key={it.key} to={it.path} className="hd-panel-item" onClick={close}>
                    <span className="hd-glyph" aria-hidden="true">{it.glyph}</span>
                    <span className="hd-panel-text">
                      <span className="hd-panel-name">{t(`nav.${it.key}.name`)}{it.login && <span className="hd-lock">{t("header.login")}</span>}</span>
                      <span className="hd-panel-desc">{t(`nav.${it.key}.desc`)}</span>
                    </span>
                  </Link>
                ))}
              </section>
            ))}
            <div className="hd-mobile-foot">
              <Link to="/guide" onClick={close}>{t('nav.guide')}</Link>
              <Link to="/donation" onClick={close}>{t('nav.donation')}</Link>
              {LangSwitch}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
