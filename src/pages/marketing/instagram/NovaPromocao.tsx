/**
 * Criar a promoção em três decisões: em qual post, o que o cliente faz, o que
 * ele ganha.
 *
 * A primeira versão era um formulário de dez campos com o link do post colado
 * à mão — e quem publica pelo celular não tem esse link. Aqui a loja vê as
 * próprias fotos e escolhe clicando.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  instagramCampanhasService,
  type NovaPromocao as Payload,
  type PublicacaoDaConta,
  type TipoDaPromocao,
} from '../../../services/instagramCampanhas';
import { InstagramIcon } from '../../../components/brand/BrandIcons';
import { frasePublica } from './promocaoDeComentario';
import { PASSOS, primeiroPassoIncompleto, type PassoId } from './passosDaPromocao';

const CAMPO =
  'w-full superficie px-3 py-2 text-sm text-fg-token ' +
  'placeholder:text-fg-muted-token focus:border-brand focus:outline-none';
const PRIMARIO = 'rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-on-brand disabled:opacity-50';
const DISCRETO = 'rounded-xl px-3 py-2 text-sm font-medium text-fg-muted-token hover:text-fg-token';

interface Rascunho {
  media_id: string;
  palavra_chave: string;
  mensagem_dm: string;
  resposta_publica: string;
  exige_marcar_amigos: number;
  exige_seguir: boolean;
  tipo: TipoDaPromocao;
}

const VAZIO: Rascunho = {
  media_id: '',
  palavra_chave: '',
  mensagem_dm: '',
  resposta_publica: '',
  exige_marcar_amigos: 0,
  exige_seguir: false,
  tipo: 'CUPOM',
};

/** Chip de escolha — a regra vira um toque, não um campo. */
const Chip: React.FC<{ ativo: boolean; onClick: () => void; children: React.ReactNode }> = ({
  ativo, onClick, children,
}) => (
  <button
    type="button"
    aria-pressed={ativo}
    onClick={onClick}
    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
      ativo ? 'border-brand bg-brand text-on-brand' : 'border-border-token text-fg-token hover:bg-surface-muted-token'
    }`}
  >
    {children}
  </button>
);

const Publicacao: React.FC<{
  post: PublicacaoDaConta;
  escolhida: boolean;
  onEscolher: () => void;
}> = ({ post, escolhida, onEscolher }) => (
  <li>
    <button
      type="button"
      onClick={onEscolher}
      aria-pressed={escolhida}
      className={`group relative block w-full overflow-hidden rounded-xl border-2 transition-colors ${
        escolhida ? 'border-brand' : 'border-transparent hover:border-border-token'
      }`}
    >
      {post.imagem ? (
        <img
          src={post.imagem}
          alt={post.legenda ? post.legenda.slice(0, 80) : 'Publicação sem legenda'}
          className="aspect-square w-full object-cover"
          loading="lazy"
        />
      ) : (
        <span className="flex aspect-square w-full items-center justify-center bg-surface-muted-token text-caption text-fg-muted-token">
          sem imagem
        </span>
      )}
      <span className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1 text-left text-caption text-white">
        {post.comentarios === 1 ? '1 comentário' : `${post.comentarios} comentários`}
      </span>
    </button>
  </li>
);

interface Props {
  contaId: string;
  onCriada: () => void;
  onCancelar: () => void;
}

export const NovaPromocao: React.FC<Props> = ({ contaId, onCriada, onCancelar }) => {
  const [posts, setPosts] = useState<PublicacaoDaConta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [precisaReconectar, setPrecisaReconectar] = useState(false);
  const [rascunho, setRascunho] = useState<Rascunho>(VAZIO);
  const [passo, setPasso] = useState<PassoId>('publicacao');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let vivo = true;
    instagramCampanhasService.publicacoes(contaId)
      .then((lista) => { if (vivo) setPosts(lista); })
      .catch((e) => {
        if (!vivo) return;
        // 409 = a Meta recusou o token. Não é "sem posts", é canal caído.
        setPrecisaReconectar(e?.response?.status === 409);
      })
      .finally(() => { if (vivo) setCarregando(false); });
    return () => { vivo = false; };
  }, [contaId]);

  const escolhida = useMemo(
    () => posts.find((p) => p.id === rascunho.media_id) ?? null,
    [posts, rascunho.media_id],
  );
  const falta = primeiroPassoIncompleto(rascunho);

  const escolherPost = useCallback((post: PublicacaoDaConta) => {
    setRascunho((r) => ({ ...r, media_id: post.id }));
    setPasso('regra');
  }, []);

  const criar = async () => {
    if (falta) { setPasso(falta); return; }
    setSalvando(true);
    setErro('');
    try {
      const payload: Payload = {
        account: contaId,
        // O nome não é uma decisão do lojista: sai da palavra ou da data.
        nome: rascunho.palavra_chave.trim()
          ? `Promoção "${rascunho.palavra_chave.trim().toUpperCase()}"`
          : `Promoção de ${new Date().toLocaleDateString('pt-BR')}`,
        tipo: rascunho.tipo,
        media_id: rascunho.media_id,
        palavra_chave: rascunho.palavra_chave.trim(),
        mensagem_dm: rascunho.mensagem_dm.trim(),
        resposta_publica: rascunho.resposta_publica.trim(),
        exige_marcar_amigos: rascunho.exige_marcar_amigos,
        exige_seguir: rascunho.exige_seguir,
      };
      await instagramCampanhasService.criar(payload);
      onCriada();
    } catch {
      setErro('Não deu para colocar a promoção no ar. Tente de novo.');
    } finally {
      setSalvando(false);
    }
  };

  if (precisaReconectar) {
    return (
      <section className="superficie p-6">
        <p className="text-base font-semibold text-fg-token">O Instagram precisa ser reconectado</p>
        <p className="mt-1 text-sm text-fg-muted-token">
          A Meta recusou o acesso a esta conta, então não dá para ler as publicações. Reconecte em
          Conexões e volte aqui.
        </p>
      </section>
    );
  }

  return (
    <section className="superficie">
      {/* Os três passos, sempre visíveis: a loja sabe onde está e o que falta. */}
      <ol className="flex flex-wrap gap-1 border-b border-border-token p-3">
        {PASSOS.map((p, i) => {
          const ativo = p.id === passo;
          const liberado = p.id === 'publicacao' || !!rascunho.media_id;
          return (
            <li key={p.id}>
              <button
                type="button"
                disabled={!liberado}
                onClick={() => setPasso(p.id)}
                aria-current={ativo}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors disabled:opacity-40 ${
                  ativo ? 'bg-brand/10 text-fg-token' : 'text-fg-muted-token hover:text-fg-token'
                }`}
              >
                <span className="mr-1.5 text-fg-muted-token">{i + 1}</span>
                {p.titulo}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="grid gap-6 p-5 lg:grid-cols-[1fr_20rem]">
        <div>
          {passo === 'publicacao' && (
            <>
              <p className="text-sm text-fg-muted-token">{PASSOS[0].ajuda}</p>
              {carregando ? (
                <p className="mt-4 text-sm text-fg-muted-token">Carregando suas publicações…</p>
              ) : posts.length ? (
                <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {posts.map((post) => (
                    <Publicacao
                      key={post.id}
                      post={post}
                      escolhida={post.id === rascunho.media_id}
                      onEscolher={() => escolherPost(post)}
                    />
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-fg-muted-token">
                  Nenhuma publicação encontrada nesta conta.
                </p>
              )}
            </>
          )}

          {passo === 'regra' && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-fg-muted-token">{PASSOS[1].ajuda}</p>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-fg-token">Palavra da promoção</span>
                <input
                  className={CAMPO}
                  placeholder="EU QUERO"
                  value={rascunho.palavra_chave}
                  onChange={(e) => setRascunho({ ...rascunho, palavra_chave: e.target.value })}
                />
                <span className="text-caption text-fg-muted-token">
                  Vazio aceita qualquer comentário. Acento e maiúscula não importam.
                </span>
              </label>

              <div className="flex flex-wrap gap-2">
                <Chip
                  ativo={rascunho.exige_marcar_amigos > 0}
                  onClick={() => setRascunho({
                    ...rascunho,
                    exige_marcar_amigos: rascunho.exige_marcar_amigos > 0 ? 0 : 2,
                  })}
                >
                  Marcar amigos
                </Chip>
                {rascunho.exige_marcar_amigos > 0 && (
                  <div className="inline-flex items-center gap-1 rounded-full border border-border-token px-2">
                    {[1, 2, 3].map((n) => (
                      <button
                        key={n}
                        type="button"
                        aria-pressed={rascunho.exige_marcar_amigos === n}
                        onClick={() => setRascunho({ ...rascunho, exige_marcar_amigos: n })}
                        className={`rounded-full px-2 py-1 text-sm ${
                          rascunho.exige_marcar_amigos === n ? 'font-bold text-fg-token' : 'text-fg-muted-token'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                )}
                <Chip
                  ativo={rascunho.exige_seguir}
                  onClick={() => setRascunho({ ...rascunho, exige_seguir: !rascunho.exige_seguir })}
                >
                  Seguir a loja
                </Chip>
              </div>

              <div className="flex flex-wrap gap-2">
                <Chip
                  ativo={rascunho.tipo === 'CUPOM'}
                  onClick={() => setRascunho({ ...rascunho, tipo: 'CUPOM' })}
                >
                  Todo mundo recebe
                </Chip>
                <Chip
                  ativo={rascunho.tipo === 'SORTEIO'}
                  onClick={() => setRascunho({ ...rascunho, tipo: 'SORTEIO' })}
                >
                  Sorteio
                </Chip>
              </div>
              {rascunho.tipo === 'SORTEIO' && (
                <p className="text-caption text-fg-muted-token">
                  Sorteio com prêmio precisa de autorização do governo. Sem ela, premie por mérito
                  (melhor foto, melhor frase) ou dê o cupom para todo mundo.
                </p>
              )}

              <div>
                <button type="button" className={PRIMARIO} onClick={() => setPasso('premio')}>
                  Continuar
                </button>
              </div>
            </div>
          )}

          {passo === 'premio' && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-fg-muted-token">{PASSOS[2].ajuda}</p>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-fg-token">Mensagem no direct</span>
                <textarea
                  className={`${CAMPO} min-h-28`}
                  placeholder="Oi! Seu cupom é SET10, vale até domingo 🍝"
                  value={rascunho.mensagem_dm}
                  onChange={(e) => setRascunho({ ...rascunho, mensagem_dm: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-fg-token">Resposta no comentário (opcional)</span>
                <input
                  className={CAMPO}
                  placeholder="Te mandei no direct! 💜"
                  value={rascunho.resposta_publica}
                  onChange={(e) => setRascunho({ ...rascunho, resposta_publica: e.target.value })}
                />
              </label>
              {erro && <p className="text-sm text-danger-token">{erro}</p>}
              <div className="flex items-center gap-2">
                <button type="button" className={PRIMARIO} disabled={!!falta || salvando} onClick={criar}>
                  {salvando ? 'Publicando…' : 'Colocar no ar'}
                </button>
                <button type="button" className={DISCRETO} onClick={onCancelar}>Cancelar</button>
              </div>
            </div>
          )}
        </div>

        {/* Prévia: o post escolhido e a mensagem como o cliente vai ver. */}
        <aside className="flex flex-col gap-3 rounded-xl bg-surface-muted-token p-4">
          <p className="text-caption font-semibold uppercase tracking-wide text-fg-muted-token">Prévia</p>
          {escolhida?.imagem ? (
            <img
              src={escolhida.imagem}
              alt=""
              className="aspect-square w-full rounded-lg object-cover"
            />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-dashed border-border-token text-caption text-fg-muted-token">
              Escolha uma publicação
            </div>
          )}
          <p className="text-sm text-fg-token">
            <strong>Na legenda:</strong>{' '}
            {frasePublica({
              palavra_chave: rascunho.palavra_chave,
              exige_marcar_amigos: rascunho.exige_marcar_amigos,
              exige_seguir: rascunho.exige_seguir,
            })}
          </p>
          <div className="flex items-start gap-2">
            <InstagramIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p className="flex-1 rounded-2xl rounded-tl-sm bg-surface-token p-3 text-sm text-fg-token">
              {rascunho.mensagem_dm.trim() || 'A mensagem do direct aparece aqui.'}
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
};

export default NovaPromocao;
