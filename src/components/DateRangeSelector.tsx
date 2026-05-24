import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { DayPicker, DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { ru, enUS, id, fr, de } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../LanguageContext';
import { useRental } from '../RentalContext';
import { cn } from '../lib/utils';

export const DateRangeSelector = () => {
  const { t, language } = useLanguage();
  const { range, setRange, days } = useRental();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const localeMap: Record<string, any> = {
    ru,
    en: enUS,
    id,
    fr,
    de
  };
  const dateLocale = localeMap[language] || enUS;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (newRange: DateRange | undefined) => {
    if (newRange) {
      setRange({ from: newRange.from, to: newRange.to });
    }
  };

  return (
    <section className="bg-surface border-b border-border py-4 px-4 sticky top-[49px] z-40 backdrop-blur-md bg-surface/90">
      <div className="max-w-7xl mx-auto relative" ref={containerRef}>
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-center gap-2 bg-background p-1 rounded-2xl border border-border w-full max-w-2xl mx-auto cursor-pointer hover:border-primary/30 transition-all group"
        >
          <div className="flex-1 px-4 py-3 flex items-center gap-4">
            <CalendarIcon className="w-5 h-5 text-primary" />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-foreground">
                {range.from ? format(range.from, 'd MMM', { locale: dateLocale }) : '...'} 
                {' — '} 
                {range.to ? format(range.to, 'd MMM', { locale: dateLocale }) : '...'}
              </span>
            </div>
          </div>

          <div className="w-[1px] h-8 bg-border" />

          <div className="hidden sm:flex items-center gap-2 px-6 pr-8">
            <span className="text-xl font-display font-bold text-foreground leading-none">{days}</span>
            <span className="text-[10px] text-muted uppercase font-bold tracking-widest">{t.catalog.perDay}</span>
          </div>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute top-full left-1/2 -translate-x-1/2 mt-4 bg-surface border border-border rounded-3xl p-6 shadow-2xl z-50 overflow-hidden"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">
                  Select Dates
                </h3>
                <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/5 rounded-lg transition-colors">
                  <X className="w-4 h-4 text-muted" />
                </button>
              </div>

              <div className="rdp-custom">
                <DayPicker
                  mode="range"
                  selected={{ from: range.from, to: range.to }}
                  onSelect={handleSelect}
                  numberOfMonths={window.innerWidth > 768 ? 2 : 1}
                  locale={dateLocale}
                  disabled={{ before: new Date() }}
                  className="!m-0"
                  classNames={{
                    day_selected: "bg-primary text-white rounded-full",
                    day_today: "text-primary font-bold underline",
                    day_range_middle: "bg-primary/20 !text-white rounded-none",
                    day_range_start: "bg-primary text-white rounded-l-full",
                    day_range_end: "bg-primary text-white rounded-r-full",
                    nav_button_previous: "absolute left-5",
                    nav_button_next: "absolute right-5",
                  }}
                />
              </div>

              <div className="mt-6 pt-6 border-t border-border flex justify-between items-center">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-display font-bold text-primary">{days}</span>
                    <span className="text-[10px] text-muted uppercase font-bold tracking-widest">{t.catalog.perDay}</span>
                  </div>
                  {days >= 4 && (
                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">
                      {days >= 30 
                        ? (language === 'ru' ? 'Месячный тариф' : language === 'id' ? 'Tarif Bulanan' : language === 'fr' ? 'Tarif Mensuel' : language === 'de' ? 'Monatspreis' : 'Monthly Rate') 
                        : (language === 'ru' ? 'Недельный тариф' : language === 'id' ? 'Tarif Mingguan' : language === 'fr' ? 'Tarif Hebdomadaire' : language === 'de' ? 'Wochenpreis' : 'Weekly Rate')}
                    </span>
                  )}
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="bg-primary text-white px-8 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                >
                  Done
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};
