/**
 * Os textos que o bot manda sozinho, agrupados pelo momento da compra.
 *
 * Extraído da antiga "Mensagens prontas" (26/10) para servir duas telas sem
 * cópia: Avisos automáticos (Conversa, Pedido, Pagamento) e o Recuperador de
 * vendas (Lembretes de carrinho). Cada uma passa os grupos que lhe cabem.
 *
 * Só aparece o momento que tem texto; os outros moram atrás de "Adicionar
 * aviso". Antes eram 31 seções abertas, quase todas dizendo "nenhuma mensagem".
 *
 * `foco` (um evento ou um grupo) vem do "Editar texto" de um aviso que não
 * chegou: o momento aparece mesmo vazio, destacado e rolado até a vista.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PencilIcon, PlayIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

import { autoMessageService, eventTypeLabels } from '../../services/automation';
import { exemploDeVariaveis, previaDaMensagem, variaveisDoEvento } from '../../utils/variaveisDeMensagem';
import { estadoDaLista } from '../../utils/estadoDaLista';
import type { AutoMessage, AutoMessageEventType, CreateAutoMessage } from '../../types';
import { Loading } from '../../components/common/Loading';
import { useConfirm } from '../../hooks';
import {
  Aviso,
  Button,
  EmptyState,
  FalhaAoCarregar,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  NumberField,
  Secao,
  Select,
  SeloDeEstado,
  Switch,
  Textarea,
  estadoDeAutomacao,
} from '../../components/ui';
import { cn } from '../../utils/cn';
import { esperaEmTexto, idDoBotao, type GrupoDeAvisos } from './gruposDeAvisos';
import { usePerfilDeAutomacao } from './usePerfilDeAutomacao';

interface Props {
  grupos: GrupoDeAvisos[];
  /** Evento (`pix_reminder`) ou grupo (`pedido`) a destacar. */
  foco?: string | null;
  /** Rota antiga com o perfil na URL. */
  perfilId?: string;
  /** Recuperador: sem perfil, a seção some em vez de vender a ativação. */
  ocultarSemPerfil?: boolean;
}

const formularioVazio = (evento: AutoMessageEventType): CreateAutoMessage => ({
  account: '',
  company_id: '',
  event_type: evento,
  name: '',
  message_text: '',
  message_type: 'text',
  is_active: true,
  delay_seconds: 0,
  priority: 100,
  buttons: [],
});

