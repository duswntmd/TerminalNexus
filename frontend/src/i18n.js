import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import translationKO from './locales/ko.json';
import translationEN from './locales/en.json';

const resources = {
  ko: {
    translation: translationKO
  },
  en: {
    translation: translationEN
  }
};

const STORAGE_KEY = 'lang';

// 저장된 선택 → 브라우저 언어 → 한국어 순으로 결정
const detectLanguage = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'ko' || saved === 'en') return saved;
  } catch {
    // 저장소를 못 쓰는 환경(사생활 보호 모드 등)
  }
  const browser = (navigator.language || 'ko').toLowerCase();
  return browser.startsWith('ko') ? 'ko' : browser.startsWith('en') ? 'en' : 'ko';
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: detectLanguage(),
    fallbackLng: 'ko', // 영어 번역이 빠진 문구는 한국어로 표시
    interpolation: {
      escapeValue: false // React already escapes
    }
  });

// 언어를 바꾸면 기억하고, 스크린리더·검색엔진용 <html lang> 도 맞춤
const applyLanguage = (lng) => {
  document.documentElement.lang = lng;
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    // 무시
  }
};
document.documentElement.lang = i18n.language;
i18n.on('languageChanged', applyLanguage);

export default i18n;
