import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Button, Secao, Skeleton, Switch } from '../../components/ui';
import {
  getFormasDePagamento,
  updateFormasDePagamento,
  type FormaDePagamento,
} from '../../services/storesApi';
import logger from '../../services/logger';
import { useParteDoSalvar } from './salvarJunto';

/** O que a linha entrega à configuração aninhada debaixo dela. */
export interface InterruptorDaForma {
  /** O interruptor como está na tela (rascunho, antes do Salvar). */
  ligada: boolean;
  /**
   * Quantas vezes o LOJISTA mexeu nele. Recarga não conta — é isto que deixa a
   * configuração aninhada seguir o interruptor sem inventar alteração quando a
   * página só recarregou.
   */
  toques: number;
}

interface Props {
  storeId: string;
  /**
   * Configuração de uma forma, aninhada na linha dela (Vale → bandeiras →
   * chaves). A forma que tem configuração aparece mesmo sem estar disponível:
   * é aqui que ela fica disponível. O nó fica montado com o interruptor
   * desligado (a parte dele no Salvar continua registrada) e decide sozinho o
   * que desenhar.
   */
  detalhes?: Partial<Record<string, (interruptor: InterruptorDaForma) => React.ReactNode>>;
  /** As formas ligadas na tela, a cada mudança (a página esconde o acréscimo do vale sem vale). */
  onMudar?: (ligadas: string[]) => void;
  /** Mude o valor para buscar de novo (depois do Salvar da página). */
  versao?: number;
}

const ligadaNaOrigem = (f: FormaDePagamento) => f.disponivel && f.ligada;

const telaDe = (formas: FormaDePagamento[]) =>
  Object.fromEntries(formas.map((f) => [f.metodo, ligadaNaOrigem(f)])) as Record<string, boolean>;

/**
 * A lista que o backend grava: desligada na tela E disponível vai para a
 * lista; indisponível desligada fica como estava (não há o que desligar).
 */
const desligadasDe = (formas: FormaDePagamento[], tela: Record<string, boolean>) =>
  formas
    .filter((f) => (tela[f.metodo] ? false : f.disponivel || !f.ligada))
    .map((f) => f.metodo);

/**
 * Como o cliente paga: uma linha por forma, com interruptor (25/11), e a
 * configuração de cada uma aninhada debaixo dela (26/11). O vale era ligado em
 * dois lugares — aqui e num "Aceitar vale" mais abaixo; agora é um só.
 *
 * Dentro do salvar único entra na barra da página; sozinha, grava no ato. A
 * última forma ligada não desliga: cardápio sem forma de pagamento não vende.
 */
export const FormasNoCardapioSection: React.FC<Props> = ({ storeId, detalhes = {}, onMudar, versao }) => {
  const [formas, setFormas] = useState<FormaDePagamento[] | null>(null);
  const [tela, setTela] = useState<Record<string, boolean>>({});
  const [toques, setToques] = useState<Record<string, number>>({});
  const [falhou, setFalhou] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const aplicar = useCallback((novas: FormaDePagamento[]) => {
    setFormas(novas);
    setTela(telaDe(novas));
  }, []);

  const carregar = useCallback(async () => {
    setFalhou(false);
    try {
      aplicar((await getFormasDePagamento(storeId)).formas);
    } catch (e) {
      logger.error('Erro ao carregar formas de pagamento:', e);
      setFalhou(true);
    }
  }, [storeId, aplicar]);

  useEffect(() => { void carregar(); }, [carregar, versao]);

  const configuraveis = Object.keys(detalhes);
  const visiveis = useMemo(
    () => (formas || []).filter((f) => f.disponivel || configuraveis.includes(f.metodo)),
    [formas, configuraveis.join(',')], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const ligadasNaTela = visiveis.filter((f) => tela[f.metodo]).map((f) => f.metodo);
  useEffect(() => { onMudar?.(ligadasNaTela); }, [ligadasNaTela.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const desligadas = formas ? desligadasDe(formas, tela) : [];
  // Conta pelo que a tela mostra, não só pelo que muda na lista: ligar o vale
  // numa loja onde ele ainda não está disponível é alteração (o Descartar
  // precisa voltar o interruptor), mesmo que a lista gravada fique igual.
  const origem = formas ? telaDe(formas) : {};
  const mudancas = Object.keys(tela).filter((m) => Boolean(tela[m]) !== Boolean(origem[m])).length;

  const gravar = async (lista: string[]) => {
    try {
      const resposta = await updateFormasDePagamento(storeId, lista);
      setFormas(resposta.formas);
      return resposta.formas;
    } catch (e) {
      logger.error('Erro ao salvar formas de pagamento:', e);
      setErro('Não consegui salvar. Nada mudou no cardápio.');
      throw e;
    }
  };

  const noSalvarUnico = useParteDoSalvar('formas-no-cardapio', {
    mudancas,
    // O interruptor fica como o lojista deixou; a página busca de novo depois
    // do Salvar (`versao`) e aí a disponibilidade já conta o vale gravado.
    salvar: async () => { setErro(''); await gravar(desligadas); },
    descartar: () => { if (formas) setTela(telaDe(formas)); setErro(''); },
  });

  const alternar = async (metodo: string, ligar: boolean) => {
    setErro('');
    setToques((t) => ({ ...t, [metodo]: (t[metodo] || 0) + 1 }));
    const proxima = { ...tela, [metodo]: ligar };
    setTela(proxima);
    if (noSalvarUnico || !formas) return;

    // Sozinha: grava no ato e volta o interruptor se falhar.
    const forma = formas.find((f) => f.metodo === metodo);
    if (forma && !forma.disponivel) return;
    setSalvando(true);
    try {
      aplicar(await gravar(desligadasDe(formas, proxima)));
    } catch {
      setTela(tela);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Secao titulo="Como o cliente paga">
      {falhou ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="text-danger-token">Não consegui carregar as formas de pagamento.</span>
          <Button size="sm" variant="secondary" onClick={() => void carregar()}>Tentar de novo</Button>
        </div>
      ) : !formas ? (
        <div className="space-y-3" aria-busy="true" aria-label="Carregando formas de pagamento">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-2/3" />
        </div>
      ) : visiveis.length === 0 ? (
        <p className="text-sm text-fg-muted-token">Conecte uma conta de recebimento para oferecer pagamento.</p>
      ) : (
        <>
          {erro && <p role="alert" className="mb-2 text-sm text-danger-token">{erro}</p>}
          <ul className="divide-y divide-border-token">
            {visiveis.map((f) => {
              const ligada = Boolean(tela[f.metodo]);
              const config = detalhes[f.metodo];
              return (
                <li key={f.metodo} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-medium text-fg-token">{f.rotulo}</span>
                    <Switch
                      ligado={ligada}
                      rotulo={f.rotulo}
                      desabilitado={salvando || (ligada && ligadasNaTela.length <= 1)}
                      onMudar={(marcado) => void alternar(f.metodo, marcado)}
                    />
                  </div>
                  {config?.({ ligada, toques: toques[f.metodo] || 0 })}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Secao>
  );
};

export default FormasNoCardapioSection;
