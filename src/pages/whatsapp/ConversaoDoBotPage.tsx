/**
 * Conversão do bot — quantas conversas viram pedido, e onde a venda parou.
 *
 * 28/09: o dono quis "usar IA para melhorar conversão". Medido: em 30 dias a
 * Cê Saladas teve 186 conversas, 10 pedidos pelo WhatsApp e 145 idas para
 * atendente — e nenhum desses números era tela. Esta é a régua de qualquer
 * agente novo: sem ela, cada mudança no bot é opinião.
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import {
  Badge,
  EmptyState,
  FalhaAoCarregar,
  KpiGrid,
  PageShell,
  PeriodChips,
  RankedList,
  Secao,
  Tabela,
  type ColunaDaTabela,
} from '../../components/ui';
import { conversaoDoBotService, type ConversaPerdida, type MotivoDaPerda } from '../../services/atendimentoBot';
import { useStore } from '../../hooks/useStore';
import { formatCurrency, formatPhone } from '../../utils/formatters';

const PERIODOS = [
  { value: '7', label: '7 dias' },
  { value: '30', label: '30 dias' },
  { value: '90', label: '90 dias' },
];

export const MOTIVO: Record<MotivoDaPerda, { rotulo: string; tone: 'warning' | 'danger' | 'info' | 'neutral' }> = {
  atendente: { rotulo: 'Foi para atendente', tone: 'info' },
  carrinho: { rotulo: 'Deixou o carrinho', tone: 'warning' },
  bot_falhou: { rotulo: 'O bot falhou', tone: 'danger' },
  so_perguntou: { rotulo: 'Só perguntou', tone: 'neutral' },
};

/** Motivos técnicos gravados pelo sistema, em palavras do lojista. */
export function motivoDeAtendente(bruto: string): string {
  const m = (bruto || '').trim();
  if (/^respondido pelo whatsapp do celular/i.test(m)) return 'Você respondeu pelo celular';
  if (/^respondido pelo painel/i.test(m)) return 'Você respondeu pelo painel';
  if (/synced from conversation mode switch/i.test(m)) return 'Trocado para humano no painel';
  if (/parada em modo humano/i.test(m)) return 'Estava parada em modo humano';
  if (/a ia não conseguiu responder/i.test(m)) return 'A IA não soube responder';
  if (/atendimento resolvido/i.test(m)) return 'Atendimento encerrado';
  if (/devolveu ao bot/i.test(m)) return 'Devolvida ao bot';
  return m || 'Sem motivo registrado';
}

const quando = (iso: string | null) => (iso ? new Date(iso).toLocaleString('pt-BR', {
  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
}) : '—');

export const ConversaoDoBotPage: React.FC = () => {
  const { storeId, storeSlug } = useStore();
  const [dias, setDias] = useState('30');
  const consulta = useQuery({
    queryKey: ['conversao-do-bot', storeSlug || storeId, dias],
    queryFn: () => conversaoDoBotService.buscar({ store: storeSlug || storeId || undefined, dias: Number(dias) }),
    enabled: !!(storeSlug || storeId),
  });
  const d = consulta.data;

  const colunas: ColunaDaTabela<ConversaPerdida>[] = [
    {
      chave: 'cliente',
      cabecalho: 'Cliente',
      render: (p) => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-fg-token">{p.nome || 'Sem nome'}</p>
          <p className="text-xs text-fg-muted-token">{formatPhone(p.telefone)}</p>
        </div>
      ),
    },
    {
      chave: 'mensagem',
      cabecalho: 'Última mensagem',
      render: (p) => <span className="whitespace-normal text-sm text-fg-token">{p.ultima_mensagem || '—'}</span>,
    },
    {
      chave: 'motivo',
      cabecalho: 'Onde parou',
      render: (p) => <Badge tone={MOTIVO[p.motivo].tone}>{MOTIVO[p.motivo].rotulo}</Badge>,
    },
    {
      chave: 'quando',
      cabecalho: 'Quando',
      soNoDesktop: true,
      render: (p) => <time className="text-sm text-fg-muted-token" dateTime={p.quando ?? undefined}>{quando(p.quando)}</time>,
    },
    {
      chave: 'abrir',
      cabecalho: '',
      alinhamento: 'direita',
      render: (p) => (
        <Link className="text-sm font-medium text-brand-ink hover:underline" to={`/inbox/whatsapp?conversa=${p.conversa_id}`}>
          Abrir conversa
        </Link>
      ),
    },
  ];

  return (
    <PageShell
      titulo="Conversão do bot"
      descricao="De cada conversa no WhatsApp, quantas viraram pedido, e onde as outras pararam. Mude o bot e veja aqui se melhorou."
      filtros={<PeriodChips options={PERIODOS} value={dias} onChange={setDias} ariaLabel="Período" />}
    >
      {consulta.isError ? (
        <FalhaAoCarregar titulo="Não consegui carregar a conversão." onTentarDeNovo={() => void consulta.refetch()} />
      ) : d && (
        <>
          <KpiGrid
            titulo={`Últimos ${d.dias} dias`}
            itens={[
              {
                label: 'Conversas',
                value: d.conversas,
                definicao: 'Clientes que mandaram mensagem no período.',
                serie: d.serie.map((p) => p.conversas),
              },
              {
                label: 'Viraram pedido',
                value: `${d.pedidos} (${d.taxa}%)`,
                definicao: `Pedidos feitos pelo WhatsApp. ${formatCurrency(Number(d.receita))} pagos.`,
                tone: d.taxa >= 20 ? 'success' : d.taxa >= 10 ? 'warning' : 'danger',
                serie: d.serie.map((p) => p.pedidos),
              },
              {
                label: 'Foram para atendente',
                value: d.para_atendente,
                definicao: 'Conversas que saíram do bot e foram para uma pessoa.',
                tone: d.conversas && d.para_atendente / d.conversas > 0.5 ? 'warning' : undefined,
              },
              {
                label: 'Carrinho parado',
                value: d.carrinho_parado,
                definicao: 'Escolheram item com o bot e não fecharam.',
                tone: d.carrinho_parado > 0 ? 'warning' : undefined,
              },
              {
                label: 'O bot falhou',
                value: d.bot_falhou,
                definicao: 'Clientes que receberam desculpa, erro ou resposta genérica. Ensine na tela "Ensinar o bot".',
                tone: d.bot_falhou > 0 ? 'danger' : 'success',
              },
            ]}
          />

          <Secao titulo="Por que foram para atendente" descricao="O motivo que o sistema registrou em cada transferência.">
            {d.motivos_de_atendente.length === 0 ? (
              <EmptyState titulo="Nenhuma transferência no período" />
            ) : (
              <RankedList
                medals={false}
                items={d.motivos_de_atendente.map((m) => ({
                  label: motivoDeAtendente(m.motivo),
                  value: m.vezes,
                  valueLabel: m.vezes === 1 ? '1 vez' : `${m.vezes} vezes`,
                }))}
              />
            )}
          </Secao>

          <Secao titulo="Onde a venda parou" contador={d.perdidas.length} descricao="As conversas mais recentes que não viraram pedido.">
            {d.perdidas.length === 0 ? (
              <EmptyState titulo="Todas as conversas viraram pedido" descricao="Nenhuma venda parada no período." />
            ) : (
              <Tabela itens={d.perdidas} colunas={colunas} chave={(p) => p.conversa_id} rotuloDaLinha={(p) => p.nome || p.telefone} />
            )}
          </Secao>
        </>
      )}
    </PageShell>
  );
};

export default ConversaoDoBotPage;
