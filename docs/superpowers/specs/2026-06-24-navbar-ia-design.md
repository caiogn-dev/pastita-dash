# Spec 1 — Reorganização da Navbar / IA (pastita-dash)

**Data:** 2026-06-24
**Status:** aprovado o design, aguardando review do spec
**Escopo:** APENAS reorganização do menu de navegação. **Nenhuma página é reescrita.** Os itens continuam apontando para as rotas/páginas atuais; só muda onde eles aparecem e como se agrupam.

Faz parte de um realinhamento maior da experiência B2B do lojista, decomposto em 4 specs:
1. **Navbar / IA** (este) — vitória rápida, baixo risco.
2. Config da Loja unificada e fluida (o build pesado).
3. Ativação guiada (checklist + foco nos botões).
4. Cadastro moderno.

---

## Problema (do audit de IA)

A navbar não é grande demais (9 seções / 31 itens) — é **mal organizada conceitualmente**:

1. **"Marketing"** mistura campanhas de divulgação (WhatsApp/email) com automação/IA (Agentes, Automações, Logs, Handover). Públicos e objetivos diferentes na mesma gaveta.
2. **"Loja"** é gaveta de tranqueira: 9 itens misturando config da loja (Configurações, Entrega, Pagamentos, Storefront) com nível-conta (Todas as Lojas, Contas WhatsApp, Conexões, Sistema, Planos).
3. **Largura:** a barra é horizontal e o código evita scroll horizontal de propósito (`// Desktop nav — no overflow scroll`, Navbar.tsx:342). Splitar ingenuamente levaria de 9 → 12 itens de topo e lotaria em telas ~1366px.
4. **~15 rotas de automação órfãs** (sem link no menu) que o lojista não descobre.

## Objetivo

Barra principal enxuta e com modelo mental claro (operação · crescimento · config da loja), com o nível-conta movido para um menu no avatar (convenção de SaaS). Sem aumentar o risco de quebra de layout. Zero mudança de comportamento das páginas.

---

## Estrutura atual (ponto de partida)

`src/components/layout/Navbar.tsx` define um array `sections: NavSection[]` (linhas ~189–269).
Tipos: `NavSection { label, icon, href?, badge?, items: NavItem[] }`, `NavItem { name, href, icon, badge?, sectionHeader? }`. O `sectionHeader` já permite agrupar itens dentro de um dropdown (usado hoje em "Marketing" e "Loja").

Canto direito hoje: só avatar (inicial) + nome + botão "Sair" (Navbar.tsx:~371–380) — **não é um menu**.

Existe um **drawer mobile** (`max-lg:flex`, Navbar.tsx:~400) que renderiza as mesmas `sections`. **Tem que refletir a nova estrutura também.**

---

## Estrutura alvo

### A. Barra principal (10 seções)

| Ordem | Label | Tipo | Itens (name → rota) |
|---|---|---|---|
| 1 | Início | link | `/` |
| 2 | Pedidos | link | `storeHref('orders')` |
| 3 | Chat | link + badge | `/inbox/whatsapp` (badge = unread, mantido) |
| 4 | PDV | dropdown | Caixa `cash` · Modo Cozinha (KDS) `kds` · Impressão `printing` |
| 5 | Clientes | link | `storeHref('customers')` |
| 6 | Cardápio | dropdown | Produtos `products` · Combos `combos` · Cupons `coupons` |
| 7 | Relatórios | link | `/analytics` |
| 8 | **Campanhas** | dropdown | WhatsApp `/marketing/whatsapp` · Templates `/marketing/whatsapp/templates` · Email `/marketing/email/campaigns` |
| 9 | **Automação** | dropdown | **GATEADA — só aparece com número conectado E agente configurado (ver C).** **Principal:** Agentes IA `/agents` (badge Beta) · Automações `/automation/companies` · Agendamentos `/automation/scheduled` · Handover `/whatsapp/handover` — **Monitoramento (sectionHeader):** Logs IA `/automation/logs` · Intenções `/automation/intents/stats` · Sessões `/automation/sessions` |
| 10 | **Configurações** | dropdown | Geral `storeHref('settings')` · Entrega `storeHref('delivery')` · Storefront `storeHref('storefront')` · Pagamentos `storeHref('payments')` |

> A seção 9 (Automação) é condicional: lojas sem número/agente veem **9 itens**, não 10. Progressive disclosure (ver C).

Mudanças vs. hoje:
- **"Marketing" deixa de existir** → split em **Campanhas** (8) e **Automação** (9, gateada).
- **"Loja" deixa de existir** → parte operacional vira **Configurações** (10); nível-conta vai pro menu do avatar (B). ("Configurações" = loja; "Preferências" = conta, no avatar — sem colisão.)
- Rename de item: dentro de Configurações, o antigo item "Configurações" → **"Geral"**.

### B. Menu do avatar (novo dropdown, canto direito) — nível-conta

```
[Nome da conta / loja atual]
Todas as Lojas         → /stores
Integrações ▸          Contas WhatsApp /accounts · Conexões /connections
Preferências           → /settings          (era "Sistema")
Plano / Assinatura     → /plano
──────────────────────
Sair                   (logout existente)
```

O avatar atual (inicial + nome) vira o **gatilho** do dropdown. "Sair" migra do botão solto para dentro do menu. "Integrações" pode ser um subgrupo (sectionHeader) ou submenu — implementação escolhe o mais simples que caiba no padrão de dropdown já existente.

### C. Progressive disclosure — gating da Automação

