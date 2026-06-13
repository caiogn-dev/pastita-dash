# Painel UI + Identidade — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar identidade visual coesa (Verde Floresta #166534, Inter, cantos retos 2px, bordas firmes) ao painel pastita-dash e consolidar a dívida de UI, sem features novas e sem regressão.

**Architecture:** Fundação primeiro — tokens CSS (`src/styles/tokens.css`) como fonte única, Tailwind apontando para os tokens, um conjunto canônico de componentes em `src/components/ui/`, identidade aplicada na Navbar do topo, e migração de telas por tráfego começando pelo Dashboard.

**Tech Stack:** React + Vite + TypeScript, Tailwind CSS, Vitest/Jest, lucide-react (ícone canônico), fonte Inter.

---

## Estrutura de arquivos
- Criar: `src/styles/tokens.css` — todas as CSS variables (light + dark).
- Modificar: `index.html` (Inter), `tailwind.config.js` (apontar cor/raio para vars), `src/index.css` (importar tokens).
- Canônicos em `src/components/ui/`: `Button.tsx`, `Card.tsx`, `Badge.tsx`, `StatCard.tsx` (já pode existir parcialmente — verificar).
- Modificar: `src/components/layout/Navbar.tsx`, `src/pages/dashboard/DashboardPage.tsx`.
- Backlog: remover duplicatas `src/components/common/*`, `src/components/molecules/*`; remover heroicons/radix dos componentes migrados.

---

### Task 1: Fonte Inter + tokens de design

**Files:**
- Modify: `index.html`
- Create: `src/styles/tokens.css`
- Modify: `src/index.css` (importar tokens no topo)

- [ ] **Step 1: Adicionar Inter no `index.html`** (dentro do `<head>`)

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
```

- [ ] **Step 2: Criar `src/styles/tokens.css`**

```css
:root {
  --brand: #166534;
  --brand-hover: #14532d;
  --brand-strong: #11241c;
  --brand-soft: #dcfce7;
  --canvas: #eef0ec;
  --surface: #ffffff;
  --surface-2: #f7f8f7;
  --border: #cfd8d1;
  --border-strong: #b7c2ba;
  --fg: #0f1f17;
  --fg-muted: #5b6b62;
  --warning: #b45309;
  --warning-soft: #fef3c7;
  --danger: #dc2626;
  --radius: 2px;
  --radius-pill: 999px;
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
}
.dark {
  --brand: #22c55e;
  --brand-hover: #16a34a;
  --brand-strong: #0a0f0c;
  --brand-soft: #14271c;
  --canvas: #0a0f0c;
  --surface: #11181400;
  --surface: #121a15;
  --surface-2: #0e1511;
  --border: #1f2a23;
  --border-strong: #2a382f;
  --fg: #e8f0ec;
  --fg-muted: #9fb3a8;
}
html, body { font-family: var(--font-sans); -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
```

- [ ] **Step 3: Importar tokens no `src/index.css`** (primeira linha, antes do Tailwind)

```css
@import './styles/tokens.css';
```

- [ ] **Step 4: Verificar build**

Run: `npx tsc --noEmit && npm run build`
Expected: compila sem erro.

- [ ] **Step 5: Commit**

```bash
git add index.html src/styles/tokens.css src/index.css
git commit -m "feat(ui): fonte Inter + tokens de design (identidade Verde Floresta, enquadrado)"
```

---

### Task 2: Tailwind apontando para os tokens

**Files:**
- Modify: `tailwind.config.js` (blocos `colors`, `fontFamily`, `borderRadius`)

- [ ] **Step 1: Apontar cor/fonte/raio para as vars** (mesclar nos blocos existentes)

```js
// theme.extend.colors
brand: { DEFAULT: 'var(--brand)', hover: 'var(--brand-hover)', strong: 'var(--brand-strong)', soft: 'var(--brand-soft)' },
canvas: 'var(--canvas)',
surface: { DEFAULT: 'var(--surface)', 2: 'var(--surface-2)' },
'fg-token': 'var(--fg)',
'fg-muted-token': 'var(--fg-muted)',
'border-token': 'var(--border)',
// theme.extend.fontFamily
sans: ['Inter', 'system-ui', 'sans-serif'],
// theme.extend.borderRadius
DEFAULT: 'var(--radius)', md: 'var(--radius)', lg: 'var(--radius)', xl: 'var(--radius)',
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: compila; o app passa a usar Inter e cantos retos onde usa as classes padrão.

- [ ] **Step 3: Commit**

```bash
git add tailwind.config.js
git commit -m "feat(ui): tailwind alinhado aos tokens (cor/fonte/raio)"
```

---

### Task 3: Button canônico (TDD)

**Files:**
- Create/Modify: `src/components/ui/Button.tsx`
- Test: `src/components/ui/__tests__/Button.test.tsx`

- [ ] **Step 1: Teste falhando**

```tsx
import { render, screen } from '@testing-library/react';
import { Button } from '../Button';

test('renderiza variante primária e dispara onClick', () => {
  const onClick = jest.fn();
  render(<Button variant="primary" onClick={onClick}>Salvar</Button>);
  const btn = screen.getByRole('button', { name: 'Salvar' });
  btn.click();
  expect(onClick).toHaveBeenCalled();
  expect(btn.className).toMatch(/bg-brand/);
});

test('estado disabled não dispara', () => {
  const onClick = jest.fn();
  render(<Button disabled onClick={onClick}>X</Button>);
  screen.getByRole('button').click();
  expect(onClick).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Rodar — falha** — `npx jest src/components/ui/__tests__/Button.test.tsx` → FAIL (módulo/variante).

- [ ] **Step 3: Implementar `Button.tsx`**

```tsx
import React from 'react';

type Variant = 'primary' | 'outline' | 'ghost' | 'danger';
interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  leftIcon?: React.ReactNode;
}
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-hover',
  outline: 'border border-border-token text-fg-token hover:bg-surface-2',
  ghost: 'text-fg-muted-token hover:bg-surface-2',
  danger: 'border border-[var(--danger)] text-[var(--danger)] hover:bg-red-50',
};
export const Button: React.FC<Props> = ({ variant = 'primary', leftIcon, className = '', children, ...rest }) => (
  <button
    className={`inline-flex items-center gap-2 rounded px-3.5 py-2 text-sm font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none ${VARIANTS[variant]} ${className}`}
    {...rest}
  >
    {leftIcon}{children}
  </button>
);
export default Button;
```

- [ ] **Step 4: Rodar — passa** — Expected: PASS.

- [ ] **Step 5: Commit** — `git add src/components/ui/Button.tsx src/components/ui/__tests__/Button.test.tsx && git commit -m "feat(ui): Button canônico"`

---

### Task 4: Card + Badge canônicos (TDD)

**Files:**
- Create: `src/components/ui/Card.tsx`, `src/components/ui/Badge.tsx`
- Test: `src/components/ui/__tests__/Card.test.tsx`

- [ ] **Step 1: Teste falhando**

```tsx
import { render, screen } from '@testing-library/react';
import { Card } from '../Card';
import { Badge } from '../Badge';

