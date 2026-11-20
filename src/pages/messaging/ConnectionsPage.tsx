/**
 * Integrações — onde o lojista liga WhatsApp, Instagram, apps de delivery e
 * a conta que recebe o dinheiro. (Até 19/11 se chamava Conexões.)
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
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useConfirm } from '../../hooks';
import * as whatsappService from '../../services/whatsapp';
import { instagramAccountService } from '../../services/instagram';
import { channelsApi } from '../../features/channels';
import { ConnectWhatsAppButton } from '../../components/whatsapp/ConnectWhatsAppButton';
import { InstagramIcon, WhatsAppIcon } from '../../components/brand/BrandIcons';
import { PageShell } from '../../components/ui';
import { estadoDoInstagram } from './estadoDoInstagram';
import { useAuthStore } from '../../stores/authStore';
import { CanaisDaLoja } from './CanaisDaLoja';
import {
  Cartao, FiltroDasIntegracoes, Grupo, Selo, type Filtro, botaoDiscreto, botaoPrimario, botaoSecundario, type Tom,
} from './pecasDeIntegracao';

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
  precisaReconectar?: boolean;
}

type Estado = 'funcionando' | 'desconectado' | 'pausado';

const QUALIDADE_RUIM = new Set(['FLAGGED', 'DOWNGRADE']);
const QUALIDADE_BOA = new Set(['UNFLAGGED', 'UPGRADE', 'ONBOARDING']);

export function estadoDoWhatsApp(conta: ContaWhatsApp): Estado {
  if (!conta.is_active) return 'pausado';
  if (conta.metadata?.coex?.connected === false) return 'desconectado';
  return conta.status === 'active' ? 'funcionando' : 'pausado';
}

const SELO: Record<Estado, { rotulo: string; tom: Tom }> = {
  funcionando: { rotulo: 'Funcionando', tom: 'ok' },
  desconectado: { rotulo: 'Desconectado no celular', tom: 'perigo' },
  pausado: { rotulo: 'Pausado', tom: 'neutro' },
};

/** `rotulo` troca só o texto: "desconectado no celular" é coisa de WhatsApp
 *  com coexistência; no Instagram a mesma cor significa outra frase. */
const SeloDoCanal: React.FC<{ estado: Estado; rotulo?: string }> = ({ estado, rotulo }) => (
  <Selo tom={SELO[estado].tom}>{rotulo ?? SELO[estado].rotulo}</Selo>
);

// ─── Tela ─────────────────────────────────────────────────────────────────────

const FILTROS: { valor: Filtro; rotulo: string }[] = [
  { valor: 'todas', rotulo: 'Todas' },
  { valor: 'ativas', rotulo: 'Ativas' },
  { valor: 'desligadas', rotulo: 'Desligadas' },
  { valor: 'atendimento', rotulo: 'Atendimento' },
  { valor: 'delivery', rotulo: 'Delivery' },
  { valor: 'pagamento', rotulo: 'Pagamento' },
];

