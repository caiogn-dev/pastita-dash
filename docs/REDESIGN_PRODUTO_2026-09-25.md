# Redesign de produto: Etiquetas, Campanha WhatsApp e Fidelidade — 25/09/2026

O dono pediu "mudança de verdade, não encheção de linguiça". A passada de 25/09 pela manhã
(prévia ao lado, números, componentes do kit) arrumou a cara. Este documento define o que muda
no **trabalho** que cada tela faz. Cada seção diz: o trabalho real, o que a tela faz hoje que
atrapalha, o desenho novo, o que precisa do backend, e como saber que ficou bom.

Regra geral das três telas: **a tela começa pela decisão, não pelo formulário.** A pessoa diz o
que quer (etiquetar a produção de hoje; trazer de volta quem sumiu; fazer o cliente voltar) e a
tela já chega preenchida com a resposta mais provável. O formulário existe para ajustar, não
para começar do zero.

---

## 1. Etiquetas

**Trabalho real:** "Estou produzindo isto agora, preciso das etiquetas na mão." Quem usa está na
cozinha ou na sala de produção, com pressa, e repete o mesmo lote todo dia.

**O que atrapalha hoje:** a tela abre com o catálogo inteiro em ordem alfabética e quantidade zero
em tudo; cada dia a pessoa refaz a mesma seleção; a impressora do navegador é o caminho
principal mesmo com a Zebra na sala de produção; o tamanho do papel é digitado toda vez.

**Desenho novo:**
- **Abre em "Lotes recentes".** Os últimos lotes impressos (produtos, quantidades, modelo) ficam
  guardados no navegador. "Imprimir de novo" = 1 clique. Dá para ajustar a quantidade antes.
- **Produtos recentes primeiro.** A lista de produtos ordena por "impresso recentemente", depois
  alfabético. Busca em cima, grande.
- **Impressora como preset, não como formulário.** "Zebra da produção · 100×80", "Elgin do caixa ·
  validade 3 colunas". Um preset guarda modelo + papel + colunas + borda + impressora remota.
  Trocar de preset troca tudo. O ajuste fino fica dentro de "Calibrar este preset".
- **Botão principal é o que a loja usa.** Se a loja tem agent marcado com "etiquetas", o botão
  primário é "Imprimir na Zebra (pc desktop)". Imprimir pelo navegador vira secundário.
- **Validade por lote, visível.** "Produzido hoje, vence sábado 30/09" em letras grandes, não um
  campo "dias" escondido.
- Prévia à direita, tamanho real, sempre do primeiro produto do lote.

**Backend:** nada novo. Lotes e presets ficam em `localStorage` por loja (chave versionada).
Se um dia precisar sincronizar entre PCs, vira `store.metadata.etiquetas`.

**Ficou bom quando:** a pessoa que imprimiu ontem imprime hoje em 2 cliques (abrir, "Imprimir de
novo"); um produto novo entra no lote em 1 busca; ninguém digita "100" e "80" duas vezes.

---

## 2. Campanha WhatsApp

**Trabalho real:** "Quero vender mais esta semana" ou "quero trazer de volta quem sumiu". Ninguém
acorda querendo "criar uma campanha em 4 passos".

**O que atrapalha hoje:** o assistente começa por "qual conta" (decisão técnica), depois audiência
por regras (decisão de analista), depois mensagem em branco. A pessoa só descobre o alcance no
fim. A tela fica vazia até o passo 3.

**Desenho novo:**
- **Começa pelo objetivo.** Quatro cartões com o alcance JÁ calculado (o backend tem
  `audiencia/previa/` e `segmentos.resumo_por_segmento`):
  - "Trazer de volta quem sumiu" → segmento *inativo* + *em risco*. Mostra: 84 clientes, última
    compra há 40+ dias, ticket médio R$ 62.
  - "Promover um produto" → escolhe o produto; público = quem já comprou a categoria.
  - "Avisar uma novidade" → todos com opt-in.
  - "Lembrar quem está a um item do brinde" → integra com Fidelidade (`loyalty/accounts/`).
- **Mensagem pronta por objetivo**, com as variáveis já no lugar ({nome}, {produto}, {cupom}) e a
  prévia no balão do WhatsApp à direita, atualizando a cada tecla. Editar é opcional.
- **Uma tela só de confirmação:** "Enviar para 84 clientes pela conta Cê Saladas, agora ou
  agendar". Custo estimado quando houver (janela de 24h × modelo pago). Conta remetente escolhida
  automaticamente quando a loja tem uma só.
- O construtor de regras continua existindo, atrás de "Ajustar quem recebe".

**Backend:** endpoint leve `campanhas/objetivos/` que devolve os 4 objetivos com alcance e
sugestão de mensagem, reusando `resumo_por_segmento` e a prévia por regra. Sem isso, o painel
pode chamar `audiencia/previa/` 4 vezes com regras fixas (mais lento, funciona hoje).

**Ficou bom quando:** o dono abre a tela e em 10 segundos sabe quantos clientes sumiram e o que
mandar para eles; a campanha sai em 3 cliques; o alcance aparece antes de qualquer digitação.

---

## 3. Fidelidade

**Trabalho real:** "Quero que o cliente volte, e quero saber se está funcionando e quanto custa."

**O que atrapalha hoje:** é um formulário de configuração. Diz "10 itens = 1 grátis" e nada sobre
o que isso custa, se está fazendo alguém voltar, ou o que fazer com os 2 clientes a um item do
brinde.

**Desenho novo:**
- **Simulador de custo em cima do formulário.** Ao mudar "itens para ganhar", a tela recalcula:
  "cada cartão fechado custa cerca de R$ 27 (ticket médio do brinde); com 122 participantes e o
  ritmo atual, ~9 brindes/mês ≈ R$ 243/mês". Para cashback: "3% de R$ 18.400/mês em pedidos ≈
  R$ 552/mês em saldo".
- **Está funcionando?** Um número só, em destaque: taxa de recompra dos participantes × não
  participantes nos últimos 90 dias. Se não houver diferença ainda, a tela diz "cedo demais para
  medir, comece em X pedidos".
- **Ações sobre pessoas, não só regras.** "2 clientes estão a um item do brinde" ganha o botão
  "Avisar pelo WhatsApp" que abre a campanha com o objetivo 4 já preenchido. "Brindes a resgatar"
  lista quem é.
- Prévia do cartão como o cliente vê (já feita em 25/09), à direita.

**Backend:** endpoint `loyalty/impacto/` com: ticket médio, pedidos/mês, taxa de recompra de
participantes × não participantes (90 dias), projeção de brindes/mês. Tudo derivado de
`StoreOrder` e `LoyaltyAccount`; sem ele, o simulador usa só ticket médio dos produtos e não
mostra a taxa de recompra.

**Ficou bom quando:** o dono consegue responder "quanto custa e está valendo a pena" sem sair da
tela, e transforma "a um item de ganhar" em uma mensagem enviada.

---

## Ordem de execução
1. Etiquetas (só painel) — 25/09.
2. Fidelidade: simulador + ações (painel) e `loyalty/impacto/` (backend).
3. Campanha: objetivos (painel) e `campanhas/objetivos/` (backend).
