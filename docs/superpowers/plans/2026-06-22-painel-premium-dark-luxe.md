# Painel Premium Dark Luxe — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand visual do dashboard Cardapidex para identidade premium dark luxe (carvão + ouro), mantendo modo claro repaginado (marfim + ouro), sem tocar lógica.

**Architecture:** Mudança concentrada na camada de tokens CSS (`tokens.css`) + tipografia (Cinzel via Google Fonts + tailwind `fontFamily`) + troca de assets de marca em `public/brand/`. Componentes herdam dos tokens; só Navbar e Login recebem ajustes pontuais de contraste. Tokens semânticos (`--success`/`--danger`/`--warning`/`--info`) e cor dinâmica por loja (`--primary-*`) permanecem intocados.

**Tech Stack:** React + TypeScript + Vite + Tailwind (darkMode: 'class') + CSS custom properties. Fontes Google (Inter mantido, Cinzel novo).

## Global Constraints

- **Separação de tokens (inviolável):** dourado nunca representa status; verde = `--success`, vermelho = `--danger`, sempre. Não alterar `--success*`, `--danger*`, `--warning*`, `--info*` nem `--primary-*`.
- `--brand-strong` é o **chrome escuro** (barra da Navbar), NÃO é gold — escuro em ambos os modos.
- Ouro inverte por modo: `--brand` = `#DEBE79` no dark, `#C9A24B` no light.
- `--radius`: `4px`.
- Display/serif = **Cinzel** (logotipo, títulos, KPI). Corpo = **Inter** (mantido).
- Navegação real = `src/components/layout/Navbar.tsx` (Sidebar.tsx é legado morto, não tocar).
- Zero mudança de lógica/rotas/serviços. Só apresentação.
- Assets de origem: `/home/graco/ftp-data/cardapidex/` (`cardapidex-logo-transparente.png`, `cardapidex-simbolo.png`, `cardapidex-logo (1).png`).

---

### Task 1: Tokens dark/light luxe + tipografia Cinzel

**Files:**
- Modify: `src/styles/tokens.css` (todo o bloco `:root` e `.dark`)
- Modify: `src/index.css:2` (linha do `@import` de fontes)
- Modify: `tailwind.config.js:208-211` (bloco `fontFamily`)

**Interfaces:**
- Produces: variáveis CSS de marca atualizadas (`--brand`, `--brand-hover`, `--brand-strong`, `--brand-soft`, `--canvas`, `--surface`, `--surface-2`, `--border`, `--border-strong`, `--fg`, `--fg-muted`, `--radius`, `--font-display`) consumidas por todos os componentes via Tailwind tokens (`bg-brand`, `text-fg`, `bg-canvas`, etc.) e classe `font-brand`/`font-display`.

- [ ] **Step 1: Baseline — rodar build e guardar os valores semânticos atuais**

Run: `cd /home/graco/WORK/pastita-dash && npm run build 2>&1 | tail -5`
Expected: build conclui sem erro (baseline verde antes de mexer).

Run: `grep -nE '\-\-(success|danger|warning|info)' src/styles/tokens.css`
Anote os valores — eles NÃO podem mudar ao final.

- [ ] **Step 2: Reescrever o bloco `:root` (light luxe) em `src/styles/tokens.css`**

Substituir as linhas dos tokens de marca/superfície/fg/radius (linhas 9-30 da versão atual), **preservando** as linhas `--success*`/`--warning*`/`--danger*`/`--info*`/`--radius-pill`/`--font-sans`:

```css
:root {
  --brand: #C9A24B;
  --brand-hover: #B8923E;
  --brand-strong: #1A1613;        /* chrome escuro — navbar fica escura mesmo no light */
  --brand-soft: rgba(201,162,75,.14);
  --canvas: #FBF7EF;
  --surface: #ffffff;
  --surface-2: #F4EEE2;
  --border: #E6DAC4;
  --border-strong: #D8C8AC;
  --fg: #2B2620;
  --fg-muted: #8A7E6C;
  --success: #047857;
  --success-strong: #065f46;
  --success-soft: #d1fae5;
  --warning: #b45309;
  --warning-soft: #fef3c7;
  --danger: #dc2626;
  --danger-soft: #fee2e2;
  --info: #2563eb;
  --info-soft: #dbeafe;
  --radius: 4px;
  --radius-pill: 999px;
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-display: 'Cinzel', Georgia, serif;
}
```

- [ ] **Step 3: Reescrever o bloco `.dark` (dark luxe) em `src/styles/tokens.css`**

Substituir os tokens de marca/superfície/fg, **preservando** os semânticos dark já existentes:

