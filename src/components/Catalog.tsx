import React, { useState, useEffect, useMemo } from 'react';
import { Bike, BikeType } from '../types';
import { BikeCard } from './BikeCard';
import { motion, LayoutGroup, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useLanguage } from '../LanguageContext';
import { getBikes, subscribeToBikes } from '../services/dataService';
import { ArrowDown, Sparkles } from 'lucide-react';
import { SmartFilter } from './SmartFilter';

export const Catalog = () => {
  const [activeType, setActiveType] = useState<BikeType>('all');
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSmartFilterOpen, setIsSmartFilterOpen] = useState(false);
  const { t, language } = useLanguage();

  useEffect(() => {
    // Initial fetch to show immediate data if available
    const initialLoad = async () => {
      try {
        const data = await getBikes();
        if (data.length > 0) {
          setBikes(data);
          setLoading(false);
        }
      } catch (e) {}
    };
    initialLoad();

    // Subscribe to real-time updates
    const unsubscribe = subscribeToBikes((updatedBikes) => {
      setBikes(updatedBikes);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const [priceSort, setPriceSort] = useState<'asc' | 'desc' | null>(null);

  const filteredAndSortedBikes = useMemo(() => {
    const list = (bikes || []).filter(bike => {
      if (activeType === 'all') return true;
      const bikeTypes = Array.isArray(bike.type) ? bike.type : [bike.type];
      return bikeTypes.includes(activeType);
    });

    if (priceSort) {
      return [...list].sort((a, b) => {
        const pA = a.isPromoActive && a.promoPrice ? a.promoPrice : a.pricePerDay;
        const pB = b.isPromoActive && b.promoPrice ? b.promoPrice : b.pricePerDay;
        return priceSort === 'asc' ? pA - pB : pB - pA;
      });
    }
    return list;
  }, [bikes, activeType, priceSort]);

  const availableTypes = Array.from(new Set(bikes.flatMap(b => Array.isArray(b.type) ? b.type : [b.type]))).filter(Boolean) as string[];
  
  const categoryTranslations: Record<string, Record<string, string>> = {
    all: {
      en: 'All',
      ru: 'Все',
      id: 'Semua',
      fr: 'Tout',
      de: 'Alle'
    },
    popular: {
      en: 'Popular',
      ru: 'Популярные',
      id: 'Populer',
      fr: 'Populaires',
      de: 'Beliebt'
    },
    beginner: {
      en: 'Beginner',
      ru: 'Для новичков',
      id: 'Pemula',
      fr: 'Débutant',
      de: 'Anfänger'
    },
    retro: {
      en: 'Retro',
      ru: 'Ретро',
      id: 'Retro',
      fr: 'Rétro',
      de: 'Retro'
    },
    maxi: {
      en: 'Maxi',
      ru: 'Макси',
      id: 'Maksi',
      fr: 'Maxi',
      de: 'Maxi'
    },
    budget: {
      en: 'Budget',
      ru: 'Бюджетные',
      id: 'Murah',
      fr: 'Budget',
      de: 'Budget'
    }
  };

  const categories: { label: string; value: string }[] = [
    { label: 'All', value: 'all' },
    ...availableTypes.map(type => ({ label: type as string, value: type as string }))
  ];

  return (
    <section id="catalog" className="py-12 px-4 md:px-6 bg-background">
      <div className="max-w-7xl mx-auto">
        
        {/* Filter UI */}
        {!loading && categories.length > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3 md:gap-x-3 mb-8 md:mb-16 max-w-[350px] sm:max-w-none mx-auto px-1">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setActiveType(cat.value)}
                className={cn(
                  "px-4 md:px-7 py-2 md:py-3.5 rounded-full text-sm md:text-lg font-extrabold transition-all border whitespace-nowrap cursor-pointer",
                  activeType === cat.value
                    ? "bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-105" 
                    : "bg-surface border-border text-muted hover:text-foreground hover:border-foreground/20"
                )}
              >
                {categoryTranslations[cat.value.toLowerCase()]?.[language] || cat.label}
              </button>
            ))}

            <div className="hidden sm:block h-8 w-px bg-border/60 mx-1 md:mx-2 self-center" />

            <button
              onClick={() => {
                setPriceSort(prev => {
                  if (prev === null) return 'asc';
                  if (prev === 'asc') return 'desc';
                  return null;
                });
              }}
              className={cn(
                "px-4 md:px-7 py-2 md:py-3.5 rounded-full text-sm md:text-lg font-extrabold transition-all border whitespace-nowrap cursor-pointer flex items-center gap-1.5 md:gap-2",
                priceSort !== null
                  ? "bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-105"
                  : "bg-surface border-border text-muted hover:text-foreground hover:border-foreground/20"
              )}
            >
              <span>{language === 'ru' ? 'Цена' : 'Price'}</span>
              <ArrowDown className={cn(
                "w-4 h-4 md:w-5 md:h-5 transition-transform duration-200",
                priceSort === 'desc' ? "rotate-180" : ""
              )} />
            </button>

            <button
              id="btn-smart-filter-trigger"
              onClick={() => setIsSmartFilterOpen(true)}
              className="px-4 md:px-7 py-2 md:py-3.5 rounded-full text-sm md:text-lg font-extrabold transition-all border whitespace-nowrap cursor-pointer flex items-center gap-1.5 md:gap-2 bg-gradient-to-r from-primary/15 to-primary/25 border-primary/40 text-primary hover:from-primary hover:to-primary/90 hover:text-white shadow-lg shadow-primary/5 hover:shadow-primary/20 hover:scale-105 active:scale-95"
            >
              <Sparkles className="w-4 h-4 md:w-5 md:h-5 animate-pulse" />
              <span>{language === 'ru' ? 'Умный подбор' : 'Smart Choice'}</span>
            </button>
          </div>
        )}

        <SmartFilter isOpen={isSmartFilterOpen} onClose={() => setIsSmartFilterOpen(false)} />

        <LayoutGroup>
          <motion.div 
            layout
            className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-8 min-h-[600px]"
          >
            <AnimatePresence mode='popLayout'>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <motion.div
                    key={`skeleton-${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="aspect-[4/5] bg-surface/50 animate-pulse rounded-[32px] border border-border"
                  />
                ))
              ) : filteredAndSortedBikes.length > 0 ? (
                filteredAndSortedBikes.map((bike) => (
                  <motion.div
                    key={bike.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                  >
                    <BikeCard bike={bike} />
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full py-20 text-center text-muted">
                  No bikes found
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        </LayoutGroup>

      </div>
    </section>
  );
};

