/**
 * Loader único do Google Maps JS API (deduplicado por promise global).
 * Extraído do DeliveryZonesMap para ser compartilhado com o mapa de calor
 * de pedidos — carregar o script duas vezes quebra a API.
 */
export const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || '';

let _gmLoadPromise: Promise<void> | null = null;

export const loadGoogleMaps = (): Promise<void> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((window as any).google?.maps?.Map) return Promise.resolve();
  if (_gmLoadPromise) return _gmLoadPromise;

  _gmLoadPromise = new Promise((resolve, reject) => {
    const callbackName = '__gmReadyCardapidex__';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
