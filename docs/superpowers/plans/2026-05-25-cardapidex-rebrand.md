# Cardapidex Rebrand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand pastita-dash de "Pastita" para "Cardapidex" — paleta verde, logo tech, fonte Plus Jakarta Sans, sem nenhuma referência à marca antiga no frontend.

**Architecture:** Substituição puramente de tokens de marca e textos. Sem mudanças de comportamento, rotas ou lógica de negócio. O sistema de CSS vars já existe e suporta tema por loja — apenas o fallback/padrão muda.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, CSS custom properties, SVG

**Branch:** `feature/cardapidex-brand` (criada a partir de `main`)

---

## Decisões de marca

| Atributo | Valor |
|---|---|
| Nome | Cardapidex |
| Abreviação / monograma | Cx |
| Primária | `#059669` (emerald-600) |
| Primária escura | `#047857` (emerald-700) |
| Primária clara | `#d1fae5` (emerald-100) |
| Fallback dark-mode | `#10b981` (emerald-500) |
| Fonte headings | Plus Jakarta Sans (800, 700) |
| Fonte corpo | Inter (já presente) |
| Logo | SVG gradiente verde `#059669→#0d9488` com letras "Cx" brancas |

---

## Mapa de arquivos

| Arquivo | Ação |
|---|---|
| `public/cardapidex-logo.svg` | Criar — novo logo SVG |
| `index.html` | Modificar — title, favicon, theme-color |
| `public/manifest.json` | Modificar — name, short_name, description, icons |
| `public/sw.js` | Modificar — CACHE_NAME, notification defaults |
| `public/privacy.html` | Modificar — textos da marca |
| `public/terms.html` | Modificar — textos da marca |
| `src/index.css` | Modificar — primary-500 default, renomear vars `--pastita-*`, fonte, gradiente |
| `src/components/layout/Navbar.tsx` | Modificar — brandInfo fallback, remover isPastita e isAgriao |
| `src/components/common/Loading.tsx` | Modificar — logo src, alt, texto |
| `src/pages/auth/LoginPage.tsx` | Modificar — logo, título, heading |
| `src/pages/auth/CadastroPage.tsx` | Modificar — todos os textos "Pastita" → "Cardapidex" + paleta verde |
| `src/hooks/useTheme.ts` | Modificar — storage key |
| `src/context/ThemeContext.tsx` | Modificar — storage key |
| `src/stores/chatStore.ts` | Modificar — persist store name |
| `src/components/orders/OrderPrint.tsx` | Modificar — AUTO_PRINT_KEY |
| `src/pages/stores/StoresPage.tsx` | Modificar — remover botão/função syncPastita hardcoded |

---

## Task 1: Logo SVG + assets públicos

**Files:**
- Create: `public/cardapidex-logo.svg`
- Modify: `index.html`
- Modify: `public/manifest.json`
- Modify: `public/sw.js`

- [ ] **Step 1: Criar o logo SVG**

Criar `public/cardapidex-logo.svg` com o seguinte conteúdo:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#059669"/>
      <stop offset="100%" stop-color="#0d9488"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="44" fill="url(#g)"/>
  <text
    x="100" y="138"
    text-anchor="middle"
    font-family="system-ui, -apple-system, sans-serif"
    font-size="88"
    font-weight="900"
    letter-spacing="-4"
    fill="white"
    opacity="0.95"
  >Cx</text>
</svg>
```

- [ ] **Step 2: Atualizar `index.html`**

Substituir o conteúdo de `index.html`:

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/cardapidex-logo.svg" />
    <link rel="manifest" href="/manifest.json" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#059669" />
    <meta name="facebook-domain-verification" content="t8ub3djca8zlem6cy4lvugghhw7lec" />
    <title>Cardapidex</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/sw.js').catch((err) => {
            console.warn('SW registration failed:', err);
          });
        });
      }
    </script>
  </body>
</html>
```

- [ ] **Step 3: Atualizar `public/manifest.json`**

```json
{
  "name": "Cardapidex",
  "short_name": "Cardapidex",
  "description": "Painel de controle Cardapidex — pedidos, clientes e conversas",
  "theme_color": "#059669",
  "background_color": "#f8fafc",
  "display": "standalone",
  "start_url": "/",
  "icons": [
    {
      "src": "/cardapidex-logo.svg",
      "sizes": "any",
      "type": "image/svg+xml"
    }
  ]
}
```

- [ ] **Step 4: Atualizar `public/sw.js` — CACHE_NAME e notificações**

