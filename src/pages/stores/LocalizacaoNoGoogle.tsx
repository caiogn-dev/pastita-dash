/**
 * Achar a PRÓPRIA loja no Google: pelo nome do estabelecimento ou colando o
 * link do Google Maps. Antes a tela só aceitava latitude/longitude digitadas,
 * e a Agrião ficou com as coordenadas da Cê (03/10).
 */
import React, { useEffect, useRef, useState } from 'react';
import { LinkIcon, MapPinIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import { SearchInput, Input, Button } from '../../components/ui';

export interface PontoEscolhido {
  lat: number;
  lng: number;
  /** Endereço legível do Google, quando veio da busca. */
  endereco?: string;
}

interface Sugestao {
  main_text?: string;
  secondary_text?: string;
  formatted_address?: string;
  display_name?: string;
  lat?: number | null;
  lng?: number | null;
}

interface Props {
  storeSlug: string;
  onEscolher: (ponto: PontoEscolhido) => void;
}

export const LocalizacaoNoGoogle: React.FC<Props> = ({ storeSlug, onEscolher }) => {
  const [busca, setBusca] = useState('');
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [link, setLink] = useState('');
  const [lendoLink, setLendoLink] = useState(false);
  const [erroDoLink, setErroDoLink] = useState('');
  const pedido = useRef(0);

  useEffect(() => {
    const termo = busca.trim();
    if (termo.length < 3) { setSugestoes([]); return undefined; }
    const meu = ++pedido.current;
    const t = setTimeout(async () => {
      setBuscando(true);
      try {
        const { data } = await api.get(`/stores/${storeSlug}/autosuggest/`, {
          params: { q: termo, tipo: 'estabelecimento', limit: 6 },
        });
        if (meu === pedido.current) setSugestoes(data?.suggestions || []);
      } catch {
        if (meu === pedido.current) setSugestoes([]);
      } finally {
        if (meu === pedido.current) setBuscando(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [busca, storeSlug]);

  const escolher = (s: Sugestao) => {
    if (s.lat == null || s.lng == null) return;
    onEscolher({ lat: Number(s.lat), lng: Number(s.lng), endereco: s.formatted_address || s.display_name });
    setBusca('');
    setSugestoes([]);
  };

  const usarLink = async () => {
    setErroDoLink('');
    setLendoLink(true);
    try {
      const { data } = await api.get(`/stores/${storeSlug}/ponto-do-link/`, { params: { link: link.trim() } });
      onEscolher({ lat: Number(data.lat), lng: Number(data.lng) });
      setLink('');
    } catch (err) {
      const detalhe = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setErroDoLink(detalhe || 'Não achei a localização nesse link.');
    } finally {
      setLendoLink(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <SearchInput
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Nome da loja no Google"
          aria-label="Buscar a loja no Google"
        />
        {(sugestoes.length > 0 || buscando) && (
          <ul className="superficie-alta absolute z-20 mt-1 w-full overflow-hidden py-1" role="listbox" aria-label="Lugares do Google">
            {buscando && sugestoes.length === 0 && <li className="px-3 py-2 text-sm text-fg-muted-token">Buscando…</li>}
            {sugestoes.map((s, i) => (
              <li key={`${s.display_name}-${i}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => escolher(s)}
                  disabled={s.lat == null || s.lng == null}
                  className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-surface-2 disabled:opacity-50"
                >
                  <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-ink" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-fg-token">{s.main_text || s.display_name}</span>
                    {s.secondary_text && <span className="block truncate text-xs text-fg-muted-token">{s.secondary_text}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <Input
            value={link}
            onChange={(e) => { setLink(e.target.value); setErroDoLink(''); }}
            placeholder="Ou cole o link do Google Maps"
            aria-label="Link do Google Maps"
            leftIcon={<LinkIcon className="h-4 w-4" />}
            error={erroDoLink || undefined}
          />
        </div>
        <Button type="button" variant="outline" onClick={usarLink} disabled={!link.trim()} isLoading={lendoLink}>
          Usar
        </Button>
      </div>
    </div>
  );
};

export default LocalizacaoNoGoogle;
