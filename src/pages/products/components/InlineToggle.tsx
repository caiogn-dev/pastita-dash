/**
 * Os dois controles que se repetem em cada linha do cardápio.
 *
 * O estado era um par de botões "Pausado | Ativo" pintados de vermelho e
 * verde. Numa lista de 75 produtos são 150 botões coloridos brigando pela
 * atenção — e o vermelho, que no resto do painel quer dizer ERRO, aqui queria
 * dizer só "pausado". Virou switch: um toque, sem gritar.
 */
import React from 'react';
import { Star } from 'lucide-react';

import { Switch } from '../../../components/common/Switch';

interface StatusProps {
  active: boolean;
  onChange: (a: boolean) => void;
  /** Nome do item — entra no rótulo acessível ("Combo Tilápia está ativo"). */
  nome?: string;
}

export const StatusToggle: React.FC<StatusProps> = ({ active, onChange, nome }) => (
  <Switch
    checked={active}
    onChange={onChange}
    size="sm"
    ariaLabel={
      nome
        ? `${nome} está ${active ? 'ativo no cardápio' : 'pausado'}`
        : active ? 'Ativo no cardápio' : 'Pausado'
    }
  />
);

interface FeaturedProps {
  featured: boolean;
  onChange: (f: boolean) => void;
  nome?: string;
}

export const FeaturedToggle: React.FC<FeaturedProps> = ({ featured, onChange, nome }) => (
  <button
    type="button"
    aria-label={
      featured
        ? `Tirar ${nome ?? 'o item'} do destaque`
        : `Destacar ${nome ?? 'o item'} no cardápio`
    }
    aria-pressed={featured}
    onClick={() => onChange(!featured)}
    className="rounded p-1 text-fg-muted-token transition-colors hover:bg-surface-muted-token focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
  >
    <Star size={16} className={featured ? 'fill-warning-token text-warning-token' : ''} />
  </button>
);
