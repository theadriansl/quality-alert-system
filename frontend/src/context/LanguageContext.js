// =====================================================
// ARCHIVO: frontend/src/context/LanguageContext.js
// Context para manejo de idiomas
// =====================================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from '../i18n/translations';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  // Detectar idioma inicial del navegador o localStorage
  const getInitialLanguage = () => {
    // 1. Verificar localStorage
    const savedLanguage = localStorage.getItem('8d-system-language');
    if (savedLanguage && ['en', 'es'].includes(savedLanguage)) {
      return savedLanguage;
    }
    
    // 2. Detectar idioma del navegador
    const browserLanguage = navigator.language.toLowerCase();
    if (browserLanguage.startsWith('es')) {
      return 'es';
    }
    if (browserLanguage.startsWith('en')) {
      return 'en';
    }
    
    // 3. Default: español (mercado principal)
    return 'es';
  };

  const [language, setLanguage] = useState(getInitialLanguage());
  const { t } = useTranslation(language);

  // Cambiar idioma y guardarlo
  const changeLanguage = (newLanguage) => {
    if (['en', 'es'].includes(newLanguage)) {
      setLanguage(newLanguage);
      localStorage.setItem('8d-system-language', newLanguage);
      
      // Opcional: enviar evento para analytics
      console.log(` Language changed to: ${newLanguage}`);
    }
  };

  // Obtener información del idioma actual
  const getCurrentLanguageInfo = () => {
    const languageInfo = {
      en: {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        flag: '',
        direction: 'ltr'
      },
      es: {
        code: 'es', 
        name: 'Spanish',
        nativeName: 'Español',
        flag: '',
        direction: 'ltr'
      }
    };
    
    return languageInfo[language];
  };

  // Formatear fechas según el idioma
  const formatDate = (date, options = {}) => {
    const locale = language === 'es' ? 'es-MX' : 'en-US';
    return new Date(date).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options
    });
  };

  // Formatear números/moneda según el idioma
  const formatCurrency = (amount, currency = 'USD') => {
    const locale = language === 'es' ? 'es-MX' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const value = {
    language,
    changeLanguage,
    t,
    getCurrentLanguageInfo,
    formatDate,
    formatCurrency,
    isEnglish: language === 'en',
    isSpanish: language === 'es'
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};