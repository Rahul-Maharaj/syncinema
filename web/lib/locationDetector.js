// High-Precision Real Location & Anti-VPN Geolocation Resolver
// Combines Hardware GPS / Wi-Fi Triangulation, Reverse Geocoding,
// System Clock Timezone Analysis, and IP Discrepancy Checks to unmask VPNs.

const TIMEZONE_TO_LOCATION = {
  'Asia/Kolkata': { city: 'New Delhi / India', country: 'India', countryCode: 'IN', flag: '🇮🇳', lat: 28.6139, lon: 77.2090 },
  'Asia/Calcutta': { city: 'Kolkata / India', country: 'India', countryCode: 'IN', flag: '🇮🇳', lat: 22.5726, lon: 88.3639 },
  'Asia/Dubai': { city: 'Dubai', country: 'United Arab Emirates', countryCode: 'AE', flag: '🇦🇪', lat: 25.2048, lon: 55.2708 },
  'Asia/Singapore': { city: 'Singapore', country: 'Singapore', countryCode: 'SG', flag: '🇸🇬', lat: 1.3521, lon: 103.8198 },
  'Asia/Tokyo': { city: 'Tokyo', country: 'Japan', countryCode: 'JP', flag: '🇯🇵', lat: 35.6762, lon: 139.6503 },
  'Asia/Shanghai': { city: 'Shanghai', country: 'China', countryCode: 'CN', flag: '🇨🇳', lat: 31.2304, lon: 121.4737 },
  'Asia/Hong_Kong': { city: 'Hong Kong', country: 'Hong Kong', countryCode: 'HK', flag: '🇭🇰', lat: 22.3193, lon: 114.1694 },
  'Asia/Bangkok': { city: 'Bangkok', country: 'Thailand', countryCode: 'TH', flag: '🇹🇭', lat: 13.7563, lon: 100.5018 },
  'Europe/London': { city: 'London', country: 'United Kingdom', countryCode: 'GB', flag: '🇬🇧', lat: 51.5074, lon: -0.1278 },
  'Europe/Paris': { city: 'Paris', country: 'France', countryCode: 'FR', flag: '🇫🇷', lat: 48.8566, lon: 2.3522 },
  'Europe/Berlin': { city: 'Berlin', country: 'Germany', countryCode: 'DE', flag: '🇩🇪', lat: 52.5200, lon: 13.4050 },
  'Europe/Amsterdam': { city: 'Amsterdam', country: 'Netherlands', countryCode: 'NL', flag: '🇳🇱', lat: 52.3676, lon: 4.9041 },
  'America/New_York': { city: 'New York', country: 'United States', countryCode: 'US', flag: '🇺🇸', lat: 40.7128, lon: -74.0060 },
  'America/Chicago': { city: 'Chicago', country: 'United States', countryCode: 'US', flag: '🇺🇸', lat: 41.8781, lon: -87.6298 },
  'America/Los_Angeles': { city: 'Los Angeles', country: 'United States', countryCode: 'US', flag: '🇺🇸', lat: 34.0522, lon: -118.2437 },
  'America/Toronto': { city: 'Toronto', country: 'Canada', countryCode: 'CA', flag: '🇨🇦', lat: 43.6532, lon: -79.3832 },
  'Australia/Sydney': { city: 'Sydney', country: 'Australia', countryCode: 'AU', flag: '🇦🇺', lat: -33.8688, lon: 151.2093 },
};

