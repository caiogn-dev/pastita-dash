# Design — Sistema de UI + Identidade do Painel (pastita-dash)

**Data:** 2026-06-13
**Escopo:** dar identidade visual coesa ao painel do lojista e consolidar a dívida de UI. **Sem features novas** — a funcionalidade já existe; o objetivo é organizar como designer/engenheiro profissional e criar uma base escalável.

## Objetivo
- Identidade Cardapidex coesa, simples e bonita (não é o "foco mais importante" — é a casca).
- Eliminar a dívida de UI (componentes duplicados) → base escalável.
- Zero feature nova, zero mudança de comportamento, zero regressão de teste.

## Não-objetivos (fora de escopo)
- Novas funcionalidades.
- Redesign do storefront (cardapidex-web).
- Mudança de lógica/dados/endpoints.

## Identidade (decisões fechadas)
Tokens em CSS variables (fonte única de verdade), com dark mode mantido.

| Token | Valor (light) | Uso |
|---|---|---|
| `--brand` / primário | `#166534` (Verde Floresta) | botões, números-chave, item ativo, foco |
| `--brand-strong` | `#11241c` | topbar/marca (fundo escuro) |
| `--brand-soft` | `#dcfce7` | fundo de badge sucesso |
| `--canvas` | `#eef0ec` | fundo da página (profundidade, **não branco puro**) |
| `--surface` | `#ffffff` | cards/painéis |
| `--border` | `#cfd8d1` / `#d7ded8` | **bordas firmes e definidas** |
| `--fg` | `#0f1f17` | texto principal |
| `--fg-muted` | `#5b6b62` | texto secundário/labels |
| status warning | `#b45309` / `#fef3c7` | "aguardando/preparando" |
| status danger | `#dc2626` | erros/destrutivo |

- **Tipografia:** **Inter** (400/500/600/700/800), `-webkit-font-smoothing: antialiased`, `text-rendering: optimizeLegibility`. Headings com `letter-spacing: -.3px`.
- **Raio (enquadrado/reto):** cards 2px, controles 2px, badges 2px, pills 999px (só onde fizer sentido, ex.: avatar). Visual estruturado/enterprise.
- **Espaço:** escala 4 / 8 / 12 / 16 / 24.
- **Estados:** hover, focus visível e acessível (anel `--brand`), disabled consistentes.

## Componentes (um conjunto canônico)
Consolidar tudo em `src/components/ui/` — **eliminar** as duplicatas em `src/components/common/` e `src/components/molecules/`.

Conjunto canônico: `Button`, `Card`, `Modal`, `Input`/`Select`/`Textarea`, `Badge`, `Table`, `StatCard` (KPI), `EmptyState`, `Tabs`, `Toast` (já existe).

- **Ícones:** padronizar em **lucide-react** (remover heroicons e radix-icons dos componentes migrados).
- Cada componente lê os tokens (sem cor hardcoded).
- Componentes antigos viram re-export do canônico durante a migração, depois removidos.

## Navegação / identidade aplicada
- A identidade da marca (logo + `--brand-strong` + acento `--brand`) vive na **Navbar do topo** (`src/components/layout/Navbar.tsx`) — **não** na Sidebar (legado/morto, não usada).
- Item ativo com destaque claro; densidade confortável para uso prolongado.

## Migração (por tráfego, só visual)
Ordem: **Dashboard → Pedidos → Produtos/Combos → Relatórios → Caixa → Clientes → demais**.
Cada tela: trocar para os componentes canônicos + tokens, sem tocar em lógica/serviços.

## Garantias / qualidade
- Manter os ~150 testes verdes; a mudança é de aparência/estrutura de componente, não comportamento.
- TDD para componentes novos do conjunto canônico (render, variantes, estados).
- `tsc --noEmit` limpo e build de produção OK a cada etapa.
- Sem regressão de rota/navegação (Navbar é a navegação real).

## Arquitetura dos arquivos
- `src/styles/tokens.css` (novo) — todas as CSS variables (light + dark). Importado uma vez.
- `src/components/ui/*` — conjunto canônico.
- Remoção progressiva de `src/components/common/*` e `src/components/molecules/*` (após migração dos consumidores).
- Tailwind config alinhado aos tokens (cores/raio/espaço apontando para as vars).

## Riscos
- Outra sessão (Codex) editou arquivos do repo recentemente — coordenar para não colidir; migrar tela por tela em commits pequenos reduz conflito.
