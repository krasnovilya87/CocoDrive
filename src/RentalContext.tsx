import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { addDays, differenceInDays, startOfToday } from 'date-fns';
import { Bike } from './types';

interface RentalContextType {
  range: { from: Date | undefined; to: Date | undefined };
  days: number;
  setRange: (range: { from: Date | undefined; to: Date | undefined }) => void;
  selectedBike: Bike | null;
  setSelectedBike: (bike: Bike | null) => void;
}

const RentalContext = createContext<RentalContextType | undefined>(undefined);

export const RentalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const tomorrow = addDays(startOfToday(), 1);
  const [range, setRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: tomorrow,
    to: addDays(tomorrow, 29)
  });
  const [days, setDays] = useState(30);
  const [selectedBike, setSelectedBike] = useState<Bike | null>(null);

  useEffect(() => {
    if (range.from && range.to) {
      const diff = differenceInDays(range.to, range.from) + 1;
      setDays(Math.max(diff, 1));
    } else {
      setDays(1);
    }
  }, [range]);

  return (
    <RentalContext.Provider value={{ range, days, setRange, selectedBike, setSelectedBike }}>
      {children}
    </RentalContext.Provider>
  );
};

export const useRental = () => {
  const context = useContext(RentalContext);
  if (context === undefined) {
    throw new Error('useRental must be used within a RentalProvider');
  }
  return context;
};
