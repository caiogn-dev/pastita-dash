/**
 * Promoção no Instagram — quem comenta na publicação recebe no direct.
 *
 * É o marketing que a loja já faz na mão ("comenta EU QUERO que eu te mando")
 * feito pelo sistema: a mensagem sai sozinha, ninguém fica de fora por
 * esquecimento, e o dono vê quem entrou, quem ficou de fora e por quê.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

import { EmptyState, PageShell } from '../../../components/ui';
import { InstagramIcon } from '../../../components/brand/BrandIcons';
import { instagramAccountService } from '../../../services/instagram';
import {
  instagramCampanhasService,
  type PlacarDaPromocao,
  type PromocaoDeComentario,
} from '../../../services/instagramCampanhas';
import { frasePublica } from './promocaoDeComentario';
import NovaPromocao from './NovaPromocao';

const CARTAO = 'rounded-2xl border border-border-token bg-surface-token';
const CAMPO =
  'w-full rounded-xl border border-border-token bg-surface-token px-3 py-2 text-sm text-fg-token ' +
  'placeholder:text-fg-muted-token focus:border-brand focus:outline-none';
const BOTAO_PRINCIPAL =
  'rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-on-brand disabled:opacity-50';
const BOTAO_DISCRETO =
  'rounded-xl border border-border-token px-3 py-2 text-sm font-medium text-fg-token hover:bg-surface-muted-token';

// ── Uma promoção na lista ────────────────────────────────────────────────────

const Promocao: React.FC<{
  promocao: PromocaoDeComentario;
  onSortear: (p: PromocaoDeComentario) => void;
  onEncerrar: (p: PromocaoDeComentario) => void;
}> = ({ promocao, onSortear, onEncerrar }) => {
  const [placar, setPlacar] = useState<PlacarDaPromocao | null>(null);

  useEffect(() => {
    let vivo = true;
    instagramCampanhasService.placar(promocao.id)
      .then((p) => { if (vivo) setPlacar(p); })
      .catch(() => { /* o placar é extra; a promoção continua legível sem ele */ });
    return () => { vivo = false; };
  }, [promocao.id]);

  return (
    <li className={`${CARTAO} p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-fg-token">{promocao.nome}</h3>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                promocao.no_ar ? 'bg-success-soft text-success-token' : 'bg-surface-muted-token text-fg-muted-token'
              }`}
            >
              {promocao.no_ar ? 'No ar' : 'Encerrada'}
            </span>
          </div>
          <p className="mt-1 text-sm text-fg-muted-token">{frasePublica(promocao)}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          {promocao.tipo === 'SORTEIO' && (
            <button type="button" className={BOTAO_DISCRETO} onClick={() => onSortear(promocao)}>
              Sortear
            </button>
          )}
          {promocao.no_ar && (
            <button type="button" className={BOTAO_DISCRETO} onClick={() => onEncerrar(promocao)}>
              Encerrar
            </button>
          )}
        </div>
      </div>

      <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2">
        <div>
          <dt className="text-xs text-fg-muted-token">Participando</dt>
          <dd className="text-lg font-semibold text-fg-token">{placar?.participando ?? promocao.participando}</dd>
        </div>
        <div>
          <dt className="text-xs text-fg-muted-token">Ficaram de fora</dt>
          <dd className="text-lg font-semibold text-fg-token">{placar?.de_fora ?? 0}</dd>
        </div>
        {!!placar?.ganhadores.length && (
          <div>
            <dt className="text-xs text-fg-muted-token">Ganhadores</dt>
            <dd className="text-sm font-semibold text-fg-token">
              {placar.ganhadores.map((g) => `@${g.username}`).join(', ')}
            </dd>
          </div>
        )}
      </dl>

      {!!placar?.motivos.length && (
        <p className="mt-3 text-xs text-fg-muted-token">
          Quem ficou de fora: {placar.motivos.map((m) => `${m.quantas} ${m.motivo}`).join(' · ')}
        </p>
      )}
    </li>
  );
};

// ── A página ─────────────────────────────────────────────────────────────────

export const PromocaoNoInstagramPage: React.FC = () => {
  const [contaId, setContaId] = useState<string | null>(null);
  const [semConta, setSemConta] = useState(false);
  const [promocoes, setPromocoes] = useState<PromocaoDeComentario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [criando, setCriando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const contas = await instagramAccountService.list();
      const ativa = (contas.data || []).find((c) => c.is_active) || (contas.data || [])[0];
      setSemConta(!ativa);
      setContaId(ativa?.id ?? null);
      if (ativa) setPromocoes(await instagramCampanhasService.listar());
    } catch {
      toast.error('Não foi possível carregar as promoções agora.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  const sortear = async (p: PromocaoDeComentario) => {
    try {
      const { ganhadores } = await instagramCampanhasService.sortear(p.id, 1);
      if (!ganhadores.length) {
        toast('Ninguém está valendo ainda nesta promoção.');
        return;
      }
      toast.success(`Ganhador: @${ganhadores[0].username}`);
      await carregar();
    } catch {
      toast.error('Não deu para sortear agora.');
    }
  };

  const encerrar = async (p: PromocaoDeComentario) => {
    try {
      await instagramCampanhasService.atualizar(p.id, { ativa: false });
      await carregar();
    } catch {
      toast.error('Não deu para encerrar a promoção.');
    }
  };

  return (
    <PageShell
      titulo="Promoção no Instagram"
      descricao="Quem comentar na sua publicação recebe a mensagem da loja no direct."
      selo={<InstagramIcon className="h-6 w-6" aria-label="Instagram" />}
      acoes={
        !semConta && (
          <button type="button" className={BOTAO_PRINCIPAL} onClick={() => setCriando((v) => !v)}>
            {criando ? 'Cancelar' : 'Nova promoção'}
          </button>
        )
      }
    >
      {semConta ? (
        <EmptyState
          titulo="Conecte o Instagram da loja"
          descricao="A promoção responde os comentários da sua conta profissional. Conecte uma vez e ela passa a valer."
          acao={<Link to="/connections" className={BOTAO_PRINCIPAL}>Conectar Instagram</Link>}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {criando && contaId && (
            <NovaPromocao
              contaId={contaId}
              onCriada={() => { setCriando(false); void carregar(); }}
              onCancelar={() => setCriando(false)}
            />
          )}

          {carregando ? (
            <p className="text-sm text-fg-muted-token">Carregando…</p>
          ) : promocoes.length ? (
            <ul className="flex flex-col gap-4">
              {promocoes.map((p) => (
                <Promocao key={p.id} promocao={p} onSortear={sortear} onEncerrar={encerrar} />
              ))}
            </ul>
          ) : (
            <EmptyState
              titulo="Nenhuma promoção ainda"
              descricao="Crie uma promoção, cole o link do post e a loja passa a responder cada comentário no direct."
            />
          )}
        </div>
      )}
    </PageShell>
  );
};

export default PromocaoNoInstagramPage;
