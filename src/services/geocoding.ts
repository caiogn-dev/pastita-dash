/**
 * Geocoding Service - OpenStreetMap-based geocoding, reverse geocoding, and routing.
 * 
 * Uses the backend API which wraps Nominatim and OSRM services.
 */
import api from './api';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';
const OSRM_URL = 'https://router.project-osrm.org';

export interface GeoLocation {
  latitude: number;
  longitude: number;
  display_name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  zip_code: string;
  place_id?: number;
  importance?: number;
  bounding_box?: number[];
}

export interface SearchSuggestion {
  display_name: string;
  latitude: number;
  longitude: number;
  place_id: number;
  address_type: string;
  importance: number;
}

export interface RouteInfo {
  distance_km: number;
  duration_minutes: number;
  geometry?: string;
  steps?: RouteStep[];
  summary: string;
}

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  name: string;
  maneuver_type: string;
  maneuver_modifier: string;
}

export interface CEPData {
  cep: string;
  address: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  state_full: string;
  ibge_code: string;
  ddd: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

interface GeocodeOptions {
  countryCodes?: string[];
  limit?: number;
}

interface RouteOptions {
  profile?: 'driving' | 'walking' | 'cycling';
  steps?: boolean;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    road?: string;
    house_number?: string;
    suburb?: string;
    neighbourhood?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
  place_id?: number;
  importance?: number;
  boundingbox?: string[];
  type?: string;
  error?: string;
}

/**
 * Forward geocoding - convert address to coordinates.
 */
export async function geocodeAddress(
  query: string,
  options: GeocodeOptions = {}
): Promise<GeoLocation[]> {
  const { countryCodes = ['br'], limit = 5 } = options;

  try {
    // Try backend API first
    const response = await api.post<{ results: GeoLocation[] }>('/ecommerce/geocoding/search/', {
      query,
      country_codes: countryCodes,
      limit,
    });
    return response.data.results || [];
  } catch {
    // Backend geocoding failed, falling back to Nominatim
    return geocodeAddressDirect(query, options);
  }
}

/**
 * Direct Nominatim geocoding (fallback).
 */
async function geocodeAddressDirect(
  query: string,
  options: GeocodeOptions = {}
): Promise<GeoLocation[]> {
  const { countryCodes = ['br'], limit = 5 } = options;

  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      addressdetails: '1',
      limit: String(limit),
      countrycodes: countryCodes.join(','),
    });

    const response = await fetch(`${NOMINATIM_URL}/search?${params}`, {
      headers: {
        'User-Agent': 'pastita-platform/1.0',
      },
    });

    if (!response.ok) return [];

    const data: NominatimResult[] = await response.json();
    return data.map((item) => ({
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      display_name: item.display_name,
      address: buildAddressString(item.address),
      city: item.address?.city || item.address?.town || item.address?.village || '',
      state: item.address?.state || '',
      country: item.address?.country || '',
      zip_code: item.address?.postcode || '',
      place_id: item.place_id,
      importance: item.importance || 0,
      bounding_box: item.boundingbox?.map(parseFloat) || undefined,
    }));
  } catch (error) {
    // Silently fail - caller handles empty result
    return [];
  }
}

/**
 * Reverse geocoding - convert coordinates to address.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
  zoom = 18
): Promise<GeoLocation | null> {
  try {
    // Try backend API first
    const response = await api.post<GeoLocation>('/ecommerce/geocoding/reverse/', {
      latitude,
      longitude,
      zoom,
    });
    return response.data;
  } catch {
    // Backend reverse geocoding failed, falling back to Nominatim
    return reverseGeocodeDirect(latitude, longitude, zoom);
  }
}

/**
 * Direct Nominatim reverse geocoding (fallback).
 */
async function reverseGeocodeDirect(
  latitude: number,
  longitude: number,
  zoom = 18
): Promise<GeoLocation | null> {
  try {
    const params = new URLSearchParams({
      lat: String(latitude),
      lon: String(longitude),
      format: 'json',
      addressdetails: '1',
      zoom: String(zoom),
    });

    const response = await fetch(`${NOMINATIM_URL}/reverse?${params}`, {
      headers: {
        'User-Agent': 'pastita-platform/1.0',
      },
    });

    if (!response.ok) return null;

    const data: NominatimResult = await response.json();
    if (data.error) return null;

    return {
      latitude: parseFloat(data.lat),
      longitude: parseFloat(data.lon),
      display_name: data.display_name,
      address: buildAddressString(data.address),
      city: data.address?.city || data.address?.town || data.address?.village || '',
      state: data.address?.state || '',
      country: data.address?.country || '',
      zip_code: data.address?.postcode || '',
      place_id: data.place_id,
    };
  } catch (error) {
    // Silently fail - caller handles null result
    return null;
  }
}