Linha 10 — mudar cache name:
```js
const CACHE_NAME = 'cardapidex-dash-v1';
```

Bloco de notificação (em torno da linha 73-87) — mudar defaults:
```js
let payload = { title: 'Cardapidex', body: 'Nova notificação', data: {} };
// ...
  icon: '/cardapidex-logo.svg',
  badge: '/cardapidex-logo.svg',
  tag: payload.tag || 'cardapidex-notification',
```

- [ ] **Step 5: Verificar TypeScript**

```bash
cd /home/graco/WORK/pastita-dash && npx tsc --noEmit 2>&1 | head -20
```
Esperado: sem erros (esses arquivos não são TS).

- [ ] **Step 6: Commit**

```bash
git add public/cardapidex-logo.svg index.html public/manifest.json public/sw.js
git commit -m "brand: logo Cardapidex SVG + assets públicos (favicon, manifest, SW)"
```

---

## Task 2: CSS vars — paleta verde + renomear `--pastita-*`

**Files:**
- Modify: `src/index.css`

As vars `--pastita-*` só são usadas dentro do próprio `index.css`. Fora dele, os componentes usam as aliases `--bg-*`, `--fg-*`, `--text-primary`, etc. — essas não precisam ser renomeadas.

- [ ] **Step 1: Atualizar `src/index.css` — bloco `:root`**

Substituir as linhas 37-61 (primária + vars pastita) por:

```css
  /* Font */
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

  /* Brand color — única var setada pelo JS com o hex da API.
     O resto da paleta é derivado automaticamente via color-mix(). */
  --primary-500: #059669; /* Cardapidex emerald — padrão até a loja carregar */

  /* Paleta derivada — não editar manualmente */
  --primary-50:  color-mix(in srgb, var(--primary-500)  8%, white);
  --primary-100: color-mix(in srgb, var(--primary-500) 15%, white);
  --primary-200: color-mix(in srgb, var(--primary-500) 30%, white);
  --primary-300: color-mix(in srgb, var(--primary-500) 50%, white);
  --primary-400: color-mix(in srgb, var(--primary-500) 70%, white);
  --primary-600: color-mix(in srgb, var(--primary-500) 80%, black);
  --primary-700: color-mix(in srgb, var(--primary-500) 60%, black);
  --primary-800: color-mix(in srgb, var(--primary-500) 45%, black);
  --primary-900: color-mix(in srgb, var(--primary-500) 30%, black);
  --primary-950: color-mix(in srgb, var(--primary-500) 15%, black);

  /* Aliases */
  --brand-primary:       var(--primary-500);
  --brand-primary-light: var(--primary-400);
  --brand-primary-dark:  var(--primary-600);

  /* Semantic Colors */
  --cx-background: #ffffff;
  --cx-surface:    #f8fafc;
  --cx-foreground: #111827;
  --cx-border:     #e5e7eb;
  --cx-accent:     var(--primary-500);
```

- [ ] **Step 2: Atualizar dark mode vars no bloco `.dark :root` (por volta da linha 104-111)**

```css
  /* Dark mode */
  --cx-background: #09090b;
  --cx-surface:    #111113;
  --cx-foreground: #fafafa;
  --cx-border:     #27272a;
  --cx-accent:     #10b981;
```

- [ ] **Step 3: Atualizar referências a `--pastita-*` dentro do próprio `index.css`**

Substituir todas as ocorrências:
- `var(--pastita-background)` → `var(--cx-background)`
- `var(--pastita-surface)` → `var(--cx-surface)`
- `var(--pastita-foreground)` → `var(--cx-foreground)`
- `var(--pastita-border)` → `var(--cx-border)`
- `var(--pastita-primary)` → `var(--cx-accent)`

- [ ] **Step 4: Renomear `.text-gradient-marsala` → `.text-gradient-brand` e atualizar as cores**

Localizar o bloco `.text-gradient-marsala` (por volta da linha 313) e substituir por:

