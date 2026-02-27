# UX/UI Revamp Master Plan — Pastita Dashboard

## 1) Diagnóstico honesto (estado atual)

### Pontos fortes (manter)
- Produto já está em produção e acoplado corretamente aos endpoints do backend.
- Ecossistema de páginas é amplo (operações, marketing, conversas, analytics, IA).
- Existe identidade visual de marca (Marsala) e estrutura de componentes reutilizáveis.
- Arquitetura modular em `components`, `pages`, `hooks`, `services`, `context`.

### Gaps críticos de UX/UI (prioridade alta)
- Falta de **hierarquia de informação** em páginas de alta complexidade.
- Navegação extensa sem um fluxo claro “o que fazer agora”.
- Densidade visual alta (muitos itens competindo por atenção).
- Inconsistência de espaçamento, profundidade visual e estados interativos.
- Falta de padrões robustos para loading skeleton, empty state e erro em todos os fluxos.

---

## 2) Objetivo do revamp

Transformar o dashboard em uma experiência de operação premium com:
- **Tomada de decisão rápida** (insights + ações rápidas no topo).
- **Navegação previsível** (arquitetura de informação por domínio).
- **Sistema visual consistente** (tokens + componentes + guidelines).
- **Escalabilidade** (novas páginas mantendo o mesmo padrão de UX).

---

## 3) Princípios de design

1. **Contexto primeiro**: usuário entende onde está, o que mudou e qual próximo passo.
2. **Menos ruído, mais ação**: cada tela com CTA principal e secundário bem definidos.
3. **Progressive disclosure**: detalhes avançados só quando necessários.
4. **Consistência operacional**: padrões de tabela, formulário, filtros e métricas.
5. **Feedback contínuo**: estados de carregamento, sucesso, erro e conexão em tempo real.
6. **Acessibilidade por padrão**: contraste, foco visível, navegação por teclado e ARIA.

---

## 4) Arquitetura UX proposta

## 4.1 Trilhas principais
- **Operação diária**: Dashboard → Pedidos → Conversas/WhatsApp.
- **Crescimento**: Marketing → Campanhas → Analytics.
- **Configuração**: Lojas → Integrações → Configurações.
- **Automação/IA**: Agentes → Intenções → Logs/Relatórios.

## 4.2 Estrutura padrão de página (template)
1. Header contextual (título + breadcrumb + filtros globais).
2. Hero de contexto (insight principal + ações rápidas).
3. Métricas resumidas (cards).
4. Conteúdo principal (gráficos, tabelas, kanban).
5. Painel lateral opcional (status operacional e atalhos).

---

## 5) Sistema de design (v2)

## 5.1 Tokens
- Cores semânticas: `brand`, `success`, `warning`, `danger`, `info`, `neutral`.
- Escala de spacing em 4px.
- Tipografia: hierarquia H1/H2/H3 + body + caption.
- Sombreamento por profundidade (`sm`, `md`, `lg`) com parcimônia.

## 5.2 Componentes base
- `PageHeader`, `PageSection`, `StatCard`, `ActionCard`, `FilterBar`.
- `DataTable` com estados: loading/empty/error/success.
- `FormLayout` com validação e mensagens consistentes.
- `StatusPill` e `ConnectionBadge` para real-time.

## 5.3 Estados UX obrigatórios
- Skeleton para blocos e listas.
- Empty state com orientação + CTA.
- Erro com retry contextual.
- Toasts padronizados para feedback de ações.

---

## 6) Metodologias e stack moderna recomendada

- **Design Ops**: Figma Variables + component library sincronizada com tokens do código.
- **Research Lean**: entrevistas curtas + análise de eventos críticos.
- **Métricas de produto**: time-to-task, taxa de sucesso por fluxo, NPS interno do time.
- **Front-end moderno**:
  - React + TypeScript (já existente).
  - Chakra UI v3 + utilitários Tailwind (coexistência guiada por guideline).
  - React Query para estado assíncrono com cache e invalidações previsíveis.
  - Storybook para catálogo de componentes e revisão visual.
  - Testes: RTL (comportamento), Playwright (fluxos críticos).

---

## 7) Tasklist robusta e sistemática

## Fase 0 — Descoberta (1 semana)
- [ ] Mapear jornadas por persona (operador, gestor, marketing).
- [ ] Levantar top 20 tarefas de uso diário.
- [ ] Instrumentar eventos mínimos de navegação e conversão.
- [ ] Definir baseline de UX (tempo médio por tarefa e erros).

## Fase 1 — Foundation UI (1–2 semanas)
- [ ] Revisar tokens de cor, tipografia, spacing e radius.
- [ ] Criar guidelines de layout (desktop/mobile).
- [ ] Padronizar Header, Sidebar, Card, Button e EmptyState.
- [ ] Implementar estados de foco/hover/active acessíveis.
- [ ] Consolidar tema claro/escuro com contraste AA.

## Fase 2 — Navegação e IA de conteúdo (1 semana)
- [ ] Reorganizar menu por domínio funcional.
- [ ] Remover páginas legadas da navegação (ex.: delivery zones).
- [ ] Adicionar busca de navegação e expansão automática por rota ativa.
- [ ] Melhorar breadcrumbs com labels semânticos.

## Fase 3 — Revamp das páginas críticas (2–3 semanas)
- [ ] Dashboard (hero de contexto, métricas, ações rápidas, saúde operacional).
- [ ] Pedidos (kanban + filtros avançados + resumo por status).
- [ ] Conversas/WhatsApp (layout de produtividade e atalhos).
- [ ] Produtos (catálogo com filtros, bulk actions e feedback de estoque).
- [ ] Marketing (visão por campanhas e funil).

## Fase 4 — Estados, performance e confiabilidade (1–2 semanas)
- [ ] Skeletons em todas as telas de listagem e chart.
- [ ] Retry inteligente para falhas de API.
- [ ] Otimização de render em listas extensas (memo/virtualização quando necessário).
- [ ] Revisão de performance web (LCP, INP, CLS).

## Fase 5 — Qualidade e rollout (contínuo)
- [ ] Storybook com componentes críticos.
- [ ] Testes E2E para fluxos de receita (pedido, conversa, campanha).
- [ ] Rollout gradual por feature flag.
- [ ] Monitorar métricas por 30 dias e iterar.

---

## 8) Entregas incrementais sugeridas

### Sprint A (já iniciado nesta atualização)
- Revamp da estrutura visual global (layout, header, sidebar).
- Dashboard com narrativa operacional + ações rápidas.
- Retirada de item legado de entregas da navegação.

### Sprint B
- Padrão único de páginas (`PageShell`) com filtros e bloco de insights.
- Atualização visual de Pedidos, Produtos e Conversas.

### Sprint C
- Padronização de formulários, tabelas e mensagens de erro/sucesso.
- Revisão final de acessibilidade e performance.

---

## 9) Critérios de sucesso (DoD UX/UI)

- Tempo médio para acessar “Pedidos pendentes” reduzido em 30%.
- Aumento de 20% no uso de ações rápidas no dashboard.
- Redução de retrabalho por dúvida de navegação.
- Score de satisfação interna do painel > 8/10.
- Cobertura visual consistente entre páginas críticas.
