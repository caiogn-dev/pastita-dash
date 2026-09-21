/**
 * O post por dentro: quem comentou e o que aconteceu com cada um.
 *
 * O placar conta números; aqui o dono vê o comentário em si — inclusive o que
 * acabou de chegar e ainda não virou participação. É o que responde "fulano
 * comentou e não recebeu?" sem abrir o Instagram.
 */
import React, { useEffect, useState } from 'react';

import {
  instagramCampanhasService,
  type ComentarioDoPost,
  type SituacaoDoComentario,
} from '../../../services/instagramCampanhas';

const SITUACAO: Record<SituacaoDoComentario, { rotulo: string; classe: string }> = {
  recebeu: { rotulo: 'Recebeu no direct', classe: 'text-success-token' },
  participando: { rotulo: 'Está valendo', classe: 'text-fg-muted-token' },
  de_fora: { rotulo: 'Ficou de fora', classe: 'text-danger-token' },
  aguardando: { rotulo: 'Chegando agora', classe: 'text-fg-muted-token' },
};

const hora = (iso: string) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';

export const ComentariosDoPost: React.FC<{ campanhaId: string }> = ({ campanhaId }) => {
  const [lista, setLista] = useState<ComentarioDoPost[] | null>(null);
  const [reconectar, setReconectar] = useState(false);

  useEffect(() => {
    let vivo = true;
    instagramCampanhasService.comentarios(campanhaId)
      .then((c) => { if (vivo) setLista(c); })
      .catch((e) => {
        if (!vivo) return;
        setReconectar(e?.response?.status === 409);
        setLista([]);
      });
    return () => { vivo = false; };
  }, [campanhaId]);

  if (reconectar) {
    return (
      <p className="mt-3 text-sm text-danger-token">
        Reconecte o Instagram para ver os comentários deste post.
      </p>
    );
  }
  if (!lista) return <p className="mt-3 text-caption text-fg-muted-token">Lendo os comentários…</p>;
  if (!lista.length) {
    return <p className="mt-3 text-caption text-fg-muted-token">Ninguém comentou neste post ainda.</p>;
  }

  return (
    <ul className="mt-3 divide-y divide-border-token rounded-xl border border-border-token">
      {lista.map((c) => {
        const situacao = SITUACAO[c.situacao] ?? SITUACAO.aguardando;
        return (
          <li key={c.id} className="flex flex-wrap items-start gap-x-4 gap-y-1 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="flex items-baseline gap-2">
                <span className="font-semibold text-fg-token">@{c.username}</span>
                <time className="text-caption text-fg-muted-token" dateTime={c.quando}>{hora(c.quando)}</time>
                {c.ganhador && (
                  <span className="rounded-full bg-success-soft px-2 py-0.5 text-caption font-semibold text-success-token">
                    Ganhador
                  </span>
                )}
              </p>
              <p className="text-sm text-fg-token">{c.texto}</p>
              {c.motivo && <p className="text-caption text-fg-muted-token">{c.motivo}</p>}
            </div>
            <span className={`shrink-0 text-caption font-semibold ${situacao.classe}`}>
              {situacao.rotulo}
            </span>
          </li>
        );
      })}
    </ul>
  );
};

export default ComentariosDoPost;
