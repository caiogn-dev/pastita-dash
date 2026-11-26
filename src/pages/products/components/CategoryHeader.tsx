import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Pencil, SlidersHorizontal, Check, X, Trash2, Clock } from 'lucide-react';
import { Input } from '../../../components/ui/input';
import { StatusToggle } from './InlineToggle';
import type { CategoryGroup } from '../hooks/useProductsGrouped';

interface Props {
  group: CategoryGroup;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onTogglePause: (active: boolean) => void;
  onRename?: (name: string) => void | Promise<void>;
  onOpenMontador?: () => void;
  /** Excluir a categoria (o pai confirma). Os produtos ficam em "Sem categoria". */
  onDelete?: () => void;
  /** Selo de prazo no cardápio ("Pedidos até dia 15/12"); '' tira. */
  onSaveAviso?: (aviso: string) => void | Promise<void>;
  dragHandle?: React.ReactNode;
}
export const CategoryHeader: React.FC<Props> = ({ group, collapsed, onToggleCollapse, onTogglePause, onRename, onOpenMontador, onDelete, onSaveAviso, dragHandle }) => {
  const [editing, setEditing] = useState(false);
  const [editandoAviso, setEditandoAviso] = useState(false);
  const [aviso, setAviso] = useState(group.aviso || '');
  const [value, setValue] = useState(group.name);
  const [saving, setSaving] = useState(false);

  const start = () => { setValue(group.name); setEditing(true); };
  const cancel = () => { setEditing(false); };
  const save = async () => {
    const nome = value.trim();
    if (!nome || nome === group.name) { setEditing(false); return; }
    setSaving(true);
    try { await onRename?.(nome); setEditing(false); }
    finally { setSaving(false); }
  };

  const salvarAviso = async () => {
    const texto = aviso.trim();
    if (texto === (group.aviso || '')) { setEditandoAviso(false); return; }
    setSaving(true);
    try { await onSaveAviso?.(texto); setEditandoAviso(false); }
    finally { setSaving(false); }
  };

  if (editandoAviso) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        {dragHandle}
        <Clock size={16} className="text-brand" aria-hidden="true" />
        <div className="flex-1">
        <Input
          size="sm"
          autoFocus
          value={aviso}
          maxLength={80}
          onChange={(e) => setAviso(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void salvarAviso(); if (e.key === 'Escape') setEditandoAviso(false); }}
          disabled={saving}
          placeholder="Pedidos até dia 15/12"
          aria-label={`Aviso no cardápio de ${group.name}`}
        />
        </div>
        <button type="button" onClick={() => void salvarAviso()} disabled={saving} aria-label="Salvar aviso" className="text-[var(--success)] disabled:opacity-50">
          <Check size={16} />
        </button>
        <button type="button" onClick={() => setEditandoAviso(false)} disabled={saving} aria-label="Cancelar" className="text-fg-muted-token disabled:opacity-50">
          <X size={16} />
        </button>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        {dragHandle}
        <div className="flex-1">
        <Input
          size="sm"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void save(); if (e.key === 'Escape') cancel(); }}
          disabled={saving}
          className="font-semibold"
          aria-label="Nome da categoria"
        />
        </div>
        <button type="button" onClick={() => void save()} disabled={saving} aria-label="Salvar nome" className="text-[var(--success)] disabled:opacity-50">
          <Check size={16} />
        </button>
        <button type="button" onClick={cancel} disabled={saving} aria-label="Cancelar" className="text-fg-muted-token disabled:opacity-50">
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-3 py-2">
      <div className="flex items-center gap-2">
        {dragHandle}
        <button className="flex items-center gap-2 font-semibold text-primary-token" onClick={onToggleCollapse}>
          {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          {group.name} <span className="text-xs text-fg-muted-token">({group.products.length})</span>
        </button>
        {group.aviso && (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-on-brand">
            <Clock size={12} aria-hidden="true" />{group.aviso}
          </span>
        )}
        {group.id && onRename && (
          <button type="button" onClick={start} aria-label="Renomear categoria" className="text-fg-muted-token hover:text-fg-token">
            <Pencil size={14} />
          </button>
        )}
        {group.id && onSaveAviso && (
          <button
            type="button"
            onClick={() => { setAviso(group.aviso || ''); setEditandoAviso(true); }}
            aria-label={`Aviso no cardápio de ${group.name}`}
            title="Aviso no cardápio"
            className="text-fg-muted-token hover:text-brand"
          >
            <Clock size={14} />
          </button>
        )}
        {group.id && onOpenMontador && (
          <button
            type="button"
            onClick={onOpenMontador}
            aria-label={`Configurar montador em ${group.name}`}
            title="Usar no montador"
            className="text-fg-muted-token hover:text-brand"
          >
            <SlidersHorizontal size={14} />
          </button>
        )}
        {group.id && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Excluir categoria ${group.name}`}
            title="Excluir categoria"
            className="text-fg-muted-token hover:text-[var(--danger)]"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
      {group.id && <StatusToggle active={group.is_active} nome={group.name} onChange={onTogglePause} />}
    </div>
  );
};
