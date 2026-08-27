import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Pencil, SlidersHorizontal, Check, X } from 'lucide-react';
import { StatusToggle } from './InlineToggle';
import type { CategoryGroup } from '../hooks/useProductsGrouped';

interface Props {
  group: CategoryGroup;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onTogglePause: (active: boolean) => void;
  onRename?: (name: string) => void | Promise<void>;
  onOpenMontador?: () => void;
  dragHandle?: React.ReactNode;
}
export const CategoryHeader: React.FC<Props> = ({ group, collapsed, onToggleCollapse, onTogglePause, onRename, onOpenMontador, dragHandle }) => {
  const [editing, setEditing] = useState(false);
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

  if (editing) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        {dragHandle}
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void save(); if (e.key === 'Escape') cancel(); }}
          disabled={saving}
          className="flex-1 rounded border border-border-token bg-surface px-2 py-1 text-sm font-semibold text-fg-token focus:outline-none focus:ring-1 focus:ring-brand"
          aria-label="Nome da categoria"
        />
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
        {group.id && onRename && (
          <button type="button" onClick={start} aria-label="Renomear categoria" className="text-fg-muted-token hover:text-fg-token">
            <Pencil size={14} />
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
      </div>
      {group.id && <StatusToggle active={group.is_active} onChange={onTogglePause} />}
    </div>
  );
};
