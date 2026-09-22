/**
 * Recuperador de vendas — quanto ficou no carrinho e quanto voltou.
 *
 * Os lembretes de carrinho rodam desde sempre e NINGUÉM via o resultado. Sem
 * estes números a loja não sabe se o recurso paga o incômodo, e o recurso vira
 * candidato a ser desligado por engano.
 *
 * "Oportunidade perdida" é o número que faz o dono agir: é o dinheiro que
 * ficou na mesa este mês. Por isso ele vem primeiro e em destaque, não no fim
 * de uma fileira de indicadores iguais.
 */
import React, { useCallback, useEffect, useState } from 'react';

import { EmptyState, KpiGrid, PageShell } from '../../../components/ui';
import { useStore } from '../../../hooks/useStore';
import { recuperacaoService, type PainelDeRecuperacao } from '../../../services/recuperacao';
import { formatCurrency } from '../../../utils/formatters';

const PERIODOS = [
  { dias: 7, rotulo: '7 dias' },
  { dias: 30, rotulo: '30 dias' },
  { dias: 90, rotulo: '90 dias' },
];

export const RecuperacaoPage: React.FC = () => {
  const { store } = useStore();
  const slug = (store as { slug?: string } | null)?.slug;
  const [dias, setDias] = useState(30);
  const [dados, setDados] = useState<PainelDeRecuperacao | null>(null);
  const [erro, setErro] = useState(false);

  const carregar = useCallback(async () => {
    if (!slug) return;
    try {
      setDados(await recuperacaoService.painel(slug, dias));
      setErro(false);
    } catch {
      // Falha de carga não pode virar "nada aconteceu": o dono desligaria um
      // recurso que está funcionando.
      setErro(true);
    }
  }, [slug, dias]);

  useEffect(() => { void carregar(); }, [carregar]);

  const indicadores = dados ? [
    {
      label: 'Oportunidade perdida',
      value: formatCurrency(dados.oportunidade_perdida),
      definicao: 'O que estava nos carrinhos abandonados e não virou pedido no período.',
      tone: dados.oportunidade_perdida > 0 ? ('danger' as const) : undefined,
    },
    {
      label: 'Carrinhos abandonados',
      value: dados.abandonados,
      definicao: `Carrinhos que receberam lembrete. Ticket médio de ${formatCurrency(dados.ticket_medio)}.`,
    },
    {
      label: 'Voltaram e compraram',
      value: dados.recuperados,
      definicao: `${dados.taxa_de_recuperacao}% dos abandonados fizeram pedido depois do lembrete.`,
      tone: 'success' as const,
    },
    {
      label: 'Valor recuperado',
      value: formatCurrency(dados.valor_recuperado),
      definicao: 'O que essas pessoas gastaram no pedido que veio depois.',
      tone: 'success' as const,
    },
  ] : [];

  return (
    <PageShell
      titulo="Recuperador de vendas"
      descricao="Quem encheu o carrinho e não finalizou — e quanto disso voltou depois do lembrete."
      filtros={(
        <div className="flex flex-wrap gap-2">
          {PERIODOS.map((p) => (
            <button
              key={p.dias}
              type="button"
              aria-pressed={dias === p.dias}
              onClick={() => setDias(p.dias)}
              className={`rounded-full border px-3 py-1.5 text-caption font-semibold transition-colors ${
                dias === p.dias
                  ? 'border-transparent bg-brand text-on-brand'
                  : 'border-border-token text-fg-token hover:bg-surface-muted-token'
              }`}
            >
              {p.rotulo}
            </button>
          ))}
        </div>
      )}
    >
      {erro ? (
        <p role="alert" className="superficie p-4 text-body text-danger-token">
          Não foi possível carregar o recuperador agora.
        </p>
      ) : !dados ? (
        <p className="text-body text-fg-muted-token">Carregando…</p>
      ) : dados.abandonados === 0 ? (
        <EmptyState
          titulo="Nenhum carrinho abandonado no período"
          descricao="Quando alguém montar o carrinho e não finalizar, o lembrete sai sozinho e o resultado aparece aqui."
        />
      ) : (
        <div className="flex flex-col gap-4">
          <KpiGrid itens={indicadores} />

          {/* O número que explica todos os outros. Sem ele, taxa de
              recuperação baixa parece fracasso do texto do lembrete — quando
              o lembrete nem chegou a sair. */}
          {dados.sem_telefone > 0 && (
            <p className="superficie border-warning-token/40 p-4 text-body text-fg-token">
              <strong>{dados.sem_telefone}</strong>{' '}
              {dados.sem_telefone === 1
                ? 'carrinho ficou sem telefone'
                : 'carrinhos ficaram sem telefone'} — não há para onde mandar o
              lembrete. Acontece quando a pessoa monta o carrinho e sai antes de
              se identificar no checkout.
            </p>
          )}

          <p className="superficie p-4 text-body text-fg-token">
            No período, <strong>{dados.mensagens_enviadas}</strong>{' '}
            {dados.mensagens_enviadas === 1 ? 'lembrete saiu' : 'lembretes saíram'} pelo WhatsApp.
            {dados.recuperados > 0 ? (
              <> Deles, <strong>{dados.recuperados}</strong>{' '}
                {dados.recuperados === 1 ? 'pessoa voltou' : 'pessoas voltaram'} e
                {' '}{dados.recuperados === 1 ? 'gastou' : 'gastaram'}{' '}
                <strong>{formatCurrency(dados.valor_recuperado)}</strong>.</>
            ) : (
              <> Ninguém voltou a comprar ainda — vale rever o texto do lembrete.</>
            )}
          </p>
        </div>
      )}
    </PageShell>
  );
};

export default RecuperacaoPage;
