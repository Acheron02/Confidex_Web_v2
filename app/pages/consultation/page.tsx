"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  HeartPulse,
  Loader2,
  MapPin,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";

type FacilityService = "HIV" | "Dengue" | "General";

type Facility = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  category: string;
  address: string;
  phone?: string;
  website?: string;
  services: FacilityService[];
  source: "OpenStreetMap" | "Manual fallback";
};

type FacilityFilter = "all" | "hiv" | "dengue";

type OverpassElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: {
    lat?: number;
    lon?: number;
  };
  tags?: Record<string, string>;
};

type FacilityCachePayload = {
  cachedAt: number;
  facilities: Facility[];
};

declare global {
  interface Window {
    L?: any;
    __confidexLeafletLoading?: Promise<void>;
  }
}

function readNumberFromEnv(value: string | undefined, fallback: number) {
  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

const BOOTH_LOCATION = {
  name:
    process.env.NEXT_PUBLIC_CONFIDEX_BOOTH_NAME ||
    "CONFIDEX Booth - National University Fairview",
  latitude: readNumberFromEnv(
    process.env.NEXT_PUBLIC_CONFIDEX_BOOTH_LATITUDE,
    14.7339,
  ),
  longitude: readNumberFromEnv(
    process.env.NEXT_PUBLIC_CONFIDEX_BOOTH_LONGITUDE,
    121.0587,
  ),
  address:
    process.env.NEXT_PUBLIC_CONFIDEX_BOOTH_ADDRESS ||
    "SM City Fairview Complex, Quirino Highway corner Regalado Avenue, Greater Lagro, Quezon City 1100",
};

const SEARCH_RADIUS_METERS = 10000;
const MAX_FACILITIES = 20;
const LEAFLET_CSS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const FACILITY_CACHE_VERSION = "v5-responsive-filtered-hiv-only";
const FACILITY_CACHE_TTL_MS = 1000 * 60 * 60 * 12;
const FACILITY_CACHE_KEY = [
  "confidex",
  "consultation-facilities",
  FACILITY_CACHE_VERSION,
  BOOTH_LOCATION.latitude.toFixed(5),
  BOOTH_LOCATION.longitude.toFixed(5),
  SEARCH_RADIUS_METERS,
  MAX_FACILITIES,
].join(":");

const filterOptions: Array<{
  value: FacilityFilter;
  label: string;
  helper: string;
}> = [
  {
    value: "all",
    label: "All nearby facilities",
    helper: "Hospitals, clinics, doctors, and health centers around the booth.",
  },
  {
    value: "hiv",
    label: "HIV consultation / referral",
    helper:
      "Facilities to contact for confirmatory testing, counseling, or referral.",
  },
  {
    value: "dengue",
    label: "Dengue consultation",
    helper: "Nearby hospitals or clinics for fever assessment and urgent care.",
  },
];

const nextSteps = [
  {
    disease: "HIV reactive / positive screening",
    icon: ShieldCheck,
    tone: "Confidential care",
    steps: [
      "Treat the result as screening guidance only. Do not consider it a final diagnosis until a qualified facility confirms it.",
      "Visit or contact the nearest HIV treatment hub, social hygiene clinic, or qualified medical facility for confirmatory testing, post-test counseling, and referral.",
      "Bring your CONFIDEX code or saved result reference so the healthcare worker can understand the screening context without exposing unnecessary personal details.",
      "Avoid donating blood, avoid sharing needles, and use protection until a clinician gives proper advice. If confirmed, ask about starting antiretroviral therapy and follow-up monitoring.",
    ],
  },
  {
    disease: "Dengue reactive / positive screening",
    icon: HeartPulse,
    tone: "Fever assessment",
    steps: [
      "Seek medical consultation as soon as possible, especially if fever is ongoing or symptoms are worsening.",
      "Drink fluids and rest while waiting for consultation, unless a clinician has restricted fluids for another condition.",
      "Use paracetamol only as advised. Avoid aspirin, ibuprofen, and other NSAIDs because they can increase bleeding risk in dengue.",
      "Go to an emergency department immediately for warning signs such as severe abdominal pain, persistent vomiting, bleeding, extreme weakness, confusion, cold or clammy skin, difficulty breathing, or signs of dehydration.",
    ],
  },
];

const reminders = [
  "Your screening result is only a guide. It does not confirm that you have HIV or dengue, and a healthcare professional can help you understand the next step clearly.",
  "You can take things one step at a time. Start by contacting or visiting a nearby clinic, hospital, or treatment hub for proper consultation and confirmation.",
  "Your privacy matters. Share only the information needed for your consultation, such as your CONFIDEX code or result reference, if you are comfortable doing so.",
  "For dengue-like symptoms, most concerns can be assessed through consultation. If symptoms become severe, such as repeated vomiting, bleeding, difficulty breathing, extreme weakness, confusion, or dehydration, please seek urgent medical care.",
];

const referenceLinks = [
  {
    label: "DOH-designated HIV treatment hubs",
    href: "https://ntp.doh.gov.ph/download/dm-2018-0031/",
  },
  {
    label: "WHO HIV fact sheet",
    href: "https://www.who.int/news-room/fact-sheets/detail/hiv-aids",
  },
  {
    label: "WHO dengue and severe dengue fact sheet",
    href: "https://www.who.int/news-room/fact-sheets/detail/dengue-and-severe-dengue",
  },
  {
    label: "CDC dengue warning signs",
    href: "https://www.cdc.gov/dengue/signs-symptoms/index.html",
  },
];

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function calculateDistanceKm(
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number,
) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(toLatitude - fromLatitude);
  const dLon = toRadians(toLongitude - fromLongitude);
  const lat1 = toRadians(fromLatitude);
  const lat2 = toRadians(toLatitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

function formatDistance(distanceKm: number) {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }

  return `${distanceKm.toFixed(1)} km`;
}

function sanitizeTag(value?: string) {
  return value?.replace(/\s+/g, " ").trim() || "";
}

function buildAddress(tags: Record<string, string>) {
  const explicitAddress = sanitizeTag(tags["addr:full"] || tags.address);

  if (explicitAddress) return explicitAddress;

  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:barangay"],
    tags["addr:suburb"],
    tags["addr:city"],
  ]
    .map(sanitizeTag)
    .filter(Boolean);

  return parts.length > 0
    ? parts.join(", ")
    : "Address not listed in OpenStreetMap";
}

