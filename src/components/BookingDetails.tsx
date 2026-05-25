import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence, useSpring, useTransform } from "motion/react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts";
import {
  ChevronLeft,
  Calendar,
  ShieldCheck,
  Zap,
  Info,
  X,
  MapPin,
  Clock,
  User,
  MessageCircle,
  Mail,
  Check,
  Search,
  Plus,
  Minus,
  Navigation,
  Maximize2,
  Minimize2,
  CreditCard,
  Banknote,
  Coins,
  Building2,
  Tag,
  Loader2,
  Smartphone,
  Headset,
  Truck,
  Landmark,
  Globe,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  addBike,
  updateBike,
  deleteBike,
  updateBikesOrder,
  getBookings,
  uploadFile,
  getBikes,
  getColors,
  addColor,
  getOwners,
  addOwner,
  getBikeListings,
  addBikeListing,
  updateListingStatus,
  updateBookingStatus,
  getAdminContacts,
  verifyPromoCode,
  getLatestExchangeRates,
  updateExchangeRates,
} from "../services/dataService";
import { Bike, AdminContacts, PromoCode } from "../types";
import { useLanguage } from "../LanguageContext";
import { useRental } from "../RentalContext";
import { IDR_TO_USD } from "../constants";
import { cn, formatPrice } from "../lib/utils";
import { BikeInfoModal } from "./BikeInfoModal";
import { startPayment } from "../services/paymentService";
import { format, setHours, setMinutes, addDays } from "date-fns";
import { ru, enUS, id, fr, de } from "date-fns/locale";
import { DayPicker, DateRange } from "react-day-picker";
import { startOfToday } from "date-fns";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  Marker,
  useMap,
  useMapsLibrary,
  useAdvancedMarkerRef,
  ControlPosition,
  MapControl,
} from "@vis.gl/react-google-maps";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../lib/firebase";

import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import {
  type CountryCode,
  parsePhoneNumberFromString,
} from "libphonenumber-js";

import { normalizePhoneNumber, isPhoneValid } from "../lib/phoneUtils";

interface BookingDetailsProps {
  bike: Bike;
  onClose: () => void;
}

import { isPointInPolygon } from "../lib/geometry";

interface AreaFeature {
  type: string;
  properties: {
    name: string;
  };
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
  id: string;
}

interface AreaCollection {
  type: string;
  features: AreaFeature[];
}

const PlaceAutocomplete = ({
  onPlaceSelect,
  value,
  onChange,
  placeholder,
}: {
  onPlaceSelect: (place: google.maps.places.PlaceResult | null) => void;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) => {
  const places = useMapsLibrary("places");
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync value from prop to input ref directly to avoid React controlled input issues with Autocomplete
  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== value) {
      inputRef.current.value = value;
    }
  }, [value]);

  const onPlaceSelectRef = useRef(onPlaceSelect);
  useEffect(() => {
    onPlaceSelectRef.current = onPlaceSelect;
  }, [onPlaceSelect]);

  useEffect(() => {
    if (!places || !inputRef.current) return;

    const options = {
      fields: ["geometry", "name", "formatted_address", "place_id"],
      componentRestrictions: { country: "id" }, // Restrict to Indonesia for Bali context
    };

    const autocomplete = new places.Autocomplete(inputRef.current, options);

    const handleInput = () => {
      if (inputRef.current) {
        onChange(inputRef.current.value);
      }
    };

    inputRef.current.addEventListener("input", handleInput);

    const listener = autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (place && place.geometry) {
        onPlaceSelectRef.current(place);
      }
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        const pacContainer = document.querySelector(
          ".pac-container",
        ) as HTMLElement;
        if (pacContainer && pacContainer.style.display !== "none") {
          const selected = pacContainer.querySelector(".pac-item-selected");
          const firstResult = pacContainer.querySelector(".pac-item");

          if (!selected && firstResult) {
            // Simulate down arrow and then return to let native enter handle it
            const downArrow = new KeyboardEvent("keydown", {
              key: "ArrowDown",
              code: "ArrowDown",
              keyCode: 40,
              which: 40,
              bubbles: true,
            });
            inputRef.current?.dispatchEvent(downArrow);
          }
        }
      }
    };

    inputRef.current?.addEventListener("keydown", handleKeyDown);

    return () => {
      google.maps.event.clearInstanceListeners(autocomplete);
      inputRef.current?.removeEventListener("keydown", handleKeyDown);
      inputRef.current?.removeEventListener("input", handleInput);
      const pacContainers = document.querySelectorAll(".pac-container");
      pacContainers.forEach((container) => container.remove());
    };
  }, [places]);

  return (
    <input
      ref={inputRef}
      type="text"
      defaultValue={value}
      placeholder={placeholder || "Delivery Address"}
      className="w-full h-[52px] bg-transparent border-0 pl-11 pr-10 text-[15px] md:text-base font-medium outline-none focus:outline-none focus:ring-0 relative z-0"
    />
  );
};

const MapPicker = ({
  position,
  setPosition,
  setLocation,
  language,
  isFullscreen,
  setIsFullscreen,
  selectedDistrict,
  setSelectedDistrict,
  location,
}: {
  position: { lat: number; lng: number };
  setPosition: (p: { lat: number; lng: number }) => void;
  setLocation: (l: string) => void;
  language: string;
  isFullscreen: boolean;
  setIsFullscreen: (f: boolean) => void;
  selectedDistrict: string | null | undefined;
  setSelectedDistrict: (d: string | null) => void;
  location: string;
}) => {
  const [areas, setAreas] = useState<AreaCollection | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    if (geoError) {
      const timer = setTimeout(() => {
        setGeoError(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [geoError]);

  useEffect(() => {
    fetch("/area.json")
      .then((res) => res.json())
      .then((data) => setAreas(data))
      .catch((err) => console.error("Error loading areas:", err));
  }, []);

  useEffect(() => {
    if (!areas || !position) return;

    let foundDistrict: string | null = null;
    for (const feature of areas.features) {
      if (
        isPointInPolygon(
          [position.lng, position.lat],
          feature.geometry.coordinates,
        )
      ) {
        foundDistrict = feature.properties.name;
        break;
      }
    }
    setSelectedDistrict(foundDistrict);
  }, [position, areas]);

  const map = useMap();
  const places = useMapsLibrary("places");

  const handleMyLocation = () => {
    if (!navigator.geolocation) {
      const isHttp = window.location.protocol === "http:";
      const msg =
        language === "ru"
          ? isHttp
            ? "Геолокация требует безопасного соединения HTTPS"
            : "Геолокация не поддерживается вашим браузером"
          : isHttp
            ? "Geolocation requires a secure HTTPS connection"
            : "Geolocation is not supported by your browser";
      setGeoError(msg);
      return;
    }

    const handlePosError = (error: GeolocationPositionError) => {
      console.error("Geolocation error:", error);
      let msg = "";
      const isSafari = /^((?!chrome|android).)*safari/i.test(
        navigator.userAgent,
      );
      const isIframe = window.self !== window.top;
      const rawErrorDetail = error.message
        ? ` (${error.message})`
        : " (PERMISSION_DENIED)";

      if (language === "ru") {
        if (error.code === error.PERMISSION_DENIED) {
          if (isSafari && isIframe) {
            msg =
              "В Safari внутри фрейма AI Studio доступ к геопозиции заблокирован политикой безопасности Apple. Чтобы разрешить геопозицию и увидеть адрес на карте, откройте сайт в новой вкладке (кнопка в правом верхнем углу панели разработчика) и нажмите кнопку заново." +
              rawErrorDetail;
          } else if (isSafari) {
            msg =
              'Доступ к геопозиции в Safari отклонен. Пожалуйста, проверьте: 1) В Настройках Safari -> вкладка "Веб-сайты" -> "Геопозиция" (для этого сайта установлено "Спросить" или "Разрешить"); 2) В системных настройках iOS/macOS -> "Конфиденциальность и безопасность" -> "Службы геолокации" включены и разрешены для Safari.' +
              rawErrorDetail;
          } else {
            msg =
              "Доступ к геопозиции отклонен. Пожалуйста, предоставьте сайту разрешение на геопозицию в настройках браузера и обновите страницу." +
              rawErrorDetail;
          }
        } else if (error.code === error.TIMEOUT) {
          msg =
            "Время ожидания геопозиции истекло. Пожалуйста, попробуйте еще раз.";
        } else {
          msg =
            "Не удалось получить ваше местоположение. Пожалуйста, убедитесь, что службы геопозиции/GPS включены в системе.";
        }
      } else {
        if (error.code === error.PERMISSION_DENIED) {
          if (isSafari && isIframe) {
            msg =
              "In Safari under AI Studio iframe, geolocation is blocked by Apple security policies. Please open this app in a new tab (button at the top right of the developer panel) to trigger the native geolocation prompt." +
              rawErrorDetail;
          } else if (isSafari) {
            msg =
              'Location permission denied in Safari. Please verify: 1) In Safari Preferences -> Websites -> Location (set to "Ask" or "Allow" for this site); 2) In your iOS/macOS System Settings -> Privacy & Security -> Location Services (enabled and allowed for Safari).' +
              rawErrorDetail;
          } else {
            msg =
              "Location permission denied. Please allow location access in your browser settings and refresh." +
              rawErrorDetail;
          }
        } else if (error.code === error.TIMEOUT) {
          msg = "Location request timed out. Please try again.";
        } else {
          msg =
            "Could not retrieve your location. Please ensure location services/GPS are enabled on your device.";
        }
      }
      setGeoError(msg);
    };

    // Call navigator.geolocation.getCurrentPosition immediately as the absolute first action in handleMyLocation.
    // This synchronous invocation linked with the user click gesture ensures iOS/Safari triggers the native permission prompt.
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setGeoError(null);
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(newPos);

        if (places) {
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode({ location: newPos }, (results, status) => {
            if (status === "OK" && results?.[0]) {
              setLocation(results[0].formatted_address);
            }
          });
        }
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          handlePosError(error);
          return;
        }
        console.warn(
          "First low-accuracy geo attempt failed/timed out, trying fallback...",
          error,
        );
        // Fallback attempt: use high accuracy with generous timeout
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            setGeoError(null);
            const newPos = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            };
            setPosition(newPos);

            if (places) {
              const geocoder = new google.maps.Geocoder();
              geocoder.geocode({ location: newPos }, (results, status) => {
                if (status === "OK" && results?.[0]) {
                  setLocation(results[0].formatted_address);
                }
              });
            }
          },
          (fallbackErr) => {
            handlePosError(fallbackErr);
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
        );
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
    );
  };

  useEffect(() => {
    if (map) {
      map.panTo(position);
    }
  }, [map, position]);

  return (
    <div
      className={`transition-all duration-300 ${
        isFullscreen
          ? "fixed inset-0 z-[2000] bg-background p-4"
          : "h-64 w-full rounded-2xl overflow-hidden border border-border relative group"
      }`}
    >
      <div
        className={`w-full h-full relative ${isFullscreen ? "rounded-3xl overflow-hidden border-4 border-primary/20 shadow-2xl" : ""}`}
      >
        <Map
          defaultCenter={position}
          defaultZoom={16}
          gestureHandling="greedy"
          disableDefaultUI={true}
          style={{ width: "100%", height: "100%" }}
          onClick={(e) => {
            if (e.detail.latLng) {
              const newPos = e.detail.latLng;
              setPosition(newPos);
              const geocoder = new google.maps.Geocoder();
              geocoder.geocode({ location: newPos }, (results, status) => {
                if (status === "OK" && results?.[0]) {
                  setLocation(results[0].formatted_address);
                } else if (status === "REQUEST_DENIED") {
                  console.error("Geocoding API not enabled in Cloud Console");
                }
              });
            }
          }}
          internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
        >
          <Marker position={position} />

          <MapControl position={ControlPosition.RIGHT_BOTTOM}>
            <div className="flex flex-col gap-3 m-4">
              <button
                type="button"
                onClick={handleMyLocation}
                className="w-10 h-10 bg-white shadow-xl rounded-full flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all border border-border/50 active:scale-90"
                title="My location"
              >
                <Navigation className="w-5 h-5 fill-current" />
              </button>
            </div>
          </MapControl>
        </Map>

        {/* Fullscreen Toggle Button - lowered below the search input on mobile view */}
        <button
          type="button"
          onClick={() => setIsFullscreen(!isFullscreen)}
          className={`absolute z-[460] w-10 h-10 bg-white shadow-xl rounded-full flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all border border-border/50 active:scale-90 ${
            isFullscreen
              ? "top-[78px] right-4 sm:top-5 sm:right-5"
              : "top-[74px] right-3 sm:top-3.5 sm:right-3.5"
          }`}
          title={
            isFullscreen
              ? getBookingT("Exit fullscreen", language)
              : getBookingT("Fullscreen", language)
          }
        >
          {isFullscreen ? (
            <Minimize2 className="w-5 h-5" />
          ) : (
            <Maximize2 className="w-5 h-5" />
          )}
        </button>

        {/* Search Input overlay (always inside map) */}
        <div
          className={`absolute z-[450] bg-white border border-border rounded-2xl shadow-lg transition-all duration-300 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/5 overflow-hidden ${
            isFullscreen
              ? "top-4 left-4 right-4 sm:right-16 sm:max-w-xl shadow-2xl"
              : "top-3 left-3 right-3 sm:right-auto sm:w-[390px] md:w-[480px]"
          }`}
        >
          <div className="relative w-full">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary opacity-60 z-10 pointer-events-none" />
            <PlaceAutocomplete
              value={location}
              onChange={setLocation}
              onPlaceSelect={(place) => {
                if (place && place.geometry?.location) {
                  const newPos = {
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng(),
                  };
                  setPosition(newPos);
                  setLocation(place.formatted_address || place.name || "");
                }
              }}
              placeholder="Search address..."
            />
            {location && (
              <button
                type="button"
                onClick={() => setLocation("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-muted hover:text-foreground transition-all opacity-40 hover:opacity-100 z-10 cursor-pointer"
                title={getBookingT("Clear", language)}
              >
                <X className="w-4 h-4 text-muted" />
              </button>
            )}
          </div>
        </div>

        {/* Geolocation Error Alert */}
        <AnimatePresence>
          {geoError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`absolute left-4 right-16 z-[400] flex items-start gap-2 p-3 bg-red-500/90 backdrop-blur text-white text-xs font-medium rounded-xl shadow-lg border border-red-400/30 ${
                isFullscreen ? "top-[132px]" : "top-[128px]"
              }`}
            >
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-grow leading-tight">{geoError}</div>
              <button
                type="button"
                onClick={() => setGeoError(null)}
                className="hover:bg-white/10 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* District Badge */}
        {selectedDistrict && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-[30px] left-3 z-[400] flex items-center gap-1.5 px-2 py-1 bg-white/90 backdrop-blur shadow-lg rounded-lg border border-border/50"
          >
            <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
            <span className="text-[8px] font-bold text-primary uppercase tracking-wider">
              {selectedDistrict}
            </span>
          </motion.div>
        )}
      </div>
    </div>
  );
};

