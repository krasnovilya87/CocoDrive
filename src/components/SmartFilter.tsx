import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Users, MapPin, Compass, Camera, Sparkles, Check, Heart, ArrowRight } from 'lucide-react';
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
    en: "For whom?",
    ru: "Для кого?",
    id: "Untuk siapa?",
    fr: "Pour qui ?",
    de: "Für wen?"
  },
  person0: {
    en: "any",
    ru: "любой",
    id: "siapa saja",
    fr: "pour tous",
    de: "alle"
  },
  person1: {
    en: "1 person",
    ru: "1 человек",
    id: "1 orang",
    fr: "1 personne",
    de: "1 Person"
  },
  person2: {
    en: "2 people",
    ru: "2 человека",
    id: "2 orang",
    fr: "2 personnes",
    de: "2 Personen"
  },
  whereTo: {
    en: "For what purpose?",
    ru: "Для чего?",
    id: "Untuk apa?",
    fr: "Pour quel usage ?",
    de: "Wofür?"
  },
  cityLabel: {
    en: "City & beaches",
    ru: "City",
    id: "Kota & Pantai",
    fr: "Ville & Plages",
    de: "Stadt & Strände"
  },
  longTripLabel: {
    en: "Long trips",
    ru: "Long Trip",
    id: "Perjalanan Jauh",
    fr: "Longs trajets",
    de: "Langstrecken"
  },
  photoLabel: {
    en: "Aesthetics & photo",
    ru: "Photo",
    id: "Estetika / Pemotretan",
    fr: "Esthétique / Séances photo",
    de: "Ästhetik / Fotoshootings"
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
  outOfRequirements: {
    en: "Out of your requirements",
    ru: "Вне ваших требований",
    id: "Di luar kriteria Anda",
    fr: "Hors de vos exigences",
    de: "Außerhalb Ihrer Anforderungen"
  }
};

