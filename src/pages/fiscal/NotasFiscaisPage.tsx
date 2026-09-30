/**
 * Notas fiscais — o que a loja emitiu, e a emissão manual.
 *
 * Até 30/09/2026 a nota só existia como um botão dentro de cada pedido: não
 * havia lista do que saiu, e o destinatário da NF-e era lido do endereço de
 * entrega. Um pedido de RETIRADA para empresa (Sindicato da PF) travou pedindo
 * número e bairro, sem tela onde digitá-los — a saída anterior tinha sido um
 * script no banco. Aqui o operador vê as notas, escolhe o pedido e registra
 * para quem a nota sai.
 */
import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowDownTrayIcon, ArrowPathIcon, ArrowTopRightOnSquareIcon, Cog6ToothIcon,
  DocumentPlusIcon, EnvelopeIcon, XCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import {
  Button, EmptyState, FalhaAoCarregar, Input, KpiGrid, Modal, PageShell, RowActions, SearchInput,
  Select, SeloDeEstado, Tabela, Textarea, estadoDeNota,
  type ColunaDaTabela, type RowAction,
} from '../../components/ui';
import { Loading } from '../../components/common';
import { useStore } from '../../hooks/useStore';
import { getErrorMessage } from '../../services/api';
import { fiscalService, type NotaDaLoja, type NotasDaLoja } from '../../services/fiscal';
import { estadoDaLista } from '../../utils/estadoDaLista';
import { formatarDocumento } from '../../utils/documento';
import { formatCurrency } from '../../utils/formatters';
import EmitirNota from './EmitirNota';

const NOME_MODELO: Record<string, string> = { '65': 'NFC-e', '55': 'NF-e' };

const STATUS = [
  { valor: 'authorized', rotulo: 'Autorizadas' },
  { valor: 'pending', rotulo: 'Na SEFAZ' },
  { valor: 'rejected', rotulo: 'Rejeitadas' },
  { valor: 'error', rotulo: 'Falharam' },
  { valor: 'cancelled', rotulo: 'Canceladas' },
];

const MODELOS = [
  { valor: '55', rotulo: 'NF-e' },
  { valor: '65', rotulo: 'NFC-e' },
];

const JUSTIFICATIVA_MIN = 15;
const JANELA_DE_CANCELAMENTO_MS = 30 * 60 * 1000;

const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', {
  day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
});

const podeCancelar = (nota: NotaDaLoja) =>
  nota.status === 'authorized'
  && Date.now() - new Date(nota.created_at).getTime() < JANELA_DE_CANCELAMENTO_MS;

interface Emissao {
  pedido?: string;
  documento?: string;
}

