/**
 * Escolher QUEM recebe a campanha.
 *
 * Antes desta tela o painel mandava `source: 'all'` fixo e a única audiência
 * possível era "todos" — uma lista crua de 500 telefones com checkbox, sem
 * dizer quem era cada um. Aqui o dono escolhe por intenção comercial ("trazer
 * de volta quem sumiu") e vê o tamanho da lista ANTES de montar a mensagem.
 *
 * A ORDEM DA TELA É DELIBERADA: atalho primeiro, filtro fino depois. Quem está
 * entre um pedido e outro clica no atalho; quem quer precisão abre os eixos.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { UserGroupIcon, ExclamationTriangleIcon, CheckIcon } from '@heroicons/react/24/outline';

import { Card, Button } from '../../../components/common';
import { campaignsService } from '../../../services/campaigns';
import type {
  FiltrosDeAudiencia,
  OpcoesDeAudiencia,
  RespostaDeAudiencia,
  SystemContact,
} from '../../../services/campaigns';
import logger from '../../../services/logger';
import {
  ATALHOS,
  ROTULO_FREQUENCIA,
  ROTULO_RECENCIA,
  atalhoAtivo,
  avisoDaAudiencia,
  conflitoNosFiltros,
  filtrosVazios,
} from './segmentosDeAudiencia';

interface Props {
  accountId?: string;
  /** Slug da loja aberta no painel. Sem ela o backend usa as lojas da conta,
   *  e produto/segmento passam a falar de outra loja. */
  storeSlug?: string;
  /** Chamado com os contatos escolhidos quando o dono confirma. */
  onUsarAudiencia: (contatos: SystemContact[]) => void;
}

const VAZIO: FiltrosDeAudiencia = {};

