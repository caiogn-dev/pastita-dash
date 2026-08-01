/**
 * Mapa de calor de pedidos — círculos escalados/coloridos pelo valor dos
 * pedidos entregues em cada ponto (dados do endpoint reports/geography/).
 * Usa o mesmo loader do DeliveryZonesMap; sem biblioteca extra.
 */
import React, { useEffect, useRef, useState } from 'react';
import { GOOGLE_MAPS_KEY, loadGoogleMaps } from './loadGoogleMaps';

export interface HeatPoint { lat: number; lng: number; total: number }

const DEFAULT_CENTER = { lat: -10.1853248, lng: -48.3037058 };

export const OrdersHeatMap: React.FC<{ points: HeatPoint[]; height?: string }> = ({
  points,
  height = '380px',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const circlesRef = useRef<any[]>([]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!GOOGLE_MAPS_KEY || !containerRef.current) return;
    let active = true;
    loadGoogleMaps()
      .then(() => {
        if (!active || !containerRef.current || mapRef.current) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const maps = (window as any).google.maps;
        mapRef.current = new maps.Map(containerRef.current, {
          center: DEFAULT_CENTER,
          zoom: 12,
          streetViewControl: false,
          fullscreenControl: false,
          mapTypeControl: false,
        });
        if (active) setReady(true);
      })
      .catch(() => { if (active) setFailed(true); });
    return () => {
      active = false;
      mapRef.current = null;
      circlesRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const maps = (window as any).google.maps;
    const map = mapRef.current;

    circlesRef.current.forEach((c) => { try { c.setMap(null); } catch { /* ignore */ } });
    circlesRef.current = [];
    if (!points.length) return;

    const maxTotal = Math.max(...points.map((p) => p.total), 1);
    const bounds = new maps.LatLngBounds();

    points.forEach((p) => {
      const weight = p.total / maxTotal; // 0..1
      const circle = new maps.Circle({
        map,
        center: { lat: p.lat, lng: p.lng },
        radius: 120 + weight * 380, // metros
        fillColor: '#D4AF37',
        fillOpacity: 0.15 + weight * 0.4,
        strokeColor: '#D4AF37',
        strokeOpacity: 0.5,
        strokeWeight: 1,
      });
      circlesRef.current.push(circle);
      bounds.extend({ lat: p.lat, lng: p.lng });
    });
    map.fitBounds(bounds, 48);
  }, [ready, points]);

  if (!GOOGLE_MAPS_KEY || failed) {
    return (
      <p className="text-sm text-fg-muted-token py-4">
        Mapa indisponível (chave do Google Maps não configurada).
      </p>
    );
  }
  return <div ref={containerRef} style={{ height }} className="w-full rounded-lg overflow-hidden border border-border-token" />;
};

export default OrdersHeatMap;
