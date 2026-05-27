import { collection, getDocs, addDoc, setDoc, doc, updateDoc, deleteDoc, writeBatch, serverTimestamp, query, orderBy, getDocsFromServer, onSnapshot, deleteField } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../lib/firebase';
import { Bike, ColorReference, Owner, BikeListing, AdminContacts, PromoCode } from '../types';
import { BIKES } from '../constants';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error Details:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const subscribeToBikes = (callback: (bikes: Bike[]) => void) => {
  const bikesRef = collection(db, 'bikes');
  const q = query(bikesRef, orderBy('order', 'asc'));
  
  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      callback([]);
      return;
    }
    const bikes = snapshot.docs.map(doc => ({
      ...doc.data() as Bike,
      id: doc.id
    }));
    callback(bikes);
  }, (error) => {
    console.error("Error in bikes subscription:", error);
  });
};

export const getBikes = async (): Promise<Bike[]> => {
  console.log('Fetching bikes from Firestore...');
  try {
    const bikesRef = collection(db, 'bikes');
    // Primary query with order
    const q = query(bikesRef, orderBy('order', 'asc'));
    let snapshot = await getDocsFromServer(q);
    
    // If we have no bikes with 'order', try getting ALL bikes as fallback
    if (snapshot.empty) {
      console.log('No bikes found with "order" field, trying fallback fetch...');
      snapshot = await getDocsFromServer(bikesRef);
    }
    
    console.log(`Fetched ${snapshot.docs.length} bikes from database.`);
    
    return snapshot.docs.map(doc => ({
      ...doc.data() as Bike,
      id: doc.id
    }));
  } catch (error) {
    console.error('CRITICAL: Error fetching bikes:', error);
    handleFirestoreError(error, OperationType.LIST, 'bikes');
    return BIKES; 
  }
};

export const updateBike = async (id: string, bikeData: Partial<Bike>) => {
  console.log(`[dataService] Attempting STRICT UPDATE for bike ID: ${id}`);
  console.log(`[dataService] Data:`, bikeData);
  try {
    if (!id) throw new Error("Document ID is required for updateBike");
    
    const bikeRef = doc(db, 'bikes', id);
    
    const { bestFor, ...cleanData } = bikeData as any;
    
    // Using updateDoc instead of setDoc to ensure document exists
    await updateDoc(bikeRef, {
      ...cleanData,
      bestFor: deleteField(),
      updatedAt: serverTimestamp()
    });
    
    console.log(`[dataService] Successfully updated bike ${id}`);
  } catch (error: any) {
    console.error('[dataService] updateBike failed:', error);
    
    // If updateDoc failed because document doesn't exist, we might want to try setDoc or log it clearly
    if (error.code === 'not-found') {
      console.error(`[dataService] Document bikes/${id} NOT FOUND. Cannot update.`);
    }
    
    handleFirestoreError(error, OperationType.UPDATE, `bikes/${id}`);
  }
};

export const deleteBike = async (id: string) => {
  console.log('--- START DELETE BIKE PROCESS ---');
  if (!id) {
    console.error('[Error]: No ID provided for deletion');
    return;
  }
  
  console.log('ID на удаление (from service):', id);
  try {
    const bikeRef = doc(db, 'bikes', id);
    console.log(`Sending deleteDoc request for path: bikes/${id}`);
    
    // Explicitly await the deletion
    await deleteDoc(bikeRef);
    
    console.log(`Firestore confirmed deletion request for ID: ${id}`);
    console.log('--- END DELETE BIKE PROCESS SUCCESS ---');
  } catch (error) {
    console.error('Critical failure in deleteBike:');
    handleFirestoreError(error, OperationType.DELETE, `bikes/${id}`);
  }
};

export const updateBikesOrder = async (bikes: Bike[]) => {
  console.log('Updating bikes order in Firestore...');
  try {
    const batch = writeBatch(db);
    bikes.forEach((bike, index) => {
      const bikeRef = doc(db, 'bikes', bike.id);
      batch.set(bikeRef, { order: index, updatedAt: serverTimestamp() }, { merge: true });
    });
    await batch.commit();
    console.log('Bikes order updated successfully.');
  } catch (error) {
    console.error('Error updating bikes order:', error);
    handleFirestoreError(error, OperationType.UPDATE, 'bikes/order');
  }
};

export const migrateEngineSizes = async () => {
  console.log('[dataService] Starting engineSize migration...');
  try {
    const bikesRef = collection(db, 'bikes');
    const snapshot = await getDocs(bikesRef);
    const batch = writeBatch(db);
    let count = 0;

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (typeof data.engineSize === 'string') {
        const numericValue = Number(data.engineSize.replace(/\D/g, ''));
        if (!isNaN(numericValue)) {
          batch.update(doc.ref, { 
            engineSize: numericValue,
            updatedAt: serverTimestamp() 
          });
          count++;
        }
      }
    });

    if (count > 0) {
      await batch.commit();
      console.log(`[dataService] Migrated ${count} bikes.`);
    } else {
      console.log('[dataService] No bikes needed migration.');
    }
    return count;
  } catch (error) {
    console.error('[dataService] Migration failed:', error);
    throw error;
  }
};

