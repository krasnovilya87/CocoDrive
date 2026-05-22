import React from 'react';
import { motion } from 'motion/react';
import { MapPin, Shield, Zap, ChevronDown } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import heroBg from '../assets/images/hero_background_1779454610068.png';

export const Hero = () => {
  const { language } = useLanguage();

  const text = {
    en: {
      brandTag: "Bali Ride Adventure",
      slogan: "Explore Bali with your own vibe",
      subtext: "Easy booking. The best price. Free delivery",
      button: "Choose your vibe"
    },
    ru: {
      brandTag: "Приключения на Бали",
      slogan: "Исследуй Бали на своей волне",
      subtext: "Простое бронирование. Лучшая цена. Бесплатная доставка",
      button: "Выбрать свой вайб"
    },
    id: {
      brandTag: "Petualangan Berkendara Bali",
      slogan: "Jelajahi Bali dengan vibe Anda sendiri",
      subtext: "Pemesanan mudah. Harga terbaik. Pengantaran gratis",
      button: "Pilih vibe Anda"
    },
    fr: {
      brandTag: "Aventure à Moto à Bali",
      slogan: "Explorez Bali avec votre propre style",
      subtext: "Réservation facile. Meilleur prix. Livraison gratuite",
      button: "Choisissez votre style"
    },
    de: {
      brandTag: "Bali Motorrad Abenteuer",
      slogan: "Erkunde Bali mit deinem eigenen Vibe",
      subtext: "Einfache Buchung. Bester Preis. Kostenlose Lieferung",
      button: "Wähle deinen Vibe"
    }
  };

  // Safe fallback to 'en'
  const current = text[language as keyof typeof text] || text.en;

  const handleScrollToCatalog = () => {
    const element = document.getElementById('catalog');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative h-[85vh] sm:h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroBg}
          onError={(e) => {
            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80&w=1600";
          }}
          alt="Explore Bali on a scooter"
          className="w-full h-full object-cover scale-105 animate-subtle-zoom"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/45 to-black/90" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center mt-[-40px] sm:mt-0">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center"
        >
          {/* Accent decoration */}
          <div className="mb-4 px-3 py-1 bg-primary/20 backdrop-blur-md rounded-full border border-primary/30">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-primary">
              {current.brandTag}
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-manrope font-black leading-[1.1] mb-6 uppercase tracking-tight text-white drop-shadow-sm max-w-4xl">
            {current.slogan}
          </h1>
          
          <p className="text-base sm:text-xl text-white/90 max-w-2xl mb-12 font-medium tracking-wide leading-relaxed bg-black/10 backdrop-blur-[2px] py-2 px-4 rounded-xl inline-block">
            {current.subtext}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto items-center justify-center">
            <button 
              onClick={handleScrollToCatalog}
              className="bg-primary text-white text-sm sm:text-base px-10 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-orange-600 hover:shadow-xl hover:shadow-primary/30 transition-all border-none transform hover:-translate-y-1 cursor-pointer active:scale-95"
            >
              {current.button}
            </button>
          </div>
        </motion.div>
      </div>

      {/* Decorative arrow pointing to catalog */}
      <motion.button
        onClick={handleScrollToCatalog}
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-60 hover:opacity-100 transition-opacity flex flex-col items-center gap-1 cursor-pointer"
      >
        <span className="text-[10px] font-bold text-white/60 tracking-widest uppercase">
          {language === 'ru' ? 'Каталог' : language === 'fr' ? 'Catalogue' : 'Catalog'}
        </span>
        <ChevronDown className="w-5 h-5 text-white" />
      </motion.button>
    </section>
  );
};


