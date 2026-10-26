/**
 * Vigias — o painel avisa o dono no WhatsApp, sem ele precisar abrir o painel.
 *
 * Modelo de tela tirado de quem já faz isso: os "agentes" do Toast IQ (cada
 * vigia é um cartão com o que vigia, quando roda e um interruptor), o alerta do
 * Metabase (histórico do que disparou) e a prévia da mensagem como ela chega no
 * celular. A regra que decide mora no backend; aqui se liga, ajusta e confere.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ArrowPathIcon,
  ArrowTrendingDownIcon,
  BellSlashIcon,
  CurrencyDollarIcon,
  EyeIcon,
  HandThumbDownIcon,
  HandThumbUpIcon,
  PaperAirplaneIcon,
  ReceiptPercentIcon,
  SunIcon,
  UserMinusIcon,
} from '@heroicons/react/24/outline';

import {
  Button,
  EmptyState,
  FalhaAoCarregar,
  Input,
  PageShell,
  Secao,
  SeloDeEstado,
  Skeleton,
  Switch,
} from '../../components/ui';
import { useStore } from '../../hooks/useStore';
import { cn } from '../../utils/cn';
import { estadoDaLista } from '../../utils/estadoDaLista';
import {
  vigiasService,
  explicarCanal,
  explicarEnvio,
  formatarTelefone,
  type AvisoDeVigia,
  type ConfigDosVigias,
  type PainelDosVigias,
  type TipoDeVigia,
} from '../../services/vigias';
import { MensagemDoWhatsApp } from './MensagemDoWhatsApp';

const ICONES: Record<string, React.ComponentType<{ className?: string }>> = {
  sunrise: SunIcon,
  'bell-off': BellSlashIcon,
  'trending-down': ArrowTrendingDownIcon,
  'user-x': UserMinusIcon,
  percent: ReceiptPercentIcon,
  'circle-dollar-sign': CurrencyDollarIcon,
};

const DIAS = [
  { valor: 0, curto: 'S', nome: 'segunda' },
  { valor: 1, curto: 'T', nome: 'terça' },
  { valor: 2, curto: 'Q', nome: 'quarta' },
  { valor: 3, curto: 'Q', nome: 'quinta' },
  { valor: 4, curto: 'S', nome: 'sexta' },
  { valor: 5, curto: 'S', nome: 'sábado' },
  { valor: 6, curto: 'D', nome: 'domingo' },
];

const quando = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

const diaDoAviso = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

/** Primeira mensagem de campo que o backend devolveu, para o toast. */
function motivoDoErro(erro: unknown): string {
  const dados = (erro as { response?: { data?: { campos?: Record<string, string>; error?: string } } }).response?.data;
  const campo = dados?.campos && Object.values(dados.campos)[0];
  return campo || dados?.error || 'Não consegui salvar. A configuração continua como estava.';
}