```css
.text-gradient-brand {
  background: linear-gradient(135deg, var(--primary-500) 0%, var(--primary-400) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

- [ ] **Step 5: Adicionar import da fonte Plus Jakarta Sans no topo do arquivo**

Adicionar após o import do Playfair Display existente (ou substituí-lo se Playfair não for mais necessário):

```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800&family=Inter:wght@400;500;600;700&display=swap');
```

- [ ] **Step 6: Adicionar classe utilitária para headings com Jakarta**

Adicionar ao final do arquivo:

```css
.font-brand {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
}
```

- [ ] **Step 7: Verificar build**

```bash
npx tsc --noEmit 2>&1 | head -20
```
Esperado: sem erros.

- [ ] **Step 8: Commit**

```bash
git add src/index.css
git commit -m "brand: paleta verde Cardapidex + renomear vars --pastita-* para --cx-*"
```

---

## Task 3: Navbar — remover hardcodes Pastita/Agrião + novo brand default

**Files:**
- Modify: `src/components/layout/Navbar.tsx` (linhas 255-272)

- [ ] **Step 1: Atualizar `brandInfo` fallback (linha ~256)**

Substituir o bloco `brandInfo` useMemo:

```tsx
const brandInfo = useMemo(() => {
  if (!store) return {
    name: 'Cardapidex',
    logo: '/cardapidex-logo.svg',
    initial: 'Cx',
    color: '#059669',
  };
  return {
    name: store.name || 'Cardapidex',
    logo: store.logo_url || null,
    initial: store.name?.[0]?.toUpperCase() || 'C',
    color: store.primary_color || '#059669',
  };
}, [store]);
```

- [ ] **Step 2: Remover o useEffect isAgrião (linhas ~268-272)**

Deletar completamente o bloco:

```tsx
useEffect(() => {
  const isAgriao = store?.name?.toLowerCase().includes('agriao') || store?.slug?.toLowerCase().includes('agriao');
  if (isAgriao) document.documentElement.setAttribute('data-theme', 'agriao');
  else document.documentElement.removeAttribute('data-theme');
}, [store]);
```

- [ ] **Step 3: Atualizar o logo no JSX (linhas ~281-295)**

O logo agora sempre mostra o `brandInfo.logo` se existir, ou o monograma da loja. Sem fallback para `/pastita-logo.svg`. O bloco já funciona corretamente após o Step 1 — apenas confirmar que não há mais referência a `/pastita-logo.svg` no JSX.

- [ ] **Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/Navbar.tsx
git commit -m "brand: Navbar — fallback Cardapidex, remove hardcodes Pastita/Agrião"
```

---

## Task 4: LoginPage + CadastroPage

**Files:**
- Modify: `src/pages/auth/LoginPage.tsx`
- Modify: `src/pages/auth/CadastroPage.tsx`

- [ ] **Step 1: Atualizar `LoginPage.tsx` — logo e textos**

Localizar as linhas 49-54 e substituir:

```tsx
<div className="flex flex-col items-center mb-8">
  <img
    src="/cardapidex-logo.svg"
    alt="Cardapidex"
    className="w-14 h-14 rounded-2xl shadow-lg mb-4"
  />
  <h1 className="text-3xl font-bold text-fg-primary font-brand">Cardapidex</h1>
  <p className="text-sm text-fg-secondary mt-1">Faça login para continuar</p>
</div>
```

- [ ] **Step 2: Atualizar `CadastroPage.tsx` — logo, textos e cor do botão**

Substituições necessárias:
- `"Pastita"` → `"Cardapidex"` em todos os textos visíveis
- `"Quero conhecer o Pastita"` → `"Quero conhecer o Cardapidex"` (heading e botão)
- `"Recebemos seu interesse no Pastita"` → `"Recebemos seu cadastro no Cardapidex!"`
- `"© {new Date().getFullYear()} Pastita"` → `"© {new Date().getFullYear()} Cardapidex"`
- Logo: `<span className="font-bold text-gray-900 text-xl">Pastita</span>` → `<span className="font-bold text-gray-900 text-xl font-brand">Cardapidex</span>`
- Cor do botão: já usa `bg-indigo-600` — mudar para `bg-emerald-600 hover:bg-emerald-700`
- Cor de foco dos inputs: `focus:ring-indigo-500` → `focus:ring-emerald-500`
- Texto "Já tenho conta →": cor `text-indigo-600 hover:text-indigo-800` → `text-emerald-600 hover:text-emerald-800`
- Bullet list checkmarks: `bg-indigo-600` → `bg-emerald-600`

Conteúdo completo do arquivo atualizado:

