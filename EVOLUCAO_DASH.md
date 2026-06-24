# Evolução do Cardapidex Dashboard

Backlog priorizado e histórico do loop diário de evolução do painel.
Regras: uma fatia de valor por execução, TDD e zero-regressão, nunca quebrar
produção (push na `main` = deploy de produção na Vercel; erro de TS bloqueia o
build). PR sempre — nunca push direto na `main`.

## Baseline medido (2026-06-24)

| Gate | Antes | Depois |
| --- | --- | --- |
| `npx tsc --noEmit` | ✅ limpo | ✅ limpo |
| `npm test` (Jest) | ✅ 281 testes / 64 suítes | ✅ 281 / 64 |
| `npm run lint` | ❌ **falha** (415 warnings > limite 400) | ✅ **passa** (341 warnings) |

Observação: o `lint` não está no caminho de build da Vercel
(`build = tsc && vite build`), então o gate vermelho não bloqueava o deploy —
mas o comando `npm run lint` estava quebrado para o time.

### Distribuição dos warnings de lint

| Regra | Antes | Depois |
| --- | --- | --- |
| `@typescript-eslint/no-explicit-any` | 204 | 204 |
| `@typescript-eslint/no-unused-vars` | 150 | 76 |
| `react-hooks/exhaustive-deps` | 39 | 39 |
| `react-refresh/only-export-components` | 22 | 22 |
| **Total** | **415** | **341** |

## Backlog priorizado (aberto)

1. **`react-hooks/exhaustive-deps` (39 warnings)** — risco real de bug
   (stale closures / efeitos que não re-disparam). Tratar caso a caso, com
   cuidado para não introduzir loops de re-render. Maior valor funcional.
2. **`no-unused-vars` restantes (76)** — agora são variáveis/parâmetros locais
   atribuídos e não usados (não mais imports). Limpar exige ler o contexto de
   cada um; alguns podem indicar lógica incompleta. Médio valor.
3. **`@typescript-eslint/no-explicit-any` (204)** — tipar pontos quentes
   (services, respostas de API) reduz risco e melhora DX. Fatiar por módulo
   (ex.: um service por execução). Grande volume, fatiar bastante.
4. **Acessibilidade** — só 33 `aria-label` para ~404 `<button>`. Muitos botões
   só-de-ícone provavelmente sem nome acessível. Fatiar por área crítica
   (Navbar, OrdersPage, ChatWindow) com testes de a11y.
5. **`react-refresh/only-export-components` (22)** — separar exports não-componente
   dos arquivos de componente para preservar Fast Refresh em dev. Baixo valor.

## Histórico

### 2026-06-24 — Remoção de imports mortos + conserto do gate de lint
- **Medido:** `npm run lint` falhava (415 > 400 warnings); 150 desses eram
  `no-unused-vars`, dominados por imports nunca usados (ícones, hooks, tipos).
- **Feito:** removidos 74 specifiers de import mortos em 39 arquivos, dirigido
  pela saída JSON do ESLint e validado pelo `tsc` strict (que falharia se um
  import realmente usado fosse removido). Nenhuma mudança de comportamento.
- **Resultado:** lint 415 → 341 warnings (gate **verde** novamente);
  `tsc` limpo; 281/281 testes verdes. Zero regressão.
- **Próximo passo:** atacar `react-hooks/exhaustive-deps` (item 1) — risco
  funcional real, fatiando por componente com verificação manual.
