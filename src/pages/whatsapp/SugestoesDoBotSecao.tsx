/**
 * "Sugestões" — o que o atendimento aprendeu sozinho, esperando o dono.
 *
 * Saem só de conversas que viraram pedido pelo WhatsApp sem atendente, e só
 * da resposta do bot. Nada entra na IA antes de aprovado: até 06/10 o
 * extraído sozinho ia direto para o prompt e ensinava promoção velha,
 * resposta de erro e conversa pessoal.
 */
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import {
  Button,
  FalhaAoCarregar,
  Modal,
  ModalBody,
  ModalFooter,
  Secao,
  Tabela,
  Textarea,
  type ColunaDaTabela,
} from '../../components/ui';
import { conhecimentoService, type Conhecimento } from '../../services/atendimentoBot';
import { useStore } from '../../hooks/useStore';
import { estadoDaLista } from '../../utils/estadoDaLista';

export const SugestoesDoBotSecao: React.FC = () => {
  const { storeId, storeSlug } = useStore();
  const loja = storeSlug || storeId || '';
  const queryClient = useQueryClient();
  const [aprovando, setAprovando] = useState<{ item: Conhecimento; resposta: string } | null>(null);
  const [salvando, setSalvando] = useState(false);

  const chave = ['conhecimento-sugestoes', loja];
  const consulta = useQuery({
    queryKey: chave,
    queryFn: () => conhecimentoService.listarSugestoes(loja),
    enabled: !!loja,
  });
  const itens = consulta.data ?? [];
  const estado = estadoDaLista({
    temDados: consulta.data !== undefined,
    buscando: consulta.isFetching,
    falhou: consulta.isError,
    quantidade: itens.length,
  });

  const tirar = (id: string) =>
    queryClient.setQueryData<Conhecimento[]>(chave, (atual) => (atual ?? []).filter((i) => i.id !== id));

  const aprovar = async () => {
    if (!aprovando) return;
    const resposta = aprovando.resposta.trim();
    setSalvando(true);
    try {
      await conhecimentoService.aprovar(loja, aprovando.item.id, resposta);
      tirar(aprovando.item.id);
      // A lista de "Respostas ensinadas" ganhou um item.
      void queryClient.invalidateQueries({ queryKey: ['conhecimento', loja] });
      setAprovando(null);
      toast.success('Aprovada: a IA passa a responder assim.');
    } catch {
      toast.error('Não consegui aprovar. Tente de novo.');
    } finally {
      setSalvando(false);
    }
  };

  const descartar = async (c: Conhecimento) => {
    try {
      await conhecimentoService.apagar(loja, c.id);
      tirar(c.id);
    } catch {
      toast.error('Não consegui descartar.');
    }
  };

  const colunas: ColunaDaTabela<Conhecimento>[] = [
    {
      chave: 'pergunta',
      cabecalho: 'Cliente perguntou',
      render: (c) => <span className="whitespace-normal text-sm font-medium text-fg-token">{c.example_input}</span>,
    },
    {
      chave: 'resposta',
      cabecalho: 'O bot respondeu',
      render: (c) => <span className="whitespace-pre-line text-sm text-fg-token">{c.example_response}</span>,
    },
    {
      chave: 'acoes',
      cabecalho: '',
      alinhamento: 'direita',
      classe: 'w-56',
      render: (c) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => void descartar(c)}>Descartar</Button>
          <Button size="sm" onClick={() => setAprovando({ item: c, resposta: c.example_response })}>Aprovar</Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Secao titulo="Sugestões" contador={consulta.data !== undefined ? itens.length : undefined}>
        {estado === 'falhou' ? (
          <FalhaAoCarregar titulo="Não consegui carregar as sugestões." onTentarDeNovo={() => void consulta.refetch()} />
        ) : (
          <Tabela
            itens={itens}
            colunas={colunas}
            chave={(c) => c.id}
            rotuloDaLinha={(c) => c.example_input}
            carregando={estado === 'carregando'}
            vazio={{ titulo: 'Nenhuma sugestão por enquanto' }}
          />
        )}
      </Secao>

      <Modal isOpen={aprovando !== null} onClose={() => setAprovando(null)} title="Aprovar resposta" size="md">
        {aprovando && (
          <>
            <ModalBody className="space-y-4">
              <p className="text-sm font-medium text-fg-token">{aprovando.item.example_input}</p>
              <Textarea
                label="A IA responde"
                rows={5}
                value={aprovando.resposta}
                onChange={(e) => setAprovando({ ...aprovando, resposta: e.target.value })}
                maxLength={1000}
              />
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" onClick={() => setAprovando(null)}>Cancelar</Button>
              <Button onClick={() => void aprovar()} isLoading={salvando} disabled={!aprovando.resposta.trim()}>
                Aprovar
              </Button>
            </ModalFooter>
          </>
        )}
      </Modal>
    </>
  );
};

export default SugestoesDoBotSecao;