```tsx
import React, { useState } from 'react';
import axios from 'axios';

const BUSINESS_TYPES = [
  'Restaurante / Marmitaria',
  'Hamburgueria',
  'Pizzaria',
  'Açaí / Sorvetes',
  'Salgados / Lanches',
  'Saudável / Saladas',
  'Confeitaria / Bolos',
  'Bar / Petiscos',
  'Outro',
];

const API_URL = import.meta.env.VITE_API_URL || 'https://backend.pastita.com.br/api/v1';

export const CadastroPage: React.FC = () => {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    city: '',
    business_type: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.phone.trim()) {
      setError('Nome e WhatsApp são obrigatórios.');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API_URL}/public/leads/`, form);
      setDone(true);
    } catch {
      setError('Não foi possível enviar. Tente novamente ou entre em contato via WhatsApp.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Cadastro recebido!</h2>
          <p className="text-gray-600">
            Recebemos seu interesse no Cardapidex. Nossa equipe entrará em contato pelo WhatsApp em breve.
          </p>
          <p className="text-sm text-gray-400">Tempo médio de resposta: até 24 horas úteis.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <img src="/cardapidex-logo.svg" alt="Cardapidex" className="w-9 h-9 rounded-xl shadow-sm" />
          <span className="font-bold text-gray-900 text-xl font-brand">Cardapidex</span>
        </div>
        <a href="/login" className="text-sm text-emerald-600 hover:text-emerald-800 font-medium">
          Já tenho conta →
        </a>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-12 items-center">

          <div className="space-y-8">
            <div className="space-y-4">
              <span className="inline-block text-xs font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full">
                Plataforma de delivery
              </span>
              <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight font-brand">
                Venda mais pelo<br />
                <span className="text-emerald-600">WhatsApp</span> com<br />
                automação IA
              </h1>
              <p className="text-lg text-gray-600">
                Cardápio digital, bot de atendimento, pedidos, pagamentos e relatórios — tudo em um lugar.
              </p>
            </div>

            <ul className="space-y-3">
              {[
                'Cardápio online bonito e rápido',
                'Bot IA no WhatsApp que tira pedidos',
                'Pedidos e pagamentos automáticos',
                'Dashboard com relatórios em tempo real',
                'Sem taxa por pedido',
              ].map(item => (
                <li key={item} className="flex items-center gap-3 text-gray-700">
                  <div className="w-5 h-5 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  {item}
                </li>
              ))}
            </ul>

            <p className="text-sm text-gray-400">Mais de 5 restaurantes já usam a plataforma.</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 font-brand">Quero conhecer o Cardapidex</h2>
              <p className="text-sm text-gray-500 mt-1">Preencha e entraremos em contato pelo WhatsApp.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={set('name')}
                  placeholder="João Silva"
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  WhatsApp <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={set('phone')}
                  placeholder="(11) 99999-9999"
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  placeholder="joao@restaurante.com"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={set('city')}
                    placeholder="São Paulo"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de negócio</label>
                  <select
                    value={form.business_type}
                    onChange={set('business_type')}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                  >
                    <option value="">Selecione</option>
                    {BUSINESS_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem (opcional)</label>
                <textarea
                  value={form.message}
                  onChange={set('message')}
                  placeholder="Conte um pouco sobre seu negócio..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 text-white font-semibold py-3 rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors text-sm"
              >
                {loading ? 'Enviando...' : 'Quero conhecer o Cardapidex'}
              </button>

              <p className="text-center text-xs text-gray-400">
                Sem spam. Entraremos em contato somente pelo WhatsApp informado.
              </p>
            </form>
          </div>
        </div>
      </div>

      <footer className="py-6 text-center text-xs text-gray-400 border-t border-gray-100">
        © {new Date().getFullYear()} Cardapidex · Plataforma de delivery com IA
      </footer>
    </div>
  );
};

export default CadastroPage;
```

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```
Esperado: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/pages/auth/LoginPage.tsx src/pages/auth/CadastroPage.tsx
git commit -m "brand: LoginPage + CadastroPage — Pastita → Cardapidex, paleta verde"
```

---

## Task 5: Loading screen + storage keys + constantes

**Files:**
- Modify: `src/components/common/Loading.tsx`
- Modify: `src/hooks/useTheme.ts`
- Modify: `src/context/ThemeContext.tsx`
- Modify: `src/stores/chatStore.ts`
- Modify: `src/components/orders/OrderPrint.tsx`

- [ ] **Step 1: `Loading.tsx` — logo e texto**

Substituir as linhas com `/pastita-logo.svg`, `alt="Pastita"` e `"Pastita Dashboard"`:

```tsx
<img
  src="/cardapidex-logo.svg"
  alt="Cardapidex"
  className="w-12 h-12 rounded-xl"
/>
// ...
<p className="mt-4 text-gray-600 dark:text-zinc-400 font-medium">Cardapidex</p>
```

- [ ] **Step 2: `useTheme.ts` — storage key**

```ts
const STORAGE_KEY = 'cardapidex-theme';
```

- [ ] **Step 3: `ThemeContext.tsx` — storage key**

```ts
const STORAGE_KEY = 'cardapidex-theme';
```

- [ ] **Step 4: `chatStore.ts` — persist name**

Localizar `name: 'pastita-chat-store'` e substituir:
```ts
name: 'cardapidex-chat-store',
```

- [ ] **Step 5: `OrderPrint.tsx` — AUTO_PRINT_KEY**

```ts
export const AUTO_PRINT_KEY = 'cardapidex_auto_print_enabled';
```

- [ ] **Step 6: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 7: Commit**

```bash
git add \
  src/components/common/Loading.tsx \
  src/hooks/useTheme.ts \
  src/context/ThemeContext.tsx \
  src/stores/chatStore.ts \
  src/components/orders/OrderPrint.tsx
git commit -m "brand: storage keys, loading screen e constantes — Pastita → Cardapidex"
```

---

## Task 6: StoresPage — remover sync Pastita hardcoded

**Files:**
- Modify: `src/pages/stores/StoresPage.tsx` (linhas ~76-82, ~289-296)

- [ ] **Step 1: Remover `handleSyncPastita` function**

Deletar a função (em torno da linha 76):
```tsx
const handleSyncPastita = async (storeId: string) => {
  // ...
};
```

- [ ] **Step 2: Remover o botão condicional no JSX (em torno da linha 289)**

Deletar o bloco:
```tsx
{store.slug === 'pastita' && (
  <button
    onClick={() => handleSyncPastita(store.id)}
    ...
  >
    Sync Pastita
  </button>
)}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```
Esperado: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/pages/stores/StoresPage.tsx
git commit -m "brand: remove botão sync Pastita hardcoded do StoresPage"
```

---

## Task 7: Páginas públicas (privacy.html + terms.html)

**Files:**
- Modify: `public/privacy.html`
- Modify: `public/terms.html`

- [ ] **Step 1: `privacy.html` — substituir referências**

Substituir todos os textos "Pastita" por "Cardapidex" e `contato@pastita.com.br` por `contato@cardapidex.com.br`. Substituir referência ao logo:
```html
<img src="/cardapidex-logo.svg" alt="Cardapidex" onerror="this.style.display='none'">
```

- [ ] **Step 2: `terms.html` — mesmo processo**

Substituir "Pastita" por "Cardapidex" e logo src.

- [ ] **Step 3: Commit**

```bash
git add public/privacy.html public/terms.html
git commit -m "brand: privacy.html + terms.html — Pastita → Cardapidex"
```

---

## Task 8: Verificação final + build

- [ ] **Step 1: Confirmar que não restam referências visíveis ao usuário**

```bash
grep -rn "Pastita\|pastita-logo\|marsala\|#722F37\|#9B2335" \
  src/components/layout/Navbar.tsx \
  src/components/common/Loading.tsx \
  src/pages/auth/LoginPage.tsx \
  src/pages/auth/CadastroPage.tsx \
  src/index.css \
  index.html \
  public/manifest.json \
  public/sw.js
```
Esperado: 0 matches.

- [ ] **Step 2: Build completo**

```bash
npm run build 2>&1 | tail -20
```
Esperado: `✓ built in Xs` sem erros.

- [ ] **Step 3: Verificar visualmente**

```bash
npm run dev
```
Abrir `http://localhost:5173` e confirmar:
- Favicon verde na aba do browser
- LoginPage mostra logo "Cx" verde e nome "Cardapidex"
- `/cadastro` mostra landing page verde com "Cardapidex"
- Navbar sem nenhum texto "Pastita"

- [ ] **Step 4: Commit final se houver arquivos pendentes**

```bash
git add -A
git status  # confirmar o que vai ser commitado
git commit -m "brand: verificação final — rebrand Pastita → Cardapidex completo"
```

---

## Itens fora de escopo (não fazer neste plano)

- `src/services/marketingService.ts` linhas 1093-1146 — são exemplos em templates de e-mail, dinamicamente substituídos em runtime pelo nome real da loja. Não afetam a UI da marca.
- `src/services/delivery.ts` / `reports.ts` / `saladasReport.ts` / `useRealtime.tsx` — `STORE_SLUG` fallback para 'pastita' é um fallback de runtime para a loja Cê Saladas específica, não é texto de marca. Deixar como está.
- Renomear o repositório `pastita-dash` — operação de infra, fora de escopo do rebrand visual.
- Atualizar `CLAUDE.md` — pode ser feito separadamente.
