export interface ColorReference {
  id: string;
  displayName: string;
  hexCode: string;
}

export interface Bike {
  id: string;
  name: string;
  type: string | string[];
  engineSize: number;
  bestFor: string[];
  bestForPercentages?: Record<string, number>;
  hasABS: boolean;
  hasBigTrunk: boolean;
  hasPhoneHolder: boolean;
  hasUSB: boolean;
  pricePerDay: number;
  priceWeekly: number;
  priceMonthly: number;
  promoPrice?: number;
  isPromoActive?: boolean;
  order?: number;
  image: string;
  images?: string[];
  generalPhotos?: string[];
  imagesByYear?: Record<number, string>;
  colors?: { name: string; hex: string; image?: string; colorId?: string; imageUrl?: string; images?: string[]; imageUrls?: string[] }[];
  description: string;
  features: string[];
}

export type BikeType = string;

export interface Owner {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  areas?: string[];
}

export interface BikeListing {
  id: string;
  bikeId: string;
  ownerId: string;
  licensePlate: string;
  status: 'available' | 'rented' | 'maintenance' | 'hidden';
  pricePerDay?: number;
  priceWeekly?: number;
  priceMonthly?: number;
  year?: number;
  condition?: string;
  rating: number;
  note: string;
  createdAt: any;
}

export interface Booking {
  id: string;
  bikeId: string;
  bikeName: string;
  selectedYear?: number;
  selectedColor?: string;
  startDate: any;
  endDate: any;
  days: number;
  totalPrice: number;
  location?: string;
  deliveryTime?: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  paymentMethod: string;
  paymentTiming: 'now' | 'delivery';
  paymentStatus: 'unpaid' | 'paid' | 'refunded';
  status: 'new' | 'searching' | 'confirmed' | 'handover' | 'active' | 'awaiting_return' | 'completed' | 'dispute' | 'resolved' | 'cancelled';
  assignedListingId?: string;
  disputeComment?: string;
  createdAt: any;
}

export interface Area {
  id: string;
  name: string;
  keywords: string[];
}

export interface AdminContacts {
  phone: string;
  whatsapp: string;
  telegram: string;
  instagram: string;
  email: string;
}

export interface PromoCode {
  id: string;
  code: string;
  discount: number;
  isActive: boolean;
  validUntil: any;
  createdAt: any;
}

export interface ExchangeRates {
  rates: {
    IDR: number;
    RUB: number;
    USD: number;
  };
  timestamp: number;
  markuprub?: number;
  markupusdt?: number;
}