```css
.dark {
  --brand: #DEBE79;
  --brand-hover: #E8CE92;
  --brand-strong: #0B0908;        /* chrome escuro — barra da navbar */
  --brand-soft: rgba(222,190,121,.12);
  --canvas: #0F0D0B;
  --surface: #1A1613;
  --surface-2: #131009;
  --border: #2A2219;
  --border-strong: #3A2F22;
  --fg: #F5ECDE;
  --fg-muted: #A89880;
  --success: #34d399;
  --success-strong: #6ee7b7;
  --success-soft: rgba(6, 95, 70, 0.36);
  --warning: #fbbf24;
  --warning-soft: rgba(146, 64, 14, 0.34);
  --danger: #f87171;
  --danger-soft: rgba(127, 29, 29, 0.36);
  --info: #60a5fa;
  --info-soft: rgba(30, 64, 175, 0.34);
}
```

- [ ] **Step 4: Atualizar o comentário-cabeçalho do `tokens.css`**

Trocar o bloco de comentário do topo (linhas 1-7) para refletir a nova identidade:

```css
/* ============================================
   DESIGN TOKENS — Cardapidex Premium (Dark Luxe)
   Carvão + ouro. light (marfim) em :root, dark (grafite) em .dark.
   Ouro: #DEBE79 (dark) / #C9A24B (light). Chrome: --brand-strong.
   Semânticos (success/danger/warning/info) e --primary-* NÃO são marca.
   ============================================ */
```

- [ ] **Step 5: Importar Cinzel no `src/index.css`**

Em `src/index.css:2`, acrescentar `Cinzel:wght@500;600;700` ao `@import` de fontes existente:

```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800&family=Cinzel:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');
```

- [ ] **Step 6: Apontar `fontFamily` do Tailwind para Cinzel**

Em `tailwind.config.js`, no bloco `fontFamily` (linhas 208-211), trocar `display` e adicionar `brand` (a Navbar usa `font-brand`):

```js
      fontFamily: {
        display: ['Cinzel', 'Georgia', 'serif'],
        brand: ['Cinzel', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
```

- [ ] **Step 7: Build + guard de separação de tokens**

Run: `npm run build 2>&1 | tail -5`
Expected: build sem erro.

Run: `grep -nE "\-\-(success|danger|warning|info)" src/styles/tokens.css`
Expected: valores idênticos aos anotados no Step 1 (semânticos intocados).

Run: `grep -nE "\-\-primary-" src/styles/tokens.css`
Expected: nenhum resultado (cor por loja não vive aqui, segue intocada em index.css).

- [ ] **Step 8: Commit**

```bash
git add src/styles/tokens.css src/index.css tailwind.config.js
git commit -m "feat(theme): tokens dark/light luxe (carvão + ouro) + Cinzel"
```

---

### Task 2: Assets de marca (logo + favicons)

**Files:**
- Replace: `public/brand/logo.png` (logo completa nova)
- Replace: `public/brand/symbol-256.png` (símbolo novo)
- Create: `public/brand/cardapidex-logo.png` (full, p/ login/cadastro substituírem o SVG antigo)
- Modify: `public/brand/favicon-32.png`, `public/brand/apple-touch-180.png`, `public/brand/icon-192.png`, `public/brand/icon-512.png`, `public/brand/symbol-256.png` (regenerados do símbolo novo)
- Modify: `index.html:5-7` (favicon refs)
- Modify: `src/pages/auth/LoginPage.tsx:49`, `src/pages/auth/CadastroPage.tsx:75` (SVG → PNG novo)

**Interfaces:**
- Consumes: PNGs de origem em `/home/graco/ftp-data/cardapidex/`.
- Produces: assets em `public/brand/` com a marca dourada nova; refs atualizadas.

- [ ] **Step 1: Copiar os PNGs de origem para `public/brand/`**

```bash
cd /home/graco/WORK/pastita-dash
cp "/home/graco/ftp-data/cardapidex/cardapidex-logo-transparente.png" public/brand/cardapidex-logo.png
cp "/home/graco/ftp-data/cardapidex/cardapidex-logo-transparente.png" public/brand/logo.png
cp "/home/graco/ftp-data/cardapidex/cardapidex-simbolo.png" public/brand/symbol-256.png
```

- [ ] **Step 2: Regenerar favicons a partir do símbolo (fundo transparente)**