A seção **Automação** (9) **só é renderizada** quando a loja atual já tem automação ativável de verdade — senão é gaveta vazia que confunde o lojista novo. Predicado:

```
mostrarAutomacao = hasWhatsApp && hasAgent
```

- **`hasWhatsApp`** — a loja tem número de WhatsApp conectado. Sinal: `store.whatsapp_number` preenchido **OU** existe integração `integration_type === 'whatsapp'` (via `store.integrations_count > 0` + checagem no endpoint de integrações). Na implementação, usar o sinal **mais barato já disponível no contexto da loja** (de preferência o campo no objeto `store`, sem fetch extra); só cair pro endpoint de integrações se o campo não existir.
- **`hasAgent`** — a loja tem ≥1 agente configurado. Sinal: `agentsService.getAgents()` (`src/services/agents.ts:236`) retorna lista não-vazia.

Regras:
1. O cálculo do predicado **não pode bloquear o render da navbar**. Enquanto os sinais carregam (ou se a chamada falhar), trata-se como `false` → Automação fica oculta. Navbar nunca espera por isso.
2. Idealmente reusar dados que o app já tem em cache/contexto (store já carregada, React Query de agents) — **não** introduzir fetch novo no caminho crítico da navbar. Se `getAgents()` ainda não roda em lugar nenhum cedo, usar `useQuery` com `staleTime` alto e `false` como fallback.
3. Vale tanto pro desktop quanto pro **drawer mobile** — mesma seção, mesmo gate.
4. Os **itens internos** da Automação seguem a regra de "verificar antes de linkar" (ver órfãs abaixo): o gate decide se a *seção* aparece; cada *item* só entra se a rota existir e estiver viva.

> Efeito: loja recém-criada (sem número, sem agente) vê barra de **9 seções**. Quando conecta WhatsApp **e** cria um agente, a Automação (10ª) aparece sozinha. Descoberta progressiva, sem treinar o lojista em features que ele ainda não pode usar.

### Órfãs reveladas vs. mantidas órfãs

- **Reveladas** (sob Automação): Logs, Intenções (`/automation/intents/stats`), Sessões (`/automation/sessions`). Confirmar na implementação que cada rota existe e está viva antes de linkar.
- **Verificar-e-talvez-revelar** (só se estiverem vivas e não duplicadas — o audit apontou sobreposição confusa entre CompanyProfiles/Automations/AutoMessages/Flows): Fluxos `/automation/flows`, Mensagens auto `/automation/messages`, Relatórios de automação `/automation/reports`. Se forem dead/duplicadas, **não** linkar (não re-inflar a gaveta).
- **Mantidas órfãs de propósito** (debug, acesso por URL): Webhooks diagnostics, Debug dashboard, orchestrator test, páginas de detalhe/form (OrderDetail, ComboForm, AgentDetail, etc.).

---

## Fora de escopo (vai pro Spec 2 — Config da Loja)

Aqui NÃO se faz; os itens seguem apontando pras páginas atuais como estão:
- Unificar entrega (taxa base hoje em Settings + zonas em DeliveryZones) numa página só.
- Mover a impressora de "PDV" pra config da loja (fica em PDV por enquanto — é dispositivo operacional).
- Dar setup real de pagamento (PaymentsPage continua extrato read-only; só o label/rota seguem).
- Expor os 8 campos do backend hoje escondidos (currency, timezone, min_order_value, toggles, etc.).
- Geo-picker de endereço.

---

## Mudanças de código (resumo)

1. **`src/components/layout/Navbar.tsx`**
   - Reescrever o array `sections` para a estrutura alvo (A). Remover "Marketing" e "Loja"; adicionar "Campanhas", "Automação" (gateada, ver C), "Configurações". Mover nível-conta pra fora do array.
   - Converter o bloco do avatar (canto direito) num **dropdown** (B), reusando o mesmo mecanismo de dropdown/portal já usado pelas seções (não introduzir lib nova). Mover o `logout` pra dentro.
   - Garantir que o **drawer mobile** (`max-lg`) renderize a nova estrutura + um bloco "Conta" (já que o avatar-dropdown desktop não existe no mobile — no mobile os itens de conta entram no fim do drawer).
2. Sem mudança de rotas em `App.tsx`. Sem mudança em páginas. Sem novas dependências.

## Preservar (não pode regredir)

- Badge de não-lidas no "Chat".
- Interpolação `storeHref(path)` com slug/id da loja selecionada.
- Active-state (highlight do item da rota atual) — incluindo nos novos agrupamentos.
- Acessibilidade do dropdown do avatar (teclado/foco) no mesmo nível dos dropdowns atuais.
- Logout funcionando (agora dentro do menu do avatar).

## Verificação

- `npx tsc --noEmit` e `npm run build` verdes (memória: erro TS bloqueia deploy Vercel).
- Checagem manual: cada item do menu (desktop e drawer mobile) navega pra rota certa; nenhum link morto; nenhuma rota que existia no meno antigo ficou inacessível (as de conta agora estão no avatar).
- Largura: barra principal não quebra linha / não cria scroll horizontal em ~1366px.
- `npm test` sem regressões novas (baseline: 14 falhas pré-existentes de test_ComboForm, conforme memória).

## Riscos

- **Baixo.** É edição de um array + um dropdown reusando padrão existente. Maior risco real é esquecer de espelhar a mudança no drawer mobile → incluído explicitamente no escopo.
- Revelar órfã que aponta pra página dead/duplicada → mitigado pela regra "verificar antes de linkar".
