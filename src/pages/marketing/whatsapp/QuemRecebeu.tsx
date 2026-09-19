/**
 * Quem recebeu a campanha, quem falhou e quem ficou de fora — e por quê.
 *
 * O relatório mostrava só contagens: a campanha de 18/09 aparecia como
 * "28 destinatários" sem menção aos 352 que ficaram de fora, e as falhas
 * vinham com um chute. A lista vem de `/destinatarios/`, com o motivo de
 * cada pessoa escrito em português pelo backend.
 */
import React, { useEffect, useState } from 'react';
import {
  campaignsService,
  type DestinatariosDaCampanha,
  type SituacaoDoDestinatario,
} from '../../../services/campaigns';

const ABAS: Array<{ id: SituacaoDoDestinatario; rotulo: string }> = [
  { id: 'leu', rotulo: 'Leram' },
  { id: 'recebeu', rotulo: 'Receberam' },
  { id: 'falhou', rotulo: 'Falharam' },
  { id: 'ficou_de_fora', rotulo: 'Ficaram de fora' },
  { id: 'na_fila', rotulo: 'Na fila' },
];

interface Props {
  campaignId: string;
}

export const QuemRecebeu: React.FC<Props> = ({ campaignId }) => {
  const [dados, setDados] = useState<DestinatariosDaCampanha | null>(null);
  const [erro, setErro] = useState(false);
  const [aba, setAba] = useState<SituacaoDoDestinatario | null>(null);

  useEffect(() => {
    let vivo = true;
    setErro(false);
    campaignsService
      .getDestinatarios(campaignId)
      .then((d) => {
        if (!vivo) return;
        setDados(d);
        // Abre na primeira aba com gente — uma aba vazia de cara não diz nada.
        setAba((atual) => atual ?? ABAS.find((a) => (d.resumo[a.id] ?? 0) > 0)?.id ?? 'leu');
      })
      .catch(() => { if (vivo) setErro(true); });
    return () => { vivo = false; };
  }, [campaignId]);

  if (erro) {
    return (
      <p role="alert" className="text-sm text-fg-muted-token">
        Não foi possível carregar quem recebeu esta campanha.
      </p>
    );
  }
  if (!dados) return <p className="text-sm text-fg-muted-token">Carregando a lista…</p>;

  const abasComGente = ABAS.filter((a) => (dados.resumo[a.id] ?? 0) > 0 || a.id === 'leu');
  const pessoas = dados.pessoas.filter((p) => p.situacao === aba);

  return (
    <section className="space-y-3">
      <h4 className="text-sm font-semibold text-fg-token">Quem recebeu e quem ficou de fora</h4>
      <div role="tablist" className="flex flex-wrap gap-2">
        {abasComGente.map((a) => (
          <button
            key={a.id}
            type="button"
            role="tab"
            aria-selected={aba === a.id}
            onClick={() => setAba(a.id)}
            className={`rounded-full px-3 py-1 text-xs font-semibold border transition ${
              aba === a.id
                ? 'bg-brand text-on-brand border-brand'
                : 'border-border-token text-fg-token hover:bg-surface-2'
            }`}
          >
            {a.rotulo} · {dados.resumo[a.id] ?? 0}
          </button>
        ))}
      </div>
      {pessoas.length === 0 ? (
        <p className="text-sm text-fg-muted-token">Ninguém nesta situação.</p>
      ) : (
        <ul className="max-h-80 overflow-y-auto rounded-xl border border-border-token divide-y divide-border-token">
          {pessoas.map((p) => (
            <li key={p.id} className="px-4 py-3">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <span className="text-sm font-semibold text-fg-token">{p.nome || p.telefone}</span>
                {p.nome && <span className="text-xs text-fg-muted-token">{p.telefone}</span>}
              </div>
              <p className="text-xs text-fg-muted-token mt-0.5">{p.motivo}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default QuemRecebeu;