const CustomTimePicker = ({
  value,
  onChange,
  language,
}: {
  value: string;
  onChange: (v: string) => void;
  language: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let h = 8; h <= 23; h++) {
      for (let m = 0; m < 60; m += 15) {
        if (h === 23 && m > 0) continue; // Stop at 23:00
        slots.push(
          `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`,
        );
      }
    }
    return slots;
  }, []);

  const currentValue = value || "09:00";
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeItem = listRef.current.querySelector('[data-active="true"]');
      if (activeItem) {
        activeItem.scrollIntoView({ block: "center" });
      }
    }
  }, [isOpen]);

  return (
    <div className="relative group">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-[54px] bg-surface border border-border rounded-2xl pl-11 pr-4 text-sm font-medium focus:border-primary cursor-pointer hover:border-primary/40 transition-all flex items-center justify-between"
      >
        <span className="font-display font-medium text-sm">{currentValue}</span>
        <ChevronLeft
          className={`w-4 h-4 text-muted transition-transform ${isOpen ? "rotate-90" : "-rotate-90"}`}
        />
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-[550]"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute left-0 right-0 mt-2 bg-surface/95 backdrop-blur-xl border border-border rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-[1100] overflow-hidden"
            >
              <div
                ref={listRef}
                className="max-h-64 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-border flex flex-col gap-1"
              >
                {timeSlots.map((slot) => (
                  <button
                    key={slot}
                    data-active={slot === currentValue}
                    onClick={() => {
                      onChange(slot);
                      setIsOpen(false);
                    }}
                    className={`py-2 px-4 rounded-xl text-xs font-medium transition-all text-left flex items-center justify-between ${
                      slot === currentValue
                        ? "bg-primary text-white shadow-lg shadow-primary/20"
                        : "hover:bg-primary/5 text-foreground"
                    }`}
                  >
                    <span>{slot}</span>
                    {slot === currentValue && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const HELMET_1_SIZES = ["M", "L", "XL"];
const HELMET_2_SIZES = ["-", "M", "L", "XL"];

enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("[Firebase Error Detail]:", JSON.stringify(errInfo, null, 2));
  console.error(
    `[Firebase Error]: Operation ${operationType} on ${path} failed:`,
    error,
  );
  throw new Error(JSON.stringify(errInfo));
}

const bookingDict: Record<string, Record<string, string>> = {
  "Searching...": {
    en: "Searching...",
    ru: "Поиск...",
    id: "Mencari...",
    fr: "Recherche...",
    de: "Suche..."
  },
  "Available": {
    en: "Available",
    ru: "Доступен",
    id: "Tersedia",
    fr: "Disponible",
    de: "Verfügbar"
  },
  "Not available for these dates, please pick other dates or contact operator": {
    en: "Not available for these dates, please pick other dates or contact operator",
    ru: "Нет в наличии на эти даты, выберите другие даты или свяжитесь с оператором",
    id: "Tidak tersedia untuk tanggal ini, silakan pilih tanggal lain atau hubungi operator",
    fr: "Non disponible pour ces dates, veuillez choisir d'autres dates ou contacter l'opérateur",
    de: "Für diese Termine nicht verfügbar, bitte wählen Sie andere Termine oder kontaktieren Sie den Vermieter"
  },
  "Contact Operator": {
    en: "Contact Operator",
    ru: "Связаться с оператором",
    id: "Hubungi Operator",
    fr: "Contacter l'opérateur",
    de: "Vermittler kontaktieren"
  },
  "Promo code?": {
    en: "Promo code?",
    ru: "Промокод?",
    id: "Kode promo?",
    fr: "Code promo ?",
    de: "Aktionscode?"
  },
  "Promo applied: -": {
    en: "Promo applied: -",
    ru: "Применён промокод: -",
    id: "Promo diterapkan: -",
    fr: "Promo appliquée : -",
    de: "Aktion angewendet: -"
  },
  "I agree to the": {
    en: "I agree to the",
    ru: "Я согласен с",
    id: "Saya menyetujui",
    fr: "J'accepte les",
    de: "Ich stimme den"
  },
  "and": {
    en: "and",
    ru: "и",
    id: "dan",
    fr: "et",
    de: "und"
  },
  "Terms of Service": {
    en: "Terms of Service",
    ru: "Условиями предоставления услуг",
    id: "Ketentuan Layanan",
    fr: "Conditions d'utilisation",
    de: "Nutzungsbedingungen"
  },
  "Privacy Policy": {
    en: "Privacy Policy",
    ru: "Политикой конфиденциальности",
    id: "Kebijakan Privasi",
    fr: "Politique de confidentialité",
    de: "Datenschutzerklärung"
  },
  "Total amount to pay": {
    en: "Total amount to pay",
    ru: "К оплате",
    id: "Total yang harus dibayar",
    fr: "Montant total à payer",
    de: "Gesamtbetrag zu zahlen"
  },
  "promo code": {
    en: "promo code",
    ru: "промокод",
    id: "kode promo",
    fr: "code promo",
    de: "Aktionscode",
  },
  "promo price": {
    en: "promo price",
    ru: "промоцена",
    id: "harga promo",
    fr: "prix promo",
    de: "Aktionspreis",
  },
  "monthly discount": {
    en: "Weekly Rate",
    ru: "Недельный тариф",
    id: "Tarif Mingguan",
    fr: "Tarif Hebdomadaire",
    de: "Wochenpreis",
  },
  "weekly discount": {
    en: "Daily Rate",
    ru: "Дневной тариф",
    id: "Tarif Harian",
    fr: "Tarif Journalier",
    de: "Tagespreis",
  },
  "Rates & discounts": {
    en: "Rates & discounts",
    ru: "Тарифы и скидки",
    id: "Tarif & diskon",
    fr: "Tarifs & remises",
    de: "Tarife & Rabatte",
  },
  "Rental Rates": {
    en: "Rental Rates",
    ru: "Тарифы и скидки",
    id: "Tarif Sewa",
    fr: "Tarifs de Location",
    de: "Mietpreise",
  },
  "Daily Rate": {
    en: "Daily Rate",
    ru: "Дневной тариф",
    id: "Tarif Harian",
    fr: "Tarif Journalier",
    de: "Tagespreis",
  },
  days: {
    en: "days",
    ru: "дней",
    id: "hari",
    fr: "jours",
    de: "Tage",
  },
  "per day": {
    en: "per day",
    ru: "в день",
    id: "per hari",
    fr: "par jour",
    de: "pro Tag",
  },
  "Weekly Rate": {
    en: "Weekly Rate",
    ru: "Недельный тариф",
    id: "Tarif Mingguan",
    fr: "Tarif Hebdomadaire",
    de: "Wochenpreis",
  },
  "Total/week:": {
    en: "Total/week:",
    ru: "Итого за неделю:",
    id: "Total/minggu:",
    fr: "Total/semaine :",
    de: "Gesamt/Woche:",
  },
  "Monthly Rate": {
    en: "Monthly Rate",
    ru: "Месячный тариф",
    id: "Tarif Bulanan",
    fr: "Tarif Mensuel",
    de: "Monatspreis",
  },
  "Total/month:": {
    en: "Total/month:",
    ru: "Итого за месяц:",
    id: "Total/bulan:",
    fr: "Total/mois :",
    de: "Gesamt/Monat:",
  },
  "Got it": {
    en: "Got it",
    ru: "Понятно",
    id: "Mengerti",
    fr: "Compris",
    de: "Verstanden",
  },
  "Exit fullscreen": {
    en: "Exit fullscreen",
    ru: "Свернуть",
    id: "Keluar layar penuh",
    fr: "Quitter le plein écran",
    de: "Vollbild beenden",
  },
  Fullscreen: {
    en: "Fullscreen",
    ru: "Во весь экран",
    id: "Layar penuh",
    fr: "Plein écran",
    de: "Vollbild",
  },
  Clear: {
    en: "Clear",
    ru: "Очистить",
    id: "Hapus",
    fr: "Effacer",
    de: "Löschen",
  },
  "Calendar": {
    en: "Calendar",
    ru: "Календарь",
    id: "Kalender",
    fr: "Calendrier",
    de: "Kalender"
  },
  "Apply": {
    en: "Apply",
    ru: "Применить",
    id: "Terapkan",
    fr: "Appliquer",
    de: "Anwenden"
  },
  "Helmet 1": {
    en: "Helmet 1",
    ru: "Шлем 1",
    id: "Helm 1",
    fr: "Casque 1",
    de: "Helm 1"
  },
  "Helmet 2": {
    en: "Helmet 2",
    ru: "Шлем 2",
    id: "Helm 2",
    fr: "Casque 2",
    de: "Helm 2"
  },
  "Delivery Map": {
    en: "Delivery Map",
    ru: "Карта доставки",
    id: "Peta Pengantaran",
    fr: "Carte de livraison",
    de: "Lieferkarte"
  },
  "Delivery time": {
    en: "Delivery time",
    ru: "Время доставки",
    id: "Waktu pengantaran",
    fr: "Heure de livraison",
    de: "Lieferzeit"
  },
  "Surf Rack": {
    en: "Surf Rack",
    ru: "Крепление для серфа",
    id: "Rak Selancar",
    fr: "Rack à surf",
    de: "Surfbrett-Halterung"
  },
  "No": {
    en: "No",
    ru: "Нет",
    id: "Tidak",
    fr: "Non",
    de: "Nein"
  },
  "Yes": {
    en: "Yes",
    ru: "Да",
    id: "Ya",
    fr: "Oui",
    de: "Ja"
  },
  "Contact Details": {
    en: "Contact Details",
    ru: "Контактные данные",
    id: "Detail Kontak",
    fr: "Coordonnées",
    de: "Kontaktdaten"
  },
  "Your Name": {
    en: "Your Name",
    ru: "Ваше имя",
    id: "Nama Anda",
    fr: "Votre nom",
    de: "Ihr Name"
  },
  "WhatsApp Number": {
    en: "WhatsApp Number",
    ru: "Номер WhatsApp",
    id: "Nomor WhatsApp",
    fr: "Numéro WhatsApp",
    de: "WhatsApp-Nummer"
  },
  "Verified": {
    en: "Verified",
    ru: "Подтвержден",
    id: "Terverifikasi",
    fr: "Vérifié",
    de: "Verifiziert"
  },
  "Number is not registered in WhatsApp": {
    en: "Number is not registered in WhatsApp",
    ru: "Номер не зарегистрирован в WhatsApp",
    id: "Nomor tidak terdaftar di WhatsApp",
    fr: "Numéro non enregistré sur WhatsApp",
    de: "Nummer nicht in WhatsApp registriert"
  },
  "Pay Now": {
    en: "Pay Now",
    ru: "Оплатить сейчас",
    id: "Bayar Sekarang",
    fr: "Payer maintenant",
    de: "Jetzt bezahlen"
  },
  "Pay on Delivery": {
    en: "Pay on Delivery",
    ru: "При получении",
    id: "Bayar Saat Pengantaran",
    fr: "Payer à la livraison",
    de: "Zahlung bei Lieferung"
  },
  "Pay": {
    en: "Pay",
    ru: "Оплатить",
    id: "Bayar",
    fr: "Payer",
    de: "Bezahlen"
  },
  "Book": {
    en: "Book",
    ru: "Забронировать",
    id: "Pesan",
    fr: "Réserver",
    de: "Buchen"
  },
};

const getBookingT = (key: string, lang: string): string => {
  const translations = bookingDict[key];
  if (!translations) return key;
  return translations[lang] || translations["en"] || key;
};

export const BookingDetails: React.FC<BookingDetailsProps> = ({
  bike,
  onClose,
}) => {
  const { language, t } = useLanguage();
  const { range, days, setRange } = useRental();
  const [selectedColor, setSelectedColor] = useState(
    bike.colors?.[0]?.name || "",
  );
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Default values for Ordinary Parking
  const DEFAULT_LAT = -8.7466;
  const DEFAULT_LNG = 115.1667;
  const DEFAULT_LOC =
    "Ordinary Parking (Parkir Biasa), Tuban, Kec. Kuta, Kabupaten Badung, Bali 80361";

  // State initialization with localStorage fallback
  const [location, setLocation] = useState(() => {
    return localStorage.getItem("default_location") || DEFAULT_LOC;
  });

  const [mapPosition, setMapPosition] = useState<{ lat: number; lng: number }>(
    () => {
      const savedLat = localStorage.getItem("default_lat");
      const savedLng = localStorage.getItem("default_lng");
      if (savedLat && savedLng) {
        return { lat: parseFloat(savedLat), lng: parseFloat(savedLng) };
      }
      return { lat: DEFAULT_LAT, lng: DEFAULT_LNG };
    },
  );

  // Persist location changes
  useEffect(() => {
    localStorage.setItem("default_location", location);
    localStorage.setItem("default_lat", mapPosition.lat.toString());
    localStorage.setItem("default_lng", mapPosition.lng.toString());
  }, [location, mapPosition]);

  // Lock body scroll and fix background shifting on mobile when component is mounted
  useEffect(() => {
    const scrollY = window.scrollY;

    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100vw";
    document.body.style.height = "100%";
    document.body.style.overflow = "hidden";

    document.documentElement.style.height = "100%";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.height = "";
      document.body.style.overflow = "";

      document.documentElement.style.height = "";
      document.documentElement.style.overflow = "";

      window.scrollTo(0, scrollY);
    };
  }, []);

  const [deliveryTime, setDeliveryTime] = useState("09:00");
  const [helmet1Size, setHelmet1Size] = useState("XL");
  const [helmet2Size, setHelmet2Size] = useState("-");
  const [surfRack, setSurfRack] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [dialCode, setDialCode] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState(false);
  const [isDiscountInfoOpen, setIsDiscountInfoOpen] = useState(false);
  const [isBikeInfoOpen, setIsBikeInfoOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [adminContacts, setAdminContacts] = useState<AdminContacts | null>(
    null,
  );
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [availabilityStatus, setAvailabilityStatus] = useState<
    "idle" | "searching" | "available" | "unavailable"
  >("idle");

  // Promo Code State
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [verifyingPromo, setVerifyingPromo] = useState(false);

  useEffect(() => {
    getAdminContacts().then(setAdminContacts);
  }, []);

  const [selectedDistrict, setSelectedDistrict] = useState<
    string | null | undefined
  >(undefined);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = useMemo(() => {
    if (bike.colors && selectedColor) {
      const colorObj = bike.colors.find((c) => c.name === selectedColor);
      const colorImages = (colorObj?.imageUrls ||
        colorObj?.images ||
        (colorObj?.image || colorObj?.imageUrl
          ? [colorObj?.image || colorObj?.imageUrl]
          : [])) as string[];
      const generalPhotos = (bike.generalPhotos || []) as string[];

      const otherColors = bike.colors.filter((c) => c.name !== selectedColor);
      const otherColorImages = otherColors.reduce((acc, c) => {
        const cImgs = (c.imageUrls ||
          c.images ||
          (c.image || c.imageUrl ? [c.image || c.imageUrl] : [])) as string[];
        return [...acc, ...cImgs];
      }, [] as string[]);

      if (
        colorImages.length > 0 ||
        generalPhotos.length > 0 ||
        otherColorImages.length > 0
      ) {
        return [...colorImages, ...generalPhotos, ...otherColorImages];
      }
    }
    return bike.images || [bike.image];
  }, [bike.images, bike.image, bike.colors, bike.generalPhotos, selectedColor]);

  const carouselRef = useRef<HTMLDivElement>(null);

  // Reset gallery to first image when color changes
  useEffect(() => {
    setCurrentImageIndex(0);
    if (carouselRef.current) {
      carouselRef.current.scrollTo({ left: 0, behavior: "smooth" });
    }
  }, [selectedColor]);

  const handleVerifyWhatsApp = () => {
    if (!isValid || isVerifying || isVerified) return;
    setIsVerifying(true);
    setVerificationError(false);

    // Simulate WhatsApp API verification
    setTimeout(() => {
      setIsVerifying(false);
      // Simulate "Not registered" if number ends in 0
      if (phone.endsWith("0")) {
        setVerificationError(true);
        setIsVerified(false);
      } else {
        setIsVerified(true);
        setVerificationError(false);
      }
    }, 1500);
  };

  const isValid = useMemo(() => {
    return isPhoneValid(phone);
  }, [phone]);

  useEffect(() => {
    if (isValid && !isVerified && !isVerifying && !verificationError) {
      handleVerifyWhatsApp();
    }
  }, [isValid, phone]);

  const calendarRef = useRef<HTMLDivElement>(null);

  const localeMap: Record<string, any> = {
    ru,
    en: enUS,
    id,
    fr,
    de
  };
  const dateLocale = localeMap[language] || enUS;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node)
      ) {
        setIsCalendarOpen(false);
      }
    };
    if (isCalendarOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isCalendarOpen]);

  useEffect(() => {
    if (range.from && range.to) {
      setAvailabilityStatus("searching");
      const timer = setTimeout(() => {
        // Mock: Always available
        setAvailabilityStatus("available");
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      setAvailabilityStatus("idle");
    }
  }, [range.from, range.to]);

  const handleSelect = (newRange: DateRange | undefined) => {
    setRange({ from: newRange?.from, to: newRange?.to });
  };

  // Calculate price based on tiered pricing and promo with smooth interpolation of total cost
  const totalPriceBeforePromo = useMemo(() => {
    if (days <= 0) return 0;

    // Promo works only for rentals <= 7 days
    if (
      days <= 7 &&
      bike.isPromoActive &&
      bike.promoPrice &&
      bike.promoPrice > 0
    ) {
      const rawTotal = days * bike.promoPrice;
      const rounded = Math.round(rawTotal / 50000) * 50000;
      return Math.max(50000, rounded);
    }

    const pDaily = bike.pricePerDay;
    const pMonthly = bike.priceMonthly || pDaily;

    let rawTotal = 0;
    if (days <= 3) {
      rawTotal = days * pDaily;
    } else if (days >= 30) {
      rawTotal = days * pMonthly;
    } else {
      // Days from 4 to 29
      const totalAt3 = 3 * pDaily;
      const totalAt30 = 30 * pMonthly;
      const range = 30 - 3;
      const factor = (days - 3) / range;
      rawTotal = totalAt3 + (totalAt30 - totalAt3) * factor;
    }

    const rounded = Math.round(rawTotal / 50000) * 50000;
    return Math.max(50000, rounded);
  }, [bike, days]);

  const finalPricePerDay = useMemo(() => {
    if (days <= 0) return bike.pricePerDay;
    const rawRate = totalPriceBeforePromo / days;
    const rounded = Math.round(rawRate / 1000) * 1000;
    return Math.max(1000, rounded);
  }, [totalPriceBeforePromo, days, bike.pricePerDay]);

  const weeklyDiscountRange = useMemo(() => {
    const pDaily = bike.pricePerDay || 0;
    const pMonthly = bike.priceMonthly || pDaily;
    if (pDaily <= 0) return { min: 0, max: 0 };

    const totalAt3 = 3 * pDaily;
    const totalAt30 = 30 * pMonthly;

    // Day 4:
    const rawTotal4 = totalAt3 + (totalAt30 - totalAt3) * (1 / 27);
    const rate4 = rawTotal4 / 4;
    const minWeeklyDiscount = Math.round((1 - rate4 / pDaily) * 100);

    // Day 29:
    const rawTotal29 = totalAt3 + (totalAt30 - totalAt3) * (26 / 27);
    const rate29 = rawTotal29 / 29;
    const maxWeeklyDiscount = Math.round((1 - rate29 / pDaily) * 100);

    return { min: Math.max(0, minWeeklyDiscount), max: Math.max(0, maxWeeklyDiscount) };
  }, [bike]);

  const chartData = useMemo(() => {
    const pDaily = bike.pricePerDay || 0;
    const pMonthly = bike.priceMonthly || pDaily;
    if (pDaily <= 0) return [];

    const totalAt3 = 3 * pDaily;
    const totalAt30 = 30 * pMonthly;

    const data = [];
    for (let d = 1; d <= 34; d++) {
      let rawTotal = 0;
      if (d <= 3) {
        rawTotal = d * pDaily;
      } else if (d <= 30) {
        const factor = (d - 3) / 27;
        rawTotal = totalAt3 + (totalAt30 - totalAt3) * factor;
      } else {
        rawTotal = d * pMonthly;
      }

      // Calculate a perfectly uniform linear decrease for the daily price shown on the chart:
      let rate = pDaily;
      if (d <= 30) {
        if (d > 3) {
          rate = pDaily - (pDaily - pMonthly) * (d - 3) / 27;
        }
      } else {
        rate = pMonthly;
      }

      const effectiveRate = Math.max(10000, Math.round(rate / 10000) * 10000);
      const roundedTotal = Math.max(50000, Math.round(rawTotal / 50000) * 50000);
      const kPrice = Math.round(effectiveRate / 1000);
      data.push({
        day: d,
        price: kPrice, // in thousands IDR e.g. 150k
        priceDaily: d <= 3 ? kPrice : null,
        priceWeekly: (d >= 3 && d <= 30) ? kPrice : null,
        priceMonthly: d >= 30 ? kPrice : null,
        fullPrice: effectiveRate,
        totalPrice: roundedTotal
      });
    }
    return data;
  }, [bike]);

  const totalPrice = useMemo(() => {
    let result = totalPriceBeforePromo;
    if (appliedPromo) {
      result = Math.round(result * (1 - appliedPromo.discount / 100));
    }
    const rounded = Math.round(result / 50000) * 50000;
    return days > 0 ? Math.max(50000, rounded) : 0;
  }, [totalPriceBeforePromo, appliedPromo, days]);

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setVerifyingPromo(true);
    setPromoError("");
    try {
      const promo = await verifyPromoCode(promoInput);
      if (promo) {
        setAppliedPromo(promo);
        setPromoError("");
      } else {
        setPromoError("Invalid or expired code");
        setAppliedPromo(null);
      }
    } catch (error) {
      setPromoError("Error verifying code");
    } finally {
      setVerifyingPromo(false);
    }
  };
  const [exchangeRates, setExchangeRates] = useState<{
    idr: number;
    rub: number;
    markupusdt: number;
    markuprub: number;
  } | null>(null);

  useEffect(() => {
    const loadRates = async () => {
      const now = Date.now();
      const ONE_DAY = 24 * 60 * 60 * 1000;
      const DEFAULT_MARKUP = 0.05; // 5%

      // 1. Try Local Storage first (Memory/Cache)
      const cached = localStorage.getItem("exchange");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (
            now - parsed.timestamp < ONE_DAY &&
            parsed.rates?.IDR &&
            parsed.rates?.RUB
          ) {
            setExchangeRates({
              idr: parsed.rates.IDR,
              rub: parsed.rates.RUB,
              markupusdt: parsed.markupusdt ?? DEFAULT_MARKUP,
              markuprub: parsed.markuprub ?? DEFAULT_MARKUP,
            });
            return;
          }
        } catch (e) {
          console.error("Failed to parse cached rates");
        }
      }

      try {
        // 2. Try Firestore
        const fsRates = await getLatestExchangeRates();
        if (fsRates && now - fsRates.timestamp < ONE_DAY) {
          // Handle both older and newer data structures
          const idrRate =
            fsRates.rates && fsRates.rates.IDR && fsRates.rates.IDR > 1
              ? fsRates.rates.IDR
              : fsRates.idr || 16100;
          const rubRate =
            fsRates.rates && fsRates.rates.RUB && fsRates.rates.RUB > 1
              ? fsRates.rates.RUB
              : fsRates.rub || 95;

          // Sanitize markups: if stored as e.g. 5 for 5%, convert to 0.05
          let mUSDT =
            fsRates.markupusdt !== undefined
              ? fsRates.markupusdt
              : DEFAULT_MARKUP;
          let mRUB =
            fsRates.markuprub !== undefined
              ? fsRates.markuprub
              : DEFAULT_MARKUP;

          if (mUSDT > 1) mUSDT = mUSDT / 100;
          if (mRUB > 1) mRUB = mRUB / 100;

          setExchangeRates({
            idr: idrRate,
            rub: rubRate,
            markupusdt: mUSDT,
            markuprub: mRUB,
          });
          // Sync to localStorage
          localStorage.setItem("exchange", JSON.stringify(fsRates));
          return;
        }

        // 3. If missing or old, fetch from API
        const res = await fetch(
          "https://api.exchangerate-api.com/v4/latest/USD",
        );
        const data = await res.json();
        const rates = {
          USD: data.rates.USD,
          IDR: data.rates.IDR,
          RUB: data.rates.RUB,
        };

        const exchangeData = {
          rates,
          timestamp: now,
          markupusdt: DEFAULT_MARKUP,
          markuprub: DEFAULT_MARKUP,
        };

        // Cache everywhere
        await updateExchangeRates(exchangeData);
        localStorage.setItem("exchange", JSON.stringify(exchangeData));

        setExchangeRates({
          idr: rates.IDR,
          rub: rates.RUB,
          markupusdt: DEFAULT_MARKUP,
          markuprub: DEFAULT_MARKUP,
        });
      } catch (e) {
        console.error("Failed to load rates", e);
        // Final fallback to any available cache regardless of age if network fails
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            setExchangeRates({
              idr: parsed.rates.IDR,
              rub: parsed.rates.RUB,
              markupusdt: parsed.markupusdt ?? DEFAULT_MARKUP,
              markuprub: parsed.markuprub ?? DEFAULT_MARKUP,
            });
          } catch (err) {
            setExchangeRates({
              idr: 16100,
              rub: 95,
              markupusdt: DEFAULT_MARKUP,
              markuprub: DEFAULT_MARKUP,
            });
          }
        } else {
          setExchangeRates({
            idr: 16100,
            rub: 95,
            markupusdt: DEFAULT_MARKUP,
            markuprub: DEFAULT_MARKUP,
          });
        }
      }
    };
    loadRates();
  }, []);

  const getUSD = (p: number, showApprox = false, markupPercent = 0) => {
    const idrToUsd = 1 / (exchangeRates?.idr || 16100);
    const withFee = idrToUsd * (1 + markupPercent / 100);
    return `${showApprox ? "~" : ""}$${Math.round(p * withFee)}`;
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

  // Animation for price
  const springConfig = { damping: 30, stiffness: 200 };
  const animatedPrice = useSpring(totalPrice, springConfig);

  useEffect(() => {
    animatedPrice.set(totalPrice);
  }, [totalPrice, animatedPrice]);

  const displayPrice = useTransform(animatedPrice, (latest: any) =>
    Math.round(Number(latest)),
  );

  const PriceRoller = ({ value }: { value: any }) => {
    const [val, setVal] = useState(totalPrice);

    useEffect(() => {
      const unsubscribe = displayPrice.on("change", (v) => {
        setVal(v);
      });
      return () => unsubscribe();
    }, []);

    return <span>{formatPrice(val)}</span>;
  };

  const [showPayment, setShowPayment] = useState(false);
  const [paymentStep, setPaymentStep] = useState<
    "method" | "processing" | "success"
  >("method");
  const [paymentTiming, setPaymentTiming] = useState<"now" | "delivery">("now");
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);

  const handlePayment = async () => {
    if (!selectedMethodId) return;
    setPaymentStep("processing");

    try {
      // Generate a temporary ID if we don't have one from Firestore yet
      const tempBookingId = `PAY-${Date.now()}`;
      let initialPaymentStatus = "unpaid";

      // If Credit Card selected, handle Midtrans first
      if (selectedMethodId === "card") {
        // Midtrans logic (currently placeholder or handled elsewhere)
      }

      await createAndNotify(tempBookingId, initialPaymentStatus as any);

      // Move success to the end of the try block
      setTimeout(() => {
        setPaymentStep("success");
      }, 2000);
    } catch (error) {
      console.error(
        "[Booking Details]: Booking process failed with error:",
        error,
      );
      setPaymentStep("method"); // Go back to payment method if failed
      alert(
        "Booking failed. Please check your internet connection or try again later.",
      );
    }
  };

  const createAndNotify = async (
    paymentId: string,
    paymentStatus: "unpaid" | "paid" | "refunded",
  ) => {
    // Create booking in Firestore
    const bookingData = {
      bikeId: bike.id,
      bikeName: bike.name,
      selectedYear: 2025,
      selectedColor,
      startDate: range.from?.toISOString() || "",
      endDate: range.to?.toISOString() || "",
      days,
      totalPrice,
      location,
      selectedDistrict: selectedDistrict || "Unknown",
      deliveryTime,
      helmet1Size,
      helmet2Size,
      surfRack,
      customerName: name,
      customerPhone: phone,
      customerEmail: email,
      status: "new",
      paymentMethod: selectedMethodId,
      paymentTiming: paymentTiming,
      paymentStatus,
      paymentId,
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, "bookings"), bookingData);
    } catch (error) {
      console.error("[Booking Details]: Firestore save failed:", error);
      handleFirestoreError(error, OperationType.WRITE, "bookings");
    }

    // Notify backend
    await fetch("/api/notify-booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bike,
        selectedYear: 2025,
        selectedColor,
        bookingDetails: {
          days,
          from: range.from
            ? format(range.from, "d MMM y", { locale: dateLocale })
            : "",
          to: range.to
            ? format(range.to, "d MMM y", { locale: dateLocale })
            : "",
          selectedDistrict: selectedDistrict || "Unknown",
          totalPrice,
          totalPriceDisplay:
            selectedMethodId === "crypto"
              ? getUSDT(totalPrice)
              : selectedMethodId === "sbp"
                ? getRUB(totalPrice)
                : `${formatPrice(totalPrice)} IDR`,
          location,
          lat: mapPosition.lat,
          lng: mapPosition.lng,
          deliveryTime,
          helmet1Size,
          helmet2Size,
          surfRack,
          paymentMethod: selectedMethodId,
          paymentTiming,
          paymentStatus,
        },
        customerDetails: { name, phone, email },
      }),
    });
  };

  const swipeStartX = React.useRef<number | null>(null);
  const swipeStartY = React.useRef<number | null>(null);
  const isSwipeCanceled = React.useRef<boolean>(false);

  const handleSwipeTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1 || paymentStep === "processing") return;
    swipeStartX.current = e.touches[0].clientX;
    swipeStartY.current = e.touches[0].clientY;
    isSwipeCanceled.current = false;
  };

  const handleSwipeTouchMove = (e: React.TouchEvent) => {
    if (
      swipeStartX.current === null ||
      swipeStartY.current === null ||
      isSwipeCanceled.current
    )
      return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - swipeStartX.current;
    const deltaY = Math.abs(currentY - swipeStartY.current);

    if (deltaX < 0 || deltaY > deltaX * 0.6) {
      isSwipeCanceled.current = true;
    }
  };

  const handleSwipeTouchEnd = (e: React.TouchEvent) => {
    if (
      swipeStartX.current === null ||
      swipeStartY.current === null ||
      isSwipeCanceled.current
    ) {
      swipeStartX.current = null;
      swipeStartY.current = null;
      return;
    }

    const endX = e.changedTouches[0].clientX;
    const deltaX = endX - swipeStartX.current;

    if (deltaX > 75) {
      if (paymentStep === "method") {
        setShowPayment(false);
      } else if (paymentStep === "success") {
        onClose();
      }
    }

    swipeStartX.current = null;
    swipeStartY.current = null;
  };

  const mainSwipeStartX = React.useRef<number | null>(null);
  const mainSwipeStartY = React.useRef<number | null>(null);
  const isMainSwipeCanceled = React.useRef<boolean>(false);

  const handleMainSwipeTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;

    // Ignore if the start touch target is inside the Map or Carousel, UNLESS started very close to the left edge
    const target = e.target as HTMLElement;
    const isMapOrCarousel =
      target.closest(".gm-style") ||
      target.closest('[ref="carouselRef"]') ||
      target.closest(".snap-x");
    const startX = e.touches[0].clientX;

    if (isMapOrCarousel && startX >= 80) {
      return;
    }

    mainSwipeStartX.current = startX;
    mainSwipeStartY.current = e.touches[0].clientY;
    isMainSwipeCanceled.current = false;
  };

  const handleMainSwipeTouchMove = (e: React.TouchEvent) => {
    if (
      mainSwipeStartX.current === null ||
      mainSwipeStartY.current === null ||
      isMainSwipeCanceled.current
    )
      return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - mainSwipeStartX.current;
    const deltaY = Math.abs(currentY - mainSwipeStartY.current);

    if (deltaX < 0 || deltaY > deltaX * 0.6) {
      isMainSwipeCanceled.current = true;
    }
  };

  const handleMainSwipeTouchEnd = (e: React.TouchEvent) => {
    if (
      mainSwipeStartX.current === null ||
      mainSwipeStartY.current === null ||
      isMainSwipeCanceled.current
    ) {
      mainSwipeStartX.current = null;
      mainSwipeStartY.current = null;
      return;
    }

    const endX = e.changedTouches[0].clientX;
    const deltaX = endX - mainSwipeStartX.current;

    if (deltaX > 75) {
      onClose(); // Go back to the catalog screen
    }

    mainSwipeStartX.current = null;
    mainSwipeStartY.current = null;
  };

  if (showPayment) {
    return (
      <motion.div
        initial={{ opacity: 0, x: "100%" }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: "100%" }}
        onTouchStart={handleSwipeTouchStart}
        onTouchMove={handleSwipeTouchMove}
        onTouchEnd={handleSwipeTouchEnd}
        className="fixed inset-0 z-[200] bg-background flex flex-col h-[100dvh] overflow-y-auto overscroll-none"
      >
        <div className="pt-4 px-6 pb-2 shrink-0">
          <button
            onClick={() => setShowPayment(false)}
            className="p-2 -ml-2 hover:bg-black/5 rounded-xl transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-grow px-6 pb-6 flex flex-col max-w-2xl mx-auto w-full pt-0">
          {paymentStep === "method" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="p-6 bg-surface border border-border rounded-[32px] shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-muted text-[10px] uppercase font-bold tracking-[0.2em] mb-1">
                      {bike.name}
                    </span>
                    <span className="text-2xl font-display font-bold text-foreground tracking-tight">
                      {formatPrice(totalPrice)} IDR
                    </span>
                    <span className="text-[10px] text-muted mt-0.5 font-medium tracking-wide">
                      {getBookingT("Total amount to pay", language)}
                    </span>
                  </div>
                  <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    {days} {getBookingT("days", language)}
                  </div>
                </div>
              </div>

              <div className="flex p-1 bg-muted/20 rounded-2xl mb-6">
                <button
                  onClick={() => {
                    setPaymentTiming("now");
                    setSelectedMethodId(null);
                  }}
                  className={cn(
                    "flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all",
                    paymentTiming === "now"
                      ? "bg-white shadow-sm text-primary"
                      : "text-muted hover:text-foreground",
                  )}
                >
                  {getBookingT("Pay Now", language)}
                </button>
                <button
                  onClick={() => {
                    setPaymentTiming("delivery");
                    setSelectedMethodId(null);
                  }}
                  className={cn(
                    "flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all",
                    paymentTiming === "delivery"
                      ? "bg-white shadow-sm text-primary"
                      : "text-muted hover:text-foreground",
                  )}
                >
                  {getBookingT("Pay on Delivery", language)}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 pb-8">
                {/* Payment Methods Grid */}
                {[
                  {
                    id: "bank_id",
                    name: "Bank Transfer ID",
                    desc: "BCA, BNI, Mandiri...",
                    icon: Landmark,
                    color: "bg-primary",
                    timing: "now",
                  },
                  {
                    id: "sbp",
                    name: "СБП",
                    desc: "Fast Payment",
                    icon: null,
                    color: "bg-white",
                    timing: "now",
                  },
                  {
                    id: "crypto",
                    name: "USDT (Crypto)",
                    desc: "TRC20, ERC20",
                    icon: Coins,
                    color: "bg-[#26A17B]",
                    timing: "now",
                  },

                  {
                    id: "cash",
                    name: "Cash",
                    desc: "On delivery",
                    icon: Banknote,
                    color: "bg-green-600",
                    timing: "delivery",
                  },
                  {
                    id: "bank_id",
                    name: "Bank Transfer ID",
                    desc: "BCA, BNI, Mandiri...",
                    icon: Landmark,
                    color: "bg-primary",
                    timing: "delivery",
                  },
                  {
                    id: "sbp",
                    name: "СБП",
                    desc: "Fast Payment",
                    icon: null,
                    color: "bg-white",
                    timing: "delivery",
                  },
                  {
                    id: "crypto",
                    name: "USDT (Crypto)",
                    desc: "TRC20, ERC20",
                    icon: Coins,
                    color: "bg-[#26A17B]",
                    timing: "delivery",
                  },
                ]
                  .filter((m) => m.timing === paymentTiming)
                  .map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setSelectedMethodId(method.id)}
                      className={`w-full h-16 flex items-center justify-between px-4 bg-surface border rounded-2xl transition-all group ${
                        selectedMethodId === method.id
                          ? "border-primary ring-2 ring-primary/10 shadow-lg shadow-primary/5"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 ${method.color} rounded-xl flex items-center justify-center transform group-hover:scale-105 transition-transform overflow-hidden shrink-0 border border-black/5`}
                        >
                          {method.icon ? (
                            <method.icon
                              className={cn(
                                "w-5 h-5",
                                (method as any).iconColor || "text-white",
                              )}
                            />
                          ) : method.id === "sbp" ? (
                            <div className="flex flex-col items-center">
                              <span className="text-primary text-[8px] leading-tight font-black tracking-tighter">
                                СБП
                              </span>
                              <div className="flex gap-0.5 mt-0.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#FFB100]" />
                                <div className="w-1.5 h-1.5 rounded-full bg-[#133F85]" />
                                <div className="w-1.5 h-1.5 rounded-full bg-[#4DAF50]" />
                              </div>
                            </div>
                          ) : null}
                        </div>
                        <div className="flex flex-col items-start min-w-0 text-left">
                          <span className="font-bold text-xs truncate w-full text-left">
                            {method.name}
                          </span>
                          <span className="text-[9px] text-muted font-medium truncate w-full text-left">
                            {method.desc}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center shrink-0 gap-3">
                        <span className="font-display font-black text-xs text-foreground/80">
                          {method.id === "cash" || method.id === "bank_id"
                            ? `Rp ${totalPrice.toLocaleString()}`
                            : method.id === "sbp"
                              ? getRUB(totalPrice)
                              : method.id === "crypto"
                                ? getUSDT(totalPrice)
                                : ""}
                        </span>
                        <div
                          className={`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center shrink-0 ${
                            selectedMethodId === method.id
                              ? "border-primary bg-primary"
                              : "border-border group-hover:border-primary/40"
                          }`}
                        >
                          {selectedMethodId === method.id && (
                            <Check className="w-3 h-3 text-white stroke-[4]" />
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
              </div>

              <div className="mt-auto pt-6">
                <button
                  onClick={handlePayment}
                  disabled={!selectedMethodId}
                  className={`w-full h-16 rounded-[24px] font-display font-bold text-lg transition-all ${
                    selectedMethodId
                      ? "bg-foreground text-white shadow-xl shadow-black/10 hover:bg-black"
                      : "bg-muted/10 text-muted cursor-not-allowed"
                  }`}
                >
                  {paymentTiming === "now" ? getBookingT("Pay", language) : getBookingT("Book", language)}
                </button>
              </div>
            </motion.div>
          )}

          {paymentStep === "processing" && (
            <div className="flex-grow flex flex-col items-center justify-center text-center space-y-8 p-12">
              <div className="relative">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="w-24 h-24 border-4 border-primary/20 border-t-primary rounded-full shadow-2xl shadow-primary/10"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-2 border-4 border-black/5 border-b-black/20 rounded-full"
                />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-display font-bold text-foreground">
                  Processing Booking...
                </h3>
                <p className="text-sm text-muted font-medium">
                  Please do not close this window
                </p>
              </div>
            </div>
          )}

          {paymentStep === "success" && (
            <div className="flex-grow flex flex-col items-center justify-center text-center space-y-10 p-6">
              <div className="relative">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 12, stiffness: 200 }}
                  className="w-32 h-32 bg-green-500 rounded-[40px] flex items-center justify-center text-white shadow-2xl shadow-green-500/20"
                >
                  <Check className="w-16 h-16 stroke-[3]" />
                </motion.div>
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0, 1, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 bg-green-500 rounded-[40px] blur-2xl -z-10"
                />
              </div>
              <div className="space-y-4">
                <h2 className="text-4xl font-display font-bold text-foreground">
                  Thank You!
                </h2>
                <div className="space-y-2">
                  <p className="text-muted font-medium">
                    Your reservation is confirmed.
                  </p>
                  <div className="p-4 bg-surface rounded-2xl border border-border inline-block">
                    <p className="text-xs font-bold text-foreground">
                      We will reach out via WhatsApp shortly.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full h-20 bg-foreground text-white rounded-3xl font-display font-bold text-lg hover:bg-black transition-all shadow-2xl shadow-black/20"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: "100%" }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      onTouchStart={handleMainSwipeTouchStart}
      onTouchMove={handleMainSwipeTouchMove}
      onTouchEnd={handleMainSwipeTouchEnd}
      className="fixed inset-0 z-[100] bg-background flex flex-col h-[100dvh] w-full max-w-full overflow-y-auto overflow-x-hidden overscroll-none"
    >
      {/* Header Image Carousel */}
      <div className="relative w-full h-[38vh] sm:h-[50vh] shrink-0 bg-muted group/header">
        <div
          ref={carouselRef}
          className="flex h-full overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden scroll-smooth"
          onScroll={(e) => {
            const target = e.currentTarget;
            const index = Math.round(target.scrollLeft / target.clientWidth);
            if (index !== currentImageIndex) setCurrentImageIndex(index);
          }}
        >
          {images.map((img, idx) => (
            <div
              key={idx}
              className="w-full h-full snap-center shrink-0 flex-none overflow-hidden"
            >
              <img
                src={img}
                alt={`${bike.name} ${idx + 1}`}
                className="w-full h-full object-cover select-none"
                referrerPolicy="no-referrer"
              />
            </div>
          ))}
        </div>

        {/* Desktop Navigation Zones */}
        <div className="hidden md:block absolute inset-y-0 left-0 w-24 z-20 group/nav-left">
          <button
            onClick={(e) => {
              const container =
                e.currentTarget.parentElement?.parentElement?.querySelector(
                  "div",
                );
              if (container) {
                container.scrollTo({
                  left: (currentImageIndex - 1) * container.clientWidth,
                  behavior: "smooth",
                });
              }
            }}
            className="w-full h-full bg-black/0 hover:bg-black/20 transition-all duration-300 flex items-center justify-center"
            aria-label="Previous photo"
          >
            <ChevronLeft className="w-8 h-8 text-white opacity-0 group-hover/nav-left:opacity-100 transition-opacity" />
          </button>
        </div>
        <div className="hidden md:block absolute inset-y-0 right-0 w-24 z-20 group/nav-right">
          <button
            onClick={(e) => {
              const container =
                e.currentTarget.parentElement?.parentElement?.querySelector(
                  "div",
                );
              if (container) {
                container.scrollTo({
                  left: (currentImageIndex + 1) * container.clientWidth,
                  behavior: "smooth",
                });
              }
            }}
            className="w-full h-full bg-black/0 hover:bg-black/20 transition-all duration-300 flex items-center justify-center"
            aria-label="Next photo"
          >
            <ChevronLeft className="w-8 h-8 text-white rotate-180 opacity-0 group-hover/nav-right:opacity-100 transition-opacity" />
          </button>
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 left-4 sm:top-6 sm:left-6 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-transparent rounded-full border border-white/20 text-white hover:bg-white/10 transition-all active:scale-90 z-20"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Swipe Hint */}
        {images.length > 1 && currentImageIndex === 0 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1, repeat: 3, repeatType: "reverse" }}
            className="absolute right-6 top-1/2 -translate-y-1/2 p-2 bg-white/10 backdrop-blur-md rounded-full text-white/40 pointer-events-none"
          >
            <ChevronLeft className="w-6 h-6 rotate-180" />
          </motion.div>
        )}
      </div>

      {/* Content */}
      <div className="flex-grow px-4 pt-2 pb-2 max-w-2xl mx-auto w-full space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display font-bold text-foreground leading-tight">
              {bike.name}
            </h1>
            <button
              onClick={() => setIsBikeInfoOpen(true)}
              className="p-1.5 hover:bg-primary/10 rounded-full text-muted hover:text-primary transition-all"
            >
              <Info className="w-5 h-5" />
            </button>
          </div>

          <div className="h-px w-full bg-border opacity-50" />

          {/* Price Section */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-display font-bold text-foreground">
                {formatPrice(finalPricePerDay)} IDR
              </span>
              <span className="text-xs font-medium text-muted opacity-70">
                {getUSD(finalPricePerDay, true)}
              </span>
            </div>

            <div className="flex items-center gap-2 h-5">
              {finalPricePerDay < bike.pricePerDay ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted line-through decoration-muted/50">
                    {formatPrice(bike.pricePerDay)} IDR
                  </span>
                  <span className="text-sm font-black text-red-500 leading-none">
                    -
                    {Math.round(
                      (1 - finalPricePerDay / bike.pricePerDay) * 100,
                    )}
                    %
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsDiscountInfoOpen(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/5 hover:bg-red-500/10 border border-red-500/15 rounded-full transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    <span className="text-[9px] font-black text-red-500 uppercase tracking-widest leading-none border-b border-red-500/30 hover:border-red-500 pb-0.5">
                      {days <= 7 &&
                      bike.isPromoActive &&
                      bike.promoPrice &&
                      bike.promoPrice > 0
                        ? getBookingT("promo price", language)
                        : days >= 30
                          ? getBookingT("Monthly Rate", language)
                          : getBookingT("Weekly Rate", language)}
                    </span>
                    <Info className="w-2.5 h-2.5 text-red-500 inline-block shrink-0" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsDiscountInfoOpen(true)}
                  className="text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-1 pb-0.5 border-b border-primary/20 hover:border-primary/80 transition-all cursor-pointer active:scale-95"
                >
                  <span>{getBookingT("Rates & discounts", language)}</span>
                  <Info className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Color Selector */}
        {bike.colors && (
          <div className="flex gap-3">
            {bike.colors.map((color) => (
              <button
                key={color.name}
                onClick={() => setSelectedColor(color.name)}
                className={`w-8 h-8 rounded-full border-2 transition-all p-0.5 ${
                  selectedColor === color.name
                    ? "border-primary ring-4 ring-primary/10"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <div
                  className="w-full h-full rounded-full shadow-inner"
                  style={{ backgroundColor: color.hex }}
                />
              </button>
            ))}
          </div>
        )}

        {/* Info Grid - Interactive Date Selection */}
        <div className={`relative ${bike.colors ? "!mt-8" : ""}`}>
          <div
            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
            className={`group cursor-pointer rounded-3xl border transition-all duration-300 overflow-hidden ${
              isCalendarOpen
                ? "border-primary bg-primary/5 shadow-2xl shadow-primary/10 ring-4 ring-primary/5"
                : "bg-surface border-border hover:border-primary/40 hover:shadow-xl hover:shadow-black/5"
            }`}
          >
            <div className="flex items-stretch h-16">
              {/* Check-in */}
              <div className="flex-1 px-6 flex flex-col justify-center">
                <span className="font-display font-medium text-sm text-foreground">
                  {range.from
                    ? format(range.from, "d MMM y", { locale: dateLocale })
                    : "..."}
                </span>
              </div>

              <div className="flex items-center text-muted px-2">
                <span className="w-4 h-[1px] bg-border" />
              </div>

              {/* Check-out */}
              <div className="flex-1 px-6 flex flex-col justify-center text-right">
                <span className="font-display font-medium text-sm text-foreground">
                  {range.to
                    ? format(range.to, "d MMM y", { locale: dateLocale })
                    : "..."}
                </span>
              </div>

              {/* Duration / Rate Badge */}
              <div className="bg-foreground flex flex-col items-center justify-center px-4 transition-colors group-hover:bg-primary min-w-[80px] py-1">
                <span className="text-lg font-display font-bold text-white leading-none">
                  {days}
                </span>
                {finalPricePerDay < bike.pricePerDay && (
                  <div className="mt-1 px-2 py-0.5 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                    <span className="text-[8px] font-black text-white uppercase leading-none">
                      -
                      {Math.round(
                        (1 - finalPricePerDay / bike.pricePerDay) * 100,
                      )}
                      %
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <AnimatePresence>
            {isCalendarOpen && (
              <motion.div
                ref={calendarRef}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-full left-0 right-0 mt-4 bg-surface border border-border rounded-3xl p-6 shadow-2xl z-[600] overflow-hidden"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-foreground">
                    {getBookingT("Calendar", language)}
                  </h3>
                  <button
                    onClick={() => setIsCalendarOpen(false)}
                    className="p-1 hover:bg-black/5 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-muted" />
                  </button>
                </div>

                <div className="rdp-custom flex justify-center">
                  <DayPicker
                    mode="range"
                    selected={range}
                    onSelect={handleSelect}
                    numberOfMonths={1}
                    locale={dateLocale}
                    disabled={{ before: addDays(startOfToday(), 1) }}
                    className="!m-0"
                    classNames={{
                      day_selected: "bg-primary text-white rounded-full",
                      day_today: "text-primary font-bold underline",
                      day_range_middle:
                        "bg-primary/20 !text-white rounded-none",
                      day_range_start: "bg-primary text-white rounded-l-full",
                      day_range_end: "bg-primary text-white rounded-r-full",
                    }}
                  />
                </div>

                <button
                  onClick={() => setIsCalendarOpen(false)}
                  className="w-full mt-6 bg-primary text-white py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                >
                  {getBookingT("Apply", language)}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-2 px-1">
            <AnimatePresence mode="wait">
              {availabilityStatus === "searching" && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="flex items-center gap-1.5"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                    {getBookingT("Searching...", language)}
                  </span>
                </motion.div>
              )}
              {availabilityStatus === "available" && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="flex items-center gap-1.5"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-[10px] font-bold text-green-500 uppercase tracking-wider">
                    {getBookingT("Available", language)}
                  </span>
                </motion.div>
              )}
              {availabilityStatus === "unavailable" && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="mt-2 p-4 bg-red-50 border border-red-100 rounded-2xl w-full space-y-3"
                >
                  <p className="text-[10px] sm:text-xs leading-relaxed text-red-600 font-medium text-center">
                    {getBookingT("Not available for these dates, please pick other dates or contact operator", language)}
                  </p>
                  <a
                    href={
                      adminContacts
                        ? `https://wa.me/${adminContacts.whatsapp.replace(/\D/g, "")}?text=Hello!%20I'd%20like%20to%20book%20a%20bike`
                        : "#"
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-red-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    {getBookingT("Contact Operator", language)}
                  </a>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Location & Time Section */}
        <div className="space-y-3 !mt-8">
          <div className="space-y-1.5">
            <span className="text-[9px] text-muted uppercase font-bold tracking-widest px-1">
              {getBookingT("Delivery Map", language)}
            </span>
            <MapPicker
              position={mapPosition}
              setPosition={setMapPosition}
              setLocation={setLocation}
              language={language}
              isFullscreen={isMapFullscreen}
              setIsFullscreen={setIsMapFullscreen}
              selectedDistrict={selectedDistrict}
              setSelectedDistrict={setSelectedDistrict}
              location={location}
            />
            {selectedDistrict === null && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 p-4 bg-red-50 border border-red-100 rounded-2xl w-full space-y-3"
              >
                <p className="text-[10px] sm:text-xs leading-relaxed text-red-600 font-medium text-center">
                  {t.booking.outOfZone}
                </p>
                <a
                  href={
                    adminContacts
                      ? `https://wa.me/${adminContacts.whatsapp.replace(/\D/g, "")}?text=Hello!%20I'd%20like%20to%20book%20a%20bike`
                      : "#"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-red-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Contact Support
                </a>
              </motion.div>
            )}
          </div>

          {/* Helmets Selection (Two in one row, larger sizes) */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <span className="text-[9px] text-muted uppercase font-bold tracking-widest px-1">
                {getBookingT("Helmet 1", language)}
              </span>
              <div className="flex bg-surface border border-border rounded-2xl p-1 gap-1 h-[54px] items-center">
                {HELMET_1_SIZES.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setHelmet1Size(size)}
                    className={`flex-1 h-full text-xs font-black rounded-xl transition-all ${
                      helmet1Size === size
                        ? "bg-primary text-white shadow-md shadow-primary/10"
                        : "text-muted hover:text-foreground hover:bg-primary/5"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[9px] text-muted uppercase font-bold tracking-widest px-1">
                {getBookingT("Helmet 2", language)}
              </span>
              <div className="flex bg-surface border border-border rounded-2xl p-1 gap-1 h-[54px] items-center">
                {HELMET_2_SIZES.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setHelmet2Size(size)}
                    className={`flex-1 h-full text-xs font-black rounded-xl transition-all ${
                      helmet2Size === size
                        ? "bg-primary text-white shadow-md shadow-primary/10"
                        : "text-muted hover:text-foreground hover:bg-primary/5"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Time & Surf Rack row (Larger, in one row) */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <span className="text-[9px] text-muted uppercase font-bold tracking-widest px-1">
                {getBookingT("Delivery time", language)}
              </span>
              <div className="relative w-full">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary opacity-60 z-10 pointer-events-none" />
                <CustomTimePicker
                  value={deliveryTime}
                  onChange={setDeliveryTime}
                  language={language}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[9px] text-muted uppercase font-bold tracking-widest px-1">
                {getBookingT("Surf Rack", language)}
              </span>
              <div className="flex bg-surface border border-border rounded-2xl p-1 gap-1 h-[54px] items-center">
                {[
                  { label: getBookingT("No", language), value: false },
                  { label: getBookingT("Yes", language), value: true },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setSurfRack(opt.value)}
                    className={`flex-1 h-full text-xs font-black rounded-xl transition-all ${
                      surfRack === opt.value
                        ? "bg-primary text-white shadow-md shadow-primary/10"
                        : "text-muted hover:text-foreground hover:bg-primary/5"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="space-y-1.5 !mt-8">
          <div className="px-1">
            <span className="text-[9px] text-muted uppercase font-bold tracking-widest">
              {getBookingT("Contact Details", language)}
            </span>
          </div>
          <div className="space-y-2.5">
            {/* Name Input */}
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary opacity-60" />
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                  const formatted = val
                    .split(" ")
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(" ");
                  setName(formatted);
                }}
                placeholder={getBookingT("Your Name", language)}
                className="w-full h-[54px] bg-surface border border-border rounded-2xl pl-11 pr-4 text-[15px] md:text-base font-medium focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none"
              />
            </div>

            {/* Phone Input */}
            <div className="relative phone-input-container">
              <PhoneInput
                country={""}
                value={phone}
                onChange={(val) => {
                  const normalized = normalizePhoneNumber(val || "");
                  setPhone(normalized);
                  setIsVerified(false);
                  setIsVerifying(false);
                  setVerificationError(false);
                }}
                disableDropdown={true}
                placeholder={getBookingT("WhatsApp Number", language)}
                containerClass="!w-full"
                inputClass={cn(
                  "!w-full !h-[54px] !pl-11 !pr-4 !rounded-2xl !bg-surface !border !text-[15px] md:!text-base !font-sans !font-medium !text-foreground !outline-none focus:!border-primary focus:!ring-4 focus:!ring-primary/5 transition-all",
                  phone && !isValid ? "!border-red-500/50" : "!border-border",
                )}
                buttonClass="!hidden"
              />
              {/* Custom WhatsApp Icon aligned with User icon */}
              <MessageCircle
                className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isVerified ? "text-green-500" : "text-primary opacity-60"} z-10 pointer-events-none`}
              />

              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 z-10">
                {isVerified ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-green-500 uppercase tracking-tighter animate-in fade-in slide-in-from-right-1">
                      {getBookingT("Verified", language)}
                    </span>
                    <Check className="w-4 h-4 text-green-500 animate-in zoom-in" />
                  </div>
                ) : isVerifying ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : verificationError ? (
                  <div className="w-4 h-4 text-red-500 bg-red-500/10 rounded-full flex items-center justify-center font-bold text-[10px]">
                    !
                  </div>
                ) : phone && phone.length > 3 ? (
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse pointer-events-none" />
                ) : null}
              </div>
            </div>
            {verificationError && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[10px] font-bold text-red-500 px-4 mt-1"
              >
                {getBookingT("Number is not registered in WhatsApp", language)}
              </motion.p>
            )}
          </div>

          {/* Acceptance Checkbox */}
          <div className="flex justify-center px-1 pt-1">
            <label className="flex items-center gap-2 cursor-pointer group max-w-fit">
              <div className="relative flex items-center shrink-0">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="w-4 h-4 border border-muted/30 rounded-sm bg-white/5 peer-checked:bg-muted/20 peer-checked:border-muted/40 transition-all flex items-center justify-center group-hover:border-muted/60">
                  <Check className="w-2.5 h-2.5 text-muted opacity-0 peer-checked:opacity-100 transition-opacity" />
                </div>
              </div>
              <span className="text-[9px] md:text-[11px] text-muted/50 leading-none font-light tracking-wide">
                {getBookingT("I agree to the", language)}{" "}
                <a
                  href="/terms.html"
                  className="text-muted/70 hover:text-primary transition-colors underline underline-offset-2 decoration-muted/30"
                >
                  {getBookingT("Terms of Service", language)}
                </a>{" "}
                {getBookingT("and", language)}{" "}
                <a
                  href="/privacy.html"
                  className="text-muted/70 hover:text-primary transition-colors underline underline-offset-2 decoration-muted/30"
                >
                  {getBookingT("Privacy Policy", language)}
                </a>
              </span>
            </label>
          </div>
        </div>

        {/* Promo Code Block */}
        <div className="pt-2">
          {!showPromoInput && !appliedPromo ? (
            <button
              onClick={() => setShowPromoInput(true)}
              className="text-[10px] font-bold text-primary hover:underline px-1"
            >
              {getBookingT("Promo code?", language)}
            </button>
          ) : (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
              {appliedPromo ? (
                <div className="flex items-center justify-between bg-green-500/5 border border-green-500/10 rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-600">
                      <Tag className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-green-600 uppercase tracking-tight">
                        {getBookingT("Promo applied: -", language)}{appliedPromo.discount}%
                      </p>
                      <p className="text-[10px] text-green-600/70 font-bold uppercase tracking-widest">
                        {appliedPromo.code}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setAppliedPromo(null);
                      setPromoInput("");
                    }}
                    className="p-2 hover:bg-green-500/10 rounded-lg transition-colors text-green-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      placeholder="ENTER CODE"
                      value={promoInput}
                      onChange={(e) =>
                        setPromoInput(e.target.value.toUpperCase())
                      }
                      className="flex-1 bg-surface border border-border px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted/40"
                    />
                    <button
                      onClick={handleApplyPromo}
                      disabled={verifyingPromo || !promoInput.trim()}
                      className="bg-primary text-white px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale disabled:hover:scale-100"
                    >
                      {verifyingPromo ? (
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                      ) : (
                        "Apply"
                      )}
                    </button>
                  </div>
                  {promoError && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[9px] font-bold text-red-500 px-4"
                    >
                      {promoError}
                    </motion.p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Rates Info Modal */}
      <AnimatePresence>
        {isDiscountInfoOpen && (
          <div className="fixed inset-0 z-[1200] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDiscountInfoOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-surface w-full max-w-[440px] rounded-[32px] overflow-hidden shadow-2xl relative z-10 p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-display font-bold text-foreground">
                  {getBookingT("Rental Rates", language)}
                </h3>
                <button
                  onClick={() => setIsDiscountInfoOpen(false)}
                  className="p-2 hover:bg-black/5 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5 text-muted" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Visual Chart with segments */}
                <div className="p-5 bg-muted/5 border border-border/50 rounded-[24px]">
                  {/* Legend Badges for tiers in a column (столбик) */}
                  <div className="flex flex-col gap-2.5 mb-5 border-b border-border/40 pb-4 text-[11px] font-semibold leading-relaxed">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: '#94A3B8' }} />
                      <span className="text-foreground">
                        {language === 'ru' ? '1-3 дней — Дневной тариф' :
                         language === 'id' ? '1-3 hari — Tarif Harian' :
                         language === 'fr' ? '1-3 jours — Tarif Journalier' :
                         language === 'de' ? '1-3 Tage — Tagespreis' :
                         '1-3 days — Daily Rate'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: '#F27D26' }} />
                      <span className="text-foreground">
                        {language === 'ru' ? '4-29 дней — Недельный тариф' :
                         language === 'id' ? '4-29 hari — Tarif Mingguan' :
                         language === 'fr' ? '4-29 jours — Tarif Hebdomadaire' :
                         language === 'de' ? '4-29 Tage — Wochenpreis' :
                         '4-29 days — Weekly Rate'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: '#10B981' }} />
                      <span className="text-foreground">
                        {language === 'ru' ? '30+ дней — Месячный тариф' :
                         language === 'id' ? '30+ hari — Tarif Bulanan' :
                         language === 'fr' ? '30+ jours — Tarif Mensuel' :
                         language === 'de' ? '30+ Tage — Monatspreis' :
                         '30+ days — Monthly Rate'}
                      </span>
                    </div>
                  </div>
 
                  <div className="w-full h-36 mt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 12, right: 10, left: -22, bottom: 0 }}>
                        <defs>
                          {/* Daily gradient (Slate/Gray) */}
                          <linearGradient id="colorDaily" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#94A3B8" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#94A3B8" stopOpacity={0}/>
                          </linearGradient>
                          {/* Weekly gradient (Brand Orange) */}
                          <linearGradient id="colorWeekly" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#F27D26" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#F27D26" stopOpacity={0}/>
                          </linearGradient>
                          {/* Monthly gradient (Emerald Green) */}
                          <linearGradient id="colorMonthly" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                        <XAxis 
                          dataKey="day" 
                          tickLine={false} 
                          axisLine={false} 
                          tick={{ fill: '#6B7280', fontSize: 8 }}
                          ticks={[1, 5, 10, 15, 20, 25, 30]}
                          tickFormatter={(val) => {
                            if (val === 30) {
                              return "30+";
                            }
                            return `${val}${language === 'ru' ? 'д' : 'd'}`;
                          }}
                        />
                        <YAxis 
                          tickLine={false} 
                          axisLine={false} 
                          tick={{ fill: '#6B7280', fontSize: 8 }}
                          unit="k"
                        />
                        <Tooltip
                          position={{ y: -80 }}
                          allowEscapeViewBox={{ x: true, y: true }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              const displayDay = data.day >= 30 ? "30+" : data.day;
                              const totalLabel = language === 'ru' ? 'Итого' 
                                : language === 'id' ? 'Total' 
                                : language === 'fr' ? 'Total' 
                                : language === 'de' ? 'Gesamt' 
                                : 'Total';
                              const perDayLabel = getBookingT("per day", language);
                              const totalDaysCount = data.day >= 30 ? 30 : data.day;
                              return (
                                <div className="bg-surface/95 border border-border/50 p-2.5 rounded-xl shadow-xl text-[10px] font-medium leading-normal text-foreground space-y-1">
                                  <p className="font-bold text-muted leading-none mb-1.5">
                                    {displayDay} {getBookingT("days", language)}
                                  </p>
                                  <p className="font-semibold flex justify-between gap-3 text-muted">
                                    <span>{perDayLabel}:</span>
                                    <span>{formatPrice(data.fullPrice)} IDR</span>
                                  </p>
                                  <p className="font-bold text-primary flex justify-between gap-3 border-t border-border/40 pt-1 mt-1">
                                    <span>{totalLabel}:</span>
                                    <span>{formatPrice(data.totalPrice || (data.fullPrice * totalDaysCount))} IDR</span>
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        {/* Text labels directly on the chart segments */}
                        <ReferenceLine 
                          x={1.8} 
                          stroke="none" 
                          label={{ 
                            value: language === 'ru' ? 'Дневной' : language === 'id' ? 'Harian' : 'Daily', 
                            fill: '#94A3B8', 
                            fontSize: 8, 
                            fontWeight: 'bold', 
                            position: 'insideTop' 
                          }} 
                        />
                        <ReferenceLine 
                          x={16} 
                          stroke="none" 
                          label={{ 
                            value: language === 'ru' ? 'Недельный' : language === 'id' ? 'Mingguan' : 'Weekly', 
                            fill: '#F27D26', 
                            fontSize: 8, 
                            fontWeight: 'bold', 
                            position: 'insideTop' 
                          }} 
                        />
                        <ReferenceLine 
                          x={32} 
                          stroke="none" 
                          label={{ 
                            value: language === 'ru' ? 'Месячный' : language === 'id' ? 'Bulanan' : 'Monthly', 
                            fill: '#10B981', 
                            fontSize: 8, 
                            fontWeight: 'bold', 
                            position: 'insideTop' 
                          }} 
                        />
                        
                        <ReferenceLine x={3} stroke="rgba(148, 163, 184, 0.2)" strokeDasharray="3 3" />
                        <ReferenceLine x={29} stroke="rgba(16, 185, 129, 0.2)" strokeDasharray="3 3" />
                        
                        <Area 
                          type="monotone" 
                          dataKey="priceDaily" 
                          stroke="#94A3B8" 
                          strokeWidth={2.5}
                          fillOpacity={1} 
                          fill="url(#colorDaily)" 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="priceWeekly" 
                          stroke="#F27D26" 
                          strokeWidth={2.5}
                          fillOpacity={1} 
                          fill="url(#colorWeekly)" 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="priceMonthly" 
                          stroke="#10B981" 
                          strokeWidth={2.5}
                          fillOpacity={1} 
                          fill="url(#colorMonthly)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsDiscountInfoOpen(false)}
                className="w-full mt-8 h-16 bg-primary text-white rounded-2xl font-display font-bold text-lg hover:shadow-xl hover:shadow-primary/20 transition-all active:scale-95 cursor-pointer"
              >
                {getBookingT("Got it", language)}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bike Info Modal */}
      <BikeInfoModal
        bike={bike}
        isOpen={isBikeInfoOpen}
        onClose={() => setIsBikeInfoOpen(false)}
      />

      {/* Sticky Bottom Bar */}
      <div className="sticky bottom-0 bg-surface/95 backdrop-blur-xl border-t border-border px-0 py-2.5 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:px-0 sm:py-4 mt-auto z-[1000] shadow-[0_-20px_50px_rgba(0,0,0,0.15)]">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-6 px-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-display font-bold text-foreground">
                <PriceRoller value={totalPrice} /> IDR
              </span>
              <span className="text-[10px] font-medium text-muted opacity-70 leading-none">
                {getUSD(totalPrice)}
              </span>
            </div>

            <div className="flex items-center gap-2 min-h-[14px]">
              {(finalPricePerDay < bike.pricePerDay || appliedPromo) && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted line-through decoration-muted/50">
                    {formatPrice(bike.pricePerDay * days)} IDR
                  </span>
                  <span className="text-[10px] font-black text-red-500 leading-none">
                    -
                    {Math.round(
                      (1 - totalPrice / (bike.pricePerDay * days)) * 100,
                    )}
                    %
                  </span>
                    <button
                      type="button"
                      onClick={() => setIsDiscountInfoOpen(true)}
                      className="text-[8px] font-black text-red-500 uppercase tracking-tighter cursor-pointer pb-px border-b border-red-500/30 hover:border-red-500 flex items-center gap-0.5 transition-all text-left"
                    >
                      {appliedPromo
                        ? getBookingT("promo code", language)
                        : days <= 7 &&
                            bike.isPromoActive &&
                            bike.promoPrice &&
                            bike.promoPrice > 0
                          ? getBookingT("promo price", language)
                          : days >= 30
                            ? getBookingT("Monthly Rate", language)
                            : getBookingT("Weekly Rate", language)}
                      <Info className="w-2.5 h-2.5 text-red-500 shrink-0 inline-block" />
                    </button>
                </div>
              )}
            </div>
          </div>

          <button
            disabled={!acceptedTerms}
            onClick={() => {
              if (selectedDistrict === null) {
                const mapEl = document.querySelector(".leaflet-container");
                mapEl?.classList.add(
                  "ring-2",
                  "ring-red-500",
                  "shake-animation",
                );
                setTimeout(
                  () =>
                    mapEl?.classList.remove(
                      "ring-2",
                      "ring-red-500",
                      "shake-animation",
                    ),
                  2000,
                );
                return;
              }
              if (!isVerified) {
                const el = document.getElementById("phone-input");
                const container = el?.closest(".phone-input-container");
                container?.classList.add("border-red-500", "shake-animation");
                setTimeout(
                  () =>
                    container?.classList.remove(
                      "border-red-500",
                      "shake-animation",
                    ),
                  2000,
                );
                return;
              }
              setShowPayment(true);
            }}
            className={cn(
              "flex-1 max-w-[200px] py-4 rounded-2xl text-xs font-bold uppercase tracking-widest shadow-xl transition-all",
              isVerified && selectedDistrict !== null && acceptedTerms
                ? "bg-primary text-white shadow-primary/20 hover:scale-105 active:scale-95"
                : "bg-muted/20 text-muted cursor-not-allowed opacity-50",
            )}
          >
            {selectedDistrict === null ? "Outside Zone" : "Book"}
          </button>
        </div>
      </div>
    </motion.div>
  );
};
