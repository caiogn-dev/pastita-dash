/**
 * Respostas rápidas — os textos que o atendente manda dez vezes por dia.
 *
 * No inbox, digitar "/" mostra estes atalhos; Enter coloca o texto na caixa,
 * já com o nome da cliente. Guardados em `store.metadata.respostas_rapidas`.
 * O backend substitui o metadata inteiro no PATCH: o resto vai junto.
 */
import React, { useEffect, useState } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';

import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  PageShell,
  RowActions,
  Secao,
  Tabela,
  Textarea,
  type ColunaDaTabela,
} from '../../components/ui';
import { updateStore } from '../../services/storesApi';
import { useStore } from '../../hooks/useStore';
import { useRootStore } from '../../stores/rootStore';
import {
  CHAVE_RESPOSTAS_RAPIDAS,
  lerRespostasRapidas,
  normalizarAtalho,
  validarResposta,
  type RespostaRapida,
} from './respostasRapidas';

interface Edicao {
  indice: number; // -1 = nova
  atalho: string;
  texto: string;
}

export const RespostasRapidasPage: React.FC = () => {
  const { storeId, store } = useStore();
  const lidas = lerRespostasRapidas(store?.metadata);
  const [respostas, setRespostas] = useState<RespostaRapida[]>(lidas.respostas);
  const [padrao, setPadrao] = useState(lidas.padrao);
  const [edicao, setEdicao] = useState<Edicao | null>(null);
  const [erroDoForm, setErroDoForm] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const r = lerRespostasRapidas(store?.metadata);
    setRespostas(r.respostas);
    setPadrao(r.padrao);
  }, [store?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const gravar = async (nova: RespostaRapida[]): Promise<boolean> => {
    if (!storeId) return false;
    setSalvando(true);
    setErro('');
    try {
      const salva = await updateStore(storeId, {
        metadata: { ...(store?.metadata || {}), [CHAVE_RESPOSTAS_RAPIDAS]: nova },
      });
      const { stores, setStores } = useRootStore.getState();
      setStores(stores.map((s) => (s.id === salva.id ? { ...s, ...salva } : s)));
      setRespostas(nova);
      setPadrao(false);
      return true;
    } catch {
      setErro('Não consegui salvar. As respostas continuam como estavam.');
      return false;
    } finally {
      setSalvando(false);
    }
  };

  const abrir = (indice: number) => {
    const r = indice >= 0 ? respostas[indice] : { atalho: '', texto: '' };
    setErroDoForm('');
    setEdicao({ indice, ...r });
  };

  const salvarEdicao = async () => {
    if (!edicao) return;
    const resposta = { atalho: normalizarAtalho(edicao.atalho), texto: edicao.texto.trim() };
    const problema = validarResposta(resposta, respostas, edicao.indice);
    if (problema) {
      setErroDoForm(problema);
      return;
    }
    const nova = edicao.indice >= 0
      ? respostas.map((r, i) => (i === edicao.indice ? resposta : r))
      : [...respostas, resposta];
    if (await gravar(nova)) setEdicao(null);
  };

  const remover = (indice: number) => {
    void gravar(respostas.filter((_, i) => i !== indice));
  };

  const colunas: ColunaDaTabela<RespostaRapida & { indice: number }>[] = [
    {
      chave: 'atalho',
      cabecalho: 'Atalho',
      render: (r) => <code className="font-semibold text-fg-token">/{r.atalho}</code>,
      classe: 'w-40',
    },
    {
      chave: 'texto',
      cabecalho: 'Texto enviado',
      render: (r) => <span className="whitespace-pre-line text-sm text-fg-token">{r.texto}</span>,
    },
    {
      chave: 'acoes',
      cabecalho: '',
      alinhamento: 'direita',
      classe: 'w-12',
      render: (r) => (
        <RowActions
          rotulo={`Ações de /${r.atalho}`}
          acoes={[
            { rotulo: 'Editar', onClick: () => abrir(r.indice) },
            { rotulo: 'Remover', onClick: () => remover(r.indice), destrutiva: true },
          ]}
        />
      ),
    },
  ];

  return (
    <PageShell
      titulo="Respostas rápidas"
      descricao="Textos prontos para o atendimento. No chat, digite / e o atalho: o texto entra na caixa com o nome da cliente, e você revisa antes de enviar."
      acoes={(
        <Button leftIcon={<PlusIcon className="h-4 w-4" />} onClick={() => abrir(-1)} disabled={salvando}>
          Nova resposta
        </Button>
      )}
    >
      <Secao
        titulo="Seus atalhos"
        descricao={padrao
          ? 'Sugestões prontas para começar. Edite com o jeito da sua loja — elas já funcionam no chat.'
          : 'Use {nome} para o primeiro nome da cliente e {cardapio} para o link do seu cardápio.'}
        contador={respostas.length}
      >
        {erro && <p role="alert" className="mb-3 text-sm text-danger-token">{erro}</p>}
        <Tabela
          itens={respostas.map((r, indice) => ({ ...r, indice }))}
          colunas={colunas}
          chave={(r) => r.atalho}
          rotuloDaLinha={(r) => `/${r.atalho}`}
          vazio={{
            titulo: 'Nenhuma resposta rápida',
            descricao: 'Crie um atalho para o texto que você mais repete no chat, como o valor do frete.',
          }}
        />
      </Secao>

      <Modal
        isOpen={edicao !== null}
        onClose={() => setEdicao(null)}
        title={edicao && edicao.indice >= 0 ? 'Editar resposta' : 'Nova resposta'}
        size="md"
      >
        {edicao && (
          <>
            <ModalBody className="space-y-4">
              <Input
                label="Atalho"
                value={edicao.atalho}
                onChange={(e) => setEdicao({ ...edicao, atalho: e.target.value })}
                hint={`No chat: /${normalizarAtalho(edicao.atalho) || 'atalho'}`}
                maxLength={30}
              />
              <Textarea
                label="Texto"
                rows={5}
                value={edicao.texto}
                onChange={(e) => setEdicao({ ...edicao, texto: e.target.value })}
                hint="{nome} vira o primeiro nome da cliente; {cardapio}, o link do cardápio."
                maxLength={1000}
              />
              {erroDoForm && <p role="alert" className="text-sm text-danger-token">{erroDoForm}</p>}
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" onClick={() => setEdicao(null)}>Cancelar</Button>
              <Button onClick={salvarEdicao} isLoading={salvando}>Salvar resposta</Button>
            </ModalFooter>
          </>
        )}
      </Modal>
    </PageShell>
  );
};

export default RespostasRapidasPage;
