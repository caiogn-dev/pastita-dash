/**
 * Marketing — o ponto de partida das campanhas.
 *
 * Simples (25/09): a página redefinia StatCard, QuickAction e TemplateCard,
 * cada um com a sua cor (azul, verde, roxo, laranja, quatro degradês e um
 * rosa cru). Agora é o kit: números no KpiGrid, entradas em AcaoCard (chip
 * dourado, sem cor por cartão), modelos também em AcaoCard e campanhas
 * recentes numa Tabela com o estado no SeloDeEstado.
 */
import { formatNumber, formatPercent } from '../../utils/formatters';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ClockIcon,
  DevicePhoneMobileIcon,
  DocumentTextIcon,
  MegaphoneIcon,
  PlusIcon,
  SparklesIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

import {
  AcaoCard,
  Button,
  EmptyState,
  KpiGrid,
  Modal,
  PageShell,
  Secao,
  SeloDeEstado,
  StatsSkeleton,
  Tabela,
  TableSkeleton,
  estadoDeCampanha,
} from '../../components/ui';
import { useStore } from '../../hooks/useStore';
import { marketingService, EmailTemplate, MarketingStats } from '../../services/marketingService';
import logger from '../../services/logger';

interface CampanhaRecente {
  id: string;
  name: string;
  subject: string;
  status: string;
  emails_sent?: number;
  total_recipients?: number;
  created_at: string;
}

const numero = (n: number | undefined | null) => formatNumber(n ?? 0);
const percentual = (n: number | undefined | null) =>
  formatPercent(n ?? 0, 1);

