import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PhotoIcon, TrashIcon } from '@heroicons/react/24/outline';

import { Card, Button } from '../../components/ui';
import { Loading } from '../../components/common/Loading';
import {
  apagarBanner, listarBanners, subirBanner, MAXIMO_DE_BANNERS, type BannerDoCardapio,
} from '../../services/storesApi';
import logger from '../../services/logger';
import { cn } from '../../utils/cn';

interface BannersSectionProps {
  storeId: string;
  /** Dentro do painel de propriedades do Storefront: sem cartão nem cabeçalho. */
  embutida?: boolean;
  /** Banner enviado ou apagado (a prévia recarrega para buscar). */
  onMudou?: () => void;
}

/**
 * Cards de aviso no topo do cardápio — até 3 imagens quadradas (1:1).
 *
 * O cardápio completa o carrossel repetindo as imagens (sempre 3 slides),
 * então 1 foto já basta. Isto é diferente da CAPA: a capa é a identidade fixa atrás do logo; o banner
 * é a promoção da semana.
 */
export const BannersSection: React.FC<BannersSectionProps> = ({ storeId, embutida = false, onMudou }) => {
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
      onMudou?.();
    } catch (e: unknown) {
      logger.error('Erro ao subir banner:', e);
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setErro(msg || 'Não consegui subir a imagem. Tente de novo.');
    } finally {
      setEnviando(false);
      if (entrada.current) entrada.current.value = '';
    }
  }, [storeId, onMudou]);

  const apagar = useCallback(async (id: string) => {
    setErro('');
    const antes = banners;
    setBanners((atuais) => atuais.filter((b) => b.id !== id));
    try {
      await apagarBanner(storeId, id);
      onMudou?.();
    } catch (e) {
      logger.error('Erro ao apagar banner:', e);
      setBanners(antes);
      setErro('Não consegui apagar. Tente de novo.');
    }
  }, [banners, storeId, onMudou]);

  const conteudo = (
    <>
      {carregando ? (
        <Loading rotulo="Carregando banners" />
      ) : (
        <ul className={embutida ? 'grid grid-cols-3 gap-2' : 'grid grid-cols-1 gap-3 sm:grid-cols-3'}>
          {banners.map((b, i) => (
            <li key={b.id} className="relative overflow-hidden rounded-lg border border-border-token">
              <img src={b.url} alt={`Banner ${i + 1}`} className="aspect-square w-full object-cover" />
              <button
                type="button"
                onClick={() => apagar(b.id)}
                aria-label={`Apagar banner ${i + 1}`}
                className={cn(
                  'absolute flex items-center justify-center rounded-full bg-surface text-danger-500 shadow focus:outline-none focus:ring-2 focus:ring-brand',
                  embutida ? 'right-1 top-1 h-7 w-7' : 'right-2 top-2 h-8 w-8'
                )}
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
                className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border-token text-sm text-fg-muted-token hover:border-[var(--brand)] hover:text-fg-token focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-60"
              >
                <PhotoIcon className="h-6 w-6" />
                {enviando ? 'Enviando...' : embutida ? 'Adicionar' : 'Adicionar banner'}
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
    </>
  );

  if (embutida) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-caption font-semibold text-fg-muted-token">Quadrado 1080 × 1080</span>
          <span className="text-caption tabular-nums text-fg-muted-token">{banners.length}/{MAXIMO_DE_BANNERS}</span>
        </div>
        {conteudo}
        {erro && <p role="alert" className="text-sm text-danger-500">{erro}</p>}
      </div>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-medium text-fg-token">Banners do cardápio</h3>
          <p className="text-sm text-fg-muted-token">
            Até {MAXIMO_DE_BANNERS} cards quadrados girando no topo (3 na tela no computador, 1 no celular). Com uma imagem só, ela se repete.
          </p>
        </div>
        <span className="shrink-0 text-sm tabular-nums text-fg-muted-token">
          {banners.length}/{MAXIMO_DE_BANNERS}
        </span>
      </div>

      {conteudo}
      <p className="mt-3 text-xs text-fg-muted-token">Imagem quadrada (1:1), ex.: 1080 × 1080. Texto grande e no centro.</p>
      {erro && <p role="alert" className="mt-2 text-sm text-danger-500">{erro}</p>}
    </Card>
  );
};

export default BannersSection;