/**
 * Get address autocomplete suggestions.
 */
export async function getAddressSuggestions(
  query: string,
  options: GeocodeOptions = {}
): Promise<SearchSuggestion[]> {
  if (!query || query.length < 3) return [];

  const { countryCodes = ['br'], limit = 10 } = options;

  try {
    // Try backend API first
    const params = new URLSearchParams({
      q: query,
      country_codes: countryCodes.join(','),
      limit: String(limit),
    });

    const response = await api.get<{ suggestions: SearchSuggestion[] }>(
      `/ecommerce/geocoding/suggestions/?${params}`
    );
    return response.data.suggestions || [];
  } catch {
    // Backend suggestions failed, falling back to Nominatim
    const results = await geocodeAddressDirect(query, { countryCodes, limit });
    return results.map((r) => ({
      display_name: r.display_name,
      latitude: r.latitude,
      longitude: r.longitude,
      place_id: r.place_id || 0,
      address_type: '',
      importance: r.importance || 0,
    }));
  }
}

/**
 * Calculate route between two points.
 */
export async function calculateRoute(
  origin: Coordinates,
  destination: Coordinates,
  options: RouteOptions = {}
): Promise<RouteInfo | null> {
  const { profile = 'driving', steps = true } = options;

  try {
    // Try backend API first
    const response = await api.post<RouteInfo>('/ecommerce/geocoding/route/', {
      origin,
      destination,
      profile,
      steps,
    });
    return response.data;
  } catch {
    // Backend routing failed, falling back to OSRM
    return calculateRouteDirect(origin, destination, options);
  }
}

/**
 * Direct OSRM routing (fallback).
 */
async function calculateRouteDirect(
  origin: Coordinates,
  destination: Coordinates,
  options: RouteOptions = {}
): Promise<RouteInfo | null> {
  const { profile = 'driving', steps = true } = options;

  const profileMap: Record<string, string> = {
    driving: 'driving',
    car: 'driving',
    walking: 'foot',
    foot: 'foot',
    cycling: 'bike',
    bike: 'bike',
  };

  const osrmProfile = profileMap[profile] || 'driving';
  const coords = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;

  try {
    const params = new URLSearchParams({
      overview: 'full',
      geometries: 'polyline6',
      steps: steps ? 'true' : 'false',
    });

    const response = await fetch(`${OSRM_URL}/route/v1/${osrmProfile}/${coords}?${params}`);

    if (!response.ok) return null;

    const data = await response.json();
    if (data.code !== 'Ok' || !data.routes?.length) return null;

    const route = data.routes[0];
    return {
      distance_km: parseFloat((route.distance / 1000).toFixed(2)),
      duration_minutes: Math.round(route.duration / 60),
      geometry: route.geometry,
      summary: route.legs?.[0]?.summary || '',
      steps: steps ? extractSteps(route) : undefined,
    };
  } catch (error) {
    // Silently fail - caller handles null result
    return null;
  }
}

/**
 * Extract steps from OSRM route.
 */
function extractSteps(route: { legs?: { steps?: unknown[] }[] }): RouteStep[] {
  const steps: RouteStep[] = [];
  for (const leg of route.legs || []) {
    for (const step of (leg.steps || []) as {
      maneuver?: { type?: string; modifier?: string };
      distance?: number;
      duration?: number;
      name?: string;
    }[]) {
      const maneuver = step.maneuver || {};
      steps.push({
        instruction: getStepInstruction(step, maneuver),
        distance: step.distance || 0,
        duration: step.duration || 0,
        name: step.name || '',
        maneuver_type: maneuver.type || '',
        maneuver_modifier: maneuver.modifier || '',
      });
    }
  }
  return steps;
}

/**
 * Generate human-readable instruction for a route step.
 */
function getStepInstruction(
  step: { name?: string },
  maneuver: { type?: string; modifier?: string }
): string {
  const type = maneuver.type || '';
  const modifier = maneuver.modifier || '';
  const name = step.name || '';

  const instructions: Record<string, string> = {
    depart: `Siga em frente${name ? ' pela ' + name : ''}`,
    arrive: `Você chegou ao destino${name ? ' em ' + name : ''}`,
    turn: getTurnInstruction(modifier, name),
    continue: `Continue${name ? ' pela ' + name : ''}`,
    merge: `Entre na via${name ? ' ' + name : ''}`,
    'on ramp': `Pegue a rampa${name ? ' para ' + name : ''}`,
    'off ramp': `Saia pela rampa${name ? ' para ' + name : ''}`,
    fork: `Mantenha-se à ${translateModifier(modifier)}${name ? ' para ' + name : ''}`,
    'end of road': `No final da via, vire à ${translateModifier(modifier)}`,
    roundabout: `Na rotatória, pegue a saída${name ? ' para ' + name : ''}`,
    rotary: `Na rotatória, pegue a saída${name ? ' para ' + name : ''}`,
  };

  return instructions[type] || `Continue${name ? ' pela ' + name : ''}`;
}

