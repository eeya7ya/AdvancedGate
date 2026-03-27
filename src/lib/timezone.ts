/**
 * Country-to-timezone mapping for accurate date/time formatting.
 * Supports both English and Arabic country names.
 */

const COUNTRY_TIMEZONE_MAP: Record<string, string> = {
  // Middle East & North Africa
  "jordan": "Asia/Amman",
  "الأردن": "Asia/Amman",
  "saudi arabia": "Asia/Riyadh",
  "السعودية": "Asia/Riyadh",
  "المملكة العربية السعودية": "Asia/Riyadh",
  "uae": "Asia/Dubai",
  "united arab emirates": "Asia/Dubai",
  "الإمارات": "Asia/Dubai",
  "الامارات": "Asia/Dubai",
  "egypt": "Africa/Cairo",
  "مصر": "Africa/Cairo",
  "iraq": "Asia/Baghdad",
  "العراق": "Asia/Baghdad",
  "kuwait": "Asia/Kuwait",
  "الكويت": "Asia/Kuwait",
  "qatar": "Asia/Qatar",
  "قطر": "Asia/Qatar",
  "bahrain": "Asia/Bahrain",
  "البحرين": "Asia/Bahrain",
  "oman": "Asia/Muscat",
  "عمان": "Asia/Muscat",
  "عُمان": "Asia/Muscat",
  "lebanon": "Asia/Beirut",
  "لبنان": "Asia/Beirut",
  "syria": "Asia/Damascus",
  "سوريا": "Asia/Damascus",
  "palestine": "Asia/Hebron",
  "فلسطين": "Asia/Hebron",
  "yemen": "Asia/Aden",
  "اليمن": "Asia/Aden",
  "libya": "Africa/Tripoli",
  "ليبيا": "Africa/Tripoli",
  "tunisia": "Africa/Tunis",
  "تونس": "Africa/Tunis",
  "algeria": "Africa/Algiers",
  "الجزائر": "Africa/Algiers",
  "morocco": "Africa/Casablanca",
  "المغرب": "Africa/Casablanca",
  "sudan": "Africa/Khartoum",
  "السودان": "Africa/Khartoum",

  // Europe
  "turkey": "Europe/Istanbul",
  "تركيا": "Europe/Istanbul",
  "uk": "Europe/London",
  "united kingdom": "Europe/London",
  "england": "Europe/London",
  "بريطانيا": "Europe/London",
  "germany": "Europe/Berlin",
  "ألمانيا": "Europe/Berlin",
  "france": "Europe/Paris",
  "فرنسا": "Europe/Paris",
  "spain": "Europe/Madrid",
  "italy": "Europe/Rome",
  "netherlands": "Europe/Amsterdam",
  "sweden": "Europe/Stockholm",
  "norway": "Europe/Oslo",
  "denmark": "Europe/Copenhagen",
  "finland": "Europe/Helsinki",
  "poland": "Europe/Warsaw",
  "switzerland": "Europe/Zurich",
  "austria": "Europe/Vienna",
  "belgium": "Europe/Brussels",
  "portugal": "Europe/Lisbon",
  "greece": "Europe/Athens",
  "romania": "Europe/Bucharest",
  "czech republic": "Europe/Prague",
  "czechia": "Europe/Prague",
  "ireland": "Europe/Dublin",
  "ukraine": "Europe/Kyiv",
  "russia": "Europe/Moscow",

  // Americas
  "usa": "America/New_York",
  "united states": "America/New_York",
  "أمريكا": "America/New_York",
  "الولايات المتحدة": "America/New_York",
  "canada": "America/Toronto",
  "كندا": "America/Toronto",
  "mexico": "America/Mexico_City",
  "brazil": "America/Sao_Paulo",
  "argentina": "America/Argentina/Buenos_Aires",
  "colombia": "America/Bogota",
  "chile": "America/Santiago",

  // Asia
  "india": "Asia/Kolkata",
  "الهند": "Asia/Kolkata",
  "pakistan": "Asia/Karachi",
  "باكستان": "Asia/Karachi",
  "bangladesh": "Asia/Dhaka",
  "china": "Asia/Shanghai",
  "الصين": "Asia/Shanghai",
  "japan": "Asia/Tokyo",
  "اليابان": "Asia/Tokyo",
  "south korea": "Asia/Seoul",
  "korea": "Asia/Seoul",
  "indonesia": "Asia/Jakarta",
  "malaysia": "Asia/Kuala_Lumpur",
  "singapore": "Asia/Singapore",
  "thailand": "Asia/Bangkok",
  "vietnam": "Asia/Ho_Chi_Minh",
  "philippines": "Asia/Manila",

  // Africa
  "south africa": "Africa/Johannesburg",
  "nigeria": "Africa/Lagos",
  "kenya": "Africa/Nairobi",
  "ethiopia": "Africa/Addis_Ababa",
  "ghana": "Africa/Accra",
  "tanzania": "Africa/Dar_es_Salaam",

  // Oceania
  "australia": "Australia/Sydney",
  "new zealand": "Pacific/Auckland",
};

export function getTimezoneForCountry(country: string): string {
  if (!country) return "UTC";
  const normalized = country.trim().toLowerCase();
  return COUNTRY_TIMEZONE_MAP[normalized] ?? "UTC";
}

export function getLocalizedDateTime(timezone: string): string {
  return new Date().toLocaleString("en-US", {
    timeZone: timezone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
