import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Users, MapPin, Compass, Mountain, Camera, Sparkles, Check, Heart, ArrowRight } from 'lucide-react';
import { Bike } from '../types';
import { useLanguage } from '../LanguageContext';
import { useRental } from '../RentalContext';
import { getBikes, subscribeToBikes } from '../services/dataService';
import { cn, formatPrice } from '../lib/utils';

interface SmartFilterProps {
  isOpen: boolean;
  onClose: () => void;
}

const filterDictObj: Record<string, Record<string, string>> = {
  title: {
    en: "AI Assistant Matching",
    ru: "Умный подбор байка",
    id: "Asisten Pintar",
    fr: "Sélection Intelligente",
    de: "Intelligenter Filter"
  },
  subtitle: {
    en: "Find your ideal scooter in 10 seconds",
    ru: "Найди свой идеальный байк за 10 секунд",
    id: "Temukan motor ideal Anda dalam 10 detik",
    fr: "Trouvez votre scooter idéal en 10 secondes",
    de: "Finden Sie Ihr ideales Motorrad in 10 Sekunden"
  },
  peopleLabel: {
    en: "How many passengers?",
    ru: "Сколько людей поедет?",
    id: "Berapa banyak orang?",
    fr: "Combien de personnes ?",
    de: "Wie viele Personen?"
  },
  person1: {
    en: "1 Person",
    ru: "1 Человек",
    id: "1 Orang",
    fr: "1 Personne",
    de: "1 Person"
  },
  person2: {
    en: "2 People (Couple)",
    ru: "2 Человека (Пара)",
    id: "2 Человека (Пара)",
    fr: "2 Personnes (Couple)",
    de: "2 Personen (Paar)"
  },
  whereTo: {
    en: "Where will you ride?",
    ru: "Куда планируете ездить?",
    id: "Ke mana Anda akan berkendara?",
    fr: "Où allez-vous conduire ?",
    de: "Wohin werden Sie fahren?"
  },
  cityLabel: {
    en: "City & Beaches (cafes, shortcuts)",
    ru: "City (пляж, кафе, узкие объезды)",
    id: "Kota & Pantai (kafe, jalan pintas)",
    fr: "Ville & Plages (cafés, raccourcis)",
    de: "Stadt & Strände (Cafés, Abkürzungen)"
  },
  longTripLabel: {
    en: "Long Trips (waterfalls, long roads)",
    ru: "Long Trip (водопады, ровные трассы)",
    id: "Perjalanan Jauh (air terjun, jalan panjang)",
    fr: "Longs trajets (cascades, longues routes)",
    de: "Langstrecken (Wasserfälle, lange Straßen)"
  },
  mountLabel: {
    en: "Mountains (steep climbs, volcanoes)",
    ru: "Mountains (вулкан, крутые подъемы)",
    id: "Pegunungan (tanjakan curam, gunung berapi)",
    fr: "Montagnes (montées raides, volcans)",
    de: "Berge (steile Anstiege, Vulkane)"
  },
  photoLabel: {
    en: "Aesthetics & Photo (retro style)",
    ru: "Photo (эстетика, фотосессии)",
    id: "Estetika / Pemotretan (gaya retro)",
    fr: "Esthétique / Séances photo (style rétro)",
    de: "Ästhetik / Fotoshootings (Retro-Stil)"
  },
  matchingBikes: {
    en: "Recommended Bikes:",
    ru: "Рекомендуемые байки:",
    id: "Motor yang Direkomendasikan:",
    fr: "Scooters recommandés :",
    de: "Empfohlene Motorräder:"
  },
  bookNow: {
    en: "Book",
    ru: "Забронировать",
    id: "Pesan",
    fr: "Réserver",
    de: "Buchen"
  },
  matchRate: {
    en: "Match",
    ru: "Совпадение",
    id: "Классно",
    fr: "S'accorde",
    de: "Match"
  },
  close: {
    en: "Close",
    ru: "Закрыть",
    id: "Tutup",
    fr: "Fermer",
    de: "Schließen"
  },
  noBikes: {
    en: "Adjust sliders to see recommended bikes",
    ru: "Измените параметры, чтобы увидеть байки",
    id: "Sesuaikan slider untuk melihat motor",
    fr: "Ajustez les curseurs pour voir les scooters",
    de: "Schieberegler anpassen, um Motorräder zu sehen"
  },
  engine: {
    en: "Engine",
    ru: "Двигатель",
    id: "Mesin",
    fr: "Moteur",
    de: "Motor"
  },
  perMonth: {
    en: "month",
    ru: "месяц",
    id: "bulan",
    fr: "mois",
    de: "Monat"
  },
  perDay30: {
    en: "day (30+ days)",
    ru: "день (от 30 дн)",
    id: "hari (30+ hari)",
    fr: "jour (30+ jrs)",
    de: "Tag (30+ Tage)"
  }
};

