export type Language = 
  | 'en' | 'ru' | 'id' | 'zh' | 'de' 
  | 'es' | 'fr' | 'pt' | 'ja' | 'ko' 
  | 'it' | 'tr' | 'vi' | 'th' | 'pl' 
  | 'nl' | 'hi' | 'ar' | 'bn' | 'ms';

export interface Translations {
  nav: {
    catalog: string;
    terms: string;
    about: string;
    contact: string;
    book: string;
  };
  hero: {
    subtitle: string;
    title1: string;
    title2: string;
    description: string;
    btnCatalog: string;
    btnTerms: string;
    freeDelivery: string;
    deliverySub: string;
    insurance: string;
    insuranceSub: string;
    support: string;
    supportSub: string;
  };
  catalog: {
    subtitle: string;
    title1: string;
    title2: string;
    all: string;
    scooters: string;
    enduro: string;
    sport: string;
    cruisers: string;
    notFoundTitle: string;
    notFoundDesc: string;
    whatsappBtn: string;
    perDay: string;
    dateFrom: string;
    dateTo: string;
  };
  testimonials: {
    subtitle: string;
    title: string;
  };
  footer: {
    desc: string;
    nav: string;
    services: string;
    contacts: string;
    dayRent: string;
    longRent: string;
    delivery: string;
    gear: string;
  };
  booking: {
    outOfZone: string;
    payNow: string;
    payOnDelivery: string;
  };
}

const baseEn: Translations = {
  nav: {
    catalog: 'Catalog',
    terms: 'Terms',
    about: 'About',
    contact: 'Contact',
    book: 'Book Now',
  },
    hero: {
    subtitle: 'Bali Island / Adventure Awaits',
    title1: 'Freedom on',
    title2: 'two wheels',
    description: 'Rent reliable bikes in Bali with delivery to your villa. Explore the island without limits and traffic jams on the best motorcycles.',
    btnCatalog: 'View Catalog',
    btnTerms: 'Rental Terms',
    freeDelivery: 'Free Delivery',
    deliverySub: 'Anywhere in South Bali',
    insurance: 'Full Insurance',
    insuranceSub: 'Your peace of mind is priority',
    support: '24/7 Support',
    supportSub: 'Always available via WhatsApp',
  },
    catalog: {
      subtitle: 'Our Fleet',
      title1: 'Choose your',
      title2: 'perfect ride',
      all: 'All',
      scooters: 'Scooters',
      enduro: 'Enduro',
      sport: 'Sport',
      cruisers: 'Cruisers',
      notFoundTitle: 'Didn\'t find what you need?',
      notFoundDesc: 'We constantly update our fleet. Contact us on WhatsApp, and we\'ll find a bike specifically for you.',
      whatsappBtn: 'Message on WhatsApp',
      perDay: 'day',
      dateFrom: 'From',
      dateTo: 'To',
    },
  testimonials: {
    subtitle: 'Reviews',
    title: 'What our clients say',
  },
  footer: {
    desc: 'Easy booking. The best price. Free delivery.',
    nav: 'Navigation',
    services: 'Services',
    contacts: 'Contacts',
    dayRent: 'Daily Rental',
    longRent: 'Long-term Rental',
    delivery: 'Hotel Delivery',
    gear: 'Gear Included',
  },
  booking: {
    outOfZone: 'Your address is outside our current logistics coverage area. Please submit a support request, and we\'ll try to work something out!',
    payNow: 'Pay Now',
    payOnDelivery: 'Pay on Delivery',
  },
};