// Calculate distance in km between two lat/lon pairs
export const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const l1 = Number(lat1), o1 = Number(lon1), l2 = Number(lat2), o2 = Number(lon2);
  if (!l1 || !o1 || !l2 || !o2 || isNaN(l1) || isNaN(o1) || isNaN(l2) || isNaN(o2)) return 0;
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(l2 - l1);
  const dLon = toRad(o2 - o1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(l1)) * Math.cos(toRad(l2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

// Reverse geocode lat/lon to human readable address using OpenStreetMap Nominatim
export const reverseGeocodeGps = async (lat, lon) => {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&format=json&addressdetails=1`,
      {
        signal: controller.signal,
        headers: { 'Accept-Language': 'en' },
      }
    );
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const city =
        addr.city ||
        addr.town ||
        addr.village ||
        addr.suburb ||
        addr.county ||
        addr.state_district ||
        'Real GPS Location';
      const region = addr.state || addr.region || '';
      const country = addr.country || '';
      const countryCode = (addr.country_code || '').toUpperCase();
      const flag = countryCode
        ? String.fromCodePoint(...[...countryCode].map((c) => 127397 + c.charCodeAt(0)))
        : '📍';
      return {
        city,
        region,
        country,
        countryCode,
        flag,
        displayName: data.display_name || `${city}, ${country}`,
        road: addr.road || '',
        postcode: addr.postcode || '',
      };
    }
  } catch {}
  return null;
};

// Retrieve client's hardware GPS coordinates if permitted
export const getBrowserGpsCoords = () => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      return resolve(null);
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy || 0),
          altitude: pos.coords.altitude || null,
        });
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  });
};

// Main Entry Point: Detect Real Location with VPN Anti-Spoofing
export const detectRealLocation = async () => {
  const systemTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const tzMatch = TIMEZONE_TO_LOCATION[systemTimezone];

  // Run GPS lookup and IP lookup simultaneously
  const [gps, ipRes] = await Promise.all([
    getBrowserGpsCoords().catch(() => null),
    fetch('https://ipwho.is/')
      .then((r) => r.json())
      .catch(() => null),
  ]);

  const ipData = ipRes && ipRes.success ? ipRes : null;
  const ipCountry = ipData?.country || '';
  const ipCountryCode = (ipData?.country_code || '').toUpperCase();
  const ipTimezone = ipData?.timezone?.id || '';
  const ipCity = ipData?.city || '';
  const ipLat = Number(ipData?.latitude || 0);
  const ipLon = Number(ipData?.longitude || 0);
  const ipIsp = ipData?.connection?.isp || ipData?.isp || 'Broadband ISP';
  const networkIp = ipData?.ip || '';

  // 1. If GPS hardware location was obtained (100% physically accurate, immune to VPN)
  if (gps && gps.lat && gps.lon) {
    const geoRev = await reverseGeocodeGps(gps.lat, gps.lon);
    const realCity = geoRev?.city || (tzMatch ? tzMatch.city : 'Physical Location');
    const realCountry = geoRev?.country || (tzMatch ? tzMatch.country : 'Unknown Country');
    const realCountryCode = geoRev?.countryCode || (tzMatch ? tzMatch.countryCode : '');
    const realFlag =
      geoRev?.flag ||
      (realCountryCode
        ? String.fromCodePoint(...[...realCountryCode].map((c) => 127397 + c.charCodeAt(0)))
        : '📍');

    // Check if VPN was detected by comparing GPS with IP
    const distFromIp = ipLat && ipLon ? calculateDistanceKm(gps.lat, gps.lon, ipLat, ipLon) : 0;
    const countryMismatch = realCountryCode && ipCountryCode && realCountryCode !== ipCountryCode;
    const isVpn = countryMismatch || distFromIp > 120;

    return {
      city: realCity,
      region: geoRev?.region || '',
      country: realCountry,
      countryCode: realCountryCode,
      flag: realFlag,
      lat: Number(gps.lat.toFixed(5)),
      lon: Number(gps.lon.toFixed(5)),
      accuracy: gps.accuracy,
      gpsVerified: true,
      isVpn,
      vpnReason: isVpn
        ? countryMismatch
          ? `IP is routed to ${ipCountry} (${ipCity}), but physical GPS confirmed at ${realCity}, ${realCountry}`
          : `IP server is ${distFromIp}km away (${ipCity}), but physical device GPS verified at ${realCity}`
        : null,
      vpnIp: isVpn ? networkIp : null,
      vpnCity: isVpn ? ipCity : null,
      vpnCountry: isVpn ? ipCountry : null,
      vpnIsp: isVpn ? ipIsp : null,
      timezone: systemTimezone,
      isp: ipIsp,
      ip: networkIp,
      addressDetails: geoRev?.displayName || `${realCity}, ${realCountry}`,
    };
  }

  // 2. No GPS permission yet: Detect VPN via System Clock Timezone vs IP Timezone discrepancy
  const tzMismatch =
    systemTimezone &&
    ipTimezone &&
    systemTimezone !== 'UTC' &&
    systemTimezone !== ipTimezone &&
    !systemTimezone.includes('Etc');

  if (tzMismatch && tzMatch) {
    // Highly confident VPN detected (e.g. system clock is Asia/Kolkata but IP is Netherlands/US)
    return {
      city: tzMatch.city,
      region: 'Hardware System Clock',
      country: tzMatch.country,
      countryCode: tzMatch.countryCode,
      flag: tzMatch.flag,
      lat: tzMatch.lat,
      lon: tzMatch.lon,
      accuracy: 5000,
      gpsVerified: false,
      isVpn: true,
      vpnReason: `VPN Proxy tunnel detected! System clock is set to ${systemTimezone} (${tzMatch.country}), while network IP is routed via ${ipCity}, ${ipCountry} (${ipTimezone})`,
      vpnIp: networkIp,
      vpnCity: ipCity,
      vpnCountry: ipCountry,
      vpnIsp: ipIsp,
      timezone: systemTimezone,
      isp: ipIsp,
      ip: networkIp,
      addressDetails: `${tzMatch.city}, ${tzMatch.country} (System Clock Verified)`,
    };
  }

  // 3. Fallback to IP location if no discrepancy detected
  if (ipData) {
    return {
      city: ipCity,
      region: ipData.region || '',
      country: ipCountry,
      countryCode: ipCountryCode,
      flag: ipData.flag?.emoji || '📍',
      lat: ipLat,
      lon: ipLon,
      accuracy: 8000,
      gpsVerified: false,
      isVpn: false,
      vpnReason: null,
      vpnIp: null,
      vpnCity: null,
      vpnCountry: null,
      vpnIsp: null,
      timezone: ipTimezone || systemTimezone,
      isp: ipIsp,
      ip: networkIp,
      addressDetails: `${ipCity}, ${ipCountry}`,
    };
  }

  // 4. Default timezone fallback
  return {
    city: tzMatch ? tzMatch.city : 'Online Member',
    region: 'Connected Node',
    country: tzMatch ? tzMatch.country : 'Global',
    countryCode: tzMatch ? tzMatch.countryCode : '',
    flag: tzMatch ? tzMatch.flag : '🌐',
    lat: tzMatch ? tzMatch.lat : 28.6139,
    lon: tzMatch ? tzMatch.lon : 77.2090,
    accuracy: 10000,
    gpsVerified: false,
    isVpn: false,
    vpnReason: null,
    vpnIp: null,
    vpnCity: null,
    vpnCountry: null,
    vpnIsp: null,
    timezone: systemTimezone,
    isp: 'Broadband',
    ip: 'Unknown',
    addressDetails: tzMatch ? `${tzMatch.city}, ${tzMatch.country}` : 'Global Network',
  };
};
