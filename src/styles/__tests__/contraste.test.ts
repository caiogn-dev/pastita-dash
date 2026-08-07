/**
 * Contraste dos tokens — trava de acessibilidade.
 *
 * Em 07/ago medimos todos os pares de token e o tema claro reprovava em três
 * lugares, dois deles graves:
 *
 *   --brand como texto     2,08–2,40:1   reprovava até para elemento de UI (3:1)
 *   --fg-muted             3,44–3,98:1   reprovava para texto normal (4,5:1)
 *   --border em input      1,38:1        o campo sumia no fundo (1.4.11 pede 3:1)
 *
 * O ouro era a cor do número mais importante da tela (StatCard tone="brand") e
 * o fg-muted tinha 652 usos. Nenhum code review pega isso — é aritmética.
 *
 * O tema escuro passava em tudo, e continua passando: o teste cobre os dois.
 */
import { describe, expect, it } from '@jest/globals';

/** Luminância relativa (WCAG 2.x). */
function luminancia(hex: string): number {
  const h = hex.replace('#', '');
  const canal = (i: number) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(0) + 0.7152 * canal(2) + 0.0722 * canal(4);
}

function contraste(a: string, b: string): number {
  const [la, lb] = [luminancia(a), luminancia(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Espelha `src/styles/tokens.css`. Ao mexer lá, atualize aqui. */
const CLARO = {
  fg: '#2B2620',
  'fg-muted': '#756B5C',
  'brand-ink': '#846828',
  'on-brand': '#241E14',
  brand: '#C9A24B',
  'border-input': '#998769',
  success: '#047857',
  warning: '#AF5109',
  danger: '#D32222',
  info: '#2361EB',
  canvas: '#FBF7EF',
  surface: '#ffffff',
  'surface-2': '#F4EEE2',
  // Cromo (navbar + coluna lateral). Duas pontas do gradiente: o texto tem de
  // passar nas DUAS, senão fica legível no topo da barra e some na base.
  'chrome-bg': '#FFFFFF',
  'chrome-bg-to': '#FBF7EF',
  'chrome-fg': '#2B2620',
  'chrome-fg-muted': '#756B5C',
  'chrome-border': '#E6DAC4',
};

const ESCURO = {
  fg: '#F5ECDE',
  'fg-muted': '#A89880',
  'brand-ink': '#DEBE79',
  'on-brand': '#14100A',
  brand: '#DEBE79',
  'border-input': '#776047',
  success: '#34d399',
  warning: '#fbbf24',
  danger: '#f87171',
  info: '#60a5fa',
  canvas: '#0F0D0B',
  surface: '#1A1613',
  'surface-2': '#131009',
  'chrome-bg': '#1F1A15',
  'chrome-bg-to': '#0B0908',
  'chrome-fg': '#F5ECDE',
  'chrome-fg-muted': '#A89880',
  'chrome-border': '#3A322A',
};

const FUNDOS = ['canvas', 'surface', 'surface-2'] as const;
const TEXTOS = ['fg', 'fg-muted', 'brand-ink', 'success', 'warning', 'danger', 'info'] as const;

const AA_TEXTO = 4.5;
const AA_UI = 3.0;

describe.each([
  ['claro', CLARO],
  ['escuro', ESCURO],
])('tema %s', (_nome, T) => {
  it.each(TEXTOS)('%s é legível sobre todos os fundos', (texto) => {
    for (const fundo of FUNDOS) {
      const v = contraste(T[texto], T[fundo]);
      // O par entra na mensagem porque `expect` deste runner não aceita
      // segundo argumento — sem isso a falha não diz QUAL combinação quebrou.
      expect({ par: `${texto}/${fundo}`, contraste: v >= AA_TEXTO }).toEqual({
        par: `${texto}/${fundo}`,
        contraste: true,
      });
    }
  });

  it('texto sobre o ouro da marca é legível', () => {
    // O botão primário e os chips ativos pintam texto sobre --brand.
    const v = contraste(T['on-brand'], T.brand);
    expect({ contraste: v.toFixed(2), passa: v >= AA_TEXTO }).toEqual({
      contraste: v.toFixed(2),
      passa: true,
    });
  });

  it('o texto do cromo é legível nas duas pontas do gradiente', () => {
    // A navbar era carvão nos DOIS temas — decisão que fazia sentido enquanto
    // ela era o único cromo da tela. Com a coluna lateral ao lado, no tema
    // claro virava faixa preta grudada em coluna branca. Agora o cromo segue
    // o tema, e o preço disso é que o contraste precisa ser garantido em dois
    // fundos diferentes por tema, não em um.
    for (const fundo of ['chrome-bg', 'chrome-bg-to'] as const) {
      for (const texto of ['chrome-fg', 'chrome-fg-muted'] as const) {
        const v = contraste(T[texto], T[fundo]);
        expect({ par: `${texto}/${fundo}`, passa: v >= AA_TEXTO }).toEqual({
          par: `${texto}/${fundo}`,
          passa: true,
        });
      }
    }
  });

  it('a borda do cromo separa a barra do conteúdo', () => {
    // Sem borda percebível, no tema claro a navbar marfim encosta no canvas
    // marfim e a casca do app deixa de existir visualmente.
    const v = contraste(T['chrome-border'], T['chrome-bg']);
    expect({ contraste: v.toFixed(2), passa: v >= 1.2 }).toEqual({
      contraste: v.toFixed(2),
      passa: true,
    });
  });

  it('a borda de campo de formulário é percebível', () => {
    // WCAG 1.4.11: o limite de um controle precisa ser distinguível do fundo.
    for (const fundo of ['surface', 'surface-2'] as const) {
      const v = contraste(T['border-input'], T[fundo]);
      expect({ par: `border-input/${fundo}`, passa: v >= AA_UI }).toEqual({
        par: `border-input/${fundo}`,
        passa: true,
      });
    }
  });
});
