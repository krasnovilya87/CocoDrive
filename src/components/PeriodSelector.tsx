import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useLanguage } from '../LanguageContext';
import { cn } from '../lib/utils';

export const PeriodSelector = () => {
  const [days, setDays] = useState(7);
  const { language } = useLanguage();

  const content = {
    ru: { title: 'ПЕРИОД АРЕНДЫ', days: 'дней', discount: 'Ваша скидка', select: 'Выберите количество дней' },
    en: { title: 'RENTAL PERIOD', days: 'days', discount: 'Your discount', select: 'Select number of days' },
    id: { title: 'PERIODE SEWA', days: 'hari', discount: 'Diskon Anda', select: 'Pilih jumlah hari' },
    zh: { title: '租借期限', days: '天', discount: '您的折扣', select: '选择天数' },
    de: { title: 'MIETZEITRAUM', days: 'Tage', discount: 'Ihr Rabatt', select: 'Tage auswählen' },
    fr: { title: 'DURÉE DE LOCATION', days: 'jours', discount: 'Votre réduction', select: 'Sélectionnez la durée' },
  };

  const t = content[language as keyof typeof content] || content.en;

  const quickSelect = [1, 3, 7, 14, 30, 60];

  const getDiscount = (d: number) => {
    if (d >= 30) return 35;
    if (d >= 8) return 20;
    return 0;
  };

  const discount = getDiscount(days);

  return (
    <section className="py-12 px-6 bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-primary mb-8 text-center">
          {t.title}
        </h2>
        
        <div className="flex flex-col items-center gap-10">
          {/* Calendar Grid Representation */}
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 w-full max-w-2xl">
            {quickSelect.map((val) => (
              <button
                key={val}
                onClick={() => setDays(val)}
                className={cn(
                  "aspect-square flex flex-col items-center justify-center rounded-2xl border-2 transition-all p-2",
                  days === val 
                    ? "border-primary bg-primary text-white scale-105" 
                    : "border-border bg-surface text-muted hover:border-white/20"
                )}
              >
                <span className="text-xl font-display font-bold leading-none">{val}</span>
                <span className="text-[8px] uppercase font-bold tracking-tighter mt-1 opacity-60">
                  {val === 1 ? 'day' : t.days}
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-16 w-full justify-center">
            <div className="text-center">
              <span className="text-6xl md:text-8xl font-display font-bold text-white leading-none tracking-tighter">
                {days}
              </span>
              <p className="text-[10px] text-muted uppercase font-bold tracking-widest mt-4">
                {t.days}
              </p>
            </div>
            
            {discount > 0 ? (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                key={discount}
                className="bg-red-600 text-white p-6 rounded-[2.5rem] shadow-[0_0_40px_rgba(220,38,38,0.2)] text-center min-w-[160px]"
              >
                <p className="text-[10px] uppercase font-bold tracking-widest mb-1 opacity-80">{t.discount}</p>
                <p className="text-5xl font-display font-bold leading-none">-{discount}%</p>
              </motion.div>
            ) : (
              <div className="h-[90px] flex items-center">
                <p className="text-[10px] text-muted uppercase tracking-widest text-center px-4">
                  {language === 'ru' ? 'Скидки начинаются от 8 дней' : 
                   language === 'id' ? 'Diskon mulai dari 8 hari' : 
                   language === 'de' ? 'Rabatte ab 8 Tagen' : 
                   language === 'fr' ? 'Remises à partir de 8 jours' : 
                   'Discounts start from 8 days'}
                </p>
              </div>
            )}
          </div>
 
          <div className="flex flex-wrap justify-center gap-3">
             <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-[10px] font-bold uppercase text-primary">8+ {t.days}: 20% {language === 'ru' ? 'СКИДКА' : language === 'fr' ? 'DE REMISE' : language === 'de' ? 'RABATT' : language === 'id' ? 'DISKON' : 'OFF'}</span>
             </div>
             <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-[10px] font-bold uppercase text-primary">30+ {t.days}: 35% {language === 'ru' ? 'СКИДКА' : language === 'fr' ? 'DE REMISE' : language === 'de' ? 'RABATT' : language === 'id' ? 'DISKON' : 'OFF'}</span>
             </div>
          </div>
        </div>
      </div>
    </section>
  );
};
