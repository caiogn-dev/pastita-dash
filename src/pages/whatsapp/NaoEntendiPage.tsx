/**
 * O bot não entendeu — as mensagens de cliente que caíram em "não entendi".
 *
 * Cada linha é uma cliente que ficou sem resposta útil. O lojista ensina ali
 * mesmo: "é um produto" (o bot passa a reconhecer o nome), "responder assim"
 * (texto pronto para aquela pergunta) ou "ignorar" (conversa de gente, não
 * pedido). Ensinou, a linha sai da lista.
 */
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import {
  Button,
  EmptyState,
  FalhaAoCarregar,
  KpiGrid,
  Modal,
  ModalBody,
  ModalFooter,
  PageShell,
  PeriodChips,
  Secao,
  Select,
  Tabela,
  Textarea,
  type ColunaDaTabela,
} from '../../components/ui';
import { atendimentoBotService, type Ensino, type MensagemNaoEntendida } from '../../services/atendimentoBot';
import { useProducts } from '../../hooks/queries/useProducts';
import { useStore } from '../../hooks/useStore';
import { estadoDaLista } from '../../utils/estadoDaLista';
import { formatPhone } from '../../utils/formatters';

const PERIODOS = [
  { value: '7', label: '7 dias' },
  { value: '30', label: '30 dias' },
];

const vezes = (n: number) => (n === 1 ? '1 vez' : `${n} vezes`);
const mensagens = (n: number) => (n === 1 ? '1 mensagem' : `${n} mensagens`);
const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', {
  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
});

type Ensinando = { item: MensagemNaoEntendida; acao: 'produto' | 'resposta' };

