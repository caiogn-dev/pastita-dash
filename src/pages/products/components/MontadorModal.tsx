import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { StoreCategory } from '../../../services/storesApi';

export interface ConfigMontador {
  builder_step_order: number | null;
  builder_max_selections: number;
  builder_required: boolean;
  builder_included: boolean;
  builder_expand_variants: boolean;
}

interface Props {
  isOpen: boolean;
  saving?: boolean;
  category: StoreCategory;
  onClose: () => void;
  onSave: (config: ConfigMontador) => void;
}

/**
 * Configura a participação de uma categoria no montador ("monte o seu").
 *
 * Até 27/ago/2026 esses quatro passos viviam cravados no código do storefront —
 * base, proteína, complemento e molho, com rótulo, máximo e obrigatoriedade
 * fixos. Agora moram na categoria; sem esta tela o lojista dependeria de alguém
 * abrir um shell para mexer.
 */
export const MontadorModal: React.FC<Props> = ({ isOpen, saving, category, onClose, onSave }) => {
  const ehPasso = category.builder_step_order != null;
  const [ligado, setLigado] = useState(ehPasso);
  const [ordem, setOrdem] = useState(category.builder_step_order ?? 0);
  const [maximo, setMaximo] = useState(category.builder_max_selections ?? 1);
  const [obrigatorio, setObrigatorio] = useState(Boolean(category.builder_required));
  const [incluso, setIncluso] = useState(Boolean(category.builder_included));
  const [expandeVariantes, setExpandeVariantes] = useState(
    Boolean(category.builder_expand_variants),
  );
  const [erro, setErro] = useState('');

  if (!isOpen) return null;

  const salvar = () => {
    if (saving) return;
    if (ligado && (!Number.isFinite(maximo) || maximo < 1)) {
      setErro('O passo precisa aceitar pelo menos 1 item.');
      return;
    }
    setErro('');
    onSave({
      // Ordem vazia é o que tira a categoria do montador.
      builder_step_order: ligado ? Number(ordem) : null,
      builder_max_selections: ligado ? Number(maximo) : 1,
      builder_required: ligado && obrigatorio,
      builder_included: ligado && incluso,
      builder_expand_variants: ligado && expandeVariantes,
    });
  };

  const rotulo = 'text-[length:var(--text-caption)] font-medium text-fg-token';
  const ajuda = 'text-[length:var(--text-caption)] text-fg-muted-token';
  const campo =
    'w-full rounded-md border border-border-token bg-surface-token px-3 py-2 ' +
    'text-[length:var(--text-body)] text-fg-token focus:border-brand focus:outline-none';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-strong/60 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={`Montador — ${category.name}`}
        className="w-full max-w-md rounded-xl border border-border-token bg-surface-token shadow-[var(--elev-flutuante)]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-border-token px-5 py-4">
          <div>
            <p className="text-[length:var(--text-overline)] uppercase tracking-[var(--tracking-overline)] text-fg-muted-token">
              Monte o seu
            </p>
            <h2 className="font-brand text-[length:var(--text-lead)] text-fg-token">
              {category.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded p-1 text-fg-muted-token hover:text-fg-token"
          >
            <X size={18} />
          </button>
        </header>

        <div className="space-y-4 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className={rotulo}>Usar no montador</p>
              <p className={ajuda}>
                O cliente escolhe itens desta categoria como um passo da montagem.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={ligado}
              aria-label="Usar no montador"
              onClick={() => setLigado((v) => !v)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                ligado ? 'bg-brand' : 'bg-border-token'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface-token transition-[left] duration-200 ${
                  ligado ? 'left-[22px]' : 'left-0.5'
                }`}
                style={{ transitionTimingFunction: 'var(--mola)' }}
              />
            </button>
          </div>

          {ligado && (
            <>
              {/* Sem passo na ordem 0 a loja não tem montador — mesma regra do
                  backend (migration 0073) e do storefront. Avisar aqui evita
                  uma configuração que simplesmente não aparece para o cliente. */}
              {Number(ordem) !== 0 && (
                <p
                  role="status"
                  className="rounded-md border border-brand/30 bg-brand-soft px-3 py-2 text-[length:var(--text-caption)] text-fg-token"
                >
                  Alguma categoria precisa ser o <strong>primeiro passo</strong> (posição 1),
                  senão o montador não aparece para o cliente.
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className={rotulo}>Posição</span>
                  <input
                    type="number"
                    min={1}
                    className={campo}
                    value={Number(ordem) + 1}
                    onChange={(e) => setOrdem(Math.max(0, Number(e.target.value) - 1))}
                  />
                  <span className={ajuda}>Ordem da pergunta</span>
                </label>

                <label className="space-y-1">
                  <span className={rotulo}>Quantos itens</span>
                  <input
                    type="number"
                    min={1}
                    aria-label="Quantos itens o cliente pode escolher"
                    className={campo}
                    value={maximo}
                    onChange={(e) => setMaximo(Number(e.target.value))}
                  />
                  <span className={ajuda}>Máximo por passo</span>
                </label>
              </div>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  aria-label="Obrigatório"
                  className="mt-0.5 accent-[var(--brand)]"
                  checked={obrigatorio}
                  onChange={(e) => setObrigatorio(e.target.checked)}
                />
                <span>
                  <span className={rotulo}>Obrigatório</span>
                  <span className={`block ${ajuda}`}>
                    O cliente não fecha a montagem sem escolher aqui.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  aria-label="Já incluso no preço"
                  className="mt-0.5 accent-[var(--brand)]"
                  checked={incluso}
                  onChange={(e) => setIncluso(e.target.checked)}
                />
                <span>
                  <span className={rotulo}>Já incluso no preço</span>
                  <span className={`block ${ajuda}`}>
                    Não cobra à parte — o valor já está no preço base.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  aria-label="Cada variante é uma opção"
                  className="mt-0.5 accent-[var(--brand)]"
                  checked={expandeVariantes}
                  onChange={(e) => setExpandeVariantes(e.target.checked)}
                />
                <span>
                  <span className={rotulo}>Cada variante é uma opção</span>
                  <span className={`block ${ajuda}`}>
                    Um produto “Molho” com 4 sabores vira 4 escolhas.
                  </span>
                </span>
              </label>
            </>
          )}

          {erro && (
            <p role="alert" className="text-[length:var(--text-caption)] text-[var(--danger)]">
              {erro}
            </p>
          )}
        </div>

        <footer className="flex justify-end gap-2 border-t border-border-token px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-2 text-[length:var(--text-body)] text-fg-muted-token hover:text-fg-token"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={salvar}
            disabled={saving}
            className="rounded-md bg-brand px-4 py-2 text-[length:var(--text-body)] font-semibold text-on-brand disabled:opacity-50"
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </footer>
      </div>
    </div>
  );
};
