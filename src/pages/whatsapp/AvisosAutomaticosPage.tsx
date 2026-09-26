/**
 * Avisos automáticos — o que a loja mandou sozinha, para quem e se chegou.
 *
 * Até 19/09/2026 não havia onde ver isso: "Mensagens automáticas" só edita os
 * textos, e lembretes de PIX/carrinho nem eram gravados. Nos 30 dias medidos,
 * 1 em cada 4 avisos de status falhou (janela de 24 h do WhatsApp) sem que o
 * dono soubesse.
 *
 * A tela usa `estadoDaLista` (carregando/falhou/vazio/lista) em vez de decidir
 * à mão: assim a carga inicial mostra "carregando" — não um "nenhum aviso"
 * confiante — e, ao trocar de loja, o cache é derrubado antes da nova busca
 * voltar, para que os avisos (nomes de clientes, texto das mensagens) de uma
 * loja nunca pisquem na tela de outra.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  conversationsService,
  type AvisoAutomatico,
  type AvisosAutomaticos,
  type ResumoDeAvisos,
} from '../../services/conversations';
import { useStore } from '../../hooks/useStore';
import { EmptyState, PageShell } from '../../components/ui';
import { Loading } from '../../components/common';
import { estadoDaLista } from '../../utils/estadoDaLista';

const PERIODOS = [
  { dias: 1, rotulo: 'Hoje e ontem' },
  { dias: 7, rotulo: 'Últimos 7 dias' },
  { dias: 30, rotulo: 'Últimos 30 dias' },
];

const SITUACAO: Record<string, { rotulo: string; classe: string }> = {
  read: { rotulo: 'Lida', classe: 'text-success-token' },
  delivered: { rotulo: 'Entregue', classe: 'text-success-token' },
  sent: { rotulo: 'Enviada', classe: 'text-fg-muted-token' },
  pending: { rotulo: 'Enviando', classe: 'text-fg-muted-token' },
  failed: { rotulo: 'Não chegou', classe: 'text-danger-token' },
};

const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', {
  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
});

const falhas = (n: number) => (n === 1 ? '1 falhou' : `${n} falharam`);

interface FiltroProps {
  resumo: ResumoDeAvisos;
  ativo: boolean;
  onClick: () => void;
}

const FiltroDeTipo: React.FC<FiltroProps> = ({ resumo, ativo, onClick }) => (
  <button
    type="button"
    aria-pressed={ativo}
    onClick={onClick}
    className={`rounded-xl border px-4 py-3 text-left transition-colors ${
      ativo ? 'border-brand bg-brand/10' : 'border-border-token bg-surface-token hover:bg-surface-muted-token'
    }`}
  >
    <span className="block text-xs text-fg-muted-token">{resumo.rotulo}</span>
    <span className="block text-lg font-semibold text-fg-token">{resumo.total}</span>
    {resumo.falharam > 0 && (
      <span className="block text-xs text-danger-token">{falhas(resumo.falharam)}</span>
    )}
  </button>
);

const LinhaDoAviso: React.FC<{ aviso: AvisoAutomatico }> = ({ aviso }) => {
  const situacao = SITUACAO[aviso.status] ?? { rotulo: aviso.status, classe: 'text-fg-muted-token' };
  return (
    <li className="flex flex-wrap items-start gap-4 px-5 py-4 border-b border-border-token last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-semibold text-fg-token">{aviso.cliente}</span>
          <span className="text-xs text-fg-muted-token">{aviso.rotulo}</span>
          <time className="text-xs text-fg-muted-token" dateTime={aviso.quando}>{quando(aviso.quando)}</time>
        </div>
        <p className="mt-1 text-sm text-fg-token line-clamp-2">{aviso.texto}</p>
        {aviso.erro && (
          <p className="mt-1 text-xs text-danger-token" title={aviso.erro_tecnico || undefined}>{aviso.erro}</p>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className={`text-xs font-semibold ${situacao.classe}`}>{situacao.rotulo}</span>
        {aviso.conversa_id && (
          <Link
            to={`/inbox/whatsapp?conversation=${aviso.conversa_id}`}
            aria-label={`Abrir conversa com ${aviso.cliente}`}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold border border-border-token text-fg-token hover:bg-surface-muted-token"
          >
            Abrir conversa
          </Link>
        )}
      </div>
    </li>
  );
};

export const AvisosAutomaticosPage: React.FC = () => {
  const { storeSlug } = useStore();
  const [dias, setDias] = useState(7);
  const [tipo, setTipo] = useState<string | undefined>(undefined);
  const [dados, setDados] = useState<AvisosAutomaticos | null>(null);
  const [buscando, setBuscando] = useState(true);
  const [erro, setErro] = useState(false);

  const carregar = useCallback(async () => {
    setBuscando(true);
    setErro(false);
    try {
      setDados(await conversationsService.getMensagensAutomaticas({
        store: storeSlug || undefined, dias, tipo,
      }));
    } catch {
      // Falha não pode virar "nenhum aviso enviado".
      setErro(true);
    } finally {
      setBuscando(false);
    }
  }, [storeSlug, dias, tipo]);

  // Trocar de loja derruba o cache ANTES da nova busca voltar: os avisos da loja
  // anterior (nomes de clientes, texto das mensagens) não podem piscar na tela
  // da loja recém-selecionada. O período/tipo NÃO zeram — mudança dentro da
  // mesma loja mantém a lista enquanto atualiza (sem flicker).
  useEffect(() => {
    setDados(null);
    setBuscando(true);
    setErro(false);
  }, [storeSlug]);

  useEffect(() => { carregar(); }, [carregar]);

  const resumo = dados?.resumo ?? [];
  const itens = dados?.itens ?? [];

  // A escolha carregando/falhou/vazio/lista mora em `estadoDaLista` — não
  // reescrever `erro && length === 0` aqui (ver CLAUDE.md: vazio enganoso).
  const estado = estadoDaLista({
    temDados: dados !== null,
    buscando,
    falhou: erro,
    quantidade: resumo.length,
  });

  return (
    <PageShell
      titulo="Avisos automáticos"
      descricao="O que a loja mandou sozinha no WhatsApp — status do pedido, lembretes, avaliação — e se chegou ao cliente. Os textos se editam em Automação › Mensagens automáticas."
      filtros={(
        <label className="inline-flex items-center gap-2 text-sm text-fg-token">
          Período
          <select
            aria-label="Período"
            value={dias}
            onChange={(e) => setDias(Number(e.target.value))}
            className="superficie px-2 py-1 text-sm"
          >
            {PERIODOS.map((p) => <option key={p.dias} value={p.dias}>{p.rotulo}</option>)}
          </select>
        </label>
      )}
    >
      {estado === 'carregando' && (
        <div className="flex h-48 items-center justify-center">
          <Loading size="md" rotulo="Carregando avisos" />
        </div>
      )}

      {estado === 'falhou' && (
        <div role="alert" className="rounded-xl border border-border-token px-5 py-4 flex items-center gap-3">
          <span className="text-sm text-fg-token flex-1">Não foi possível carregar os avisos.</span>
          <button type="button" onClick={() => carregar()} className="text-sm font-semibold underline">
            Tentar novamente
          </button>
        </div>
      )}

      {estado === 'vazio' && (
        <EmptyState
          titulo="Nenhum aviso no período"
          descricao="Quando a loja mandar sozinha um status de pedido, lembrete de PIX ou de carrinho, pedido de avaliação ou reengajamento, ele aparece aqui."
        />
      )}

      {estado === 'lista' && (
        <div className="space-y-5">
          {/* Refetch falhou mas há dados em cache: mantém a lista e avisa que
              não atualizou, em vez de apagar o que o dono já está lendo. */}
          {erro && (
            <div role="alert" className="rounded-xl border border-border-token px-5 py-4 flex items-center gap-3">
              <span className="text-sm text-fg-token flex-1">Não foi possível atualizar os avisos. Mostrando os últimos carregados.</span>
              <button type="button" onClick={() => carregar()} className="text-sm font-semibold underline">
                Tentar novamente
              </button>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {resumo.map((r) => (
              <FiltroDeTipo
                key={r.tipo}
                resumo={r}
                ativo={tipo === r.tipo}
                onClick={() => setTipo(tipo === r.tipo ? undefined : r.tipo)}
              />
            ))}
          </div>
          <section className="superficie">
            <ul>
              {itens.map((aviso) => <LinhaDoAviso key={aviso.id} aviso={aviso} />)}
            </ul>
          </section>
        </div>
      )}
    </PageShell>
  );
};

export default AvisosAutomaticosPage;