export const translations: Record<Language, Translations> = {
  en: baseEn,
  ru: {
    nav: { catalog: 'Каталог', terms: 'Условия', about: 'О нас', contact: 'Контакты', book: 'Забронировать' },
    hero: { subtitle: 'Остров Бали / Приключения ждут', title1: 'Свобода на', title2: 'двух колесах', description: 'Аренда надежных байков на Бали с доставкой к вашей вилле.', btnCatalog: 'Смотреть каталог', btnTerms: 'Условия аренды', freeDelivery: 'Бесплатная доставка', deliverySub: 'В любую точку Южного Бали', insurance: 'Полная страховка', insuranceSub: 'Ваше спокойствие — наш приоритет', support: 'Поддержка 24/7', supportSub: 'Всегда на связи в WhatsApp' },
    catalog: { subtitle: 'Наш парк', title1: 'Выберите свой', title2: 'идеальный байк', all: 'All', scooters: 'Scooters', enduro: 'Adventure', sport: 'Sport', cruisers: 'Cruisers', notFoundTitle: 'Не нашли то, что нужно?', notFoundDesc: 'Свяжитесь с нами в WhatsApp.', whatsappBtn: 'Написать в WhatsApp', perDay: 'день', dateFrom: 'С', dateTo: 'По' },
    testimonials: { subtitle: 'Отзывы', title: 'Что говорят наши клиенты' },
    footer: { desc: 'Easy booking. The best price. Free delivery.', nav: 'Навигация', services: 'Услуги', contacts: 'Контакты', dayRent: 'Посуточная аренда', longRent: 'Долгосрочная аренда', delivery: 'Доставка в отель', gear: 'Экипировка включена' },
    booking: {
      outOfZone: 'Your address is outside our current logistics coverage area. Please submit a support request, and we\'ll try to work something out!',
      payNow: 'Оплатить сейчас',
      payOnDelivery: 'При получении',
    }
  },
  id: {
    nav: { catalog: 'Katalog', terms: 'Ketentuan', about: 'Tentang', contact: 'Kontak', book: 'Pesan Sekarang' },
    hero: { subtitle: 'Pulau Bali / Petualangan Menanti', title1: 'Kebebasan di', title2: 'dua roda', description: 'Sewa motor terpercaya di Bali dengan pengantaran ke vila Anda.', btnCatalog: 'Lihat Katalog', btnTerms: 'Syarat Sewa', freeDelivery: 'Gratis Antar', deliverySub: 'Ke mana saja di Bali Selatan', insurance: 'Asuransi Lengkap', insuranceSub: 'Ketenangan Anda prioritas kami', support: 'Dukungan 24/7', supportSub: 'Tersedia melalui WhatsApp' },
    catalog: { subtitle: 'Armada Kami', title1: 'Pilih kendaraan', title2: 'terbaik Anda', all: 'Semua Motor', scooters: 'Motor', enduro: 'Enduro', sport: 'Motor Sport', cruisers: 'Cruiser', notFoundTitle: 'Tidak menemukan model?', notFoundDesc: 'Hubungi WhatsApp kami.', whatsappBtn: 'Pesan via WhatsApp', perDay: 'hari', dateFrom: 'Dari', dateTo: 'Ke' },
    testimonials: { subtitle: 'Ulasan', title: 'Apa kata mereka' },
    footer: { desc: 'Pengalaman berkendara terbaik di Pulau Dewata.', nav: 'Navigasi', services: 'Layanan', contacts: 'Kontak', dayRent: 'Sewa Harian', longRent: 'Sewa Jangka Panjang', delivery: 'Antar ke Hotel', gear: 'Termasuk Helm & Jaket' },
    booking: { 
      outOfZone: 'Alamat Anda berada di luar zona logistik kami saat ini. Silakan hubungi dukungan kami!',
      payNow: 'Bayar Sekarang',
      payOnDelivery: 'Bayar Saat Pengantaran'
    }
  },
  zh: {
    nav: { catalog: '产品目录', terms: '租借条款', about: '关于我们', contact: '联系我们', book: '立即预订' },
    hero: { subtitle: '巴厘岛 / 冒险等待', title1: '自由的', title2: '双轮之旅', description: '在巴厘岛租用可靠的自行车，送货到您的别墅。', btnCatalog: '查看目录', btnTerms: '租借条款', freeDelivery: '免费送货', deliverySub: '巴厘岛南部任何地方', insurance: '全额保险', insuranceSub: '您的安心是我们的首要任务', support: '24/7 支持', supportSub: '随时通过 WhatsApp 联系' },
    catalog: { subtitle: '我们的车队', title1: '选择你的', title2: '完美骑行', all: '所有车型', scooters: '自行车', enduro: '越野车', sport: '摩托车', cruisers: '巡航车', notFoundTitle: '没找到您需要的？', notFoundDesc: '在 WhatsApp 上联系我们。', whatsappBtn: 'WhatsApp 联系', perDay: '天', dateFrom: '从', dateTo: '至' },
    testimonials: { subtitle: '评价', title: '客户评价' },
    footer: { desc: '在众神之岛创造最好的骑行体验。', nav: '导航', services: '服务', contacts: '联系方式', dayRent: '日租', longRent: '长租', delivery: '酒店送货', gear: '包含装备' },
    booking: { 
      outOfZone: '您的地址超出了我们当前的物流范围。请联系客服！',
      payNow: '现在支付',
      payOnDelivery: '货到付款'
    }
  },
  de: {
    nav: { catalog: 'Katalog', terms: 'Bedingungen', about: 'Über uns', contact: 'Kontakt', book: 'Jetzt buchen' },
    hero: { subtitle: 'Insel Bali / Das Abenteuer wartet', title1: 'Freiheit auf', title2: 'zwei Rädern', description: 'Mieten Sie zuverlässige Bikes auf Bali mit Lieferung zu Ihrer Villa.', btnCatalog: 'Katalog ansehen', btnTerms: 'Mietbedingungen', freeDelivery: 'Kostenlose Lieferung', deliverySub: 'Überall im Süden Balis', insurance: 'Vollversicherung', insuranceSub: 'Ihre Sicherheit ist Priorität', support: '24/7 Support', supportSub: 'Immer über WhatsApp erreichbar' },
    catalog: { subtitle: 'Unsere Flotte', title1: 'Wählen Sie Ihre', title2: 'perfekte Fahrt', all: 'Alle Bikes', scooters: 'Bikes', enduro: 'Enduro', sport: 'Motorräder', cruisers: 'Cruiser', notFoundTitle: 'Nicht das Richtige gefunden?', notFoundDesc: 'Kontaktieren Sie us over WhatsApp.', whatsappBtn: 'WhatsApp Nachricht', perDay: 'Tag', dateFrom: 'Von', dateTo: 'Bis' },
    testimonials: { subtitle: 'Bewertungen', title: 'Was unsere Kunden sagen' },
    footer: { desc: 'Das beste Fahrerlebnis auf der Insel der Götter.', nav: 'Navigation', services: 'Dienstleistungen', contacts: 'Kontakt', dayRent: 'Tagesmiete', longRent: 'Langzeitmiete', delivery: 'Hotellieferung', gear: 'Ausrüstung inklusive' },
    booking: { 
      outOfZone: 'Ihre Adresse liegt außerhalb unserer aktuellen Logistikzone. Bitte kontaktieren Sie den Support!',
      payNow: 'Jetzt bezahlen',
      payOnDelivery: 'Zahlung bei Lieferung'
    }
  },
  fr: {
    nav: {
      catalog: 'Catalogue',
      terms: 'Termes',
      about: 'À propos',
      contact: 'Contact',
      book: 'Réserver',
    },
    hero: {
      subtitle: 'Île de Bali / L’aventure vous attend',
      title1: 'La liberté sur',
      title2: 'deux roues',
      description: 'Louez des motos fiables à Bali avec livraison à votre villa. Explorez l’île sans limites ni embouteillages sur les meilleures motos.',
      btnCatalog: 'Voir le catalogue',
      btnTerms: 'Conditions de location',
      freeDelivery: 'Livraison gratuite',
      deliverySub: 'Partout dans le sud de Bali',
      insurance: 'Assurance complète',
      insuranceSub: 'Votre tranquillité d’esprit est notre priorité',
      support: 'Support 24/7',
      supportSub: 'Toujours disponible via WhatsApp',
    },
    catalog: {
      subtitle: 'Notre flotte',
      title1: 'Choisissez votre',
      title2: 'monture idéale',
      all: 'Tout',
      scooters: 'Scooters',
      enduro: 'Enduro',
      sport: 'Sportive',
      cruisers: 'Cruiser',
      notFoundTitle: 'Vous n’avez pas trouvé votre bonheur ?',
      notFoundDesc: 'Nous mettons constamment à jour notre flotte. Contactez-nous sur WhatsApp et nous trouverons une moto spécialement pour vous.',
      whatsappBtn: 'Nous écrire sur WhatsApp',
      perDay: 'jour',
      dateFrom: 'Du',
      dateTo: 'Au',
    },
    testimonials: {
      subtitle: 'Avis',
      title: 'Ce que disent nos clients',
    },
    footer: {
      desc: 'Easy booking. The best price. Free delivery.',
      nav: 'Navigation',
      services: 'Services',
      contacts: 'Contacts',
      dayRent: 'Location journalière',
      longRent: 'Location à long terme',
      delivery: 'Livraison à l’hôtel',
      gear: 'Équipement inclus',
    },
    booking: {
      outOfZone: 'Votre adresse se trouve en dehors de notre zone logistique actuelle. Veuillez nous contacter via le support pour que nous puissions trouver une solution !',
      payNow: 'Payer maintenant',
      payOnDelivery: 'Payer à la livraison',
    },
  },
  // Adding the other popular languages with English fallbacks for the initial rollout
  es: baseEn, pt: baseEn, ja: baseEn, ko: baseEn,
  it: baseEn, tr: baseEn, vi: baseEn, th: baseEn, pl: baseEn,
  nl: baseEn, hi: baseEn, ar: baseEn, bn: baseEn, ms: baseEn,
};