function getTurnInstruction(modifier: string, name: string): string {
  const turnTypes: Record<string, string> = {
    left: 'Vire à esquerda',
    right: 'Vire à direita',
    'slight left': 'Vire levemente à esquerda',
    'slight right': 'Vire levemente à direita',
    'sharp left': 'Vire acentuadamente à esquerda',
    'sharp right': 'Vire acentuadamente à direita',
    uturn: 'Faça retorno',
    straight: 'Continue em frente',
  };

  let instruction = turnTypes[modifier] || 'Continue';
  if (name) instruction += ` para ${name}`;
  return instruction;
}

function translateModifier(modifier: string): string {
  const translations: Record<string, string> = {
    left: 'esquerda',
    right: 'direita',
    'slight left': 'esquerda',
    'slight right': 'direita',
    'sharp left': 'esquerda',
    'sharp right': 'direita',
    straight: 'frente',
  };
  return translations[modifier] || modifier;
}

/**
 * Brazilian CEP (zip code) lookup.
 */
export async function lookupCEP(cep: string): Promise<CEPData | null> {
  const cleanCep = cep.replace(/\D/g, '').slice(0, 8);
  if (cleanCep.length !== 8) return null;

  try {
    // Try backend API first
    const response = await api.get<CEPData>(`/ecommerce/geocoding/cep/${cleanCep}/`);
    return response.data;
  } catch {
    // Backend CEP lookup failed, falling back to ViaCEP
    return lookupCEPDirect(cleanCep);
  }
}

/**
 * Direct ViaCEP lookup (fallback).
 */
async function lookupCEPDirect(cep: string): Promise<CEPData | null> {
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!response.ok) return null;

    const data = await response.json();
    if (data.erro) return null;

    return {
      cep: data.cep || '',
      address: data.logradouro || '',
      complement: data.complemento || '',
      neighborhood: data.bairro || '',
      city: data.localidade || '',
      state: data.uf || '',
      state_full: data.estado || '',
      ibge_code: data.ibge || '',
      ddd: data.ddd || '',
    };
  } catch (error) {
    // Silently fail - caller handles null result
    return null;
  }
}

/**
 * Geocode a Brazilian address using CEP for better accuracy.
 */
export async function geocodeBrazilianAddress(
  cep: string,
  addressData: { address?: string; city?: string; state?: string } = {}
): Promise<GeoLocation | null> {
  try {
    const response = await api.post<GeoLocation>('/ecommerce/geocoding/geocode-brazilian/', {
      cep,
      address: addressData.address || '',
      city: addressData.city || '',
      state: addressData.state || '',
    });
    return response.data;
  } catch {
    // Backend Brazilian geocoding failed - fallback: lookup CEP and geocode
    const cepData = await lookupCEP(cep);
    if (!cepData) return null;

    const query = [
      addressData.address || cepData.address,
      cepData.neighborhood,
      addressData.city || cepData.city,
      addressData.state || cepData.state,
      'Brasil',
    ]
      .filter(Boolean)
      .join(', ');

    const results = await geocodeAddress(query, { limit: 1 });
    if (results.length > 0) {
      return {
        ...results[0],
        zip_code: cepData.cep,
      };
    }

    return null;
  }
}

/**
 * Get user's current location using browser geolocation.
 */
export function getCurrentLocation(
  options: PositionOptions = {}
): Promise<Coordinates & { accuracy: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    const defaultOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
      ...options,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        let message = 'Erro ao obter localização';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Permissão de localização negada';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Localização indisponível';
            break;
          case error.TIMEOUT:
            message = 'Tempo esgotado ao obter localização';
            break;
        }
        reject(new Error(message));
      },
      defaultOptions
    );
  });
}

/**
 * Build address string from address components.
 */
function buildAddressString(address?: NominatimResult['address']): string {
  if (!address) return '';

  const parts: string[] = [];
  if (address.road) {
    let road = address.road;
    if (address.house_number) {
      road = `${road}, ${address.house_number}`;
    }
    parts.push(road);
  }
  if (address.suburb || address.neighbourhood) {
    parts.push(address.suburb || address.neighbourhood || '');
  }
  return parts.join(', ');
}

/**
 * Calculate haversine distance between two points in km.
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export default {
  geocodeAddress,
  reverseGeocode,
  getAddressSuggestions,
  calculateRoute,
  lookupCEP,
  geocodeBrazilianAddress,
  getCurrentLocation,
  haversineDistance,
};
