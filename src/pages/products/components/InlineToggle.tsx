import React from 'react';
import { Star } from 'lucide-react';

export const StatusToggle: React.FC<{ active: boolean; onChange: (a: boolean) => void }> = ({ active, onChange }) => (
  <div className="inline-flex overflow-hidden rounded border text-xs">
    <button type="button" onClick={() => onChange(false)}
      className={!active ? 'bg-danger-token px-2 py-1 text-white' : 'px-2 py-1'}>Pausado</button>
    <button type="button" onClick={() => onChange(true)}
      className={active ? 'bg-success-token px-2 py-1 text-white' : 'px-2 py-1'}>Ativo</button>
  </div>
);

export const FeaturedToggle: React.FC<{ featured: boolean; onChange: (f: boolean) => void }> = ({ featured, onChange }) => (
  <button type="button" aria-label="destacar" onClick={() => onChange(!featured)}>
    <Star size={16} className={featured ? 'fill-warning-token text-warning-token' : 'text-fg-muted-token'} />
  </button>
);
