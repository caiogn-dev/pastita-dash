import React from 'react';
import { PhotoIcon } from '@heroicons/react/24/outline';
import type { StoreProduct } from '../../../services/storesApi';
import { formatCurrency } from '../../../utils/formatters';
import { RascunhoDoCombo, precoAPartirDe, precoDaOpcao, tituloParaOCliente, regraDoGrupo } from './rascunhoDoCombo';

interface Props {
  rascunho: RascunhoDoCombo;
  produtos: StoreProduct[];
  /** Foto escolhida no computador e ainda não enviada. */
  fotoLocal?: string;
}

const MAX_OPCOES_NA_PREVIA = 4;

/** O combo como o cliente vê no cardápio — o lojista confere antes de salvar. */
export const PreviaDoCombo: React.FC<Props> = ({ rascunho, produtos, fotoLocal }) => {
  const foto = fotoLocal || rascunho.fotoUrl;
  const aPartirDe = precoAPartirDe(rascunho);

  return (
    <div className="overflow-hidden rounded-3xl border border-border-token bg-surface shadow-sm" data-testid="previa-do-combo">
      <div className="aspect-[4/3] bg-surface-2">
        {foto ? (
          <img src={foto} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <PhotoIcon className="h-10 w-10 text-fg-muted-token" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="space-y-4 p-4">
        <div>
          <p className={`text-lg font-semibold ${rascunho.nome ? 'text-fg-token' : 'text-fg-muted-token'}`}>
            {rascunho.nome || 'Nome do combo'}
          </p>
          <p className="mt-1 flex items-baseline gap-2">
            {rascunho.precoPelaSoma && aPartirDe > 0 && (
              <span className="text-xs text-fg-muted-token">a partir de</span>
            )}
            <span className="text-xl font-bold text-brand-ink">{formatCurrency(aPartirDe)}</span>
            {rascunho.precoDe && rascunho.precoDe > aPartirDe && (
              <span className="text-sm text-fg-muted-token line-through">{formatCurrency(rascunho.precoDe)}</span>
            )}
          </p>
          {rascunho.descricao && <p className="mt-2 text-sm text-fg-muted-token">{rascunho.descricao}</p>}
        </div>

        {rascunho.grupos.map(g => {
          const { modo, a, b } = regraDoGrupo(g);
          const contagem = modo === 'exatamente' ? `${b}` : modo === 'ate' ? `até ${b}` : `${a} a ${b}`;
          const resto = g.opcoes.length - MAX_OPCOES_NA_PREVIA;
          return (
            <div key={g.chave} className="border-t border-border-token pt-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-fg-token">{tituloParaOCliente(g, produtos)}</p>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    g.minimo > 0 ? 'bg-brand-soft text-brand-ink' : 'bg-surface-2 text-fg-muted-token'
                  }`}
                >
                  {g.minimo > 0 ? 'Obrigatório' : 'Opcional'} · {contagem}
                </span>
              </div>
              <ul className="space-y-1">
                {g.opcoes.slice(0, MAX_OPCOES_NA_PREVIA).map(o => {
                  const preco = precoDaOpcao(o);
                  return (
                    <li key={o.chave} className="flex items-center justify-between text-sm">
                      <span className="truncate text-fg-token">{o.nome}</span>
                      <span className="shrink-0 text-fg-muted-token">
                        {!rascunho.precoPelaSoma ? '' : preco === 0 ? 'Grátis' : `+ ${formatCurrency(preco)}`}
                      </span>
                    </li>
                  );
                })}
                {resto > 0 && <li className="text-xs text-fg-muted-token">+ {resto} opções</li>}
                {g.opcoes.length === 0 && <li className="text-xs text-fg-muted-token">Sem opções</li>}
              </ul>
            </div>
          );
        })}

        {rascunho.inclui.filter(Boolean).length > 0 && (
          <div className="border-t border-border-token pt-3">
            <p className="mb-1 text-sm font-semibold text-fg-token">Vem junto</p>
            <ul className="space-y-0.5 text-sm text-fg-muted-token">
              {rascunho.inclui.filter(Boolean).map(item => <li key={item}>{item}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreviaDoCombo;
