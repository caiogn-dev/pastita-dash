import React, { useEffect, useRef, useState } from 'react';
import type { DeliveryZone, StoreLocation } from '../../services/delivery';

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || '';
const DEFAULT_CENTER = { lat: -10.1853248, lng: -48.3037058 };
const COLORS = [
  { fill: 'rgba(249, 115, 22, 0.12)', stroke: '#F97316' },
  { fill: 'rgba(212, 175, 55, 0.12)', stroke: '#D4AF37' },
  { fill: 'rgba(76, 175, 80, 0.12)',  stroke: '#4CAF50' },
  { fill: 'rgba(33, 150, 243, 0.10)', stroke: '#2196F3' },
  { fill: 'rgba(255, 87, 34, 0.10)',  stroke: '#FF5722' },
];

let _gmLoadPromise: Promise<void> | null = null;

const loadGoogleMaps = (): Promise<void> => {
  if ((window as any).google?.maps?.Map) return Promise.resolve();
  if (_gmLoadPromise) return _gmLoadPromise;

  _gmLoadPromise = new Promise((resolve, reject) => {
    const callbackName = '__gmReadyDeliveryZones__';
    (window as any)[callbackName] = () => resolve();
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&callback=${callbackName}&loading=async`;
    script.async = true;
    script.onerror = () => {
      _gmLoadPromise = null;
      reject(new Error('Failed to load Google Maps JS API'));
    };
    document.head.appendChild(script);
  });

  return _gmLoadPromise;
};

export type DeliveryZonesMapProps = {
  storeLocation?: StoreLocation | null;
  zones?: DeliveryZone[];
  height?: string;
};

const DeliveryZonesMap: React.FC<DeliveryZonesMapProps> = ({
  storeLocation,
  zones = [],
  height = '320px',
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const objectsRef = useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!GOOGLE_MAPS_KEY || !mapContainerRef.current) return;
    let active = true;

    loadGoogleMaps()
      .then(() => {
        if (!active || !mapContainerRef.current || mapRef.current) return;
        const maps = (window as any).google.maps;
        const center = storeLocation?.latitude && storeLocation?.longitude
          ? { lat: Number(storeLocation.latitude), lng: Number(storeLocation.longitude) }
          : DEFAULT_CENTER;

        mapRef.current = new maps.Map(mapContainerRef.current, {
          center,
          zoom: 13,
          streetViewControl: false,
          fullscreenControl: false,
          mapTypeControl: false,
          zoomControl: true,
        });

        if (active) setMapReady(true);
      })
      .catch(() => {
        if (active) setLoadError(true);
      });

    return () => {
      active = false;
      mapRef.current = null;
      objectsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    const maps = (window as any).google.maps;
    const map = mapRef.current;

    objectsRef.current.forEach((obj) => {
      try { obj.setMap(null); } catch { /* ignore */ }
    });
    objectsRef.current = [];

    if (storeLocation?.latitude && storeLocation?.longitude) {
      const lat = Number(storeLocation.latitude);
      const lng = Number(storeLocation.longitude);

      const storeMarker = new maps.Marker({
        position: { lat, lng },
        map,
        title: 'Loja',
      });
      objectsRef.current.push(storeMarker);

      const sortedZones = [...zones].sort((a, b) => (a.max_km || 0) - (b.max_km || 0));
      sortedZones.forEach((zone, index) => {
        const maxKm = zone.max_km ?? zone.min_km;
        if (!maxKm) return;
        const color = COLORS[index % COLORS.length];
        const circle = new maps.Circle({
          center: { lat, lng },
          radius: maxKm * 1000,
          map,
          strokeColor: color.stroke,
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: color.stroke,
          fillOpacity: 0.12,
        });
        objectsRef.current.push(circle);
      });

      map.setCenter({ lat, lng });
    }
  }, [mapReady, storeLocation, zones]);

  if (!GOOGLE_MAPS_KEY) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50"
        style={{ height }}
      >
        <span className="text-sm text-gray-500">Chave Google Maps não configurada.</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50"
        style={{ height }}
      >
        <span className="text-sm text-gray-500">Erro ao carregar o mapa.</span>
      </div>
    );
  }

  return (
    <div
      ref={mapContainerRef}
      className="w-full rounded-lg border border-gray-200 overflow-hidden"
      style={{ height }}
    />
  );
};

export default DeliveryZonesMap;
