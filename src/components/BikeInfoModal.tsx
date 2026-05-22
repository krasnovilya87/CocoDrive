import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Info, Zap, ShieldCheck, Briefcase, MapPin, Compass, Camera, Smartphone, Usb, Heart } from 'lucide-react';
import { Bike } from '../types';
import { cn } from '../lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';

interface BikeInfoModalProps {
  bike: Bike;
  isOpen: boolean;
  onClose: () => void;
}

const BEST_FOR_CATEGORIES = [
  { id: 'City', label: 'City', icon: MapPin },
  { id: 'Long Trip', label: 'Long Trip', icon: Compass },
  { id: 'Photo', label: 'Photo', icon: Camera },
  { id: 'Couple', label: 'Best for Couple', icon: Heart },
];

export const BikeInfoModal: React.FC<BikeInfoModalProps> = ({ bike, isOpen, onClose }) => {
  // Lock body scroll when component is mounted and open
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

  if (!isOpen) return null;

  // Prepare data for the Best For assessment
  const assessmentData = BEST_FOR_CATEGORIES.map(cat => {
    let percentage = 50;
    let isActive = false;
    
    if (bike.bestForPercentages && bike.bestForPercentages[cat.id] !== undefined) {
      percentage = bike.bestForPercentages[cat.id];
      isActive = percentage > 0;
    } else {
      isActive = bike.bestFor?.includes(cat.id) || false;
      // Fallback: legacy bikes
      percentage = isActive ? 100 : (cat.id === 'Couple' ? 50 : 0);
    }
    
    return {
      ...cat,
      percentage,
      isActive
    };
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-xl"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 30 }}
          className="relative w-full max-w-lg bg-surface/90 backdrop-blur-3xl rounded-[32px] md:rounded-[40px] border border-white/10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header with Background Accent */}
          <div className="relative overflow-hidden shrink-0">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[80px] -mr-32 -mt-32 rounded-full" />
            
            <div className="relative p-5 md:p-8 pb-3 md:pb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white shadow-lg shadow-primary/30">
                  <Info className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div>
                  <h2 className="text-lg md:text-2xl font-display font-black tracking-tight text-foreground">
                    {bike.name}
                  </h2>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/5 active:scale-90"
              >
                <X className="w-4 h-4 md:w-5 md:h-5 text-muted" />
              </button>
            </div>
          </div>

          <div className="p-4 md:p-6 pt-0 overflow-y-auto custom-scrollbar flex-grow space-y-4 md:space-y-5">
            {/* Specifications Row */}
            <section className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-[10px] md:text-xs font-black text-muted/60 uppercase tracking-[0.25em]"></h3>
                <div className="h-px flex-grow bg-border/20" />
              </div>
              
              <div className="flex justify-between items-start px-1 gap-1">
                {/* Engine */}
                <div className="flex flex-col items-center gap-2 flex-1 max-w-[64px]">
                  <div className="w-11 h-11 md:w-14 md:h-14 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-center justify-center text-yellow-500 shadow-sm transition-transform hover:scale-105">
                    <Zap className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <div className="text-center space-y-0.5">
                    <div className="text-[10px] md:text-[11px] font-black text-foreground uppercase tracking-tight leading-none">{bike.engineSize}CC</div>
                    <div className="text-[7px] md:text-[8px] font-extrabold text-muted uppercase tracking-wider opacity-60">Engine</div>
                  </div>
                </div>

                {/* ABS */}
                <div className={cn(
                  "flex flex-col items-center gap-2 flex-1 max-w-[64px] transition-all",
                  !bike.hasABS && "opacity-20 grayscale"
                )}>
                  <div className="w-11 h-11 md:w-14 md:h-14 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center justify-center text-green-500 shadow-sm transition-transform hover:scale-105">
                    <ShieldCheck className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <div className="text-center space-y-0.5">
                    <div className="text-[10px] md:text-[11px] font-black text-foreground uppercase tracking-tight leading-none">Safety</div>
                    <div className="text-[7px] md:text-[8px] font-extrabold text-muted uppercase tracking-wider opacity-60">ABS</div>
                  </div>
                </div>

                {/* Trunk */}
                <div className={cn(
                  "flex flex-col items-center gap-2 flex-1 max-w-[64px] transition-all",
                  !bike.hasBigTrunk && "opacity-20 grayscale"
                )}>
                  <div className="w-11 h-11 md:w-14 md:h-14 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center text-blue-500 shadow-sm transition-transform hover:scale-105">
                    <Briefcase className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <div className="text-center space-y-0.5">
                    <div className="text-[10px] md:text-[11px] font-black text-foreground uppercase tracking-tight leading-none">Big</div>
                    <div className="text-[7px] md:text-[8px] font-extrabold text-muted uppercase tracking-wider opacity-60">Trunk</div>
                  </div>
                </div>

                {/* Holder */}
                <div className="flex flex-col items-center gap-2 flex-1 max-w-[64px]">
                  <div className="w-11 h-11 md:w-14 md:h-14 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-center justify-center text-orange-500 shadow-sm transition-transform hover:scale-105">
                    <Smartphone className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <div className="text-center space-y-0.5">
                    <div className="text-[10px] md:text-[11px] font-black text-foreground uppercase tracking-tight leading-none">Phone</div>
                    <div className="text-[7px] md:text-[8px] font-extrabold text-muted uppercase tracking-wider opacity-60">Holder</div>
                  </div>
                </div>

                {/* USB */}
                <div className="flex flex-col items-center gap-2 flex-1 max-w-[64px]">
                  <div className="w-11 h-11 md:w-14 md:h-14 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-center justify-center text-cyan-500 shadow-sm transition-transform hover:scale-105">
                    <Usb className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <div className="text-center space-y-0.5">
                    <div className="text-[10px] md:text-[11px] font-black text-foreground uppercase tracking-tight leading-none">USB</div>
                    <div className="text-[7px] md:text-[8px] font-extrabold text-muted uppercase tracking-wider opacity-60">Port</div>
                  </div>
                </div>
              </div>
            </section>

            {/* Best for Section */}
            <section className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-[8px] md:text-[10px] font-black text-muted uppercase tracking-[0.25em]">Best for</h3>
                <div className="h-px flex-grow ml-3 bg-border/20" />
              </div>
              
              <div className="grid grid-cols-1 gap-2.5 px-1">
                {assessmentData.map((item) => (
                  <div key={item.id} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <item.icon className={cn("w-3 h-3 md:w-3.5 md:h-3.5", item.isActive ? "text-primary" : "text-muted")} />
                        <span className={cn("text-[8px] md:text-[10px] font-bold uppercase tracking-widest", item.isActive ? "text-foreground" : "text-muted")}>
                          {item.label}
                        </span>
                      </div>
                      {item.isActive && item.id !== 'Couple' && (
                        <span className="text-[9px] md:text-[10px] font-bold text-primary font-sans">
                          {item.percentage}%
                        </span>
                      )}
                      {item.id === 'Couple' && (
                        <span className="text-[9px] md:text-[10px] font-bold text-primary font-sans uppercase tracking-wider">
                          {item.percentage === 100 ? 'couple' : 'solo traveler'}
                        </span>
                      )}
                    </div>
                    {/* Gradient Bar Container */}
                    <div className="relative h-1.5 md:h-2 w-full bg-white/5 rounded-full flex items-center pr-1">
                      <motion.div 
                        initial={{ width: "50%" }}
                        animate={{ width: `${item.percentage}%` }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className={cn(
                          "h-full rounded-full bg-gradient-to-r transition-all duration-500",
                          item.isActive 
                            ? "from-primary/40 to-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.2)]" 
                            : "from-muted/10 to-muted/20"
                        )}
                      />
                      {/* End Indicator Dot */}
                      <div className="absolute right-1 w-0.5 h-0.5 md:w-1 md:h-1 rounded-full bg-white/20" />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* About the Bike */}
            {bike.description && (
              <section className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-[8px] md:text-[10px] font-black text-muted uppercase tracking-[0.25em]">Description</h3>
                  <div className="h-px flex-grow ml-3 bg-border/10" />
                </div>
                
                <div className="relative p-3 md:p-4 bg-white/5 border border-white/5 rounded-xl">
                  <p className="text-muted leading-tight text-[10px] md:text-[12px] font-medium line-clamp-2">
                    {bike.description}
                  </p>
                </div>
              </section>
            )}
            
            <div className="h-1 shrink-0" />
          </div>

          {/* Bottom Action */}
          <div className="p-4 md:p-6 pt-0 shrink-0">
            <button 
              onClick={onClose}
              className="w-full h-10 md:h-12 bg-white text-black rounded-xl font-display font-black text-xs md:text-sm hover:scale-[1.01] active:scale-[0.98] transition-all"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