export default function ConnectionsPage() {
  const [ConfirmDialog, confirm] = useConfirm();
  const usuario = useAuthStore((s) => s.user) as { is_superuser?: boolean; is_staff?: boolean } | null;
  const administrador = !!(usuario?.is_superuser || usuario?.is_staff);

  const [whatsapps, setWhatsapps] = useState<ContaWhatsApp[]>([]);
  const [instagrams, setInstagrams] = useState<ContaInstagram[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroWhatsapp, setErroWhatsapp] = useState(false);
  const [erroInstagram, setErroInstagram] = useState(false);
  // Qualquer um dos dois canais que não carregou já dispara o aviso do topo.
  const erro = erroWhatsapp || erroInstagram;
  const [instagramIndisponivel, setInstagramIndisponivel] = useState(false);
  const [conectandoInstagram, setConectandoInstagram] = useState(false);
  const limparLoginInstagram = useRef<(() => void) | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [busca, setBusca] = useState('');

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
    // conectar de novo algo que já está ligado. Cada canal guarda a SUA falha:
    // se só o Instagram cai, o WhatsApp segue mostrando o que carregou (e
    // vice-versa), mas o canal que caiu não finge estar "não conectado".
    setErroWhatsapp(wa.status === 'rejected');
    setErroInstagram(ig.status === 'rejected');
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
  const estadoIg = instagramAtivo ? estadoDoInstagram(instagramAtivo) : null;

  return (
    <PageShell
      className="mx-auto max-w-6xl"
      titulo="Integrações"
    >
      {erro && (
        <div role="alert" className="mb-6 flex items-center gap-3 rounded-xl border border-border-token bg-danger-soft px-5 py-4">
          <span className="flex-1 text-sm text-fg-token">Não conseguimos carregar WhatsApp e Instagram agora.</span>
          <button type="button" onClick={() => carregar()} className="text-sm font-semibold underline">Tentar de novo</button>
        </div>
      )}

      <div className="mb-6 flex flex-col gap-3">
        <label className="relative block max-w-sm">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted-token" aria-hidden />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar integração"
            aria-label="Buscar integração"
            className="h-10 w-full rounded-xl border border-border-token bg-surface-token pl-9 pr-3 text-sm text-fg-token focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar integrações">
          {FILTROS.map((f) => (
            <button
              key={f.valor}
              type="button"
              aria-pressed={filtro === f.valor}
              onClick={() => setFiltro(f.valor)}
              className={`h-8 rounded-full border px-3.5 text-sm font-semibold transition ${
                filtro === f.valor
                  ? 'border-brand bg-brand-soft text-brand-ink'
                  : 'border-border-token text-fg-muted-token hover:text-fg-token'
              }`}
            >
              {f.rotulo}
            </button>
          ))}
        </div>
      </div>

      <FiltroDasIntegracoes.Provider value={{ filtro, busca }}>
      {carregando ? (
        <p role="status" className="text-sm text-fg-muted-token">Carregando suas integrações…</p>
      ) : (
        <div className="flex flex-col gap-6">
          <Grupo titulo="Atendimento">
            {/* ── WhatsApp ── */}
            {whatsapps.length === 0 && !erroWhatsapp && (
              <Cartao icone={<WhatsAppIcon size={44} />} titulo="WhatsApp" subtitulo="Ainda não conectado" categoria="atendimento" ativo={false}>
                <div className="mt-auto flex flex-col gap-2 border-t border-border-token pt-4">
                  <ConnectWhatsAppButton onConnected={carregar} />
                </div>
              </Cartao>
            )}

            {whatsapps.map((conta) => {
              const estado = estadoDoWhatsApp(conta);
              const qualidade = conta.metadata?.qualidade?.evento || '';
              return (
                <Cartao
                  key={conta.id}
                  icone={<WhatsAppIcon size={44} />}
                  titulo="WhatsApp"
                  categoria="atendimento"
                  ativo={estado === 'funcionando'}
                  subtitulo={[conta.name, conta.display_phone_number || conta.phone_number].filter(Boolean).join(' · ')}
                  selo={<SeloDoCanal estado={estado} />}
                >
                  <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-border-token pt-4">
                    {estado === 'desconectado' && <ConnectWhatsAppButton rotulo="Conectar de novo" onConnected={carregar} />}
                    {estado === 'pausado' && (
                      <button type="button" className={botaoPrimario} onClick={() => reativarWhatsApp(conta)}>Reativar</button>
                    )}
                    {estado === 'funcionando' && (
                      <>
                        <Link to="/inbox/whatsapp" className={botaoPrimario}>Abrir conversas</Link>
                        <Link to="/atendimento/avisos-automaticos" className={botaoSecundario}>Avisos automáticos</Link>
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
                icone={<InstagramIcon size={44} />}
                titulo="Instagram"
                categoria="atendimento"
                ativo={estadoIg !== 'desconectado'}
                subtitulo={`@${instagramAtivo.handle}`}
                selo={(
                  <SeloDoCanal
                    estado={estadoIg ?? 'funcionando'}
                    rotulo={estadoIg === 'desconectado' ? 'Precisa reconectar' : undefined}
                  />
                )}
              >
                {estadoIg === 'desconectado' && (
                  <p className="rounded-xl bg-danger-soft p-3 text-sm text-danger-token">
                    A Meta recusou o acesso desta conta — nada entra nem sai por aqui. Conecte de
                    novo para voltar a receber o direct e os comentários.
                  </p>
                )}
                <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-border-token pt-4">
                  {estadoIg === 'desconectado' ? (
                    <button
                      type="button"
                      className={botaoPrimario}
                      disabled={conectandoInstagram}
                      onClick={entrarComInstagram}
                    >
                      Conectar de novo
                    </button>
                  ) : (
                    <Link to="/inbox/instagram" className={botaoPrimario}>Abrir direct</Link>
                  )}
                  <Link to="/marketing/instagram" className={botaoSecundario}>Criar promoção</Link>
                  <button type="button" className={botaoDiscreto} onClick={() => desconectarInstagram(instagramAtivo)}>Desconectar</button>
                </div>
              </Cartao>
            ) : erroInstagram ? null : (
              <Cartao icone={<InstagramIcon size={44} />} titulo="Instagram" subtitulo="Ainda não conectado" categoria="atendimento" ativo={false}>
                <div className="mt-auto flex flex-col gap-2 border-t border-border-token pt-4">
                  {instagramIndisponivel ? (
                    <p role="status" className="rounded-xl bg-warning-soft px-4 py-3 text-sm text-fg-token">
                      Em breve: estamos liberando a conexão do Instagram para as lojas. Avisamos você por aqui.
                    </p>
                  ) : (
                    <button type="button" className={botaoPrimario} onClick={entrarComInstagram} disabled={conectandoInstagram}>
                      <InstagramIcon size={18} />
                      {conectandoInstagram ? 'Aguardando o Instagram…' : 'Entrar com o Instagram'}
                    </button>
                  )}
                </div>
              </Cartao>
            )}
          </Grupo>

          <CanaisDaLoja />

          {/* ── Avisos ── */}
          <section className="superficie px-6 py-5" aria-labelledby="avisos-titulo">
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
      </FiltroDasIntegracoes.Provider>
      {ConfirmDialog}
    </PageShell>
  );
}