```bash
cd /home/graco/WORK/pastita-dash
SRC="/home/graco/ftp-data/cardapidex/cardapidex-simbolo.png"
python3 - "$SRC" <<'PY'
import sys
from PIL import Image
src = Image.open(sys.argv[1]).convert("RGBA")
sizes = {"public/brand/favicon-32.png":32,"public/brand/apple-touch-180.png":180,
         "public/brand/icon-192.png":192,"public/brand/icon-512.png":512,
         "public/brand/symbol-256.png":256}
for path,s in sizes.items():
    img = src.copy(); img.thumbnail((s,s), Image.LANCZOS)
    canvas = Image.new("RGBA",(s,s),(0,0,0,0))
    canvas.paste(img,((s-img.width)//2,(s-img.height)//2),img)
    canvas.save(path)
    print("wrote",path)
PY
```
Expected: imprime 5 linhas `wrote ...`. Se `PIL` faltar: `pip install Pillow` e repetir.

- [ ] **Step 3: Atualizar referência da logo no Login e Cadastro (SVG → PNG novo)**

Em `src/pages/auth/LoginPage.tsx:49`:
```tsx
            src="/brand/cardapidex-logo.png"
```
Em `src/pages/auth/CadastroPage.tsx:75`:
```tsx
          <img src="/brand/cardapidex-logo.png" alt="Cardapidex" className="h-9 w-auto" />
```

- [ ] **Step 4: Conferir favicon SVG no index.html**

`index.html:5` referencia `/brand/cardapidex-symbol.svg` (SVG antigo). Trocar para o PNG novo:
```html
    <link rel="icon" type="image/png" sizes="256x256" href="/brand/symbol-256.png" />
    <link rel="icon" type="image/png" sizes="32x32" href="/brand/favicon-32.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/brand/apple-touch-180.png" />
```
(remover a linha 5 do SVG antigo, manter as duas PNG já existentes nas linhas 6-7).

- [ ] **Step 5: Build + verificação visual**

Run: `npm run build 2>&1 | tail -5`
Expected: build sem erro.

Run: `npm run dev` e abrir `/login` — a logo dourada nova aparece, favicon novo na aba.
(Usar a skill `run` para subir o app e tirar screenshot do login.)

- [ ] **Step 6: Commit**

```bash
git add public/brand index.html src/pages/auth/LoginPage.tsx src/pages/auth/CadastroPage.tsx
git commit -m "feat(brand): novos assets de logo dourada + favicons"
```

---

### Task 3: Chrome — Navbar + Login premium

**Files:**
- Modify: `src/components/layout/Navbar.tsx` (logo da plataforma, contraste do item ativo, serif no wordmark)
- Modify: `src/pages/auth/LoginPage.tsx` (fundo canvas premium)

**Interfaces:**
- Consumes: tokens da Task 1 (`--brand`, `--brand-strong`, `--brand-soft`, `font-brand`), asset `public/brand/symbol-256.png` da Task 2.
- Produces: navbar grafite com acento ouro e wordmark serif; login sobre canvas premium.

- [ ] **Step 1: Trocar a logo da plataforma na Navbar para o símbolo dourado**

Em `src/components/layout/Navbar.tsx:271-275`, o `brandInfo` da plataforma já usa `logo: '/brand/symbol-256.png'` (atualizado na Task 2). Confirmar que a `<img>` da logo (linha ~301) remove o `bg-white/10` que suja o ouro sobre transparente:
```tsx
                className="w-7 h-7 rounded-md object-contain"
```

- [ ] **Step 2: Wordmark "Cardapidex" em serif ouro**

Em `src/components/layout/Navbar.tsx:312-316`, ajustar o span do nome da plataforma para Cinzel + tom ouro sobre a barra grafite:
```tsx
            {brandInfo.isPlatform && (
              <span className="hidden sm:block text-lg tracking-[0.18em] uppercase text-[var(--brand)] font-brand">
                Cardapidex
              </span>
            )}
```

- [ ] **Step 3: Corrigir contraste do item de navegação ativo**

Items ativos usam `bg-brand text-white` (linhas ~96, ~137, ~155). Sobre ouro, texto branco fica ilegível. Trocar para texto escuro do chrome:
```tsx
// onde houver 'bg-brand text-white' nos itens de nav ativos:
'bg-brand text-[var(--brand-strong)] font-medium'
```
Aplicar nas 3 ocorrências de item ativo (não confundir com badges/outros usos — só os estados de nav-item selecionado).

- [ ] **Step 4: Login sobre canvas premium**

Em `src/pages/auth/LoginPage.tsx:44`, trocar o fundo para o canvas dos tokens (premium em ambos os modos):
```tsx
    <div className="min-h-screen flex items-center justify-center bg-canvas p-4">
```

- [ ] **Step 5: Build + tsc + visual**

