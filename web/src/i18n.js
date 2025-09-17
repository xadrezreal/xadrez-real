import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import translationEN from "./locales/en/translation.json";
import translationES from "./locales/es/translation.json";
import translationPT from "./locales/pt/translation.json";
import translationHI from "./locales/hi/translation.json";
import translationAR from "./locales/ar/translation.json";
import translationBN from "./locales/bn/translation.json";
import translationRU from "./locales/ru/translation.json";
import translationFR from "./locales/fr/translation.json";
import translationDE from "./locales/de/translation.json";
import translationZH from "./locales/zh/translation.json";

const resources = {
  en: { translation: translationEN },
  es: { translation: translationES },
  pt: { translation: translationPT },
  hi: { translation: translationHI },
  ar: { translation: translationAR },
  bn: { translation: translationBN },
  ru: { translation: translationRU },
  fr: { translation: translationFR },
  de: { translation: translationDE },
  zh: { translation: translationZH },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    debug: true,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });

export default i18n;