export const getColors = async (): Promise<ColorReference[]> => {
  try {
    const colorsRef = collection(db, 'colors');
    const q = query(colorsRef, orderBy('displayName'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ColorReference[];
  } catch (error) {
    console.error('Error fetching colors:', error);
    return [];
  }
};

export const addColor = async (color: ColorReference) => {
  try {
    const colorRef = doc(db, 'colors', color.id);
    await setDoc(colorRef, {
      displayName: color.displayName,
      hexCode: color.hexCode,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error adding color:', error);
    throw error;
  }
};

export const addBike = async (bikeData: Omit<Bike, 'id'>) => {
  try {
    const bikesRef = collection(db, 'bikes');
    // Get highest order to append
    const q = query(bikesRef, orderBy('order', 'desc'));
    const snapshot = await getDocs(q);
    const lastOrder = snapshot.empty ? -1 : (snapshot.docs[0].data() as any).order ?? -1;

    const { bestFor, ...cleanData } = bikeData as any;

    const docRef = await addDoc(bikesRef, {
      ...cleanData,
      bestFor: deleteField(),
      order: lastOrder + 1,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding bike:', error);
    handleFirestoreError(error, OperationType.CREATE, 'bikes');
  }
};

export const uploadFile = async (file: File, folder: string = 'bikes'): Promise<string> => {
  const fileRef = ref(storage, `${folder}/${Date.now()}_${file.name}`);
  const snapshot = await uploadBytes(fileRef, file);
  return getDownloadURL(snapshot.ref);
};

export const getBookings = async () => {
  try {
    const bookingsRef = collection(db, 'bookings');
    const q = query(bookingsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching bookings:', error);
    throw error;
  }
};

export const getOwners = async (): Promise<Owner[]> => {
  try {
    const ownersRef = collection(db, 'owners');
    const q = query(ownersRef, orderBy('name'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Owner));
  } catch (error) {
    console.error('Error fetching owners:', error);
    return [];
  }
};

export const addOwner = async (ownerData: Omit<Owner, 'id'>) => {
  try {
    const ownersRef = collection(db, 'owners');
    const docRef = await addDoc(ownersRef, {
      ...ownerData,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding owner:', error);
    throw error;
  }
};

export const updateOwner = async (id: string, ownerData: Partial<Owner>) => {
  try {
    const ownerRef = doc(db, 'owners', id);
    await updateDoc(ownerRef, {
      ...ownerData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating owner:', error);
    handleFirestoreError(error, OperationType.UPDATE, `owners/${id}`);
  }
};

export const deleteOwner = async (id: string) => {
  try {
    const ownerRef = doc(db, 'owners', id);
    await deleteDoc(ownerRef);
  } catch (error) {
    console.error('Error deleting owner:', error);
    handleFirestoreError(error, OperationType.DELETE, `owners/${id}`);
  }
};

export const getBikeListings = async (): Promise<BikeListing[]> => {
  try {
    const listingsRef = collection(db, 'bike_listings');
    const q = query(listingsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BikeListing));
  } catch (error) {
    console.error('Error fetching bike listings:', error);
    return [];
  }
};

export const addBikeListing = async (listingData: Omit<BikeListing, 'id' | 'createdAt'>) => {
  try {
    const listingsRef = collection(db, 'bike_listings');
    const docRef = await addDoc(listingsRef, {
      ...listingData,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding bike listing:', error);
    throw error;
  }
};

export const updateBikeListing = async (id: string, listingData: Partial<BikeListing>) => {
  try {
    const listingRef = doc(db, 'bike_listings', id);
    await updateDoc(listingRef, {
      ...listingData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating bike listing:', error);
    handleFirestoreError(error, OperationType.UPDATE, `bike_listings/${id}`);
  }
};

export const deleteBikeListing = async (id: string) => {
  try {
    const listingRef = doc(db, 'bike_listings', id);
    await deleteDoc(listingRef);
  } catch (error) {
    console.error('Error deleting bike listing:', error);
    handleFirestoreError(error, OperationType.DELETE, `bike_listings/${id}`);
  }
};

export const updateListingStatus = async (listingId: string, status: BikeListing['status']) => {
  try {
    const listingRef = doc(db, 'bike_listings', listingId);
    await updateDoc(listingRef, { status });
  } catch (error) {
    console.error('Error updating listing status:', error);
    throw error;
  }
};

export const updateBookingPayment = async (bookingId: string, paymentData: { paymentMethod?: string, paymentStatus?: string, ownerSettlementStatus?: string }) => {
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    await updateDoc(bookingRef, { 
      ...paymentData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating booking payment:', error);
    handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}`);
  }
};

export const updateBookingStatus = async (bookingId: string, status: string) => {
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    await updateDoc(bookingRef, { 
      status,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating booking status:', error);
    handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}`);
  }
};

export const updateBooking = async (bookingId: string, data: any) => {
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    await updateDoc(bookingRef, { 
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating booking:', error);
    handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}`);
  }
};

export const getAdminContacts = async (): Promise<AdminContacts> => {
  try {
    const contactsRef = collection(db, 'admin_contacts');
    const snapshot = await getDocs(contactsRef);
    if (snapshot.empty) {
      // Default initial data
      return {
        phone: '+62 812 3456 7890',
        whatsapp: '+62 812 3456 7890',
        telegram: 'balibikerental',
        instagram: 'balibikerental',
        email: 'info@balibikerental.com'
      };
    }
    return snapshot.docs[0].data() as AdminContacts;
  } catch (error) {
    console.error('Error fetching admin contacts:', error);
    return {
      phone: '',
      whatsapp: '',
      telegram: '',
      instagram: '',
      email: ''
    };
  }
};

export const updateAdminContacts = async (contacts: AdminContacts) => {
  try {
    const contactsRef = collection(db, 'admin_contacts');
    const snapshot = await getDocs(contactsRef);
    
    if (snapshot.empty) {
      await addDoc(contactsRef, {
        ...contacts,
        updatedAt: serverTimestamp()
      });
    } else {
      const docRef = doc(db, 'admin_contacts', snapshot.docs[0].id);
      await setDoc(docRef, {
        ...contacts,
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error updating admin contacts:', error);
    handleFirestoreError(error, OperationType.WRITE, 'admin_contacts');
  }
};

export const getPromoCodes = async (): Promise<PromoCode[]> => {
  try {
    const promoRef = collection(db, 'promocodes');
    const q = query(promoRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PromoCode));
  } catch (error) {
    console.error('Error fetching promo codes:', error);
    return [];
  }
};

export const addPromoCode = async (promoData: Omit<PromoCode, 'id' | 'createdAt'>) => {
  try {
    const promoRef = collection(db, 'promocodes');
    const docRef = await addDoc(promoRef, {
      ...promoData,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding promo code:', error);
    throw error;
  }
};

export const updatePromoCode = async (id: string, promoData: Partial<PromoCode>) => {
  try {
    const promoRef = doc(db, 'promocodes', id);
    await updateDoc(promoRef, {
      ...promoData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating promo code:', error);
    handleFirestoreError(error, OperationType.UPDATE, `promocodes/${id}`);
  }
};

export const deletePromoCode = async (id: string) => {
  try {
    const promoRef = doc(db, 'promocodes', id);
    await deleteDoc(promoRef);
  } catch (error) {
    console.error('Error deleting promo code:', error);
    handleFirestoreError(error, OperationType.DELETE, `promocodes/${id}`);
  }
};

export const verifyPromoCode = async (code: string): Promise<PromoCode | null> => {
  try {
    const promoRef = collection(db, 'promocodes');
    const snapshot = await getDocs(promoRef);
    
    const promo = snapshot.docs.find(doc => {
      const data = doc.data() as PromoCode;
      return data.code.toUpperCase() === code.toUpperCase() && data.isActive;
    });

    if (!promo) return null;

    const data = promo.data() as PromoCode;
    
    // Check expiration
    if (data.validUntil) {
      const expiry = data.validUntil.seconds 
        ? new Date(data.validUntil.seconds * 1000) 
        : new Date(data.validUntil);
      
      if (expiry < new Date()) {
        return null;
      }
    }

    return { id: promo.id, ...data };
  } catch (error) {
    console.error('Error verifying promo code:', error);
    return null;
  }
};

export const getLatestExchangeRates = async (): Promise<any | null> => {
  try {
    const exchangeRef = doc(db, 'exchange', 'latest');
    const snapshot = await getDocsFromServer(query(collection(db, 'exchange')));
    const latestDoc = snapshot.docs.find(d => d.id === 'latest');
    if (latestDoc) {
      const data = latestDoc.data();
      
      // Sanitize markups: if they are stored as percentages like 5 instead of 0.05
      if (data.markupusdt > 1) data.markupusdt = data.markupusdt / 100;
      if (data.markuprub > 1) data.markuprub = data.markuprub / 100;
      
      return data;
    }
    return null;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    return null;
  }
};

export const updateExchangeRates = async (data: any) => {
  try {
    const exchangeRef = doc(db, 'exchange', 'latest');
    await setDoc(exchangeRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating exchange rates:', error);
    handleFirestoreError(error, OperationType.WRITE, 'exchange/latest');
  }
};
