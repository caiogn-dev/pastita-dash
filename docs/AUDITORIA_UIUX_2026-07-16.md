# Auditoria UI/UX completa — pastita-dash (16/jul/2026)

Método: tour ao vivo no painel (Chrome) + auditoria de código por 3 agentes (config/cupons/plano; automação/KDS/chat/PDV; sistema global tokens/dark/mobile/navbar). Alvo de identidade: **Dark Luxe** (carvão + ouro + Cinzel), tokens canônicos `bg-surface`, `bg-surface-2`, `border-border-token`, `text-fg-token`, `text-fg-muted-token`, `bg-brand`, `bg-canvas`; Modal canônico `src/components/ui/modal.tsx`.

Veredito honesto: **o design system existe mas colapsou**. Há 3 sistemas de cor coexistindo (tokens canônicos, tokens legados `fg-primary`/`bg-bg-card`, e Tailwind cru), **3.444 violações de token** no `src/`, módulos inteiros (automação, marketing, inbox WhatsApp, KDS) construídos 100% fora da identidade, e 4+ modais reimplementados à mão sem focus-trap. As páginas novas (PlanoPage, StoreSettingsPage, StorefrontPage) provam que o sistema funciona quando usado — são a referência.

---

## P0 — Estrutura/identidade quebrada + violação de regra