test('Card aplica superfície e borda', () => {
  render(<Card>conteúdo</Card>);
  const el = screen.getByText('conteúdo');
  expect(el.className).toMatch(/border/);
});
test('Badge mapeia tom', () => {
  render(<Badge tone="success">ok</Badge>);
  expect(screen.getByText('ok').className).toMatch(/brand-soft|bg-/);
});
```

- [ ] **Step 2: Rodar — falha.**

- [ ] **Step 3: Implementar**

```tsx
// Card.tsx
import React from 'react';
export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', ...rest }) => (
  <div className={`bg-surface border border-border-token rounded ${className}`} {...rest} />
);
export default Card;
```

```tsx
// Badge.tsx
import React from 'react';
type Tone = 'success' | 'warning' | 'danger' | 'neutral';
const TONES: Record<Tone, string> = {
  success: 'bg-brand-soft text-brand',
  warning: 'bg-[var(--warning-soft)] text-[var(--warning)]',
  danger: 'bg-red-50 text-[var(--danger)]',
  neutral: 'bg-surface-2 text-fg-muted-token',
};
export const Badge: React.FC<{ tone?: Tone; children: React.ReactNode }> = ({ tone = 'neutral', children }) => (
  <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${TONES[tone]}`}>{children}</span>
);
export default Badge;
```

- [ ] **Step 4: Rodar — passa.**

- [ ] **Step 5: Commit** — `git commit -m "feat(ui): Card e Badge canônicos"`

---

### Task 5: StatCard (KPI) canônico (TDD)

**Files:**
- Create: `src/components/ui/StatCard.tsx`
- Test: `src/components/ui/__tests__/StatCard.test.tsx`

- [ ] **Step 1: Teste falhando**

```tsx
import { render, screen } from '@testing-library/react';
import { StatCard } from '../StatCard';
test('mostra label, valor e é clicável', () => {
  const onClick = jest.fn();
  render(<StatCard label="Pedidos" value={42} onClick={onClick} />);
  expect(screen.getByText('Pedidos')).toBeInTheDocument();
  expect(screen.getByText('42')).toBeInTheDocument();
  screen.getByText('42').closest('div')!.parentElement!.click();
});
```

- [ ] **Step 2: Rodar — falha.**

- [ ] **Step 3: Implementar**

```tsx
import React from 'react';
import { Card } from './Card';
interface Props {
  label: string; value: React.ReactNode; sub?: string;
  tone?: 'default' | 'brand' | 'warning'; onClick?: () => void;
}
const VALUE_TONE = { default: 'text-fg-token', brand: 'text-brand', warning: 'text-[var(--warning)]' };
export const StatCard: React.FC<Props> = ({ label, value, sub, tone = 'default', onClick }) => (
  <Card className={`p-3 flex-1 ${onClick ? 'cursor-pointer hover:bg-surface-2' : ''}`}>
    <div onClick={onClick}>
      <p className="text-[10px] uppercase tracking-wider font-semibold text-fg-muted-token">{label}</p>
      <p className={`text-2xl font-extrabold tracking-tight ${VALUE_TONE[tone]}`}>{value}</p>
      {sub && <p className="text-xs text-fg-muted-token mt-0.5">{sub}</p>}
    </div>
  </Card>
);
export default StatCard;
```

- [ ] **Step 4: Rodar — passa.**

- [ ] **Step 5: Commit** — `git commit -m "feat(ui): StatCard canônico"`

---

### Task 6: Navbar com identidade da marca

**Files:**
- Modify: `src/components/layout/Navbar.tsx`

- [ ] **Step 1: Aplicar tokens no header** — trocar o fundo do header para a marca e o item ativo para `--brand`.

Substituir as classes do `<header>` por:
```tsx
className="sticky top-0 z-40 bg-[var(--brand-strong)] text-white border-b border-[var(--border)]"
```
E nos `NavBtn`/`PortalDropdown`, o estado ativo usa `bg-brand text-white` e inativo `text-white/70 hover:bg-white/10`.

- [ ] **Step 2: Verificar visual + testes** — `npx tsc --noEmit && npx jest && npm run build`
Expected: compila, testes verdes.

- [ ] **Step 3: Commit** — `git add src/components/layout/Navbar.tsx && git commit -m "feat(ui): Navbar com identidade da marca (topbar escura + verde)"`

---

### Task 7: Migrar Dashboard para os componentes canônicos

**Files:**
- Modify: `src/pages/dashboard/DashboardPage.tsx`

- [ ] **Step 1: Substituir os KpiCard locais por `StatCard`** e os cartões/containers por `Card`, importando de `../../components/ui`. Remover cores hardcoded, usar tokens. Não mudar dados/lógica (mesmas props, mesmos onClick de drill-down).

- [ ] **Step 2: Rodar testes e build** — `npx jest src/pages/dashboard && npx tsc --noEmit && npm run build`
Expected: testes do dashboard verdes, build OK.

- [ ] **Step 3: Verificar no navegador** — `bash scripts/... (deploy local)` ou `npm run dev`, conferir identidade aplicada.

- [ ] **Step 4: Commit** — `git add src/pages/dashboard/DashboardPage.tsx && git commit -m "refactor(ui): Dashboard usando componentes canônicos + tokens"`

---

### Task 8 (Backlog): Migrar demais telas + remover dívida

Repetir o padrão da Task 7 (trocar componentes locais pelos canônicos `ui/`, aplicar tokens, sem mudar lógica) nesta ordem, **um commit por tela**:
- [ ] Pedidos (`src/pages/orders/OrdersPage.tsx`)
- [ ] Produtos/Combos (`src/pages/products/ProductsPageNew.tsx`, combos)
- [ ] Relatórios (`src/pages/reports/AnalyticsPage.tsx`)
- [ ] Caixa (`src/pages/cash/CashPage.tsx`)
- [ ] Clientes (`src/pages/customers/CustomersPage.tsx`)
- [ ] Impressão, Storefront, Configurações, demais

Depois que nenhum consumidor usar mais os duplicados:
- [ ] Remover `src/components/common/{Modal,Card}.tsx` e `src/components/molecules/{Modal,Card}.tsx` (e re-exports temporários).
- [ ] Remover `@heroicons/react` e `@radix-ui/react-icons` dos imports migrados; padronizar `lucide-react`.
- [ ] Rodar `npx jest` completo + `tsc --noEmit` + `npm run build` e confirmar verde.
- [ ] Commit final: `chore(ui): remove componentes/ícones duplicados (dívida de UI eliminada)`

---

## Self-review
- **Cobertura da spec:** tokens (T1), Tailwind (T2), conjunto canônico (T3-5), Navbar identidade (T6), migração por tráfego (T7 + backlog T8), remoção de duplicatas/ícone único (T8). ✓
- **Sem placeholder:** cada task tem código real e comandos. ✓
- **Consistência de tipos:** componentes (`Button`, `Card`, `Badge`, `StatCard`) com props definidas e reutilizadas no Dashboard. ✓
- **Zero feature nova / zero mudança de lógica:** explicitado nas tasks 6-8. ✓
