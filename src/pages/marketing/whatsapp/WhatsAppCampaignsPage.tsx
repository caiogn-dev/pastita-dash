/**
 * Campanhas do WhatsApp — a lista.
 *
 * "As campanhas que já foram estão feias; quero simples" (dono, 25/09). Era um
 * cartão grande por campanha, com fileira de botões, métricas em caixa alta e
 * barra de progresso escrita à mão. Agora é o desenho de toda lista do painel:
 *
 *   PageShell → quatro números que mudam a decisão (KpiGrid)
 *             → Secao com uma Tabela: nome, quando, para quantos,
 *               entregues/lidas em barra, estado no SeloDeEstado
 *             → ações no menu da linha (RowActions); clicar na linha abre o relatório
 *
 * Cor só em estado, e o estado vem de `estadoDeCampanha` (um mapa por domínio).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MegaphoneIcon, PlusIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { CampanhaAoVivo } from '../../../components/campanhas/CampanhaAoVivo';
import {
  Button,
  EmptyState,
  InsightList,
  KpiGrid,
  Modal,
  PageShell,
  Progresso,
  RowActions,
  Secao,
  SeloDeEstado,
  Skeleton,
  Tabela,
  estadoDeCampanha,
} from '../../../components/ui';
import type { ColunaDaTabela, RowAction } from '../../../components/ui';
import { useConfirm } from '../../../hooks/useConfirm';
import { campaignsService, Campaign } from '../../../services/campaigns';
import logger from '../../../services/logger';
import { estadoDaLista } from '../../../utils/estadoDaLista';
import { PediramParaParar } from './PediramParaParar';
import { QuemRecebeu } from './QuemRecebeu';
import { insightsDeCampanhas, resumoDeCampanha } from './resumoDeCampanha';

type RelatorioDaCampanha = {
  id: string;
  name: string;
  status: string;
  total_recipients: number;
  messages_sent: number;
  messages_delivered: number;
  messages_read: number;
  messages_failed: number;
  delivery_rate: number;
  read_rate: number;
  pending: number;
  started_at: string | null;
  completed_at: string | null;
};

const NOVA_CAMPANHA = '/marketing/whatsapp/new';

const pct = (parte: number, todo: number): number | null =>
  todo > 0 ? Math.round((parte / todo) * 100) : null;

const dataCurta = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

const dataLonga = (iso: string) => new Date(iso).toLocaleString('pt-BR');

function mesmoMes(iso: string | null | undefined, hoje: Date): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return d.getFullYear() === hoje.getFullYear() && d.getMonth() === hoje.getMonth();
}

/** Quando a campanha acontece, na frase que responde à pergunta do dono. */
function quando(c: Campaign): string {
  if (c.status === 'scheduled' && c.scheduled_at) return `Agendada para ${dataCurta(c.scheduled_at)}`;
  if (c.started_at) return dataCurta(c.started_at);
  return `Criada em ${dataCurta(c.created_at)}`;
}

/** Campanha grátis sai em levas ao longo do dia (janela de 24 h de cada cliente). */
const saiEmLevas = (c: Campaign) =>
  Boolean((c.audience_filters as Record<string, unknown> | undefined)?.somente_janela_aberta);

