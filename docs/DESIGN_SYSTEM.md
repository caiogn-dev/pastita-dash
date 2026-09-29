# Design system do painel — a regra única

Uma identidade só, em todas as páginas. Medido em 25/09/2026: 87 arquivos com 1.032 cores
cruas do Tailwind e 25 componentes redefinidos dentro de páginas (StatCard, Toggle, Stepper,
Selo, Progresso, dois PaymentBadge…). É por isso que "o estilo varia por página". A regra:

## 1. Identidade (já existe em `src/styles/tokens.css`)
- **Carvão + ouro.** Marca `--brand` (ouro), tinta sobre ouro `--on-brand`, texto `--fg`,
  apagado `--fg-muted`, fundo neutro `--canvas`, superfície `--surface`, borda `--border`.
- **Semânticos só para estado:** `success` (pago, enviado, ativo), `warning` (pendente,
  atenção), `danger` (falhou, parado), `info` (agendado, processando). Nunca como decoração.
- **Fonte:** a do sistema (`index.css`). Tamanho de trabalho 13–14px/500; título de página
  no `PageShell`; título de seção 16px/600 em frase.
- **Raio por papel** (`--radius-*`), **elevação por classe** (`.superficie`, `.superficie-alta`).

## 2. Proibido (e testado)
- Cor crua do Tailwind (`bg-green-100`, `text-gray-500`…): `src/styles/__tests__/coresCruas.test.ts`
  é uma catraca — nenhum arquivo pode ter mais do que na linha de base, arquivo novo nasce com 0.
  Migrou uma página? Atualize a base: `node scripts/cores-baseline.mjs`.
- Superfície montada à mão (`rounded border border-… bg-…`): `superficie.test.ts`.
- Rótulo em caixa alta (`uppercase`, `.overline` em título) e eyebrow numerada 01/02.
- Componente local em página que já existe no kit (lista abaixo). Se falta algo no kit,
  crie no kit com teste, depois use.
- `<select>`, `<input>` e `<textarea>` crus: use `Select`, `Input`, `NumberField`, `Switch`.

## 3. Como uma página é montada
```
PageShell (título, descrição em frase, ações à direita)
  └─ KpiGrid / StatCard          quando há números que mudam a decisão
  └─ Secao (título em frase, descrição, ações)
       └─ Tabela | lista | formulário (Input, Select, NumberField, Switch, ChoiceCards)
  └─ Secao ...
  └─ [coluna direita sticky]     prévia (PhonePreview, BalaoDeWhatsApp, CartaoDeFidelidadePreview)
                                 + FormSummary com os números + botão principal que diz o que faz
```
- Formulário longo com fim = `FormStepper`. Escolha com consequência = `ChoiceCards`.
  Liga/desliga óbvio = `Switch`.
- Estado de coisa (pedido, pagamento, campanha, agente) = `SeloDeEstado` com tom vindo de
  `estados.ts` (`estadoDePagamento`, `estadoDeCampanha`). Um mapa por domínio, nunca por página.
- Ação de entrada ("Nova campanha") = `AcaoCard`. Checagem ok/erro = `Verificacao`.
- Faixa de estado dentro de seção ("Conta configurada", "Estoque OK", erro de carga) = `Aviso` com `tom`.
- Vazio = `EmptyState` dizendo o que fazer. Carregando = `Skeleton`.
- Botão principal: verbo + objeto ("Enviar para 84 clientes", "Salvar programa"); o toast repete.

## 4. Kit (`src/components/ui`)
Aviso, Button, Card, StatCard, KpiGrid, Input/SearchInput, NumberField, Select, Switch, ChoiceCards,
FormStepper, FormSummary, FormChecklist, StringListField, Secao, PageShell, PageTabs, Tabela,
Paginacao, RowActions, Badge, SeloDeEstado, Progresso, Verificacao, AcaoCard, EmptyState,
Skeleton, Modal, Dropdown, Toast, Sparkline, RankedList, InsightList, PhonePreview, estados.

## 5. Ordem de migração (pela contagem de cor crua)
Pedidos (73) · Pagamentos (70) · Dashboard (47) · Clientes (39) · Automações (28) · Inbox do
mensageiro (28) · Campanhas WhatsApp (lista) e E-mail (lista) · Marketing (13) · Conversas (11).
Cada migração: zero cor crua no arquivo, componentes locais removidos, Secao/PageShell, testes
existentes verdes, base da catraca atualizada.

## 6. Sem manual na tela (regra do dono, 28/09/2026)
"Algo que é bom não precisa de descrição." Nenhum parágrafo explicando como usar dentro da
interface. A dica curta vai no `title` do ícone. Ação = botão com ícone e rótulo de 1–2 palavras;
formatação = barra contextual (negrito, alinhamento, fonte, tamanho), como em editor de texto.
Referência para ferramentas de trabalho: ZebraDesigner/BarTender — barra em cima, objetos à
esquerda, propriedades à direita, canvas com régua no meio.
Testado: `src/styles/__tests__/semManual.test.ts` é catraca — parágrafo apagado com 60+ caracteres
e pontuação de frase conta como manual; nenhum arquivo pode subir da linha de base, arquivo novo
nasce com 0. Limpou uma página? `npm run manual:baseline`. Medido em 29/09: 179 parágrafos em 84 páginas.
