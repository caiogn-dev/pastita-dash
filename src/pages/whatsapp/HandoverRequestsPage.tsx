/**
 * Fila humana — o balcão de quem está esperando uma pessoa responder.
 *
 * Até 19/09/2026 esta página lia `HandoverRequest`, uma tabela com ZERO
 * linhas desde sempre: nada no sistema a preenchia quando a conversa passava
 * para atendimento humano. A página vivia vazia enquanto clientes esperavam
 * (7 naquele dia, e 57 que tinham ficado sem resposta há mais de um dia).
 *
 * Agora a fila sai da própria conversa (`/conversations/fila-humana/`): modo
 * humano + o cliente escreveu depois da nossa última resposta = esperando.
 * Em 26/09 virou balcão: números no topo, maior espera primeiro, relógio
 * andando na tela, e "Assumir" leva direto à conversa.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowPathIcon, ArrowUturnLeftIcon, ChatBubbleLeftRightIcon, ClockIcon, HandRaisedIcon, UserGroupIcon,
} from '@heroicons/react/24/outline';
import { conversationsService, type FilaHumana } from '../../services/conversations';
import { useStore } from '../../hooks/useStore';
import { Button, EmptyState, FalhaAoCarregar, KpiGrid, PageShell, Secao, SeloDeEstado, Skeleton } from '../../components/ui';
import { estadoDaLista } from '../../utils/estadoDaLista';
import { montarBalcao, type ItemNoBalcao } from './filaHumana';
import { rotuloDoMotivo } from './motivoDoModoHumano';
import { haQuanto, tomDaEspera } from './tempoDeEspera';

const REFRESCO_MS = 30_000;
/** O relógio da tela anda sozinho entre as buscas. */
const RELOGIO_MS = 15_000;

type Acao = { id: string; tipo: 'assumir' | 'devolver' } | null;

interface LinhaProps {
  item: ItemNoBalcao;
  esperando: boolean;
  acao: Acao;
  erro: string | null;
  onAssumir: (id: string) => void;
  onDevolver: (id: string) => void;
}

const LinhaDaFila: React.FC<LinhaProps> = ({ item, esperando, acao, erro, onAssumir, onDevolver }) => {
  const ocupado = acao?.id === item.id;
  return (
    <li className="flex flex-wrap items-start gap-4 py-4 border-b border-border-token last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span data-testid="nome-na-fila" className="font-semibold text-fg-token">{item.nome}</span>
          <span className="text-caption text-fg-muted-token">{item.telefone}</span>
          {esperando && item.segundos > 0 && (
            <SeloDeEstado tone={tomDaEspera(item.segundos)} ponto>{haQuanto(item.segundos)}</SeloDeEstado>
          )}
        </div>
        <p className="mt-1 text-caption text-fg-muted-token">{rotuloDoMotivo(item.motivo)}</p>
        {item.ultima_mensagem && (
          <p className="mt-2 text-sm text-fg-token truncate">“{item.ultima_mensagem}”</p>
        )}
        {erro && <p role="alert" className="mt-2 text-caption text-danger-token">{erro}</p>}
      </div>
      <div className="flex flex-wrap gap-2 shrink-0">
        <Button
          size="sm"
          leftIcon={<HandRaisedIcon className="h-4 w-4" />}
          onClick={() => onAssumir(item.id)}
          disabled={ocupado}
          isLoading={ocupado && acao?.tipo === 'assumir'}
        >
          Assumir
        </Button>
        <Button
          size="sm"
          variant="outline"
          leftIcon={<ArrowUturnLeftIcon className="h-4 w-4" />}
          onClick={() => onDevolver(item.id)}
          disabled={ocupado}
          title="O atendimento acabou: o bot volta a responder"
        >
          Devolver ao bot
        </Button>
        <Link
          to={`/inbox/whatsapp?conversation=${item.id}`}
          className="inline-flex items-center gap-1 self-center text-caption text-fg-muted-token underline"
        >
          <ChatBubbleLeftRightIcon className="h-4 w-4" aria-hidden />
          Ver conversa
        </Link>
      </div>
    </li>
  );
};