export const SmartFilter: React.FC<SmartFilterProps> = ({ isOpen, onClose }) => {
  const { language } = useLanguage();
  const { setSelectedBike } = useRental();
  const [bikes, setBikes] = useState<Bike[]>([]);

  // User slider states
  const [peopleCount, setPeopleCount] = useState<number>(1); // Snap 1 or 2
  const [cityVal, setCityVal] = useState<number>(50);
  const [longVal, setLongVal] = useState<number>(0);
  const [mountVal, setMountVal] = useState<number>(0);
  const [photoVal, setPhotoVal] = useState<number>(0);

  // Sync bikes list
  useEffect(() => {
    let active = true;
    const fetchBikes = async () => {
      try {
        const data = await getBikes();
        if (active && data.length > 0) {
          setBikes(data);
        }
      } catch (e) {}
    };
    fetchBikes();

    const unsubscribe = subscribeToBikes((updated) => {
      if (active) {
        setBikes(updated);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const dict = (key: string): string => {
    return filterDictObj[key]?.[language] || filterDictObj[key]?.en || key;
  };

  // Label text helpers for sliders
  const getIntensityLabel = (val: number): string => {
    if (val === 0) return language === 'ru' ? 'Неважно' : 'Not needed';
    if (val < 40) return language === 'ru' ? 'Иногда' : 'Occasionally';
    if (val < 80) return language === 'ru' ? 'Желательно' : 'Essential';
    return language === 'ru' ? 'Очень важно!' : 'Priority!';
  };

  // Recommendation engine
  const matchedBikesWithScores = useMemo(() => {
    if (!bikes || bikes.length === 0) return [];

    return bikes.map(bike => {
      // 1. Passengers fit scoring (0.0 to 1.0)
      let passengerScore = 1.0;
      if (peopleCount === 2) {
        if (bike.bestFor?.includes('Couple')) {
          passengerScore = 1.0;
        } else if (bike.engineSize >= 150) {
          passengerScore = 0.9;
        } else if (bike.engineSize >= 125) {
          passengerScore = 0.7;
        } else {
          passengerScore = 0.4;
        }
      } else {
        // 1 person fit is excellent on all, slightly nicer on fuel-efficient nimble/average size
        passengerScore = 1.0;
      }

      // 2. Destinations weighted scoring (0.0 to 1.0)
      let destinationScore = 1.0;
      let totalWeight = 0;
      let weightedSum = 0;

      const items = [
        { key: 'City', currentVal: cityVal },
        { key: 'Long Trip', currentVal: longVal },
        { key: 'Mountains', currentVal: mountVal },
        { key: 'Photo', currentVal: photoVal }
      ];

      items.forEach(item => {
        if (item.currentVal > 0) {
          totalWeight += item.currentVal;
          let matchRating = 0.4; // baseline

          const isExplicit = bike.bestFor?.includes(item.key);
          if (isExplicit) {
            matchRating = 1.0;
          } else {
            // Contextual capabilities fallback
            if (item.key === 'City') {
              if (bike.engineSize <= 160) {
                matchRating = 0.9; // nimble
              } else {
                matchRating = 0.75; // a bit bulkier
              }
            } else if (item.key === 'Long Trip') {
              if (bike.hasBigTrunk || bike.engineSize >= 250) {
                matchRating = 0.9;
              } else if (bike.engineSize >= 150) {
                matchRating = 0.8;
              } else if (bike.engineSize >= 125) {
                matchRating = 0.65;
              } else {
                matchRating = 0.3;
              }
            } else if (item.key === 'Mountains') {
              if (bike.engineSize >= 250) {
                matchRating = 1.0;
              } else if (bike.engineSize >= 150) {
                matchRating = 0.8;
              } else if (bike.engineSize >= 125) {
                matchRating = 0.5;
              } else {
                matchRating = 0.15;
              }
            } else if (item.key === 'Photo') {
              const nameLower = bike.name.toLowerCase();
              if (nameLower.includes('vespa') || nameLower.includes('scoopy') || nameLower.includes('filano')) {
                matchRating = 0.9;
              } else {
                matchRating = 0.4;
              }
            }
          }

          weightedSum += matchRating * item.currentVal;
        }
      });

      if (totalWeight > 0) {
        destinationScore = weightedSum / totalWeight;
      }

      // Combine weights: 30% passenger compatibility, 70% destination alignment
      // If no destination filter is active, it's driven entirely by passenger score
      let combined = 1.0;
      if (totalWeight > 0) {
        combined = (passengerScore * 0.3) + (destinationScore * 0.7);
      } else {
        combined = passengerScore;
      }

      const matchPercent = Math.min(100, Math.max(10, Math.round(combined * 100)));

      return {
        bike,
        percent: matchPercent
      };
    })
    .filter(item => item.percent >= 40) // widen filter slightly so relevant options stay visible
    .sort((a, b) => b.percent - a.percent); // sort highest matching first
  }, [bikes, peopleCount, cityVal, longVal, mountVal, photoVal]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-xl"
        />

        {/* Modal Window Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 30 }}
          className="relative w-full max-w-xl bg-surface/90 backdrop-blur-2xl rounded-[24px] sm:rounded-[32px] border border-white/10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col max-h-[92vh] md:max-h-[85vh]"
        >
          {/* Top glowing design element */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-primary/20 blur-[60px] rounded-full pointer-events-none" />

          {/* Header */}
          <div className="relative p-4 md:p-5 border-b border-white/5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner font-sans">
                <Sparkles className="w-5.5 h-5.5 md:w-6 md:h-6 animate-pulse" />
              </div>
              <div>
                <h3 id="smart-filter-title" className="text-lg md:text-2xl font-display font-black tracking-tight text-foreground">
                  {dict("title")}
                </h3>
                <p className="text-[11px] md:text-xs font-bold text-muted uppercase tracking-wider mt-0.5">
                  {dict("subtitle")}
                </p>
              </div>
            </div>
            <button 
              id="smart-filter-close-btn"
              onClick={onClose}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/5 active:scale-90"
            >
              <X className="w-5 h-5 text-muted" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-4 md:p-5 overflow-y-auto custom-scrollbar flex-grow space-y-3">
            
            {/* Sliders Area */}
            <div className="space-y-2.5">
              
              {/* PASSENGERS SLIDER */}
              <div className="space-y-1.5 p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2.5 text-foreground">
                    <Users className="w-4 h-4 text-primary" />
                    <span className="text-xs md:text-sm font-extrabold uppercase tracking-wider">
                      {dict("peopleLabel")}
                    </span>
                  </div>
                  <span className="text-xs md:text-sm font-black text-primary bg-primary/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    {peopleCount === 1 ? dict("person1") : dict("person2")}
                  </span>
                </div>
                
                <div className="relative pt-1">
                  {/* Slider bar background track */}
                  <div className="absolute h-2 w-full bg-white/10 rounded-full top-1/2 -translate-y-1/2" />
                  
                  {/* Slider filled track */}
                  <div 
                    className="absolute h-2 bg-primary/60 rounded-full top-1/2 -translate-y-1/2"
                    style={{ width: peopleCount === 2 ? '100%' : '0%' }}
                  />
                  
                  {/* Real slider control */}
                  <input
                    id="slider-people-count"
                    type="range"
                    min="1"
                    max="2"
                    step="1"
                    value={peopleCount}
                    onChange={(e) => setPeopleCount(Number(e.target.value))}
                    className="relative w-full h-6 bg-transparent appearance-none cursor-pointer focus:outline-none z-10 accent-primary"
                    style={{
                      WebkitAppearance: 'none'
                    }}
                  />
                  
                  {/* Slider visual ticks */}
                  <div className="flex justify-between text-[10px] md:text-xs font-bold text-muted/60 uppercase tracking-widest px-1 mt-0.5 font-mono">
                    <span>1 {language === 'ru' ? 'чел' : 'pax'}</span>
                    <span>2 {language === 'ru' ? 'чел' : 'pax'}</span>
                  </div>
                </div>
              </div>


              {/* DESTINATIONS LABELED SLIDERS */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 pl-1 mb-0.5">
                  <div className="h-px flex-grow bg-white/5" />
                  <span className="text-[11px] md:text-xs font-black text-muted uppercase tracking-[0.2em] whitespace-nowrap">
                    {dict("whereTo")}
                  </span>
                  <div className="h-px bg-white/5 flex-grow" />
                </div>

                <div className="grid grid-cols-1 gap-1">
                  
                  {/* CITY / BEACH SLIDER */}
                  <div className="p-2 bg-white/[0.01] border border-white/5 rounded-xl group hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5 text-foreground/80 group-hover:text-foreground transition-colors">
                        <MapPin className="w-4 h-4 text-[#3b82f6]" />
                        <span className="text-xs md:text-sm font-extrabold uppercase tracking-wide">
                          {dict("cityLabel")}
                        </span>
                      </div>
                      <span className="text-xs md:text-sm font-black text-[#3b82f6] capitalize">
                        {getIntensityLabel(cityVal)}
                      </span>
                    </div>
                    <div className="relative flex items-center py-0.5">
                      <div className="absolute h-2 w-full bg-white/10 rounded-full" />
                      <div className="absolute h-2 bg-[#3b82f6]/40 rounded-full" style={{ width: `${cityVal}%` }} />
                      <input
                        id="slider-city-priority"
                        type="range"
                        min="0"
                        max="100"
                        value={cityVal}
                        onChange={(e) => setCityVal(Number(e.target.value))}
                        className="relative w-full h-5 bg-transparent appearance-none cursor-pointer focus:outline-none z-10 accent-[#3b82f6]"
                      />
                    </div>
                  </div>

                  {/* LONG TRIP SLIDER */}
                  <div className="p-2 bg-white/[0.01] border border-white/5 rounded-xl group hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5 text-foreground/80 group-hover:text-foreground transition-colors">
                        <Compass className="w-4 h-4 text-[#eab308]" />
                        <span className="text-xs md:text-sm font-extrabold uppercase tracking-wide">
                          {dict("longTripLabel")}
                        </span>
                      </div>
                      <span className="text-xs md:text-sm font-black text-[#eab308] capitalize">
                        {getIntensityLabel(longVal)}
                      </span>
                    </div>
                    <div className="relative flex items-center py-0.5">
                      <div className="absolute h-2 w-full bg-white/10 rounded-full" />
                      <div className="absolute h-2 bg-[#eab308]/40 rounded-full" style={{ width: `${longVal}%` }} />
                      <input
                        id="slider-longtrip-priority"
                        type="range"
                        min="0"
                        max="100"
                        value={longVal}
                        onChange={(e) => setLongVal(Number(e.target.value))}
                        className="relative w-full h-5 bg-transparent appearance-none cursor-pointer focus:outline-none z-10 accent-[#eab308]"
                      />
                    </div>
                  </div>

                  {/* MOUNTAINS SLIDER */}
                  <div className="p-2 bg-white/[0.01] border border-white/5 rounded-xl group hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5 text-foreground/80 group-hover:text-foreground transition-colors">
                        <Mountain className="w-4 h-4 text-[#10b981]" />
                        <span className="text-xs md:text-sm font-extrabold uppercase tracking-wide">
                          {dict("mountLabel")}
                        </span>
                      </div>
                      <span className="text-xs md:text-sm font-black text-[#10b981] capitalize">
                        {getIntensityLabel(mountVal)}
                      </span>
                    </div>
                    <div className="relative flex items-center py-0.5">
                      <div className="absolute h-2 w-full bg-white/10 rounded-full" />
                      <div className="absolute h-2 bg-[#10b981]/40 rounded-full" style={{ width: `${mountVal}%` }} />
                      <input
                        id="slider-mountains-priority"
                        type="range"
                        min="0"
                        max="100"
                        value={mountVal}
                        onChange={(e) => setMountVal(Number(e.target.value))}
                        className="relative w-full h-5 bg-transparent appearance-none cursor-pointer focus:outline-none z-10 accent-[#10b981]"
                      />
                    </div>
                  </div>

                  {/* PHOTO SLIDER */}
                  <div className="p-2 bg-white/[0.01] border border-white/5 rounded-xl group hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5 text-foreground/80 group-hover:text-foreground transition-colors">
                        <Camera className="w-4 h-4 text-[#ec4899]" />
                        <span className="text-xs md:text-sm font-extrabold uppercase tracking-wide">
                          {dict("photoLabel")}
                        </span>
                      </div>
                      <span className="text-xs md:text-sm font-black text-[#ec4899] capitalize">
                        {getIntensityLabel(photoVal)}
                      </span>
                    </div>
                    <div className="relative flex items-center py-0.5">
                      <div className="absolute h-2 w-full bg-white/10 rounded-full" />
                      <div className="absolute h-2 bg-[#ec4899]/40 rounded-full" style={{ width: `${photoVal}%` }} />
                      <input
                        id="slider-photo-priority"
                        type="range"
                        min="0"
                        max="100"
                        value={photoVal}
                        onChange={(e) => setPhotoVal(Number(e.target.value))}
                        className="relative w-full h-5 bg-transparent appearance-none cursor-pointer focus:outline-none z-10 accent-[#ec4899]"
                      />
                    </div>
                  </div>

                </div>
              </div>

            </div>

            {/* RECOMMENDED MATCHING BIKES LIST */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between px-1 mb-0.5">
                <span className="text-[11px] md:text-xs font-black text-muted uppercase tracking-[0.2em]">
                  {dict("matchingBikes")}
                </span>
                <span className="text-xs md:text-sm font-bold text-muted/70 font-mono">
                  {matchedBikesWithScores.length} {language === 'ru' ? 'найдено' : 'found'}
                </span>
              </div>

              <div className="space-y-1.5 pr-1">
                <AnimatePresence mode="popLayout">
                  {matchedBikesWithScores.length > 0 ? (
                    matchedBikesWithScores.map(({ bike, percent }) => {
                      const dailyRateFrom30 = bike.priceMonthly || bike.pricePerDay;
                      
                      return (
                        <motion.div
                          key={`smart-match-${bike.id}`}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          layout
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                          onClick={() => {
                            setSelectedBike(bike);
                            onClose();
                          }}
                          className="group flex items-center justify-between p-2 md:p-2.5 bg-white/[0.02] hover:bg-primary/5 border border-white/5 hover:border-primary/30 rounded-xl cursor-pointer transition-all duration-300"
                        >
                          <div className="flex items-center gap-3">
                            {/* Spec miniature image */}
                            <div className="w-10 h-10 md:w-11 md:h-11 rounded-lg overflow-hidden bg-white/5 shrink-0 border border-white/5">
                              <img 
                                src={bike.image} 
                                alt={bike.name} 
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            
                            <div>
                              <h4 className="text-[13px] md:text-sm font-black text-foreground group-hover:text-primary transition-colors leading-tight">
                                {bike.name}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] md:text-[10px] font-extrabold text-muted bg-white/5 px-2 py-0.5 rounded leading-none whitespace-nowrap">
                                  {bike.engineSize}CC
                                </span>
                                <span className="text-[10px] md:text-xs font-black text-emerald-500 font-mono whitespace-nowrap">
                                  {percent}% {dict("matchRate")}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="text-xs md:text-base font-black text-foreground font-mono leading-none block">
                                {formatPrice(dailyRateFrom30)}
                              </span>
                              <p className="text-[9px] md:text-[10px] text-muted font-bold uppercase tracking-wider leading-none mt-1 font-mono">
                                IDR / {dict("perDay30")}
                              </p>
                            </div>
                            <div className="w-7 h-7 bg-white/5 group-hover:bg-primary group-hover:text-white border border-white/5 group-hover:border-primary/30 flex items-center justify-center text-muted transition-all rounded-lg">
                              <ArrowRight className="w-4 h-4" />
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  ) : (
                    <motion.div
                      key="empty-matches"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-6 text-xs text-muted"
                    >
                      {dict("noBikes")}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

          </div>

          {/* Footer Action */}
          <div className="p-3.5 md:p-5 pt-0 border-t border-white/5 bg-white/[0.01] shrink-0">
            <button
              id="smart-filter-bottom-close"
              onClick={onClose}
              className="w-full h-9 md:h-10 bg-white text-black active:scale-98 hover:opacity-90 rounded-xl font-display font-black text-xs md:text-sm transition-all shadow-md"
            >
              {dict("close")}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