export const TextosDosAvisos: React.FC<Props> = ({ grupos, foco, perfilId, ocultarSemPerfil = false }) => {
  const navigate = useNavigate();
  const { perfil, estado: estadoDoPerfil, tentarDeNovo } = usePerfilDeAutomacao(perfilId);
  const companyId = perfil?.id;

  const [mensagens, setMensagens] = useState<AutoMessage[]>([]);
  const [carregou, setCarregou] = useState(false);
  const [buscando, setBuscando] = useState(true);
  const [falhou, setFalhou] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  const [ConfirmDialog, confirm] = useConfirm();
  const textoRef = useRef<HTMLTextAreaElement>(null);
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<AutoMessage | null>(null);
  const [momentosDoForm, setMomentosDoForm] = useState<AutoMessageEventType[]>([]);
  const [form, setForm] = useState<CreateAutoMessage>(formularioVazio('welcome'));
  const [teste, setTeste] = useState<AutoMessage | null>(null);
  const [telefoneDoTeste, setTelefoneDoTeste] = useState('');
  const [previaDoTeste, setPreviaDoTeste] = useState<string | null>(null);

  const todosOsEventos = useMemo(() => grupos.flatMap((g) => g.eventos), [grupos]);

  useEffect(() => {
    // Sem perfil resolvido não busca: a lista sem company_id traria as
    // mensagens de todas as lojas que o usuário enxerga.
    if (!companyId) return undefined;
    let vivo = true;
    setBuscando(true);
    setFalhou(false);
    autoMessageService
      .list({ company_id: companyId, page_size: 200 })
      .then((r) => {
        if (!vivo) return;
        setMensagens(r.results ?? []);
        setCarregou(true);
      })
      .catch(() => {
        if (vivo) setFalhou(true);
      })
      .finally(() => {
        if (vivo) setBuscando(false);
      });
    return () => {
      vivo = false;
    };
  }, [companyId, tentativa]);

  const recarregar = () => setTentativa((n) => n + 1);

  const porEvento = useMemo(() => {
    const mapa = new Map<string, AutoMessage[]>();
    for (const m of mensagens) mapa.set(m.event_type, [...(mapa.get(m.event_type) ?? []), m]);
    return mapa;
  }, [mensagens]);

  // Rola até o momento pedido pelo "Editar texto" depois que a lista chega.
  useEffect(() => {
    if (!foco || !carregou) return;
    const alvo = document.getElementById(`aviso-${foco}`);
    alvo?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
  }, [foco, carregou]);

  const abrirNovo = (eventos: AutoMessageEventType[], evento?: AutoMessageEventType) => {
    const primeiroVazio = eventos.find((e) => !porEvento.has(e)) ?? eventos[0];
    setEditando(null);
    setMomentosDoForm(eventos);
    setForm(formularioVazio(evento ?? primeiroVazio));
    setAberto(true);
  };

  const abrirEdicao = (m: AutoMessage) => {
    setEditando(m);
    setMomentosDoForm(todosOsEventos.includes(m.event_type) ? todosOsEventos : [...todosOsEventos, m.event_type]);
    setForm({
      account: m.account,
      company_id: companyId || '',
      event_type: m.event_type,
      name: m.name,
      message_text: m.message_text,
      message_type: m.message_type,
      media_url: m.media_url || undefined,
      media_type: m.media_type || undefined,
      buttons: m.buttons,
      is_active: m.is_active,
      delay_seconds: m.delay_seconds,
      priority: m.priority,
    });
    setAberto(true);
  };

  const fechar = () => {
    setAberto(false);
    setEditando(null);
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    // O id do botão é o que a Meta devolve quando o cliente toca: sai do
    // título. Botão que já tinha id mantém o seu — o bot pode depender dele.
    const ids: string[] = [];
    const botoes = (form.buttons ?? [])
      .filter((b) => b.title.trim())
      .map((b) => {
        const id = b.id || idDoBotao(b.title, ids);
        ids.push(id);
        return { id, title: b.title.trim() };
      });
    const dados: CreateAutoMessage = {
      ...form,
      company_id: companyId || '',
      name: form.name.trim() || eventTypeLabels[form.event_type],
      buttons: botoes,
    };
    try {
      if (editando) {
        await autoMessageService.update(editando.id, dados);
        toast.success('Aviso salvo');
      } else {
        await autoMessageService.create(dados);
        toast.success('Aviso criado');
      }
      fechar();
      recarregar();
    } catch {
      toast.error('Não foi possível salvar o aviso');
    }
  };

  const excluir = async (m: AutoMessage) => {
    const ok = await confirm({ title: 'Excluir aviso', message: `Excluir "${m.name}"? O cliente deixa de receber este texto.` });
    if (!ok) return;
    try {
      await autoMessageService.delete(m.id);
      toast.success('Aviso excluído');
      recarregar();
    } catch {
      toast.error('Não foi possível excluir o aviso');
    }
  };

  const alternar = async (m: AutoMessage) => {
    try {
      await autoMessageService.update(m.id, { is_active: !m.is_active });
      setMensagens((lista) => lista.map((x) => (x.id === m.id ? { ...x, is_active: !m.is_active } : x)));
    } catch {
      toast.error('Não foi possível mudar o aviso');
    }
  };

  // Fechar o teste limpa o telefone e a prévia: reabrir com o número da vez
  // passada mostrando a prévia de OUTRA mensagem já mandou teste para o
  // contato errado.
  const fecharTeste = () => {
    setTeste(null);
    setTelefoneDoTeste('');
    setPreviaDoTeste(null);
  };

  const verTeste = async () => {
    if (!teste || !telefoneDoTeste) return;
    try {
      const r = await autoMessageService.test(teste.id, { phone_number: telefoneDoTeste, send: false });
      setPreviaDoTeste(r.rendered_message);
    } catch {
      toast.error('Não foi possível montar a prévia');
    }
  };

  const enviarTeste = async () => {
    if (!teste || !telefoneDoTeste) return;
    try {
      await autoMessageService.test(teste.id, { phone_number: telefoneDoTeste, send: true });
      toast.success('Teste enviado');
      fecharTeste();
    } catch {
      toast.error('Não foi possível enviar o teste');
    }
  };

  // Entra onde o cursor está, não no fim do texto.
  const inserirVariavel = (variavel: string) => {
    const campo = textoRef.current;
    const trecho = `{${variavel}}`;
    const texto = form.message_text;
    const inicio = campo?.selectionStart ?? texto.length;
    const fim = campo?.selectionEnd ?? texto.length;
    setForm((f) => ({ ...f, message_text: texto.slice(0, inicio) + trecho + texto.slice(fim) }));
    requestAnimationFrame(() => {
      if (!campo) return;
      campo.focus();
      campo.setSelectionRange(inicio + trecho.length, inicio + trecho.length);
    });
  };

  const mudarBotao = (indice: number, titulo: string) =>
    setForm((f) => ({ ...f, buttons: f.buttons?.map((b, i) => (i === indice ? { ...b, title: titulo } : b)) }));

  const previa = previaDaMensagem(form.message_text, form.event_type, exemploDeVariaveis(perfil));

  // ── Estados do perfil ────────────────────────────────────────────────────
  if (estadoDoPerfil === 'sem-perfil') {
    if (ocultarSemPerfil) return null;
    return (
      <EmptyState
        variante="ativacao"
        estado="Atendimento automático desligado"
        titulo="Conecte o WhatsApp da loja para o bot avisar sozinho"
        acao={<Button onClick={() => navigate('/connections')}>Conectar WhatsApp</Button>}
        beneficios={[
          { titulo: 'Fora do horário', descricao: 'Responde quando a loja está fechada.' },
          { titulo: 'Status do pedido', descricao: 'Avisa quando sai e quando chega.' },
          { titulo: 'PIX', descricao: 'Lembra quem gerou e não pagou.' },
        ]}
      />
    );
  }
  if (estadoDoPerfil === 'falhou') {
    return <FalhaAoCarregar titulo="Não foi possível carregar os avisos" onTentarDeNovo={tentarDeNovo} />;
  }

  const estado = estadoDaLista({ temDados: carregou, buscando: buscando || estadoDoPerfil === 'carregando', falhou, quantidade: mensagens.length });

  if (estado === 'carregando') {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loading size="md" rotulo="Carregando avisos" />
      </div>
    );
  }
  if (estado === 'falhou') {
    return <FalhaAoCarregar titulo="Não foi possível carregar os avisos" onTentarDeNovo={recarregar} />;
  }

  const linha = (m: AutoMessage) => {
    const situacao = estadoDeAutomacao(m.is_active);
    const espera = esperaEmTexto(m.delay_seconds);
    return (
      <li key={m.id} className="flex items-center justify-between gap-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium text-fg-token">{m.name}</span>
            <SeloDeEstado tone={situacao.tone}>{situacao.rotulo}</SeloDeEstado>
            {espera && <span className="text-xs text-fg-muted-token">{espera}</span>}
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-fg-muted-token">{m.message_text}</p>
          {m.buttons && m.buttons.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {m.buttons.map((b, i) => (
                <span key={i} className="inline-flex items-center rounded bg-surface-2 px-2 py-1 text-xs text-fg-token">
                  {b.title}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Switch ligado={m.is_active} onMudar={() => void alternar(m)} rotulo={`Aviso ${m.name} ligado`} />
          <Button size="sm" variant="ghost" onClick={() => setTeste(m)} aria-label="Testar" title="Testar">
            <PlayIcon className="h-5 w-5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => abrirEdicao(m)} aria-label="Editar" title="Editar">
            <PencilIcon className="h-5 w-5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => void excluir(m)} aria-label="Excluir" title="Excluir">
            <TrashIcon className="h-5 w-5" />
          </Button>
        </div>
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      {grupos.map((grupo) => {
        const visiveis = grupo.eventos.filter((e) => porEvento.has(e) || e === foco);
        const total = grupo.eventos.reduce((n, e) => n + (porEvento.get(e)?.length ?? 0), 0);
        return (
          <div key={grupo.id} id={`aviso-${grupo.id}`} className="scroll-mt-4">
            <Secao
              titulo={grupo.titulo}
              contador={total}
              acoes={(
                <Button size="sm" variant="outline" leftIcon={<PlusIcon className="h-4 w-4" />} onClick={() => abrirNovo(grupo.eventos)}>
                  Adicionar aviso
                </Button>
              )}
            >
              {visiveis.length === 0 ? (
                <p className="text-sm text-fg-muted-token">Nenhum aviso ligado aqui.</p>
              ) : (
                <div className="-my-3 divide-y divide-border-token">
                  {visiveis.map((evento) => {
                    const doEvento = porEvento.get(evento) ?? [];
                    return (
                      <div
                        key={evento}
                        id={`aviso-${evento}`}
                        className={cn('scroll-mt-4 py-3', evento === foco && '-mx-3 rounded px-3 ring-2 ring-brand')}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-sm font-semibold text-fg-token">{eventTypeLabels[evento]}</h3>
                          {doEvento.length === 0 && (
                            <Button size="sm" leftIcon={<PencilIcon className="h-4 w-4" />} onClick={() => abrirNovo(grupo.eventos, evento)}>
                              Escrever aviso
                            </Button>
                          )}
                        </div>
                        {doEvento.length > 0 && <ul className="divide-y divide-border-token">{doEvento.map(linha)}</ul>}
                      </div>
                    );
                  })}
                </div>
              )}
            </Secao>
          </div>
        );
      })}

      <Modal open={aberto} onClose={fechar} size="lg" showCloseButton={false}>
        <form onSubmit={salvar} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ModalHeader title={editando ? 'Editar aviso' : 'Novo aviso'} />
          <ModalBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                rotulo="Quando enviar"
                valor={form.event_type}
                onMudar={(v) => setForm((f) => ({ ...f, event_type: v as AutoMessageEventType }))}
                opcoes={momentosDoForm.map((valor) => ({ valor, rotulo: eventTypeLabels[valor] ?? valor }))}
              />
              <Input
                label="Nome do aviso"
                value={form.name}
                placeholder={eventTypeLabels[form.event_type]}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div>
              <Textarea
                ref={textoRef}
                label="Texto"
                rows={5}
                value={form.message_text}
                onChange={(e) => setForm((f) => ({ ...f, message_text: e.target.value }))}
                required
              />
              <div className="mt-2 flex flex-wrap gap-1">
                {variaveisDoEvento(form.event_type).map((v) => (
                  <Button key={v.key} type="button" size="xs" variant="outline" onClick={() => inserirVariavel(v.key)} title={v.description}>
                    {`{${v.key}}`}
                  </Button>
                ))}
              </div>
              {previa.desconhecidas.length > 0 && (
                <Aviso tom="atencao" titulo="Variável que este aviso não preenche" className="mt-3">
                  {previa.desconhecidas.map((c) => `{${c}}`).join(', ')} chegaria assim ao cliente.
                </Aviso>
              )}
              {form.message_text.trim() && (
                <div className="mt-3">
                  <p className="mb-1 text-xs text-fg-muted-token">Prévia</p>
                  <div data-testid="previa-da-mensagem" className="whitespace-pre-wrap rounded-md bg-surface-2 p-3 text-sm text-fg-token">
                    {previa.texto}
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <NumberField
                rotulo="Espera"
                sufixo="min"
                valor={Math.round((form.delay_seconds ?? 0) / 60)}
                onMudar={(v) => setForm((f) => ({ ...f, delay_seconds: v * 60 }))}
              />
              <NumberField
                rotulo="Prioridade"
                min={1}
                valor={form.priority ?? 100}
                onMudar={(v) => setForm((f) => ({ ...f, priority: v }))}
              />
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-fg-muted-token">Ligado</span>
                <Switch ligado={Boolean(form.is_active)} onMudar={(ligado) => setForm((f) => ({ ...f, is_active: ligado }))} rotulo="Aviso ligado" />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-fg-token">Botões (até 3)</p>
                {(form.buttons?.length || 0) < 3 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    leftIcon={<PlusIcon className="h-4 w-4" />}
                    onClick={() => setForm((f) => ({ ...f, buttons: [...(f.buttons || []), { id: '', title: '' }] }))}
                  >
                    Adicionar botão
                  </Button>
                )}
              </div>
              {form.buttons?.map((b, i) => (
                <div key={i} className="mb-2 flex items-center gap-2">
                  <div className="flex-1">
                    <Input
                      size="sm"
                      placeholder="Texto do botão"
                      aria-label={`Texto do botão ${i + 1}`}
                      value={b.title}
                      maxLength={20}
                      onChange={(e) => mudarBotao(i, e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setForm((f) => ({ ...f, buttons: f.buttons?.filter((_, j) => j !== i) }))}
                    aria-label={`Remover botão ${i + 1}`}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={fechar}>Cancelar</Button>
            <Button type="submit">{editando ? 'Salvar aviso' : 'Criar aviso'}</Button>
          </ModalFooter>
        </form>
      </Modal>

      {ConfirmDialog}

      <Modal open={Boolean(teste)} onClose={fecharTeste} title={teste ? `Testar: ${teste.name}` : 'Testar aviso'} size="lg">
        {teste && (
          <div className="flex flex-col gap-4">
            <Input
              id="teste-telefone"
              label="Número de telefone"
              value={telefoneDoTeste}
              onChange={(e) => setTelefoneDoTeste(e.target.value)}
              placeholder="5511999999999"
            />
            <Button variant="outline" className="w-full" onClick={verTeste}>Ver como vai ficar</Button>
            {previaDoTeste && (
              <div className="rounded-lg bg-surface-2 p-4">
                <p className="mb-2 text-sm font-medium text-fg-token">Prévia</p>
                <div className="whitespace-pre-wrap rounded-lg bg-surface p-3 text-sm text-fg-token">{previaDoTeste}</div>
                {teste.buttons && teste.buttons.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {teste.buttons.map((b, i) => (
                      <span key={i} className="inline-flex items-center rounded-pill border border-border-token bg-surface px-3 py-1 text-sm text-fg-token">
                        {b.title}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        <ModalFooter>
          <Button variant="outline" onClick={fecharTeste}>Fechar</Button>
          {/* Só depois da prévia: mandar teste sem ter visto o texto é disparar às cegas. */}
          {previaDoTeste && <Button onClick={enviarTeste}>Enviar teste</Button>}
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default TextosDosAvisos;
