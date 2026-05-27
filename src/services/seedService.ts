import { collection, getDocs, setDoc, doc, serverTimestamp, writeBatch, query, deleteField } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BIKES } from '../constants';
import { Bike } from '../types';

export const seedBikes = async () => {
  try {
    const bikesRef = collection(db, 'bikes');
    
    // Create a batch for efficiency
    const batch = writeBatch(db);
    
    console.log('Starting sync of bikes from constants.ts...');
    
    // Fetch currently existing bikes in DB to clear removed ones
    const snapshot = await getDocs(bikesRef);
    const constantBikeIds = new Set(BIKES.map(b => b.id));
    
    snapshot.docs.forEach(docSnap => {
      if (!constantBikeIds.has(docSnap.id)) {
        console.log(`Deleting obsolete bike from Firestore: ${docSnap.id}`);
        batch.delete(docSnap.ref);
      }
    });
    
    // Add or update bikes from BIKES constant
    BIKES.forEach((bike, index) => {
      const bikeRef = doc(db, 'bikes', bike.id);
      console.log(`Syncing ${bike.name}: ${bike.pricePerDay}/${bike.priceWeekly}/${bike.priceMonthly}`);
      
      batch.set(bikeRef, {
        ...bike,
        bestFor: deleteField(),
        order: index,
        updatedAt: serverTimestamp()
      }, { merge: true }); // Use merge to avoid overwriting fields added via UI (like custom generalPhotos)
    });
    
    await batch.commit();
    console.log('Database synced successfully!');
    return true;
  } catch (error) {
    console.error('Error syncing database:', error);
    throw error;
  }
};
