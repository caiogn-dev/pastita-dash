/**
 * Conexões — onde o lojista liga o WhatsApp e o Instagram da loja.
 *
 * É tela de PRODUTO, não de suporte: o lojista entra com a conta dele pelo
 * login oficial (WhatsApp pelo Facebook, com coexistência — ele continua
 * usando o app no celular; Instagram pelo login do Instagram) e lê o estado em
 * português de gente. Até 19/09 ela pedia Phone Number ID, token e WABA,
 * mostrava Messenger e escondia o Instagram. O que é técnico ficou numa seção
 * só para quem administra a plataforma.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useConfirm } from '../../hooks';
import * as whatsappService from '../../services/whatsapp';
import { instagramAccountService } from '../../services/instagram';
import { channelsApi } from '../../features/channels';
import { ConnectWhatsAppButton } from '../../components/whatsapp/ConnectWhatsAppButton';
import { InstagramIcon, WhatsAppIcon } from '../../components/brand/BrandIcons';
import { PageShell } from '../../components/ui';
import { useAuthStore } from '../../stores/authStore';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ContaWhatsApp {
  id: string;
  name?: string;
  display_phone_number?: string;
  phone_number?: string;
  status?: string;
  is_active?: boolean;
  metadata?: {
    coex?: { connected?: boolean };
    qualidade?: { evento?: string };
  };
}

interface ContaInstagram {
  id: string;
  name?: string;
  handle?: string;
  isActive?: boolean;
}

type Estado = 'funcionando' | 'desconectado' | 'pausado';

const QUALIDADE_RUIM = new Set(['FLAGGED', 'DOWNGRADE']);
const QUALIDADE_BOA = new Set(['UNFLAGGED', 'UPGRADE', 'ONBOARDING']);

export function estadoDoWhatsApp(conta: ContaWhatsApp): Estado {
  if (!conta.is_active) return 'pausado';
  if (conta.metadata?.coex?.connected === false) return 'desconectado';
  return conta.status === 'active' ? 'funcionando' : 'pausado';
}

const SELO: Record<Estado, { rotulo: string; classe: string; ponto: string }> = {
  funcionando: { rotulo: 'Funcionando', classe: 'bg-success-soft text-success-token', ponto: 'bg-success-token' },
  desconectado: { rotulo: 'Desconectado no celular', classe: 'bg-danger-soft text-danger-token', ponto: 'bg-danger-token' },
  pausado: { rotulo: 'Pausado', classe: 'bg-surface-muted-token text-fg-muted-token', ponto: 'bg-fg-muted-token' },
};

// ─── Peças ────────────────────────────────────────────────────────────────────

const Selo: React.FC<{ estado: Estado }> = ({ estado }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${SELO[estado].classe}`}>
    <span className={`h-2 w-2 rounded-full ${SELO[estado].ponto}`} aria-hidden />
    {SELO[estado].rotulo}
  </span>
);

const Beneficio: React.FC<{ titulo: string; children: React.ReactNode }> = ({ titulo, children }) => (
  <li className="flex gap-3 text-sm leading-relaxed text-fg-token">
    <svg width="20" height="20" viewBox="0 0 24 24" className="mt-0.5 shrink-0 text-success-token" aria-hidden>
      <path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <span><strong className="font-semibold">{titulo}</strong> {children}</span>
  </li>
);

const Cartao: React.FC<{
  icone: React.ReactNode;
  titulo: string;
  subtitulo: string;
  selo?: React.ReactNode;
  children: React.ReactNode;
}> = ({ icone, titulo, subtitulo, selo, children }) => (
  <section className="flex flex-col gap-5 rounded-2xl border border-border-token bg-surface-token p-6">
    <header className="flex items-center gap-3.5">
      {icone}
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-bold text-fg-token">{titulo}</h2>
        <p className="truncate text-sm text-fg-muted-token">{subtitulo}</p>
      </div>
      {selo}
    </header>
    {children}
  </section>
);

const botaoSecundario =
  'inline-flex h-11 items-center rounded-xl border border-border-token bg-surface-token px-4 text-sm font-semibold text-fg-token hover:bg-surface-muted-token focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand';
const botaoPrimario =
  'inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-on-brand hover:bg-brand-hover disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand';
const botaoDiscreto =
  'inline-flex h-11 items-center rounded-xl px-3 text-sm font-semibold text-fg-muted-token hover:text-fg-token focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand';

// ─── Tela ─────────────────────────────────────────────────────────────────────

export default function ConnectionsPage() {
  const [ConfirmDialog, confirm] = useConfirm();
  const usuario = useAuthStore((s) => s.user) as { is_superuser?: boolean; is_staff?: boolean } | null;
  const administrador = !!(usuario?.is_superuser || usuario?.is_staff);

  const [whatsapps, setWhatsapps] = useState<ContaWhatsApp[]>([]);
  const [instagrams, setInstagrams] = useState<ContaInstagram[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [instagramIndisponivel, setInstagramIndisponivel] = useState(false);
  const [conectandoInstagram, setConectandoInstagram] = useState(false);
  const limparLoginInstagram = useRef<(() => void) | null>(null);

  const carregar = useCallback(async () => {
    const [wa, ig] = await Promise.allSettled([
      whatsappService.getAccounts(),
      channelsApi.listAccounts('instagram'),
    ]);
    if (wa.status === 'fulfilled') {
      const d = wa.value.data as { results?: ContaWhatsApp[] } | ContaWhatsApp[];
      setWhatsapps(Array.isArray(d) ? d : d?.results || []);
    }
    if (ig.status === 'fulfilled') setInstagrams(ig.value as ContaInstagram[]);
    // Falha ao carregar não pode virar "nada conectado" — o lojista tentaria
    // conectar de novo algo que já está ligado.
    setErro(wa.status === 'rejected');
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregar();
    if (new URLSearchParams(window.location.search).get('instagram') === 'conectado') {
      toast.success('Instagram conectado!');
    }
    return () => limparLoginInstagram.current?.();
  }, [carregar]);

  // ── Instagram: login numa janelinha; /instagram/callback avisa o fim ──
  const entrarComInstagram = () => {
    const popup = window.open('about:blank', 'instagram_oauth', 'width=600,height=720,scrollbars=yes,resizable=yes');
    if (!popup) {
      toast.error('O navegador bloqueou a janela do Instagram. Libere pop-ups para este site e tente de novo.');
      return;
    }
    limparLoginInstagram.current?.();
    setConectandoInstagram(true);
    let terminou = false;

    const aoReceber = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const dados = event.data as { type?: string; success?: boolean; error?: string };
      if (dados?.type !== 'instagram_oauth') return;
      terminou = true;
      limpar();
      if (dados.success) {
        toast.success('Instagram conectado!');
        carregar();
      } else {
        toast.error(dados.error || 'Não foi possível conectar o Instagram.');
      }
    };
    const vigia = window.setInterval(() => {
      if (popup.closed && !terminou) limpar();
    }, 500);
    const limpar = () => {
      window.removeEventListener('message', aoReceber);
      window.clearInterval(vigia);
      setConectandoInstagram(false);
      limparLoginInstagram.current = null;
    };
    limparLoginInstagram.current = limpar;
    window.addEventListener('message', aoReceber);

    channelsApi.getInstagramConnectUrl()
      .then((url) => { if (!popup.closed) popup.location.href = url; })
      .catch((e: { response?: { status?: number; data?: { codigo?: string } } }) => {
        limpar();
        popup.close();
        if (e?.response?.data?.codigo === 'instagram_indisponivel') {
          setInstagramIndisponivel(true);
          return;
        }
        toast.error('Não foi possível abrir o login do Instagram. Tente de novo.');
      });
  };

  // ── Desconectar: pausa, não apaga — as conversas continuam guardadas ──
  const desconectarWhatsApp = async (conta: ContaWhatsApp) => {
    const ok = await confirm({
      title: 'Desconectar o WhatsApp?',
      message: 'A loja para de enviar e receber mensagens por aqui. As conversas ficam guardadas e você pode reativar quando quiser.',
    });
    if (!ok) return;
    try {
      await whatsappService.deactivateAccount(conta.id);
      toast.success('WhatsApp desconectado.');
      carregar();
    } catch {
      toast.error('Não foi possível desconectar. Tente de novo.');
    }
  };

  const reativarWhatsApp = async (conta: ContaWhatsApp) => {
    try {
      await whatsappService.activateAccount(conta.id);
      toast.success('WhatsApp reativado.');
      carregar();
    } catch {
      toast.error('Não foi possível reativar. Tente de novo.');
    }
  };

  const desconectarInstagram = async (conta: ContaInstagram) => {
    const ok = await confirm({
      title: 'Desconectar o Instagram?',
      message: 'O direct e os comentários param de chegar aqui. Você pode conectar de novo quando quiser.',
    });
    if (!ok) return;
    try {
      await instagramAccountService.update(conta.id, { is_active: false } as never);
      toast.success('Instagram desconectado.');
      carregar();
    } catch {
      toast.error('Não foi possível desconectar. Tente de novo.');
    }
  };

  const sincronizarModelos = async (conta: ContaWhatsApp) => {
    try {
      await whatsappService.syncTemplates(conta.id);
      toast.success('Modelos sincronizados.');
    } catch {
      toast.error('Falha ao sincronizar modelos.');
    }
  };

  // ── Avisos: só o que o lojista precisa saber e fazer ──
  const avisos: { id: string; tom: 'perigo' | 'atencao'; texto: React.ReactNode }[] = [];
  whatsapps.forEach((conta) => {
    if (estadoDoWhatsApp(conta) === 'desconectado') {
      avisos.push({
        id: `coex-${conta.id}`,
        tom: 'perigo',
        texto: 'O WhatsApp da loja foi desconectado no celular. Enquanto isso, nenhuma mensagem sai nem chega por aqui — conecte de novo, leva 1 minuto.',
      });
    }
    if (QUALIDADE_RUIM.has(conta.metadata?.qualidade?.evento || '')) {
      avisos.push({
        id: `qualidade-${conta.id}`,
        tom: 'atencao',
        texto: 'Alguns clientes bloquearam ou denunciaram mensagens da loja. Mande menos promoções por uns dias para a reputação voltar ao normal.',
      });
    }
  });

  const instagramAtivo = instagrams.find((c) => c.isActive);

  return (
    <PageShell
      className="mx-auto max-w-6xl"
      titulo="Conexões"
      descricao="Ligue o WhatsApp e o Instagram da sua loja. É só entrar com a sua conta e autorizar — seus clientes continuam falando com você no mesmo número."
    >
      {erro && (
        <div role="alert" className="mb-6 flex items-center gap-3 rounded-xl border border-border-token bg-danger-soft px-5 py-4">
          <span className="flex-1 text-sm text-fg-token">Não conseguimos carregar suas conexões agora.</span>
          <button type="button" onClick={() => carregar()} className="text-sm font-semibold underline">Tentar de novo</button>
        </div>
      )}

      {carregando ? (
        <p role="status" className="text-sm text-fg-muted-token">Carregando suas conexões…</p>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid gap-5 lg:grid-cols-2">
            {/* ── WhatsApp ── */}
            {whatsapps.length === 0 && !erro && (
              <Cartao icone={<WhatsAppIcon size={48} />} titulo="WhatsApp" subtitulo="Ainda não conectado">
                <ul className="flex flex-col gap-3">
                  <Beneficio titulo="Seus clientes recebem sozinhos">a confirmação do pedido, o PIX e cada mudança de status.</Beneficio>
                  <Beneficio titulo="Você continua usando o app">WhatsApp Business no celular — as conversas aparecem nos dois.</Beneficio>
                  <Beneficio titulo="Um número só.">Nada muda para os seus clientes.</Beneficio>
                </ul>
                <div className="mt-auto flex flex-col gap-2">
                  <ConnectWhatsAppButton onConnected={carregar} />
                  <p className="text-xs text-fg-muted-token">Você entra com o Facebook, escolhe o número da loja e confirma no celular.</p>
                </div>
              </Cartao>
            )}

            {whatsapps.map((conta) => {
              const estado = estadoDoWhatsApp(conta);
              const qualidade = conta.metadata?.qualidade?.evento || '';
              return (
                <Cartao
                  key={conta.id}
                  icone={<WhatsAppIcon size={48} />}
                  titulo="WhatsApp"
                  subtitulo={[conta.name, conta.display_phone_number || conta.phone_number].filter(Boolean).join(' · ')}
                  selo={<Selo estado={estado} />}
                >
                  <ul className="flex flex-col gap-3">
                    <Beneficio titulo="Seus clientes recebem sozinhos">a confirmação do pedido, o PIX e cada mudança de status.</Beneficio>
                    <Beneficio titulo="Você continua usando o app">WhatsApp Business no celular — as conversas aparecem nos dois.</Beneficio>
                    {QUALIDADE_BOA.has(qualidade) && (
                      <Beneficio titulo="Reputação do número: boa.">A Meta avalia se os clientes gostam das mensagens da loja.</Beneficio>
                    )}
                  </ul>
                  <div className="mt-auto flex flex-wrap items-center gap-2">
                    {estado === 'desconectado' && <ConnectWhatsAppButton rotulo="Conectar de novo" onConnected={carregar} />}
                    {estado === 'pausado' && (
                      <button type="button" className={botaoPrimario} onClick={() => reativarWhatsApp(conta)}>Reativar</button>
                    )}
                    {estado === 'funcionando' && (
                      <>
                        <Link to="/inbox/whatsapp" className={botaoPrimario}>Abrir conversas</Link>
                        <Link to="/whatsapp/avisos" className={botaoSecundario}>Mensagens automáticas</Link>
                      </>
                    )}
                    {estado !== 'pausado' && (
                      <button type="button" className={botaoDiscreto} onClick={() => desconectarWhatsApp(conta)}>Desconectar</button>
                    )}
                  </div>
                </Cartao>
              );
            })}

            {/* ── Instagram ── */}
            {instagramAtivo ? (
              <Cartao
                icone={<InstagramIcon size={48} />}
                titulo="Instagram"
                subtitulo={instagramAtivo.name || 'Conta profissional'}
                selo={<Selo estado="funcionando" />}
              >
                <p className="text-sm font-semibold text-fg-token">@{instagramAtivo.handle}</p>
                <ul className="flex flex-col gap-3">
                  <Beneficio titulo="Direct no mesmo lugar">que o WhatsApp — responda tudo numa tela só.</Beneficio>
                  <Beneficio titulo="Comentários chegam aqui,">prontos para campanhas do tipo “comenta e recebe no direct”.</Beneficio>
                </ul>
                <div className="mt-auto flex flex-wrap items-center gap-2">
                  <Link to="/inbox/instagram" className={botaoPrimario}>Abrir direct</Link>
                  <Link to="/marketing/instagram" className={botaoSecundario}>Criar promoção</Link>
                  <button type="button" className={botaoDiscreto} onClick={() => desconectarInstagram(instagramAtivo)}>Desconectar</button>
                </div>
              </Cartao>
            ) : (
              <Cartao icone={<InstagramIcon size={48} />} titulo="Instagram" subtitulo="Ainda não conectado">
                <ul className="flex flex-col gap-3">
                  <Beneficio titulo="Direct no mesmo lugar">que o WhatsApp — responda tudo numa tela só.</Beneficio>
                  <Beneficio titulo="“Comenta e recebe no direct”:">quem comenta a palavra no post ganha o cupom ou o cardápio na hora.</Beneficio>
                  <Beneficio titulo="Sorteios e concursos">com regras: marcar amigos, um comentário por pessoa, palavra certa.</Beneficio>
                </ul>
                <div className="mt-auto flex flex-col gap-2">
                  {instagramIndisponivel ? (
                    <p role="status" className="rounded-xl bg-warning-soft px-4 py-3 text-sm text-fg-token">
                      Em breve: estamos liberando a conexão do Instagram para as lojas. Avisamos você por aqui.
                    </p>
                  ) : (
                    <button type="button" className={`${botaoPrimario} h-12 text-base`} onClick={entrarComInstagram} disabled={conectandoInstagram}>
                      <InstagramIcon size={22} />
                      {conectandoInstagram ? 'Aguardando o Instagram…' : 'Entrar com o Instagram'}
                    </button>
                  )}
                  <p className="text-center text-xs text-fg-muted-token">
                    Precisa ser conta profissional (comercial ou criador). Dá para mudar no app em 1 minuto.
                  </p>
                </div>
              </Cartao>
            )}
          </div>

          {/* ── Avisos ── */}
          <section className="rounded-2xl border border-border-token bg-surface-token px-6 py-5" aria-labelledby="avisos-titulo">
            <h2 id="avisos-titulo" className="mb-2 text-base font-bold text-fg-token">Avisos</h2>
            {avisos.length === 0 ? (
              <p className="text-sm text-fg-muted-token">Nenhum aviso. Está tudo funcionando.</p>
            ) : (
              <ul>
                {avisos.map((a) => (
                  <li key={a.id} className="flex items-start gap-3.5 border-t border-border-token py-3 first:border-t-0">
                    <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${a.tom === 'perigo' ? 'bg-danger-token' : 'bg-warning-token'}`} aria-hidden />
                    <p className="text-sm text-fg-token">{a.texto}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ── Só para quem administra a plataforma ── */}
          {administrador && whatsapps.length > 0 && (
            <details className="rounded-2xl border border-dashed border-border-token px-6 py-4">
              <summary className="cursor-pointer text-sm font-semibold text-fg-muted-token">Administração da plataforma</summary>
              <ul className="mt-3 flex flex-col gap-2">
                {whatsapps.map((conta) => (
                  <li key={conta.id} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="min-w-[10rem] font-medium text-fg-token">{conta.name}</span>
                    <Link to={`/accounts/${conta.id}`} className={botaoSecundario}>Detalhes técnicos</Link>
                    <button type="button" className={botaoSecundario} onClick={() => sincronizarModelos(conta)}>Sincronizar modelos</button>
                    <Link to="/whatsapp/diagnostics" className={botaoSecundario}>Diagnóstico</Link>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
      {ConfirmDialog}
    </PageShell>
  );
}
