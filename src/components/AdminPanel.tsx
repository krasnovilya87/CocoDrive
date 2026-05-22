import * as React from 'react';
import { useState, useEffect } from 'react';
import { X, Plus, Image as ImageIcon, LayoutGrid, ClipboardList, Loader2, Upload, Calendar, User, Bike as BikeIcon, Tag, ChevronUp, ChevronDown, Edit, Trash2, GripVertical, Map, Phone, Instagram, Mail, MessageCircle, Send, ArrowUpDown, Zap, ArrowRight, MapPin, Check, ExternalLink, BarChart3, LogIn, LogOut, RefreshCw, MessageSquare, Maximize2, Minimize2 } from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { addBike, updateBike, deleteBike, updateBikesOrder, getBookings, uploadFile, getBikes, getColors, addColor, getOwners, addOwner, updateOwner, deleteOwner, getBikeListings, addBikeListing, updateBikeListing, deleteBikeListing, updateListingStatus, updateBookingStatus, updateBookingPayment, getAdminContacts, updateAdminContacts, updateBooking, getPromoCodes, addPromoCode, updatePromoCode, deletePromoCode, subscribeToBikes, getLatestExchangeRates, updateExchangeRates } from '../services/dataService';
import { seedBikes } from '../services/seedService';
import { getAreas } from '../services/areaService';
import { useLanguage } from '../LanguageContext';
import { Bike, BikeType, ColorReference, Owner, BikeListing, Area, AdminContacts, PromoCode, Booking } from '../types';
import { collection, addDoc, serverTimestamp, doc, setDoc, getDoc, getDocs } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { cn, getPhoneInfo, formatPrice } from '../lib/utils';
import { normalizePhoneNumber, isPhoneValid } from '../lib/phoneUtils';

