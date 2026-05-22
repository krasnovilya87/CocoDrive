import React from 'react';
import { Bike } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../LanguageContext';
import { useRental } from '../RentalContext';
import { IDR_TO_USD } from '../constants';
import { formatPrice } from '../lib/utils';

interface BikeCardProps {
  bike: Bike;
}

export const BikeCard: React.FC<BikeCardProps> = ({ bike }) => {
  const { t } = useLanguage();
  const { days, setSelectedBike } = useRental();

  const getPrice = (bike: any) => {
    // Show only the lowest (monthly) rate on the catalog
    return bike.priceMonthly || bike.pricePerDay;
  };

  const currentPrice = getPrice(bike);
  const getUSD = (price: number) => {
    return `~$${Math.round(price / IDR_TO_USD)}`;
  };

  return (
    <>
      <motion.div
        whileHover={{ y: -8 }}
        onClick={() => setSelectedBike(bike)}
        className="group bg-surface rounded-2xl md:rounded-3xl overflow-hidden border border-border hover:border-primary/50 transition-all flex flex-col cursor-pointer"
      >
        <div className="relative aspect-square md:aspect-[4/3] overflow-hidden">
          <img
            src={(bike.images && bike.images.length > 0) ? bike.images[0] : bike.image}
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&q=80&w=800";
            }}
            alt={bike.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="p-3 md:p-6 flex-grow flex-col">
          <h3 className="text-base md:text-2xl font-display font-bold mb-1 md:mb-2 group-hover:text-primary transition-colors line-clamp-1">
            {bike.name}
          </h3>

          <div className="mt-auto pt-1.5 md:pt-3 border-t border-border flex items-center justify-between">
            <div className="flex flex-col text-foreground leading-tight">
              <div className="flex flex-col md:flex-row md:items-center gap-0 md:gap-2">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentPrice}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex flex-col w-full overflow-hidden"
                  >
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[17px] sm:text-lg md:text-[26px] font-display font-black whitespace-nowrap text-foreground flex items-baseline gap-1">
                        {formatPrice(currentPrice)}
                        <span className="text-[10px] md:text-sm text-muted font-normal uppercase">IDR</span>
                      </span>
                      <span className="text-[11px] md:text-sm text-muted font-medium opacity-70 whitespace-nowrap">
                        {getUSD(currentPrice)}
                      </span>
                    </div>
                    {currentPrice < bike.pricePerDay && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] md:text-sm text-muted line-through decoration-muted/50 opacity-60">
                          {formatPrice(bike.pricePerDay)}
                        </span>
                        <span className="text-[11px] md:text-sm font-black text-red-500">
                          -{Math.round((1 - currentPrice / bike.pricePerDay) * 100)}%
                        </span>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};
