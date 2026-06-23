# Painel Premium — Dark Luxe (carvão + ouro)

Data: 2026-06-22
Repo: pastita-dash (painel.cardapidex.com.br)
Branch: feat/painel-premium-dark-luxe

## Objetivo

Rebrand visual completo do dashboard Cardapidex para uma identidade **premium dark luxe**:
fundo grafite/quase-preto com **ouro** (extraído da logo nova, `#DEBE79`) como acento,
tipografia serif gravada (Cinzel) para logotipo/títulos, mantendo Inter no corpo.
Modo claro repaginado em paralelo (marfim + ouro). **Nenhuma mudança de lógica** — só apresentação.

## Princípio inviolável: separação de tokens

O rebrand toca **apenas a camada de marca/estilo**. Tokens semânticos globais e a cor
dinâmica por loja **não são alterados**.

| Camada | Tokens | Muda? |
|---|---|---|
| Marca / estilo | `--brand*`, `--canvas`, `--surface*`, `--border*`, `--fg*`, `--radius`, fontes | ✅ vira dark/light luxe ouro |
| Semântico global | `--success`, `--danger`, `--warning`, `--info` (+ `-soft`/`-strong`) | ❌ **congelado** |
| Marca por loja | `--primary-*` (CSS vars dinâmicas em `index.css`) | ❌ **congelado** |

Regra prática:
- Dourado **nunca** representa status. Verde = success, vermelho = danger, sempre.
- Botão de ação primária = ouro. Botão destrutivo = `--danger`. Badge "pago" = `--success`.
- Sem cruzamento entre as três camadas.

## Paleta

### Dark luxe (`.dark`) — modo padrão visual
```
--canvas:        #0F0D0B
--surface:       #1A1613
--surface-2:     #131009
--border:        #2A2219
--border-strong: #3A2F22
--fg:            #F5ECDE
--fg-muted:      #A89880
--brand:         #DEBE79   /* ouro da logo, claro p/ contraste sobre grafite */
--brand-hover:   #E8CE92
--brand-strong:  #0B0908   /* CHROME escuro (barra da navbar) — NÃO é gold */
--brand-soft:    rgba(222,190,121,.12)
```

### Light luxe (`:root`)
```
--canvas:        #FBF7EF
--surface:       #FFFFFF
--surface-2:     #F4EEE2
--border:        #E6DAC4
--border-strong: #D8C8AC
--fg:            #2B2620
--fg-muted:      #8A7E6C
--brand:         #C9A24B   /* ouro profundo: #DEBE79 lavaria sobre marfim */
--brand-hover:   #B8923E
--brand-strong:  #1A1613   /* CHROME escuro (navbar fica escura mesmo no light) */
--brand-soft:    rgba(201,162,75,.14)
```

Sacada de contraste: o ouro **inverte de luminância por modo** — claro no dark, profundo
no light — para manter legibilidade do acento em ambos os fundos.

Semânticos (`--success`/`--danger`/`--warning`/`--info` e variantes) permanecem com os
valores atuais já presentes em `tokens.css` (`:root` e `.dark`).

## Tipografia

- **Display / serif** (logotipo, títulos de página, números de KPI): **Cinzel** — aproxima
  o "CARDAPIDEX" gravado da logo. Usado com parcimônia (contraste > onipresença).
- **UI / corpo**: **Inter** (mantido) — legibilidade para uso prolongado do operador.
- Novo token: `--font-display: 'Cinzel', Georgia, serif;` ao lado de `--font-sans`.
- Cantos: `--radius` de `2px` → **`4px`** (hairline + canto levemente macio = leitura premium editorial).

## Logo

Três assets em `/home/graco/ftp-data/cardapidex/`:
- `cardapidex-logo-transparente.png` — logo completa (login, splash)
- `cardapidex-simbolo.png` — símbolo "C" + chapéu (navbar colapsada, favicon, mobile)
- `cardapidex-logo (1).png` — fundo (avaliar uso)

Substituir os assets atuais usados em login, navbar e favicon pelos novos.

## Escopo de aplicação (ondas verificáveis)

1. **Fundação** — atualizar `tokens.css` (dark + light luxe), adicionar `--font-display` e
   `@import` Cinzel, subir `--radius` p/ 4px, trocar os 3 PNGs de logo (login/navbar/favicon).
2. **Chrome** — `Navbar.tsx` (topo + dropdowns via portal), tela de login, dashboard/tela inicial.
3. **Superfícies** — cards, tabelas, KPIs, badges/chips, botões — respeitando a separação de tokens.
4. **Varredura** — telas restantes herdam dos tokens; corrigir cores hardcoded pontuais que
   escapam do sistema (grep por hex/classes fixas que ignoram tokens).

Cada onda é isolável e revisável sem tocar lógica de negócio.

## Não-objetivos (YAGNI)

- Sem remover o toggle claro/escuro (decisão: manter os dois).
- Sem refatorar lógica, rotas, serviços ou contratos de API.
- Sem mexer em `--primary-*` (cor por loja) nem nos semânticos.
- Sem redesign de fluxos/UX — apenas a camada visual.

## Critérios de sucesso

- `tokens.css` com dark + light luxe ouro; semânticos inalterados (diff prova isso).
- Logo nova em login, navbar e favicon.
- Cinzel nos títulos/logotipo; Inter no corpo.
- Navbar, login e dashboard com o novo visual em ambos os modos.
- `npm run build` e `tsc --noEmit` limpos; sem regressão de testes vs baseline.
- Nenhum dourado usado como status; nenhum verde/vermelho convertido em dourado.