Run: `npm run build 2>&1 | tail -5` → sem erro.
Run: `npx tsc --noEmit 2>&1 | tail -5` → zero erros.
Subir o app (skill `run`) e conferir: navbar grafite com wordmark ouro serif, item ativo legível, login premium. Screenshot dark + light.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/Navbar.tsx src/pages/auth/LoginPage.tsx
git commit -m "feat(chrome): navbar grafite+ouro serif e login premium"
```

---

### Task 4: Varredura de cores hardcoded + parity de testes

**Files:**
- Modify: arquivos com hex/cores fixas que ignoram tokens (descobertos via grep)
- Test: suíte Jest existente (baseline de regressão)

**Interfaces:**
- Consumes: tokens da Task 1.
- Produces: ausência de cores de marca hardcoded que escapem do sistema; suíte verde.

- [ ] **Step 1: Mapear hardcodes de cor de marca antiga (terracota/laranja)**

Run:
```bash
cd /home/graco/WORK/pastita-dash
grep -rniE "#C7492E|#E08A3A|#F2A23A|#FFF5E8|#F97316|terracota|orange-[45]00" src --include=*.tsx --include=*.ts --include=*.css | grep -viE "tokens.css|\.test\." | head -40
```
Expected: lista de pontos que usam a cor antiga direto (fora dos tokens). Anotar.

- [ ] **Step 2: Substituir cada hardcode por token de marca**

Para cada ocorrência do Step 1: trocar a cor literal pela classe/var de token equivalente (`text-brand`, `bg-brand`, `var(--brand)`, `bg-canvas`, `border-[var(--border)]`). **Não** tocar em usos de verde/vermelho semânticos (success/danger) nem em `--primary-*`. Em caso de dúvida se a cor é "status" ou "marca", deixar como está e anotar para revisão.

- [ ] **Step 3: Revisar sombras com tint laranja no tailwind.config.js**

`tailwind.config.js` tem sombras com `rgba(249,115,22,...)` (laranja) e `inner-primary: inset ... #F97316`. Trocar o tint para neutro/ouro discreto:
```js
        'soft': '0 10px 30px rgba(0, 0, 0, 0.25)',
        'soft-lg': '0 20px 40px rgba(0, 0, 0, 0.30)',
        'inner-primary': 'inset 0 -3px 0 0 var(--brand)',
        'glow-primary': '0 0 20px rgba(222, 190, 121, 0.30)',
```
(manter `inner-secondary`/`glow-secondary` se forem usados como acento de success — verde semântico.)

- [ ] **Step 4: Rodar a suíte de testes (parity vs baseline)**

Run: `npm test 2>&1 | tail -20`
Expected: mesmas falhas pré-existentes do baseline (ComboForm/combos.integration conhecidas), nenhuma falha NOVA introduzida pela mudança visual.

- [ ] **Step 5: Build final + verificação visual ampla**

Run: `npm run build 2>&1 | tail -5` → sem erro.
Subir o app (skill `run`) e percorrer: dashboard, pedidos, produtos, whatsapp — em dark e light. Confirmar: nenhum laranja terracota remanescente; verde/vermelho preservados como status; ouro só como marca/acento. Screenshots.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(theme): varredura de cores hardcoded para tokens dourados + sombras neutras"
```

---

## Self-Review

**Spec coverage:**
- Separação de tokens → Global Constraints + Task 1 Step 7 (guards) + Task 4 Step 2 (regra na varredura). ✓
- Paleta dark/light luxe → Task 1 Steps 2-3. ✓
- Tipografia Cinzel → Task 1 Steps 5-6, Task 3 Step 2. ✓
- Radius 4px → Task 1 Step 2. ✓
- Logo nova (login/navbar/favicon) → Task 2 + Task 3 Step 1. ✓
- Ondas (fundação/chrome/superfícies/varredura) → Tasks 1/3/4 (superfícies herdam dos tokens; varredura em Task 4). ✓
- Critérios de sucesso (build limpo, tsc, parity de testes) → Task 3 Step 5, Task 4 Step 4-5. ✓

**Placeholder scan:** sem TBD/TODO; cada passo de código tem o código. ✓

**Type consistency:** nomes de tokens (`--brand-strong`, `--brand-soft`, `font-brand`) consistentes entre tasks; `--brand-strong` definido como chrome escuro em ambas as tasks de paleta e consumido como tal na Navbar. ✓

**Nota de adaptação:** rebrand visual não tem unit test natural — verificação é build + tsc + grep-guards de separação + screenshots + parity da suíte existente. Isso é verificação real, não teatro.