export const AdminPanel = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const { language } = useLanguage();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    // Check connection by seeing if we can reach Firebase
    const checkConnection = async () => {
      try {
        // A simple check - try to get a doc or just wait for auth
        if (auth.currentUser) {
          setIsDbConnected(true);
        }
      } catch (e) {
        setIsDbConnected(false);
      }
    };
    checkConnection();
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        console.log("Current User UID:", currentUser.uid, "Email:", currentUser.email);
        // Check if user is in admins collection
        const adminRef = doc(db, 'admins', currentUser.uid);
        const adminDoc = await getDoc(adminRef);
        
        if (adminDoc.exists()) {
          console.log("User verified as ADMIN");
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
          console.warn("User is NOT an admin in Firestore:", currentUser.email);
          
          // Check if admins collection is empty - if so, allow auto-promotion of the first user
          try {
            const adminsRef = collection(db, 'admins');
            const snapshot = await getDocs(adminsRef);
            if (snapshot.empty) {
              console.log("No admins found in DB. Auto-promoting first user...");
              await setDoc(adminRef, {
                email: currentUser.email,
                role: 'superadmin',
                createdAt: serverTimestamp()
              });
              setIsAdmin(true);
              showNotification("Initial admin account created for you!", "success");
            }
          } catch (e) {
            console.error("Auto-promotion check failed:", e);
          }
        }
      } else {
        setIsAdmin(false);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setAuthLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      console.log("Starting Google login popup...");
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
      showNotification("Login failed. Check console for details.", "error");
    } finally {
      // Auth state listener handles cleaning up loading
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleSyncData = async () => {
    if (!isAdmin) {
      showNotification("Only admins can sync data. Please login first.", "error");
      return;
    }

    console.log("Admin initiated SYNC of BIKES constant to Firestore...");
    setIsSyncing(true);
    try {
      await seedBikes();
      showNotification("Prices and bikes synced from code constants! Reloading...", "success");
      setTimeout(() => {
        console.log("Triggering reload after sync...");
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Sync failed:", error);
      showNotification("Sync failed. Check console and permissions.", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const [deletingBikeId, setDeletingBikeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'bikes' | 'bookings' | 'listings' | 'owners' | 'contacts' | 'statistics' | 'promocodes'>('bookings');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBikeId, setEditingBikeId] = useState<string | null>(null);
  const [editingListingId, setEditingListingId] = useState<string | null>(null);
  const [editingOwnerId, setEditingOwnerId] = useState<string | null>(null);
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
  const [deletingListingId, setDeletingListingId] = useState<string | null>(null);
  const [deletingOwnerId, setDeletingOwnerId] = useState<string | null>(null);
  const [deletingPromoId, setDeletingPromoId] = useState<string | null>(null);
  const [showAddListingForm, setShowAddListingForm] = useState(false);
  const [showAddOwnerForm, setShowAddOwnerForm] = useState(false);
  const [showAddPromoForm, setShowAddPromoForm] = useState(false);
  const [showColorManager, setShowColorManager] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [bookingFilterStatuses, setBookingFilterStatuses] = useState<string[]>(['all']);
  const [bookingSortField, setBookingSortField] = useState<'createdAt' | 'startDate'>('createdAt');
  const [bookingSortOrder, setBookingSortOrder] = useState<'desc' | 'asc'>('desc');

  const toggleStatusFilter = (status: string) => {
    if (status === 'all') {
      setBookingFilterStatuses(['all']);
      return;
    }
    
    setBookingFilterStatuses(prev => {
      const withoutAll = prev.filter(s => s !== 'all');
      if (withoutAll.includes(status)) {
        const next = withoutAll.filter(s => s !== status);
        return next.length === 0 ? ['all'] : next;
      } else {
        return [...withoutAll, status];
      }
    });
  };
  const [bikes, setBikes] = useState<any[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [promocodes, setPromocodes] = useState<PromoCode[]>([]);
  const [listings, setListings] = useState<BikeListing[]>([]);
  const [colorsReference, setColorsReference] = useState<ColorReference[]>([]);
  const [adminContacts, setAdminContacts] = useState<AdminContacts>({
    phone: '',
    whatsapp: '',
    telegram: '',
    instagram: '',
    email: ''
  });
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [exchangeRates, setExchangeRates] = useState<{ 
    idr: number, 
    rub: number, 
    markupusdt: number, 
    markuprub: number 
  }>({ idr: 16100, rub: 95, markupusdt: 0.05, markuprub: 0.05 });
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Listing Form State
  const [listingFormData, setListingFormData] = useState({
    bikeId: '',
    ownerId: '',
    licensePlate: '',
    status: 'available' as BikeListing['status'],
    pricePerDay: 0,
    priceWeekly: 0,
    priceMonthly: 0,
    year: new Date().getFullYear(),
    condition: 'Excellent',
    note: ''
  });

  // Owner Form State
  const [ownerFormData, setOwnerFormData] = useState({
    name: '',
    phone: '',
    email: '',
    areas: [] as string[]
  });

  // Promo Form State
  const [promoFormData, setPromoFormData] = useState({
    code: '',
    discount: 10,
    isActive: true,
    validUntil: ''
  });

  const stats = React.useMemo(() => {
    const totalBookings = bookings.length;
    const completedBookings = bookings.filter(b => b.status === 'completed');
    
    // Calculate totals with fallback logic for payout/fees
    const financials = bookings.reduce((acc, b) => {
      const isCompleted = b.status === 'completed';
      const revenue = b.totalPrice || 0;
      
      // Calculate payout fallback if missing
      let ownerPayout = b.ownerPayout;
      if (ownerPayout === undefined || ownerPayout === null) {
        const listing = listings.find(l => l.id === b.assignedListingId);
        const bike = bikes.find(bike => bike.id === (listing?.bikeId || b.bikeId));
        let ownerDayRate = 0;
        const daysCount = b.days || b.durationDays || 0;
        if (listing) {
          if (daysCount >= 30) ownerDayRate = listing.priceMonthly || listing.priceWeekly || listing.pricePerDay || 0;
          else if (daysCount >= 7) ownerDayRate = listing.priceWeekly || listing.pricePerDay || 0;
          else ownerDayRate = listing.pricePerDay || 0;
        } else if (bike) {
          if (daysCount >= 30) ownerDayRate = bike.priceMonthly || bike.priceWeekly || bike.pricePerDay || 0;
          else if (daysCount >= 7) ownerDayRate = bike.priceWeekly || bike.pricePerDay || 0;
          else ownerDayRate = bike.pricePerDay || 0;
        }
        ownerPayout = ownerDayRate * daysCount;
      }

      const platformFee = b.platformFee !== undefined && b.platformFee !== null ? b.platformFee : (revenue - ownerPayout);

      return {
        totalRevenue: acc.totalRevenue + revenue,
        completedRevenue: acc.completedRevenue + (isCompleted ? revenue : 0),
        platformFeeTotal: acc.platformFeeTotal + (isCompleted ? platformFee : 0),
        ownerPayoutTotal: acc.ownerPayoutTotal + (isCompleted ? ownerPayout : 0),
      };
    }, { totalRevenue: 0, completedRevenue: 0, platformFeeTotal: 0, ownerPayoutTotal: 0 });
    
    const activeRentals = bookings.filter(b => b.status === 'active').length;
    const pendingBookings = bookings.filter(b => b.status === 'pending').length;
    
    // Popular bikes
    const bikeCounts: Record<string, number> = {};
    bookings.forEach(b => {
      const bikeName = b.bikeDisplayName || b.bikeName || b.bikeId;
      if (bikeName) {
        bikeCounts[bikeName] = (bikeCounts[bikeName] || 0) + 1;
      }
    });
    const popularBikes = Object.entries(bikeCounts)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 5);
      
    // Revenue by month
    const monthlyRevenue: Record<string, number> = {};
    completedBookings.forEach(b => {
      let date: Date;
      if (b.createdAt?.seconds) {
        date = new Date(b.createdAt.seconds * 1000);
      } else if (b.createdAt) {
        date = new Date(b.createdAt);
      } else {
        return;
      }
      const month = date.toLocaleString('default', { month: 'short', year: '2-digit' });
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (b.totalPrice || 0);
    });

    const averageValue = completedBookings.length > 0 ? financials.completedRevenue / completedBookings.length : 0;

    // Payment methods
    const paymentMethods: Record<string, number> = {};
    bookings.forEach(b => {
      const method = b.paymentMethod || 'Other';
      paymentMethods[method] = (paymentMethods[method] || 0) + 1;
    });

    return {
      totalBookings,
      totalRevenue: financials.totalRevenue, // Gross Merchandise Value (all bookings)
      completedRevenue: financials.completedRevenue,
      platformFeeTotal: financials.platformFeeTotal,
      ownerPayoutTotal: financials.ownerPayoutTotal,
      activeRentals,
      pendingBookings,
      popularBikes,
      monthlyRevenue,
      averageValue,
      paymentMethods
    };
  }, [bookings, listings, bikes]);

  // Dictionary management state
  const [newColorRef, setNewColorRef] = useState({ id: '', displayName: '', hexCode: '#000000' });
  
  // Color Management for Bike
  const [colorDrafts, setColorDrafts] = useState<{ colorId: string; files: File[]; previews: string[]; existing?: boolean }[]>([]);
  
  // General Photos Management
  const [generalFiles, setGeneralFiles] = useState<File[]>([]);
  const [generalPreviews, setGeneralPreviews] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    type: [] as string[],
    engineSize: '',
    hasABS: false,
    hasBigTrunk: false,
    hasPhoneHolder: false,
    hasUSB: false,
    pricePerDay: 0,
    priceWeekly: 0,
    priceMonthly: 0,
    promoPrice: 0,
    isPromoActive: false,
    description: '',
    features: [] as string[],
    bestFor: [] as string[],
    bestForPercentages: {} as Record<string, number>
  });

  const handlePriorityChange = (key: string, val: number) => {
    const currentBestFor = formData.bestFor || [];
    let updatedBestFor = [...currentBestFor];
    if (val > 0) {
      if (!updatedBestFor.includes(key)) {
        updatedBestFor.push(key);
      }
    } else {
      updatedBestFor = updatedBestFor.filter(o => o !== key);
    }

    const updatedPercentages = {
      ...(formData.bestForPercentages || {}),
      [key]: val
    };

    setFormData({
      ...formData,
      bestFor: updatedBestFor,
      bestForPercentages: updatedPercentages
    });
  };

  useEffect(() => {
    let unsubscribeBikes: (() => void) | undefined;
    
    if (isOpen) {
      if (activeTab === 'bookings') {
        fetchBookings();
        fetchListings();
        fetchOwners();
        fetchExchangeRates();
      } else if (activeTab === 'bikes') {
        // Use real-time subscription for bikes
        unsubscribeBikes = subscribeToBikes((data) => {
          setBikes(data);
          setLoading(false);
        });
        fetchColorsReference();
      } else if (activeTab === 'listings') {
        fetchListings();
        fetchBikes();
        fetchOwners();
        fetchAreas();
      } else if (activeTab === 'owners') {
        fetchOwners();
        fetchAreas();
      } else if (activeTab === 'contacts') {
        fetchAdminContacts();
        fetchExchangeRates();
      } else if (activeTab === 'promocodes') {
        fetchPromocodes();
      } else if (activeTab === 'statistics') {
        fetchBookings();
        fetchBikes();
        fetchListings();
        fetchOwners();
      }
    }

    return () => {
      if (unsubscribeBikes) unsubscribeBikes();
    };
  }, [isOpen, activeTab]);

  const fetchAdminContacts = async () => {
    setLoading(true);
    try {
      const data = await getAdminContacts();
      setAdminContacts(data);
    } catch (error) {
      console.error('Failed to fetch admin contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPromocodes = async () => {
    setLoading(true);
    try {
      const data = await getPromoCodes();
      setPromocodes(data);
    } catch (error) {
      console.error('Failed to fetch promo codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateContacts = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateAdminContacts(adminContacts);
      showNotification('Contacts updated successfully!', 'success');
    } catch (error) {
      console.error('Failed to update contacts:', error);
      showNotification('Failed to update contacts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const checkListingAvailability = (listingId: string, currentBooking: any) => {
    // 6 hours in milliseconds
    const BUFFER_MS = 6 * 60 * 60 * 1000;
    
    const getTimestamp = (date: any) => {
      if (!date) return 0;
      if (typeof date === 'object' && date.seconds) return date.seconds * 1000;
      if (typeof date === 'string') return new Date(date).getTime();
      return 0;
    };

    const currentStart = getTimestamp(currentBooking.startDate);
    const currentEnd = getTimestamp(currentBooking.endDate);

    // Check against all other bookings
    const conflicts = bookings.filter(b => {
      // Skip the current booking itself and bookings without an assigned unit
      if (b.id === currentBooking.id || b.assignedListingId !== listingId) return false;
      
      // Skip cancelled bookings
      if (b.status === 'cancelled') return false;

      const otherStart = getTimestamp(b.startDate);
      const otherEnd = getTimestamp(b.endDate);

      // Overlap logic with 6h buffer:
      return currentStart < (otherEnd + BUFFER_MS) && currentEnd > (otherStart - BUFFER_MS);
    });

    return conflicts.length === 0;
  };

  const getFilteredListings = (currentBooking: any) => {
    return listings.filter(listing => {
      // If it's already assigned TO THIS booking, keep it in the list (so it can remain selected)
      if (currentBooking.assignedListingId === listing.id) return true;
      
      // Only available units
      if (listing.status !== 'available') return false;

      // Check for calendar overlaps
      return checkListingAvailability(listing.id, currentBooking);
    });
  };

  const fetchAreas = async () => {
    try {
      const data = await getAreas();
      // Custom order: Uluwatu, Nusa Dua, Jimbaran, Kuta, Seminyak, Canggu, Denpasar, Sanur, Ubud
      const customOrder = [
        'Uluwatu', 
        'Nusa Dua', 
        'Jimbaran', 
        'Kuta', 
        'Seminyak', 
        'Canggu', 
        'Denpasar', 
        'Sanur', 
        'Ubud'
      ];
      
      const sortedData = [...data].sort((a, b) => {
        const indexA = customOrder.indexOf(a.name);
        const indexB = customOrder.indexOf(b.name);
        
        // If name not in list, put at the end
        if (indexA === -1 && indexB === -1) return a.name.localeCompare(b.name);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        
        return indexA - indexB;
      });
      
      setAreas(sortedData);
    } catch (error) {
      console.error('Failed to fetch areas:', error);
    }
  };

  const fetchOwners = async () => {
    try {
      const data = await getOwners();
      setOwners(data);
    } catch (error) {
      console.error('Failed to fetch owners:', error);
    }
  };

  const fetchListings = async () => {
    try {
      const data = await getBikeListings();
      setListings(data);
    } catch (error) {
      console.error('Failed to fetch listings:', error);
    }
  };

  const handleAddOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerFormData.name) return;
    setLoading(true);
    try {
      if (editingOwnerId) {
        await updateOwner(editingOwnerId, ownerFormData);
        showNotification('Owner updated successfully!', 'success');
      } else {
        await addOwner(ownerFormData);
        showNotification('Owner added successfully!', 'success');
      }
      setOwnerFormData({ name: '', phone: '', email: '', areas: [] });
      setEditingOwnerId(null);
      setShowAddOwnerForm(false);
      fetchOwners();
    } catch (error) {
      console.error('Failed to save owner:', error);
      showNotification('Error saving owner. Check console.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditOwner = (owner: Owner) => {
    setEditingOwnerId(owner.id);
    setOwnerFormData({
      name: owner.name,
      phone: owner.phone || '',
      email: owner.email || '',
      areas: owner.areas || []
    });
    setShowAddOwnerForm(true);
  };

  const handleDeleteOwner = async (id: string) => {
    setLoading(true);
    try {
      await deleteOwner(id);
      setDeletingOwnerId(null);
      fetchOwners();
    } catch (error) {
      console.error('Failed to delete owner:', error);
      showNotification('Error deleting owner. Check console.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listingFormData.bikeId || !listingFormData.ownerId || !listingFormData.licensePlate) {
      showNotification('Please fill all required fields', 'error');
      return;
    }
    setLoading(true);
    try {
      if (editingListingId) {
        await updateBikeListing(editingListingId, listingFormData);
        showNotification('Listing updated successfully!', 'success');
      } else {
        await addBikeListing({
          ...listingFormData,
          rating: 5, // Default rating
        });
        showNotification('Listing created successfully!', 'success');
      }
      setListingFormData({
        bikeId: '',
        ownerId: '',
        licensePlate: '',
        status: 'available',
        pricePerDay: 0,
        priceWeekly: 0,
        priceMonthly: 0,
        year: new Date().getFullYear(),
        condition: 'Excellent',
        note: ''
      });
      setEditingListingId(null);
      setShowAddListingForm(false);
      fetchListings();
    } catch (error) {
      console.error('Failed to save listing:', error);
      showNotification('Error saving listing. Check console.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditListing = (listing: BikeListing) => {
    setEditingListingId(listing.id);
    setListingFormData({
      bikeId: listing.bikeId,
      ownerId: listing.ownerId,
      licensePlate: listing.licensePlate,
      status: listing.status,
      pricePerDay: listing.pricePerDay || 0,
      priceWeekly: listing.priceWeekly || 0,
      priceMonthly: listing.priceMonthly || 0,
      year: listing.year || new Date().getFullYear(),
      condition: listing.condition || 'Excellent',
      note: listing.note || ''
    });
    setShowAddListingForm(true);
  };

  const handleDeleteListing = async (id: string) => {
    setLoading(true);
    try {
      await deleteBikeListing(id);
      setDeletingListingId(null);
      fetchListings();
    } catch (error) {
      console.error('Failed to delete listing:', error);
      showNotification('Error deleting listing. Check console.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // PromoCode Handlers
  const handlePromoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingPromoId) {
        await updatePromoCode(editingPromoId, promoFormData);
        showNotification('Promo code updated!', 'success');
      } else {
        await addPromoCode(promoFormData);
        showNotification('Promo code created!', 'success');
      }
      setShowAddPromoForm(false);
      setEditingPromoId(null);
      setPromoFormData({ code: '', discount: 10, isActive: true, validUntil: '' });
      fetchPromocodes();
    } catch (error) {
      console.error('Failed to save promo code:', error);
      showNotification('Error saving promo code.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPromo = (promo: PromoCode) => {
    setEditingPromoId(promo.id);
    let validUntilStr = '';
    if (promo.validUntil) {
      const date = promo.validUntil.seconds ? new Date(promo.validUntil.seconds * 1000) : new Date(promo.validUntil);
      validUntilStr = date.toISOString().split('T')[0];
    }
    setPromoFormData({
      code: promo.code,
      discount: promo.discount,
      isActive: promo.isActive,
      validUntil: validUntilStr
    });
    setShowAddPromoForm(true);
  };

  const handlePromoDelete = async (id: string) => {
    setLoading(true);
    try {
      await deletePromoCode(id);
      showNotification('Promo code deleted', 'success');
      setDeletingPromoId(null);
      fetchPromocodes();
    } catch (error) {
      console.error('Failed to delete promo code:', error);
      showNotification('Failed to delete promo code', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (listingId: string, newStatus: BikeListing['status']) => {
    try {
      await updateListingStatus(listingId, newStatus);
      fetchListings();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleBookingStatusChange = async (bookingId: string, newStatus: string) => {
    try {
      await updateBookingStatus(bookingId, newStatus);
      fetchBookings();
    } catch (error) {
      console.error('Failed to update booking status:', error);
    }
  };

  const fetchColorsReference = async () => {
    try {
      const data = await getColors();
      setColorsReference(data);
    } catch (error) {
      console.error('Failed to fetch colors:', error);
    }
  };

  const handleAddColorRef = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColorRef.id || !newColorRef.displayName) return;
    
    setLoading(true);
    try {
      await addColor(newColorRef);
      showNotification('Color added to dictionary!', 'success');
      setNewColorRef({ id: '', displayName: '', hexCode: '#000000' });
      fetchColorsReference();
    } catch (error) {
      console.error('Failed to add color ref:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const data = await getBookings();
      
      // Auto-update status to 'handover' if it's confirmed and startDate is today (Bali time)
      const todayBali = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Makassar',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());
      
      let updatedCount = 0;
      const updatedData = await Promise.all(data.map(async (bookingData: any) => {
        const booking = bookingData as Booking;
        const bookingStartDate = booking.startDate ? (typeof booking.startDate === 'string' 
          ? booking.startDate.split('T')[0]
          : new Date(booking.startDate.seconds * 1000).toISOString().split('T')[0]) : null;
        
        const bookingEndDate = booking.endDate ? (typeof booking.endDate === 'string' 
          ? booking.endDate.split('T')[0]
          : new Date(booking.endDate.seconds * 1000).toISOString().split('T')[0]) : null;

        let newStatus = null;

        // 1. confirmed -> handover (if today is startDate)
        if (booking.status === 'confirmed' && bookingStartDate === todayBali) {
          newStatus = 'handover';
        }
        // 2. handover -> active (if today is after startDate)
        else if (booking.status === 'handover' && bookingStartDate && todayBali > bookingStartDate) {
          newStatus = 'active';
        }
        // 3. awaiting_return -> completed (if today is after endDate)
        else if (booking.status === 'awaiting_return' && bookingEndDate && todayBali > bookingEndDate) {
          newStatus = 'completed';
        }
        
        if (newStatus) {
          console.log(`Auto-updating booking ${booking.id} from ${booking.status} to ${newStatus}`);
          try {
            await updateBookingStatus(booking.id, newStatus);
            updatedCount++;
            return { ...booking, status: newStatus };
          } catch (err) {
            console.error(`Failed to auto-update booking ${booking.id}`, err);
          }
        }
        return booking;
      }));

      setBookings(updatedData);
      if (updatedCount > 0) {
        showNotification(`Auto-updated ${updatedCount} bookings statuses`, 'info');
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExchangeRates = async () => {
    const DEFAULT_MARKUP = 0.05;
    const ONE_DAY = 24 * 60 * 60 * 1000;
    const now = Date.now();

    try {
      const data = await getLatestExchangeRates();
      console.log("Fetched exchange rates data from Firestore:", data);
      
      let finalIdr = 16100;
      let finalRub = 95;
      let finalMarkupUSDT = DEFAULT_MARKUP;
      let finalMarkupRUB = DEFAULT_MARKUP;

      if (data) {
        finalIdr = (data.rates && data.rates.IDR) || data.idr || 16100;
        finalRub = (data.rates && data.rates.RUB) || data.rub || 95;
        finalMarkupUSDT = data.markupusdt !== undefined ? data.markupusdt : DEFAULT_MARKUP;
        finalMarkupRUB = data.markuprub !== undefined ? data.markuprub : DEFAULT_MARKUP;

        // If Firestore data is fresh, just use it
        if (data.timestamp && (now - data.timestamp < ONE_DAY)) {
          setExchangeRates({
            idr: finalIdr,
            rub: finalRub,
            markupusdt: finalMarkupUSDT,
            markuprub: finalMarkupRUB
          });
          return;
        }
      }

      // If missing or old, try to fetch from API but keep markups
      try {
        const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const apiData = await res.json();
        if (apiData && apiData.rates) {
          finalIdr = apiData.rates.IDR || finalIdr;
          finalRub = apiData.rates.RUB || finalRub;
          
          // Update Firestore with fresh rates but preserve markups
          await updateExchangeRates({
            rates: {
              USD: 1,
              IDR: finalIdr,
              RUB: finalRub
            },
            timestamp: now,
            markupusdt: finalMarkupUSDT,
            markuprub: finalMarkupRUB
          });
        }
      } catch (apiErr) {
        console.error("Failed to fetch fresh rates from API, using fallback/old data", apiErr);
      }

      setExchangeRates({
        idr: finalIdr,
        rub: finalRub,
        markupusdt: finalMarkupUSDT,
        markuprub: finalMarkupRUB
      });
    } catch (err) {
      console.error("Failed to fetch exchange rates", err);
    }
  };

  const handleUpdateExchangeRates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exchangeRates) return;
    
    setLoading(true);
    try {
      const dataToSave = {
        rates: {
          IDR: exchangeRates.idr,
          RUB: exchangeRates.rub,
          USD: 1
        },
        timestamp: Date.now(),
        markupusdt: exchangeRates.markupusdt,
        markuprub: exchangeRates.markuprub
      };
      
      await updateExchangeRates(dataToSave);
      showNotification('Exchange rates and markups updated successfully', 'success');
      
      // Update local state and also sync to localStorage for consistency with client side
      localStorage.setItem('exchange', JSON.stringify(dataToSave));
    } catch (err) {
      console.error("Failed to update exchange rates", err);
      showNotification('Failed to update exchange rates', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getRUB = (p: number) => {
    // Correct logic: IDR price divided by (IDR per RUB rate)
    // IDR per RUB = (IDR per USD) / (RUB per USD)
    const idrPerUsd = exchangeRates?.idr || 16100;
    const rubPerUsd = exchangeRates?.rub || 95;
    const idrPerRub = idrPerUsd / rubPerUsd;
    
    // Use ?? to allow 0 markup
    const markup = exchangeRates?.markuprub ?? 0.05;
    
    // Price in RUB = (IDR / Rate) * (1 + Fee)
    const result = (p / idrPerRub) * (1 + markup);
    return `₽ ${Math.round(result).toLocaleString()}`;
  };

  const getUSDT = (p: number) => {
    // IDR price divided by IDR per USD rate
    const idrPerUsd = exchangeRates?.idr || 16100;
    const markup = exchangeRates?.markupusdt ?? 0.05;
    
    const result = (p / idrPerUsd) * (1 + markup);
    return `${Math.round(result)} USDT`;
  };

  const fetchBikes = async () => {
    setLoading(true);
    try {
      const data = await getBikes();
      setBikes(data);
    } catch (error) {
      console.error('Failed to fetch bikes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReorder = async (newOrder: Bike[]) => {
    setBikes(newOrder);
    try {
      await updateBikesOrder(newOrder);
    } catch (error) {
      console.error('Failed to update order:', error);
      fetchBikes();
    }
  };

  const moveUp = async (index: number) => {
    if (index === 0) return;
    const newBikes = [...bikes];
    [newBikes[index - 1], newBikes[index]] = [newBikes[index], newBikes[index - 1]];
    setBikes(newBikes);
    try {
      await updateBikesOrder(newBikes);
    } catch (error) {
      console.error('Failed to update order:', error);
      fetchBikes(); // Revert
    }
  };

  const moveDown = async (index: number) => {
    if (index === bikes.length - 1) return;
    const newBikes = [...bikes];
    [newBikes[index + 1], newBikes[index]] = [newBikes[index], newBikes[index + 1]];
    setBikes(newBikes);
    try {
      await updateBikesOrder(newBikes);
    } catch (error) {
      console.error('Failed to update order:', error);
      fetchBikes(); // Revert
    }
  };

  const handleEditBike = (bike: any) => {
    setEditingBikeId(bike.id);
    setFormData({
      name: bike.name,
      type: Array.isArray(bike.type) ? bike.type : (bike.type ? [bike.type] : []),
      engineSize: bike.engineSize ? bike.engineSize.toString().replace(/\D/g, '') : '',
      pricePerDay: bike.pricePerDay || 0,
      priceWeekly: bike.priceWeekly || 0,
      priceMonthly: bike.priceMonthly || 0,
      promoPrice: bike.promoPrice || 0,
      isPromoActive: bike.isPromoActive || false,
      hasABS: bike.hasABS || false,
      hasBigTrunk: bike.hasBigTrunk || false,
      hasPhoneHolder: bike.hasPhoneHolder || false,
      hasUSB: bike.hasUSB || false,
      description: bike.description || '',
      features: bike.features || [],
      bestFor: bike.bestFor || [],
      bestForPercentages: bike.bestForPercentages || {}
    });
    
    // Set previews for existing images
    setGeneralPreviews(bike.generalPhotos || []);
    setGeneralFiles([]); // Existing files don't need to be reloaded as Files
    
    // Set color drafts for existing colors
    setColorDrafts((bike.colors || []).map((c: any) => ({
      colorId: c.colorId,
      files: [],
      previews: c.imageUrls || (c.imageUrl || c.image ? [c.imageUrl || c.image] : []),
      existing: true
    })));
    
    setShowAddForm(true);
  };

  const handleDeleteBike = async (id: string) => {
    console.log('Выполнение удаления байка с ID:', id);
    setLoading(true);
    try {
      await deleteBike(id);
      console.log('Байк успешно удален из базы данных');
      setDeletingBikeId(null);
      fetchBikes();
    } catch (error) {
      console.error('Ошибка при удалении байка:', error);
      showNotification('Error deleting bike. Check console.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const addColorDraft = () => {
    setColorDrafts(prev => [...prev, { colorId: '', files: [], previews: [] }]);
  };

  const removeColorDraft = (index: number) => {
    setColorDrafts(prev => {
      prev[index].previews.forEach(url => {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
      });
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleColorFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length > 0) {
      const newUrls = files.map(file => URL.createObjectURL(file));
      setColorDrafts(prev => prev.map((draft, i) => {
        if (i === index) {
          return { 
            ...draft, 
            files: [...draft.files, ...files], 
            previews: [...draft.previews, ...newUrls] 
          };
        }
        return draft;
      }));
    }
  };

  const removeColorDraftPhoto = (colorIdx: number, photoIdx: number) => {
    setColorDrafts(prev => prev.map((draft, i) => {
      if (i === colorIdx) {
        const urlToRemove = draft.previews[photoIdx];
        if (urlToRemove.startsWith('blob:')) URL.revokeObjectURL(urlToRemove);
        
        // We need to figure out if it was a new file or an existing URL
        // Simple way: if it starts with blob:, it was in 'files'
        const isBlob = urlToRemove.startsWith('blob:');
        
        let newFiles = [...draft.files];
        if (isBlob) {
          // Find which file it was. This is a bit tricky if multiple files have same blob pattern
          // but usually they are sequential.
          const blobIndex = draft.previews.slice(0, photoIdx).filter(p => p.startsWith('blob:')).length;
          newFiles.splice(blobIndex, 1);
        }

        return {
          ...draft,
          files: newFiles,
          previews: draft.previews.filter((_, j) => j !== photoIdx)
        };
      }
      return draft;
    }));
  };

  const handleGeneralFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length > 0) {
      setGeneralFiles(prev => [...prev, ...files]);
      const newUrls = files.map(file => URL.createObjectURL(file));
      setGeneralPreviews(prev => [...prev, ...newUrls]);
    }
  };

  const removeGeneralPhoto = (index: number) => {
    setGeneralFiles(prev => prev.filter((_, i) => i !== index));
    setGeneralPreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

   const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[AdminPanel] handleSubmit triggered');
    
    // Validation
    const validColors = colorDrafts.filter(c => c.colorId && (c.previews.length > 0));
    
    if (validColors.length === 0) {
      showNotification('Add at least one color variant with a photo', 'error');
      return;
    }

    setLoading(true);
    try {
      console.log('[AdminPanel] Starting image uploads...');
      // 1. Upload Color Photos (only new ones)
      const processedColors = await Promise.all(
        validColors.map(async (c) => {
          const uploadedUrls = await Promise.all(
            c.files.map(file => uploadFile(file))
          );
          
          const allUrls = [
            ...c.previews.filter(p => !p.startsWith('blob:')), // Keep existing URLs
            ...uploadedUrls
          ];

          const colorRef = colorsReference.find(r => r.id === c.colorId);
          return { 
            name: colorRef?.displayName || '', 
            hex: colorRef?.hexCode || '#000000', 
            image: allUrls[0], // For legacy support
            images: allUrls,
            colorId: c.colorId,
            imageUrl: allUrls[0], // For legacy support
            imageUrls: allUrls
          };
        })
      );

      // 2. Upload General Photos (previews already contain existing URLs + blobs for new ones)
      // Note: This logic for general photos in edit mode needs to distinguish between existing URLs and new Files.
      // For simplicity in this edit, if previews were modified, we'd need to track which ones are new files.
      // But based on handleGeneralFilesChange, previews stores all.
      // Let's stick to simple logic: upload new files, keep existing URLs.
      const uploadedGeneralPhotos = await Promise.all(
        generalFiles.map(file => uploadFile(file))
      );
      
      const allGeneralPhotos = [
        ...generalPreviews.filter(p => !p.startsWith('blob:')), // Keep existing URLs
        ...uploadedGeneralPhotos
      ];

      const bikeData = {
        ...formData,
        pricePerDay: Number(formData.pricePerDay) || 0,
        priceWeekly: Number(formData.priceWeekly) || 0,
        priceMonthly: Number(formData.priceMonthly) || 0,
        promoPrice: Number(formData.promoPrice) || 0,
        engineSize: Number(formData.engineSize) || 0,
        hasABS: formData.hasABS,
        hasBigTrunk: formData.hasBigTrunk,
        hasPhoneHolder: formData.hasPhoneHolder,
        hasUSB: formData.hasUSB,
        image: processedColors[0].imageUrl!,
        colors: processedColors,
        generalPhotos: allGeneralPhotos,
        images: [...processedColors.map(c => c.imageUrl!), ...allGeneralPhotos],
        imagesByYear: { 2025: processedColors[0].imageUrl! }
      };

      console.log('[AdminPanel] Final bikeData to save:', bikeData);

      if (editingBikeId) {
        console.log('UPDATING existing bike with ID:', editingBikeId);
        await updateBike(editingBikeId, bikeData);
        showNotification('Bike updated successfully!', 'success');
      } else {
        console.log('ADDING NEW bike');
        await addBike(bikeData);
        showNotification('Bike added successfully!', 'success');
      }
      
      // Reset
      setFormData({
        name: '',
        type: [],
        engineSize: '',
        hasABS: false,
        pricePerDay: 0,
        priceWeekly: 0,
        priceMonthly: 0,
        promoPrice: 0,
        isPromoActive: false,
        hasBigTrunk: false,
        description: '',
        features: [],
        bestFor: [],
        bestForPercentages: {}
      });
      setEditingBikeId(null);
      setColorDrafts([]);
      setGeneralFiles([]);
      setGeneralPreviews([]);
      setShowAddForm(false);
      
      console.log('Refreshing bikes list (after 500ms delay)...');
      await new Promise(resolve => setTimeout(resolve, 500));
      await fetchBikes();
    } catch (error: any) {
      console.error('Failed to save bike:', error);
      let message = 'Error saving bike. Check console.';
      try {
        const parsed = JSON.parse(error.message);
        message = `Security/Firestore Error: ${parsed.error}`;
      } catch (e) {}
      showNotification(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    setLoading(true);
    try {
      await seedBikes();
      showNotification('Database synced successfully with 14 bikes!', 'success');
      fetchBikes();
    } catch (error) {
      console.error('Seed failed:', error);
      showNotification('Sync failed. Check console.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={cn("fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300", isFullScreen ? "p-0" : "p-0 md:p-4")}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "bg-background flex flex-col transition-all duration-300 overflow-hidden shadow-2xl border border-border",
          isFullScreen 
            ? "w-screen h-screen max-w-none max-h-none rounded-none border-none" 
            : "w-full max-w-6xl h-full md:h-auto md:max-h-[90vh] md:rounded-[40px]"
        )}
      >
        {/* Header */}
        <div className="px-4 sm:px-8 py-4 sm:py-5 border-b border-border flex flex-col gap-4 bg-surface/30 backdrop-blur-md sticky top-0 z-[40]">
          {/* Top Row: Title, status, actions */}
          <div className="flex items-center justify-between gap-4 w-full">
            <div className="flex flex-col shrink-0">
              <h2 className="text-xl sm:text-2xl font-display font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Admin Panel
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full transition-colors duration-500",
                  isDbConnected ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                )} />
                <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">
                  Firebase {isDbConnected ? 'connected' : 'disconnected'}
                </span>
              </div>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {authLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted" />
              ) : user && isAdmin ? (
                <div className="flex items-center gap-1.5 bg-muted/20 px-2.5 py-1 rounded-xl border border-border/30 text-[11px] font-medium text-muted-foreground select-none">
                  <span className="hidden sm:inline max-w-[120px] lg:max-w-[180px] truncate mr-1 font-semibold text-foreground">
                    {user.email}
                  </span>
                  <button 
                    onClick={handleLogout}
                    className="flex items-center gap-1 px-1.5 py-0.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-[10px] sm:text-[11px] font-black tracking-tight transition-all cursor-pointer"
                  >
                    <LogOut className="w-3 h-3" />
                    Log out
                  </button>
                </div>
              ) : null}

              {/* Full screen button */}
              {isAdmin && (
                <button
                  onClick={() => setIsFullScreen(!isFullScreen)}
                  title={isFullScreen ? "Minimize" : "Full Screen"}
                  className="p-1.5 sm:p-2 hover:bg-muted text-foreground/85 hover:text-foreground rounded-full transition-all cursor-pointer border border-border/40 bg-surface flex items-center justify-center"
                >
                  {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              )}

              <button 
                onClick={onClose} 
                className="p-1.5 sm:p-2 hover:bg-muted text-foreground/85 hover:text-foreground rounded-full transition-all cursor-pointer border border-border/40 bg-surface flex items-center justify-center"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {/* Bottom Row: Tabs */}
          {isAdmin && (
            <div className="w-full overflow-x-auto pb-1/2 scrollbar-none flex justify-start md:justify-center">
              <div className="flex bg-muted/20 p-1 rounded-2xl border border-border/50 shrink-0 select-none">
                <button 
                  onClick={() => setActiveTab('bookings')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 md:px-5 md:py-2.5 rounded-xl text-xs md:text-sm font-extrabold transition-all cursor-pointer",
                    activeTab === 'bookings' ? "bg-white text-primary shadow-sm shadow-black/5" : "text-muted hover:text-foreground"
                  )}
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  Bookings
                </button>
                <button 
                  onClick={() => setActiveTab('listings')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 md:px-5 md:py-2.5 rounded-xl text-xs md:text-sm font-extrabold transition-all cursor-pointer",
                    activeTab === 'listings' ? "bg-white text-primary shadow-sm shadow-black/5" : "text-muted hover:text-foreground"
                  )}
                >
                  <Tag className="w-3.5 h-3.5" />
                  Listings
                </button>
                <button 
                  onClick={() => setActiveTab('owners')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 md:px-5 md:py-2.5 rounded-xl text-xs md:text-sm font-extrabold transition-all cursor-pointer",
                    activeTab === 'owners' ? "bg-white text-primary shadow-sm shadow-black/5" : "text-muted hover:text-foreground"
                  )}
                >
                  <User className="w-3.5 h-3.5" />
                  Owners
                </button>
                <button 
                  onClick={() => setActiveTab('bikes')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 md:px-5 md:py-2.5 rounded-xl text-xs md:text-sm font-extrabold transition-all cursor-pointer",
                    activeTab === 'bikes' ? "bg-white text-primary shadow-sm shadow-black/5" : "text-muted hover:text-foreground"
                  )}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  Bikes
                </button>
                <button 
                  onClick={() => setActiveTab('contacts')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 md:px-5 md:py-2.5 rounded-xl text-xs md:text-sm font-extrabold transition-all cursor-pointer",
                    activeTab === 'contacts' ? "bg-white text-primary shadow-sm shadow-black/5" : "text-muted hover:text-foreground"
                  )}
                >
                  <Mail className="w-3.5 h-3.5" />
                  Contacts
                </button>
                <button 
                  onClick={() => setActiveTab('statistics')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 md:px-5 md:py-2.5 rounded-xl text-xs md:text-sm font-extrabold transition-all cursor-pointer",
                    activeTab === 'statistics' ? "bg-white text-primary shadow-sm shadow-black/5" : "text-muted hover:text-foreground"
                  )}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  Stats
                </button>
                <button 
                  onClick={() => setActiveTab('promocodes')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 md:px-5 md:py-2.5 rounded-xl text-xs md:text-sm font-extrabold transition-all cursor-pointer",
                    activeTab === 'promocodes' ? "bg-white text-primary shadow-sm shadow-black/5" : "text-muted hover:text-foreground"
                  )}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Promo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className={cn("flex-grow overflow-y-auto p-8", (!isAdmin || authLoading) && "flex flex-col justify-center items-center min-h-[400px]")}>
          {authLoading ? (
            <div className="flex flex-col items-center gap-4 py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted">Проверка авторизации...</p>
            </div>
          ) : !isAdmin ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md w-full bg-surface/50 border border-border/80 p-8 rounded-[32px] text-center space-y-6 shadow-sm mr-auto ml-auto my-auto"
            >
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                <LogIn className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold tracking-tight">Вход в панель администратора</h3>
                <p className="text-sm text-muted leading-relaxed">
                  {user 
                    ? `Вы вошли как ${user.email}, но этот аккаунт не зарегистрирован в качестве администратора.` 
                    : "Для получения доступа к управлению заказами и каталогом требуется авторизация через Google."}
                </p>
              </div>

              {user ? (
                <div className="pt-2">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl text-sm font-bold transition-all cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Выйти и сменить аккаунт
                  </button>
                </div>
              ) : (
                <div className="pt-2">
                  <button
                    onClick={handleLogin}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-white rounded-2xl text-sm font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/20 cursor-pointer"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" width="24" height="24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fillRule="evenodd" />
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    Войти через Google
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">
              {activeTab === 'bikes' && (
              <motion.div 
                key="bikes-tab"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="w-full h-full space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">
                    Bike Models
                  </h3>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={handleSeed}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-xl text-sm font-bold hover:bg-muted/80 active:scale-95 transition-all border border-border mt-0"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
                      Sync Database
                    </button>
                    <button 
                      onClick={() => {
                        if (showAddForm) {
                          setEditingBikeId(null);
                          setFormData({
                            name: '',
                            type: 'scooter',
                            engineSize: '',
                            hasABS: false,
                            hasBigTrunk: false,
                            pricePerDay: 0,
                            priceWeekly: 0,
                            priceMonthly: 0,
                            promoPrice: 0,
                            isPromoActive: false,
                            description: '',
                            features: [],
                            bestFor: [],
                            bestForPercentages: {}
                          });
                          setColorDrafts([]);
                          setGeneralFiles([]);
                          setGeneralPreviews([]);
                        }
                        setShowAddForm(!showAddForm);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                    >
                      {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      {showAddForm ? 'Cancel' : 'Add Bike'}
                    </button>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {showAddForm ? (
                    <motion.div 
                      key="add-bike-form"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="max-w-2xl mx-auto"
                    >
                      <form onSubmit={handleSubmit} className="space-y-8" noValidate>
                        {/* Colors Section */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-muted uppercase tracking-[0.2em] px-1">
                              Colors & Photos
                            </label>
                            
                            <div className="flex items-center gap-4">
                              <button 
                                type="button"
                                onClick={() => setShowColorManager(!showColorManager)}
                                className={cn(
                                  "text-xs font-bold flex items-center gap-1 transition-colors px-2 py-1 rounded-lg",
                                  showColorManager ? "bg-primary/10 text-primary" : "text-muted hover:text-primary"
                                )}
                              >
                                <Tag className="w-3 h-3" />
                                Color Manager
                              </button>
                              
                              <button 
                                type="button"
                                onClick={addColorDraft}
                                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" />
                                Add variant
                              </button>
                            </div>
                          </div>

                          {/* Color Manager UI Inline */}
                          <AnimatePresence>
                            {showColorManager && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden mb-6"
                              >
                                <div className="p-6 bg-muted/10 rounded-2xl border border-border space-y-6">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-bold uppercase tracking-widest text-muted">
                                      Dictionary Manager
                                    </h4>
                                    <button 
                                      type="button" 
                                      onClick={() => setShowColorManager(false)}
                                      className="p-1 hover:bg-muted rounded-full transition-colors"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input 
                                      placeholder="ID (e.g. matte_black)"
                                      className="h-10 px-4 rounded-xl bg-background border border-border outline-none focus:border-primary transition-all text-xs"
                                      value={newColorRef.id}
                                      onChange={e => setNewColorRef({...newColorRef, id: e.target.value})}
                                    />
                                    <input 
                                      placeholder="Display Name"
                                      className="h-10 px-4 rounded-xl bg-background border border-border outline-none focus:border-primary transition-all text-sm"
                                      value={newColorRef.displayName}
                                      onChange={e => setNewColorRef({...newColorRef, displayName: e.target.value})}
                                    />
                                    <div className="flex gap-2 md:col-span-2">
                                      <input 
                                        type="color"
                                        className="h-10 w-10 shrink-0 rounded-xl bg-background border border-border p-1 cursor-pointer"
                                        value={newColorRef.hexCode}
                                        onChange={e => setNewColorRef({...newColorRef, hexCode: e.target.value})}
                                      />
                                      <button 
                                        type="button"
                                        onClick={handleAddColorRef}
                                        disabled={loading || !newColorRef.id || !newColorRef.displayName}
                                        className="flex-grow h-10 bg-primary/20 text-primary rounded-xl font-bold hover:bg-primary hover:text-white transition-all text-xs disabled:opacity-50"
                                      >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Register Color'}
                                      </button>
                                    </div>
                                  </div>

                                  <div className="max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                                    <table className="w-full text-left">
                                      <tbody className="divide-y divide-border/20">
                                        {colorsReference.map(ref => (
                                          <tr key={ref.id} className="text-[10px]">
                                            <td className="py-2 font-mono text-muted">{ref.id}</td>
                                            <td className="py-2 font-bold">{ref.displayName}</td>
                                            <td className="py-2">
                                              <div className="w-3 h-3 rounded-full border border-border" style={{ backgroundColor: ref.hexCode }} />
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <div className="space-y-4">
                            {colorDrafts.map((color, colorIdx) => (
                              <div key={colorIdx} className="space-y-4 p-4 bg-surface border border-border rounded-2xl relative group">
                                <button 
                                  type="button"
                                  onClick={() => removeColorDraft(colorIdx)}
                                  className="absolute -top-2 -right-2 p-1.5 bg-background border border-border text-muted rounded-full hover:text-red-500 shadow-sm z-20"
                                >
                                  <X className="w-3 h-3" />
                                </button>

                                <div className="flex gap-4 items-start">
                                  <div className="flex-grow space-y-2">
                                    <label className="text-[10px] font-bold text-muted uppercase tracking-wider">
                                      Select Color
                                    </label>
                                    <select 
                                      className="w-full h-10 px-4 rounded-xl bg-background border border-border focus:border-primary outline-none transition-all text-sm font-medium"
                                      value={color.colorId}
                                      onChange={e => setColorDrafts(prev => prev.map((c, i) => i === colorIdx ? { ...c, colorId: e.target.value } : c))}
                                    >
                                      <option value="">Select Color</option>
                                      {colorsReference.map(ref => (
                                        <option key={ref.id} value={ref.id}>{ref.displayName}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <label className="text-[10px] font-bold text-muted uppercase tracking-wider">
                                    Photos for this color
                                  </label>
                                  <div className="flex flex-wrap gap-2">
                                    {color.previews.map((url, photoIdx) => (
                                      <div key={photoIdx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border group/photo">
                                        <img src={url} alt={`Color ${colorIdx} Photo ${photoIdx}`} className="w-full h-full object-cover" />
                                        <button 
                                          type="button"
                                          onClick={() => removeColorDraftPhoto(colorIdx, photoIdx)}
                                          className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover/photo:opacity-100 transition-opacity"
                                        >
                                          <X className="w-2 h-2" />
                                        </button>
                                      </div>
                                    ))}
                                    
                                    <button 
                                      type="button"
                                      onClick={() => document.getElementById(`color-photo-${colorIdx}`)?.click()}
                                      className="w-16 h-16 rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 flex flex-col items-center justify-center gap-1 transition-all group"
                                    >
                                      <Plus className="w-4 h-4 text-muted group-hover:text-primary" />
                                      <span className="text-[8px] font-bold text-muted uppercase tracking-wider">Add</span>
                                    </button>
                                  </div>
                                  <input 
                                    id={`color-photo-${colorIdx}`}
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleColorFileChange(colorIdx, e)}
                                  />
                                </div>
                              </div>
                            ))}

                            {colorDrafts.length === 0 && (
                              <div 
                                onClick={addColorDraft}
                                className="p-8 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-muted/30 transition-all text-muted"
                              >
                                <Plus className="w-8 h-8 opacity-20" />
                                <span className="text-sm font-bold opacity-50 uppercase tracking-widest">
                                  Click to add color
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* General Photos Section */}
                        <div className="space-y-4">
                          <label className="text-xs font-bold text-muted uppercase tracking-[0.2em] px-1">
                            General Photos
                          </label>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {generalPreviews.map((url, idx) => (
                              <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-border group">
                                <img src={url} alt={`General Preview ${idx}`} className="w-full h-full object-cover" />
                                <button 
                                  type="button"
                                  onClick={() => removeGeneralPhoto(idx)}
                                  className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full transition-opacity backdrop-blur-md"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                            
                            <button 
                              type="button"
                              onClick={() => document.getElementById('general-photos')?.click()}
                              className="aspect-square rounded-2xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 flex flex-col items-center justify-center gap-2 transition-all group"
                            >
                              <div className="w-8 h-8 bg-muted/50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Plus className="w-4 h-4 text-muted group-hover:text-primary" />
                              </div>
                              <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
                                Add
                              </span>
                            </button>
                          </div>

                          <input 
                            id="general-photos" 
                            type="file" 
                            multiple
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleGeneralFilesChange}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-muted uppercase tracking-[0.2em] px-1">
                              Name
                            </label>
                            <input 
                              required
                              className="w-full h-14 px-6 rounded-2xl bg-surface border border-border focus:border-primary outline-none transition-all font-medium"
                              value={formData.name || ''}
                              onChange={e => setFormData({...formData, name: e.target.value})}
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between items-center px-1">
                              <label className="text-xs font-bold text-muted uppercase tracking-[0.2em]">
                                Price Daily (IDR/day)
                              </label>
                            </div>
                            <input 
                              required
                              type="text"
                              className="w-full h-14 px-6 rounded-2xl bg-surface border border-border focus:border-primary outline-none transition-all font-medium"
                              value={(formData.pricePerDay || '').toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")}
                              onChange={e => {
                                const val = e.target.value.replace(/\s/g, '');
                                if (val === '' || /^\d+$/.test(val)) {
                                  setFormData({...formData, pricePerDay: parseInt(val) || 0});
                                }
                              }}
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between items-center px-1">
                              <label className="text-xs font-bold text-muted uppercase tracking-[0.2em]">
                                Price Weekly (per day)
                              </label>
                              <span className="text-[10px] text-muted font-bold">Total: {(formData.priceWeekly * 7).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} IDR</span>
                            </div>
                            <input 
                              required
                              type="text"
                              className="w-full h-14 px-6 rounded-2xl bg-surface border border-border focus:border-primary outline-none transition-all font-medium"
                              value={(formData.priceWeekly || '').toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")}
                              onChange={e => {
                                const val = e.target.value.replace(/\s/g, '');
                                if (val === '' || /^\d+$/.test(val)) {
                                  setFormData({...formData, priceWeekly: parseInt(val) || 0});
                                }
                              }}
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between items-center px-1">
                              <label className="text-xs font-bold text-muted uppercase tracking-[0.2em]">
                                Price Monthly (per day)
                              </label>
                              <span className="text-[10px] text-muted font-bold">Total: {(formData.priceMonthly * 30).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} IDR</span>
                            </div>
                            <input 
                              required
                              type="text"
                              className="w-full h-14 px-6 rounded-2xl bg-surface border border-border focus:border-primary outline-none transition-all font-medium"
                              value={(formData.priceMonthly || '').toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")}
                              onChange={e => {
                                const val = e.target.value.replace(/\s/g, '');
                                if (val === '' || /^\d+$/.test(val)) {
                                  setFormData({...formData, priceMonthly: parseInt(val) || 0});
                                }
                              }}
                            />
                          </div>

                          <div className="space-y-2">
                             <div className="flex justify-between items-end px-1">
                               <label className="text-xs font-bold text-muted uppercase tracking-[0.2em]">
                                 Promo Price
                               </label>
                               <button 
                                 type="button"
                                 onClick={() => setFormData({...formData, isPromoActive: !formData.isPromoActive})}
                                 className={cn(
                                   "flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all border",
                                   formData.isPromoActive ? "bg-primary/10 border-primary text-primary" : "bg-muted/10 border-border text-muted"
                                 )}
                               >
                                 <div className={cn("w-2 h-2 rounded-full", formData.isPromoActive ? "bg-primary animate-pulse" : "bg-muted")} />
                                 <span className="text-[10px] font-black uppercase tracking-widest">Activate Promo</span>
                               </button>
                             </div>
                            <input 
                              type="text"
                              placeholder="Leave blank for no promo"
                              className="w-full h-14 px-6 rounded-2xl bg-surface border border-border focus:border-primary outline-none transition-all font-medium"
                              value={(formData.promoPrice || '').toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")}
                              onChange={e => {
                                const val = e.target.value.replace(/\s/g, '');
                                if (val === '' || /^\d+$/.test(val)) {
                                  setFormData({...formData, promoPrice: parseInt(val) || 0});
                                }
                              }}
                            />
                          </div>

                          <div className="space-y-4">
                            <label className="text-xs font-bold text-muted uppercase tracking-[0.2em] px-1">
                              Types
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {['Popular', 'Beginner', 'Retro', 'Maxi', 'Budget'].map(type => (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() => {
                                    const currentTypes = Array.isArray(formData.type) ? formData.type : [formData.type].filter(Boolean);
                                    if (currentTypes.includes(type)) {
                                      setFormData({ ...formData, type: currentTypes.filter(t => t !== type) });
                                    } else {
                                      setFormData({ ...formData, type: [...currentTypes, type] });
                                    }
                                  }}
                                  className={cn(
                                    "px-4 py-2 rounded-xl text-xs font-bold border transition-all",
                                    (Array.isArray(formData.type) ? formData.type : [formData.type]).includes(type)
                                      ? "bg-primary border-primary text-white shadow-lg shadow-primary/20"
                                      : "bg-surface border-border text-muted hover:border-muted/50"
                                  )}
                                >
                                  {type}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-bold text-muted uppercase tracking-[0.2em] px-1">
                              Engine
                            </label>
                            <input 
                              required
                              type="number"
                              placeholder="e.g. 160"
                              className="w-full h-14 px-6 rounded-2xl bg-surface border border-border focus:border-primary outline-none transition-all font-medium"
                              value={formData.engineSize || ''}
                              onChange={e => {
                                const value = e.target.value;
                                setFormData({...formData, engineSize: value});
                              }}
                            />
                          </div>

                          {/* FOR WHOM (ДЛЯ КОГО) SLIDER */}
                          <div className="space-y-3">
                            <label className="text-xs font-bold text-muted uppercase tracking-[0.2em] px-1">
                              For Whom (Для кого)
                            </label>
                            <div className="space-y-1.5 p-3.5 bg-black/[0.015] border border-black/5 rounded-xl">
                              <div className="relative pt-1 pb-2">
                                {/* Slider bar background track */}
                                <div className="absolute h-1.5 w-full bg-black/10 rounded-full top-1/2 -translate-y-1/2" />
                                
                                {/* Slider filled track */}
                                <div 
                                  className="absolute h-1.5 bg-primary rounded-full top-1/2 -translate-y-1/2"
                                  style={{ width: `${((formData.bestFor || []).includes('Couple') ? 2 : 1) / 2 * 100}%` }}
                                />
                                
                                {/* Real slider control */}
                                <input
                                  type="range"
                                  min="1"
                                  max="2"
                                  step="1"
                                  value={(formData.bestFor || []).includes('Couple') ? 2 : 1}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    const current = formData.bestFor || [];
                                    if (val === 2) {
                                      if (!current.includes('Couple')) {
                                        setFormData({ ...formData, bestFor: [...current, 'Couple'] });
                                      }
                                    } else {
                                      setFormData({ ...formData, bestFor: current.filter(o => o !== 'Couple') });
                                    }
                                  }}
                                  className="relative w-full h-5 bg-transparent appearance-none cursor-pointer focus:outline-none z-10 accent-primary"
                                  style={{
                                    WebkitAppearance: 'none'
                                  }}
                                />
                                
                                {/* Slider visual ticks */}
                                <div className="relative h-6 mt-1.5 text-muted">
                                  <span 
                                    onClick={() => {
                                      const current = formData.bestFor || [];
                                      setFormData({ ...formData, bestFor: current.filter(o => o !== 'Couple') });
                                    }}
                                    style={{ left: '50%', transform: 'translateX(-50%)' }}
                                    className={cn(
                                      "absolute transition-all duration-200 cursor-pointer font-bold whitespace-nowrap", 
                                      !(formData.bestFor || []).includes('Couple') ? "text-primary text-xs md:text-sm scale-105" : "text-muted text-xs"
                                    )}
                                  >
                                    solo traveler
                                  </span>
                                  <span 
                                    onClick={() => {
                                      const current = formData.bestFor || [];
                                      if (!current.includes('Couple')) {
                                        setFormData({ ...formData, bestFor: [...current, 'Couple'] });
                                      }
                                    }}
                                    className={cn(
                                      "absolute right-1 transition-all duration-200 cursor-pointer font-bold whitespace-nowrap", 
                                      (formData.bestFor || []).includes('Couple') ? "text-primary text-xs md:text-sm scale-105" : "text-muted text-xs"
                                    )}
                                  >
                                    couple
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* FOR WHAT (ДЛЯ ЧЕГО) SLIDERS */}
                          <div className="space-y-3">
                            <label className="text-xs font-bold text-muted uppercase tracking-[0.2em] px-1">
                              For What (Для чего)
                            </label>
                            
                            <div className="space-y-2">
                              {/* CITY / BEACH SLIDER */}
                              <div className="p-3 bg-black/[0.015] border border-black/5 rounded-xl">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-bold text-foreground">
                                    City & beaches
                                  </span>
                                  <span className="text-xs font-semibold text-primary">
                                    {formData.bestForPercentages?.['City'] ?? ((formData.bestFor || []).includes('City') ? 100 : 0)}%
                                  </span>
                                </div>
                                <div className="relative flex items-center py-1">
                                  <div className="absolute h-1.5 w-full bg-black/10 rounded-full" />
                                  <div 
                                    className="absolute h-1.5 bg-primary rounded-full" 
                                    style={{ width: `${formData.bestForPercentages?.['City'] ?? ((formData.bestFor || []).includes('City') ? 100 : 0)}%` }} 
                                  />
                                  <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="25"
                                    value={formData.bestForPercentages?.['City'] ?? ((formData.bestFor || []).includes('City') ? 100 : 0)}
                                    onChange={(e) => handlePriorityChange('City', Number(e.target.value))}
                                    className="relative w-full h-4 bg-transparent appearance-none cursor-pointer focus:outline-none z-10 accent-primary"
                                    style={{ WebkitAppearance: 'none' }}
                                  />
                                </div>
                              </div>

                              {/* LONG TRIP SLIDER */}
                              <div className="p-3 bg-black/[0.015] border border-black/5 rounded-xl">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-bold text-foreground">
                                    Long trips
                                  </span>
                                  <span className="text-xs font-semibold text-primary">
                                    {formData.bestForPercentages?.['Long Trip'] ?? ((formData.bestFor || []).includes('Long Trip') ? 100 : 0)}%
                                  </span>
                                </div>
                                <div className="relative flex items-center py-1">
                                  <div className="absolute h-1.5 w-full bg-black/10 rounded-full" />
                                  <div 
                                    className="absolute h-1.5 bg-primary rounded-full" 
                                    style={{ width: `${formData.bestForPercentages?.['Long Trip'] ?? ((formData.bestFor || []).includes('Long Trip') ? 100 : 0)}%` }} 
                                  />
                                  <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="25"
                                    value={formData.bestForPercentages?.['Long Trip'] ?? ((formData.bestFor || []).includes('Long Trip') ? 100 : 0)}
                                    onChange={(e) => handlePriorityChange('Long Trip', Number(e.target.value))}
                                    className="relative w-full h-4 bg-transparent appearance-none cursor-pointer focus:outline-none z-10 accent-primary"
                                    style={{ WebkitAppearance: 'none' }}
                                  />
                                </div>
                              </div>

                              {/* PHOTO SLIDER */}
                              <div className="p-3 bg-black/[0.015] border border-black/5 rounded-xl">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-bold text-foreground">
                                    Aesthetics & photo
                                  </span>
                                  <span className="text-xs font-semibold text-primary">
                                    {formData.bestForPercentages?.['Photo'] ?? ((formData.bestFor || []).includes('Photo') ? 100 : 0)}%
                                  </span>
                                </div>
                                <div className="relative flex items-center py-1">
                                  <div className="absolute h-1.5 w-full bg-black/10 rounded-full" />
                                  <div 
                                    className="absolute h-1.5 bg-primary rounded-full" 
                                    style={{ width: `${formData.bestForPercentages?.['Photo'] ?? ((formData.bestFor || []).includes('Photo') ? 100 : 0)}%` }} 
                                  />
                                  <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="25"
                                    value={formData.bestForPercentages?.['Photo'] ?? ((formData.bestFor || []).includes('Photo') ? 100 : 0)}
                                    onChange={(e) => handlePriorityChange('Photo', Number(e.target.value))}
                                    className="relative w-full h-4 bg-transparent appearance-none cursor-pointer focus:outline-none z-10 accent-primary"
                                    style={{ WebkitAppearance: 'none' }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-x-4 gap-y-6 pt-8">
                            <div className="flex items-center justify-between px-1">
                              <label className="text-[10px] font-bold text-muted uppercase tracking-widest">ABS</label>
                              <button 
                                type="button"
                                onClick={() => setFormData({...formData, hasABS: !formData.hasABS})}
                                className={cn(
                                  "w-10 h-5 rounded-full transition-all relative",
                                  formData.hasABS ? "bg-primary" : "bg-muted"
                                )}
                              >
                                <div className={cn(
                                  "w-3.5 h-3.5 bg-white rounded-full absolute top-0.75 transition-all",
                                  formData.hasABS ? "left-5.5" : "left-1"
                                )} />
                              </button>
                            </div>

                            <div className="flex items-center justify-between px-1">
                              <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Trunk</label>
                              <button 
                                type="button"
                                onClick={() => setFormData({...formData, hasBigTrunk: !formData.hasBigTrunk})}
                                className={cn(
                                  "w-10 h-5 rounded-full transition-all relative",
                                  formData.hasBigTrunk ? "bg-primary" : "bg-muted"
                                )}
                              >
                                <div className={cn(
                                  "w-3.5 h-3.5 bg-white rounded-full absolute top-0.75 transition-all",
                                  formData.hasBigTrunk ? "left-5.5" : "left-1"
                                )} />
                              </button>
                            </div>

                            <div className="flex items-center justify-between px-1">
                              <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Phone</label>
                              <button 
                                type="button"
                                onClick={() => setFormData({...formData, hasPhoneHolder: !formData.hasPhoneHolder})}
                                className={cn(
                                  "w-10 h-5 rounded-full transition-all relative",
                                  formData.hasPhoneHolder ? "bg-primary" : "bg-muted"
                                )}
                              >
                                <div className={cn(
                                  "w-3.5 h-3.5 bg-white rounded-full absolute top-0.75 transition-all",
                                  formData.hasPhoneHolder ? "left-5.5" : "left-1"
                                )} />
                              </button>
                            </div>

                            <div className="flex items-center justify-between px-1">
                              <label className="text-[10px] font-bold text-muted uppercase tracking-widest">USB</label>
                              <button 
                                type="button"
                                onClick={() => setFormData({...formData, hasUSB: !formData.hasUSB})}
                                className={cn(
                                  "w-10 h-5 rounded-full transition-all relative",
                                  formData.hasUSB ? "bg-primary" : "bg-muted"
                                )}
                              >
                                <div className={cn(
                                  "w-3.5 h-3.5 bg-white rounded-full absolute top-0.75 transition-all",
                                  formData.hasUSB ? "left-5.5" : "left-1"
                                )} />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-muted uppercase tracking-[0.2em] px-1">
                            Description
                          </label>
                          <textarea 
                            className="w-full p-6 rounded-2xl bg-surface border border-border focus:border-primary outline-none transition-all min-h-[120px] font-medium resize-none"
                            value={formData.description || ''}
                            onChange={e => setFormData({...formData, description: e.target.value})}
                          />
                        </div>

                        <button 
                          type="submit"
                          disabled={loading}
                          className="w-full h-16 bg-primary text-white rounded-2xl font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-3"
                        >
                          {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : editingBikeId ? 'Update Bike' : 'Save Bike'}
                        </button>
                      </form>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="bike-list-table"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="bg-surface rounded-3xl border border-border overflow-hidden"
                    >
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                           <thead>
                            <tr className="bg-muted/10 border-b border-border">
                              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
                                Order
                              </th>
                              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
                                Bike
                              </th>
                              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
                                Type
                              </th>
                              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
                                Price (Day)
                              </th>
                              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
                                Promo Price
                              </th>
                              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
                                CC
                              </th>
                              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
                                ABS
                              </th>
                              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted text-right">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <Reorder.Group as="tbody" axis="y" values={bikes} onReorder={handleReorder} className="divide-y divide-border">
                            {loading && bikes.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="px-6 py-12 text-center">
                                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                                </td>
                              </tr>
                            ) : bikes.length > 0 ? (
                              bikes.map((bike, index) => (
                                <Reorder.Item 
                                  as="tr" 
                                  key={bike.id} 
                                  value={bike}
                                  className="hover:bg-muted/5 transition-colors group cursor-default"
                                >
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                      <div className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded-md text-muted hover:text-primary transition-all">
                                        <GripVertical className="w-4 h-4" />
                                      </div>
                                      <div className="flex flex-col gap-0.5">
                                        <button 
                                          disabled={index === 0}
                                          onClick={() => moveUp(index)}
                                          className="p-0.5 hover:bg-muted rounded-md disabled:opacity-0 transition-all text-muted hover:text-primary"
                                        >
                                          <ChevronUp className="w-3 h-3" />
                                        </button>
                                        <button 
                                          disabled={index === bikes.length - 1}
                                          onClick={() => moveDown(index)}
                                          className="p-0.5 hover:bg-muted rounded-md disabled:opacity-0 transition-all text-muted hover:text-primary"
                                        >
                                          <ChevronDown className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-12 h-12 bg-muted/20 rounded-xl overflow-hidden flex items-center justify-center">
                                        {bike.image ? (
                                          <img src={bike.image} alt={bike.name} className="w-full h-full object-cover" />
                                        ) : (
                                          <BikeIcon className="w-5 h-5 text-muted" />
                                        )}
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="font-bold text-sm">{bike.name}</span>
                                        <div className="flex items-baseline gap-0.5 text-[10px] text-muted font-mono">
                                          <span>{bike.engineSize}</span>
                                          <span className="text-[8px] opacity-70">cc</span>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 capitalize text-sm font-medium">
                                    {bike.type}
                                  </td>
                                  <td className="px-6 py-4 font-bold text-sm">
                                    {bike.pricePerDay?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")}
                                  </td>
                                  <td className="px-6 py-4 font-bold text-sm text-red-500">
                                    {bike.promoPrice ? bike.promoPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") : '-'}
                                  </td>
                                  <td className="px-6 py-4 font-mono text-xs text-muted">
                                    <div className="flex items-baseline gap-0.5">
                                      <span>{bike.engineSize}</span>
                                      <span className="text-[10px] opacity-70">cc</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    {bike.hasABS ? (
                                      <span className="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-[10px] font-bold">YES</span>
                                    ) : (
                                      <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-[10px] font-bold">-</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2 transition-opacity">
                                      {deletingBikeId === bike.id ? (
                                        <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-1">
                                          <button 
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              console.log('Кнопка Cancel нажата');
                                              setDeletingBikeId(null);
                                            }}
                                            className="px-2 py-1 text-[10px] font-bold text-muted hover:text-foreground transition-colors"
                                          >
                                            Cancel
                                          </button>
                                          <button 
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              console.log('Кнопка Confirm нажата для ID:', bike.id);
                                              handleDeleteBike(bike.id);
                                            }}
                                            className="px-3 py-1 bg-red-500 text-white rounded-lg text-[10px] font-bold shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all"
                                          >
                                            Confirm
                                          </button>
                                        </div>
                                      ) : (
                                        <>
                                          <button 
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleEditBike(bike);
                                            }}
                                            className="p-2 hover:bg-primary/10 text-primary rounded-xl transition-all"
                                            title="Edit"
                                          >
                                            <Edit className="w-4 h-4" />
                                          </button>
                                          <button 
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              console.log('Кнопка Trash нажата для ID:', bike.id);
                                              setDeletingBikeId(bike.id);
                                            }}
                                            className="p-2 hover:bg-red-50 text-red-500 rounded-xl transition-all"
                                            title="Delete"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </Reorder.Item>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-muted font-medium">
                                  No bikes uploaded
                                </td>
                              </tr>
                            )}
                          </Reorder.Group>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {activeTab === 'bookings' && (
              <motion.div 
                key="bookings-tab"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="w-full h-full space-y-6"
              >
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h3 className="text-lg font-bold">Booking Log</h3>
                    
                    {/* Sorting */}
                    <div className="flex items-center gap-2 bg-muted/20 p-1 rounded-xl border border-border/50 w-fit">
                      <select
                        className="bg-transparent text-[10px] font-bold uppercase tracking-wider outline-none px-2 py-1 cursor-pointer"
                        value={bookingSortField}
                        onChange={(e) => setBookingSortField(e.target.value as any)}
                      >
                        <option value="createdAt">By Creation Date</option>
                        <option value="startDate">By Rental Date</option>
                      </select>
                      <button
                        onClick={() => setBookingSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                        className="p-1.5 hover:bg-white rounded-lg transition-all text-muted hover:text-primary"
                        title={bookingSortOrder === 'asc' ? 'Sort Descending' : 'Sort Ascending'}
                      >
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Status Dashboard Grid */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-9 gap-2">
                      {['all', 'new', 'confirmed', 'handover', 'active', 'awaiting_return', 'completed', 'dispute', 'cancelled'].map((status) => {
                        const isActive = bookingFilterStatuses.includes(status);
                        const count = status === 'all' 
                          ? bookings.length 
                          : bookings.filter(b => (b.status || 'new') === status).length;

                        const statusConfig: Record<string, { label: string, color: string, activeColor: string, icon: any }> = {
                          new: { 
                            label: 'New', 
                            color: "bg-blue-50/30 text-blue-600 border-blue-100 hover:bg-blue-50", 
                            activeColor: "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20",
                            icon: Zap
                          },
                          confirmed: { 
                            label: 'Confirmed', 
                            color: "bg-green-50/30 text-green-600 border-green-100 hover:bg-green-50", 
                            activeColor: "bg-green-600 text-white border-green-600 shadow-lg shadow-green-500/20",
                            icon: Calendar
                          },
                          handover: { 
                            label: 'Handover', 
                            color: "bg-amber-50/30 text-amber-600 border-amber-100 hover:bg-amber-50", 
                            activeColor: "bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20",
                            icon: Send
                          },
                          active: { 
                            label: 'Active', 
                            color: "bg-primary/5 text-primary border-primary/10 hover:bg-primary/10", 
                            activeColor: "bg-primary text-white border-primary shadow-lg shadow-primary/20",
                            icon: BikeIcon
                          },
                          awaiting_return: { 
                            label: 'Retern', 
                            color: "bg-purple-50/30 text-purple-600 border-purple-100 hover:bg-purple-50", 
                            activeColor: "bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-500/20",
                            icon: ArrowRight
                          },
                          completed: { 
                            label: 'Done', 
                            color: "bg-gray-50/30 text-gray-500 border-gray-100 hover:bg-gray-50", 
                            activeColor: "bg-neutral-800 text-white border-neutral-800 shadow-lg shadow-black/20",
                            icon: X
                          },
                          dispute: { 
                            label: 'Dispute', 
                            color: "bg-red-50/30 text-red-600 border-red-100 hover:bg-red-50", 
                            activeColor: "bg-red-600 text-white border-red-600 shadow-lg shadow-red-500/20",
                            icon: Tag
                          },
                          cancelled: { 
                            label: 'Cancelled', 
                            color: "bg-slate-50/30 text-slate-500 border-slate-100 hover:bg-slate-50", 
                            activeColor: "bg-neutral-400 text-white border-neutral-400 shadow-lg shadow-slate-500/20",
                            icon: Trash2
                          },
                          all: { 
                            label: 'Total', 
                            color: "bg-white text-muted border-border hover:bg-muted/5", 
                            activeColor: "bg-white text-primary border-primary shadow-md ring-1 ring-primary/20 font-black",
                            icon: LayoutGrid
                          }
                        };

                        const config = statusConfig[status];
                        const Icon = config.icon;

                        return (
                          <button
                            key={status}
                            onClick={() => toggleStatusFilter(status)}
                            className={cn(
                              "flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 group text-center gap-1.5 min-h-[72px] relative overflow-hidden",
                              isActive ? config.activeColor : config.color
                            )}
                          >
                            <Icon className={cn(
                              "w-3 h-3 absolute top-2 right-2 opacity-20",
                              isActive ? "text-white" : ""
                            )} />
                            <span className={cn(
                              "text-[18px] font-black leading-none",
                              isActive ? "text-white" : "text-foreground"
                            )}>
                              {count}
                            </span>
                            <span className={cn(
                              "text-[7px] font-black uppercase tracking-widest leading-none",
                              isActive ? "text-white/70" : "text-muted"
                            )}>
                              {config.label}
                            </span>
                          </button>
                        );
                      })}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 py-2 border-b border-border/50">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted">Active Filters:</span>
                      <div className="flex flex-wrap gap-1">
                        {bookingFilterStatuses.map(s => (
                          <span key={s} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[8px] font-black uppercase">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-surface rounded-3xl border border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-muted/10 border-b border-border">
                          <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-wider text-muted w-[140px]">
                            Client
                          </th>
                          <th className="px-4 py-4 text-[9px] font-bold uppercase tracking-wider text-muted w-[120px]">
                            Timeline
                          </th>
                          <th className="px-4 py-4 text-[9px] font-bold uppercase tracking-wider text-muted w-[120px]">
                            Logistics
                          </th>
                          <th className="px-4 py-4 text-[9px] font-bold uppercase tracking-wider text-muted min-w-[130px] bg-primary/5">
                            Bike & Assignment
                          </th>
                          <th className="px-4 py-4 text-[9px] font-bold uppercase tracking-wider text-muted min-w-[130px] bg-primary/5">
                            Owner Settlement
                          </th>
                          <th className="px-4 py-4 text-[9px] font-bold uppercase tracking-wider text-muted min-w-[160px] bg-green-50/50">
                            P&L
                          </th>
                          <th className="px-8 py-4 text-[9px] font-bold uppercase tracking-wider text-muted text-center w-[110px]">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {loading ? (
                          <tr key="loading-bookings">
                            <td colSpan={7} className="px-6 py-12 text-center">
                              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                            </td>
                          </tr>
                        ) : (() => {
                          let filtered = [...bookings];
                          
                          // Filter
                          if (!bookingFilterStatuses.includes('all')) {
                            filtered = filtered.filter(b => bookingFilterStatuses.includes(b.status || 'new'));
                          }
                          
                          // Sort
                          filtered.sort((a, b) => {
                            let valA, valB;
                            
                            if (bookingSortField === 'createdAt') {
                              valA = a.createdAt?.seconds || (typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : 0);
                              valB = b.createdAt?.seconds || (typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : 0);
                            } else {
                              valA = a.startDate?.seconds || (typeof a.startDate === 'string' ? new Date(a.startDate).getTime() : 0);
                              valB = b.startDate?.seconds || (typeof b.startDate === 'string' ? new Date(b.startDate).getTime() : 0);
                            }
                            
                            return bookingSortOrder === 'asc' ? valA - valB : valB - valA;
                          });

                          if (filtered.length === 0) {
                            return (
                              <tr key="no-bookings">
                                <td colSpan={7} className="px-6 py-12 text-center text-muted font-medium">
                                  No bookings found
                                </td>
                              </tr>
                            );
                          }

                          return filtered.map((booking) => {
                            const getDaysLeft = (startDate: any) => {
                              if (!startDate) return null;
                              const start = typeof startDate === 'string' ? new Date(startDate) : new Date(startDate.seconds * 1000);
                              const now = new Date();
                              now.setHours(0, 0, 0, 0);
                              const startDay = new Date(start);
                              startDay.setHours(0, 0, 0, 0);
                              const diffTime = startDay.getTime() - now.getTime();
                              return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            };

                            const daysLeft = getDaysLeft(booking.startDate);
                            const formatDateWithTime = (date: any) => {
                              if (!date) return 'N/A';
                              const d = typeof date === 'string' ? new Date(date) : new Date(date.seconds * 1000);
                              const dateStr = d.toLocaleDateString();
                              const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                              return `${dateStr} ${timeStr !== '00:00' ? timeStr : ''}`;
                            };

                            const formatCompactDate = (date: any) => {
                              if (!date) return 'N/A';
                              const d = typeof date === 'string' ? new Date(date) : new Date(date.seconds * 1000);
                              const day = d.getDate().toString().padStart(2, '0');
                              const month = (d.getMonth() + 1).toString().padStart(2, '0');
                              return `${day}.${month}.`;
                            };

                            return (
                              <tr 
                                key={booking.id} 
                                className="hover:bg-muted/5 transition-colors cursor-pointer group border-b border-border/40"
                                onClick={() => setSelectedBooking(booking)}
                              >
                                <td className="px-6 py-5">
                                  <div className="flex flex-col gap-0.5 max-w-[130px]">
                                    <span className="font-bold text-xs truncate group-hover:text-primary transition-colors mb-0.5" title={booking.customerName || booking.name}>
                                      {booking.customerName || booking.name || 'Unknown'}
                                    </span>
                                    <div className="flex flex-col">
                                      <span className="text-[10px] text-muted font-bold truncate">
                                        {booking.customerPhone || booking.phone}
                                      </span>
                                      {getPhoneInfo(booking.customerPhone || booking.phone) && (
                                        <div className="flex items-center gap-1.5 text-[9px] leading-none mt-1" title={getPhoneInfo(booking.customerPhone || booking.phone)?.countryName}>
                                          <span className="font-black text-primary/80 uppercase tracking-tighter bg-primary/5 px-1 rounded-sm">{getPhoneInfo(booking.customerPhone || booking.phone)?.countryCode}</span>
                                          <span className="text-muted/40">•</span>
                                          <span className="text-muted/60 lowercase italic font-medium">{getPhoneInfo(booking.customerPhone || booking.phone)?.language}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                
                                <td className="px-4 py-5 whitespace-nowrap border-l border-border/20">
                                  <div className="flex items-start gap-4">
                                    <div className="flex flex-col leading-tight">
                                      <div className="flex items-center gap-1.5 text-[11px] font-black text-foreground">
                                        <Calendar className="w-2.5 h-2.5 text-primary flex-shrink-0" />
                                        <span>{formatCompactDate(booking.startDate)}</span>
                                        {booking.deliveryTime && <span className="text-primary font-black text-[9px] ml-1">@{booking.deliveryTime}</span>}
                                      </div>
                                      <div className="flex items-center gap-1.5 text-[10px] text-muted font-medium mt-0.5">
                                        <ArrowRight className="w-2.5 h-2.5 opacity-30 flex-shrink-0" />
                                        <span>{formatCompactDate(booking.endDate)}</span>
                                      </div>
                                      <div className="text-[9px] font-bold text-muted/60 mt-1 uppercase tracking-widest pl-4">
                                        {booking.days || booking.durationDays || 'N/A'} days
                                      </div>
                                    </div>
                                    {daysLeft !== null && (
                                      <div className="flex flex-col items-center justify-center min-w-[32px] h-[32px] rounded-lg bg-muted/5 border border-border/50">
                                        <span className={cn(
                                          "text-[10px] font-black leading-none",
                                          daysLeft < 0 ? "text-muted" :
                                          daysLeft < 2 ? "text-red-500" :
                                          daysLeft < 5 ? "text-amber-500" :
                                          "text-green-500"
                                        )}>
                                          {daysLeft < 0 ? 'Go' : daysLeft}
                                        </span>
                                        {daysLeft >= 0 && <span className="text-[7px] text-muted/40 font-black uppercase mt-0.5">Days</span>}
                                      </div>
                                    )}
                                  </div>
                                </td>

                                <td className="px-4 py-5">
                                  <a 
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.location || booking.selectedDistrict || '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group/loc flex flex-col gap-1 max-w-[110px] hover:opacity-80 transition-opacity"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="flex items-center gap-1.5 text-[10px] font-black text-foreground">
                                      <MapPin className="w-2.5 h-2.5 text-primary flex-shrink-0 group-hover/loc:scale-110 transition-transform" />
                                      <span className="truncate group-hover/loc:text-primary transition-colors">{booking.selectedDistrict || 'Local'}</span>
                                    </div>
                                    <span className="text-[9px] text-muted font-medium truncate italic tracking-tight group-hover/loc:text-primary transition-colors underline decoration-dotted underline-offset-2" title={booking.location}>
                                      {booking.location || 'N/A'}
                                    </span>
                                  </a>
                                </td>

                                <td className="px-4 py-5 bg-primary/5">
                                  <div className="flex flex-col gap-2 w-[130px]">
                                    <div className="flex flex-col">
                                      <span className="font-black text-[10px] uppercase tracking-wider text-foreground truncate">
                                        {booking.bikeName || booking.bikeId || 'N/A'}
                                      </span>
                                      <span className="text-[9px] font-bold text-primary italic">
                                        {formatPrice(booking.totalPrice || 0)} IDR
                                      </span>
                                    </div>
                                    <select 
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-[9px] font-black uppercase bg-white border border-primary/20 rounded shadow-sm px-2 py-1.5 outline-none focus:border-primary transition-all w-full truncate"
                                      value={booking.assignedListingId || ''}
                                      onChange={async (e) => {
                                        const listingId = e.target.value;
                                        try {
                                          await updateBooking(booking.id, { assignedListingId: listingId });
                                          setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, assignedListingId: listingId } : b));
                                        } catch (err) {
                                          console.error("Failed to assign bike", err);
                                        }
                                      }}
                                    >
                                      <option value="">No Unit Assigned</option>
                                      <optgroup label="Matched Models">
                                        {getFilteredListings(booking)
                                          .filter(l => l.bikeId === booking.bikeId)
                                          .map(listing => {
                                            const owner = owners.find(o => o.id === listing.ownerId);
                                            return (
                                              <option key={listing.id} value={listing.id}>
                                                {listing.licensePlate} ({owner?.name || 'Owner'})
                                              </option>
                                            );
                                          })
                                        }
                                      </optgroup>
                                      <optgroup label="Other Models">
                                        {getFilteredListings(booking)
                                          .filter(l => l.bikeId !== booking.bikeId)
                                          .map(listing => {
                                            const owner = owners.find(o => o.id === listing.ownerId);
                                            const bike = bikes.find(b => b.id === listing.bikeId);
                                            return (
                                              <option key={listing.id} value={listing.id}>
                                                {listing.licensePlate} - {bike?.name || 'Unknown'} ({owner?.name || 'Owner'})
                                              </option>
                                            );
                                          })
                                        }
                                      </optgroup>
                                    </select>
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <div className="flex flex-col gap-1.5 items-center w-full bg-muted/5 p-1.5 rounded-lg border border-border/30">
                                    <div className={cn(
                                      "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm inline-block w-full text-center border",
                                      booking.paymentTiming === 'now' 
                                        ? "bg-primary/10 text-primary border-primary/20" 
                                        : "bg-amber-50 text-amber-600 border-amber-100"
                                    )}>
                                      {booking.paymentTiming === 'now' ? 'Online' : 'On Delivery'}
                                    </div>
                                    <div className="pt-2 mt-1 border-t border-border/30 flex flex-col gap-1.5">
                                      <div className="flex items-center justify-between px-1">
                                        <div className="flex flex-col items-center gap-0.5" title="Client">
                                          <div className="w-4 h-4 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[7px] font-black shadow-sm text-slate-600">C</div>
                                        </div>
                                        <ArrowRight className="w-2.5 h-2.5 text-muted/30" />
                                        {booking.paymentMethod === 'cash' ? (
                                          <>
                                            <div className="flex flex-col items-center gap-0.5" title="Bike Owner">
                                              <div className={cn(
                                                "w-4 h-4 rounded-full border flex items-center justify-center text-[7px] font-black shadow-sm transition-all",
                                                booking.paymentStatus === 'paid' ? "bg-green-100 border-green-200 text-green-700" : 
                                                booking.paymentStatus === 'refunded' ? "bg-yellow-50 border-yellow-200 text-yellow-700" :
                                                "bg-red-50 border-red-200 text-red-700"
                                              )}>O</div>
                                            </div>
                                            <ArrowRight className="w-2.5 h-2.5 text-muted/30" />
                                            <div className="flex flex-col items-center gap-0.5" title="Platform (Me)">
                                              <div className={cn(
                                                "w-4 h-4 rounded-full border flex items-center justify-center text-[7px] font-black shadow-sm transition-all",
                                                booking.ownerSettlementStatus === 'paid' ? "bg-primary/20 border-primary/30 text-primary" : "bg-slate-50 border-border text-muted"
                                              )}>M</div>
                                            </div>
                                          </>
                                        ) : (
                                          <>
                                            <div className="flex flex-col items-center gap-0.5" title="Platform (Me)">
                                              <div className={cn(
                                                "w-4 h-4 rounded-full border flex items-center justify-center text-[7px] font-black shadow-sm transition-all",
                                                booking.paymentStatus === 'paid' ? "bg-primary/20 border-primary/30 text-primary" : "bg-primary/5 border-primary/10 text-primary/40"
                                              )}>M</div>
                                            </div>
                                            <ArrowRight className="w-2.5 h-2.5 text-muted/30" />
                                            <div className="flex flex-col items-center gap-0.5" title="Bike Owner">
                                              <div className={cn(
                                                "w-4 h-4 rounded-full border flex items-center justify-center text-[7px] font-black shadow-sm transition-all",
                                                booking.ownerSettlementStatus === 'paid' ? "bg-green-100 border-green-200 text-green-700" : "bg-orange-50 border-orange-200 text-orange-700"
                                              )}>O</div>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    <select 
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-[10px] font-black uppercase text-foreground bg-muted/20 rounded px-2 py-1 outline-none cursor-pointer hover:bg-muted/30 transition-colors w-full"
                                      value={booking.paymentMethod || 'cash'}
                                        onChange={async (e) => {
                                          try {
                                            await updateBookingPayment(booking.id, { paymentMethod: e.target.value });
                                            setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, paymentMethod: e.target.value } : b));
                                          } catch (error) {
                                            console.error("Failed to update payment method", error);
                                          }
                                        }}
                                      >
                                        {booking.paymentTiming === 'now' ? (
                                          <>
                                            <option value="apple">Apple Pay</option>
                                            <option value="card">Credit Card</option>
                                            <option value="bank">Virtual Account</option>
                                          </>
                                        ) : (
                                          <>
                                            <option value="cash">Cash</option>
                                            <option value="bank_id">Bank Transfer ID</option>
                                            <option value="sbp">СБП</option>
                                            <option value="crypto">Crypto</option>
                                          </>
                                        )}
                                      </select>
                                    
                                    <div className="flex flex-col gap-1 w-full">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[7px] font-bold text-muted uppercase">Client</span>
                                        <select 
                                          onClick={(e) => e.stopPropagation()}
                                          className={cn(
                                            "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tight outline-none border transition-all cursor-pointer shadow-sm w-[70px]",
                                            booking.paymentStatus === 'paid' ? "bg-green-600 text-white border-transparent" :
                                            booking.paymentStatus === 'refunded' ? "bg-yellow-500 text-white border-transparent" :
                                            "bg-red-600 text-white border-transparent"
                                          )}
                                          value={booking.paymentStatus || 'unpaid'}
                                          onChange={async (e) => {
                                            try {
                                              await updateBookingPayment(booking.id, { paymentStatus: e.target.value });
                                              setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, paymentStatus: e.target.value } : b));
                                            } catch (error) {
                                              console.error("Failed to update payment status", error);
                                            }
                                          }}
                                        >
                                          <option value="unpaid">Unpaid</option>
                                          <option value="paid">Paid</option>
                                          <option value="refunded">Refunded</option>
                                        </select>
                                      </div>

                                      <div className="flex items-center justify-between">
                                        <span className="text-[7px] font-bold text-muted uppercase">Owner</span>
                                        <select 
                                          onClick={(e) => e.stopPropagation()}
                                          className={cn(
                                            "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tight outline-none border transition-all cursor-pointer shadow-sm w-[70px]",
                                            booking.ownerSettlementStatus === 'paid' ? "bg-green-600 text-white border-transparent" :
                                            "bg-orange-500 text-white border-transparent"
                                          )}
                                          value={booking.ownerSettlementStatus || 'pending'}
                                          onChange={async (e) => {
                                            try {
                                              await updateBookingPayment(booking.id, { ownerSettlementStatus: e.target.value });
                                              setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, ownerSettlementStatus: e.target.value } : b));
                                            } catch (error) {
                                              console.error("Failed to update owner settlement status", error);
                                            }
                                          }}
                                        >
                                          <option value="pending">Pending</option>
                                          <option value="paid">Settled</option>
                                        </select>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-5 bg-green-50/20">
                                  {(() => {
                                    const listing = listings.find(l => l.id === booking.assignedListingId);
                                    const bike = bikes.find(b => b.id === (listing?.bikeId || booking.bikeId));
                                    
                                    let ownerDayRate = 0;
                                    const daysCount = booking.days || booking.durationDays || 0;
                                    
                                    if (listing) {
                                      if (daysCount >= 30) ownerDayRate = listing.priceMonthly || listing.priceWeekly || listing.pricePerDay || 0;
                                      else if (daysCount >= 7) ownerDayRate = listing.priceWeekly || listing.pricePerDay || 0;
                                      else ownerDayRate = listing.pricePerDay || 0;
                                    } else if (bike) {
                                      if (daysCount >= 30) ownerDayRate = bike.priceMonthly || bike.priceWeekly || bike.pricePerDay || 0;
                                      else if (daysCount >= 7) ownerDayRate = bike.priceWeekly || bike.pricePerDay || 0;
                                      else ownerDayRate = bike.pricePerDay || 0;
                                    }
                                    
                                    const ownerTotal = ownerDayRate * daysCount;
                                    const total = booking.totalPrice || 0;
                                    const profit = total - ownerTotal;
                                    
                                    return (
                                      <div className="flex flex-col gap-1.5 min-w-[120px]">
                                        <div className="space-y-0.5 px-1">
                                          <div className="flex justify-between items-center">
                                            <span className="text-[7px] font-black text-muted/60 uppercase tracking-tighter">Total</span>
                                            <span className="text-[10px] font-black text-foreground">{formatPrice(total)}</span>
                                          </div>
                                          <div className="flex justify-between items-center opacity-70">
                                            <span className="text-[7px] font-black text-muted/40 uppercase tracking-tighter">Owner</span>
                                            <div className="flex items-center gap-1">
                                              <span className={cn(
                                                "text-[9px] font-bold transition-colors",
                                                booking.ownerSettlementStatus === 'paid' ? "text-green-600" : "text-amber-600"
                                              )}>
                                                {formatPrice(ownerTotal)}
                                              </span>
                                              {booking.ownerSettlementStatus === 'paid' && <Check className="w-2.5 h-2.5 text-green-600 animate-in zoom-in duration-300" />}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="px-2 py-1.5 rounded-lg bg-white border border-border/40 shadow-sm flex justify-between items-center">
                                          <span className="text-[7px] font-black text-primary/60 uppercase tracking-tighter">Profit</span>
                                          <span className={cn(
                                            "text-[11px] font-black", 
                                            profit >= 0 ? "text-green-600" : "text-red-500"
                                          )}>
                                            {profit > 0 ? '+' : ''}{formatPrice(profit)}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </td>
                                  <td className="px-8 py-4 whitespace-nowrap">
                                    <div className="flex flex-col gap-1 items-center">
                                      <select 
                                        onClick={(e) => e.stopPropagation()}
                                        className={cn(
                                          "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest outline-none border border-transparent transition-all cursor-pointer shadow-md",
                                          booking.status === 'new' ? "bg-blue-600 text-white shadow-blue-500/20" :
                                          booking.status === 'confirmed' ? "bg-green-600 text-white shadow-green-500/20" :
                                          booking.status === 'handover' ? "bg-amber-500 text-white shadow-amber-500/20" :
                                          booking.status === 'active' ? "bg-primary text-white shadow-primary/20 shadow-lg" :
                                          booking.status === 'awaiting_return' ? "bg-purple-600 text-white shadow-purple-500/20" :
                                          booking.status === 'completed' ? "bg-neutral-800 text-white shadow-black/20" :
                                          booking.status === 'dispute' ? "bg-red-600 text-white shadow-red-500/20" :
                                          booking.status === 'cancelled' ? "bg-neutral-400 text-white shadow-slate-500/20" :
                                          "bg-muted text-white shadow-sm"
                                        )}
                                        value={booking.status || 'new'}
                                        onChange={(e) => handleBookingStatusChange(booking.id, e.target.value)}
                                      >
                                        <option value="new">New</option>
                                        <option value="confirmed">Confirmed</option>
                                        <option value="handover">Handover</option>
                                        <option value="active">Active</option>
                                        <option value="awaiting_return">Retern</option>
                                        <option value="completed">Done</option>
                                        <option value="dispute">Dispute</option>
                                        <option value="cancelled">Cancelled</option>
                                      </select>
                                    </div>
                                  </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Booking Detail Modal */}
                <AnimatePresence>
                  {selectedBooking && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedBooking(null)}
                        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-2xl bg-surface border border-border rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                      >
                        {/* Header */}
                        <div className="p-6 border-b border-border flex items-center justify-between bg-muted/5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <ClipboardList className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold">Booking Details</h3>
                              <p className="text-[10px] text-muted uppercase font-bold tracking-widest">Order ID: {selectedBooking.id}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => setSelectedBooking(null)}
                            className="p-2 hover:bg-muted rounded-full transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Content */}
                        <div className="p-8 overflow-y-auto space-y-8">
                          {/* Status and Summary */}
                          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-muted/20 rounded-2xl border border-border/50">
                            <div className="flex items-center gap-4">
                              <div className="flex flex-col">
                                <span className="text-[10px] text-muted font-bold uppercase tracking-wider">Status</span>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {[
                                    { id: 'new', label: 'New', color: 'blue' },
                                    { id: 'confirmed', label: 'Confirmed', color: 'green' },
                                    { id: 'handover', label: 'Handover', color: 'amber' },
                                    { id: 'active', label: 'Active', color: 'primary' },
                                    { id: 'awaiting_return', label: 'Retern', color: 'purple' },
                                    { id: 'completed', label: 'Done', color: 'gray' },
                                    { id: 'dispute', label: 'Dispute', color: 'red' },
                                    { id: 'cancelled', label: 'Cancelled', color: 'slate' }
                                  ].map((s) => {
                                    const lifecycle = ['new', 'confirmed', 'handover', 'active', 'awaiting_return', 'completed'];
                                    const currentIndex = lifecycle.indexOf(selectedBooking.status);
                                    const itemIndex = lifecycle.indexOf(s.id);
                                    const isSpecial = s.id === 'dispute' || s.id === 'cancelled';
                                    const isPast = !isSpecial && currentIndex > itemIndex && itemIndex !== -1;
                                    const isActive = selectedBooking.status === s.id;
                                    
                                    return (
                                      <button
                                        key={s.id}
                                        type="button"
                                        onClick={async () => {
                                          handleBookingStatusChange(selectedBooking.id, s.id);
                                          setSelectedBooking({...selectedBooking, status: s.id});
                                        }}
                                        className={cn(
                                          "px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all border shrink-0",
                                          isActive 
                                            ? s.color === 'primary' ? "bg-primary text-white border-primary shadow-sm" : 
                                              s.color === 'blue' ? "bg-blue-600 text-white border-blue-700 shadow-sm" :
                                              s.color === 'green' ? "bg-green-600 text-white border-green-700 shadow-sm" :
                                              s.color === 'amber' ? "bg-amber-500 text-white border-amber-600 shadow-sm" :
                                              s.color === 'purple' ? "bg-purple-600 text-white border-purple-700 shadow-sm" :
                                              s.color === 'red' ? "bg-red-600 text-white border-red-700 shadow-sm" :
                                              s.color === 'slate' ? "bg-slate-600 text-white border-slate-700 shadow-sm" :
                                              "bg-gray-600 text-white border-gray-700 shadow-sm"
                                            : isPast 
                                              ? "bg-muted/10 text-muted/40 border-muted/10"
                                              : "bg-surface text-foreground/60 border-border hover:border-primary/30 hover:text-primary"
                                        )}
                                      >
                                        {s.label}
                                      </button>
                                    );
                                  })}
                                </div>
                                {(selectedBooking.status === 'dispute' || selectedBooking.disputeComment) && (
                                  <motion.div 
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-4 p-4 bg-red-50 border border-red-100 rounded-2xl space-y-2"
                                  >
                                    <div className="flex items-center gap-2 text-red-600">
                                      <MessageSquare className="w-3.5 h-3.5" />
                                      <span className="text-[10px] font-bold uppercase tracking-wider">Dispute Comments</span>
                                    </div>
                                    <textarea
                                      className="w-full bg-white border border-red-200 rounded-xl p-3 text-xs min-h-[80px] focus:border-red-400 outline-none transition-all placeholder:text-red-300"
                                      placeholder="Describe the issue, damage, or dispute details..."
                                      value={selectedBooking.disputeComment || ''}
                                      onChange={async (e) => {
                                        const comment = e.target.value;
                                        setSelectedBooking({ ...selectedBooking, disputeComment: comment });
                                      }}
                                      onBlur={async (e) => {
                                        const comment = e.target.value;
                                        try {
                                          await updateBooking(selectedBooking.id, { disputeComment: comment });
                                          setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, disputeComment: comment } : b));
                                        } catch (err) {
                                          console.error("Failed to save dispute comment", err);
                                        }
                                      }}
                                    />
                                    <p className="text-[9px] text-red-400 italic">Comments are saved automatically when you click outside the box.</p>
                                  </motion.div>
                                )}
                                {selectedBooking.status === 'active' && selectedBooking.paymentTiming === 'now' && (
                                  <div className="mt-2 text-[9px] font-bold text-primary flex items-center gap-1 bg-primary/5 px-2 py-1 rounded-lg border border-primary/10">
                                    <Zap className="w-3 h-3" />
                                    <span>Remind: Transfer funds to owner</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-muted font-bold uppercase tracking-wider block">Created</span>
                              <span className="text-xs font-medium">
                                {selectedBooking.createdAt ? (typeof selectedBooking.createdAt === 'string' ? new Date(selectedBooking.createdAt).toLocaleString() : new Date(selectedBooking.createdAt.seconds * 1000).toLocaleString()) : 'N/A'}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Left Column: Client and Bike */}
                            <div className="space-y-6">
                              <section className="space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-[0.1em] text-primary flex items-center gap-2">
                                  <User className="w-3.5 h-3.5" />
                                  Client Info
                                </h4>
                                <div className="space-y-1">
                                  <p className="text-base font-bold">{selectedBooking.customerName || selectedBooking.name || 'N/A'}</p>
                                  <div className="flex items-center gap-2 text-sm text-foreground/80">
                                    <Phone className="w-3.5 h-3.5 text-muted" />
                                    <span>{selectedBooking.customerPhone || selectedBooking.phone || 'N/A'}</span>
                                  </div>
                                  {getPhoneInfo(selectedBooking.customerPhone || selectedBooking.phone) && (
                                    <div className="flex items-center gap-2 text-xs">
                                      <div className="w-3.5" />
                                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/5 rounded border border-primary/10">
                                        <span className="font-bold text-primary text-[10px] uppercase">
                                          {getPhoneInfo(selectedBooking.customerPhone || selectedBooking.phone)?.countryName}
                                        </span>
                                        <span className="text-muted/40 text-[10px]">•</span>
                                        <span className="text-muted italic text-[10px]">
                                          {getPhoneInfo(selectedBooking.customerPhone || selectedBooking.phone)?.language}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                  {(selectedBooking.customerEmail || selectedBooking.email) && (
                                    <div className="flex items-center gap-2 text-sm text-foreground/80">
                                      <Mail className="w-3.5 h-3.5 text-muted" />
                                      <span>{selectedBooking.customerEmail || selectedBooking.email}</span>
                                    </div>
                                  )}
                                </div>
                              </section>

                              <section className="space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-[0.1em] text-primary flex items-center gap-2">
                                  <BikeIcon className="w-3.5 h-3.5" />
                                  Rental Item
                                </h4>
                                <div className="space-y-2">
                                  <p className="text-base font-bold">{selectedBooking.bikeName || selectedBooking.bikeId || 'N/A'}</p>
                                  <div className="flex flex-wrap gap-2">
                                    {selectedBooking.selectedColor && (
                                      <div className="flex items-center gap-2 px-2.5 py-1 bg-surface border border-border rounded-lg">
                                        <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: selectedBooking.selectedColor.value }} />
                                        <span className="text-[10px] font-bold uppercase">{selectedBooking.selectedColor.name}</span>
                                      </div>
                                    )}
                                    <div className="px-2.5 py-1 bg-muted/20 border border-border/50 rounded-lg">
                                      <span className="text-[10px] font-bold uppercase">{selectedBooking.days || selectedBooking.durationDays} Days</span>
                                    </div>
                                  </div>
                                  <div className="pt-2">
                                    <p className="text-[10px] text-muted font-bold uppercase tracking-wider mb-1">Assigned Bike (Unit)</p>
                                    <div className="flex gap-2">
                                      <select 
                                        className="text-xs font-bold uppercase outline-none bg-muted/20 px-3 py-2 rounded-xl border border-transparent focus:border-primary/30 transition-all cursor-pointer flex-1"
                                        value={selectedBooking.assignedListingId || ''}
                                        onChange={async (e) => {
                                          const listingId = e.target.value;
                                          try {
                                            await updateBooking(selectedBooking.id, { assignedListingId: listingId });
                                            setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, assignedListingId: listingId } : b));
                                            setSelectedBooking({...selectedBooking, assignedListingId: listingId});
                                          } catch (err) {
                                            console.error("Failed to assign bike", err);
                                          }
                                        }}
                                      >
                                        <option value="">No bike assigned</option>
                                        {/* Exact model matches */}
                                        <optgroup label="Recommended (Matches Model)">
                                          {getFilteredListings(selectedBooking)
                                            .filter(l => l.bikeId === selectedBooking.bikeId)
                                            .map(listing => {
                                              const owner = owners.find(o => o.id === listing.ownerId);
                                              return (
                                                <option key={listing.id} value={listing.id}>
                                                  {listing.licensePlate} ({owner?.name || 'Unknown'})
                                                </option>
                                              );
                                            })
                                          }
                                        </optgroup>
                                        {/* Other models */}
                                        <optgroup label="Other Available Units">
                                          {getFilteredListings(selectedBooking)
                                            .filter(l => l.bikeId !== selectedBooking.bikeId)
                                            .map(listing => {
                                              const owner = owners.find(o => o.id === listing.ownerId);
                                              const bike = bikes.find(b => b.id === listing.bikeId);
                                              return (
                                                <option key={listing.id} value={listing.id}>
                                                  {listing.licensePlate} - {bike?.name || 'Unknown'} ({owner?.name || 'Unknown'})
                                                </option>
                                              );
                                            })
                                          }
                                        </optgroup>
                                      </select>
                                    </div>
                                  </div>
                                </div>
                              </section>

                              <section className="space-y-2 pt-2 border-t border-border/30">
                                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5 opacity-70">
                                  <MapPin className="w-3 h-3" />
                                  Delivery Location
                                </h4>
                                <div className="space-y-2">
                                  <div className="px-1.5 py-0.5 bg-primary/5 text-primary text-[7px] font-black uppercase tracking-wider rounded inline-block border border-primary/10">
                                    {selectedBooking.selectedDistrict || 'Local area'}
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <p className="text-xs font-medium leading-tight text-foreground/80">
                                      {selectedBooking.location || 'No specific location provided'}
                                    </p>
                                    {selectedBooking.location && (
                                      <a 
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedBooking.location)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-primary hover:underline underline-offset-4 decoration-primary/30"
                                      >
                                        <ExternalLink className="w-2.5 h-2.5" />
                                        Open in Google Maps
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </section>

                              {(selectedBooking.helmet1Size || selectedBooking.helmet2Size || selectedBooking.surfRack) && (
                                <section className="space-y-3 pt-6 border-t border-border/30">
                                  <h4 className="text-xs font-bold uppercase tracking-[0.1em] text-primary flex items-center gap-2">
                                    <Zap className="w-3.5 h-3.5" />
                                    Extras & Equipment
                                  </h4>
                                  <div className="space-y-2">
                                    {selectedBooking.helmet1Size && (
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted">Helmet 1</span>
                                        <span className="font-bold uppercase tracking-wider bg-muted/30 px-2.5 py-1 rounded-lg border border-border/50 text-[10px]">
                                          Size: {selectedBooking.helmet1Size}
                                        </span>
                                      </div>
                                    )}
                                    {selectedBooking.helmet2Size && (
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted">Helmet 2</span>
                                        <span className="font-bold uppercase tracking-wider bg-muted/30 px-2.5 py-1 rounded-lg border border-border/50 text-[10px]">
                                          Size: {selectedBooking.helmet2Size}
                                        </span>
                                      </div>
                                    )}
                                    {selectedBooking.surfRack && (
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted">Surf Rack</span>
                                        <span className="font-bold uppercase text-[9px] bg-primary/10 text-primary px-2.5 py-1 rounded-lg border border-primary/20">
                                          Requested
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </section>
                              )}
                            </div>

                            {/* Right Column: Logistics and Payment */}
                            <div className="space-y-6">
                              <section className="space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-[0.1em] text-primary flex items-center gap-2">
                                  <Calendar className="w-3.5 h-3.5" />
                                  Rental Period
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-[10px] text-muted font-bold uppercase tracking-wider">Start</p>
                                    <p className="text-sm font-medium">
                                      {selectedBooking.startDate ? (typeof selectedBooking.startDate === 'string' ? new Date(selectedBooking.startDate).toLocaleDateString() : new Date(selectedBooking.startDate.seconds * 1000).toLocaleDateString()) : 'N/A'}
                                    </p>
                                    <p className="text-[10px] font-bold text-primary mt-0.5">
                                      {selectedBooking.deliveryTime ? `Time: ${selectedBooking.deliveryTime}` : (selectedBooking.startDate ? (typeof selectedBooking.startDate === 'string' ? new Date(selectedBooking.startDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : new Date(selectedBooking.startDate.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})) : '')}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-muted font-bold uppercase tracking-wider">End</p>
                                    <p className="text-sm font-medium">
                                      {selectedBooking.endDate ? (typeof selectedBooking.endDate === 'string' ? new Date(selectedBooking.endDate).toLocaleDateString() : new Date(selectedBooking.endDate.seconds * 1000).toLocaleDateString()) : 'N/A'}
                                    </p>
                                    <p className="text-[10px] font-bold text-primary mt-0.5">
                                      {selectedBooking.endDate ? (typeof selectedBooking.endDate === 'string' ? new Date(selectedBooking.endDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : new Date(selectedBooking.endDate.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})) : ''}
                                    </p>
                                  </div>
                                </div>
                                {selectedBooking.paymentId && (
                                  <div className="mt-3 pt-2 border-t border-border/30">
                                    <p className="text-[9px] text-muted font-bold uppercase tracking-[0.2em]">Ref ID</p>
                                    <p className="text-[10px] font-mono font-bold text-foreground/70 uppercase select-all tracking-wider">{selectedBooking.paymentId}</p>
                                  </div>
                                )}
                              </section>

                              <section className="space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-[0.1em] text-primary flex items-center gap-2">
                                  <Tag className="w-3.5 h-3.5" />
                                  Pricing
                                </h4>
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted">Total Price</span>
                                    <span className="font-bold text-lg text-primary">IDR {formatPrice(selectedBooking.totalPrice || 0)}</span>
                                  </div>
                                  
                                  <div className="flex flex-col gap-0.5 border-t border-dashed border-border/30 mt-1 pt-1">
                                    <div className={cn(
                                      "flex justify-between items-center text-[11px] transition-all px-1.5 py-0.5 rounded-lg",
                                      selectedBooking.paymentMethod === 'sbp' ? "bg-purple-100/50 text-purple-700 ring-1 ring-purple-200" : "text-muted-foreground/60"
                                    )}>
                                      <span className="uppercase tracking-widest text-[8px] font-bold">RUB Eq.</span>
                                      <span className="font-bold">{getRUB(selectedBooking.totalPrice || 0)}</span>
                                    </div>
                                    <div className={cn(
                                      "flex justify-between items-center text-[11px] transition-all px-1.5 py-0.5 rounded-lg",
                                      selectedBooking.paymentMethod === 'crypto' ? "bg-green-100/50 text-green-700 ring-1 ring-green-200" : "text-muted-foreground/60"
                                    )}>
                                      <span className="uppercase tracking-widest text-[8px] font-bold">USDT Eq.</span>
                                      <span className="font-bold">{getUSDT(selectedBooking.totalPrice || 0)}</span>
                                    </div>
                                  </div>
                                  
                                  {(() => {
                                    const listing = listings.find(l => l.id === selectedBooking.assignedListingId);
                                    const bike = bikes.find(b => b.id === (listing?.bikeId || selectedBooking.bikeId));
                                    
                                    let ownerDayRate = 0;
                                    const daysCount = selectedBooking.days || selectedBooking.durationDays || 0;
                                    
                                    if (listing) {
                                      if (daysCount >= 30) ownerDayRate = listing.priceMonthly || listing.priceWeekly || listing.pricePerDay || 0;
                                      else if (daysCount >= 7) ownerDayRate = listing.priceWeekly || listing.pricePerDay || 0;
                                      else ownerDayRate = listing.pricePerDay || 0;
                                    } else if (bike) {
                                      if (daysCount >= 30) ownerDayRate = bike.priceMonthly || bike.priceWeekly || bike.pricePerDay || 0;
                                      else if (daysCount >= 7) ownerDayRate = bike.priceWeekly || bike.pricePerDay || 0;
                                      else ownerDayRate = bike.pricePerDay || 0;
                                    }
                                    
                                    const ownerTotal = ownerDayRate * daysCount;
                                    const profit = (selectedBooking.totalPrice || 0) - ownerTotal;
                                    
                                    return (
                                      <div className="space-y-1 mt-2 pt-2 border-t border-dashed border-border/50">
                                        <div className="flex justify-between items-center text-[10px]">
                                          <span className="text-muted font-bold uppercase tracking-wider">Owner Payout</span>
                                          <span className="font-bold text-amber-600">IDR {formatPrice(ownerTotal)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[10px]">
                                          <span className="text-muted font-bold uppercase tracking-wider">Platform Profit</span>
                                          <span className={cn(
                                            "font-bold",
                                            profit >= 0 ? "text-green-600" : "text-red-600"
                                          )}>IDR {formatPrice(profit)}</span>
                                        </div>
                                      </div>
                                    );
                                  })()}

                                  {selectedBooking.deposit && (
                                    <div className="flex justify-between items-center text-xs">
                                      <span className="text-muted text-[10px] uppercase font-bold">Security Deposit</span>
                                      <span className="font-medium">IDR {formatPrice(selectedBooking.deposit || 0)}</span>
                                    </div>
                                  )}

                                  <div className="pt-3 border-t border-border/50 mt-3 space-y-3">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[10px] text-muted font-bold uppercase tracking-wider">Payment Timing</span>
                                      <span className={cn(
                                        "text-[10px] font-bold uppercase py-1 px-2 rounded-lg",
                                        selectedBooking.paymentTiming === 'now' ? "bg-primary/10 text-primary" : "bg-amber-50 text-amber-600 border border-amber-100"
                                      )}>
                                        {selectedBooking.paymentTiming === 'now' ? 'Online' : 'On Delivery'}
                                      </span>
                                    </div>

                                    {/* Flow visual in detail view */}
                                    <div className="bg-muted/10 p-3 rounded-xl border border-border/50 space-y-3">
                                      <span className="text-[10px] text-muted font-bold uppercase tracking-wider block text-center">Settlement Flow</span>
                                      <div className="flex items-center justify-between px-4">
                                        <div className="flex flex-col items-center gap-1">
                                          <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center text-xs font-black shadow-sm text-slate-600">C</div>
                                          <span className="text-[8px] font-black text-muted uppercase">Client</span>
                                        </div>

                                        <ArrowRight className="w-4 h-4 text-muted/30" />

                                        {selectedBooking.paymentMethod === 'cash' ? (
                                          <>
                                            <div className="flex flex-col items-center gap-1">
                                              <div className={cn(
                                                "w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-black shadow-sm transition-all",
                                                selectedBooking.paymentStatus === 'paid' ? "bg-green-100 border-green-300 text-green-700" : 
                                                selectedBooking.paymentStatus === 'refunded' ? "bg-yellow-50 border-yellow-300 text-yellow-700" :
                                                "bg-red-50 border-red-300 text-red-700"
                                              )}>O</div>
                                              <span className="text-[8px] font-black text-muted uppercase">Owner</span>
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-muted/30" />
                                            <div className="flex flex-col items-center gap-1">
                                              <div className={cn(
                                                "w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-black shadow-sm transition-all",
                                                selectedBooking.ownerSettlementStatus === 'paid' ? "bg-primary/20 border-primary/40 text-primary" : "bg-slate-50 border-slate-300 text-muted"
                                              )}>M</div>
                                              <span className="text-[8px] font-black text-muted uppercase tracking-tighter">Platform</span>
                                            </div>
                                          </>
                                        ) : (
                                          <>
                                            <div className="flex flex-col items-center gap-1">
                                              <div className={cn(
                                                "w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-black shadow-sm transition-all",
                                                selectedBooking.paymentStatus === 'paid' ? "bg-primary/20 border-primary/40 text-primary" : "bg-primary/5 border-primary/20 text-primary/40"
                                              )}>M</div>
                                              <span className="text-[8px] font-black text-muted uppercase tracking-tighter">Platform</span>
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-muted/30" />
                                            <div className="flex flex-col items-center gap-1">
                                              <div className={cn(
                                                "w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-black shadow-sm transition-all",
                                                selectedBooking.ownerSettlementStatus === 'paid' ? "bg-green-100 border-green-300 text-green-700" : "bg-orange-50 border-orange-300 text-orange-700"
                                              )}>O</div>
                                              <span className="text-[8px] font-black text-muted uppercase">Owner</span>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                      <div className="text-[8px] text-center text-muted font-bold italic opacity-60">
                                        {selectedBooking.paymentMethod === 'cash' 
                                          ? "Cash collected by Owner, then settled to Platform" 
                                          : `Payment via ${selectedBooking.paymentMethod} to Platform, then settled to Owner`}
                                      </div>
                                    </div>

                                    <div className="flex justify-between items-center">
                                      <span className="text-[10px] text-muted font-bold uppercase tracking-wider">Payment Method</span>
                                      <select 
                                        className="text-xs font-bold uppercase outline-none bg-muted/20 px-2 py-1 rounded-lg border border-transparent focus:border-primary/30 transition-all cursor-pointer"
                                        value={selectedBooking.paymentMethod || 'cash'}
                                        onChange={async (e) => {
                                          const newMethod = e.target.value;
                                          try {
                                            await updateBookingPayment(selectedBooking.id, { paymentMethod: newMethod });
                                            setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, paymentMethod: newMethod } : b));
                                            setSelectedBooking({...selectedBooking, paymentMethod: newMethod});
                                          } catch (error) {
                                            console.error("Failed to update payment method", error);
                                          }
                                        }}
                                      >
                                        {selectedBooking.paymentTiming === 'now' ? (
                                          <>
                                            <option value="apple">Apple Pay</option>
                                            <option value="card">Credit Card</option>
                                            <option value="bank">Virtual Account</option>
                                          </>
                                        ) : (
                                          <>
                                            <option value="cash">Cash</option>
                                            <option value="bank_id">Bank Transfer ID</option>
                                            <option value="sbp">СБП</option>
                                            <option value="crypto">Crypto</option>
                                          </>
                                        )}
                                      </select>
                                    </div>

                                    <div className="flex justify-between items-center bg-muted/5 p-3 rounded-xl border border-border/50">
                                      <div className="space-y-1">
                                        <span className="text-[10px] text-muted font-bold uppercase tracking-wider block">Client Payment</span>
                                        <select 
                                          className={cn(
                                            "text-xs font-black uppercase outline-none px-3 py-1.5 rounded-full transition-all cursor-pointer shadow-sm",
                                            selectedBooking.paymentStatus === 'paid' ? "bg-green-600 text-white" :
                                            selectedBooking.paymentStatus === 'refunded' ? "bg-yellow-500 text-white" :
                                            "bg-red-600 text-white"
                                          )}
                                          value={selectedBooking.paymentStatus || 'unpaid'}
                                          onChange={async (e) => {
                                            const newStatus = e.target.value;
                                            try {
                                              await updateBookingPayment(selectedBooking.id, { paymentStatus: newStatus });
                                              setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, paymentStatus: newStatus } : b));
                                              setSelectedBooking({...selectedBooking, paymentStatus: newStatus});
                                            } catch (error) {
                                              console.error("Failed to update payment status", error);
                                            }
                                          }}
                                        >
                                          <option value="unpaid">Unpaid</option>
                                          <option value="paid">Paid</option>
                                          <option value="refunded">Refunded</option>
                                        </select>
                                      </div>

                                      <div className="space-y-1 text-right">
                                        <span className="text-[10px] text-muted font-bold uppercase tracking-wider block">Owner Settlement</span>
                                        <select 
                                          className={cn(
                                            "text-xs font-black uppercase outline-none px-3 py-1.5 rounded-full transition-all cursor-pointer shadow-sm",
                                            selectedBooking.ownerSettlementStatus === 'paid' ? "bg-green-600 text-white" :
                                            "bg-orange-500 text-white"
                                          )}
                                          value={selectedBooking.ownerSettlementStatus || 'pending'}
                                          onChange={async (e) => {
                                            const newStatus = e.target.value;
                                            try {
                                              await updateBookingPayment(selectedBooking.id, { ownerSettlementStatus: newStatus });
                                              setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, ownerSettlementStatus: newStatus } : b));
                                              setSelectedBooking({...selectedBooking, ownerSettlementStatus: newStatus});
                                            } catch (error) {
                                              console.error("Failed to update owner settlement status", error);
                                            }
                                          }}
                                        >
                                          <option value="pending">Pending</option>
                                          <option value="paid">Settled</option>
                                        </select>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </section>
                            </div>
                          </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-6 border-t border-border flex items-center justify-end gap-3 bg-muted/5">
                          <button 
                            onClick={() => setSelectedBooking(null)}
                            className="px-6 py-2.5 rounded-xl text-sm font-bold border border-border hover:bg-muted transition-all mr-auto"
                          >
                            Close
                          </button>

                          {selectedBooking.assignedListingId && (() => {
                            const listing = listings.find(l => l.id === selectedBooking.assignedListingId);
                            const owner = owners.find(o => o.id === listing?.ownerId);
                            if (owner?.phone) {
                              return (
                                <a 
                                  href={`https://wa.me/${owner.phone.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-amber-500/20 active:scale-[0.98] transition-all"
                                  title={`Contact Owner: ${owner.name}`}
                                >
                                  <MessageCircle className="w-4 h-4" />
                                  Contact Owner
                                </a>
                              );
                            }
                            return null;
                          })()}

                          <a 
                            href={`https://wa.me/${(selectedBooking.customerPhone || selectedBooking.phone || '').replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-6 py-2.5 bg-green-500 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-green-500/20 active:scale-[0.98] transition-all"
                          >
                            <MessageCircle className="w-4 h-4" />
                            Contact Client
                          </a>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {activeTab === 'listings' && (
              <motion.div 
                key="listings-tab"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="w-full h-full space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Bike Listings</h3>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => {
                        if (showAddListingForm) {
                          setEditingListingId(null);
                          setListingFormData({
                            bikeId: '',
                            ownerId: '',
                            licensePlate: '',
                            status: 'available',
                            pricePerDay: 0,
                            priceWeekly: 0,
                            priceMonthly: 0,
                            year: new Date().getFullYear(),
                            condition: 'Excellent',
                            note: ''
                          });
                        }
                        setShowAddListingForm(!showAddListingForm);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                    >
                      {showAddListingForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      {showAddListingForm ? 'Cancel' : 'Add Listing'}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {showAddListingForm && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mb-6"
                    >
                      <form onSubmit={handleAddListing} className="p-6 bg-surface border border-border rounded-2xl space-y-4">
                        <h4 className="text-sm font-bold uppercase tracking-widest text-muted">{editingListingId ? 'Edit Bike Listing' : 'New Bike Listing'}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <select 
                            required
                            className="h-12 px-4 rounded-xl bg-background border border-border focus:border-primary outline-none text-sm"
                            value={listingFormData.bikeId || ''}
                            onChange={e => setListingFormData({...listingFormData, bikeId: e.target.value})}
                          >
                            <option value="">Select Model</option>
                            {bikes.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                          </select>
                          <select 
                            required
                            className="h-12 px-4 rounded-xl bg-background border border-border focus:border-primary outline-none text-sm"
                            value={listingFormData.ownerId || ''}
                            onChange={e => setListingFormData({...listingFormData, ownerId: e.target.value})}
                          >
                            <option value="">Select Owner</option>
                            {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                          </select>
                          <input 
                            required
                            placeholder="License Plate"
                            className="h-12 px-4 rounded-xl bg-background border border-border focus:border-primary outline-none text-sm"
                            value={listingFormData.licensePlate || ''}
                            onChange={e => setListingFormData({...listingFormData, licensePlate: e.target.value.toUpperCase()})}
                          />
                          <select 
                            className="h-12 px-4 rounded-xl bg-background border border-border focus:border-primary outline-none text-sm"
                            value={listingFormData.status || 'available'}
                            onChange={e => setListingFormData({...listingFormData, status: e.target.value as any})}
                          >
                            <option value="available">Available</option>
                            <option value="rented">Rented</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="hidden">Hidden</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted uppercase tracking-wider ml-1">Year</label>
                            <input 
                              type="number"
                              placeholder="Year"
                              className="w-full h-12 px-4 rounded-xl bg-background border border-border focus:border-primary outline-none text-sm"
                              value={listingFormData.year || ''}
                              onChange={e => setListingFormData({...listingFormData, year: Number(e.target.value)})}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted uppercase tracking-wider ml-1">Condition</label>
                            <select 
                              className="w-full h-12 px-4 rounded-xl bg-background border border-border focus:border-primary outline-none text-sm"
                              value={listingFormData.condition || 'Excellent'}
                              onChange={e => setListingFormData({...listingFormData, condition: e.target.value})}
                            >
                              <option value="Excellent">Excellent (New)</option>
                              <option value="Very Good">Very Good</option>
                              <option value="Good">Good</option>
                              <option value="Fair">Fair</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-col ml-1 min-h-[22px] justify-end">
                              <label className="text-[9px] font-bold text-muted uppercase tracking-wider ml-1 truncate block">Rate/Day (1-6)</label>
                              <span className="text-[8px] font-bold text-primary leading-none">Total: {formatPrice(listingFormData.pricePerDay || 0)}</span>
                            </div>
                            <input 
                              type="text"
                              placeholder="Daily"
                              className="w-full h-10 px-3 rounded-xl bg-background border border-border focus:border-primary outline-none text-xs font-mono font-bold"
                              value={listingFormData.pricePerDay ? listingFormData.pricePerDay.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") : ''}
                              onChange={e => {
                                const val = e.target.value.replace(/\s/g, '');
                                if (/^\d*$/.test(val)) {
                                  setListingFormData({...listingFormData, pricePerDay: Number(val)});
                                }
                              }}
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="flex flex-col ml-1 min-h-[22px] justify-end">
                              <label className="text-[9px] font-bold text-muted uppercase tracking-wider truncate">Rate/Day (7+)</label>
                              <span className="text-[8px] font-bold text-primary leading-none">Total: {formatPrice((listingFormData.priceWeekly || listingFormData.pricePerDay || 0) * 7)}</span>
                            </div>
                            <input 
                              type="text"
                              placeholder="Weekly"
                              className="w-full h-10 px-3 rounded-xl bg-background border border-border focus:border-primary outline-none text-xs font-mono font-bold"
                              value={listingFormData.priceWeekly ? listingFormData.priceWeekly.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") : ''}
                              onChange={e => {
                                const val = e.target.value.replace(/\s/g, '');
                                if (/^\d*$/.test(val)) {
                                  setListingFormData({...listingFormData, priceWeekly: Number(val)});
                                }
                              }}
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="flex flex-col ml-1 min-h-[22px] justify-end">
                              <label className="text-[9px] font-bold text-muted uppercase tracking-wider truncate">Rate/Day (30+)</label>
                              <span className="text-[8px] font-bold text-primary leading-none">Total: {formatPrice((listingFormData.priceMonthly || listingFormData.pricePerDay || 0) * 30)}</span>
                            </div>
                            <input 
                              type="text"
                              placeholder="Monthly"
                              className="w-full h-10 px-3 rounded-xl bg-background border border-border focus:border-primary outline-none text-xs font-mono font-bold"
                              value={listingFormData.priceMonthly ? listingFormData.priceMonthly.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") : ''}
                              onChange={e => {
                                const val = e.target.value.replace(/\s/g, '');
                                if (/^\d*$/.test(val)) {
                                  setListingFormData({...listingFormData, priceMonthly: Number(val)});
                                }
                              }}
                            />
                          </div>
                        </div>

                        <input 
                          placeholder="Note (optional)"
                          className="w-full h-12 px-4 rounded-xl bg-background border border-border focus:border-primary outline-none text-sm"
                          value={listingFormData.note || ''}
                          onChange={e => setListingFormData({...listingFormData, note: e.target.value})}
                        />
                        <button 
                          disabled={loading}
                          className="w-full h-12 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all text-sm disabled:opacity-50"
                        >
                          {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : editingListingId ? 'Update Listing' : 'Create Listing'}
                        </button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="bg-surface rounded-3xl border border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-muted/10 border-b border-border">
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Model</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Year / Condition</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Plate</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Owner</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Prices (D/W/M)</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Status</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {loading && listings.length === 0 ? (
                          <tr key="loading-listings"><td colSpan={5} className="px-6 py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></td></tr>
                        ) : listings.length > 0 ? (
                          listings.map(listing => {
                            const bike = bikes.find(b => b.id === listing.bikeId);
                            const owner = owners.find(o => o.id === listing.ownerId);
                            return (
                              <tr key={listing.id} className="hover:bg-muted/5 transition-colors">
                                <td className="px-6 py-4 font-bold text-sm">{bike?.name || 'Unknown'}</td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-foreground">{listing.year || 'N/A'}</span>
                                    <span className="text-[10px] text-muted font-medium uppercase tracking-wider">{listing.condition || 'Good'}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-xs font-mono">{listing.licensePlate}</td>
                                <td className="px-6 py-4 text-sm">{owner?.name || 'Unknown'}</td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center justify-between gap-4">
                                      <span className="text-[10px] font-bold text-primary">Daily:</span>
                                      <span className="text-[10px] font-mono font-bold text-foreground">{formatPrice(listing.pricePerDay || bike?.pricePerDay || 0)}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4 border-t border-border/30 pt-0.5">
                                      <span className="text-[10px] font-medium text-muted">Weekly:</span>
                                      <span className="text-[10px] font-mono font-bold text-foreground">{formatPrice((listing.priceWeekly || bike?.priceWeekly || listing.pricePerDay || bike?.pricePerDay || 0) * 7)}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                      <span className="text-[10px] font-medium text-muted">Monthly:</span>
                                      <span className="text-[10px] font-mono font-bold text-foreground">{formatPrice((listing.priceMonthly || bike?.priceMonthly || listing.pricePerDay || bike?.pricePerDay || 0) * 30)}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <select 
                                    className={cn(
                                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider outline-none border border-transparent focus:border-primary/30 transition-all",
                                      listing.status === 'available' ? "bg-green-100 text-green-700" : 
                                      listing.status === 'rented' ? "bg-amber-100 text-amber-700" : 
                                      "bg-red-100 text-red-700"
                                    )}
                                    value={listing.status}
                                    onChange={(e) => handleStatusChange(listing.id, e.target.value as any)}
                                  >
                                    <option value="available">Available</option>
                                    <option value="rented">Rented</option>
                                    <option value="maintenance">Maintenance</option>
                                    <option value="hidden">Hidden</option>
                                  </select>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {deletingListingId === listing.id ? (
                                      <div className="flex items-center gap-1">
                                        <button 
                                          onClick={() => setDeletingListingId(null)}
                                          className="px-2 py-1 text-[10px] font-bold text-muted"
                                        >
                                          Cancel
                                        </button>
                                        <button 
                                          onClick={() => handleDeleteListing(listing.id)}
                                          className="px-3 py-1 bg-red-500 text-white rounded-lg text-[10px] font-bold"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    ) : (
                                      <>
                                        <button 
                                          onClick={() => handleEditListing(listing)}
                                          className="p-2 hover:bg-primary/10 text-primary rounded-xl transition-all"
                                        >
                                          <Edit className="w-4 h-4" />
                                        </button>
                                        <button 
                                          onClick={() => setDeletingListingId(listing.id)}
                                          className="p-2 hover:bg-red-50 text-red-500 rounded-xl transition-all"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr><td colSpan={6} className="px-6 py-12 text-center text-muted font-medium">No listings yet</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'owners' && (
              <motion.div 
                key="owners-tab"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="w-full h-full space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Bike Owners</h3>
                  <button 
                    onClick={() => {
                      if (showAddOwnerForm) {
                        setEditingOwnerId(null);
                        setOwnerFormData({
                          name: '',
                          phone: '',
                          email: '',
                          areas: []
                        });
                      }
                      setShowAddOwnerForm(!showAddOwnerForm);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                  >
                    {showAddOwnerForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {showAddOwnerForm ? 'Cancel' : 'Add Owner'}
                  </button>
                </div>

                <AnimatePresence>
                  {showAddOwnerForm && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mb-6"
                    >
                      <form onSubmit={handleAddOwner} className="p-6 bg-surface border border-border rounded-2xl space-y-4">
                        <h4 className="text-sm font-bold uppercase tracking-widest text-muted">{editingOwnerId ? 'Edit Owner' : 'Register New Owner'}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <input 
                            required
                            placeholder="Full Name"
                            className="h-12 px-4 rounded-xl bg-background border border-border focus:border-primary outline-none text-sm"
                            value={ownerFormData.name || ''}
                            onChange={e => setOwnerFormData({...ownerFormData, name: e.target.value})}
                          />
                          <input 
                            placeholder="Phone (WhatsApp)"
                            className={cn(
                              "h-12 px-4 rounded-xl bg-background border outline-none text-sm transition-all",
                              ownerFormData.phone && !isPhoneValid(ownerFormData.phone) ? "border-red-500/50 focus:border-red-500" : "border-border focus:border-primary"
                            )}
                            value={ownerFormData.phone || ''}
                            onChange={e => setOwnerFormData({...ownerFormData, phone: normalizePhoneNumber(e.target.value)})}
                          />
                          <input 
                            placeholder="Email"
                            className="h-12 px-4 rounded-xl bg-background border border-border focus:border-primary outline-none text-sm"
                            value={ownerFormData.email || ''}
                            onChange={e => setOwnerFormData({...ownerFormData, email: e.target.value})}
                          />
                        </div>

                        <div className="space-y-3">
                          <label className="text-[10px] font-bold text-muted uppercase tracking-wider px-1">
                            Assigned Areas (Multiple)
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {areas.map(area => (
                              <button
                                key={`owner-area-manage-${area.id}`}
                                type="button"
                                onClick={() => {
                                  const currentAreas = ownerFormData.areas || [];
                                  if (currentAreas.includes(area.id)) {
                                    setOwnerFormData({ ...ownerFormData, areas: currentAreas.filter(s => s !== area.id) });
                                  } else {
                                    setOwnerFormData({ ...ownerFormData, areas: [...currentAreas, area.id] });
                                  }
                                }}
                                className={cn(
                                  "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                                  ownerFormData.areas?.includes(area.id)
                                    ? "bg-primary border-primary text-white shadow-lg shadow-primary/20"
                                    : "bg-background border-border text-muted hover:border-primary/50"
                                )}
                              >
                                {area.name}
                              </button>
                            ))}
                          </div>
                        </div>

                        <button 
                          disabled={loading}
                          className="w-full h-12 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all text-sm disabled:opacity-50"
                        >
                          {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : editingOwnerId ? 'Update Owner' : 'Register Owner'}
                        </button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="bg-surface rounded-3xl border border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-muted/10 border-b border-border">
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Name</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Contact</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Areas</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Bikes</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {loading && owners.length === 0 ? (
                          <tr key="loading-owners"><td colSpan={4} className="px-6 py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></td></tr>
                        ) : owners.length > 0 ? (
                          owners.map(owner => {
                            const ownerListings = listings.filter(l => l.ownerId === owner.id);
                            const ownerAreas = areas.filter(a => owner.areas?.includes(a.id));
                            return (
                              <tr key={owner.id} className="hover:bg-muted/5 transition-colors">
                                <td className="px-6 py-4 font-bold text-sm">{owner.name}</td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col gap-1">
                                    <span className="text-xs font-mono text-muted">{owner.phone || 'No phone'}</span>
                                    <span className="text-[10px] text-muted/60">{owner.email || 'No email'}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-wrap gap-1">
                                    {ownerAreas.map(a => (
                                      <span key={a.id} className="px-2 py-0.5 bg-muted/30 text-[9px] font-bold rounded-lg">{a.name}</span>
                                    ))}
                                    {ownerAreas.length === 0 && <span className="text-xs text-muted/40 italic">No areas</span>}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="text-xs font-bold px-2 py-1 bg-primary/10 text-primary rounded-lg">
                                    {ownerListings.length} units
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {deletingOwnerId === owner.id ? (
                                      <div className="flex items-center gap-1">
                                        <button 
                                          onClick={() => setDeletingOwnerId(null)}
                                          className="px-2 py-1 text-[10px] font-bold text-muted"
                                        >
                                          Cancel
                                        </button>
                                        <button 
                                          onClick={() => handleDeleteOwner(owner.id)}
                                          className="px-3 py-1 bg-red-500 text-white rounded-lg text-[10px] font-bold"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    ) : (
                                      <>
                                        <button 
                                          onClick={() => handleEditOwner(owner)}
                                          className="p-2 hover:bg-primary/10 text-primary rounded-xl transition-all"
                                        >
                                          <Edit className="w-4 h-4" />
                                        </button>
                                        <button 
                                          onClick={() => setDeletingOwnerId(owner.id)}
                                          className="p-2 hover:bg-red-50 text-red-500 rounded-xl transition-all"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr><td colSpan={4} className="px-6 py-12 text-center text-muted font-medium">No owners registered</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'contacts' && (
              <motion.div 
                key="contacts-tab"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="w-full h-full space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Admin Contacts</h3>
                </div>

                <div className="max-w-xl mx-auto">
                  <form onSubmit={handleUpdateContacts} className="p-8 bg-surface border border-border rounded-[32px] shadow-sm space-y-8">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                          <label className="text-[10px] font-bold text-muted uppercase tracking-[0.2em]">
                            Call Number (Main)
                          </label>
                          <span className="text-[10px] text-muted/60 lowercase italic">e.g. +62 812 3456 789</span>
                        </div>
                        <div className="relative">
                          <input 
                            required
                            placeholder="+62 812 3456 7890"
                            className={cn(
                              "w-full h-14 pl-12 pr-4 rounded-2xl bg-background border outline-none text-sm transition-all shadow-sm font-medium",
                              adminContacts.phone && !isPhoneValid(adminContacts.phone) ? "border-red-500/50 focus:border-red-500" : "border-border focus:border-primary"
                            )}
                            value={adminContacts.phone || ''}
                            onChange={e => setAdminContacts({...adminContacts, phone: normalizePhoneNumber(e.target.value)})}
                          />
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">
                            <Phone className="w-5 h-5" />
                          </div>
                        </div>
                        {adminContacts.phone && !isPhoneValid(adminContacts.phone) && (
                          <p className="text-[9px] text-red-500 font-bold px-1">Invalid number format</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                          <label className="text-[10px] font-bold text-muted uppercase tracking-[0.2em]">
                            WhatsApp
                          </label>
                          <span className="text-[10px] text-muted/60 lowercase italic">with country code, e.g. +62...</span>
                        </div>
                        <div className="relative">
                          <input 
                            required
                            placeholder="+62 812 3456 7890"
                            className={cn(
                              "w-full h-14 pl-12 pr-4 rounded-2xl bg-background border outline-none text-sm transition-all shadow-sm font-medium",
                              adminContacts.whatsapp && !isPhoneValid(adminContacts.whatsapp) ? "border-red-500/50 focus:border-red-500" : "border-border focus:border-primary"
                            )}
                            value={adminContacts.whatsapp || ''}
                            onChange={e => setAdminContacts({...adminContacts, whatsapp: normalizePhoneNumber(e.target.value)})}
                          />
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">
                            <MessageCircle className="w-5 h-5" />
                          </div>
                        </div>
                        {adminContacts.whatsapp && !isPhoneValid(adminContacts.whatsapp) && (
                          <p className="text-[9px] text-red-500 font-bold px-1">Invalid number format</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                          <label className="text-[10px] font-bold text-muted uppercase tracking-[0.2em]">
                            Telegram Username
                          </label>
                          <span className="text-[10px] text-muted/60 lowercase italic">username only, no @</span>
                        </div>
                        <div className="relative">
                          <input 
                            required
                            placeholder="username"
                            className="w-full h-14 pl-12 pr-4 rounded-2xl bg-background border border-border focus:border-primary outline-none text-sm transition-all shadow-sm"
                            value={adminContacts.telegram || ''}
                            onChange={e => setAdminContacts({...adminContacts, telegram: e.target.value.replace(/^@/, '')})}
                          />
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">
                            <Send className="w-5 h-5" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                          <label className="text-[10px] font-bold text-muted uppercase tracking-[0.2em]">
                            Instagram Username
                          </label>
                          <span className="text-[10px] text-muted/60 lowercase italic">username only, no @</span>
                        </div>
                        <div className="relative">
                          <input 
                            required
                            placeholder="username"
                            className="w-full h-14 pl-12 pr-4 rounded-2xl bg-background border border-border focus:border-primary outline-none text-sm transition-all shadow-sm"
                            value={adminContacts.instagram || ''}
                            onChange={e => setAdminContacts({...adminContacts, instagram: e.target.value.replace(/^@/, '')})}
                          />
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">
                            <Instagram className="w-5 h-5" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                          <label className="text-[10px] font-bold text-muted uppercase tracking-[0.2em]">
                            Email Address
                          </label>
                          <span className="text-[10px] text-muted/60 lowercase italic">e.g. info@example.com</span>
                        </div>
                        <div className="relative">
                          <input 
                            required
                            placeholder="info@example.com"
                            className="w-full h-14 pl-12 pr-4 rounded-2xl bg-background border border-border focus:border-primary outline-none text-sm transition-all shadow-sm"
                            value={adminContacts.email || ''}
                            onChange={e => setAdminContacts({...adminContacts, email: e.target.value})}
                          />
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">
                            <Mail className="w-5 h-5" />
                          </div>
                        </div>
                        <p className="text-[10px] text-muted/60 mt-1 px-1 flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          This email is hidden from the main home panel
                        </p>
                      </div>
                    </div>

                    <button 
                      disabled={loading}
                      className="w-full h-14 bg-primary text-white rounded-2xl font-bold hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 group"
                    >
                      {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                        <>
                          Save Contacts
                          <ChevronUp className="w-5 h-5 group-hover:translate-x-1 transition-transform rotate-90" />
                        </>
                      )}
                    </button>
                  </form>

                  {/* Exchange Rates & Markups Settings */}
                  <form onSubmit={handleUpdateExchangeRates} className="mt-8 p-8 bg-surface border border-border rounded-[32px] shadow-sm space-y-8">
                    <div className="flex items-center gap-2 mb-2">
                      <RefreshCw className="w-5 h-5 text-primary" />
                      <h3 className="text-lg font-bold">Exchange Rates & Markups</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] px-1">
                          Base IDR (per 1 USD)
                        </label>
                        <input 
                          type="number"
                          step="any"
                          className="w-full h-14 px-4 rounded-2xl bg-background border border-border focus:border-primary outline-none text-sm transition-all shadow-sm font-medium"
                          value={exchangeRates?.idr || ''}
                          onChange={e => setExchangeRates(prev => prev ? {...prev, idr: parseFloat(e.target.value)} : null)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] px-1">
                          Base RUB (per 1 USD)
                        </label>
                        <input 
                          type="number"
                          step="any"
                          className="w-full h-14 px-4 rounded-2xl bg-background border border-border focus:border-primary outline-none text-sm transition-all shadow-sm font-medium"
                          value={exchangeRates?.rub || ''}
                          onChange={e => setExchangeRates(prev => prev ? {...prev, rub: parseFloat(e.target.value)} : null)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] px-1">
                          RUB Markup % (e.g. 5 for 5%)
                        </label>
                        <input 
                          type="number"
                          step="0.1"
                          className="w-full h-14 px-4 rounded-2xl bg-background border border-border focus:border-primary outline-none text-sm transition-all shadow-sm font-medium"
                          value={exchangeRates ? (exchangeRates.markuprub * 100).toFixed(1) : ''}
                          onChange={e => {
                            const val = parseFloat(e.target.value) / 100;
                            setExchangeRates(prev => prev ? {...prev, markuprub: isNaN(val) ? 0 : val} : null);
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] px-1">
                          USDT Markup % (e.g. 5 for 5%)
                        </label>
                        <input 
                          type="number"
                          step="0.1"
                          className="w-full h-14 px-4 rounded-2xl bg-background border border-border focus:border-primary outline-none text-sm transition-all shadow-sm font-medium"
                          value={exchangeRates ? (exchangeRates.markupusdt * 100).toFixed(1) : ''}
                          onChange={e => {
                            const val = parseFloat(e.target.value) / 100;
                            setExchangeRates(prev => prev ? {...prev, markupusdt: isNaN(val) ? 0 : val} : null);
                          }}
                        />
                      </div>
                    </div>

                    <button 
                      disabled={loading || !exchangeRates}
                      className="w-full h-14 bg-foreground text-white rounded-2xl font-bold hover:shadow-lg hover:shadow-black/10 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 group"
                    >
                      {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                        <>
                          Update Rates & Markups
                          <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {activeTab === 'statistics' && (
              <motion.div 
                key="statistics-tab"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="w-full h-full space-y-8"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Business Statistics</h3>
                  <div className="text-[10px] text-muted font-bold uppercase tracking-widest bg-muted/20 px-3 py-1 rounded-full">
                    Real-time Data
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-surface border border-border p-6 rounded-[32px] shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <Zap className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] text-green-500 font-bold bg-green-500/10 px-2 py-0.5 rounded-full">+12%</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Total Revenue</p>
                      <h4 className="text-2xl font-black">{formatPrice(stats.totalRevenue)}</h4>
                    </div>
                  </div>

                  <div className="bg-surface border border-border p-6 rounded-[32px] shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                        <ClipboardList className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full">{stats.activeRentals} Active</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Total Bookings</p>
                      <h4 className="text-2xl font-black">{stats.totalBookings}</h4>
                    </div>
                  </div>

                  <div className="bg-surface border border-border p-6 rounded-[32px] shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                        <User className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Platform Fees</p>
                      <h4 className="text-2xl font-black text-primary">{formatPrice(stats.platformFeeTotal)}</h4>
                    </div>
                  </div>

                  <div className="bg-surface border border-border p-6 rounded-[32px] shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500">
                        <Send className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Avg. Booking</p>
                      <h4 className="text-2xl font-black">{formatPrice(stats.averageValue)}</h4>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Revenue Chart Placeholder */}
                  <div className="bg-surface border border-border p-8 rounded-[40px] shadow-sm space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold uppercase tracking-widest">Monthly Revenue</h4>
                      <BarChart3 className="w-4 h-4 text-muted" />
                    </div>
                    <div className="h-64 flex items-end gap-3 px-2">
                      {Object.entries(stats.monthlyRevenue).map(([month, value], idx) => {
                        const maxValue = Math.max(...(Object.values(stats.monthlyRevenue) as number[]), 1);
                        const height = ((value as number) / maxValue) * 100;
                        return (
                          <div key={month} className="flex-1 flex flex-col items-center gap-3 group">
                            <div className="relative w-full">
                              <motion.div 
                                initial={{ height: 0 }}
                                animate={{ height: `${height}%` }}
                                className="w-full bg-primary/20 rounded-t-xl group-hover:bg-primary/40 transition-colors relative"
                                style={{ minHeight: '4px' }}
                              >
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-neutral-800 text-white text-[8px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                  {formatPrice(value as number)}
                                </div>
                              </motion.div>
                            </div>
                            <span className="text-[9px] font-bold text-muted uppercase tracking-tighter">{month}</span>
                          </div>
                        );
                      })}
                      {Object.keys(stats.monthlyRevenue).length === 0 && (
                        <div className="w-full h-full flex flex-col items-center justify-center text-muted italic text-xs gap-2">
                          <BarChart3 className="w-8 h-8 opacity-20" />
                          No completed bookings data
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Popular Bikes Table */}
                  <div className="bg-surface border border-border p-8 rounded-[40px] shadow-sm space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold uppercase tracking-widest">Popular Models</h4>
                      <BikeIcon className="w-4 h-4 text-muted" />
                    </div>
                    <div className="space-y-4">
                      {stats.popularBikes.map(([bikeName, count], idx) => {
                        const maxCount = Math.max(...stats.popularBikes.map(b => b[1] as number), 1);
                        const percentage = ((count as number) / maxCount) * 100;
                        return (
                          <div key={bikeName} className="space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] font-bold">
                              <span className="text-foreground">{bikeName}</span>
                              <span className="text-muted">{count} bookings</span>
                            </div>
                            <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                className="h-full bg-primary rounded-full"
                              />
                            </div>
                          </div>
                        );
                      })}
                      {stats.popularBikes.length === 0 && (
                        <div className="py-12 text-center text-muted italic text-xs">
                          No booking data available
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Payment Methods Breakdown */}
                <div className="bg-surface border border-border p-8 rounded-[40px] shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-foreground">Payment Methods</h4>
                    <Tag className="w-4 h-4 text-muted" />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {Object.entries(stats.paymentMethods).map(([method, count]) => {
                      const percentage = (count as number / stats.totalBookings) * 100;
                      return (
                        <div key={method} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider text-muted">{method}</span>
                            <span className="text-[10px] font-bold text-foreground">{(count as number)}</span>
                          </div>
                          <div className="h-1.5 bg-muted/20 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              className="h-full bg-primary rounded-full transition-all duration-500"
                            />
                          </div>
                          <p className="text-[9px] font-black text-primary/70">{Math.round(percentage)}% of bookings</p>
                        </div>
                      );
                    })}
                    {Object.keys(stats.paymentMethods).length === 0 && (
                      <div className="col-span-full py-4 text-center text-muted italic text-xs">
                        No payment data available
                      </div>
                    )}
                  </div>
                </div>

                {/* Owner Settlements Overview */}
                <div className="bg-primary/5 border border-primary/10 p-8 rounded-[40px] shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-primary">Financial Summary (All Bookings)</h4>
                    <Zap className="w-4 h-4 text-primary" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Total Sales (GMV)</p>
                      <p className="text-xl font-black">{formatPrice(stats.totalRevenue)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Owner Payouts (Liability)</p>
                      <p className="text-xl font-black text-green-600">-{formatPrice(stats.ownerPayoutTotal)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Net Profit (Platform)</p>
                      <p className="text-xl font-black text-primary">{formatPrice(stats.platformFeeTotal)}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'promocodes' && (
              <motion.div 
                key="promocodes-tab"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="w-full h-full space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Promo Codes</h3>
                  <button 
                    onClick={() => {
                      setEditingPromoId(null);
                      setPromoFormData({ code: '', discount: 10, isActive: true, validUntil: '' });
                      setShowAddPromoForm(!showAddPromoForm);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                  >
                    {showAddPromoForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {showAddPromoForm ? 'Cancel' : 'Add Code'}
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {showAddPromoForm && (
                    <motion.div 
                      key="promo-form"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <form onSubmit={handlePromoSubmit} className="bg-surface p-6 rounded-2xl border border-border space-y-6 max-w-lg mx-auto">
                        <div className="space-y-4">
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted px-1 mb-2 block">Promo Code</label>
                            <input 
                              required
                              placeholder="SUMMER20"
                              value={promoFormData.code}
                              onChange={e => setPromoFormData({...promoFormData, code: e.target.value.toUpperCase()})}
                              className="w-full bg-background border border-border px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-[10px] font-black uppercase tracking-widest text-muted px-1 mb-2 block">Discount (%)</label>
                              <input 
                                type="number"
                                min="1"
                                max="100"
                                required
                                value={promoFormData.discount}
                                onChange={e => setPromoFormData({...promoFormData, discount: parseInt(e.target.value)})}
                                className="w-full bg-background border border-border px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-black uppercase tracking-widest text-muted px-1 mb-2 block">Valid Until</label>
                              <input 
                                type="date"
                                value={promoFormData.validUntil}
                                onChange={e => setPromoFormData({...promoFormData, validUntil: e.target.value})}
                                className="w-full bg-background border border-border px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                              />
                            </div>
                          </div>
                          <label className="flex items-center gap-3 p-3 bg-background rounded-xl border border-border cursor-pointer">
                            <input 
                              type="checkbox"
                              checked={promoFormData.isActive}
                              onChange={e => setPromoFormData({...promoFormData, isActive: e.target.checked})}
                              className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                            />
                            <span className="text-sm font-bold">Active</span>
                          </label>
                        </div>
                        <button 
                          type="submit"
                          disabled={loading}
                          className="w-full py-4 bg-primary text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                        >
                          {editingPromoId ? 'Update Code' : 'Save Code'}
                        </button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {promocodes.map(promo => (
                    <div key={promo.id} className="bg-surface p-5 rounded-2xl border border-border hover:shadow-md transition-all group">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs",
                            promo.isActive ? "bg-green-100 text-green-600" : "bg-muted/10 text-muted"
                          )}>
                            {promo.discount}%
                          </div>
                          <div>
                            <p className="text-sm font-black tracking-tight">{promo.code}</p>
                            <p className="text-[10px] text-muted font-bold">
                              {promo.validUntil ? `Until: ${new Date(promo.validUntil.seconds ? promo.validUntil.seconds * 1000 : promo.validUntil).toLocaleDateString()}` : 'No expiry'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEditPromo(promo)}
                            className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handlePromoDelete(promo.id)}
                            className="p-2 hover:bg-red-100 text-red-500 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {promocodes.length === 0 && (
                    <div className="col-span-full py-12 text-center text-muted italic">
                      No promo codes created yet
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          )}
        </div>
      </motion.div>
      
      {/* Toast Notification Overlay */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[300] min-w-[300px]"
          >
            <div className={cn(
              "px-6 py-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 border backdrop-blur-md",
              notification.type === 'success' ? "bg-green-600 text-white border-green-500" :
              notification.type === 'error' ? "bg-red-600 text-white border-red-500" :
              "bg-surface text-foreground border-border"
            )}>
              <div className="flex items-center gap-3">
                {notification.type === 'success' && <Check className="w-5 h-5" />}
                {notification.type === 'error' && <X className="w-5 h-5" />}
                <p className="text-sm font-bold tracking-tight">{notification.message}</p>
              </div>
              <button 
                onClick={() => setNotification(null)}
                className="p-1 hover:bg-black/10 rounded-full transition-colors"
              >
                <X className="w-4 h-4 opacity-50" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