function inferCategory(tags: Record<string, string>) {
  const amenity = sanitizeTag(tags.amenity);
  const healthcare = sanitizeTag(tags.healthcare);

  if (amenity === "hospital" || healthcare === "hospital") return "Hospital";
  if (amenity === "clinic" || healthcare === "clinic") return "Clinic";
  if (amenity === "doctors" || healthcare === "doctor")
    return "Doctor / medical office";
  if (healthcare === "laboratory") return "Laboratory";
  if (healthcare === "centre") return "Health center";

  return "Healthcare facility";
}

function inferServices(
  tags: Record<string, string>,
  category: string,
  name: string,
): FacilityService[] {
  const searchable = [
    name,
    category,
    tags.amenity,
    tags.healthcare,
    tags.speciality,
    tags.specialty,
    tags.description,
    tags.operator,
    tags.brand,
    tags["official_name"],
    tags["healthcare:speciality"],
    tags["healthcare:speciality:en"],
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const services = new Set<FacilityService>();

  const hivOnlyPattern =
    /\b(hiv|aids|sti|std|social hygiene|sundown clinic|treatment hub|hact|infectious|klinika novaliches)\b/;

  if (hivOnlyPattern.test(searchable)) {
    return ["HIV"];
  }

  if (/\b(dengue|fever|emergency|urgent care)\b/.test(searchable)) {
    services.add("Dengue");
  }

  if (
    /\b(hospital|medical center|medical centre|health center|health centre|clinic|doctors|general medicine|family medicine|primary care|internal medicine)\b/.test(
      searchable,
    )
  ) {
    services.add("Dengue");
  }

  if (
    category === "Hospital" ||
    category === "Clinic" ||
    category === "Health center"
  ) {
    services.add("Dengue");
    services.add("General");
  }

  if (services.size === 0) {
    services.add("General");
  }

  return Array.from(services);
}

function buildFacilitySearchText(
  tags: Record<string, string>,
  category: string,
  name: string,
) {
  return [
    name,
    category,
    tags.amenity,
    tags.healthcare,
    tags.speciality,
    tags.specialty,
    tags.description,
    tags.operator,
    tags.brand,
    tags["official_name"],
    tags["healthcare:speciality"],
    tags["healthcare:speciality:en"],
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isRelevantConsultationFacility(
  tags: Record<string, string>,
  category: string,
  name: string,
) {
  const searchable = buildFacilitySearchText(tags, category, name);

  const excludedSpecialtyPattern =
    /\b(dental|dentist|dentistry|orthodontic|orthodontics|endodontic|periodontic|prosthodontic|oral surgery|teeth|tooth|eye|eyes|optical|optics|optometry|optometrist|ophthalmology|ophthalmologist|vision|eyecare|eye care|lasik|aesthetic|aesthetics|beauty|cosmetic|derma|dermatology|skin|facial|spa|veterinary|animal|pet|chiropractic|physical therapy|physiotherapy|rehab|rehabilitation|speech therapy|birthing|birthing home|birth clinic|birth center|birth centre|childbirth|delivery room|lying[-\s]?in|lying in|lyingin|maternity|maternity clinic|maternal|ob[-\s]?gyn|obgyn|obstetric|obstetrics|gynecology|gynaecology|gynecologic|gynaecologic|midwife|midwifery|prenatal|pregnancy|newborn|new born|drug[-\s]?test|drug[-\s]?testing|drugtest|drug testing|drug screening|toxicology|medical exam|medical examination|medical clearance|clearance|pre[-\s]?employment|pre employment|employment medical|annual physical|\bape\b|fit[-\s]?to[-\s]?work|fit to work|work permit|lto|ltms|driver[’'\-\s]?s license|ofw|seafarer|maritime|x[-\s]?ray only|ultrasound only)\b/;

  const highPriorityConsultationPattern =
    /\b(hiv|aids|sti|std|social hygiene|sundown clinic|treatment hub|hact|infectious|dengue|fever|emergency|urgent care|public health|health center|health centre|medical center|medical centre|general hospital|general medicine|family medicine|primary care|internal medicine|diagnostic|laboratory)\b/;

  if (excludedSpecialtyPattern.test(searchable)) {
    return false;
  }

  if (highPriorityConsultationPattern.test(searchable)) {
    return true;
  }

  if (category === "Hospital" || category === "Health center") {
    return true;
  }

  if (
    category === "Clinic" ||
    category === "Doctor / medical office" ||
    category === "Laboratory"
  ) {
    return true;
  }

  return false;
}

function getManualFacilities(): Facility[] {
  const klinikaNovalichesLatitude = 14.72069;
  const klinikaNovalichesLongitude = 121.0368;

  return [
    {
      id: "manual-klinika-novaliches",
      name: "Klinika Novaliches Sundown Clinic",
      latitude: klinikaNovalichesLatitude,
      longitude: klinikaNovalichesLongitude,
      distanceKm: calculateDistanceKm(
        BOOTH_LOCATION.latitude,
        BOOTH_LOCATION.longitude,
        klinikaNovalichesLatitude,
        klinikaNovalichesLongitude,
      ),
      category: "Social hygiene / HIV clinic",
      address:
        "2nd Floor Bautista Bldg., Maagap St., Doña Isaura Subdivision, Novaliches, Quezon City",
      phone: "+639564657782",
      website:
        "https://web.facebook.com/klinikanovalichessocialhygieneclinic/?_rdc=1&_rdr",
      services: ["HIV"],
      source: "Manual fallback",
    },
  ];
}

function isDuplicateManualFacility(
  facility: Facility,
  manualFacilities: Facility[],
) {
  const normalizedFacilityName = facility.name.toLowerCase();

  return manualFacilities.some((manualFacility) => {
    const normalizedManualName = manualFacility.name.toLowerCase();
    const distanceFromManualKm = calculateDistanceKm(
      facility.latitude,
      facility.longitude,
      manualFacility.latitude,
      manualFacility.longitude,
    );

    if (normalizedFacilityName.includes("klinika novaliches")) {
      return true;
    }

    return (
      distanceFromManualKm <= 1 &&
      (normalizedManualName.includes(normalizedFacilityName) ||
        normalizedFacilityName.includes(normalizedManualName))
    );
  });
}

function isFacilityCachePayload(value: unknown): value is FacilityCachePayload {
  if (!value || typeof value !== "object") return false;

  const maybePayload = value as FacilityCachePayload;

  return (
    typeof maybePayload.cachedAt === "number" &&
    Number.isFinite(maybePayload.cachedAt) &&
    Array.isArray(maybePayload.facilities)
  );
}

function readCachedFacilities() {
  if (typeof window === "undefined") return null;

  try {
    const rawCache = window.localStorage.getItem(FACILITY_CACHE_KEY);

    if (!rawCache) return null;

    const parsedCache: unknown = JSON.parse(rawCache);

    if (!isFacilityCachePayload(parsedCache)) {
      window.localStorage.removeItem(FACILITY_CACHE_KEY);
      return null;
    }

    const cacheAgeMs = Date.now() - parsedCache.cachedAt;

    if (cacheAgeMs < 0 || parsedCache.facilities.length === 0) {
      window.localStorage.removeItem(FACILITY_CACHE_KEY);
      return null;
    }

    return {
      facilities: parsedCache.facilities,
      cacheAgeMs,
      isFresh: cacheAgeMs <= FACILITY_CACHE_TTL_MS,
    };
  } catch {
    try {
      window.localStorage.removeItem(FACILITY_CACHE_KEY);
    } catch {
      // Ignore storage cleanup failures.
    }

    return null;
  }
}

function writeCachedFacilities(facilities: Facility[]) {
  if (typeof window === "undefined" || facilities.length === 0) return;

  try {
    const payload: FacilityCachePayload = {
      cachedAt: Date.now(),
      facilities,
    };

    window.localStorage.setItem(FACILITY_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage can fail in private browsing or when storage is full.
    // The live Overpass search still works, so this failure is intentionally ignored.
  }
}

function formatCacheAge(cacheAgeMs: number) {
  const minutes = Math.max(0, Math.floor(cacheAgeMs / (1000 * 60)));

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function getDirectionsUrl(facility: Facility) {
  return `https://www.google.com/maps/dir/?api=1&origin=${BOOTH_LOCATION.latitude},${BOOTH_LOCATION.longitude}&destination=${facility.latitude},${facility.longitude}`;
}

function getOpenStreetMapUrl(facility: Facility) {
  return `https://www.openstreetmap.org/?mlat=${facility.latitude}&mlon=${facility.longitude}#map=17/${facility.latitude}/${facility.longitude}`;
}

async function loadLeaflet() {
  if (typeof window === "undefined") return;
  if (window.L) return;
  if (window.__confidexLeafletLoading) return window.__confidexLeafletLoading;

  window.__confidexLeafletLoading = new Promise<void>((resolve, reject) => {
    const existingCss = document.querySelector(
      `link[href="${LEAFLET_CSS_URL}"]`,
    );

    if (!existingCss) {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = LEAFLET_CSS_URL;
      document.head.appendChild(css);
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${LEAFLET_JS_URL}"]`,
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Map library failed to load.")),
        {
          once: true,
        },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = LEAFLET_JS_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Map library failed to load."));
    document.body.appendChild(script);
  });

  return window.__confidexLeafletLoading;
}

function buildOverpassQuery() {
  const { latitude, longitude } = BOOTH_LOCATION;

  return `
[out:json][timeout:25];
(
  node(around:${SEARCH_RADIUS_METERS},${latitude},${longitude})["amenity"~"^(hospital|clinic|doctors)$"];
  way(around:${SEARCH_RADIUS_METERS},${latitude},${longitude})["amenity"~"^(hospital|clinic|doctors)$"];
  relation(around:${SEARCH_RADIUS_METERS},${latitude},${longitude})["amenity"~"^(hospital|clinic|doctors)$"];
  node(around:${SEARCH_RADIUS_METERS},${latitude},${longitude})["healthcare"~"^(hospital|clinic|doctor|centre|laboratory)$"];
  way(around:${SEARCH_RADIUS_METERS},${latitude},${longitude})["healthcare"~"^(hospital|clinic|doctor|centre|laboratory)$"];
  relation(around:${SEARCH_RADIUS_METERS},${latitude},${longitude})["healthcare"~"^(hospital|clinic|doctor|centre|laboratory)$"];
);
out center tags;
`;
}

async function fetchFacilitiesFromOverpass() {
  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ];

  let lastError: unknown = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body: `data=${encodeURIComponent(buildOverpassQuery())}`,
      });

      if (!response.ok) {
        throw new Error(
          `OpenStreetMap facility search failed with ${response.status}.`,
        );
      }

      const data = (await response.json()) as { elements?: OverpassElement[] };
      const elements = data.elements || [];
      const seen = new Set<string>();

      const osmFacilities = elements
        .map((element): Facility | null => {
          const tags = element.tags || {};
          const latitude = element.lat ?? element.center?.lat;
          const longitude = element.lon ?? element.center?.lon;
          const name = sanitizeTag(
            tags.name ||
              tags["official_name"] ||
              tags["operator"] ||
              tags["brand"],
          );

          if (!latitude || !longitude || !name) return null;

          const category = inferCategory(tags);

          if (!isRelevantConsultationFacility(tags, category, name)) {
            return null;
          }

          const distanceKm = calculateDistanceKm(
            BOOTH_LOCATION.latitude,
            BOOTH_LOCATION.longitude,
            latitude,
            longitude,
          );

          const normalizedKey = `${name.toLowerCase()}-${latitude.toFixed(4)}-${longitude.toFixed(4)}`;

          if (seen.has(normalizedKey)) return null;
          seen.add(normalizedKey);

          return {
            id: `${element.type}-${element.id}`,
            name,
            latitude,
            longitude,
            distanceKm,
            category,
            address: buildAddress(tags),
            phone:
              sanitizeTag(tags.phone || tags["contact:phone"]) || undefined,
            website:
              sanitizeTag(tags.website || tags["contact:website"]) || undefined,
            services: inferServices(tags, category, name),
            source: "OpenStreetMap" as const,
          };
        })
        .filter((facility): facility is Facility => Boolean(facility));

      const manualFacilities = getManualFacilities();
      const deduplicatedOsmFacilities = osmFacilities.filter(
        (facility) => !isDuplicateManualFacility(facility, manualFacilities),
      );

      return [...manualFacilities, ...deduplicatedOsmFacilities]
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, MAX_FACILITIES);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Unable to load nearby facilities.");
}

function makeMarkerIcon(label: string, variant: "booth" | "facility") {
  const colorClass =
    variant === "booth"
      ? "bg-primary text-white"
      : "bg-background text-foreground";
  const borderClass = variant === "booth" ? "border-primary" : "border-border";

  return window.L?.divIcon({
    className: "",
    html: `<div class="flex size-8 items-center justify-center rounded-full border-2 ${borderClass} ${colorClass} text-[11px] font-black shadow-md">${label}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

export default function ConsultationPage() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const facilityLayerRef = useRef<any>(null);
  const mapResizeObserverRef = useRef<ResizeObserver | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [activeFilter, setActiveFilter] = useState<FacilityFilter>("all");
  const [isLoadingFacilities, setIsLoadingFacilities] = useState(true);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState("");
  const [facilityError, setFacilityError] = useState("");
  const [facilityCacheStatus, setFacilityCacheStatus] = useState("");

  const filteredFacilities = useMemo(() => {
    if (activeFilter === "hiv") {
      return facilities.filter(
        (facility) =>
          facility.services.includes("HIV") ||
          facility.services.includes("General"),
      );
    }

    if (activeFilter === "dengue") {
      return facilities.filter(
        (facility) =>
          facility.services.includes("Dengue") ||
          facility.services.includes("General"),
      );
    }

    return facilities;
  }, [activeFilter, facilities]);

  const loadFacilities = useCallback(
    async (options?: { forceRefresh?: boolean }) => {
      const forceRefresh = Boolean(options?.forceRefresh);
      const cachedFacilities = readCachedFacilities();

      setFacilityError("");

      if (!forceRefresh && cachedFacilities) {
        setFacilities(cachedFacilities.facilities);
        setFacilityCacheStatus(
          cachedFacilities.isFresh
            ? `Loaded saved search from ${formatCacheAge(cachedFacilities.cacheAgeMs)}.`
            : `Showing saved search from ${formatCacheAge(
                cachedFacilities.cacheAgeMs,
              )} while refreshing.`,
        );

        if (cachedFacilities.isFresh) {
          setIsLoadingFacilities(false);
          return;
        }
      } else {
        setFacilityCacheStatus(
          forceRefresh ? "Refreshing live facility data..." : "",
        );
      }

      setIsLoadingFacilities(true);

      try {
        const nearbyFacilities = await fetchFacilitiesFromOverpass();
        setFacilities(nearbyFacilities);
        writeCachedFacilities(nearbyFacilities);
        setFacilityCacheStatus(
          nearbyFacilities.length > 0
            ? "Updated live facility data just now."
            : "No saved facility data is available yet.",
        );

        if (nearbyFacilities.length === 0) {
          setFacilityError(
            "No nearby healthcare facilities were returned by OpenStreetMap for this search radius.",
          );
        }
      } catch (error) {
        if (cachedFacilities) {
          setFacilities(cachedFacilities.facilities);
          setFacilityCacheStatus(
            `Showing saved search from ${formatCacheAge(
              cachedFacilities.cacheAgeMs,
            )}.`,
          );
          setFacilityError(
            "Showing the saved facility list because live OpenStreetMap search is currently unavailable. Use Refresh facilities again later to update it.",
          );
          return;
        }

        setFacilities([]);
        setFacilityCacheStatus("");
        setFacilityError(
          error instanceof Error
            ? error.message
            : "Unable to load nearby healthcare facilities from OpenStreetMap.",
        );
      } finally {
        setIsLoadingFacilities(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadFacilities();
  }, [loadFacilities]);

  useEffect(() => {
    let cancelled = false;

    async function initializeMap() {
      try {
        await loadLeaflet();

        if (
          cancelled ||
          !mapContainerRef.current ||
          !window.L ||
          mapInstanceRef.current
        ) {
          return;
        }

        const leaflet = window.L;
        const map = leaflet
          .map(mapContainerRef.current, {
            scrollWheelZoom: true,
            dragging: true,
            touchZoom: true,
            doubleClickZoom: true,
            boxZoom: true,
            keyboard: true,
            zoomControl: true,
          })
          .setView([BOOTH_LOCATION.latitude, BOOTH_LOCATION.longitude], 14);

        leaflet
          .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap contributors",
          })
          .addTo(map);

        leaflet
          .marker([BOOTH_LOCATION.latitude, BOOTH_LOCATION.longitude], {
            icon: makeMarkerIcon("B", "booth"),
          })
          .addTo(map)
          .bindPopup(
            `<strong>${BOOTH_LOCATION.name}</strong><br/><span>${BOOTH_LOCATION.address}</span>`,
          );

        facilityLayerRef.current = leaflet.layerGroup().addTo(map);
        mapInstanceRef.current = map;

        if (typeof ResizeObserver !== "undefined") {
          mapResizeObserverRef.current = new ResizeObserver(() => {
            window.requestAnimationFrame(() => {
              map.invalidateSize();
            });
          });
          mapResizeObserverRef.current.observe(mapContainerRef.current);
        }

        setIsMapReady(true);
      } catch (error) {
        setMapError(
          error instanceof Error
            ? error.message
            : "Unable to initialize the consultation map.",
        );
      }
    }

    initializeMap();

    return () => {
      cancelled = true;

      if (mapResizeObserverRef.current) {
        mapResizeObserverRef.current.disconnect();
        mapResizeObserverRef.current = null;
      }

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        facilityLayerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (
      !isMapReady ||
      !window.L ||
      !mapInstanceRef.current ||
      !facilityLayerRef.current
    ) {
      return;
    }

    const leaflet = window.L;
    const layerGroup = facilityLayerRef.current;
    layerGroup.clearLayers();

    filteredFacilities.forEach((facility, index) => {
      const services = facility.services
        .map((service) => {
          if (service === "HIV") return "HIV referral";
          if (service === "Dengue") return "Dengue consultation";
          return "General consultation";
        })
        .join(", ");

      leaflet
        .marker([facility.latitude, facility.longitude], {
          icon: makeMarkerIcon(String(index + 1), "facility"),
        })
        .addTo(layerGroup)
        .bindPopup(
          `<strong>${facility.name}</strong><br/><span>${facility.category}</span><br/><span>${formatDistance(
            facility.distanceKm,
          )} from booth</span><br/><span>${services}</span>`,
        );
    });

    const bounds = leaflet.latLngBounds([
      [BOOTH_LOCATION.latitude, BOOTH_LOCATION.longitude],
      ...filteredFacilities.map((facility) => [
        facility.latitude,
        facility.longitude,
      ]),
    ]);

    if (filteredFacilities.length > 0) {
      const isCompactViewport = window.matchMedia("(max-width: 640px)").matches;

      mapInstanceRef.current.fitBounds(bounds, {
        padding: isCompactViewport ? [18, 18] : [36, 36],
        maxZoom: isCompactViewport ? 14 : 15,
      });
    } else {
      mapInstanceRef.current.setView(
        [BOOTH_LOCATION.latitude, BOOTH_LOCATION.longitude],
        14,
      );
    }
  }, [filteredFacilities, isMapReady]);

  return (
    <section className="relative min-h-[calc(100svh-var(--navbar-height)-var(--footer-height))] overflow-hidden bg-background px-3 pt-[calc(var(--navbar-height)+1rem)] pb-[calc(var(--footer-height)+1rem)] sm:px-0 sm:pt-[calc(var(--navbar-height)+1.5rem)] sm:pb-[calc(var(--footer-height)+1.5rem)] lg:pt-[calc(var(--navbar-height)+2rem)] lg:pb-[calc(var(--footer-height)+2rem)]">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(196,106,42,0.16),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(36,87,165,0.10),transparent_30%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(244,211,94,0.10),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(238,150,75,0.10),transparent_30%)]" />

      <div className="confidex-container space-y-5 sm:space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-card/90 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground shadow-sm sm:px-4 sm:tracking-[0.22em]">
              <MapPin className="size-4 shrink-0 text-primary" />
              <span className="truncate">Consultation map</span>
            </div>

            <h1 className="mt-4 text-2xl font-black leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl">
              Nearby consultation facilities
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:leading-7 md:text-base">
              The map is centered on the CONFIDEX booth. Hospitals and clinics
              are listed beside the map so users can quickly compare distance,
              services, and directions.
            </p>
          </div>

          <Button
            type="button"
            onClick={() => loadFacilities({ forceRefresh: true })}
            disabled={isLoadingFacilities}
            className="w-full rounded-full font-bold shadow-sm sm:w-auto"
          >
            {isLoadingFacilities ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 size-4" />
            )}
            Refresh facilities
          </Button>
        </div>

        <div className="confidex-card overflow-hidden bg-card">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.48fr)] 2xl:grid-cols-[minmax(0,1.25fr)_minmax(24rem,0.75fr)]">
            <div className="relative min-h-[22rem] border-b-2 border-border bg-muted sm:min-h-[30rem] md:min-h-[34rem] lg:min-h-[38rem] lg:border-r-2 lg:border-b-0 xl:min-h-[42rem]">
              <div ref={mapContainerRef} className="absolute inset-0 z-0" />

              {!isMapReady ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/95 p-6 text-center">
                  <div className="max-w-sm rounded-[28px] border-2 border-border bg-background p-6 shadow-xl">
                    {mapError ? (
                      <AlertTriangle className="mx-auto size-10 text-primary" />
                    ) : (
                      <Loader2 className="mx-auto size-10 animate-spin text-primary" />
                    )}
                    <p className="mt-4 text-sm font-bold text-foreground">
                      {mapError || "Loading consultation map..."}
                    </p>
                    <p className="mt-2 text-xs leading-6 text-muted-foreground">
                      The facility list still works even if the interactive map
                      library cannot load.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex max-h-none flex-col bg-card lg:max-h-[38rem] xl:max-h-[42rem]">
              <div className="border-b-2 border-border p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-[0.20em] text-primary">
                      Hospitals & clinics
                    </p>
                    <h2 className="mt-1 text-lg font-black tracking-tight text-foreground sm:text-2xl">
                      Nearby facility list
                    </h2>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
                      {filteredFacilities.length} result
                      {filteredFacilities.length === 1 ? "" : "s"} around{" "}
                      {BOOTH_LOCATION.name}
                    </p>
                    {facilityCacheStatus ? (
                      <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                        {facilityCacheStatus}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Building2 className="size-5" />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-1 rounded-[16px] border border-border bg-background p-1 sm:gap-1.5 sm:p-1.5">
                  {filterOptions.map((option) => {
                    const active = activeFilter === option.value;
                    const compactLabel =
                      option.value === "all"
                        ? "All"
                        : option.value === "hiv"
                          ? "HIV"
                          : "Dengue";

                    return (
                      <button
                        key={option.value}
                        type="button"
                        title={option.helper}
                        aria-label={option.label}
                        onClick={() => setActiveFilter(option.value)}
                        className={[
                          "rounded-full px-2 py-1.5 text-center text-[11px] font-black transition sm:px-3 sm:py-2 sm:text-xs",
                          active
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-card hover:text-foreground",
                        ].join(" ")}
                      >
                        {compactLabel}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="min-h-0 flex-1 p-4 sm:p-5 lg:overflow-y-auto xl:p-6">
                {facilityError ? (
                  <div className="mb-4 rounded-[22px] border-2 border-primary/50 bg-primary/10 p-4 text-sm leading-6 text-muted-foreground">
                    {facilityError}
                  </div>
                ) : null}

                {isLoadingFacilities && facilities.length === 0 ? (
                  <div className="flex min-h-64 items-center justify-center rounded-[24px] border-2 border-dashed border-border bg-background p-6 text-center">
                    <div>
                      <Loader2 className="mx-auto size-9 animate-spin text-primary" />
                      <p className="mt-3 text-sm font-bold text-foreground">
                        Searching nearby facilities...
                      </p>
                    </div>
                  </div>
                ) : filteredFacilities.length > 0 ? (
                  <div className="space-y-3 sm:space-y-4">
                    {isLoadingFacilities ? (
                      <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-xs font-bold text-muted-foreground">
                        <Loader2 className="size-4 animate-spin text-primary" />
                        Updating saved facility list...
                      </div>
                    ) : null}
                    {filteredFacilities.map((facility, index) => (
                      <article
                        key={facility.id}
                        className="group overflow-hidden rounded-[22px] border-2 border-border bg-background transition hover:border-primary/60 hover:shadow-md sm:rounded-[24px]"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-stretch">
                          <div className="flex w-full shrink-0 flex-row items-center justify-between gap-3 border-b-2 border-border bg-card p-3 text-left sm:w-20 sm:flex-col sm:border-r-2 sm:border-b-0 sm:text-center">
                            <div className="flex size-9 items-center justify-center rounded-2xl bg-primary text-sm font-black text-primary-foreground shadow-sm sm:size-10">
                              {index + 1}
                            </div>
                            <div className="text-right sm:text-center">
                              <p className="text-sm font-black leading-none text-foreground">
                                {formatDistance(facility.distanceKm)}
                              </p>
                              <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                                from booth
                              </p>
                            </div>
                          </div>

                          <div className="min-w-0 flex-1 p-4">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-black text-primary">
                                {facility.category}
                              </span>
                              <span className="rounded-full border border-border bg-card px-3 py-1 text-[11px] font-bold text-muted-foreground">
                                {facility.source}
                              </span>
                            </div>

                            <h3 className="text-sm font-black leading-tight tracking-tight text-foreground sm:text-base xl:text-lg">
                              {facility.name}
                            </h3>

                            <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground sm:mt-3 sm:line-clamp-2">
                              {facility.address}
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2">
                              {facility.services.map((service) => (
                                <span
                                  key={service}
                                  className="rounded-full border border-border bg-card px-3 py-1 text-xs font-bold text-foreground"
                                >
                                  {service === "HIV"
                                    ? "HIV referral"
                                    : service === "Dengue"
                                      ? "Dengue consult"
                                      : "General consult"}
                                </span>
                              ))}
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-3 sm:flex sm:flex-wrap">
                              <Link
                                href={getDirectionsUrl(facility)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center rounded-full bg-primary px-3 py-2 text-xs font-black text-primary-foreground transition hover:opacity-95 sm:px-4"
                              >
                                Directions
                                <ArrowUpRight className="ml-1 size-3.5" />
                              </Link>

                              <Link
                                href={getOpenStreetMapUrl(facility)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center rounded-full border border-border bg-card px-3 py-2 text-xs font-bold text-foreground transition hover:border-primary/70 sm:px-4"
                              >
                                Open map
                                <ArrowUpRight className="ml-1 size-3.5" />
                              </Link>

                              {facility.phone ? (
                                <Link
                                  href={`tel:${facility.phone}`}
                                  className="inline-flex items-center justify-center rounded-full border border-border bg-card px-3 py-2 text-xs font-bold text-foreground transition hover:border-primary/70 sm:px-4"
                                >
                                  Call
                                </Link>
                              ) : null}

                              {facility.website ? (
                                <Link
                                  href={facility.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center rounded-full border border-border bg-card px-3 py-2 text-xs font-bold text-foreground transition hover:border-primary/70 sm:px-4"
                                >
                                  Website
                                  <ArrowUpRight className="ml-1 size-3.5" />
                                </Link>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[24px] border-2 border-dashed border-border bg-background p-6 text-center">
                    <Building2 className="mx-auto size-10 text-primary" />
                    <p className="mt-3 text-sm font-bold text-foreground">
                      No facilities to show
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Try refreshing the map or using the all-facilities filter.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:gap-6 xl:grid-cols-[1fr_0.55fr]">
          <div className="confidex-card bg-card p-4 sm:p-6 md:p-8">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-primary sm:text-sm sm:tracking-[0.28em]">
                  Next steps
                </p>
                <h2 className="mt-2 text-xl font-black tracking-tight text-foreground sm:text-2xl lg:text-3xl">
                  What to do after a positive result
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {nextSteps.map((group) => {
                const Icon = group.icon;

                return (
                  <div
                    key={group.disease}
                    className="rounded-[24px] border-2 border-border bg-background p-4 sm:rounded-[28px] sm:p-5"
                  >
                    <div className="mb-5 flex items-start gap-3">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                        <Icon className="size-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-black leading-tight text-foreground sm:text-lg">
                          {group.disease}
                        </h3>
                        <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                          {group.tone}
                        </p>
                      </div>
                    </div>

                    <ol className="space-y-3">
                      {group.steps.map((step, index) => (
                        <li
                          key={step}
                          className="flex gap-3 text-sm leading-6 text-muted-foreground"
                        >
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary">
                            {index + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="space-y-6">
            <div className="confidex-card bg-card p-5 sm:p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <AlertTriangle className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-primary">
                    Important reminders
                  </p>
                </div>
              </div>

              <ul className="space-y-3">
                {reminders.map((reminder) => (
                  <li
                    key={reminder}
                    className="flex gap-3 text-sm leading-6 text-muted-foreground"
                  >
                    <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" />
                    <span>{reminder}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="confidex-card bg-card p-5 sm:p-6">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-primary">
                References
              </p>
              <div className="mt-4 space-y-2">
                {referenceLinks.map((reference) => (
                  <Link
                    key={reference.href}
                    href={reference.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-bold text-foreground transition hover:border-primary/70"
                  >
                    <span>{reference.label}</span>
                    <ArrowUpRight className="size-4 shrink-0 text-primary" />
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
