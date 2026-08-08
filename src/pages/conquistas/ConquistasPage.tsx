/**
 * Metas e Conquistas — o progresso da loja, contado como progresso.
 *
 * O painel media só o presente: quanto vendi hoje, quanto vendi no mês. Faltava
 * a leitura de trajetória — de onde a loja saiu e para onde está indo. É a
 * pergunta que segura o dono no produto num mês fraco, e nenhum número
 * isolado responde.
 *
 * A hierarquia da página segue a ordem em que se pergunta:
 *
 *   1. onde estou            (mês, meta anual, crescimento)
 *   2. o que vem a seguir    (próxima conquista, com prazo)
 *   3. de onde eu vim        (linha do tempo)
 *
 * A próxima conquista vem ANTES da linha do tempo de propósito: passado é
 * recompensa, futuro é motivo. Quem abre a tela quer saber quanto falta.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrophyIcon,
  FlagIcon,
  ArrowTrendingUpIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

import { PageShell, KpiGrid, Card, EmptyState } from '../../components/ui';
import { Loading } from '../../components/common';
import { useStore } from '../../hooks';
import { getConquistas, type Conquista } from '../../services/conquistas';

const brl = (v: string | number | null | undefined) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v ?? 0));

const dataCurta = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

/** Barra de progresso com o número em texto ao lado — cor não é medida. */
const Progresso: React.FC<{ pct: number; rotulo: string }> = ({ pct, rotulo }) => (
  <div className="flex items-center gap-3">
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={rotulo}
      className="h-2 min-w-0 flex-1 overflow-hidden rounded-pill bg-surface-2"
    >
      <div
        className="h-full rounded-pill bg-brand transition-[width] duration-500"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%`, transitionTimingFunction: 'var(--mola)' }}
      />
    </div>
    <span className="shrink-0 text-body font-bold tabular-nums text-brand-ink">
      {Math.round(pct)}%
    </span>
  </div>
);

const LinhaDoTempo: React.FC<{ itens: Conquista[] }> = ({ itens }) => (
  <ol className="relative space-y-5 border-l border-border-token pl-6">
    {itens.map((c) => (
      <li key={c.chave} className="relative">
        {/* O marco na linha. `-left-[31px]` alinha o centro do círculo sobre a
            linha de 1px, contando a borda de 2px e o padding de 24px. */}
        <span
          aria-hidden
          className="absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-pill border-2 border-brand bg-surface"
        >
          <span className="h-1.5 w-1.5 rounded-pill bg-brand" />
        </span>

        <p className="text-body font-semibold text-fg-token">{c.titulo}</p>
        <p className="text-caption text-fg-muted-token">{dataCurta(c.alcancado_em)}</p>
        <p className="mt-1 text-caption text-fg-muted-token">{c.descricao}</p>
        <p className="mt-1 text-caption text-fg-muted-token">
          Faturamento no marco:{' '}
          <span className="font-semibold tabular-nums text-fg-token">
            {brl(c.faturamento_no_marco)}
          </span>
        </p>
      </li>
    ))}
  </ol>
);

export const ConquistasPage: React.FC = () => {
  const { storeSlug, storeId } = useStore();
  const slug = storeSlug || storeId || '';

  const { data, isLoading, isError } = useQuery({
    queryKey: ['conquistas', slug],
    queryFn: () => getConquistas(slug),
    enabled: !!slug,
  });

  if (isLoading) return <Loading />;

  if (isError || !data) {
    return (
      <PageShell titulo="Metas e Conquistas">
        <EmptyState
          titulo="Não foi possível carregar suas conquistas"
          descricao="Tente novamente em instantes. Seu faturamento não foi afetado."
        />
      </PageShell>
    );
  }

  const { resumo, proxima, conquistas } = data;
  const meta = resumo.meta_anual;

  return (
    <PageShell
      trilha={[{ rotulo: 'Relatórios' }, { rotulo: 'Metas e Conquistas' }]}
      titulo="Metas e Conquistas"
      descricao="De onde sua loja saiu e para onde está indo. Cada marco é calculado do seu histórico real de vendas."
    >
      <KpiGrid
        itens={[
          {
            label: 'Faturamento do mês',
            value: brl(resumo.mes_atual),
            definicao: 'Pedidos pagos e não cancelados no mês corrente.',
            icone: <BanknotesIcon />,
            tone: 'brand',
            comparativo:
              resumo.crescimento_mensal_pct !== null
                ? { variacaoPct: resumo.crescimento_mensal_pct, rotulo: 'vs mês anterior' }
                : { variacaoPct: null, rotulo: '' },
          },
          {
            label: 'Meta anual',
            // Sem ano anterior não há base para uma meta honesta — a tela diz
            // isso em vez de inventar um alvo que ninguém definiu.
            value: meta.alvo ? `${Math.round(meta.progresso_pct ?? 0)}%` : 'Sem base',
            definicao: meta.alvo
              ? `${brl(meta.realizado)} de ${brl(meta.alvo)} — ${meta.crescimento_pct}% sobre ${meta.ano - 1}.`
              : `Sem faturamento em ${meta.ano - 1} para calcular uma meta.`,
            icone: <FlagIcon />,
          },
          {
            label: 'Crescimento mensal',
            value:
              resumo.crescimento_mensal_pct !== null
                ? `${resumo.crescimento_mensal_pct > 0 ? '+' : ''}${resumo.crescimento_mensal_pct}%`
                : 'Sem base',
            definicao: `${brl(resumo.mes_atual)} contra ${brl(resumo.mes_anterior)} no mês anterior.`,
            icone: <ArrowTrendingUpIcon />,
          },
          {
            label: 'Faturamento do ano',
            value: brl(resumo.ano_atual),
            definicao: `Acumulado de ${meta.ano}, do dia 1º de janeiro até hoje.`,
            icone: <CalendarDaysIcon />,
          },
        ]}
      />

      {/* PRÓXIMA CONQUISTA antes da linha do tempo: passado é recompensa,
          futuro é motivo. Quem abre a tela quer saber quanto falta. */}
      {proxima && (
        <Card className="p-6">
          <p className="overline flex items-center gap-1.5">
            <SparklesIcon className="h-4 w-4 text-brand-ink" aria-hidden />
            Próxima conquista
          </p>
          <h2 className="mt-1.5 text-xl font-bold tracking-tight text-fg-token">
            {proxima.titulo}
          </h2>
          <p className="mt-0.5 text-body text-fg-muted-token">{proxima.descricao}</p>

          <div className="mt-4 space-y-2">
            <Progresso pct={proxima.progresso_pct} rotulo={`Progresso até ${proxima.titulo}`} />
            <p className="text-caption text-fg-muted-token">
              {brl(proxima.acumulado)}
              {proxima.valor ? ` de ${brl(proxima.valor)}` : ''}
              {proxima.falta ? ` · faltam ${brl(proxima.falta)}` : ''}
            </p>
          </div>

          <p className="mt-3 text-caption text-fg-muted-token">
            {proxima.prazo_estimado ? (
              <>
                No ritmo dos últimos 30 dias, você chega lá em{' '}
                <span className="font-semibold text-fg-token">
                  {dataCurta(proxima.prazo_estimado)}
                </span>
                .
              </>
            ) : (
              // Loja parada não ganha data: o dono planeja em cima da
              // estimativa, e um chute vira compromisso falso.
              'Sem vendas nos últimos 30 dias, não dá para estimar quando você chega lá.'
            )}
          </p>
        </Card>
      )}

      <Card
        title="Suas conquistas"
        subtitle="Calculadas do seu histórico real. Se um pedido é cancelado, o marco que dependia dele desaparece junto."
      >
        {conquistas.length === 0 ? (
          <EmptyState
            variante="ativacao"
            estado="Nenhuma conquista ainda"
            titulo="Sua primeira venda é a primeira conquista."
            descricao="Assim que o primeiro pedido for pago, ele aparece aqui — e os marcos de faturamento começam a contar sozinhos."
            beneficios={[
              {
                titulo: 'Nada para configurar',
                descricao: 'Os marcos saem do seu faturamento, sem cadastro.',
              },
              {
                titulo: 'Meta anual automática',
                descricao: 'A partir do segundo ano, com crescimento sobre o anterior.',
              },
              {
                titulo: 'Prazo estimado',
                descricao: 'Quanto falta e quando você chega, no seu ritmo real.',
              },
              {
                titulo: 'Sempre verdadeiro',
                descricao: 'Pedido cancelado desfaz o marco — nunca fica número inflado.',
              },
            ]}
          />
        ) : (
          <LinhaDoTempo itens={conquistas} />
        )}
      </Card>

      {conquistas.length > 0 && (
        <p className="flex items-center gap-1.5 text-caption text-fg-muted-token">
          <TrophyIcon className="h-4 w-4" aria-hidden />
          {conquistas.length} conquista{conquistas.length > 1 ? 's' : ''} até aqui.
        </p>
      )}
    </PageShell>
  );
};

export default ConquistasPage;
