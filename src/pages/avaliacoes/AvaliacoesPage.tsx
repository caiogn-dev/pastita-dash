/**
 * Avaliações — o que o cliente achou, prato por prato.
 *
 * Decisão do dono (21/09): a nota da LOJA é número de vitrine; o que muda
 * decisão é saber QUAL prato decepcionou. Por isso o ranking de produtos vem
 * antes da lista.
 *
 * E o formulário da casa só recebe 3 estrelas ou menos — de 4 para cima o
 * cliente vai para o Google. Então tudo que chega aqui tem, por construção,
 * alguma coisa a consertar. A tela trata isso como pauta, não como placar.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StarIcon } from '@heroicons/react/24/solid';

import { EmptyState, PageShell } from '../../components/ui';
import { useStore } from '../../hooks/useStore';
import { getAnalyticsReport } from '../../services/reports';
import { avaliacoesService, type Avaliacao } from '../../services/avaliacoes';
import { leituraDeAvaliacoes, type ResumoDeAvaliacoes } from '../dashboard/leituraDeAvaliacoes';

const NOTAS = [5, 4, 3, 2, 1];

const quando = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });

// Nota com uma casa, como o resto do painel escreve nota (ver DashboardPage).
// `toLocaleString` com FractionDigits é a assinatura de formatação de DINHEIRO,
// que tem fonte única — e nota não é dinheiro.
const numero = (n: number) => n.toFixed(1).replace('.', ',');

const Estrelas: React.FC<{ nota: number }> = ({ nota }) => (
  <span className="inline-flex items-center gap-0.5" aria-label={`${nota} de 5`}>
    {[1, 2, 3, 4, 5].map((i) => (
      <StarIcon
        key={i}
        className={`h-4 w-4 ${i <= nota ? 'text-warning-token' : 'text-border-token'}`}
        aria-hidden
      />
    ))}
  </span>
);

const LinhaDaAvaliacao: React.FC<{ avaliacao: Avaliacao }> = ({ avaliacao }) => {
  const pratos = (avaliacao.items || []).filter((i) => i.product_name);
  return (
    <li className="flex flex-col gap-2 border-b border-border-token px-5 py-4 last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Estrelas nota={avaliacao.rating} />
        <span className="font-semibold text-fg-token">{avaliacao.customer_name || 'Cliente'}</span>
        {avaliacao.order_number && (
          <span className="text-caption text-fg-muted-token">pedido {avaliacao.order_number}</span>
        )}
        <time className="ml-auto text-caption text-fg-muted-token" dateTime={avaliacao.created_at}>
          {quando(avaliacao.created_at)}
        </time>
      </div>

      {avaliacao.comment ? (
        <p className="text-body text-fg-token">{avaliacao.comment}</p>
      ) : (
        <p className="text-caption text-fg-muted-token">
          Só deu a nota e não escreveu nada.
        </p>
      )}

      {!!pratos.length && (
        <ul className="flex flex-wrap gap-2">
          {pratos.map((prato, i) => (
            <li
              key={i}
              className="inline-flex items-center gap-1 rounded-full border border-border-token px-2.5 py-1 text-caption text-fg-token"
            >
              {prato.product_name}
              <strong className={prato.rating <= 3 ? 'text-danger-token' : 'text-success-token'}>
                {prato.rating}★
              </strong>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
};

export const AvaliacoesPage: React.FC = () => {
  const { store } = useStore();
  const slug = (store as { slug?: string } | null)?.slug;
  const [nota, setNota] = useState<number | undefined>();
  const [lista, setLista] = useState<Avaliacao[] | null>(null);
  const [resumo, setResumo] = useState<ResumoDeAvaliacoes | null>(null);
  const [erro, setErro] = useState(false);

  const carregar = useCallback(async () => {
    if (!slug) return;
    try {
      const [avaliacoes, relatorio] = await Promise.all([
        avaliacoesService.listar(slug, nota),
        getAnalyticsReport<ResumoDeAvaliacoes>('reviews'),
      ]);
      setLista(avaliacoes);
      setResumo(relatorio);
      setErro(false);
    } catch {
      setErro(true);
    }
  }, [slug, nota]);

  useEffect(() => { void carregar(); }, [carregar]);

  const leitura = useMemo(() => leituraDeAvaliacoes(resumo ?? undefined), [resumo]);

  // Piores primeiro — o backend já devolve nessa ordem, e é o diagnóstico.
  const pratos = (resumo?.by_product || []).slice(0, 6);
  const piorPilar = leitura.piorPilar;

  return (
    <PageShell
      titulo="Avaliações"
      descricao="O que o cliente achou, prato por prato. Quem dá 4 ou 5 estrelas vai para o Google; o que chega aqui é o que tem conserto."
      filtros={(
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={nota === undefined}
            onClick={() => setNota(undefined)}
            className={`rounded-full border px-3 py-1.5 text-caption font-semibold transition-colors ${
              nota === undefined
                ? 'border-transparent bg-brand text-on-brand'
                : 'border-border-token text-fg-token hover:bg-surface-muted-token'
            }`}
          >
            Todas
          </button>
          {NOTAS.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={nota === n}
              onClick={() => setNota(n)}
              className={`rounded-full border px-3 py-1.5 text-caption font-semibold transition-colors ${
                nota === n
                  ? 'border-transparent bg-brand text-on-brand'
                  : 'border-border-token text-fg-token hover:bg-surface-muted-token'
              }`}
            >
              {n} {n === 1 ? 'estrela' : 'estrelas'}
            </button>
          ))}
        </div>
      )}
    >
      {erro ? (
        <p role="alert" className="superficie p-4 text-body text-danger-token">
          Não foi possível carregar as avaliações agora.
        </p>
      ) : lista === null ? (
        <p className="text-body text-fg-muted-token">Carregando…</p>
      ) : (
        <div className="flex flex-col gap-4">
          {/* PRATO primeiro. "Nota 4,9" não diz o que fazer; "Salada Camarão
              2,5 em 4 avaliações" diz. */}
          {!!pratos.length && (
            <section className="superficie p-5">
              <h2 className="text-body font-semibold text-fg-token">Como cada prato foi avaliado</h2>
              <p className="mt-0.5 text-caption text-fg-muted-token">
                Do pior para o melhor — é onde dá para agir.
              </p>
              <ul className="mt-4 flex flex-col gap-2">
                {pratos.map((p) => (
                  <li key={p.product_name} className="flex items-center gap-3">
                    <span className="min-w-0 flex-1 truncate text-body text-fg-token">{p.product_name}</span>
                    <span className="h-1.5 w-28 overflow-hidden rounded-pill bg-surface-muted-token">
                      <span
                        className={`block h-full ${p.avg_rating < 4 ? 'bg-danger-token' : 'bg-success-token'}`}
                        style={{ width: `${(p.avg_rating / 5) * 100}%` }}
                      />
                    </span>
                    <strong
                      className={`w-10 text-right text-body tabular-nums ${
                        p.avg_rating < 4 ? 'text-danger-token' : 'text-fg-token'
                      }`}
                    >
                      {numero(p.avg_rating)}
                    </strong>
                    <span className="w-28 text-caption text-fg-muted-token">
                      {p.count} {p.count === 1 ? 'avaliação' : 'avaliações'}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {piorPilar?.media != null && (
            <p className="superficie p-4 text-body text-fg-token">
              O ponto mais fraco é <strong>{piorPilar.rotulo}</strong>, com{' '}
              {numero(piorPilar.media)} em {piorPilar.total}{' '}
              {piorPilar.total === 1 ? 'resposta' : 'respostas'}.
            </p>
          )}

          {lista.length === 0 ? (
            <EmptyState
              titulo={nota ? 'Nenhuma avaliação com essa nota' : 'Nenhuma avaliação ainda'}
              descricao="O convite sai sozinho depois da entrega. Quem dá 4 ou 5 estrelas é levado ao Google; de 3 para baixo, o cliente conta aqui o que houve."
            />
          ) : (
            <ul className="superficie">
              {lista.map((a) => <LinhaDaAvaliacao key={a.id} avaliacao={a} />)}
            </ul>
          )}
        </div>
      )}
    </PageShell>
  );
};

export default AvaliacoesPage;
