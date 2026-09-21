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
import { frasePublica, idDaPublicacao, problemasDaPromocao } from './promocaoDeComentario';

const CARTAO = 'rounded-2xl border border-border-token bg-surface-token';
const CAMPO =
  'w-full rounded-xl border border-border-token bg-surface-token px-3 py-2 text-sm text-fg-token ' +
  'placeholder:text-fg-muted-token focus:border-brand focus:outline-none';
const BOTAO_PRINCIPAL =
  'rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-on-brand disabled:opacity-50';
const BOTAO_DISCRETO =
  'rounded-xl border border-border-token px-3 py-2 text-sm font-medium text-fg-token hover:bg-surface-muted-token';

interface Rascunho {
  nome: string;
  publicacao: string;
  palavra_chave: string;
  mensagem_dm: string;
  resposta_publica: string;
  exige_marcar_amigos: number;
  exige_seguir: boolean;
  tipo: 'CUPOM' | 'SORTEIO';
}

const VAZIO: Rascunho = {
  nome: '',
  publicacao: '',
  palavra_chave: '',
  mensagem_dm: '',
  resposta_publica: '',
  exige_marcar_amigos: 0,
  exige_seguir: false,
  tipo: 'CUPOM',
};

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
  const [rascunho, setRascunho] = useState<Rascunho>(VAZIO);
  const [criando, setCriando] = useState(false);
  const [salvando, setSalvando] = useState(false);

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

  const impedimentos = useMemo(
    () => problemasDaPromocao({
      nome: rascunho.nome,
      media_id: idDaPublicacao(rascunho.publicacao),
      mensagem_dm: rascunho.mensagem_dm,
    }),
    [rascunho],
  );

  const criar = async () => {
    if (!contaId || impedimentos.length) return;
    setSalvando(true);
    try {
      await instagramCampanhasService.criar({
        account: contaId,
        nome: rascunho.nome.trim(),
        tipo: rascunho.tipo,
        media_id: idDaPublicacao(rascunho.publicacao),
        palavra_chave: rascunho.palavra_chave.trim(),
        mensagem_dm: rascunho.mensagem_dm.trim(),
        resposta_publica: rascunho.resposta_publica.trim(),
        exige_marcar_amigos: rascunho.exige_marcar_amigos,
        exige_seguir: rascunho.exige_seguir,
      });
      toast.success('Promoção no ar. Publique a regra na legenda do post.');
      setRascunho(VAZIO);
      setCriando(false);
      await carregar();
    } catch {
      toast.error('Não deu para criar a promoção.');
    } finally {
      setSalvando(false);
    }
  };

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
          {criando && (
            <section className={`${CARTAO} p-5`}>
              <h2 className="text-base font-semibold text-fg-token">Nova promoção</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-fg-token">Nome</span>
                  <input
                    className={CAMPO}
                    placeholder="Cupom de setembro"
                    value={rascunho.nome}
                    onChange={(e) => setRascunho({ ...rascunho, nome: e.target.value })}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-fg-token">Publicação</span>
                  <input
                    className={CAMPO}
                    placeholder="Cole o link do post"
                    value={rascunho.publicacao}
                    onChange={(e) => setRascunho({ ...rascunho, publicacao: e.target.value })}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-fg-token">Palavra da promoção</span>
                  <input
                    className={CAMPO}
                    placeholder="EU QUERO (deixe vazio para aceitar qualquer comentário)"
                    value={rascunho.palavra_chave}
                    onChange={(e) => setRascunho({ ...rascunho, palavra_chave: e.target.value })}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-fg-token">Tipo</span>
                  <select
                    className={CAMPO}
                    value={rascunho.tipo}
                    onChange={(e) => setRascunho({ ...rascunho, tipo: e.target.value as Rascunho['tipo'] })}
                  >
                    <option value="CUPOM">Todo mundo que comentar recebe</option>
                    <option value="SORTEIO">Sorteio entre quem comentar</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 md:col-span-2">
                  <span className="text-sm font-medium text-fg-token">Mensagem que chega no direct</span>
                  <textarea
                    className={`${CAMPO} min-h-24`}
                    placeholder="Oi! Seu cupom é SET10, vale até domingo 🍝"
                    value={rascunho.mensagem_dm}
                    onChange={(e) => setRascunho({ ...rascunho, mensagem_dm: e.target.value })}
                  />
                </label>
                <label className="flex flex-col gap-1 md:col-span-2">
                  <span className="text-sm font-medium text-fg-token">Resposta no comentário (opcional)</span>
                  <input
                    className={CAMPO}
                    placeholder="Te mandei no direct! 💜"
                    value={rascunho.resposta_publica}
                    onChange={(e) => setRascunho({ ...rascunho, resposta_publica: e.target.value })}
                  />
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={10}
                    className={`${CAMPO} w-20`}
                    value={rascunho.exige_marcar_amigos}
                    onChange={(e) => setRascunho({ ...rascunho, exige_marcar_amigos: Number(e.target.value) })}
                  />
                  <span className="text-sm text-fg-token">amigos marcados no comentário</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={rascunho.exige_seguir}
                    onChange={(e) => setRascunho({ ...rascunho, exige_seguir: e.target.checked })}
                  />
                  <span className="text-sm text-fg-token">Só vale para quem segue a loja</span>
                </label>
              </div>

              <p className="mt-4 rounded-xl bg-surface-muted-token p-3 text-sm text-fg-token">
                Na legenda do post, escreva: <strong>{frasePublica({
                  palavra_chave: rascunho.palavra_chave,
                  exige_marcar_amigos: rascunho.exige_marcar_amigos,
                  exige_seguir: rascunho.exige_seguir,
                })}</strong>
              </p>

              {rascunho.tipo === 'SORTEIO' && (
                <p className="mt-2 text-xs text-fg-muted-token">
                  Sorteio com prêmio precisa de autorização do governo. Sem ela, premie por mérito
                  (melhor foto, melhor frase) ou dê o cupom para todo mundo que participar.
                </p>
              )}

              {!!impedimentos.length && (
                <ul className="mt-3 list-disc pl-5 text-sm text-danger-token">
                  {impedimentos.map((p) => <li key={p}>{p}</li>)}
                </ul>
              )}

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  className={BOTAO_PRINCIPAL}
                  disabled={!!impedimentos.length || salvando}
                  onClick={criar}
                >
                  {salvando ? 'Publicando…' : 'Colocar no ar'}
                </button>
              </div>
            </section>
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