export const HandoverRequestsPage: React.FC = () => {
  const { storeSlug } = useStore();
  const navigate = useNavigate();
  const [fila, setFila] = useState<FilaHumana | null>(null);
  const [buscadoEm, setBuscadoEm] = useState(() => Date.now());
  const [agora, setAgora] = useState(() => Date.now());
  const [erro, setErro] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [acao, setAcao] = useState<Acao>(null);
  const [erroDaLinha, setErroDaLinha] = useState<{ id: string; texto: string } | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const nova = await conversationsService.getFilaHumana(storeSlug || undefined);
      const instante = Date.now();
      setFila(nova);
      setBuscadoEm(instante);
      setAgora(instante);
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
    void carregar();
    const t = setInterval(() => { void carregar(); }, REFRESCO_MS);
    return () => clearInterval(t);
  }, [carregar]);

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), RELOGIO_MS);
    return () => clearInterval(t);
  }, []);

  const assumirConversa = async (id: string) => {
    setAcao({ id, tipo: 'assumir' });
    setErroDaLinha(null);
    try {
      await conversationsService.assumir(id);
      navigate(`/inbox/whatsapp?conversation=${id}`);
    } catch {
      setErroDaLinha({ id, texto: 'Não foi possível assumir. O bot continua parado — tente de novo.' });
      setAcao(null);
    }
  };

  const devolver = async (id: string) => {
    const anterior = fila;
    setAcao({ id, tipo: 'devolver' });
    setErroDaLinha(null);
    // Otimista: some da fila na hora; volta se o backend recusar.
    setFila((atual) => atual && {
      ...atual,
      esperando: atual.esperando.filter((i) => i.id !== id),
      em_atendimento: atual.em_atendimento.filter((i) => i.id !== id),
      resumo: undefined,
      total_esperando: atual.esperando.filter((i) => i.id !== id).length,
      total_em_atendimento: atual.em_atendimento.filter((i) => i.id !== id).length,
    });
    try {
      await conversationsService.devolverAoBot(id);
      toast.success('A conversa voltou para o bot');
    } catch {
      setFila(anterior);
      setErroDaLinha({ id, texto: 'Não foi possível devolver ao bot. A conversa continua com você.' });
    } finally {
      setAcao(null);
    }
  };

  const balcao = fila ? montarBalcao(fila, buscadoEm, agora) : null;
  const total = balcao ? balcao.agora.length + balcao.semResposta.length + balcao.emAtendimento.length : 0;
  const estado = estadoDaLista({ temDados: fila !== null, buscando: carregando, falhou: erro, quantidade: total });

  const secao = (titulo: string, descricao: string, itens: ItemNoBalcao[], esperando: boolean) =>
    itens.length > 0 && (
      <Secao titulo={titulo} descricao={descricao} contador={itens.length}>
        <ul>
          {itens.map((item) => (
            <LinhaDaFila
              key={item.id}
              item={item}
              esperando={esperando}
              acao={acao}
              erro={erroDaLinha?.id === item.id ? erroDaLinha.texto : null}
              onAssumir={assumirConversa}
              onDevolver={devolver}
            />
          ))}
        </ul>
      </Secao>
    );

  return (
    <PageShell
      titulo="Fila humana"
      descricao="Clientes esperando uma pessoa responder, quem espera há mais tempo primeiro. Quem é atendido por humano volta para o bot no dia seguinte — ou quando você devolve."
      acoes={(
        <Button variant="outline" size="sm" leftIcon={<ArrowPathIcon className="h-4 w-4" />} onClick={() => void carregar()}>
          Atualizar
        </Button>
      )}
    >
      {estado === 'carregando' && <Skeleton className="h-40 w-full" />}

      {estado === 'falhou' && (
        <FalhaAoCarregar
          titulo="Não foi possível carregar a fila"
          descricao="Os clientes podem estar esperando — tente de novo."
          onTentarDeNovo={() => void carregar()}
        />
      )}

      {balcao && estado !== 'falhou' && estado !== 'carregando' && (
        <div className="space-y-5">
          <KpiGrid
            titulo="Agora no balcão"
            itens={[
              {
                label: 'Esperando',
                value: balcao.resumo.esperando,
                definicao: 'Clientes que escreveram e ainda não tiveram resposta de uma pessoa.',
                tone: balcao.resumo.esperando > 0 ? 'warning' : 'default',
                icone: <UserGroupIcon className="h-5 w-5" />,
              },
              {
                label: 'Em atendimento',
                value: balcao.resumo.emAtendimento,
                definicao: 'Conversas que alguém já respondeu hoje; o bot está calado nelas.',
                icone: <ChatBubbleLeftRightIcon className="h-5 w-5" />,
              },
              {
                label: 'Mais antiga',
                value: balcao.resumo.maisAntigaSegundos > 0 ? haQuanto(balcao.resumo.maisAntigaSegundos) : '—',
                definicao: 'Há quanto tempo espera o cliente que está há mais tempo sem resposta.',
                tone: balcao.resumo.maisAntigaSegundos > 600 ? 'danger' : balcao.resumo.maisAntigaSegundos > 180 ? 'warning' : 'default',
                icone: <ClockIcon className="h-5 w-5" />,
              },
            ]}
          />

          {estado === 'vazio' ? (
            <EmptyState
              titulo="Ninguém esperando"
              descricao="Quando um cliente escrever numa conversa em atendimento humano e ainda não tiver resposta, ele aparece aqui."
            />
          ) : (
            <>
              {secao('Esperando resposta', 'O cliente escreveu e ninguém respondeu ainda. Amarelo passou de 3 minutos; vermelho, de 10.', balcao.agora, true)}
              {secao('Sem resposta há mais de 1 dia', 'Mandaram mensagem e nunca foram respondidos. Vale chamar de volta — ou devolver para o bot.', balcao.semResposta, true)}
              {secao('Em atendimento hoje', 'Alguém já respondeu hoje. Amanhã a conversa volta para o bot.', balcao.emAtendimento, false)}
            </>
          )}
        </div>
      )}
    </PageShell>
  );
};

export default HandoverRequestsPage;
