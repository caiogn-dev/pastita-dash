import React, { useMemo, useState } from 'react';
import { CheckIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { Modal, SearchInput, Button } from '../../ui';
import type { StoreProduct } from '../../../services/storesApi';
import { formatCurrency } from '../../../utils/formatters';

interface Props {
  aberto: boolean;
  produtos: StoreProduct[];
  /** Já estão no grupo: aparecem marcados e não somam de novo. */
  jaEscolhidos: Set<string>;
  onFechar: () => void;
  onConfirmar: (produtos: StoreProduct[]) => void;
}

const SEM_CATEGORIA = 'Sem categoria';
const categoriaDe = (p: StoreProduct) => p.category_name || SEM_CATEGORIA;
const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const SeletorDeProdutos: React.FC<Props> = ({ aberto, produtos, jaEscolhidos, onFechar, onConfirmar }) => {
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState<string>('');
  const [marcados, setMarcados] = useState<Set<string>>(new Set());

  const categorias = useMemo(() => {
    const contagem = new Map<string, number>();
    produtos.forEach(p => contagem.set(categoriaDe(p), (contagem.get(categoriaDe(p)) || 0) + 1));
    return [...contagem.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'));
  }, [produtos]);

  const visiveis = useMemo(() => {
    const termo = semAcento(busca.trim());
    return produtos.filter(p =>
      (!categoria || categoriaDe(p) === categoria) && (!termo || semAcento(p.name).includes(termo)),
    );
  }, [produtos, busca, categoria]);

  const alternar = (id: string) => {
    if (jaEscolhidos.has(id)) return;
    setMarcados(prev => {
      const prox = new Set(prev);
      if (prox.has(id)) prox.delete(id); else prox.add(id);
      return prox;
    });
  };

  const livresVisiveis = visiveis.filter(p => !jaEscolhidos.has(p.id));
  const todosVisiveisMarcados = livresVisiveis.length > 0 && livresVisiveis.every(p => marcados.has(p.id));

  const marcarVisiveis = () => {
    setMarcados(prev => {
      const prox = new Set(prev);
      livresVisiveis.forEach(p => (todosVisiveisMarcados ? prox.delete(p.id) : prox.add(p.id)));
      return prox;
    });
  };

  const fechar = () => {
    setMarcados(new Set());
    setBusca('');
    setCategoria('');
    onFechar();
  };

  const confirmar = () => {
    onConfirmar(produtos.filter(p => marcados.has(p.id)));
    fechar();
  };

  return (
    <Modal open={aberto} onClose={fechar} title="Adicionar opções" size="lg">
      <div className="space-y-3">
        <SearchInput value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar produto" autoFocus />

        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Categorias">
          {[['', produtos.length] as [string, number], ...categorias].map(([nome, qtd]) => (
            <button
              key={nome || 'todas'}
              type="button"
              role="tab"
              aria-selected={categoria === nome}
              onClick={() => setCategoria(nome)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                categoria === nome
                  ? 'border-brand bg-brand text-on-brand'
                  : 'border-border-token text-fg-muted-token hover:bg-surface-2'
              }`}
            >
              {nome || 'Todas'} <span className="opacity-70">{qtd}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={marcarVisiveis}
            disabled={livresVisiveis.length === 0}
            className="text-sm font-semibold text-brand-ink hover:underline disabled:opacity-40"
          >
            {todosVisiveisMarcados ? 'Desmarcar todos' : categoria ? `Todos de ${categoria}` : 'Marcar todos'}
          </button>
          <span className="text-sm text-fg-muted-token">{marcados.size} marcados</span>
        </div>

        <ul className="max-h-[50vh] overflow-y-auto divide-y divide-border-token rounded-xl border border-border-token">
          {visiveis.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-fg-muted-token">Nenhum produto</li>
          )}
          {visiveis.map(p => {
            const ja = jaEscolhidos.has(p.id);
            const marcado = ja || marcados.has(p.id);
            const foto = p.main_image_url || p.main_image;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => alternar(p.id)}
                  disabled={ja}
                  aria-pressed={marcado}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                    marcado ? 'bg-brand-soft' : 'hover:bg-surface-2'
                  } ${ja ? 'cursor-default opacity-60' : ''}`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                      marcado ? 'border-brand bg-brand text-on-brand' : 'border-border-token'
                    }`}
                    aria-hidden="true"
                  >
                    {marcado && <CheckIcon className="h-3.5 w-3.5" />}
                  </span>
                  {foto ? (
                    <img src={foto} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" loading="lazy" />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-2" aria-hidden="true">
                      <PhotoIcon className="h-5 w-5 text-fg-muted-token" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-fg-token">{p.name}</span>
                    <span className="block text-xs text-fg-muted-token">{categoriaDe(p)}</span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-fg-token">{formatCurrency(p.price)}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={fechar}>Cancelar</Button>
          <Button type="button" onClick={confirmar} disabled={marcados.size === 0}>
            Adicionar {marcados.size > 0 ? marcados.size : ''}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SeletorDeProdutos;