export const SeletorDeAudiencia: React.FC<Props> = ({ accountId, storeSlug, onUsarAudiencia }) => {
  const [filtros, setFiltros] = useState<FiltrosDeAudiencia>(VAZIO);
  const [opcoes, setOpcoes] = useState<OpcoesDeAudiencia | null>(null);
  const [previa, setPrevia] = useState<RespostaDeAudiencia | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [avancado, setAvancado] = useState(false);

  const conflito = useMemo(() => conflitoNosFiltros(filtros), [filtros]);
  const atalho = useMemo(() => atalhoAtivo(filtros), [filtros]);

  useEffect(() => {
    campaignsService
      .getOpcoesDeAudiencia({ store: storeSlug, account_id: accountId })
      .then(setOpcoes)
      .catch((e) => logger.error('Falha ao carregar opções de audiência', e));
  }, [storeSlug, accountId]);

  // Recarrega a prévia a cada mudança de filtro. O atraso existe porque o
  // dono arrasta o campo de valor: uma chamada por tecla digitada agregaria
  // pedidos inteiros no backend sem mudar nada na tela.
  useEffect(() => {
    if (conflito) {
      setPrevia(null);
      return;
    }
    let cancelado = false;
    const t = setTimeout(() => {
      setCarregando(true);
      campaignsService
        .getSystemContacts({ account_id: accountId, store: storeSlug, limit: 500, ...filtros })
        .then((r) => {
          if (!cancelado) setPrevia(r);
        })
        .catch((e) => {
          logger.error('Falha ao carregar audiência', e);
          if (!cancelado) setPrevia(null);
        })
        .finally(() => {
          if (!cancelado) setCarregando(false);
        });
    }, 350);
    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, [filtros, accountId, storeSlug, conflito]);

  const alternar = useCallback(
    <K extends 'recencia' | 'frequencia' | 'bairros' | 'produtos'>(
      chave: K,
      valor: string,
    ) => {
      setFiltros((atual) => {
        const lista = (atual[chave] ?? []) as string[];
        const nova = lista.includes(valor)
          ? lista.filter((v) => v !== valor)
          : [...lista, valor];
        return { ...atual, [chave]: nova.length ? nova : undefined } as FiltrosDeAudiencia;
      });
    },
    [],
  );

  const total = previa?.total ?? 0;
  const aviso = previa ? avisoDaAudiencia(total, previa.excluidos_por_optout) : null;

  const contagemPorValor = (eixo: 'recencia' | 'frequencia', valor: string) =>
    previa?.resumo?.[eixo]?.find((b) => b.valor === valor)?.total ?? 0;

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium text-fg-token flex items-center gap-2">
            <UserGroupIcon className="w-5 h-5" aria-hidden="true" />
            Quem vai receber
          </h3>
          <p className="text-sm text-fg-muted-token mt-0.5">
            {previa?.descricao ?? 'Todos os contatos'}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div
            className="text-2xl font-semibold text-fg-token tabular-nums"
            aria-live="polite"
          >
            {carregando ? '…' : total}
          </div>
          <div className="text-badge text-fg-muted-token">
            {total === 1 ? 'pessoa' : 'pessoas'}
          </div>
        </div>
      </div>

      {/* Atalhos: a campanha que o dono realmente quer fazer, com nome. */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFiltros(VAZIO)}
          aria-pressed={filtrosVazios(filtros)}
          className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
            filtrosVazios(filtros)
              ? 'bg-brand-ink text-white border-transparent'
              : 'border-border-token text-fg-token hover:bg-surface-2'
          }`}
        >
          Todos
        </button>
        {ATALHOS.map((a) => (
          <button
            key={a.chave}
            type="button"
            onClick={() => setFiltros(a.filtros)}
            aria-pressed={atalho === a.chave}
            title={a.porque}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              atalho === a.chave
                ? 'bg-brand-ink text-white border-transparent'
                : 'border-border-token text-fg-token hover:bg-surface-2'
            }`}
          >
            {a.nome}
          </button>
        ))}
      </div>

      {atalho && (
        <p className="text-sm text-fg-muted-token">
          {ATALHOS.find((a) => a.chave === atalho)?.porque}
        </p>
      )}

      <button
        type="button"
        onClick={() => setAvancado((v) => !v)}
        className="text-sm text-brand-ink hover:underline"
        aria-expanded={avancado}
      >
        {avancado ? 'Esconder filtros detalhados' : 'Filtrar com mais detalhe'}
      </button>

      {avancado && (
        <div className="space-y-4 border-t border-border-token pt-4">
          <Eixo
            titulo="Quando comprou pela última vez"
            valores={(['ativo', 'em_risco', 'inativo', 'nunca_comprou'] as const).map((v) => ({
              valor: v,
              rotulo: ROTULO_RECENCIA[v],
              total: contagemPorValor('recencia', v),
            }))}
            selecionados={filtros.recencia ?? []}
            onAlternar={(v) => alternar('recencia', v)}
          />

          <Eixo
            titulo="Quantas vezes já comprou"
            valores={(['novo', 'ocasional', 'vip'] as const).map((v) => ({
              valor: v,
              rotulo: ROTULO_FREQUENCIA[v],
              total: contagemPorValor('frequencia', v),
            }))}
            selecionados={filtros.frequencia ?? []}
            onAlternar={(v) => alternar('frequencia', v)}
          />

          {!!opcoes?.bairros.length && (
            <Eixo
              titulo="Bairro de entrega"
              // Só bairros com pedido de verdade. Oferecer o resto devolveria
              // zero contatos e pareceria defeito.
              valores={opcoes.bairros.slice(0, 12).map((b) => ({
                valor: b.nome,
                rotulo: b.nome,
                total: b.clientes,
              }))}
              selecionados={filtros.bairros ?? []}
              onAlternar={(v) => alternar('bairros', v)}
            />
          )}

          <div>
            <p className="text-sm font-medium text-fg-token mb-2">Ticket médio (R$)</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                aria-label="Ticket médio mínimo"
                placeholder="mínimo"
                value={filtros.ticket_min ?? ''}
                onChange={(e) =>
                  setFiltros((f) => ({
                    ...f,
                    ticket_min: e.target.value === '' ? undefined : Number(e.target.value),
                  }))
                }
                className="w-28 px-3 py-2 border border-border-token rounded-lg bg-surface dark:bg-[var(--dark-bg-hover,#161616)] text-fg-token"
              />
              <span className="text-fg-muted-token">até</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                aria-label="Ticket médio máximo"
                placeholder="máximo"
                value={filtros.ticket_max ?? ''}
                onChange={(e) =>
                  setFiltros((f) => ({
                    ...f,
                    ticket_max: e.target.value === '' ? undefined : Number(e.target.value),
                  }))
                }
                className="w-28 px-3 py-2 border border-border-token rounded-lg bg-surface dark:bg-[var(--dark-bg-hover,#161616)] text-fg-token"
              />
            </div>
          </div>

          {!!opcoes?.produtos.length && (
            <div>
              <p className="text-sm font-medium text-fg-token mb-2">
                Já pediu algum destes produtos
              </p>
              <select
                multiple
                aria-label="Produtos já pedidos"
                value={filtros.produtos ?? []}
                onChange={(e) =>
                  setFiltros((f) => ({
                    ...f,
                    produtos: Array.from(e.target.selectedOptions, (o) => o.value),
                  }))
                }
                className="w-full h-32 px-3 py-2 border border-border-token rounded-lg bg-surface dark:bg-[var(--dark-bg-hover,#161616)] text-fg-token"
              >
                {opcoes.produtos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Conflito vem antes do aviso: uma combinação impossível explica a lista
          vazia melhor do que "afrouxe os filtros". */}
      {conflito && (
        <p
          role="alert"
          className="text-sm text-red-600 dark:text-red-400 flex items-start gap-1.5"
        >
          <ExclamationTriangleIcon className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
          {conflito}
        </p>
      )}

      {!conflito && aviso && (
        <p
          role={aviso.tom === 'ok' ? undefined : 'alert'}
          className={`text-sm flex items-start gap-1.5 ${
            aviso.tom === 'vazio'
              ? 'text-red-600 dark:text-red-400'
              : aviso.tom === 'pequena'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-fg-muted-token'
          }`}
        >
          {aviso.tom === 'ok' ? (
            <CheckIcon className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
          ) : (
            <ExclamationTriangleIcon className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
          )}
          {aviso.texto}
        </p>
      )}

      <div className="flex justify-end">
        <Button
          onClick={() => onUsarAudiencia(previa?.results ?? [])}
          disabled={!!conflito || carregando || total === 0}
        >
          Usar estes {total} contatos
        </Button>
      </div>
    </Card>
  );
};

interface EixoProps {
  titulo: string;
  valores: { valor: string; rotulo: string; total: number }[];
  selecionados: string[];
  onAlternar: (valor: string) => void;
}

/** Um eixo de filtro com a contagem de cada balde ao lado do rótulo.
 *
 *  A contagem é o que evita escolher no escuro: sem ela o dono marca
 *  "inativos" e só descobre que são 3 pessoas depois de montar a campanha. */
const Eixo: React.FC<EixoProps> = ({ titulo, valores, selecionados, onAlternar }) => (
  <div>
    <p className="text-sm font-medium text-fg-token mb-2">{titulo}</p>
    <div className="flex flex-wrap gap-2">
      {valores.map((v) => {
        const ativo = selecionados.includes(v.valor);
        return (
          <button
            key={v.valor}
            type="button"
            onClick={() => onAlternar(v.valor)}
            aria-pressed={ativo}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              ativo
                ? 'bg-brand-ink text-white border-transparent'
                : 'border-border-token text-fg-token hover:bg-surface-2'
            }`}
          >
            {v.rotulo}
            <span className={`ml-1.5 tabular-nums ${ativo ? 'opacity-80' : 'text-fg-muted-token'}`}>
              {v.total}
            </span>
          </button>
        );
      })}
    </div>
  </div>
);

export default SeletorDeAudiencia;
