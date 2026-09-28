/**
 * "O que a loja sabe" — os fatos que a IA pode afirmar.
 *
 * Guardados em `store.metadata.bot_fatos`; o backend injeta no prompt com a
 * ordem "o que não está aqui, diga que vai confirmar". O PATCH substitui o
 * metadata inteiro: o resto vai junto.
 */
import React, { useEffect, useState } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';

import {
  Badge,
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  RowActions,
  Secao,
  Select,
  Switch,
  Tabela,
  Textarea,
  type ColunaDaTabela,
} from '../../components/ui';
import { updateStore } from '../../services/storesApi';
import { useStore } from '../../hooks/useStore';
import { useRootStore } from '../../stores/rootStore';
import {
  CHAVE_FATOS,
  LIMITE_DO_FATO,
  TEMAS_DE_FATO,
  lerFatos,
  rotuloDoTema,
  validarFato,
  type FatoDoBot,
  type TemaDeFato,
} from './fatosDoBot';

interface Edicao {
  indice: number; // -1 = novo
  tema: TemaDeFato;
  texto: string;
}

export const FatosDaLojaSecao: React.FC = () => {
  const { storeId, store } = useStore();
  const [fatos, setFatos] = useState<FatoDoBot[]>(() => lerFatos(store?.metadata));
  const [edicao, setEdicao] = useState<Edicao | null>(null);
  const [erroDoForm, setErroDoForm] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    setFatos(lerFatos(store?.metadata));
  }, [store?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const gravar = async (novos: FatoDoBot[]): Promise<boolean> => {
    if (!storeId) return false;
    setSalvando(true);
    setErro('');
    try {
      const salva = await updateStore(storeId, {
        metadata: { ...(store?.metadata || {}), [CHAVE_FATOS]: novos },
      });
      const { stores, setStores } = useRootStore.getState();
      setStores(stores.map((s) => (s.id === salva.id ? { ...s, ...salva } : s)));
      setFatos(novos);
      return true;
    } catch {
      setErro('Não consegui salvar. Os fatos continuam como estavam.');
      return false;
    } finally {
      setSalvando(false);
    }
  };

  const abrir = (indice: number) => {
    const f = indice >= 0 ? fatos[indice] : { tema: 'produtos' as TemaDeFato, texto: '' };
    setErroDoForm('');
    setEdicao({ indice, tema: f.tema, texto: f.texto });
  };

  const salvarEdicao = async () => {
    if (!edicao) return;
    const fato: FatoDoBot = { tema: edicao.tema, texto: edicao.texto.trim(), ativo: edicao.indice >= 0 ? fatos[edicao.indice].ativo : true };
    const problema = validarFato(fato, fatos, edicao.indice);
    if (problema) {
      setErroDoForm(problema);
      return;
    }
    const novos = edicao.indice >= 0 ? fatos.map((f, i) => (i === edicao.indice ? fato : f)) : [...fatos, fato];
    if (await gravar(novos)) setEdicao(null);
  };

  const ligar = (indice: number, ativo: boolean) => {
    void gravar(fatos.map((f, i) => (i === indice ? { ...f, ativo } : f)));
  };

  const remover = (indice: number) => {
    void gravar(fatos.filter((_, i) => i !== indice));
  };

  const exemplo = TEMAS_DE_FATO.find((t) => t.valor === edicao?.tema)?.exemplo;

  const colunas: ColunaDaTabela<FatoDoBot & { indice: number }>[] = [
    {
      chave: 'tema',
      cabecalho: 'Tema',
      classe: 'w-36',
      render: (f) => <Badge tone="neutral">{rotuloDoTema(f.tema)}</Badge>,
    },
    {
      chave: 'texto',
      cabecalho: 'O que a IA pode afirmar',
      render: (f) => (
        <span className={f.ativo ? 'whitespace-pre-line text-sm text-fg-token' : 'whitespace-pre-line text-sm text-fg-muted-token line-through'}>
          {f.texto}
        </span>
      ),
    },
    {
      chave: 'ativo',
      cabecalho: 'Em uso',
      classe: 'w-24',
      render: (f) => (
        <Switch ligado={f.ativo} onMudar={(v) => ligar(f.indice, v)} rotulo={`Usar o fato: ${f.texto}`} desabilitado={salvando} />
      ),
    },
    {
      chave: 'acoes',
      cabecalho: '',
      alinhamento: 'direita',
      classe: 'w-12',
      render: (f) => (
        <RowActions
          rotulo={`Ações do fato: ${f.texto}`}
          acoes={[
            { rotulo: 'Editar', onClick: () => abrir(f.indice) },
            { rotulo: 'Remover', onClick: () => remover(f.indice), destrutiva: true },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <Secao
        titulo="O que a loja sabe"
        descricao="Tudo que a IA pode afirmar sem perguntar: validade, área e horário de entrega, formas de pagamento, feriados. O que não estiver aqui ela diz que vai confirmar — em vez de inventar."
        contador={fatos.length}
        acoes={(
          <Button leftIcon={<PlusIcon className="h-4 w-4" />} onClick={() => abrir(-1)} disabled={salvando}>
            Novo fato
          </Button>
        )}
      >
        {erro && <p role="alert" className="mb-3 text-sm text-danger-token">{erro}</p>}
        <Tabela
          itens={fatos.map((f, indice) => ({ ...f, indice }))}
          colunas={colunas}
          chave={(f) => `${f.indice}-${f.texto}`}
          rotuloDaLinha={(f) => f.texto}
          vazio={{
            titulo: 'A IA ainda não tem fatos da loja',
            descricao: 'Comece pelo que os clientes mais perguntam: quanto tempo dura, onde entrega, o que aceita de pagamento.',
            acao: <Button size="sm" onClick={() => abrir(-1)}>Escrever o primeiro fato</Button>,
          }}
        />
      </Secao>

      <Modal
        isOpen={edicao !== null}
        onClose={() => setEdicao(null)}
        title={edicao && edicao.indice >= 0 ? 'Editar fato' : 'Novo fato'}
        size="md"
      >
        {edicao && (
          <>
            <ModalBody className="space-y-4">
              <Select
                rotulo="Tema"
                opcoes={TEMAS_DE_FATO.map((t) => ({ valor: t.valor, rotulo: t.rotulo }))}
                valor={edicao.tema}
                onMudar={(v) => setEdicao({ ...edicao, tema: v as TemaDeFato })}
              />
              <Textarea
                label="Fato"
                rows={3}
                value={edicao.texto}
                onChange={(e) => setEdicao({ ...edicao, texto: e.target.value })}
                hint={exemplo ? `Escreva como afirmação. Exemplo: “${exemplo}”` : 'Escreva como afirmação.'}
                maxLength={LIMITE_DO_FATO}
              />
              {erroDoForm && <p role="alert" className="text-sm text-danger-token">{erroDoForm}</p>}
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" onClick={() => setEdicao(null)}>Cancelar</Button>
              <Button onClick={salvarEdicao} isLoading={salvando}>Salvar fato</Button>
            </ModalFooter>
          </>
        )}
      </Modal>
    </>
  );
};
