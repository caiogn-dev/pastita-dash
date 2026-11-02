/**
 * Escolhas do combo antes de entrar no pedido: um bloco por grupo, cada opção
 * com − / + (ou toque, quando o grupo aceita uma só). "Adicionar" só acende
 * com os obrigatórios completos — o servidor recusaria de qualquer jeito.
 */
import React, { useState } from 'react';
import { MinusIcon, PlusIcon } from '@heroicons/react/24/outline';
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from '../../../components/ui';
import { cn } from '../../../utils/cn';
import { formatCurrency } from '../../../utils/formatters';
import type { StoreCombo } from '../../../services/storesApi';
import {
  escolhasProntas, opcoesDoGrupo, precoDoCombo, tituloDoGrupo, type Escolhas,
} from './combosDoPedido';

export function EscolhasDoCombo({ combo, onFechar, onAdicionar }: {
  combo: StoreCombo;
  onFechar: () => void;
  onAdicionar: (escolhas: Escolhas) => void;
}) {
  const [escolhas, setEscolhas] = useState<Escolhas>({});
  const pronto = escolhasProntas(combo, escolhas);
  const preco = precoDoCombo(combo, escolhas);

  const mudar = (grupo: string, id: string, delta: 1 | -1, max: number, maxDoGrupo: number) => {
    setEscolhas((atual) => {
      const lista = [...(atual[grupo] ?? [])];
      if (delta < 0) {
        const i = lista.indexOf(id);
        if (i >= 0) lista.splice(i, 1);
      } else {
        // Grupo de uma escolha só: tocar troca a escolha.
        if (maxDoGrupo === 1) return { ...atual, [grupo]: [id] };
        if (lista.length >= maxDoGrupo || lista.filter((x) => x === id).length >= max) return atual;
        lista.push(id);
      }
      return { ...atual, [grupo]: lista };
    });
  };

  return (
    <Modal open onClose={onFechar} ariaLabel={combo.name} size="lg">
      <ModalHeader title={combo.name} />
      <ModalBody className="space-y-5">
        {[...combo.groups].sort((a, b) => a.position - b.position).map((g) => {
          const marcadas = escolhas[g.id] ?? [];
          const falta = Math.max(0, (g.is_required ? Math.max(1, g.min_selections) : g.min_selections) - marcadas.length);
          return (
            <section key={g.id} aria-label={tituloDoGrupo(g)}>
              <header className="mb-2 flex items-baseline justify-between gap-3">
                <h3 className="text-sm font-semibold text-fg-token">{tituloDoGrupo(g)}</h3>
                <span className={cn('text-xs tabular-nums', falta > 0 ? 'text-warning-token' : 'text-fg-muted-token')}>
                  {marcadas.length}/{g.max_selections}{falta > 0 ? ` · falta ${falta}` : ''}
                </span>
              </header>
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {opcoesDoGrupo(g).map((o) => {
                  const n = marcadas.filter((x) => x === o.id).length;
                  const um = g.max_selections === 1;
                  return (
                    <li
                      key={o.id}
                      className={cn(
                        'flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm',
                        n > 0 ? 'border-brand bg-brand-soft' : 'border-border-token',
                      )}
                    >
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        aria-pressed={n > 0}
                        onClick={() => (um && n > 0 ? mudar(g.id, o.id, -1, o.max, g.max_selections) : mudar(g.id, o.id, 1, o.max, g.max_selections))}
                      >
                        <span className="block truncate text-fg-token">{o.nome}</span>
                        {combo.dynamic_pricing && o.preco > 0 && (
                          <span className="text-xs tabular-nums text-fg-muted-token">+{formatCurrency(o.preco)}</span>
                        )}
                      </button>
                      {!um && n > 0 && (
                        <span className="inline-flex items-center rounded-full border border-border-token bg-surface">
                          <button type="button" aria-label={`Menos ${o.nome}`} className="p-1" onClick={() => mudar(g.id, o.id, -1, o.max, g.max_selections)}>
                            <MinusIcon className="h-3 w-3" />
                          </button>
                          <span className="w-5 text-center text-xs font-bold tabular-nums">{n}</span>
                          <button type="button" aria-label={`Mais ${o.nome}`} className="p-1" onClick={() => mudar(g.id, o.id, 1, o.max, g.max_selections)}>
                            <PlusIcon className="h-3 w-3" />
                          </button>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onFechar}>Cancelar</Button>
        <Button disabled={!pronto} onClick={() => onAdicionar(escolhas)}>
          Adicionar · {formatCurrency(preco)}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
