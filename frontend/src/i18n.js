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

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "ko", // Default language
    fallbackLng: "en",
    interpolation: {
      escapeValue: false // React already escapes
    }
  });

export default i18n;
