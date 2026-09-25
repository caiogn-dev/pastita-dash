/**
 * Campanhas de e-mail — a lista, com o mesmo desenho da do WhatsApp.
 *
 * Era um cartão por campanha com selo pintado por um mapa de status próprio,
 * ícone por estado e uma caixinha de métricas que só aparecia nas enviadas.
 * Agora: quatro números, uma Tabela com a abertura em barra e o estado no
 * SeloDeEstado (tom de `estadoDeCampanha`), ações no menu da linha.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnvelopeIcon, PlusIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';

import api from '@/services/api';
import {
  Button,
  EmptyState,
  KpiGrid,
  Modal,
  PageShell,
  Progresso,
  RowActions,
  Secao,
  SeloDeEstado,
  Tabela,
  TableSkeleton,
  estadoDeCampanha,
  estadoDeEnvio,
} from '../../../components/ui';
import type { ColunaDaTabela, RowAction } from '../../../components/ui';
import { useConfirm } from '../../../hooks/useConfirm';
import { useStore } from '../../../hooks/useStore';
import { estadoDaLista } from '../../../utils/estadoDaLista';

interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled';
  audience_type: string;
  total_recipients: number;
  emails_sent: number;
  emails_delivered: number;
  emails_opened: number;
  emails_clicked: number;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface CampaignRecipient {
  id: string;
  email: string;
  name: string;
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  error_message: string | null;
}

const NOVA_CAMPANHA = '/marketing/email/new';

const pct = (parte: number, todo: number): number | null =>
  todo > 0 ? Math.round((parte / todo) * 100) : null;

const dataCurta = (iso: string) => format(new Date(iso), "dd/MM 'às' HH:mm", { locale: ptBR });

function mesmoMes(iso: string | null | undefined, hoje: Date): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return d.getFullYear() === hoje.getFullYear() && d.getMonth() === hoje.getMonth();
}

function quando(c: EmailCampaign): string {
  if (c.status === 'scheduled' && c.scheduled_at) return `Agendada para ${dataCurta(c.scheduled_at)}`;
  const saiu = c.completed_at ?? c.started_at;
  if (saiu) return dataCurta(saiu);
  return `Criada em ${dataCurta(c.created_at)}`;
}

const ENTREGUES = ['sent', 'delivered', 'opened', 'clicked'];
const ABERTOS = ['opened', 'clicked'];
const FALHAS = ['failed', 'bounced'];

export const CampaignsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { storeId } = useStore();
  const [ConfirmDialog, confirm] = useConfirm();

  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [buscando, setBuscando] = useState(true);
  const [falhou, setFalhou] = useState(false);
  const [carregouAlgumaVez, setCarregouAlgumaVez] = useState(false);
  const [emAcao, setEmAcao] = useState<string | null>(null);
  const [aberta, setAberta] = useState<EmailCampaign | null>(null);
  const [recipients, setRecipients] = useState<CampaignRecipient[]>([]);
  const [carregandoDestinatarios, setCarregandoDestinatarios] = useState(false);
  const requisicao = useRef(0);
  const jaCarregou = useRef(false);

  const carregar = useCallback(async () => {
    const minha = ++requisicao.current;
    setBuscando(true);
    setFalhou(false);
    try {
      const params: Record<string, string> = storeId ? { store: storeId } : {};
      const response = await api.get('/marketing/campaigns/', { params });
      if (minha !== requisicao.current) return;
      const data = response.data?.results || response.data || [];
      setCampaigns(Array.isArray(data) ? data : []);
      jaCarregou.current = true;
      setCarregouAlgumaVez(true);
    } catch (error) {
      if (minha !== requisicao.current) return;
      console.error('Error loading campaigns:', error);
      setFalhou(true);
      if (jaCarregou.current) toast.error('Não foi possível atualizar as campanhas');
    } finally {
      if (minha === requisicao.current) setBuscando(false);
    }
  }, [storeId]);

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
  const abrirDestinatarios = async (c: EmailCampaign) => {
    setAberta(c);
    setRecipients([]);
    setCarregandoDestinatarios(true);
    try {
      const response = await api.get(`/marketing/campaigns/${c.id}/recipients/`);
      setRecipients(response.data?.results || response.data || []);
    } catch (error) {
      console.error('Error loading recipients:', error);
      toast.error('Não foi possível carregar os destinatários');
    } finally {
      setCarregandoDestinatarios(false);
    }
  };

  const enviar = async (c: EmailCampaign) => {
    const ok = await confirm({
      title: 'Enviar campanha',
      message: `"${c.name}" sai agora para o público escolhido. Não dá para desfazer.`,
      confirmText: 'Enviar campanha',
      cancelText: 'Agora não',
      variant: 'info',
    });
    if (!ok) return;
    setEmAcao(c.id);
    try {
      const response = await api.post(`/marketing/campaigns/${c.id}/send/`);
      const n = response.data?.sent ?? 0;
      toast.success(`Campanha enviada para ${n} ${n === 1 ? 'pessoa' : 'pessoas'}`);
      carregar();
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || 'Não foi possível enviar a campanha');
    } finally {
      setEmAcao(null);
    }
  };

  const excluir = async (c: EmailCampaign) => {
    const ok = await confirm({
      title: 'Excluir rascunho',
      message: `"${c.name}" some da lista. Não dá para desfazer.`,
      confirmText: 'Excluir rascunho',
      cancelText: 'Manter',
    });
    if (!ok) return;
    setEmAcao(c.id);
    try {
      await api.delete(`/marketing/campaigns/${c.id}/`);
      toast.success('Rascunho excluído');
      carregar();
    } catch {
      toast.error('Não foi possível excluir o rascunho');
    } finally {
      setEmAcao(null);
    }
  };

  const acoesDa = (c: EmailCampaign): RowAction[] => {
    const ocupada = emAcao === c.id;
    const acoes: RowAction[] = [];
    if (c.status === 'draft') acoes.push({ rotulo: 'Enviar agora', desabilitada: ocupada, onClick: () => enviar(c) });
    acoes.push({ rotulo: 'Ver destinatários', onClick: () => abrirDestinatarios(c) });
    if (c.status === 'draft') acoes.push({ rotulo: 'Excluir rascunho', destrutiva: true, desabilitada: ocupada, onClick: () => excluir(c) });
    return acoes;
  };

  // ── Números ────────────────────────────────────────────────────────────────
  const numeros = useMemo(() => {
    const hoje = new Date();
    const soma = (campo: 'emails_delivered' | 'emails_opened' | 'emails_clicked') =>
      campaigns.reduce((a, c) => a + (c[campo] ?? 0), 0);
    const entregues = soma('emails_delivered');
    const abertos = soma('emails_opened');
    const cliques = soma('emails_clicked');
    return {
      enviadosNoMes: campaigns
        .filter((c) => mesmoMes(c.completed_at ?? c.started_at, hoje))
        .reduce((a, c) => a + (c.emails_sent ?? 0), 0),
      entregues,
      abertos,
      cliques,
      abertura: pct(abertos, entregues),
      cliqueSobreAbertura: pct(cliques, abertos),
      agendadas: campaigns.filter((c) => c.status === 'scheduled').length,
    };
  }, [campaigns]);

  // ── Tabela ─────────────────────────────────────────────────────────────────
  const colunas: ColunaDaTabela<EmailCampaign>[] = [
    {
      chave: 'nome',
      cabecalho: 'Campanha',
      render: (c) => (
        <span className="block min-w-0">
          <span className="block truncate font-medium text-fg-token">{c.name}</span>
          <span className="block truncate text-caption text-fg-muted-token">{c.subject}</span>
        </span>
      ),
    },
    { chave: 'quando', cabecalho: 'Quando', render: (c) => <span className="text-fg-muted-token">{quando(c)}</span> },
    {
      chave: 'para',
      cabecalho: 'Para quantos',
      alinhamento: 'direita',
      render: (c) => <span className="tabular-nums">{c.total_recipients ?? 0}</span>,
    },
    {
      chave: 'abertos',
      cabecalho: 'Abertos',
      render: (c) => {
        const taxa = pct(c.emails_opened ?? 0, c.emails_delivered ?? 0);
        return taxa === null ? (
          <span className="text-fg-muted-token">—</span>
        ) : (
          <Progresso pct={taxa} rotulo={`Abertos em ${c.name}`} mostrarValor className="min-w-[7rem]" />
        );
      },
    },
    {
      chave: 'estado',
      cabecalho: 'Estado',
      render: (c) => {
        const e = estadoDeCampanha(c.status);
        return (
          <SeloDeEstado tone={e.tone} ponto={c.status === 'sending'}>
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

  return (
    <PageShell
      trilha={[{ rotulo: 'Campanhas', href: '/marketing' }, { rotulo: 'E-mail' }]}
      titulo="Campanhas de e-mail"
      descricao="O que saiu, quem abriu e quem clicou. Clique numa campanha para ver os destinatários."
      acoes={estado === 'lista' ? criar : undefined}
    >
      {estado === 'lista' && (
        <section aria-label="Números das campanhas">
          <KpiGrid
            itens={[
              {
                label: 'Enviados no mês',
                value: numeros.enviadosNoMes,
                definicao: 'e-mails de campanhas enviadas neste mês',
              },
              {
                label: 'Abertura',
                value: numeros.abertura === null ? '—' : `${numeros.abertura}%`,
                definicao:
                  numeros.abertura === null
                    ? 'nenhum e-mail entregue ainda'
                    : `${numeros.abertos} de ${numeros.entregues} entregues foram abertos`,
              },
              {
                label: 'Cliques',
                value: numeros.cliqueSobreAbertura === null ? '—' : `${numeros.cliqueSobreAbertura}%`,
                definicao: 'de quem abriu, quantos clicaram num link',
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
            icone={<EnvelopeIcon className="h-10 w-10" />}
            titulo="Não foi possível carregar as campanhas"
            descricao="A conexão falhou. Isso não quer dizer que não há campanhas: tente de novo."
            acao={<Button variant="secondary" onClick={() => carregar()}>Tentar de novo</Button>}
          />
        </div>
      ) : estado === 'vazio' ? (
        <div className="superficie">
          <EmptyState
            icone={<EnvelopeIcon className="h-10 w-10" />}
            titulo="Nenhuma campanha de e-mail ainda"
            descricao="Escolha um modelo, escreva o assunto e envie para seus contatos."
            acao={criar}
          />
        </div>
      ) : (
        <Secao titulo="Campanhas" contador={estado === 'lista' ? campaigns.length : undefined}>
          <Tabela<EmailCampaign>
            itens={campaigns}
            colunas={colunas}
            chave={(c) => c.id}
            rotuloDaLinha={(c) => `Ver destinatários de ${c.name}`}
            onAbrir={abrirDestinatarios}
            carregando={estado === 'carregando'}
          />
        </Secao>
      )}

      <Modal
        open={Boolean(aberta)}
        onClose={() => {
          setAberta(null);
          setRecipients([]);
        }}
        title={aberta ? `Destinatários de ${aberta.name}` : 'Destinatários'}
        size="xl"
      >
        {carregandoDestinatarios ? (
          <TableSkeleton rows={4} columns={4} />
        ) : recipients.length === 0 ? (
          <EmptyState
            icone={<EnvelopeIcon className="h-10 w-10" />}
            titulo="Nenhum destinatário ainda"
            descricao="A lista é montada quando a campanha é enviada."
          />
        ) : (
          <div className="space-y-4">
            <KpiGrid
              itens={[
                { label: 'Destinatários', value: recipients.length, definicao: 'quantos entraram nesta campanha' },
                {
                  label: 'Entregues',
                  value: recipients.filter((r) => ENTREGUES.includes(r.status)).length,
                  definicao: 'saíram e chegaram na caixa de entrada',
                },
                {
                  label: 'Abertos',
                  value: recipients.filter((r) => ABERTOS.includes(r.status)).length,
                  definicao: 'é este número que diz se o assunto funcionou',
                },
                {
                  label: 'Falhas',
                  value: recipients.filter((r) => FALHAS.includes(r.status)).length,
                  definicao: 'endereço inválido ou recusado pelo servidor',
                  tone: recipients.some((r) => FALHAS.includes(r.status)) ? 'danger' : 'default',
                },
              ]}
            />

            <div className="max-h-96 overflow-y-auto">
              <Tabela<CampaignRecipient>
                itens={recipients}
                chave={(r) => String(r.id)}
                rotuloDaLinha={(r) => r.email}
                colunas={[
                  { chave: 'email', cabecalho: 'E-mail', render: (r) => r.email },
                  { chave: 'nome', cabecalho: 'Nome', soNoDesktop: true, render: (r) => r.name || '—' },
                  {
                    chave: 'estado',
                    cabecalho: 'Estado',
                    render: (r) => {
                      const e = estadoDeEnvio(r.status);
                      return <SeloDeEstado tone={e.tone}>{e.rotulo}</SeloDeEstado>;
                    },
                  },
                  {
                    chave: 'enviado',
                    cabecalho: 'Enviado em',
                    render: (r) => (r.sent_at ? format(new Date(r.sent_at), 'dd/MM HH:mm') : '—'),
                  },
                  {
                    chave: 'erro',
                    cabecalho: 'Motivo da falha',
                    soNoDesktop: true,
                    render: (r) =>
                      r.error_message ? (
                        <span className="block max-w-xs truncate text-danger-token" title={r.error_message}>
                          {r.error_message}
                        </span>
                      ) : (
                        <span className="text-fg-muted-token">—</span>
                      ),
                  },
                ]}
              />
            </div>
          </div>
        )}
      </Modal>
      {ConfirmDialog}
    </PageShell>
  );
};

export default CampaignsListPage;
