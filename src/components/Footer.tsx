import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../LanguageContext';

const footerDict: Record<string, Record<string, string>> = {
  "FAQ": {
    en: "FAQ",
    ru: "Вопросы",
    id: "FAQ",
    fr: "FAQ",
    de: "FAQ"
  },
  "Privacy Policy": {
    en: "Privacy Policy",
    ru: "Конфиденциальность",
    id: "Kebijakan Privasi",
    fr: "Confidentialité",
    de: "Datenschutz"
  },
  "Terms of Service": {
    en: "Terms of Service",
    ru: "Условия услуг",
    id: "Ketentuan Layanan",
    fr: "Conditions d'utilisation",
    de: "Nutzungsbedingungen"
  },
  "Data Deletion": {
    en: "Data Deletion",
    ru: "Удаление данных",
    id: "Penghapusan Data",
    fr: "Suppression des données",
    de: "Datenlöschung"
  }
};

export const Footer = ({ onAdminClick }: { onAdminClick?: () => void }) => {
  const { t, language } = useLanguage();
  const [clickTimes, setClickTimes] = useState<number[]>([]);

  const handleAdminClick = () => {
    const now = Date.now();
    // Keep only clicks within the last 1.5 seconds
    const validClicks = [...clickTimes, now].filter(time => now - time < 1500);
    setClickTimes(validClicks);

    if (validClicks.length >= 3) {
      setClickTimes([]); // reset clicks
      if (onAdminClick) {
        onAdminClick();
      }
    }
  };

  return (
    <footer className="py-4 border-t border-border bg-surface">
      <div className="max-w-7xl mx-auto px-6 flex flex-col items-center gap-3">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <Link 
            to="/faq"
            className="text-[8px] text-muted uppercase tracking-[0.2em] opacity-50 hover:opacity-100 transition-opacity underline decoration-dotted underline-offset-4"
          >
            {footerDict["FAQ"][language] || "FAQ"}
          </Link>
          <span className="text-[8px] text-muted/30">•</span>
          <a 
            href="/privacy.html"
            className="text-[8px] text-muted uppercase tracking-[0.2em] opacity-50 hover:opacity-100 transition-opacity underline decoration-dotted underline-offset-4"
          >
            {footerDict["Privacy Policy"][language] || "Privacy Policy"}
          </a>
          <span className="text-[8px] text-muted/30">•</span>
          <a 
            href="/terms.html"
            className="text-[8px] text-muted uppercase tracking-[0.2em] opacity-50 hover:opacity-100 transition-opacity underline decoration-dotted underline-offset-4"
          >
            {footerDict["Terms of Service"][language] || "Terms of Service"}
          </a>
          <span className="text-[8px] text-muted/30">•</span>
          <a 
            href="/data-deletion.html"
            className="text-[8px] text-muted uppercase tracking-[0.2em] opacity-50 hover:opacity-100 transition-opacity underline decoration-dotted underline-offset-4"
          >
            {footerDict["Data Deletion"][language] || "Data Deletion"}
          </a>
        </div>

        <div className="flex flex-col items-center gap-2">
          <button 
            onClick={handleAdminClick}
            className="text-[8px] text-muted uppercase tracking-[0.2em] opacity-50 select-none cursor-default"
          >
            {t.footer.desc}
          </button>
          <p className="text-[7px] text-muted uppercase tracking-widest opacity-30">
            © {new Date().getFullYear()} CocoDrive. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

