/**
 * Promoção do dia — sai sozinha, todo dia, com o card daquele dia.
 *
 * 28/09: a Cê Saladas mandava a oferta do dia à mão (16 a 24/09) e parou
 * quando o dono parou. Aqui ele liga uma vez: hora, se anuncia a de hoje ou
 * a de amanhã, grátis para quem falou em 24 h ou pelo modelo aprovado para
 * todos, e um card por dia da semana. O backend cria a campanha e ela aparece
 * no histórico daqui e em Campanha WhatsApp.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';

import {
  Badge,
  Button,
  EmptyState,
  FalhaAoCarregar,
  Input,
  PageShell,
  Secao,
  Select,
  Switch,
  Tabela,
  Textarea,
  type ColunaDaTabela,
} from '../../../components/ui';
import { useStore } from '../../../hooks/useStore';
import { useRootStore } from '../../../stores/rootStore';
import { updateStore } from '../../../services/storesApi';
import { campaignsService } from '../../../services/campaigns';
import { promoDoDiaService, type ConfigDaPromoDoDia, type EnvioDaPromo } from '../../../services/promoDoDia';
import { CHAVE_PROMO, CONFIG_PADRAO, DIAS, explicarMotivo, validarConfig } from './promoDoDia';

const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export const PromocaoDoDiaPage: React.FC = () => {
  const { storeId, storeSlug, store } = useStore();
  const loja = storeSlug || storeId || '';
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<ConfigDaPromoDoDia>(CONFIG_PADRAO);
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [subindo, setSubindo] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const chave = ['promo-do-dia', loja];
  const consulta = useQuery({ queryKey: chave, queryFn: () => promoDoDiaService.painel(loja), enabled: !!loja });
  useEffect(() => {
    if (consulta.data) setConfig({ ...CONFIG_PADRAO, ...consulta.data.config });
  }, [consulta.data]);

  const gravar = async (nova: ConfigDaPromoDoDia): Promise<boolean> => {
    const problema = validarConfig(nova);
    if (problema) {
      toast.error(problema);
      return false;
    }
    if (!storeId) return false;
    setSalvando(true);
    try {
      const salva = await updateStore(storeId, { metadata: { ...(store?.metadata || {}), [CHAVE_PROMO]: nova } });
      const { stores, setStores } = useRootStore.getState();
      setStores(stores.map((s) => (s.id === salva.id ? { ...s, ...salva } : s)));
      setConfig(nova);
      toast.success(nova.ativo ? `Promoção do dia ligada: sai todo dia às ${nova.hora}.` : 'Configuração salva.');
      void queryClient.invalidateQueries({ queryKey: chave });
      return true;
    } catch {
      toast.error('Não consegui salvar. A configuração continua como estava.');
      return false;
    } finally {
      setSalvando(false);
    }
  };

  const subirCard = async (dia: string, arquivo: File) => {
    setSubindo(dia);
    try {
      const { media_url } = await campaignsService.uploadCampaignMedia(arquivo);
      const nova = { ...config, cards: { ...config.cards, [dia]: media_url } };
      setConfig(nova);
      await gravar(nova);
    } catch {
      toast.error('Não consegui subir a imagem.');
    } finally {
      setSubindo(null);
    }
  };

  const removerCard = (dia: string) => {
    const cards = { ...config.cards };
    delete cards[dia];
    void gravar({ ...config, cards });
  };

  const enviarAgora = async () => {
    setEnviando(true);
    try {
      const r = await promoDoDiaService.dispararAgora(loja);
      const { ok, texto } = explicarMotivo(r.motivo);
      (ok ? toast.success : toast.error)(texto, { duration: 7000 });
      void queryClient.invalidateQueries({ queryKey: chave });
    } catch {
      toast.error('Não consegui enviar agora.');
    } finally {
      setEnviando(false);
    }
  };

  const colunas: ColunaDaTabela<EnvioDaPromo>[] = [
    { chave: 'dia', cabecalho: 'Promoção de', render: (e) => <span className="text-sm text-fg-token">{e.dia ? new Date(`${e.dia}T12:00:00`).toLocaleDateString('pt-BR') : '—'}</span> },
    { chave: 'modo', cabecalho: 'Como', render: (e) => <Badge tone="neutral">{e.modo === 'modelo' ? 'Modelo (todos)' : 'Grátis (janela)'}</Badge> },
    { chave: 'enviadas', cabecalho: 'Enviadas', render: (e) => <span className="text-sm text-fg-token">{e.enviadas} de {e.destinatarios}</span> },
    { chave: 'status', cabecalho: 'Situação', render: (e) => <span className="text-sm text-fg-muted-token">{e.status === 'completed' ? 'Concluída' : e.status === 'running' ? 'Enviando' : e.status === 'scheduled' ? 'Saindo ao longo do dia' : e.status}</span> },
    { chave: 'criada', cabecalho: 'Criada em', soNoDesktop: true, render: (e) => <time className="text-sm text-fg-muted-token">{quando(e.criada_em)}</time> },
  ];

  const d = consulta.data;

  return (
    <PageShell
      titulo="Promoção do dia"
      acoes={(
        <Button leftIcon={<PaperAirplaneIcon className="h-4 w-4" />} onClick={() => void enviarAgora()} isLoading={enviando} disabled={!d?.tem_whatsapp}>
          Enviar agora
        </Button>
      )}
    >
      {consulta.isError ? (
        <FalhaAoCarregar titulo="Não consegui carregar a promoção do dia." onTentarDeNovo={() => void consulta.refetch()} />
      ) : d && (
        <>
          {!d.tem_whatsapp && (
            <EmptyState titulo="A loja não tem WhatsApp conectado" descricao="Conecte o WhatsApp em Configurações para a promoção sair por aqui." />
          )}

          <Secao titulo="Quando e como sai">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex items-center gap-3 text-sm text-fg-token sm:col-span-2">
                <Switch ligado={config.ativo} onMudar={(v) => void gravar({ ...config, ativo: v })} rotulo="Enviar a promoção do dia automaticamente" desabilitado={salvando} />
                Enviar automaticamente todo dia
              </label>
              <Input label="Horário do envio" type="time" value={config.hora} onChange={(e) => setConfig({ ...config, hora: e.target.value })} onBlur={() => void gravar(config)} />
              <Select
                rotulo="Para quem"
                opcoes={[
                  { valor: 'janela', rotulo: 'Grátis: quem falou com a loja nas últimas 24 h' },
                  { valor: 'modelo', rotulo: 'Modelo aprovado: todos os contatos (pago por mensagem)' },
                ]}
                valor={config.modo}
                onMudar={(v) => void gravar({ ...config, modo: v as ConfigDaPromoDoDia['modo'] })}
              />
              {config.modo === 'modelo' && (
                <Select
                  rotulo="Modelo aprovado"
                  opcoes={d.modelos.map((m) => ({ valor: m, rotulo: m }))}
                  valor={config.modelo}
                  onMudar={(v) => void gravar({ ...config, modelo: v })}
                  vazio="Escolha o modelo"
                />
              )}
              <div className="sm:col-span-2">
                <Textarea
                  label="Texto (envio grátis)"
                  rows={5}
                  value={config.texto}
                  onChange={(e) => setConfig({ ...config, texto: e.target.value })}
                  onBlur={() => void gravar(config)}
                 
                  maxLength={1000}
                />
              </div>
            </div>
          </Secao>

          <Secao titulo="Cards por dia da semana">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {DIAS.map((dia) => {
                const url = config.cards[dia.valor];
                return (
                  <div key={dia.valor} className="superficie flex flex-col gap-2 p-2">
                    <p className="text-xs font-medium text-fg-token">{dia.rotulo}</p>
                    {url ? (
                      <img src={url} alt={`Card de ${dia.rotulo}`} className="aspect-square w-full rounded-md object-cover" />
                    ) : (
                      <div className="flex aspect-square w-full items-center justify-center rounded-md border border-dashed border-border-token text-xs text-fg-muted-token">Sem card</div>
                    )}
                    <input
                      ref={(el) => { inputs.current[dia.valor] = el; }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      aria-label={`Escolher card de ${dia.rotulo}`}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) void subirCard(dia.valor, f); e.target.value = ''; }}
                    />
                    <div className="flex gap-1">
                      <Button size="xs" variant="outline" isLoading={subindo === dia.valor} onClick={() => inputs.current[dia.valor]?.click()}>
                        {url ? 'Trocar' : 'Subir'}
                      </Button>
                      {url && <Button size="xs" variant="ghost" onClick={() => removerCard(dia.valor)}>Tirar</Button>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Secao>

          <Secao titulo="O que sairia agora">
            {d.previa ? (
              <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
                {d.previa.card ? <img src={d.previa.card} alt="Card do dia" className="aspect-square w-40 rounded-md object-cover" /> : <div className="flex aspect-square w-40 items-center justify-center rounded-md border border-dashed border-border-token text-xs text-fg-muted-token">Sem card</div>}
                <div>
                  <p className="text-xs text-fg-muted-token">{d.previa.quando}</p>
                  <pre className="whitespace-pre-wrap font-sans text-sm text-fg-token">{d.previa.texto.replace('{{nome}}', 'Ana').replace('{nome}', 'Ana')}</pre>
                </div>
              </div>
            ) : (
              <EmptyState titulo="Nenhuma promoção para esse dia" descricao="Marque o dia da semana e o preço promocional nos produtos. Sem promoção cadastrada, nada sai." />
            )}
          </Secao>

          <Secao titulo="Histórico" contador={d.historico.length}>
            {d.historico.length === 0 ? (
              <EmptyState titulo="Nenhum envio automático ainda" descricao="Ligue o envio automático ou use “Enviar agora”." />
            ) : (
              <Tabela itens={d.historico} colunas={colunas} chave={(e) => e.id} rotuloDaLinha={(e) => e.nome} />
            )}
          </Secao>
        </>
      )}
    </PageShell>
  );
};

export default PromocaoDoDiaPage;
