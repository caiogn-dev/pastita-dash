import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { StatusToggle } from './InlineToggle';
import type { CategoryGroup } from '../hooks/useProductsGrouped';

interface Props {
  group: CategoryGroup;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onTogglePause: (active: boolean) => void;
  dragHandle?: React.ReactNode;
}
export const CategoryHeader: React.FC<Props> = ({ group, collapsed, onToggleCollapse, onTogglePause, dragHandle }) => (
  <div className="flex items-center justify-between px-3 py-2">
    <div className="flex items-center gap-2">
      {dragHandle}
      <button className="flex items-center gap-2 font-semibold text-primary-token" onClick={onToggleCollapse}>
        {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        {group.name} <span className="text-xs text-fg-muted-token">({group.products.length})</span>
      </button>
    </div>
    {group.id && <StatusToggle active={group.is_active} onChange={onTogglePause} />}
  </div>
);
