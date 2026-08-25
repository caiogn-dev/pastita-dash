import React, { useEffect, useRef, useState } from 'react';
import type { DeliveryZone, StoreLocation } from '../../services/delivery';
import { zonasParaCirculos } from './zonasParaCirculos';
import { pontosDoCirculo } from './pontosDoCirculo';
import { GOOGLE_MAPS_KEY, loadGoogleMaps } from './loadGoogleMaps';

const DEFAULT_CENTER = { lat: -10.1853248, lng: -48.3037058 };
const COLORS = [
  { fill: 'rgba(249, 115, 22, 0.12)', stroke: '#F97316' },
  { fill: 'rgba(212, 175, 55, 0.12)', stroke: '#D4AF37' },
  { fill: 'rgba(76, 175, 80, 0.12)',  stroke: '#4CAF50' },
  { fill: 'rgba(33, 150, 243, 0.10)', stroke: '#2196F3' },
  { fill: 'rgba(255, 87, 34, 0.10)',  stroke: '#FF5722' },
];

/**
 * Verde e tracejado de propósito: a promoção NÃO é mais uma faixa de preço.
 * Se ela entrasse na paleta das faixas, o dono contaria os anéis e acharia que
 * cadastrou uma faixa a mais.
 */
export const COR_DA_PROMO = '#16A34A';

export type DeliveryZonesMapProps = {
  storeLocation?: StoreLocation | null;
  zones?: DeliveryZone[];
  /** Anel da promoção de frete grátis, se houver (ver `anelDaPromo`). */
  promo?: { raioMetros: number; rotulo: string } | null;
  height?: string;
};

/** Cor de cada anel, na mesma ordem em que o mapa desenha — para a legenda. */
export const corDoAnel = (index: number) => COLORS[index % COLORS.length].stroke;

const DeliveryZonesMap: React.FC<DeliveryZonesMapProps> = ({
  storeLocation,
  zones = [],
  promo = null,
  // 480px: com 360 os 17 km de raio viravam um retângulo baixo e largo onde
  // não se distinguem as faixas internas. Altura é o que falta, não largura.
  height = '480px',
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
          // Tela cheia LIGADA: julgar um raio de 17 km num retângulo de 360px
          // é impossível. É o único jeito de ver a área toda sem sair da tela.
          fullscreenControl: true,
          mapTypeControl: false,
          zoomControl: true,
          // 'greedy' seria pior: a roda do mouse passaria a dar zoom em vez de
          // rolar a página, e o usuário fica preso no mapa ao descer a tela.
          // 'cooperative' exige Ctrl+roda para zoom — os botões e a tela cheia
          // cobrem quem não conhece o gesto.
          gestureHandling: 'cooperative',
          clickableIcons: false,
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

      // Do MAIOR para o menor: o Google pinta na ordem de criação, e um
      // círculo grande criado depois cobre os menores — o mapa vira mancha e
      // some a faixa mais próxima da loja, que é a que mais entrega.
      const circulos = zonasParaCirculos(zones);
      circulos.forEach((c, index) => {
        const color = COLORS[index % COLORS.length];
        const circle = new maps.Circle({
          center: { lat, lng },
          radius: c.raioMetros,
          map,
          strokeColor: color.stroke,
          strokeOpacity: 0.9,
          strokeWeight: c.aberta ? 3 : 2,
          fillColor: color.stroke,
          // A faixa aberta ("17km+") não tem área definida — não faz sentido
          // preenchê-la. Só o contorno grosso, marcando onde ela começa.
          fillOpacity: c.aberta ? 0 : 0.09,
          // ESTE era o motivo de o mapa não arrastar: `clickable` é true por
          // padrão no Circle, e 16 círculos empilhados cobrindo a tela inteira
          // engoliam todo mousedown antes de o mapa vê-lo. O mapa parecia
          // travado e ninguém desconfiaria da forma geométrica.
          clickable: false,
        });
        objectsRef.current.push(circle);
      });

      // A promoção vai por ÚLTIMO: é a informação que se quer ler por cima do
      // resto. Tracejada e sem preenchimento para não somar opacidade com as
      // faixas embaixo — com preenchimento, a área mais próxima da loja (a que
      // mais entrega) já acumulava três camadas e virava mancha.
      if (promo && promo.raioMetros > 0) {
        // Anel desenhado ponto a ponto: `Circle` não tem `getPath()` (isso é
        // `Polygon`), e a primeira versão pedia justamente isso — recebia
        // `undefined`, caía num caminho vazio e não desenhava nada, sem erro.
        const caminho = pontosDoCirculo({ lat, lng }, promo.raioMetros);

        // Traço sólido por baixo garante que o anel EXISTA mesmo se os ícones
        // do tracejado não renderizarem. Invisível-por-padrão foi o bug.
        const anel = new maps.Polyline({
          path: caminho,
          map,
          strokeColor: COR_DA_PROMO,
          strokeOpacity: 0.35,
          strokeWeight: 3,
          clickable: false,
          zIndex: 999,
        });
        objectsRef.current.push(anel);

        const tracejado = new maps.Polyline({
          path: caminho,
          map,
          strokeOpacity: 0,
          icons: [{
            icon: {
              path: 'M 0,-1 0,1',
              strokeOpacity: 1,
              strokeColor: COR_DA_PROMO,
              strokeWeight: 4,
              scale: 3,
            },
            offset: '0',
            repeat: '16px',
          }],
          clickable: false,
          zIndex: 1000,
        });
        objectsRef.current.push(tracejado);
      }

      map.setCenter({ lat, lng });

      // Enquadra a MAIOR faixa. Sem isto o mapa abre no zoom padrão e a área
      // de entrega ou não cabe na tela ou vira um ponto — em nenhum dos dois
      // casos você consegue julgar se o raio está certo.
      // Enquadra o MAIOR entre faixas e promoção. Ignorar a promoção aqui
      // cortaria o anel para fora da tela em loja cujo raio grátis passa da
      // maior faixa desenhável — o dono veria a legenda citando 4 km e nenhum
      // círculo verde no mapa.
      const maiorRaio = Math.max(
        circulos[0]?.raioMetros ?? 0,
        promo?.raioMetros ?? 0,
      );
      if (maiorRaio > 0) {
        const limites = new maps.Circle({ center: { lat, lng }, radius: maiorRaio });
        map.fitBounds(limites.getBounds());
      }
    }
  }, [mapReady, storeLocation, zones, promo?.raioMetros]);

  if (!GOOGLE_MAPS_KEY) {
    return (
      <div
        className="flex items-center justify-center rounded border border-dashed border-border-token bg-surface-2 p-4 text-center"
        style={{ height }}
      >
        <span className="text-body text-fg-muted-token">
          Mapa indisponível: a chave do Google Maps não está configurada neste ambiente.
        </span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        className="flex items-center justify-center rounded border border-dashed border-border-token bg-surface-2 p-4 text-center"
        style={{ height }}
      >
        <span className="text-body text-fg-muted-token">
          Não foi possível carregar o mapa. As faixas abaixo continuam valendo.
        </span>
      </div>
    );
  }

  return (
    <div
      ref={mapContainerRef}
      className="w-full overflow-hidden rounded border border-border-token"
      style={{ height }}
    />
  );
};

export default DeliveryZonesMap;
