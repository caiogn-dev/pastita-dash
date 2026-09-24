/**
 * Um adicional da assinatura (hoje: Etiqueta ANVISA) do ponto de vista da tela.
 *
 * Quem decide se a loja tem o adicional é o servidor (`adicionais` no GET da
 * assinatura já conta a loja isenta). Se essa leitura falhar, a tela NÃO
 * tranca: mostrar a vitrine de venda para quem já paga, por causa de uma
 * oscilação de rede, é pior do que deixar o portão da API responder 402.
 */
import { useCallback, useEffect, useState } from 'react';
import { useStore } from './useStore';
import {
  getSubscription,
  getAdicionais,
  contratarAdicional,
  cancelarAdicional,
  type Adicional,
  type AdicionalKey,
} from '../services/billing';

export type EstadoDoAdicional = 'carregando' | 'disponivel' | 'contratado' | 'incluso' | 'desconhecido';

export interface UseAdicional {
  estado: EstadoDoAdicional;
  /** Pode usar o módulo agora. */
  liberado: boolean;
  /** Preço e descrição, vindos do servidor. */
  adicional: Adicional | null;
  ocupado: boolean;
  erro: string | null;
  contratar: () => Promise<void>;
  cancelar: () => Promise<void>;
}

const motivo = (e: unknown, padrao: string): string =>
  (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || padrao;

export function useAdicional(chave: AdicionalKey): UseAdicional {
  const { storeSlug } = useStore();
  const [estado, setEstado] = useState<EstadoDoAdicional>('carregando');
  const [adicional, setAdicional] = useState<Adicional | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!storeSlug) {
      // Sem loja escolhida não há assinatura para ler; quem decide é a API.
      setEstado('desconhecido');
      return;
    }
    let vivo = true;
    setEstado('carregando');
    getAdicionais()
      .then((lista) => { if (vivo) setAdicional(lista.find((a) => a.key === chave) ?? null); })
      .catch(() => { /* sem catálogo o cartão some; o portão continua valendo */ });
    getSubscription(storeSlug)
      .then((sub) => {
        if (!vivo) return;
        if (sub.adicionais_inclusos?.includes(chave)) setEstado('incluso');
        else if (sub.adicionais?.includes(chave)) setEstado('contratado');
        else setEstado('disponivel');
      })
      .catch(() => { if (vivo) setEstado('desconhecido'); });
    return () => { vivo = false; };
  }, [storeSlug, chave]);

  const contratar = useCallback(async () => {
    if (!storeSlug) return;
    setOcupado(true);
    setErro(null);
    try {
      const lista = await contratarAdicional(storeSlug, chave);
      setEstado(lista.includes(chave) ? 'contratado' : 'disponivel');
    } catch (e) {
      setErro(motivo(e, 'Não foi possível contratar agora. Tente de novo.'));
    } finally {
      setOcupado(false);
    }
  }, [storeSlug, chave]);

  const cancelar = useCallback(async () => {
    if (!storeSlug) return;
    setOcupado(true);
    setErro(null);
    try {
      const lista = await cancelarAdicional(storeSlug, chave);
      setEstado(lista.includes(chave) ? 'contratado' : 'disponivel');
    } catch (e) {
      setErro(motivo(e, 'Não foi possível cancelar agora. Tente de novo.'));
    } finally {
      setOcupado(false);
    }
  }, [storeSlug, chave]);

  return {
    estado,
    liberado: estado === 'contratado' || estado === 'incluso' || estado === 'desconhecido',
    adicional,
    ocupado,
    erro,
    contratar,
    cancelar,
  };
}