export const MarketingPage: React.FC = () => {
  const navigate = useNavigate();
  const { storeId: routeStoreId } = useParams<{ storeId?: string }>();
  const { storeId: contextStoreId, stores } = useStore();

  const storeId = useMemo(() => {
    if (!routeStoreId) return contextStoreId || null;
    const match = (stores ?? []).find((s) => s.id === routeStoreId || s.slug === routeStoreId);
    return match?.id || contextStoreId || null;
  }, [routeStoreId, contextStoreId, stores]);

  const [carregando, setCarregando] = useState(true);
  const [falhou, setFalhou] = useState(false);
  const [stats, setStats] = useState<MarketingStats | null>(null);
  const [modelos, setModelos] = useState<EmailTemplate[]>([]);
  const [campanhas, setCampanhas] = useState<CampanhaRecente[]>([]);
  const [previa, setPrevia] = useState<EmailTemplate | null>(null);

  const carregar = useCallback(async () => {
    if (!storeId) {
      setCarregando(false);
      return;
    }
    setCarregando(true);
    setFalhou(false);
    try {
      const [statsData, modelosData, campanhasData] = await Promise.all([
        marketingService.stats.get(storeId),
        marketingService.emailTemplates.list(storeId),
        marketingService.emailCampaigns.list(storeId),
      ]);
      setStats(statsData);
      setModelos(modelosData);
      setCampanhas((campanhasData as unknown as CampanhaRecente[]).slice(0, 5));
    } catch (error) {
      logger.error('Error loading marketing data:', error);
      setFalhou(true);
    } finally {
      setCarregando(false);
    }
  }, [storeId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const usarModelo = (modelo: EmailTemplate) => navigate(`/marketing/email/new?template=${modelo.slug}`);

  if (!storeId) {
    return (
      <PageShell titulo="Marketing">
        <div className="superficie">
          <EmptyState
            icone={<MegaphoneIcon className="h-10 w-10" />}
            titulo="Escolha uma loja"
            descricao="As campanhas são de cada loja. Escolha uma para ver os números e criar campanhas."
            acao={<Button onClick={() => navigate('/stores')}>Ver lojas</Button>}
          />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      trilha={[{ rotulo: 'Campanhas' }, { rotulo: 'Marketing' }]}
      titulo="Marketing"
      descricao="Fale com quem já comprou de você, por WhatsApp ou e-mail."
      acoes={
        <Button
          variant="secondary"
          onClick={() => navigate('/marketing/subscribers')}
          leftIcon={<UserGroupIcon className="h-4 w-4" />}
        >
          Ver contatos
        </Button>
      }
    >
      {carregando ? (
        <div className="flex flex-col gap-5" aria-busy="true">
          <StatsSkeleton />
          <TableSkeleton rows={4} columns={3} />
        </div>
      ) : falhou ? (
        <div role="alert" className="superficie">
          <EmptyState
            icone={<MegaphoneIcon className="h-10 w-10" />}
            titulo="Não foi possível carregar o marketing"
            descricao="A conexão falhou. Seus números e campanhas continuam lá: tente de novo."
            acao={<Button variant="secondary" onClick={() => carregar()}>Tentar de novo</Button>}
          />
        </div>
      ) : (
        <>
          {stats && (
            <section aria-label="Números do marketing">
              <KpiGrid
                itens={[
                  {
                    label: 'E-mails enviados',
                    value: numero(stats.email?.total_sent),
                    definicao: `${percentual(stats.email?.open_rate)} foram abertos`,
                  },
                  {
                    label: 'WhatsApp enviados',
                    value: numero(stats.whatsapp?.total_sent),
                    definicao: `${percentual(stats.whatsapp?.read_rate)} foram lidos`,
                  },
                  {
                    label: 'Campanhas',
                    value: numero((stats.email?.total_campaigns ?? 0) + (stats.whatsapp?.total_campaigns ?? 0)),
                    definicao: 'e-mail e WhatsApp, em qualquer estado',
                  },
                  {
                    label: 'Contatos',
                    value: numero(stats.subscribers?.total),
                    definicao: `${numero(stats.subscribers?.new_this_month)} novos neste mês`,
                  },
                ]}
              />
            </section>
          )}

          <Secao titulo="Começar uma campanha" descricao="Escolha o que você quer fazer; o resto vem preenchido.">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <AcaoCard
                titulo="Campanha no WhatsApp"
                descricao="Escolha quem recebe e envie para a sua base."
                icone={DevicePhoneMobileIcon}
                onClick={() => navigate('/marketing/whatsapp/new')}
              />
              <AcaoCard
                titulo="Enviar cupom por e-mail"
                descricao="Um desconto para trazer o cliente de volta."
                icone={SparklesIcon}
                onClick={() => navigate('/marketing/email/new?template=coupon')}
              />
              <AcaoCard
                titulo="Anunciar promoção"
                descricao="Oferta por tempo limitado, por e-mail."
                icone={MegaphoneIcon}
                onClick={() => navigate('/marketing/email/new?template=promotion')}
              />
              <AcaoCard
                titulo="Recuperar carrinhos"
                descricao="Lembre quem deixou o pedido pela metade."
                icone={ClockIcon}
                onClick={() => navigate('/marketing/email/new?template=abandoned_cart')}
              />
            </div>
          </Secao>

          <Secao
            titulo="Campanhas recentes"
            acoes={
              campanhas.length > 0 ? (
                <Button variant="secondary" size="sm" onClick={() => navigate('/marketing/email')}>
                  Ver todas
                </Button>
              ) : undefined
            }
          >
            <Tabela<CampanhaRecente>
              itens={campanhas}
              chave={(c) => c.id}
              rotuloDaLinha={(c) => `Abrir campanhas de e-mail (${c.name})`}
              onAbrir={() => navigate('/marketing/email')}
              vazio={{
                titulo: 'Nenhuma campanha ainda',
                descricao: 'A primeira campanha aparece aqui assim que for criada.',
                icone: <MegaphoneIcon className="h-10 w-10" />,
                acao: (
                  <Button onClick={() => navigate('/marketing/email/new')} leftIcon={<PlusIcon className="h-4 w-4" />}>
                    Criar campanha
                  </Button>
                ),
              }}
              colunas={[
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
                {
                  chave: 'enviados',
                  cabecalho: 'Enviados',
                  alinhamento: 'direita',
                  render: (c) => <span className="tabular-nums">{numero(c.emails_sent)}</span>,
                },
                {
                  chave: 'estado',
                  cabecalho: 'Estado',
                  render: (c) => {
                    const e = estadoDeCampanha(c.status);
                    return <SeloDeEstado tone={e.tone}>{e.rotulo}</SeloDeEstado>;
                  },
                },
              ]}
            />
          </Secao>

          {modelos.length > 0 && (
            <Secao
              titulo="Modelos de e-mail"
              descricao="Abra um modelo para ver como ele chega e começar uma campanha com ele."
              acoes={
                <Button variant="secondary" size="sm" onClick={() => navigate('/marketing/email/templates')}>
                  Ver todos
                </Button>
              }
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {modelos.slice(0, 4).map((modelo) => (
                  <AcaoCard
                    key={modelo.id}
                    titulo={modelo.name}
                    descricao={modelo.subject}
                    icone={DocumentTextIcon}
                    onClick={() => setPrevia(modelo)}
                  />
                ))}
              </div>
            </Secao>
          )}
        </>
      )}

      <Modal open={Boolean(previa)} onClose={() => setPrevia(null)} title={previa?.name || 'Prévia do modelo'} size="xl">
        {previa && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-caption text-fg-muted-token">Assunto</p>
                <p className="font-medium text-fg-token">{previa.subject}</p>
              </div>
              <Button
                onClick={() => {
                  usarModelo(previa);
                  setPrevia(null);
                }}
              >
                Usar este modelo
              </Button>
            </div>
            <div className="superficie h-[500px] overflow-hidden">
              {/* sandbox="" bloqueia script, formulário e plugin: HTML de e-mail não é confiável. */}
              <iframe sandbox="" srcDoc={previa.html_content} className="h-full w-full border-0" title="Prévia do e-mail" />
            </div>
          </div>
        )}
      </Modal>
    </PageShell>
  );
};

export default MarketingPage;
