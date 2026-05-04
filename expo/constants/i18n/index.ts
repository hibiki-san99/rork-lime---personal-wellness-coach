import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import en from './en';
import id from './id';

export type AppLanguage = 'en' | 'id';

function detectDeviceLanguage(): AppLanguage {
  try {
    const locales = Localization.getLocales();
    const primary = locales[0]?.languageCode?.toLowerCase();
    if (primary === 'id' || primary === 'in') return 'id';
    return 'en';
  } catch (err) {
    console.log('[i18n] Device language detect error:', err);
    return 'en';
  }
}

export const deviceLanguage: AppLanguage = detectDeviceLanguage();

void i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      id: { translation: id },
    },
    lng: deviceLanguage,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v4',
    returnNull: false,
  });

export default i18n;