export const NotasFiscaisPage: React.FC = () => {
  // A loja é a da URL. A selecionada no topo só vale quando a rota não diz:
  // `/stores/ivoneth/notas-fiscais` mostrando as notas de OUTRA loja é como
  // sai nota com o CNPJ errado.
  const { storeId: lojaDaRota } = useParams<{ storeId?: string }>();
  const { storeSlug } = useStore();
  const loja = lojaDaRota || storeSlug || '';
  const [parametros, setParametros] = useSearchParams();

  const [dados, setDados] = useState<NotasDaLoja | null>(null);
  const [buscando, setBuscando] = useState(true);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  const [busca, setBusca] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [modelo, setModelo] = useState('');

  // `?pedido=` é como o detalhe do pedido manda o operador para cá já com o
  // pedido escolhido.
  const pedidoDaUrl = parametros.get('pedido') || undefined;
  const [emissao, setEmissao] = useState<Emissao | null>(
    pedidoDaUrl ? { pedido: pedidoDaUrl, documento: parametros.get('documento') || undefined } : null,
  );
  const [cancelando, setCancelando] = useState<NotaDaLoja | null>(null);
  const [justificativa, setJustificativa] = useState('');
  const [enviandoCancelamento, setEnviandoCancelamento] = useState(false);
  const [enviando, setEnviando] = useState<NotaDaLoja | null>(null);
  const [emailDoEnvio, setEmailDoEnvio] = useState('');
  const [mandandoEmail, setMandandoEmail] = useState(false);

  useEffect(() => {
    const espera = setTimeout(() => setQ(busca.trim()), 300);
    return () => clearTimeout(espera);
  }, [busca]);

  // Trocar de loja derruba a lista antes da nova busca voltar: nota carrega
  // CNPJ e valor de venda, e não pode piscar na tela de outra loja.
  useEffect(() => {
    setDados(null);
  }, [loja]);

  useEffect(() => {
    if (!loja) return undefined;
    let ativo = true;
    setBuscando(true);
    setErro(false);
    fiscalService.listarNotas(loja, { status, modelo, q })
      .then((resposta) => { if (ativo) setDados(resposta); })
      .catch(() => { if (ativo) setErro(true); })
      .finally(() => { if (ativo) setBuscando(false); });
    return () => { ativo = false; };
  }, [loja, status, modelo, q, tentativa]);

  const recarregar = () => setTentativa((n) => n + 1);

  // Nota na SEFAZ é consultada a cada busca da lista — e o e-mail guardado
  // sai quando ela é autorizada. Com a tela aberta, a lista se atualiza
  // sozinha enquanto houver nota processando.
  const temNotaNaSefaz = (dados?.notas ?? []).some((n) => n.status === 'pending');
  useEffect(() => {
    if (!temNotaNaSefaz) return undefined;
    const proxima = setTimeout(recarregar, 15_000);
    return () => clearTimeout(proxima);
  }, [temNotaNaSefaz, dados]);

  const fecharEmissao = () => {
    setEmissao(null);
    if (pedidoDaUrl) setParametros({}, { replace: true });
  };

  const cancelar = async () => {
    if (!cancelando) return;
    setEnviandoCancelamento(true);
    try {
      await fiscalService.cancelar(loja, cancelando.id, justificativa.trim());
      toast.success('Nota cancelada');
      setCancelando(null);
      setJustificativa('');
      recarregar();
    } catch (falha) {
      toast.error(getErrorMessage(falha));
    } finally {
      setEnviandoCancelamento(false);
    }
  };

  const abrirEnvio = (nota: NotaDaLoja) => {
    setEmailDoEnvio(nota.email_enviado_para || nota.email_sugerido || '');
    setEnviando(nota);
  };

  const enviarPorEmail = async () => {
    if (!enviando) return;
    setMandandoEmail(true);
    try {
      const nota = await fiscalService.enviarEmail(loja, enviando.id, emailDoEnvio.trim());
      toast.success(`Nota enviada para ${nota.email_enviado_para || emailDoEnvio.trim()}`);
      setEnviando(null);
      recarregar();
    } catch (falha) {
      toast.error(getErrorMessage(falha));
    } finally {
      setMandandoEmail(false);
    }
  };

  const notas = dados?.notas ?? [];
  const filtrando = Boolean(status || modelo || q);
  const estado = estadoDaLista({
    temDados: dados !== null,
    buscando,
    falhou: erro,
    quantidade: notas.length,
  });

  const acoesDa = (nota: NotaDaLoja): RowAction[] => {
    const acoes: RowAction[] = [];
    if (nota.danfe_url) {
      acoes.push({
        rotulo: 'Abrir DANFE',
        icone: <ArrowTopRightOnSquareIcon className="h-4 w-4" />,
        onClick: () => window.open(nota.danfe_url, '_blank', 'noopener'),
      });
    }
    if (nota.xml_url) {
      acoes.push({
        rotulo: 'Baixar XML',
        icone: <ArrowDownTrayIcon className="h-4 w-4" />,
        onClick: () => window.open(nota.xml_url, '_blank', 'noopener'),
      });
    }
    if (nota.status === 'authorized') {
      acoes.push({
        rotulo: nota.email_enviado_em ? 'Enviar por e-mail de novo' : 'Enviar por e-mail',
        icone: <EnvelopeIcon className="h-4 w-4" />,
        onClick: () => abrirEnvio(nota),
      });
    }
    if (nota.status === 'rejected' || nota.status === 'error') {
      acoes.push({
        rotulo: 'Tentar de novo',
        icone: <ArrowPathIcon className="h-4 w-4" />,
        onClick: () => setEmissao({ pedido: nota.pedido.id }),
      });
    }
    if (podeCancelar(nota)) {
      acoes.push({
        rotulo: 'Cancelar nota',
        destrutiva: true,
        icone: <XCircleIcon className="h-4 w-4" />,
        onClick: () => setCancelando(nota),
      });
    }
    return acoes;
  };

  const colunas: ColunaDaTabela<NotaDaLoja>[] = [
    {
      chave: 'nota',
      cabecalho: 'Nota',
      render: (nota) => (
        <span className="font-semibold text-fg-token">
          {NOME_MODELO[nota.modelo] ?? nota.modelo}
          {nota.numero ? ` nº ${nota.numero}` : ''}
          {nota.numero && nota.serie ? ` · série ${nota.serie}` : ''}
        </span>
      ),
    },
    {
      chave: 'destinatario',
      cabecalho: 'Destinatário',
      render: (nota) => (nota.destinatario ? (
        <span className="block min-w-0">
          <span className="block truncate text-fg-token">{nota.destinatario.nome}</span>
          <span className="block text-xs text-fg-muted-token">{formatarDocumento(nota.destinatario.documento)}</span>
        </span>
      ) : (
        <span className="text-fg-muted-token">Consumidor</span>
      )),
    },
    {
      chave: 'pedido',
      cabecalho: 'Pedido',
      render: (nota) => (
        <Link
          to={`/stores/${loja}/orders/${nota.pedido.id}`}
          className="text-fg-token underline-offset-2 hover:underline"
        >
          {nota.pedido.order_number}
        </Link>
      ),
    },
    {
      chave: 'valor',
      cabecalho: 'Valor',
      alinhamento: 'direita',
      render: (nota) => formatCurrency(nota.pedido.total),
    },
    {
      chave: 'quando',
      cabecalho: 'Emissão',
      soNoDesktop: true,
      render: (nota) => <time dateTime={nota.created_at}>{quando(nota.created_at)}</time>,
    },
    {
      chave: 'estado',
      cabecalho: 'Situação',
      render: (nota) => {
        const situacao = estadoDeNota(nota.status);
        return (
          <span className="block min-w-0">
            <SeloDeEstado tone={situacao.tone}>{situacao.rotulo}</SeloDeEstado>
            {nota.error_message && nota.status !== 'authorized' && (
              <span className="mt-1 block max-w-xs truncate text-xs text-danger-token" title={nota.error_message}>
                {nota.error_message}
              </span>
            )}
            {nota.email_enviado_para && nota.email_enviado_em && (
              <span className="mt-1 flex min-w-0 items-center gap-1 text-xs text-fg-muted-token" title="Enviada por e-mail">
                <EnvelopeIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="truncate">{nota.email_enviado_para}</span>
              </span>
            )}
          </span>
        );
      },
    },
    {
      chave: 'acoes',
      cabecalho: '',
      alinhamento: 'direita',
      render: (nota) => {
        const acoes = acoesDa(nota);
        return acoes.length > 0
          ? <RowActions rotulo={`Ações da nota do pedido ${nota.pedido.order_number}`} acoes={acoes} />
          : null;
      },
    },
  ];

  const habilitado = dados?.habilitado ?? false;

  return (
    <PageShell
      titulo="Notas fiscais"
      selo={dados?.ambiente === 'homologacao' && habilitado
        ? <SeloDeEstado tone="warning">Homologação</SeloDeEstado>
        : undefined}
      acoes={habilitado ? (
        <Button leftIcon={<DocumentPlusIcon className="h-4 w-4" />} onClick={() => setEmissao({})}>
          Emitir nota
        </Button>
      ) : undefined}
      filtros={habilitado ? (
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-64 max-w-full">
            <SearchInput
              aria-label="Buscar nota"
              placeholder="Número, cliente, CNPJ ou pedido"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <Select rotuloOculto="Situação" vazio="Todas as situações" opcoes={STATUS} valor={status} onMudar={setStatus} />
          <Select rotuloOculto="Tipo de nota" vazio="NF-e e NFC-e" opcoes={MODELOS} valor={modelo} onMudar={setModelo} />
        </div>
      ) : undefined}
    >
      {estado === 'carregando' && (
        <div className="flex h-48 items-center justify-center">
          <Loading size="md" rotulo="Carregando notas" />
        </div>
      )}

      {(estado === 'falhou' || (erro && dados !== null)) && (
        <FalhaAoCarregar titulo="Não foi possível carregar as notas" onTentarDeNovo={recarregar} />
      )}

      {dados !== null && !habilitado && notas.length === 0 && !erro && (
        <EmptyState
          variante="ativacao"
          estado="Emissão desligada"
          titulo="Emita NF-e e NFC-e direto dos pedidos"
          acao={(
            <Link
              to={`/stores/${loja}/settings?aba=fiscal`}
              className="inline-flex items-center gap-2 rounded bg-brand px-4 py-2 text-sm font-semibold text-on-brand"
            >
              <Cog6ToothIcon className="h-4 w-4" aria-hidden />
              Configurar emissão
            </Link>
          )}
        />
      )}

      {dados !== null && (habilitado || notas.length > 0) && !erro && (
        <>
          <KpiGrid
            itens={[
              {
                label: 'Autorizadas no mês',
                value: dados.resumo.autorizadas_no_mes,
                definicao: 'Aceitas pela SEFAZ desde o dia 1º',
                tone: 'success',
              },
              {
                label: 'Valor no mês',
                value: formatCurrency(dados.resumo.valor_no_mes),
                definicao: 'Soma dos pedidos com nota autorizada',
              },
              {
                label: 'Não saíram',
                value: dados.resumo.nao_sairam,
                definicao: 'Rejeitadas ou com falha de envio',
                tone: dados.resumo.nao_sairam > 0 ? 'danger' : undefined,
                onClick: () => setStatus('rejected'),
              },
            ]}
          />
          <Tabela
            itens={notas}
            colunas={colunas}
            chave={(nota) => nota.id}
            rotuloDaLinha={(nota) => `Nota do pedido ${nota.pedido.order_number}`}
            carregando={buscando}
            vazio={{
              titulo: filtrando ? 'Nenhuma nota com esse filtro' : 'Nenhuma nota emitida',
              acao: filtrando ? undefined : (
                <Button leftIcon={<DocumentPlusIcon className="h-4 w-4" />} onClick={() => setEmissao({})}>
                  Emitir nota
                </Button>
              ),
            }}
          />
        </>
      )}

      <EmitirNota
        aberto={emissao !== null}
        onFechar={fecharEmissao}
        loja={loja}
        pedidoInicial={emissao?.pedido}
        documentoInicial={emissao?.documento}
        onEmitida={recarregar}
      />

      <Modal
        open={enviando !== null}
        onClose={() => setEnviando(null)}
        title="Enviar nota por e-mail"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="E-mail"
            type="email"
            inputMode="email"
            value={emailDoEnvio}
            onChange={(e) => setEmailDoEnvio(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEnviando(null)}>Voltar</Button>
            <Button
              leftIcon={<EnvelopeIcon className="h-4 w-4" />}
              onClick={enviarPorEmail}
              isLoading={mandandoEmail}
              disabled={!emailDoEnvio.trim()}
            >
              Enviar nota
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={cancelando !== null}
        onClose={() => setCancelando(null)}
        title="Cancelar nota"
        size="md"
      >
        <div className="space-y-4">
          <Textarea
            label="Justificativa"
            rows={3}
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCancelando(null)}>Voltar</Button>
            <Button
              variant="danger"
              onClick={cancelar}
              isLoading={enviandoCancelamento}
              disabled={justificativa.trim().length < JUSTIFICATIVA_MIN}
            >
              Cancelar nota
            </Button>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
};

export default NotasFiscaisPage;