export const WhatsAppCampaignsPage: React.FC = () => {
  const navigate = useNavigate();
  const [ConfirmDialog, confirm] = useConfirm();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [buscando, setBuscando] = useState(true);
  const [falhou, setFalhou] = useState(false);
  const [carregouAlgumaVez, setCarregouAlgumaVez] = useState(false);
  const [emAcao, setEmAcao] = useState<string | null>(null);
  const [aberta, setAberta] = useState<Campaign | null>(null);
  const [relatorio, setRelatorio] = useState<RelatorioDaCampanha | null>(null);
  // Sequência da busca em voo: uma resposta velha não apaga a mais nova.
  const requisicao = useRef(0);
  const jaCarregou = useRef(false);

  const carregar = useCallback(async () => {
    const minha = ++requisicao.current;
    setBuscando(true);
    setFalhou(false);
    try {
      const resposta = await campaignsService.getCampaigns();
      if (minha !== requisicao.current) return;
      setCampaigns(resposta.results || []);
      jaCarregou.current = true;
      setCarregouAlgumaVez(true);
    } catch (error) {
      if (minha !== requisicao.current) return;
      logger.error('Failed to load campaigns', error);
      setFalhou(true);
      // Com lista na tela, a falha é só de atualização: a tabela fica e o toast avisa.
      if (jaCarregou.current) toast.error('Não foi possível atualizar as campanhas');
    } finally {
      if (minha === requisicao.current) setBuscando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const estado = estadoDaLista({
    temDados: carregouAlgumaVez,
    buscando,
    falhou,
    quantidade: campaigns.length,
  });

  // ── Ações ──────────────────────────────────────────────────────────────────
  const executar = async (c: Campaign, acao: () => Promise<unknown>, sucesso: string, erro: string) => {
    setEmAcao(c.id);
    try {
      await acao();
      toast.success(sucesso);
      carregar();
    } catch (error) {
      logger.error(erro, error);
      toast.error(erro);
    } finally {
      setEmAcao(null);
    }
  };

  const cancelar = async (c: Campaign) => {
    const ok = await confirm({
      title: 'Cancelar campanha',
      message: `"${c.name}" para de enviar agora. Quem já recebeu não é afetado.`,
      confirmText: 'Cancelar campanha',
      cancelText: 'Manter',
      variant: 'warning',
    });
    if (!ok) return;
    executar(c, () => campaignsService.cancelCampaign(c.id), 'Campanha cancelada', 'Não foi possível cancelar a campanha');
  };

  const abrirRelatorio = async (c: Campaign) => {
    setAberta(c);
    setRelatorio(null);
    try {
      setRelatorio((await campaignsService.getCampaignStats(c.id)) as RelatorioDaCampanha);
    } catch (error) {
      logger.error('Failed to load stats', error);
      toast.error('Não foi possível carregar o relatório');
      setAberta(null);
    }
  };

  const acoesDa = (c: Campaign): RowAction[] => {
    const ocupada = emAcao === c.id;
    const enviarAgora: RowAction = {
      rotulo: 'Enviar agora',
      desabilitada: ocupada,
      onClick: () => executar(c, () => campaignsService.startCampaign(c.id), 'Campanha enviando', 'Não foi possível iniciar a campanha'),
    };
    const cancelarCampanha: RowAction = { rotulo: 'Cancelar campanha', destrutiva: true, desabilitada: ocupada, onClick: () => cancelar(c) };
    const porEstado: Record<string, RowAction[]> = {
      draft: [enviarAgora],
      scheduled: [enviarAgora, cancelarCampanha],
      running: [
        {
          rotulo: 'Pausar envio',
          desabilitada: ocupada,
          onClick: () => executar(c, () => campaignsService.pauseCampaign(c.id), 'Campanha pausada', 'Não foi possível pausar a campanha'),
        },
        {
          // Útil quando a fila do servidor parou: empurra os pendentes.
          rotulo: 'Processar fila',
          desabilitada: ocupada,
          onClick: () =>
            executar(
              c,
              () => campaignsService.getCampaignRecipients(c.id, 'pending'),
              'Fila processada',
              'Não foi possível processar a fila',
            ),
        },
      ],
      paused: [
        {
          rotulo: 'Retomar envio',
          desabilitada: ocupada,
          onClick: () => executar(c, () => campaignsService.resumeCampaign(c.id), 'Campanha retomada', 'Não foi possível retomar a campanha'),
        },
        cancelarCampanha,
      ],
    };
    return [{ rotulo: 'Ver relatório', onClick: () => abrirRelatorio(c) }, ...(porEstado[c.status] ?? [])];
  };

  // ── Números ────────────────────────────────────────────────────────────────
  const numeros = useMemo(() => {
    const hoje = new Date();
    const soma = (campo: 'messages_sent' | 'messages_delivered' | 'messages_read') =>
      campaigns.reduce((a, c) => a + (c[campo] ?? 0), 0);
    const enviadas = soma('messages_sent');
    const entregues = soma('messages_delivered');
    const lidas = soma('messages_read');
    return {
      enviadasNoMes: campaigns
        .filter((c) => mesmoMes(c.started_at ?? c.created_at, hoje))
        .reduce((a, c) => a + (c.messages_sent ?? 0), 0),
      enviadas,
      entregues,
      lidas,
      // `null` sem envio: "0%" acusaria um canal ruim que nem foi usado.
      taxaEntrega: pct(entregues, enviadas),
      taxaLeitura: pct(lidas, enviadas),
      agendadas: campaigns.filter((c) => c.status === 'scheduled').length,
    };
  }, [campaigns]);

  const insights = useMemo(() => insightsDeCampanhas(campaigns), [campaigns]);

  // ── Tabela ─────────────────────────────────────────────────────────────────
  const colunas: ColunaDaTabela<Campaign>[] = [
    {
      chave: 'nome',
      cabecalho: 'Campanha',
      render: (c) => <span className="font-medium text-fg-token">{c.name}</span>,
    },
    {
      chave: 'quando',
      cabecalho: 'Quando',
      render: (c) => (
        <span className="text-fg-muted-token">
          {quando(c)}
          {saiEmLevas(c) && ['scheduled', 'running'].includes(c.status) && (
            <span className="block text-caption">Sai em levas ao longo do dia</span>
          )}
        </span>
      ),
    },
    {
      chave: 'para',
      cabecalho: 'Para quantos',
      alinhamento: 'direita',
      render: (c) => (
        <span className="tabular-nums">
          {c.status === 'running' ? `${c.messages_sent ?? 0} de ${c.total_recipients ?? 0}` : (c.total_recipients ?? 0)}
        </span>
      ),
    },
    {
      chave: 'entregues',
      cabecalho: 'Entregues',
      render: (c) => {
        const taxa = resumoDeCampanha(c).taxaEntrega;
        return taxa === null ? (
          <span className="text-fg-muted-token">—</span>
        ) : (
          <Progresso pct={taxa} rotulo={`Entregues em ${c.name}`} mostrarValor className="min-w-[7rem]" />
        );
      },
    },
    {
      chave: 'lidas',
      cabecalho: 'Lidas',
      soNoDesktop: true,
      render: (c) => {
        const taxa = resumoDeCampanha(c).taxaLeitura;
        return taxa === null ? (
          <span className="text-fg-muted-token">—</span>
        ) : (
          <Progresso pct={taxa} rotulo={`Lidas em ${c.name}`} mostrarValor className="min-w-[7rem]" />
        );
      },
    },
    {
      chave: 'estado',
      cabecalho: 'Estado',
      render: (c) => {
        const e = estadoDeCampanha(c.status);
        return (
          <SeloDeEstado tone={e.tone} ponto={c.status === 'running'}>
            {e.rotulo}
          </SeloDeEstado>
        );
      },
    },
    {
      chave: 'acoes',
      cabecalho: 'Ações',
      alinhamento: 'direita',
      render: (c) => <RowActions rotulo={`Ações de ${c.name}`} acoes={acoesDa(c)} />,
    },
  ];

  const criar = (
    <Button onClick={() => navigate(NOVA_CAMPANHA)} leftIcon={<PlusIcon className="h-4 w-4" />}>
      Criar campanha
    </Button>
  );

  const e = relatorio ? estadoDeCampanha(relatorio.status) : null;

  return (
    <PageShell
      trilha={[{ rotulo: 'Campanhas', href: '/marketing' }, { rotulo: 'WhatsApp' }]}
      titulo="Campanhas no WhatsApp"
      descricao="O que saiu, o que chegou e o que foi lido. Clique numa campanha para ver quem recebeu."
      acoes={estado === 'lista' ? criar : undefined}
    >
      {estado === 'lista' && (
        <section aria-label="Números das campanhas">
          <KpiGrid
            itens={[
              {
                label: 'Enviadas no mês',
                value: numeros.enviadasNoMes,
                definicao: 'mensagens que saíram em campanhas começadas neste mês',
              },
              {
                label: 'Entregues',
                value: numeros.taxaEntrega === null ? '—' : `${numeros.taxaEntrega}%`,
                definicao:
                  numeros.taxaEntrega === null
                    ? 'nenhuma mensagem enviada ainda'
                    : `${numeros.entregues} de ${numeros.enviadas} enviadas chegaram no aparelho`,
              },
              {
                label: 'Lidas',
                value: numeros.taxaLeitura === null ? '—' : `${numeros.taxaLeitura}%`,
                definicao: 'lidas sobre enviadas; abaixo de 50% o texto pede revisão',
              },
              {
                label: 'Agendadas',
                value: numeros.agendadas,
                definicao: 'saem sozinhas no horário marcado',
              },
            ]}
          />
        </section>
      )}

      {estado === 'falhou' ? (
        <div role="alert" className="superficie">
          <EmptyState
            icone={<MegaphoneIcon className="h-10 w-10" />}
            titulo="Não foi possível carregar as campanhas"
            descricao="A conexão falhou. Isso não quer dizer que não há campanhas: tente de novo."
            acao={<Button variant="secondary" onClick={() => carregar()}>Tentar de novo</Button>}
          />
        </div>
      ) : estado === 'vazio' ? (
        <div className="superficie">
          <EmptyState
            icone={<MegaphoneIcon className="h-10 w-10" />}
            titulo="Nenhuma campanha ainda"
            descricao="Fale com quem já comprou de você: escolha quem recebe, escreva a mensagem e envie agora ou agende."
            acao={criar}
          />
        </div>
      ) : (
        <Secao titulo="Campanhas" contador={estado === 'lista' ? campaigns.length : undefined}>
          <Tabela<Campaign>
            itens={campaigns}
            colunas={colunas}
            chave={(c) => c.id}
            rotuloDaLinha={(c) => `Abrir relatório de ${c.name}`}
            onAbrir={abrirRelatorio}
            carregando={estado === 'carregando'}
          />
        </Secao>
      )}

      {estado === 'lista' && (
        <>
          {/* O custo do canal: quem pediu para parar. A fonte é o próprio pedido de saída. */}
          <PediramParaParar />
          {insights.length > 0 && (
            <InsightList
              titulo="O que fazer com isso"
              tom={insights.some((i) => i.direcao === 'baixa') ? 'alerta' : 'neutro'}
              itens={insights}
            />
          )}
        </>
      )}

      <Modal
        open={Boolean(aberta)}
        onClose={() => {
          setAberta(null);
          setRelatorio(null);
        }}
        title={aberta ? `Relatório de ${aberta.name}` : 'Relatório da campanha'}
        size="lg"
      >
        {!relatorio || !aberta ? (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="space-y-5">
            {e && <SeloDeEstado tone={e.tone}>{e.rotulo}</SeloDeEstado>}

            <KpiGrid
              itens={[
                { label: 'Destinatários', value: relatorio.total_recipients, definicao: 'quantas pessoas entraram na lista de envio' },
                { label: 'Enviadas', value: relatorio.messages_sent, definicao: 'saíram do nosso lado; não garante que chegaram' },
                {
                  label: 'Entregues',
                  value: relatorio.delivery_rate != null ? `${relatorio.messages_delivered} · ${relatorio.delivery_rate.toFixed(0)}%` : relatorio.messages_delivered,
                  definicao: 'confirmadas pelo WhatsApp no aparelho do cliente',
                },
                {
                  label: 'Lidas',
                  value: relatorio.read_rate != null ? `${relatorio.messages_read} · ${relatorio.read_rate.toFixed(0)}%` : relatorio.messages_read,
                  definicao: 'a métrica que mostra atenção de verdade',
                },
              ]}
            />

            {saiEmLevas(aberta) && ['scheduled', 'running'].includes(aberta.status) && (
              <CampanhaAoVivo campanhaId={aberta.id} horarioDaCampanha={aberta.scheduled_at} />
            )}

            <QuemRecebeu campaignId={aberta.id} />

            <div className="space-y-1 border-t border-border-token pt-3 text-caption text-fg-muted-token">
              {relatorio.pending > 0 && <p>{relatorio.pending} ainda na fila de envio.</p>}
              {relatorio.started_at && <p>Começou em {dataLonga(relatorio.started_at)}</p>}
              {relatorio.completed_at && <p>Terminou em {dataLonga(relatorio.completed_at)}</p>}
            </div>
          </div>
        )}
      </Modal>

      {ConfirmDialog}
    </PageShell>
  );
};

export default WhatsAppCampaignsPage;
