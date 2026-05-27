import { Bike } from "./types";

export const IDR_TO_USD = 16000;

export const BIKES: Bike[] = [
  {
    id: "honda-scoopy",
    name: "Honda Scoopy",
    type: ["Popular", "Beginner", "Retro"],
    engineSize: 110,
    bestForPercentages: {
      "City": 100,
      "Long Trip": 0,
      "Photo": 100,
      "couple": 0
    },
    hasABS: false,
    hasBigTrunk: false,
    hasPhoneHolder: true,
    hasUSB: true,
    pricePerDay: 85000,
    priceWeekly: 80000,
    priceMonthly: 45000,
    image: "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&q=80&w=800",
    description: "Stylish retro scooter perfect for relaxed Bali rides, cafes and beach sunsets.",
    features: ["USB charger", "lightweight", "retro"]
  },
  {
    id: "yamaha-nmax",
    name: "Yamaha NMAX",
    type: ["Popular", "Maxi"],
    engineSize: 155,
    bestForPercentages: {
      "City": 100,
      "Long Trip": 100,
      "Photo": 0,
      "couple": 100
    },
    hasABS: true,
    hasBigTrunk: true,
    hasPhoneHolder: true,
    hasUSB: true,
    pricePerDay: 150000,
    priceWeekly: 135000,
    priceMonthly: 65000,
    image: "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&q=80&w=800",
    description: "Premium scooter with powerful performance and maximum comfort for Bali adventures.",
    features: ["ABS", "Large trunk", "Keyless", "LED"]
  },
  {
    id: "honda-vario-125",
    name: "Honda Vario 125",
    type: "Budget",
    engineSize: 125,
    bestForPercentages: {
      "City": 100,
      "Long Trip": 0,
      "Photo": 0,
      "couple": 0
    },
    hasABS: false,
    hasBigTrunk: false,
    hasPhoneHolder: true,
    hasUSB: false,
    pricePerDay: 85000,
    priceWeekly: 80000,
    priceMonthly: 50000,
    image: "https://images.unsplash.com/photo-1485902701129-805f2c5896a7?auto=format&fit=crop&q=80&w=800",
    description: "Stylish and easy-to-ride scooter, perfect for everyday Bali adventures.",
    features: ["Flat floor for bags", "agile"]
  },
  {
    id: "honda-vario-160",
    name: "Honda Vario 160",
    type: "Popular",
    engineSize: 160,
    bestForPercentages: {
      "City": 100,
      "Long Trip": 0,
      "Photo": 0,
      "couple": 0
    },
    hasABS: true,
    hasBigTrunk: false,
    hasPhoneHolder: true,
    hasUSB: true,
    pricePerDay: 90000,
    priceWeekly: 85000,
    priceMonthly: 55000,
    image: "https://images.unsplash.com/photo-1515777315835-281b94c9589f?auto=format&fit=crop&q=80&w=800",
    description: "Stylish and easy-to-ride scooter, perfect for everyday Bali adventures.",
    features: ["ABS", "Disc brakes", "high power"]
  },
  {
    id: "honda-pcx",
    name: "Honda PCX",
    type: ["Popular", "Maxi"],
    engineSize: 160,
    bestForPercentages: {
      "City": 100,
      "Long Trip": 100,
      "Photo": 0,
      "couple": 100
    },
    hasABS: true,
    hasBigTrunk: true,
    hasPhoneHolder: true,
    hasUSB: true,
    pricePerDay: 150000,
    priceWeekly: 135000,
    priceMonthly: 65000,
    image: "https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&q=80&w=800",
    description: "Premium scooter with smooth ride, spacious seat and maximum comfort for stylish Bali journeys.",
    features: ["ABS", "Large fuel tank", "premium comfort"]
  },
  {
    id: "yamaha-aerox",
    name: "Yamaha Aerox",
    type: "Popular",
    engineSize: 155,
    bestForPercentages: {
      "City": 100,
      "Long Trip": 0,
      "Photo": 0,
      "couple": 0
    },
    hasABS: true,
    hasBigTrunk: false,
    hasPhoneHolder: true,
    hasUSB: true,
    pricePerDay: 150000,
    priceWeekly: 135000,
    priceMonthly: 65000,
    image: "https://images.unsplash.com/photo-1525160354320-d8e92641c563?auto=format&fit=crop&q=80&w=800",
    description: "Sporty scooter with aggressive design and dynamic performance for energetic Bali rides.",
    features: ["ABS", "Sporty look", "wide tires"]
  },
  {
    id: "vespa-sprint",
    name: "Vespa Sprint",
    type: "Retro",
    engineSize: 150,
    bestForPercentages: {
      "City": 100,
      "Long Trip": 0,
      "Photo": 100,
      "couple": 100
    },
    hasABS: true,
    hasBigTrunk: false,
    hasPhoneHolder: true,
    hasUSB: true,
    pricePerDay: 250000,
    priceWeekly: 225000,
    priceMonthly: 140000,
    image: "https://images.unsplash.com/photo-1598501479133-72adfe8084ca?auto=format&fit=crop&q=80&w=800",
    description: "Iconic Italian scooter perfect for stylish Bali rides and unforgettable Instagram photos.",
    features: ["ABS", "Steel body", "status", "Italian style"]
  },
  {
    id: "honda-adv",
    name: "Honda ADV",
    type: "Maxi",
    engineSize: 160,
    bestForPercentages: {
      "City": 0,
      "Long Trip": 100,
      "Photo": 0,
      "couple": 0
    },
    hasABS: true,
    hasBigTrunk: true,
    hasPhoneHolder: true,
    hasUSB: true,
    pricePerDay: 175000,
    priceWeekly: 155000,
    priceMonthly: 65000,
    image: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&q=80&w=800",
    description: "Adventure-style scooter built for exploring Bali with comfort, power and premium travel vibes.",
    features: ["ABS", "Crossover suspension", "smooth ride"]
  },
  {
    id: "yamaha-xmax",
    name: "Yamaha XMAX",
    type: "Maxi",
    engineSize: 250,
    bestForPercentages: {
      "City": 0,
      "Long Trip": 100,
      "Photo": 0,
      "couple": 100
    },
    hasABS: true,
    hasBigTrunk: true,
    hasPhoneHolder: true,
    hasUSB: true,
    pricePerDay: 260000,
    priceWeekly: 240000,
    priceMonthly: 140000,
    image: "https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?auto=format&fit=crop&q=80&w=800",
    description: "Premium maxi scooter with ultimate comfort, power and style for unforgettable Bali road trips.",
    features: ["ABS", "Fits 2 helmets", "Traction Control"]
  },
  {
    id: "yamaha-fazzio",
    name: "Yamaha Fazzio",
    type: ["Beginner", "Retro"],
    engineSize: 125,
    bestForPercentages: {
      "City": 100,
      "Long Trip": 0,
      "Photo": 100,
      "couple": 0
    },
    hasABS: false,
    hasBigTrunk: false,
    hasPhoneHolder: true,
    hasUSB: false,
    pricePerDay: 85000,
    priceWeekly: 80000,
    priceMonthly: 50000,
    image: "https://images.unsplash.com/photo-1599819811279-d5ad9cccf838?auto=format&fit=crop&q=80&w=800",
    description: "Trendy and stylish scooter perfect for Bali cafes, beach sunsets and aesthetic island adventures.",
    features: ["Hybrid engine", "stylish design"]
  }
];
