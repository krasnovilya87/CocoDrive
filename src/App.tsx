/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Catalog } from './components/Catalog';
import { Footer } from './components/Footer';
import { QuickContact } from './components/QuickContact';
import { Advantages } from './components/Advantages';
import { LanguageProvider } from './LanguageContext';
import { RentalProvider, useRental } from './RentalContext';
import { BookingDetails } from './components/BookingDetails';
import { AnimatePresence } from 'motion/react';
import { doc, getDocFromServer } from 'firebase/firestore';
import { db } from './lib/firebase';
import { AdminPanel } from './components/AdminPanel';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { TermsOfService } from './components/TermsOfService';
import { FAQ } from './components/FAQ';
import { getLatestExchangeRates, updateExchangeRates } from './services/dataService';
import { seedBikes } from './services/seedService';
import { APIProvider } from '@vis.gl/react-google-maps';

import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { DataDeletion } from './components/DataDeletion';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

const AppContent = () => {
  const { selectedBike, setSelectedBike } = useRental();
  const [showAdmin, setShowAdmin] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const location = useLocation();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    // Seed exchange rates if missing from Firebase
    const seedRates = async () => {
      try {
        const existing = await getLatestExchangeRates();
        if (!existing) {
          const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
          const data = await res.json();
          await updateExchangeRates({
            rates: {
              USD: data.rates.USD,
              IDR: data.rates.IDR,
              RUB: data.rates.RUB
            },
            timestamp: Date.now(),
            markupusdt: 0.05,
            markuprub: 0.05
          });
          console.log('Successfully seeded initial exchange rates to Firebase');
        }
      } catch (err) {
        console.error('Error seeding exchange rates:', err);
      }
    };
    seedRates();

    const autoSeedBikes = async () => {
      try {
        const isSynced = localStorage.getItem('bikes_price_synced_may_2026_v4_unique_images');
        if (isSynced !== 'true') {
          console.log('[autoSeed] New beautiful bike images detected. Seeding new attribute constants to Firestore...');
          await seedBikes();
          localStorage.setItem('bikes_price_synced_may_2026_v4_unique_images', 'true');
          console.log('[autoSeed] New attribute constants successfully synced to Firestore!');
        }
      } catch (err) {
        console.error('Error auto seeding bikes:', err);
      }
    };
    autoSeedBikes();

    async function testConnection() {
      try {
        // Use a dummy doc to test firestore connection
        await getDocFromServer(doc(db, 'test', 'connection'));
        setConnectionError(null);
      } catch (error: any) {
        const isPermissionError = 
          error?.code === 'permission-denied' || 
          error?.message?.toLowerCase().includes('permission') ||
          error?.toString()?.toLowerCase().includes('permission');

        if (isPermissionError) {
          // This actually means connection IS working but we just don't have access to this specific test doc
          setConnectionError(null);
          return;
        }
        console.error("Firestore connection failed:", error);
        setConnectionError(error.message || "Failed to connect to Firebase");
      }
    }
    testConnection();
  }, []);

  return (
    <div className="min-h-screen bg-background selection:bg-primary selection:text-white">
      {connectionError && (
        <div className="fixed top-0 left-0 right-0 z-[600] bg-red-500 text-white text-center py-2 text-xs font-bold animate-pulse">
          Firebase Connection Error: {connectionError}. Please check your configuration.
        </div>
      )}
      
      <Routes>
        <Route path="/" element={
          <>
            <Navbar />
            <main>
              <Hero />
              <Advantages />
              <Catalog />
            </main>
            <QuickContact />
            <Footer 
              onAdminClick={() => setShowAdmin(true)} 
            />

            <AdminPanel isOpen={showAdmin} onClose={() => setShowAdmin(false)} />

            <AnimatePresence>
              {selectedBike && (
                <BookingDetails 
                  bike={selectedBike} 
                  onClose={() => setSelectedBike(null)} 
                />
              )}
            </AnimatePresence>
          </>
        } />
        
        <Route path="/faq" element={<FAQ isOpen={true} onClose={() => window.history.back()} />} />
      </Routes>
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <APIProvider apiKey={API_KEY} version="weekly" libraries={['places']}>
        <LanguageProvider>
          <RentalProvider>
            <AppContent />
          </RentalProvider>
        </LanguageProvider>
      </APIProvider>
    </Router>
  );
}