export const NaoEntendiPage: React.FC = () => {
  const { storeId, storeSlug } = useStore();
  const queryClient = useQueryClient();
  const [dias, setDias] = useState('7');
  const [ensinando, setEnsinando] = useState<Ensinando | null>(null);
  const [produtoId, setProdutoId] = useState('');
  const [resposta, setResposta] = useState('');
  const [enviando, setEnviando] = useState<string | null>(null);

  const chave = ['nao-entendi', storeSlug || storeId, dias];
  const consulta = useQuery({
    queryKey: chave,
    queryFn: () => atendimentoBotService.listarNaoEntendi({ store: storeSlug || storeId || undefined, dias: Number(dias) }),
    enabled: !!(storeSlug || storeId),
  });
  const itens = consulta.data ?? [];
  const estado = estadoDaLista({
    temDados: consulta.data !== undefined,
    buscando: consulta.isFetching,
    falhou: consulta.isError,
    quantidade: itens.length,
  });

  // Produtos só quando o lojista vai escolher um — a lista não precisa deles.
  const produtos = useProducts(ensinando?.acao === 'produto' ? storeId || undefined : undefined);
  const opcoesDeProduto = (produtos.data?.results ?? [])
    .map((p) => ({ valor: String(p.id), rotulo: p.name }))
    .sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR'));

  const total = itens.reduce((s, i) => s + (Number(i.vezes) || 1), 0);
  const frase = `${mensagens(total)} sem resposta nos últimos ${dias} dias`;

  const ensinar = async (item: MensagemNaoEntendida, ensino: Ensino, feito: string) => {
    setEnviando(item.id);
    try {
      await atendimentoBotService.ensinar(ensino);
      queryClient.setQueryData<MensagemNaoEntendida[]>(chave, (antes) => (antes ?? []).filter((i) => i.id !== item.id));
      setEnsinando(null);
      toast.success(feito);
    } catch {
      toast.error('Não consegui salvar. A mensagem continua na lista.');
    } finally {
      setEnviando(null);
    }
  };

  const abrir = (item: MensagemNaoEntendida, acao: Ensinando['acao']) => {
    setProdutoId('');
    setResposta('');
    setEnsinando({ item, acao });
  };

  const confirmar = () => {
    if (!ensinando) return;
    const { item, acao } = ensinando;
    if (acao === 'produto') {
      const nome = opcoesDeProduto.find((o) => o.valor === produtoId)?.rotulo ?? 'o produto';
      void ensinar(item, { texto: item.texto, acao: 'produto', produto_id: produtoId }, `Pronto: o bot agora entende "${item.texto}" como ${nome}.`);
    } else {
      void ensinar(item, { texto: item.texto, acao: 'resposta', resposta: resposta.trim() }, 'Pronto: o bot vai responder assim da próxima vez.');
    }
  };

  const colunas: ColunaDaTabela<MensagemNaoEntendida>[] = [
    {
      chave: 'texto',
      cabecalho: 'A cliente escreveu',
      render: (i) => (
        <div className="min-w-0">
          <p className="whitespace-normal text-sm font-medium text-fg-token">{i.texto}</p>
          <p className="text-xs text-fg-muted-token">{vezes(Number(i.vezes) || 1)}</p>
        </div>
      ),
    },
    {
      chave: 'telefone',
      cabecalho: 'Cliente',
      render: (i) => <span className="text-sm text-fg-token">{formatPhone(i.telefone)}</span>,
    },
    {
      chave: 'resposta',
      cabecalho: 'O bot respondeu',
      soNoDesktop: true,
      render: (i) => <span className="whitespace-normal text-sm text-fg-muted-token">{i.resposta_do_bot}</span>,
    },
    {
      chave: 'quando',
      cabecalho: 'Última vez',
      render: (i) => <time className="text-sm text-fg-muted-token" dateTime={i.quando}>{quando(i.quando)}</time>,
    },
    {
      chave: 'acoes',
      cabecalho: 'Ensinar o bot',
      alinhamento: 'direita',
      render: (i) => (
        <div className="flex flex-wrap justify-end gap-2">
          <Button size="xs" variant="outline" disabled={enviando === i.id} onClick={() => abrir(i, 'produto')}>
            É um produto
          </Button>
          <Button size="xs" variant="outline" disabled={enviando === i.id} onClick={() => abrir(i, 'resposta')}>
            Responder assim
          </Button>
          <Button
            size="xs"
            variant="ghost"
            disabled={enviando === i.id}
            onClick={() => void ensinar(i, { texto: i.texto, acao: 'ignorar' }, 'Mensagem ignorada.')}
          >
            Ignorar
          </Button>
        </div>
      ),
    },
  ];

  const podeConfirmar = ensinando?.acao === 'produto' ? !!produtoId : resposta.trim().length > 0;

  return (
    <PageShell
      titulo="O bot não entendeu"
      descricao="Mensagens de clientes que o bot não soube responder. Ensine uma vez e ele acerta das próximas."
      filtros={(
        <PeriodChips
          options={PERIODOS}
          value={dias}
          onChange={setDias}
          ariaLabel="Período"
        />
      )}
    >
      {consulta.data !== undefined && (
        <KpiGrid
          itens={[{
            label: 'Mensagens sem resposta',
            value: total,
            definicao: `${frase}, somando as vezes que a mesma pergunta se repetiu.`,
            tone: total > 0 ? 'warning' : 'success',
          }]}
        />
      )}

      <Secao titulo="Para ensinar" contador={itens.length}>
        {estado === 'falhou' ? (
          <FalhaAoCarregar
            titulo="Não consegui carregar as mensagens."
            onTentarDeNovo={() => void consulta.refetch()}
          />
        ) : estado === 'vazio' ? (
          <EmptyState
            titulo="O bot entendeu tudo"
            descricao={`Nenhuma mensagem ficou sem resposta nos últimos ${dias} dias.`}
          />
        ) : (
          <Tabela
            itens={itens}
            colunas={colunas}
            chave={(i) => i.id}
            rotuloDaLinha={(i) => i.texto}
            carregando={estado === 'carregando'}
          />
        )}
      </Secao>

      <Modal
        isOpen={ensinando !== null}
        onClose={() => setEnsinando(null)}
        title={ensinando?.acao === 'produto' ? 'É um produto' : 'Responder assim'}
        size="md"
      >
        {ensinando && (
          <>
            <ModalBody className="space-y-4">
              <p className="text-sm text-fg-muted-token">
                A cliente escreveu: <span className="font-medium text-fg-token">“{ensinando.item.texto}”</span>
              </p>
              {ensinando.acao === 'produto' ? (
                <Select
                  rotulo="Produto"
                  opcoes={opcoesDeProduto}
                  valor={produtoId}
                  onMudar={setProdutoId}
                  vazio={produtos.isLoading ? 'Carregando o cardápio…' : 'Escolha o produto'}
                />
              ) : (
                <Textarea
                  label="Resposta"
                  rows={4}
                  value={resposta}
                  onChange={(e) => setResposta(e.target.value)}
                  hint="O bot manda este texto quando alguém perguntar a mesma coisa."
                  maxLength={1000}
                />
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" onClick={() => setEnsinando(null)}>Cancelar</Button>
              <Button onClick={confirmar} disabled={!podeConfirmar} isLoading={enviando === ensinando.item.id}>
                Ensinar o bot
              </Button>
            </ModalFooter>
          </>
        )}
      </Modal>
    </PageShell>
  );
};

export default NaoEntendiPage;