1. **Emails internos expostos como email de cliente** — CustomersPage mostra `99998280@local.invalid`, `whatsapp_556399547790@whatsapp.bot` nas colunas CLIENTE e CONTATO (visto ao vivo). Viola regra do server2 CLAUDE.md ("placeholder emails ... must not show them as real customer email"). Fonte adicional: `src/components/chat/ChatToolsPanel.tsx:770` FABRICA `${phone}@whatsapp.chat` ao criar pedido do inbox — parar de gerar e filtrar exibição.
2. **MainLayout arranca o shell de TODAS as /orders/*** — `MainLayout.tsx:12,24-30`: regex `^\/stores\/[^/]+\/orders(?:\/.*)?$` casa `/orders/new` e `/orders/:id` → OrderNewPage renderiza órfã sem navbar. E `MainLayout.tsx:26` usa fundo cru `bg-[#f5f1e8]` (bege, anti-carvão) + glow laranja `rgba(249,115,22,...)` (`:48`).
3. **Mobile shell vaza páginas desktop cruas** — `MobileShell.tsx:38`: qualquer rota ≠ `/` renderiza a página desktop inteira (tabelas largas, grids) em 375px. Só 4 telas são nativas. Inbox em mobile cai no chrome desktop (`MainLayout.tsx:13,20`).
4. **Modais reimplementados à mão (sem focus-trap/scroll-lock/aria)** — `PaywallModal.tsx:24-45`, `AccountsPage.tsx:238-257` (excluir), `AutoMessagesPage.tsx:362-365`, `NewOrderDrawer.tsx:75-80`. O Modal canônico já resolve tudo isso.
5. **Inbox WhatsApp inteiro em CSS legado azul/roxo** — `WhatsAppInbox.css`: avatar gradiente roxo (`:102`), primárias azuis `#3b82f6/#2563eb` (`:94,247,399,413,464-466,517-518`), fallbacks light sem dark real. + `WhatsAppInboxPage.tsx:52` "Sem mensagens" em toda linha; `:297,323` telefone cru como nome.
6. **KDS fora do tema** — `KdsPage.tsx`: zinc fixo + colunas blue/orange/emerald/indigo (`:76-153`), ignora tokens e tema, sem loading/erro (só "Vazio").
7. **Automação 100% crua com ação primária VERDE** — `CompanyProfileDetailPage.tsx` (829 linhas, zero token, foco verde em ~19 inputs), `CompanyProfilesPage.tsx` (badges arco-íris indigo/blue/purple/green/yellow/orange; CTA `bg-green-600`).
8. **Cards de stat arco-íris** — `CouponsPage.tsx:230-264` e `AccountDetailPage.tsx:198-232`: blue/green/purple/red-100 — anti-Dark-Luxe.
9. **Infra de dev vazando pro lojista** — `SettingsPage.tsx:341-371`: card "Informações da API" com base URL (fallback `http://localhost:8000`), links Swagger/ReDoc; `AccountDetailPage.tsx:376-379`: `JSON.stringify(metadata)` cru + WABA/Phone IDs.

## P1 — Inconsistência séria

10. **Navbar**: sem colapso "mais" — `Navbar.tsx:283` `overflow-x-auto scrollbar-none` corta "Configurações" silenciosamente entre 1024px (breakpoint hambúrguer) e ~1600px; **dois sinos idênticos adjacentes** (`:305-306` PushNotificationToggle + NotificationDropdown, ambos BellIcon) + ThemeToggle colado formando cluster confuso; nav primária em `text-xs` (12px); `h-24` (96px) alta demais.
11. **Sem componente Avatar canônico** — `utils/avatar.ts:1-4`: paleta com 7/8 cores fora da marca (roxo/azul/verde/rosa) → avatares aleatórios no inbox/clientes; cada tela reimplementa o círculo; `OrderDetailContent.tsx:140` tem `getInitials` duplicado.
12. **Dois builders de pedido duplicados** — OrderNewPage (RHF+Zod, 648 linhas, órfã) vs wizard NewOrderDrawer (steps). Regras divergentes, manutenção dobrada. Decisão: matar um (recomendado: manter wizard, aposentar OrderNewPage).
13. **Dead code** — `components/chat/ContactList.tsx` e `components/chat/ChatWindow.tsx` (772 linhas) sem nenhum import. Deletar.
14. **Dark quebrado em pontos** — 40 `bg-white` sem `dark:` (piores: WhatsAppTemplatesPage 7, OrderDetailContent 4, TrialBanner 3); banners da SubscriptionManagementPage em `bg-red-50/amber-50/emerald-50` sem dark; hovers `bg-red-50` que somem no dark (DeliveryZones).
15. **ComboForm ignora tokens no light** — padrão `text-gray-700 dark:text-fg-token` repetido em dezenas de linhas: light cru, dark tokenizado.
16. **Inputs nativos por todo lado** — selects/checkbox/date/time/color crus com foco verde/azul (CompanyProfileDetail, AccountForm `text-blue-600`, Coupons, OrderNewPage, StoreSettings).
17. **Relatórios (visto ao vivo)**: eixo Y quebrado ("R$ 1k, R$ 1k, R$ 0k, R$ 0k"), tiles azul/verde fora de token, "-100.0% vs ontem" agressivo, date inputs nativos.
18. **Cupons**: toggle de status é Badge clicável sem aria/role (`:329-336,442-449`); ações mobile sem label; selects nativos; modal de formulário apertado (`size` default md p/ 10 campos).
19. **Status crus em inglês pro usuário** — fatura `{inv.status}` (`SubscriptionManagementPage.tsx:339`), plano como key crua (`:189`); "Sem slug" (CompanyProfileDetail `:407,425`); "Superusuário/Staff" na Settings; Phone ID cru na AccountsPage.
20. **Tipografia** — Cinzel (`font-display`) ausente de quase todos os títulos de página (só Storefront usa); escala fluida definida em `index.css:14-20` mas não usada; navbar text-xs.

## P2 — Polimento

- `tailwind.config.js:156-203` mantém escalas hardcoded concorrentes (success/warning/error 50-900, `background.dark:#000`) que legitimam violações — podar.
- Notificações em `zinc`/`orange` fora de token (NotificationDropdown, PushNotificationToggle).
- Cinzel usada em telas de log/debug (dilui o luxe) — restringir a títulos de páginas de produto.
- PaywallModal usa classe `bg-surface-token` possivelmente inexistente — verificar.
- PlanoPage: rodapé "Pagamento online em breve" contradiz o botão Assinar que já faz checkout.
- Cardápio (visto ao vivo): imagens sem placeholder no primeiro paint; segmented Pausado/Ativo lê como dois badges.
- Badge "0" no inbox visto ao vivo NÃO se reproduz no código (guards `> 0` corretos) — provável `unread_count` string do backend; verificar payload.

## TOP ofensores de token (contagem de violações)

NewWhatsAppCampaignPage 162 · IntentLogsPage 122 · AutomationLogsPage 122 · CompanyProfileDetailPage 120 · AutomationsPage 110 · CustomerSessionsPage 108 · DashboardPage 107 · AutoMessagesPage 88 · MessageBubble 88 · CompanyProfilesPage 82 · NewCampaignPage 81 · WebhookDiagnosticsPage 75 · CouponsPage 73 · PaymentsPage 71 · SubscribersPage 69.

## Referências (usar como padrão)

`PlanoPage.tsx` (estados+aria+tokens), `StoreSettingsPage.tsx` (tokens), `StorefrontPage.tsx` (tokens+Cinzel), `DeliveryZonesPage.tsx` (Modal canônico), mobile shell (tokens ok, escopo curto).