export const VigiasPage: React.FC = () => {
  const { storeId, storeSlug } = useStore();
  const loja = storeSlug || storeId || '';
  const queryClient = useQueryClient();
  const chave = ['vigias', loja];

  const painel = useQuery({ queryKey: chave, queryFn: () => vigiasService.painel(loja), enabled: !!loja });
  const avisos = useQuery({ queryKey: ['vigias-avisos', loja], queryFn: () => vigiasService.avisos(loja, 40), enabled: !!loja });
  const previa = useQuery({ queryKey: ['vigias-previa', loja], queryFn: () => vigiasService.previa(loja), enabled: !!loja });

  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [horas, setHoras] = useState({ hora_resumo: '08:00', hora_alerta: '12:30' });
  useEffect(() => {
    if (!painel.data) return;
    setTelefone(formatarTelefone(painel.data.config.telefone));
    setEmail(painel.data.config.email ?? '');
    setHoras({ hora_resumo: painel.data.config.hora_resumo, hora_alerta: painel.data.config.hora_alerta });
  }, [painel.data]);

  const salvar = useMutation({
    mutationFn: (mudancas: Partial<ConfigDosVigias>) => vigiasService.salvar(loja, mudancas),
    onMutate: async (mudancas) => {
      await queryClient.cancelQueries({ queryKey: chave });
      const antes = queryClient.getQueryData<PainelDosVigias>(chave);
      if (antes) queryClient.setQueryData(chave, { ...antes, config: { ...antes.config, ...mudancas } });
      return { antes };
    },
    onError: (erro, _m, ctx) => {
      if (ctx?.antes) queryClient.setQueryData(chave, ctx.antes);
      toast.error(motivoDoErro(erro));
    },
    onSuccess: (dados) => {
      queryClient.setQueryData(chave, dados);
      void queryClient.invalidateQueries({ queryKey: ['vigias-previa', loja] });
    },
  });

  const testar = useMutation({
    mutationFn: () => vigiasService.testar(loja),
    onSuccess: (r) => {
      if (r.status === 'enviado') toast.success('Mensagem de teste enviada. Confira o WhatsApp.');
      else toast.error(r.erro || 'A mensagem não chegou no WhatsApp.', { duration: 8000 });
    },
    onError: (erro) => toast.error(motivoDoErro(erro)),
  });

  const pedirModelo = useMutation({
    mutationFn: () => vigiasService.pedirModelo(loja),
    onSuccess: () => {
      toast.success('Pedido enviado à Meta. A aprovação costuma sair em algumas horas.');
      void queryClient.invalidateQueries({ queryKey: chave });
    },
    onError: (erro) => toast.error(motivoDoErro(erro)),
  });

  const marcar = useMutation({
    mutationFn: ({ id, util }: { id: string; util: boolean | null }) => vigiasService.marcarUtil(loja, id, util),
    onSuccess: (atualizado) => {
      queryClient.setQueryData<AvisoDeVigia[]>(['vigias-avisos', loja], (lista) =>
        (lista || []).map((a) => (a.id === atualizado.id ? atualizado : a)));
    },
    onError: () => toast.error('Não consegui registrar.'),
  });

  const d = painel.data;
  const config = d?.config;
  const canal = d ? explicarCanal(d.canal, config?.telefone || '') : null;

  const alternarTipo = (tipo: TipoDeVigia, ligado: boolean) => {
    if (!config) return;
    const desligados = ligado ? config.desligados.filter((t) => t !== tipo) : [...config.desligados, tipo];
    salvar.mutate({ desligados });
  };

  const alternarDia = (dia: number) => {
    if (!config) return;
    const dias = config.dias.includes(dia) ? config.dias.filter((x) => x !== dia) : [...config.dias, dia].sort();
    if (config.ativo && dias.length === 0) {
      toast.error('Escolha pelo menos um dia.');
      return;
    }
    salvar.mutate({ dias });
  };

  const gravarTelefone = () => {
    if (!config) return;
    const digitos = telefone.replace(/\D/g, '');
    if (digitos === config.telefone.replace(/^55/, '') || digitos === config.telefone) return;
    salvar.mutate({ telefone: digitos });
  };

  const gravarEmail = () => {
    if (!config || email.trim().toLowerCase() === (config.email ?? '')) return;
    salvar.mutate({ email: email.trim() });
  };

  const gravarHora = (campo: 'hora_resumo' | 'hora_alerta') => {
    if (!config || !horas[campo] || horas[campo] === config[campo]) return;
    salvar.mutate({ [campo]: horas[campo] });
  };

  const porDia = useMemo(() => {
    const grupos: { dia: string; itens: AvisoDeVigia[] }[] = [];
    for (const a of avisos.data || []) {
      const dia = diaDoAviso(a.criado_em);
      const ultimo = grupos[grupos.length - 1];
      if (ultimo && ultimo.dia === dia) ultimo.itens.push(a);
      else grupos.push({ dia, itens: [a] });
    }
    return grupos;
  }, [avisos.data]);

  const estadoDoHistorico = estadoDaLista({
    temDados: avisos.data !== undefined,
    buscando: avisos.isLoading,
    falhou: avisos.isError,
    quantidade: avisos.data?.length || 0,
  });

  const ligados = d ? d.catalogo.filter((v) => !config?.desligados.includes(v.tipo)).length : 0;

  return (
    <PageShell
      titulo="Vigias"
      selo={config && (
        config.ativo && !config.pausado
          ? <SeloDeEstado tone="success" ponto>Ligados</SeloDeEstado>
          : <SeloDeEstado tone="neutral" ponto>{config.pausado ? 'Pausados' : 'Desligados'}</SeloDeEstado>
      )}
      acoes={config && (
        <div className="flex flex-wrap items-center gap-2">
          {config.ativo && (
            <Button variant="outline" onClick={() => salvar.mutate({ pausado: !config.pausado })} disabled={salvar.isPending}>
              {config.pausado ? 'Retomar' : 'Pausar'}
            </Button>
          )}
          <Button
            leftIcon={<PaperAirplaneIcon className="h-4 w-4" />}
            onClick={() => testar.mutate()}
            isLoading={testar.isPending}
            disabled={!config.telefone}
            title={config.telefone ? 'Manda a prévia de agora para o seu WhatsApp' : 'Cadastre o celular que recebe'}
          >
            Enviar teste
          </Button>
        </div>
      )}
    >
      {painel.isError ? (
        <FalhaAoCarregar titulo="Não consegui carregar os vigias." onTentarDeNovo={() => void painel.refetch()} />
      ) : !d || !config ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      ) : (
        <>
          {!config.ativo && (
            <EmptyState
              variante="ativacao"
              estado="Desligados"
              titulo="Seu gerente de olho na loja, no WhatsApp"
              beneficios={[
                { titulo: 'Resumo toda manhã', descricao: 'Pedidos e vendas de ontem contra o normal.' },
                { titulo: 'Alerta quando algo foge', descricao: 'Sabor em queda, almoço parado.' },
                { titulo: 'Só fala quando tem o que dizer', descricao: 'No máximo uma mensagem por turno.' },
              ]}
              acao={(
                <Button onClick={() => salvar.mutate({ ativo: true })} isLoading={salvar.isPending}>
                  Ligar vigias
                </Button>
              )}
            />
          )}

          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="flex min-w-0 flex-col gap-4">
              <Secao
                titulo="Quem recebe e quando"
                acoes={canal && <SeloDeEstado tone={canal.tom} ponto>{canal.texto}</SeloDeEstado>}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-3 text-sm text-fg-token sm:col-span-2">
                    <Switch
                      ligado={config.ativo}
                      onMudar={(v) => salvar.mutate({ ativo: v })}
                      rotulo="Vigias ligados"
                      desabilitado={salvar.isPending}
                    />
                    <span aria-hidden>Vigias ligados</span>
                  </div>
                  <Input
                    label="Celular que recebe"
                    inputMode="tel"
                    placeholder="(63) 99999-0000"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    onBlur={gravarTelefone}
                  />
                  <Input
                    label="E-mail que recebe (opcional)"
                    type="email"
                    placeholder="voce@loja.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={gravarEmail}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Resumo"
                      type="time"
                      value={horas.hora_resumo}
                      onChange={(e) => setHoras({ ...horas, hora_resumo: e.target.value })}
                      onBlur={() => gravarHora('hora_resumo')}
                    />
                    <Input
                      label="Alerta a partir de"
                      type="time"
                      value={horas.hora_alerta}
                      onChange={(e) => setHoras({ ...horas, hora_alerta: e.target.value })}
                      onBlur={() => gravarHora('hora_alerta')}
                    />
                  </div>
                  <fieldset className="sm:col-span-2">
                    <legend className="mb-1.5 text-sm font-medium text-fg-token">Dias de loja aberta</legend>
                    <div className="flex flex-wrap gap-1.5">
                      {DIAS.map((dia) => {
                        const ligado = config.dias.includes(dia.valor);
                        return (
                          <button
                            key={dia.valor}
                            type="button"
                            aria-pressed={ligado}
                            aria-label={dia.nome}
                            title={dia.nome}
                            onClick={() => alternarDia(dia.valor)}
                            className={cn(
                              'h-9 w-9 rounded-pill border text-sm font-semibold transition-colors',
                              ligado
                                ? 'border-brand bg-brand text-on-brand'
                                : 'border-border-token text-fg-muted-token hover:border-brand',
                            )}
                          >
                            {dia.curto}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                  {canal?.acao === 'pedir_modelo' && (
                    <div className="sm:col-span-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => pedirModelo.mutate()}
                        isLoading={pedirModelo.isPending}
                        title="A Meta aprova uma vez a mensagem de aviso; depois ela chega todo dia"
                      >
                        Pedir aprovação à Meta
                      </Button>
                    </div>
                  )}
                  {canal?.acao === 'conectar' && (
                    <div className="sm:col-span-2">
                      <Link to="/connections" className="text-sm font-medium text-brand-ink underline-offset-2 hover:underline">
                        Conectar o WhatsApp
                      </Link>
                    </div>
                  )}
                </div>
              </Secao>

              <Secao titulo="Vigias" contador={ligados}>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {d.catalogo.map((vigia) => {
                    const Icone = ICONES[vigia.icone] || EyeIcon;
                    const ligado = !config.desligados.includes(vigia.tipo);
                    return (
                      <li
                        key={vigia.tipo}
                        className={cn(
                          'flex flex-col gap-2 rounded-md border p-3 transition-opacity',
                          ligado ? 'border-border-token' : 'border-dashed border-border-token opacity-60',
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand-ink">
                            <Icone className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-fg-token">{vigia.nome}</p>
                            <p className="text-xs text-fg-muted-token">{vigia.quando}</p>
                          </div>
                          <Switch
                            ligado={ligado}
                            onMudar={(v) => alternarTipo(vigia.tipo, v)}
                            rotulo={vigia.nome}
                            desabilitado={salvar.isPending}
                          />
                        </div>
                        <blockquote className="rounded-md bg-surface-2 px-2.5 py-2 text-xs leading-relaxed text-fg-muted-token">
                          {vigia.exemplo}
                        </blockquote>
                      </li>
                    );
                  })}
                </ul>
              </Secao>

              <Secao titulo="Histórico" contador={avisos.data?.length}>
                {estadoDoHistorico === 'carregando' && <Skeleton className="h-40" />}
                {estadoDoHistorico === 'falhou' && (
                  <FalhaAoCarregar titulo="Não consegui carregar o histórico." onTentarDeNovo={() => void avisos.refetch()} />
                )}
                {estadoDoHistorico === 'vazio' && (
                  <EmptyState titulo="Nenhum aviso ainda" icone={<EyeIcon className="h-8 w-8" />} />
                )}
                {estadoDoHistorico === 'lista' && (
                  <div className="flex flex-col gap-5">
                    {porDia.map((grupo) => (
                      <div key={grupo.dia}>
                        <h3 className="overline mb-2 first-letter:uppercase">{grupo.dia}</h3>
                        <ul className="divide-y divide-border-token">
                          {grupo.itens.map((aviso) => (
                            <LinhaDoAviso
                              key={aviso.id}
                              aviso={aviso}
                              icone={ICONES[d.catalogo.find((v) => v.tipo === aviso.tipo)?.icone || ''] || EyeIcon}
                              onUtil={(util) => marcar.mutate({ id: aviso.id, util })}
                            />
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </Secao>
            </div>

            <aside className="lg:sticky lg:top-4">
              <Secao
                titulo="Como chega"
                acoes={(
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Atualizar prévia"
                    title="Atualizar prévia"
                    onClick={() => void previa.refetch()}
                    isLoading={previa.isFetching}
                  >
                    <ArrowPathIcon className="h-4 w-4" />
                  </Button>
                )}
              >
                {previa.isError ? (
                  <FalhaAoCarregar titulo="Não consegui montar a prévia." onTentarDeNovo={() => void previa.refetch()} />
                ) : previa.isLoading ? (
                  <Skeleton className="h-64" />
                ) : previa.data?.mensagem ? (
                  <MensagemDoWhatsApp texto={previa.data.mensagem} rodape={`Prévia de ${previa.data.dia}`} />
                ) : (
                  <EmptyState titulo="Nada a avisar agora" icone={<EyeIcon className="h-8 w-8" />} />
                )}
              </Secao>
            </aside>
          </div>
        </>
      )}
    </PageShell>
  );
};

const LinhaDoAviso: React.FC<{
  aviso: AvisoDeVigia;
  icone: React.ComponentType<{ className?: string }>;
  onUtil: (util: boolean | null) => void;
}> = ({ aviso, icone: Icone, onUtil }) => {
  const envio = explicarEnvio(aviso.envio);
  return (
    <li className="flex gap-3 py-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-2 text-fg-muted-token">
        <Icone className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-fg-token">{aviso.titulo}</p>
          <SeloDeEstado tone={envio.tom}>{envio.texto}</SeloDeEstado>
        </div>
        <p className="mt-0.5 text-sm text-fg-token">{aviso.texto}</p>
        <div className="mt-1 flex items-center gap-3 text-xs text-fg-muted-token">
          <time dateTime={aviso.criado_em}>{quando(aviso.criado_em)}</time>
          {aviso.envio?.erro && aviso.envio.status !== 'enviado' && (
            <span className="truncate" title={aviso.envio.erro}>{aviso.envio.erro}</span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-start gap-1">
        <button
          type="button"
          aria-label="Aviso útil"
          aria-pressed={aviso.util === true}
          title="Útil"
          onClick={() => onUtil(aviso.util === true ? null : true)}
          className={cn('rounded-md p-1.5 hover:bg-surface-2', aviso.util === true ? 'text-[var(--success)]' : 'text-fg-muted-token')}
        >
          <HandThumbUpIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Aviso não útil"
          aria-pressed={aviso.util === false}
          title="Não ajudou"
          onClick={() => onUtil(aviso.util === false ? null : false)}
          className={cn('rounded-md p-1.5 hover:bg-surface-2', aviso.util === false ? 'text-[var(--danger)]' : 'text-fg-muted-token')}
        >
          <HandThumbDownIcon className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
};

export default VigiasPage;
