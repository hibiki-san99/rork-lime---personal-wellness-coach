import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useTranslation } from 'react-i18next';
import i18n, { deviceLanguage, type AppLanguage } from '@/constants/i18n';

const LANG_KEY = 'lime_app_language';

export const [LanguageProvider, useLanguage] = createContextHook(() => {
  const { t } = useTranslation();
  const [language, setLanguageState] = useState<AppLanguage>(i18n.language as AppLanguage);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(LANG_KEY);
        const lng: AppLanguage = stored === 'id' || stored === 'en' ? stored : deviceLanguage;
        if (i18n.language !== lng) {
          await i18n.changeLanguage(lng);
        }
        setLanguageState(lng);
        console.log('[Language] Loaded:', lng, 'device was:', deviceLanguage);
      } catch (err) {
        console.log('[Language] Load error:', err);
      } finally {
        setIsReady(true);
      }
    };
    void load();
  }, []);

  const setLanguage = useCallback(async (lng: AppLanguage) => {
    await AsyncStorage.setItem(LANG_KEY, lng);
    await i18n.changeLanguage(lng);
    setLanguageState(lng);
    console.log('[Language] Changed to:', lng);
  }, []);

  return useMemo(() => ({ language, setLanguage, isReady, t }), [language, setLanguage, isReady, t]);
});
