import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  reverseGeocode,
  getAddressSuggestions,
  getCurrentLocation,
  GeoLocation,
  SearchSuggestion,
} from '../../services/geocoding';

// Leaflet CSS and JS URLs
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

// Default center (Brazil)
const DEFAULT_CENTER: [number, number] = [-10.3333, -53.2];
const DEFAULT_ZOOM = 4;

// Leaflet is loaded dynamically, use any for types
/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    L: any;
  }
}

interface Location {
  latitude: number;
  longitude: number;
}

interface ZoneCircle {
  center: Location;
  radiusKm: number;
  color: string;
  label?: string;
}

interface InteractiveMapProps {
  initialLocation?: Location | null;
  onLocationSelect?: (location: Location & Partial<GeoLocation>) => void;
  onAddressChange?: (address: Partial<GeoLocation> | null) => void;
  height?: string;
  showSearch?: boolean;
  showGeolocation?: boolean;
  showMarker?: boolean;
  markerDraggable?: boolean;
  className?: string;
  placeholder?: string;
  showZoneCircles?: ZoneCircle[] | boolean;
  zoneRadii?: number[]; // Simple array of radii in km (uses initialLocation as center)
}

/**
 * Interactive Map Component using OpenStreetMap/Leaflet
 */
// Zone colors for different radii
const ZONE_COLORS = [
  '#22c55e', // green
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#06b6d4', // cyan
];

