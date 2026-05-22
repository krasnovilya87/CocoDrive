import React, { useState, useRef, useEffect } from 'react';
import { Palmtree, Globe, ChevronDown } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { Language } from '../i18n';

export const Navbar = () => {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const languages: { key: Language; label: string; flag: string }[] = [
    { key: 'en', label: 'English', flag: '🇬🇧' },
    { key: 'ru', label: 'Русский', flag: '🇷🇺' },
    { key: 'id', label: 'Indonesia', flag: '🇮🇩' },
    { key: 'fr', label: 'Français', flag: '🇫🇷' },
    { key: 'de', label: 'Deutsch', flag: '🇩🇪' },
  ];

  const currentLang = languages.find((l) => l.key === language) || languages[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border py-2 px-4 shadow-sm">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        {/* Left: Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="bg-primary p-1.5 rounded-lg text-white shrink-0">
            <Palmtree className="w-5 h-5" />
          </div>
          <span className="font-bold text-base sm:text-lg tracking-tight text-foreground whitespace-nowrap">
            Coco<span className="text-primary italic">Drive</span> Bali
          </span>
        </div>

        {/* Right: Language selector dropdown */}
        <div className="flex justify-end items-center gap-4 shrink-0">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border/80 bg-surface/50 hover:border-primary/40 hover:bg-surface transition-all text-xs font-semibold text-foreground cursor-pointer select-none active:scale-95"
            >
              <Globe className="w-3.5 h-3.5 text-muted" />
              <span>{currentLang.flag}</span>
              <span className="uppercase tracking-wider font-bold text-[10px]">{currentLang.key}</span>
              <ChevronDown className={`w-3 h-3 text-muted/60 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
              <div className="absolute right-0 mt-2 w-44 rounded-2xl border border-border bg-background shadow-2xl p-1.5 z-50">
                <div className="py-1 px-2.5 text-[9px] font-bold text-muted/60 uppercase tracking-widest border-b border-border/40 mb-1">
                  {language === 'ru' ? 'Язык' : 
                   language === 'id' ? 'Bahasa' : 
                   language === 'fr' ? 'Langue' : 
                   language === 'de' ? 'Sprache' : 
                   'Language'}
                </div>
                {languages.map((lang) => (
                  <button
                    key={lang.key}
                    onClick={() => {
                      setLanguage(lang.key);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer ${
                      language === lang.key
                        ? 'bg-primary/10 text-primary font-bold'
                        : 'text-muted hover:text-foreground hover:bg-surface/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{lang.flag}</span>
                      <span>{lang.label}</span>
                    </div>
                    {language === lang.key && (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

