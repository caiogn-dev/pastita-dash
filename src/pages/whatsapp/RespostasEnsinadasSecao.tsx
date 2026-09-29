/**
 * "Respostas ensinadas" — pergunta → resposta que o dono ensinou à IA.
 *
 * Nascem na aba "Não entendeu" ("Ensinar a resposta") ou aqui, do zero. A IA
 * recebe como exemplo de bom atendimento: vale para a mesma dúvida escrita
 * de outro jeito, não só para o texto exato.
 */
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import {
  Button,
  FalhaAoCarregar,
  Modal,
  ModalBody,
  ModalFooter,
  RowActions,
  Secao,
  Switch,
  Tabela,
  Textarea,
  type ColunaDaTabela,
} from '../../components/ui';
import { conhecimentoService, type Conhecimento } from '../../services/atendimentoBot';
import { useStore } from '../../hooks/useStore';
import { estadoDaLista } from '../../utils/estadoDaLista';

interface Edicao {
  id: string | null; // null = nova
  pergunta: string;
  resposta: string;
}

export const RespostasEnsinadasSecao: React.FC = () => {
  const { storeId, storeSlug } = useStore();
  const loja = storeSlug || storeId || '';
  const queryClient = useQueryClient();
  const [edicao, setEdicao] = useState<Edicao | null>(null);
  const [erroDoForm, setErroDoForm] = useState('');
  const [salvando, setSalvando] = useState(false);

  const chave = ['conhecimento', loja];
  const consulta = useQuery({
    queryKey: chave,
    queryFn: () => conhecimentoService.listar(loja),
    enabled: !!loja,
  });
  const itens = consulta.data ?? [];
  const estado = estadoDaLista({
    temDados: consulta.data !== undefined,
    buscando: consulta.isFetching,
    falhou: consulta.isError,
    quantidade: itens.length,
  });

  const atualizar = (lista: Conhecimento[]) => queryClient.setQueryData<Conhecimento[]>(chave, lista);

  const abrir = (c?: Conhecimento) => {
    setErroDoForm('');
    setEdicao({ id: c?.id ?? null, pergunta: c?.example_input ?? '', resposta: c?.example_response ?? '' });
  };

  const salvar = async () => {
    if (!edicao) return;
    const pergunta = edicao.pergunta.trim();
    const resposta = edicao.resposta.trim();
    if (!pergunta || !resposta) {
      setErroDoForm('Preencha a pergunta e a resposta.');
      return;
    }
    setSalvando(true);
    try {
      if (edicao.id) {
        const salvo = await conhecimentoService.editar(loja, edicao.id, { example_input: pergunta, example_response: resposta });
        atualizar(itens.map((i) => (i.id === salvo.id ? salvo : i)));
        toast.success('Resposta atualizada.');
      } else {
        const criado = await conhecimentoService.criar(loja, { example_input: pergunta, example_response: resposta });
        atualizar([criado, ...itens]);
        toast.success('Pronto: a IA aprendeu essa resposta.');
      }
      setEdicao(null);
    } catch (e) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setErroDoForm(msg || 'Não consegui salvar. Tente de novo.');
    } finally {
      setSalvando(false);
    }
  };

  const ligar = async (c: Conhecimento, ativo: boolean) => {
    try {
      const salvo = await conhecimentoService.editar(loja, c.id, { is_active: ativo });
      atualizar(itens.map((i) => (i.id === salvo.id ? salvo : i)));
    } catch {
      toast.error('Não consegui mudar. A resposta continua como estava.');
    }
  };

  const remover = async (c: Conhecimento) => {
    try {
      await conhecimentoService.apagar(loja, c.id);
      atualizar(itens.filter((i) => i.id !== c.id));
      toast.success('Resposta removida.');
    } catch {
      toast.error('Não consegui remover.');
    }
  };

  const colunas: ColunaDaTabela<Conhecimento>[] = [
    {
      chave: 'pergunta',
      cabecalho: 'Quando perguntarem',
      render: (c) => <span className="whitespace-normal text-sm font-medium text-fg-token">{c.example_input}</span>,
    },
    {
      chave: 'resposta',
      cabecalho: 'A IA responde',
      render: (c) => <span className="whitespace-pre-line text-sm text-fg-token">{c.example_response}</span>,
    },
    {
      chave: 'ativo',
      cabecalho: 'Em uso',
      classe: 'w-24',
      render: (c) => <Switch ligado={c.is_active} onMudar={(v) => void ligar(c, v)} rotulo={`Usar a resposta para: ${c.example_input}`} />,
    },
    {
      chave: 'acoes',
      cabecalho: '',
      alinhamento: 'direita',
      classe: 'w-12',
      render: (c) => (
        <RowActions
          rotulo={`Ações da resposta: ${c.example_input}`}
          acoes={[
            { rotulo: 'Editar', onClick: () => abrir(c) },
            { rotulo: 'Remover', onClick: () => void remover(c), destrutiva: true },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <Secao
        titulo="Respostas ensinadas"
       
        contador={consulta.data !== undefined ? itens.length : undefined}
        acoes={(
          <Button leftIcon={<PlusIcon className="h-4 w-4" />} onClick={() => abrir()}>
            Nova resposta
          </Button>
        )}
      >
        {estado === 'falhou' ? (
          <FalhaAoCarregar titulo="Não consegui carregar as respostas." onTentarDeNovo={() => void consulta.refetch()} />
        ) : (
          <Tabela
            itens={itens}
            colunas={colunas}
            chave={(c) => c.id}
            rotuloDaLinha={(c) => c.example_input}
            carregando={estado === 'carregando'}
            vazio={{
              titulo: 'Nenhuma resposta ensinada',
              descricao: 'Ensine pela aba "Não entendeu", ou escreva aqui uma pergunta que os clientes fazem e a resposta certa.',
            }}
          />
        )}
      </Secao>

      <Modal isOpen={edicao !== null} onClose={() => setEdicao(null)} title={edicao?.id ? 'Editar resposta' : 'Nova resposta'} size="md">
        {edicao && (
          <>
            <ModalBody className="space-y-4">
              <Textarea
                label="Quando perguntarem"
                rows={2}
                value={edicao.pergunta}
                onChange={(e) => setEdicao({ ...edicao, pergunta: e.target.value })}
               
                maxLength={300}
              />
              <Textarea
                label="A IA responde"
                rows={4}
                value={edicao.resposta}
                onChange={(e) => setEdicao({ ...edicao, resposta: e.target.value })}
                maxLength={1000}
              />
              {erroDoForm && <p role="alert" className="text-sm text-danger-token">{erroDoForm}</p>}
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" onClick={() => setEdicao(null)}>Cancelar</Button>
              <Button onClick={() => void salvar()} isLoading={salvando}>Salvar resposta</Button>
            </ModalFooter>
          </>
        )}
      </Modal>
    </>
  );
};
