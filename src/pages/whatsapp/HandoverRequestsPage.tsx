/**
 * Fila humana — quem está esperando uma pessoa responder.
 *
 * Até 19/09/2026 esta página lia `HandoverRequest`, uma tabela com ZERO
 * linhas desde sempre: nada no sistema a preenchia quando a conversa passava
 * para atendimento humano. A página vivia vazia enquanto clientes esperavam
 * (7 naquele dia, e 57 que tinham ficado sem resposta há mais de um dia).
 *
 * Agora a fila sai da própria conversa (`/conversations/fila-humana/`): modo
 * humano + o cliente escreveu depois da nossa última resposta = esperando.
 * Resolver devolve a conversa ao bot.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowPathIcon, CheckIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { conversationsService, type FilaHumana, type ItemDaFilaHumana } from '../../services/conversations';
import { useStore } from '../../hooks/useStore';
import { EmptyState, PageShell } from '../../components/ui';
import { separarPorEspera, tempoDeEspera } from './filaHumana';

const REFRESCO_MS = 30_000;

interface LinhaProps {
  item: ItemDaFilaHumana;
  resolvendo: boolean;
  onResolver: (id: string) => void;
}

const LinhaDaFila: React.FC<LinhaProps> = ({ item, resolvendo, onResolver }) => (
  <li className="flex flex-wrap items-start gap-4 px-5 py-4 border-b border-border-token last:border-b-0">
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-semibold text-fg-token">{item.nome}</span>
        <span className="text-xs text-fg-muted-token">{item.telefone}</span>
      </div>
      <p className="mt-1 text-xs text-fg-muted-token">{item.motivo}</p>
      {item.ultima_mensagem && (
        <p className="mt-2 text-sm text-fg-token truncate">“{item.ultima_mensagem}”</p>
      )}
    </div>
    {item.minutos_esperando > 0 && (
      <div className="text-right shrink-0">
        <p className="overline">esperando</p>
        <p className="text-sm font-semibold text-fg-token">{tempoDeEspera(item.minutos_esperando)}</p>
      </div>
    )}
    <div className="flex gap-2 shrink-0">
      <Link
        to={`/inbox/whatsapp?conversation=${item.id}`}
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold bg-brand text-on-brand hover:bg-brand-hover"
      >
        <ChatBubbleLeftRightIcon className="h-4 w-4" aria-hidden />
        Responder
      </Link>
      <button
        type="button"
        onClick={() => onResolver(item.id)}
        disabled={resolvendo}
        title="O atendimento acabou: a conversa volta para o bot"
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border border-border-token text-fg-token hover:bg-surface-muted-token disabled:opacity-50"
      >
        <CheckIcon className="h-4 w-4" aria-hidden />
        Resolver
      </button>
    </div>
  </li>
);

interface SecaoProps {
  titulo: string;
  descricao: string;
  itens: ItemDaFilaHumana[];
  resolvendoId: string | null;
  onResolver: (id: string) => void;
}

const Secao: React.FC<SecaoProps> = ({ titulo, descricao, itens, resolvendoId, onResolver }) => {
  if (itens.length === 0) return null;
  return (
    <section className="rounded-xl border border-border-token bg-surface-token">
      <header className="px-5 py-3 border-b border-border-token">
        <h2 className="text-sm font-semibold text-fg-token">
          {titulo} <span className="text-fg-muted-token">({itens.length})</span>
        </h2>
        <p className="text-xs text-fg-muted-token mt-0.5">{descricao}</p>
      </header>
      <ul>
        {itens.map((item) => (
          <LinhaDaFila
            key={item.id}
            item={item}
            resolvendo={resolvendoId === item.id}
            onResolver={onResolver}
          />
        ))}
      </ul>
    </section>
  );
};

export const HandoverRequestsPage: React.FC = () => {
  const { storeSlug } = useStore();
  const [fila, setFila] = useState<FilaHumana | null>(null);
  const [erro, setErro] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [resolvendoId, setResolvendoId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setFila(await conversationsService.getFilaHumana(storeSlug || undefined));
      setErro(false);
    } catch {
      // Falha não pode virar "ninguém esperando": seria a mesma mentira da
      // página antiga, que vivia vazia com clientes aguardando.
      setErro(true);
    } finally {
      setCarregando(false);
    }
  }, [storeSlug]);

  useEffect(() => {
    carregar();
    const t = setInterval(carregar, REFRESCO_MS);
    return () => clearInterval(t);
  }, [carregar]);

  const resolver = async (id: string) => {
    setResolvendoId(id);
    try {
      await conversationsService.resolveConversation(id);
      setFila((atual) => atual && {
        ...atual,
        esperando: atual.esperando.filter((i) => i.id !== id),
        em_atendimento: atual.em_atendimento.filter((i) => i.id !== id),
      });
      toast.success('Resolvida — a conversa voltou para o bot');
    } catch {
      toast.error('Não foi possível resolver a conversa');
    } finally {
      setResolvendoId(null);
    }
  };

  const { agora, semResposta } = separarPorEspera(fila?.esperando ?? []);
  const vazia = !!fila && fila.esperando.length === 0 && fila.em_atendimento.length === 0;

  return (
    <PageShell
      titulo="Fila humana"
      descricao="Clientes esperando uma pessoa responder. Quem é atendido por humano volta para o bot no dia seguinte — ou quando você resolve."
      acoes={(
        <button
          type="button"
          onClick={() => { setCarregando(true); carregar(); }}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm border border-border-token text-fg-token"
        >
          <ArrowPathIcon className="h-4 w-4" aria-hidden />
          Atualizar
        </button>
      )}
    >
      {carregando && !fila && !erro && (
        <p className="text-sm text-fg-muted-token">Carregando a fila…</p>
      )}

      {erro && (
        <div role="alert" className="rounded-xl border border-border-token px-5 py-4 flex items-center gap-3">
          <span className="text-sm text-fg-token flex-1">Não foi possível carregar a fila. Os clientes podem estar esperando — tente de novo.</span>
          <button type="button" onClick={() => carregar()} className="text-sm font-semibold underline">
            Tentar novamente
          </button>
        </div>
      )}

      {!erro && vazia && (
        <EmptyState
          titulo="Ninguém esperando"
          descricao="Quando um cliente escrever numa conversa em atendimento humano e ainda não tiver resposta, ele aparece aqui."
        />
      )}

      {!erro && fila && (
        <div className="space-y-5">
          <Secao
            titulo="Esperando resposta"
            descricao="O cliente escreveu e ninguém respondeu ainda. Quem espera há mais tempo vem primeiro."
            itens={agora}
            resolvendoId={resolvendoId}
            onResolver={resolver}
          />
          <Secao
            titulo="Sem resposta há mais de 1 dia"
            descricao="Mandaram mensagem e nunca foram respondidos. Vale chamar de volta — ou resolver para o bot assumir."
            itens={semResposta}
            resolvendoId={resolvendoId}
            onResolver={resolver}
          />
          <Secao
            titulo="Em atendimento hoje"
            descricao="Alguém já respondeu hoje. Amanhã a conversa volta para o bot."
            itens={fila.em_atendimento}
            resolvendoId={resolvendoId}
            onResolver={resolver}
          />
        </div>
      )}
    </PageShell>
  );
};

export default HandoverRequestsPage;