export const SmartFilter: React.FC<SmartFilterProps> = ({ isOpen, onClose }) => {
  const { language } = useLanguage();
  const { setSelectedBike } = useRental();
  const [bikes, setBikes] = useState<Bike[]>([]);

  // User slider states
  const [peopleCount, setPeopleCount] = useState<number>(1); // 0 = any, 1 = 1 person (default middle), 2 = 2 people
  const [cityVal, setCityVal] = useState<number>(50);
  const [longVal, setLongVal] = useState<number>(50);
  const [photoVal, setPhotoVal] = useState<number>(50);

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

  const renderLabel = (labelKey: string) => {
    const fullText = dict(labelKey);
    // Remove any leftover parentheses dynamically for absolute safety
    const cleanedText = fullText.replace(/\s*\(.*?\)\s*/g, '').trim();
    const isLongTrip = labelKey === 'longTripLabel';
    
    return (
      <span className={cn(
        "text-xs md:text-sm text-foreground",
        isLongTrip ? "font-bold text-[#111827]" : "font-semibold text-foreground/90"
      )}>
        {cleanedText}
      </span>
    );
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
    if (!bikes || bikes.length === 0) return { fitting: [], nonFitting: [] };

    const BIKE_CHARACTERISTICS: Record<string, { city: number; long: number; photo: number; couple: number }> = {
      'honda-scoopy': { city: 100, long: 10, photo: 95, couple: 40 },
      'yamaha-fazzio': { city: 100, long: 0, photo: 75, couple: 40 },
      'honda-vario-125': { city: 100, long: 20, photo: 40, couple: 50 },
      'honda-vario-160': { city: 100, long: 45, photo: 50, couple: 65 },
      'yamaha-nmax': { city: 95, long: 100, photo: 50, couple: 95 },
      'honda-pcx': { city: 95, long: 100, photo: 60, couple: 95 },
      'yamaha-aerox': { city: 95, long: 50, photo: 50, couple: 60 },
      'vespa-sprint': { city: 100, long: 45, photo: 100, couple: 75 },
      'honda-adv': { city: 90, long: 100, photo: 70, couple: 90 },
      'yamaha-xmax': { city: 75, long: 100, photo: 60, couple: 100 },
    };

    const calculated = bikes.map(bike => {
      const custom = BIKE_CHARACTERISTICS[bike.id];

      // --- SCALE 1: CITY & BEACHES ---
      let bCity = 0;
      if (bike.bestForPercentages && bike.bestForPercentages['City'] !== undefined) {
        bCity = bike.bestForPercentages['City'];
      } else if (custom !== undefined) {
        bCity = custom.city;
      } else {
        bCity = bike.engineSize <= 160 ? 90 : 75;
      }
      if (!bike.hasABS) {
        bCity = Math.max(0, bCity - 2);
      }
      const sCity = (cityVal === 0 || bCity >= cityVal) ? 100 : (bCity / cityVal) * 100;

      // --- SCALE 2: LONG TRIPS ---
      let bLong = 0;
      if (bike.bestForPercentages && bike.bestForPercentages['Long Trip'] !== undefined) {
        bLong = bike.bestForPercentages['Long Trip'];
      } else if (custom !== undefined) {
        bLong = custom.long;
      } else {
        bLong = bike.hasBigTrunk || bike.engineSize >= 250 ? 90 : (bike.engineSize >= 150 ? 80 : (bike.engineSize >= 125 ? 65 : 30));
      }
      if (!bike.hasBigTrunk) {
        bLong = Math.max(0, bLong - 2);
      }
      const sLong = (longVal === 0 || bLong >= longVal) ? 100 : (bLong / longVal) * 100;

      // --- SCALE 3: PHOTO & AESTHETICS ---
      let bPhoto = 0;
      if (bike.bestForPercentages && bike.bestForPercentages['Photo'] !== undefined) {
        bPhoto = bike.bestForPercentages['Photo'];
      } else if (custom !== undefined) {
        bPhoto = custom.photo;
      } else {
        bPhoto = bike.name.toLowerCase().includes('vespa') || bike.name.toLowerCase().includes('scoopy') || bike.name.toLowerCase().includes('filano') ? 90 : 40;
      }
      const sPhoto = (photoVal === 0 || bPhoto >= photoVal) ? 100 : (bPhoto / photoVal) * 100;

      // --- SCALE 4: FOR WHOM / PEOPLE COUNT ---
      let bCouple = 0;
      if (bike.bestForPercentages && (bike.bestForPercentages['couple'] !== undefined || bike.bestForPercentages['Couple'] !== undefined)) {
        bCouple = bike.bestForPercentages['couple'] !== undefined ? bike.bestForPercentages['couple'] : bike.bestForPercentages['Couple'];
      } else if (custom !== undefined) {
        bCouple = custom.couple;
      } else {
        bCouple = bike.engineSize >= 150 ? 90 : (bike.engineSize >= 125 ? 70 : 40);
      }
      const sPeople = peopleCount === 2 ? (100 <= bCouple ? 100 : bCouple) : 100;

      // --- ARITHMETIC MEAN OVER ALL 4 SCALES ---
      const combined = (sCity + sLong + sPhoto + sPeople) / 4;
      const matchPercent = Math.min(100, Math.max(10, Math.round(combined)));

      return {
        bike,
        percent: matchPercent
      };
    });

    const fitting = calculated
      .filter(item => item.percent >= 90)
      .sort((a, b) => b.percent - a.percent);

    const nonFitting = calculated
      .filter(item => item.percent < 90)
      .sort((a, b) => b.percent - a.percent);

    return { fitting, nonFitting };
  }, [bikes, peopleCount, cityVal, longVal, photoVal]);

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
          className="absolute inset-0 bg-black/40 backdrop-blur-md"
        />

        {/* Modal Window Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 30 }}
          className="relative w-full max-w-xl bg-surface rounded-[24px] sm:rounded-[32px] border border-black/10 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col max-h-[92vh] md:max-h-[85vh]"
        >
          {/* Top glowing design element */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-primary/10 blur-[50px] rounded-full pointer-events-none" />

          {/* Header */}
          <div className="relative p-4 md:p-5 border-b border-black/5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                <Sparkles className="w-5 h-5 md:w-5.5 md:h-5.5" />
              </div>
              <div>
                <h3 id="smart-filter-title" className="text-lg md:text-xl font-display font-semibold tracking-tight text-foreground">
                  {dict("title")}
                </h3>
                <p className="text-[11px] md:text-xs text-muted mt-0.5 font-normal">
                  {dict("subtitle")}
                </p>
              </div>
            </div>
            <button 
              id="smart-filter-close-btn"
              onClick={onClose}
              className="p-2 bg-black/5 hover:bg-black/10 rounded-full transition-all border border-black/5 active:scale-90"
            >
              <X className="w-5 h-5 text-muted" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-4 md:p-5 overflow-y-auto custom-scrollbar flex-grow space-y-2.5">
            
            {/* Sliders Area */}
            <div className="space-y-2.5">
              
              {/* PASSENGERS SLIDER */}
              <div className="space-y-1.5 p-2.5 md:p-3 bg-black/[0.015] dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Heart className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
                    <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-foreground font-sans">
                      {dict("peopleLabel")}
                    </span>
                  </div>
                  <span className="text-[9px] md:text-[10px] font-bold text-primary font-sans uppercase tracking-wider">
                    {peopleCount === 2 ? (language === 'ru' ? 'пара' : 'couple') : (language === 'ru' ? 'соло путешественник' : 'solo traveler')}
                  </span>
                </div>
                
                {/* Visual Gradient Bar Container */}
                <div className="relative h-2 md:h-2.5 w-full bg-black/10 dark:bg-white/10 rounded-full flex items-center pr-1">
                  <motion.div 
                    animate={{ width: peopleCount === 2 ? "100%" : "50%" }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="h-full rounded-full bg-gradient-to-r from-primary/40 to-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.2)]"
                  />
                  {/* End Indicator Dot */}
                  <div className="absolute right-1 w-0.5 h-0.5 md:w-1 md:h-1 rounded-full bg-black/20 dark:bg-white/20" />
                  
                  {/* Custom styled slider thumb */}
                  <motion.div 
                    animate={{ left: peopleCount === 2 ? "100%" : "50%" }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="absolute -translate-x-1/2 w-4 h-4 md:w-5 md:h-5 rounded-full bg-background border-2 border-primary shadow-md flex items-center justify-center cursor-pointer pointer-events-none z-10"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  </motion.div>

                  {/* Real transparent range input overlaid over the whole container */}
                  <input
                    id="slider-people-count"
                    type="range"
                    min="1"
                    max="2"
                    step="1"
                    value={peopleCount}
                    onChange={(e) => setPeopleCount(Number(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                  />
                </div>
              </div>

              {/* DESTINATIONS LABELED SLIDERS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-[8px] md:text-[10px] font-black text-muted uppercase tracking-[0.25em]">{dict("whereTo")}</h3>
                  <div className="h-px flex-grow ml-3 bg-border/20" />
                </div>

                <div className="grid grid-cols-1 gap-2">
                  
                  {/* CITY / BEACH SLIDER */}
                  <div className="space-y-1.5 p-2.5 md:p-3 bg-black/[0.015] dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl relative">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className={cn("w-3.5 h-3.5 md:w-4 md:h-4", cityVal > 0 ? "text-primary" : "text-muted")} />
                        <span className={cn("text-[10px] md:text-xs font-bold uppercase tracking-widest font-sans", cityVal > 0 ? "text-foreground" : "text-muted")}>
                          {dict("cityLabel").replace(/\s*\(.*?\)\s*/g, '').trim()}
                        </span>
                      </div>
                      <span className="text-[9px] md:text-[10px] font-bold text-primary font-sans">
                        {cityVal}%
                      </span>
                    </div>
                    
                    {/* Visual Gradient Bar Container */}
                    <div className="relative h-2 md:h-2.5 w-full bg-black/10 dark:bg-white/10 rounded-full flex items-center pr-1">
                      <motion.div 
                        animate={{ width: `${cityVal}%` }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className={cn(
                          "h-full rounded-full bg-gradient-to-r transition-all duration-300",
                          cityVal > 0 
                            ? "from-primary/40 to-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.2)]" 
                            : "from-muted/10 to-muted/20"
                        )}
                      />
                      {/* End Indicator Dot */}
                      <div className="absolute right-1 w-0.5 h-0.5 md:w-1 md:h-1 rounded-full bg-black/20 dark:bg-white/20" />
                      
                      {/* Custom styled slider thumb */}
                      <motion.div 
                        animate={{ left: `${cityVal}%` }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="absolute -translate-x-1/2 w-4 h-4 md:w-5 md:h-5 rounded-full bg-background border-2 border-primary shadow-md flex items-center justify-center cursor-pointer pointer-events-none z-10"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      </motion.div>

                      {/* Real transparent range input overlaid over the whole container */}
                      <input
                        id="slider-city-priority"
                        type="range"
                        min="0"
                        max="100"
                        step="25"
                        value={cityVal}
                        onChange={(e) => setCityVal(Number(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                      />
                    </div>
                  </div>

                  {/* LONG TRIP SLIDER */}
                  <div className="space-y-1.5 p-2.5 md:p-3 bg-black/[0.015] dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl relative">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Compass className={cn("w-3.5 h-3.5 md:w-4 md:h-4", longVal > 0 ? "text-primary" : "text-muted")} />
                        <span className={cn("text-[10px] md:text-xs font-bold uppercase tracking-widest font-sans", longVal > 0 ? "text-foreground" : "text-muted")}>
                          {dict("longTripLabel").replace(/\s*\(.*?\)\s*/g, '').trim()}
                        </span>
                      </div>
                      <span className="text-[9px] md:text-[10px] font-bold text-primary font-sans">
                        {longVal}%
                      </span>
                    </div>
                    
                    {/* Visual Gradient Bar Container */}
                    <div className="relative h-2 md:h-2.5 w-full bg-black/10 dark:bg-white/10 rounded-full flex items-center pr-1">
                      <motion.div 
                        animate={{ width: `${longVal}%` }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className={cn(
                          "h-full rounded-full bg-gradient-to-r transition-all duration-300",
                          longVal > 0 
                            ? "from-primary/40 to-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.2)]" 
                            : "from-muted/10 to-muted/20"
                        )}
                      />
                      {/* End Indicator Dot */}
                      <div className="absolute right-1 w-0.5 h-0.5 md:w-1 md:h-1 rounded-full bg-black/20 dark:bg-white/20" />
                      
                      {/* Custom styled slider thumb */}
                      <motion.div 
                        animate={{ left: `${longVal}%` }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="absolute -translate-x-1/2 w-4 h-4 md:w-5 md:h-5 rounded-full bg-background border-2 border-primary shadow-md flex items-center justify-center cursor-pointer pointer-events-none z-10"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      </motion.div>

                      {/* Real transparent range input overlaid over the whole container */}
                      <input
                        id="slider-longtrip-priority"
                        type="range"
                        min="0"
                        max="100"
                        step="25"
                        value={longVal}
                        onChange={(e) => setLongVal(Number(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                      />
                    </div>
                  </div>

                  {/* PHOTO SLIDER */}
                  <div className="space-y-1.5 p-2.5 md:p-3 bg-black/[0.015] dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl relative">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Camera className={cn("w-3.5 h-3.5 md:w-4 md:h-4", photoVal > 0 ? "text-primary" : "text-muted")} />
                        <span className={cn("text-[10px] md:text-xs font-bold uppercase tracking-widest font-sans", photoVal > 0 ? "text-foreground" : "text-muted")}>
                          {dict("photoLabel").replace(/\s*\(.*?\)\s*/g, '').trim()}
                        </span>
                      </div>
                      <span className="text-[9px] md:text-[10px] font-bold text-primary font-sans">
                        {photoVal}%
                      </span>
                    </div>
                    
                    {/* Visual Gradient Bar Container */}
                    <div className="relative h-2 md:h-2.5 w-full bg-black/10 dark:bg-white/10 rounded-full flex items-center pr-1">
                      <motion.div 
                        animate={{ width: `${photoVal}%` }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className={cn(
                          "h-full rounded-full bg-gradient-to-r transition-all duration-300",
                          photoVal > 0 
                            ? "from-primary/40 to-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.2)]" 
                            : "from-muted/10 to-muted/20"
                        )}
                      />
                      {/* End Indicator Dot */}
                      <div className="absolute right-1 w-0.5 h-0.5 md:w-1 md:h-1 rounded-full bg-black/20 dark:bg-white/20" />
                      
                      {/* Custom styled slider thumb */}
                      <motion.div 
                        animate={{ left: `${photoVal}%` }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="absolute -translate-x-1/2 w-4 h-4 md:w-5 md:h-5 rounded-full bg-background border-2 border-primary shadow-md flex items-center justify-center cursor-pointer pointer-events-none z-10"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      </motion.div>

                      {/* Real transparent range input overlaid over the whole container */}
                      <input
                        id="slider-photo-priority"
                        type="range"
                        min="0"
                        max="100"
                        step="25"
                        value={photoVal}
                        onChange={(e) => setPhotoVal(Number(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                      />
                    </div>
                  </div>

                </div>
              </div>

            </div>

            {/* RECOMMENDED MATCHING BIKES LIST */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between px-1 mb-0.5">
                <span className="text-[10px] md:text-xs font-semibold text-muted tracking-wider">
                  {dict("matchingBikes")}
                </span>
                <span className="text-xs text-muted font-medium">
                  {matchedBikesWithScores.fitting.length} {language === 'ru' ? 'найдено' : 'found'}
                </span>
              </div>

              <div className="space-y-1.5 pr-1">
                {matchedBikesWithScores.fitting.length > 0 || matchedBikesWithScores.nonFitting.length > 0 ? (
                  <>
                      {/* Fitting Bikes */}
                      {matchedBikesWithScores.fitting.map(({ bike, percent }) => {
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
                            className="group flex items-center justify-between p-2 md:p-2.5 bg-black/[0.01] hover:bg-primary/5 border border-black/5 hover:border-primary/20 rounded-xl cursor-pointer transition-all duration-300"
                          >
                            <div className="flex items-center gap-3">
                              {/* Spec miniature image */}
                              <div className="w-10 h-10 md:w-11 md:h-11 rounded-lg overflow-hidden bg-black/5 shrink-0 border border-black/5">
                                <img 
                                  src={(bike.images && bike.images.length > 0) ? bike.images[0] : bike.image} 
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&q=80&w=800";
                                  }}
                                  alt={bike.name} 
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                              
                              <div>
                                <h4 className="text-[13px] md:text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
                                  {bike.name}
                                </h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] md:text-xs font-semibold text-emerald-600 font-mono whitespace-nowrap">
                                    {percent}% {dict("matchRate")}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <span className="text-xs md:text-sm font-semibold text-foreground font-mono leading-none block">
                                  {formatPrice(dailyRateFrom30)} Rp
                                </span>
                              </div>
                              <div className="w-7 h-7 bg-black/5 group-hover:bg-primary group-hover:text-white border border-black/5 group-hover:border-primary/20 flex items-center justify-center text-muted group-hover:text-white transition-all rounded-lg">
                                <ArrowRight className="w-4 h-4" />
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}

                      {/* Double Line Divider */}
                      {matchedBikesWithScores.nonFitting.length > 0 && (
                        <div className="flex flex-col gap-[3px] py-1.5 px-0.5 select-none opacity-40">
                          <div className="w-full border-t border-dashed border-black/15 dark:border-white/15" />
                          <div className="w-full border-t border-dashed border-black/15 dark:border-white/15" />
                        </div>
                      )}

                      {/* Non-fitting Bikes */}
                      {matchedBikesWithScores.nonFitting.map(({ bike, percent }) => {
                        const dailyRateFrom30 = bike.priceMonthly || bike.pricePerDay;
                        
                        return (
                          <motion.div
                            key={`smart-match-non-${bike.id}`}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            layout
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            onClick={() => {
                              setSelectedBike(bike);
                              onClose();
                            }}
                            className="group flex items-center justify-between p-2 md:p-2.5 bg-black/[0.005]/5 dark:bg-white/[0.005]/5 hover:bg-primary/5 border border-black/[0.02]/5 hover:border-primary/20 rounded-xl cursor-pointer transition-all duration-300 opacity-60 hover:opacity-100"
                          >
                            <div className="flex items-center gap-3">
                              {/* Spec miniature image with grayscale overlay classes */}
                              <div className="w-10 h-10 md:w-11 md:h-11 rounded-lg overflow-hidden bg-black/5 shrink-0 border border-black/5 opacity-80 group-hover:opacity-100">
                                <img 
                                  src={(bike.images && bike.images.length > 0) ? bike.images[0] : bike.image} 
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&q=80&w=800";
                                  }}
                                  alt={bike.name} 
                                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-transform duration-500"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                              
                              <div>
                                <h4 className="text-[13px] md:text-sm font-semibold text-muted-foreground group-hover:text-primary transition-colors leading-tight">
                                  {bike.name}
                                </h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] md:text-xs font-semibold text-muted-foreground/80 font-mono whitespace-nowrap">
                                    {percent}% {dict("matchRate")}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <span className="text-xs md:text-sm font-semibold text-muted-foreground/80 font-mono leading-none block">
                                  {formatPrice(dailyRateFrom30)} Rp
                                </span>
                              </div>
                              <div className="w-7 h-7 bg-black/5 group-hover:bg-primary group-hover:text-white border border-black/5 group-hover:border-primary/20 flex items-center justify-center text-muted group-hover:text-white transition-all rounded-lg">
                                <ArrowRight className="w-4 h-4" />
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </>
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
              </div>
            </div>

          </div>

          {/* Footer Action */}
          <div className="p-3.5 md:p-5 pt-0 border-t border-black/5 bg-black/[0.015] shrink-0">
            <button
              id="smart-filter-bottom-close"
              onClick={onClose}
              className="w-full h-9 md:h-10 bg-[#111827] text-white hover:bg-[#1f2937] active:scale-98 rounded-xl font-display font-semibold text-xs md:text-sm transition-all shadow-md"
            >
              {dict("close")}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
