/**
 * Informativos — avisos da loja no cardápio ("fechado no feriado", "novo
 * horário"), com começo e fim. Pedido do dono (06/10), visto no Prefiro.
 *
 * O servidor guarda e decide o que está no ar (server2 7ee4e27); a vitrine
 * recebe só o que vale agora.
 */
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import {
  Badge,
  Button,
  FalhaAoCarregar,
  Modal,
  ModalBody,
  ModalFooter,
  PageShell,
  RowActions,
  Switch,
  Tabela,
  Textarea,
  type ColunaDaTabela,
} from '../../../components/ui';
import { informativosService, type EstadoDoInformativo, type Informativo } from '../../../services/informativos';
import { useStore } from '../../../hooks/useStore';
import { estadoDaLista } from '../../../utils/estadoDaLista';

const ESTADO: Record<EstadoDoInformativo, { rotulo: string; tone: 'success' | 'info' | 'neutral' | 'warning' }> = {
  no_ar: { rotulo: 'No ar', tone: 'success' },
  agendado: { rotulo: 'Agendado', tone: 'info' },
  pausado: { rotulo: 'Pausado', tone: 'warning' },
  encerrado: { rotulo: 'Encerrado', tone: 'neutral' },
};

/** ISO do servidor → valor do <input type="datetime-local"> (hora local). */
const paraCampo = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const doisDigitos = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}T${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`;
};
const doCampo = (valor: string) => (valor ? new Date(valor).toISOString() : null);
const quando = (iso: string | null) => (iso ? new Date(iso).toLocaleString('pt-BR', {
  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
}) : '');

interface Edicao { id: string | null; titulo: string; texto: string; inicio: string; fim: string }

export const InformativosPage: React.FC = () => {
  const { storeId, storeSlug } = useStore();
  const loja = storeSlug || storeId || '';
  const queryClient = useQueryClient();
  const chave = ['informativos', loja];
  const consulta = useQuery({ queryKey: chave, queryFn: () => informativosService.listar(loja), enabled: !!loja });
  const itens = consulta.data ?? [];
  const estado = estadoDaLista({
    temDados: consulta.data !== undefined, buscando: consulta.isFetching, falhou: consulta.isError, quantidade: itens.length,
  });
  const [edicao, setEdicao] = useState<Edicao | null>(null);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const recarregar = () => void queryClient.invalidateQueries({ queryKey: chave });

  const abrir = (i?: Informativo) => {
    setErro('');
    setEdicao({ id: i?.id ?? null, titulo: i?.titulo ?? '', texto: i?.texto ?? '', inicio: paraCampo(i?.inicio ?? null), fim: paraCampo(i?.fim ?? null) });
  };

  const salvar = async () => {
    if (!edicao) return;
    setSalvando(true);
    setErro('');
    const dados = { titulo: edicao.titulo.trim(), texto: edicao.texto.trim(), inicio: doCampo(edicao.inicio), fim: doCampo(edicao.fim) };
    try {
      if (edicao.id) await informativosService.editar(loja, edicao.id, dados);
      else await informativosService.criar(loja, dados);
      setEdicao(null);
      recarregar();
      toast.success('Informativo salvo.');
    } catch (e) {
      setErro((e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Não consegui salvar.');
    } finally {
      setSalvando(false);
    }
  };

  const ligar = async (i: Informativo, ativo: boolean) => {
    try {
      await informativosService.editar(loja, i.id, { ativo });
      recarregar();
    } catch {
      toast.error('Não consegui mudar.');
    }
  };

  const apagar = async (i: Informativo) => {
    try {
      await informativosService.apagar(loja, i.id);
      recarregar();
    } catch {
      toast.error('Não consegui apagar.');
    }
  };

  const colunas: ColunaDaTabela<Informativo>[] = [
    {
      chave: 'aviso',
      cabecalho: 'Aviso',
      render: (i) => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-fg-token">{i.titulo}</p>
          {i.texto && <p className="whitespace-normal text-sm text-fg-muted-token">{i.texto}</p>}
        </div>
      ),
    },
    {
      chave: 'periodo',
      cabecalho: 'Período',
      soNoDesktop: true,
      render: (i) => (
        <span className="text-sm text-fg-muted-token">
          {i.inicio ? `de ${quando(i.inicio)}` : 'desde já'}{i.fim ? ` até ${quando(i.fim)}` : ', sem fim'}
        </span>
      ),
    },
    { chave: 'estado', cabecalho: 'Estado', render: (i) => <Badge tone={ESTADO[i.estado].tone}>{ESTADO[i.estado].rotulo}</Badge> },
    {
      chave: 'ativo',
      cabecalho: 'Ligado',
      classe: 'w-24',
      render: (i) => <Switch ligado={i.ativo} onMudar={(v) => void ligar(i, v)} rotulo={`Mostrar: ${i.titulo || i.texto}`} />,
    },
    {
      chave: 'acoes',
      cabecalho: '',
      alinhamento: 'direita',
      classe: 'w-12',
      render: (i) => (
        <RowActions
          rotulo={`Ações: ${i.titulo}`}
          acoes={[
            { rotulo: 'Editar', onClick: () => abrir(i) },
            { rotulo: 'Apagar', onClick: () => void apagar(i), destrutiva: true },
          ]}
        />
      ),
    },
  ];

  return (
    <PageShell
      titulo="Informativos"
      acoes={<Button leftIcon={<PlusIcon className="h-4 w-4" />} onClick={() => abrir()}>Novo informativo</Button>}
    >
      {estado === 'falhou' ? (
        <FalhaAoCarregar titulo="Não consegui carregar os informativos." onTentarDeNovo={() => void consulta.refetch()} />
      ) : (
        <Tabela
          itens={itens}
          colunas={colunas}
          chave={(i) => i.id}
          rotuloDaLinha={(i) => i.titulo || i.texto}
          carregando={estado === 'carregando'}
          vazio={{ titulo: 'Nenhum informativo', descricao: 'Ex.: "Fechados no feriado", "Novo horário de domingo".' }}
        />
      )}

      <Modal isOpen={edicao !== null} onClose={() => setEdicao(null)} title={edicao?.id ? 'Editar informativo' : 'Novo informativo'} size="md">
        {edicao && (
          <>
            <ModalBody className="space-y-4">
              <label className="flex flex-col gap-1 text-sm text-fg-muted-token">
                Título
                <input className="rounded border px-3 py-2 text-fg-token" maxLength={60} value={edicao.titulo}
                  onChange={(e) => setEdicao({ ...edicao, titulo: e.target.value })} />
              </label>
              <Textarea label="Texto" rows={3} maxLength={280} value={edicao.texto}
                onChange={(e) => setEdicao({ ...edicao, texto: e.target.value })} />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm text-fg-muted-token">
                  Começa
                  <input type="datetime-local" className="rounded border px-3 py-2 text-fg-token" value={edicao.inicio}
                    onChange={(e) => setEdicao({ ...edicao, inicio: e.target.value })} />
                </label>
                <label className="flex flex-col gap-1 text-sm text-fg-muted-token">
                  Termina
                  <input type="datetime-local" className="rounded border px-3 py-2 text-fg-token" value={edicao.fim}
                    onChange={(e) => setEdicao({ ...edicao, fim: e.target.value })} />
                </label>
              </div>
              {erro && <p role="alert" className="text-sm text-danger-token">{erro}</p>}
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" onClick={() => setEdicao(null)}>Cancelar</Button>
              <Button onClick={() => void salvar()} isLoading={salvando}>Salvar</Button>
            </ModalFooter>
          </>
        )}
      </Modal>
    </PageShell>
  );
};

export default InformativosPage;