const InteractiveMap: React.FC<InteractiveMapProps> = ({
  initialLocation = null,
  onLocationSelect,
  onAddressChange,
  height = '400px',
  showSearch = true,
  showGeolocation = true,
  showMarker = true,
  markerDraggable = true,
  className = '',
  placeholder = 'Buscar endereço...',
  showZoneCircles = [],
  zoneRadii = [],
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circlesRef = useRef<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<(Location & Partial<GeoLocation>) | null>(
    initialLocation
  );
  const [error, setError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsRef = useRef<HTMLFormElement>(null);

  // Load Leaflet dynamically
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.L) {
      setIsLoaded(true);
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = LEAFLET_CSS;
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () => setIsLoaded(true);
    script.onerror = () => setError('Erro ao carregar o mapa');
    document.head.appendChild(script);
  }, []);

  const handleMarkerDragEnd = useCallback(async (e: any) => {
    const latlng = e.target.getLatLng();
    await selectLocation(latlng.lat, latlng.lng, false);
  }, []);

  const selectLocation = useCallback(
    async (latitude: number, longitude: number, updateMarker = true) => {
      setIsLoading(true);
      setError(null);

      try {
        if (updateMarker && mapRef.current && window.L) {
          const L = window.L;

          if (markerRef.current) {
            markerRef.current.setLatLng([latitude, longitude]);
          } else if (showMarker) {
            const marker = L.marker([latitude, longitude], {
              draggable: markerDraggable,
            }).addTo(mapRef.current);

            if (markerDraggable) {
              marker.on('dragend', handleMarkerDragEnd);
            }

            markerRef.current = marker;
          }

          mapRef.current.setView([latitude, longitude], Math.max(mapRef.current.getZoom(), 15));
        }

        const addressData = await reverseGeocode(latitude, longitude);

        const location: Location & Partial<GeoLocation> = {
          latitude,
          longitude,
          ...addressData,
        };

        setSelectedLocation(location);
        onLocationSelect?.(location);
        onAddressChange?.(addressData);
      } catch {
        setError('Erro ao obter endereço');

        const location = { latitude, longitude };
        setSelectedLocation(location);
        onLocationSelect?.(location);
      } finally {
        setIsLoading(false);
      }
    },
    [showMarker, markerDraggable, onLocationSelect, onAddressChange, handleMarkerDragEnd]
  );

  const handleMapClick = useCallback(
    async (e: any) => {
      const { lat, lng } = e.latlng;
      await selectLocation(lat, lng);
    },
    [selectLocation]
  );

  useEffect(() => {
    if (!isLoaded || !mapContainerRef.current || mapRef.current) return;

    const L = window.L;

    const map = L.map(mapContainerRef.current, {
      center: initialLocation
        ? [initialLocation.latitude, initialLocation.longitude]
        : DEFAULT_CENTER,
      zoom: initialLocation ? 15 : DEFAULT_ZOOM,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    if (initialLocation && showMarker) {
      const marker = L.marker([initialLocation.latitude, initialLocation.longitude], {
        draggable: markerDraggable,
      }).addTo(map);

      if (markerDraggable) {
        marker.on('dragend', handleMarkerDragEnd);
      }

      markerRef.current = marker;
    }

    map.on('click', handleMapClick);

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [isLoaded, initialLocation, showMarker, markerDraggable, handleMapClick, handleMarkerDragEnd]);

  useEffect(() => {
    if (!mapRef.current || !window.L) return;

    const L = window.L;

    // Clear existing circles
    circlesRef.current.forEach((circle) => circle.remove());
    circlesRef.current = [];

    // Handle ZoneCircle array
    if (Array.isArray(showZoneCircles) && showZoneCircles.length > 0) {
      showZoneCircles.forEach((zone) => {
        const circle = L.circle([zone.center.latitude, zone.center.longitude], {
          radius: zone.radiusKm * 1000,
          color: zone.color,
          fillColor: zone.color,
          fillOpacity: 0.1,
          weight: 2,
        }).addTo(mapRef.current!);

        if (zone.label) {
          circle.bindTooltip(zone.label, { permanent: false, direction: 'center' });
        }

        circlesRef.current.push(circle);
      });
    }

    // Handle simple zoneRadii array (uses initialLocation as center)
    if (zoneRadii.length > 0 && initialLocation) {
      const sortedRadii = [...zoneRadii].sort((a, b) => b - a); // Sort descending for proper layering
      sortedRadii.forEach((radiusKm, index) => {
        const color = ZONE_COLORS[index % ZONE_COLORS.length];
        const circle = L.circle([initialLocation.latitude, initialLocation.longitude], {
          radius: radiusKm * 1000,
          color: color,
          fillColor: color,
          fillOpacity: 0.08,
          weight: 2,
        }).addTo(mapRef.current!);

        circle.bindTooltip(`${radiusKm} km`, { permanent: false, direction: 'center' });
        circlesRef.current.push(circle);
      });

      // Fit map to show all circles
      if (sortedRadii.length > 0) {
        const maxRadius = sortedRadii[0];
        const bounds = L.latLng(initialLocation.latitude, initialLocation.longitude).toBounds(maxRadius * 1000 * 2.2);
        mapRef.current.fitBounds(bounds);
      }
    }
  }, [showZoneCircles, zoneRadii, initialLocation, isLoaded]);

  const handleGetCurrentLocation = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const position = await getCurrentLocation();
      await selectLocation(position.latitude, position.longitude);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [selectLocation]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await getAddressSuggestions(query);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch {
        // Search failed - suggestions will be empty
      }
    }, 300);
  }, []);

  const handleSuggestionSelect = useCallback(
    async (suggestion: SearchSuggestion) => {
      setSearchQuery(suggestion.display_name);
      setShowSuggestions(false);
      setSuggestions([]);

      await selectLocation(suggestion.latitude, suggestion.longitude);
    },
    [selectLocation]
  );

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (suggestions.length > 0) {
        handleSuggestionSelect(suggestions[0]);
      }
    },
    [suggestions, handleSuggestionSelect]
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (error && !isLoaded) {
    return (
      <div
        className={`flex items-center justify-center bg-red-50 text-red-700 rounded-lg ${className}`}
        style={{ height }}
      >
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className={`relative w-full rounded-lg overflow-hidden bg-gray-100 ${className}`}>
      {(showSearch || showGeolocation) && (
        <div className="flex gap-2 p-3 bg-white border-b border-gray-200">
          {showSearch && (
            <form onSubmit={handleSearchSubmit} className="flex-1 relative" ref={suggestionsRef}>
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder={placeholder}
                  className="flex-1 px-3 py-2 text-sm outline-none"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-green-500 text-white hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  disabled={isLoading}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </button>
              </div>

              {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute top-full left-0 right-0 bg-white border border-gray-300 border-t-0 rounded-b-lg max-h-48 overflow-y-auto z-50 shadow-lg">
                  {suggestions.map((suggestion, index) => (
                    <li
                      key={suggestion.place_id || index}
                      onClick={() => handleSuggestionSelect(suggestion)}
                      className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-gray-400 flex-shrink-0"
                      >
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                      </svg>
                      <span className="text-sm text-gray-700 truncate">{suggestion.display_name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </form>
          )}

          {showGeolocation && (
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 hover:text-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={isLoading}
              title="Usar minha localização"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <circle cx="12" cy="12" r="3"></circle>
                <line x1="12" y1="2" x2="12" y2="4"></line>
                <line x1="12" y1="20" x2="12" y2="22"></line>
                <line x1="2" y1="12" x2="4" y2="12"></line>
                <line x1="20" y1="12" x2="22" y2="12"></line>
              </svg>
            </button>
          )}
        </div>
      )}

      <div ref={mapContainerRef} className="w-full" style={{ height }}>
        {!isLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-100 text-gray-500">
            <div className="w-8 h-8 border-3 border-gray-300 border-t-green-500 rounded-full animate-spin"></div>
            <span>Carregando mapa...</span>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-50">
          <div className="w-8 h-8 border-3 border-gray-300 border-t-green-500 rounded-full animate-spin"></div>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between px-3 py-2 bg-red-50 text-red-700 text-sm">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900">
            ×
          </button>
        </div>
      )}

      {selectedLocation && selectedLocation.display_name && (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border-t border-green-100">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-green-500 flex-shrink-0"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <span className="text-sm text-gray-700 truncate">{selectedLocation.display_name}</span>
        </div>
      )}
    </div>
  );
};

export default InteractiveMap;
