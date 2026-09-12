import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PhotoIcon, TrashIcon } from '@heroicons/react/24/outline';

import { Card, Button } from '../../components/ui';
import Loading from '../../components/common/Loading';
import {
  apagarBanner, listarBanners, subirBanner, MAXIMO_DE_BANNERS, type BannerDoCardapio,
} from '../../services/storesApi';
import logger from '../../services/logger';

interface BannersSectionProps {
  storeId: string;
}

/**
 * Banners do carrossel no topo do cardápio — até 3 imagens.
 *
 * Com 1 ou 2 o cardápio completa o carrossel repetindo as imagens (sempre 3
 * slides girando), então a loja não precisa ter 3 fotos para ter o carrossel.
 * Isto é diferente da CAPA: a capa é a identidade fixa atrás do logo; o banner
 * é a promoção da semana.
 */
export const BannersSection: React.FC<BannersSectionProps> = ({ storeId }) => {
  const [banners, setBanners] = useState<BannerDoCardapio[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const entrada = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let vivo = true;
    listarBanners(storeId)
      .then((lista) => { if (vivo) setBanners(lista || []); })
      .catch((e) => logger.error('Erro ao carregar banners:', e))
      .finally(() => { if (vivo) setCarregando(false); });
    return () => { vivo = false; };
  }, [storeId]);

  const cheio = banners.length >= MAXIMO_DE_BANNERS;

  const escolher = useCallback(async (arquivo: File | undefined) => {
    if (!arquivo) return;
    setErro('');
    if (!arquivo.type.startsWith('image/')) {
      setErro('Escolha um arquivo de imagem.');
      return;
    }
    setEnviando(true);
    try {
      const novo = await subirBanner(storeId, arquivo);
      setBanners((atuais) => [...atuais, novo]);
    } catch (e: unknown) {
      logger.error('Erro ao subir banner:', e);
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setErro(msg || 'Não consegui subir a imagem. Tente de novo.');
    } finally {
      setEnviando(false);
      if (entrada.current) entrada.current.value = '';
    }
  }, [storeId]);

  const apagar = useCallback(async (id: string) => {
    setErro('');
    const antes = banners;
    setBanners((atuais) => atuais.filter((b) => b.id !== id));
    try {
      await apagarBanner(storeId, id);
    } catch (e) {
      logger.error('Erro ao apagar banner:', e);
      setBanners(antes);
      setErro('Não consegui apagar. Tente de novo.');
    }
  }, [banners, storeId]);

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-medium text-fg-token">Banners do cardápio</h3>
          <p className="text-sm text-fg-muted-token">
            Até {MAXIMO_DE_BANNERS} imagens girando no topo. Com uma só, ela se repete no carrossel.
          </p>
        </div>
        <span className="shrink-0 text-sm tabular-nums text-fg-muted-token">
          {banners.length}/{MAXIMO_DE_BANNERS}
        </span>
      </div>

      {carregando ? (
        <Loading rotulo="Carregando banners" />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {banners.map((b, i) => (
            <li key={b.id} className="relative overflow-hidden rounded-lg border border-border-token">
              <img src={b.url} alt={`Banner ${i + 1}`} className="aspect-[16/7] w-full object-cover" />
              <button
                type="button"
                onClick={() => apagar(b.id)}
                aria-label={`Apagar banner ${i + 1}`}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-surface text-danger-500 shadow focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </li>
          ))}
          {!cheio && (
            <li>
              <button
                type="button"
                onClick={() => entrada.current?.click()}
                disabled={enviando}
                className="flex aspect-[16/7] w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border-token text-sm text-fg-muted-token hover:border-[var(--brand)] hover:text-fg-token focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-60"
              >
                <PhotoIcon className="h-6 w-6" />
                {enviando ? 'Enviando...' : 'Adicionar banner'}
              </button>
            </li>
          )}
        </ul>
      )}

      <input
        ref={entrada}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label="Arquivo do banner"
        onChange={(e) => escolher(e.target.files?.[0])}
      />
      <p className="mt-3 text-xs text-fg-muted-token">Formato largo funciona melhor (ex.: 1600 × 700).</p>
      {erro && <p role="alert" className="mt-2 text-sm text-danger-500">{erro}</p>}
    </Card>
  );
};

export default BannersSection;
