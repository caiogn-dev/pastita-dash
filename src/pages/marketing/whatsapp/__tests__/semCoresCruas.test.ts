/**
 * A tela de nova campanha vive nos tokens do tema.
 *
 * Ela tinha `green-500`, `green-50`, `blue-600`, `text-white` e fundos
 * `dark:bg-[#161616]` escritos à mão: no tema escuro o verde do WhatsApp
 * brigava com o dourado do painel, e cada cor crua precisava do seu par
 * `dark:` — que alguém sempre esquece. O verde agora é só de "enviado/ativo"
 * e do botão final, e sai do token `--success`.
 *
 * Também sem caixa alta: rótulo em `uppercase` foi vetado pelo dono na
 * direção de 25/09.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from '@jest/globals';

const RAIZ = join(__dirname, '..', '..', '..', '..');

const ARQUIVOS = [
  'pages/marketing/whatsapp/NewWhatsAppCampaignPage.tsx',
  'pages/marketing/whatsapp/SeletorDeAudiencia.tsx',
  'pages/marketing/whatsapp/ConstrutorDeRegras.tsx',
  'pages/marketing/whatsapp/campanha/CampoDeImagem.tsx',
  'pages/marketing/whatsapp/campanha/passos/PassoDaConta.tsx',
  'pages/marketing/whatsapp/campanha/passos/PassoDosDestinatarios.tsx',
  'pages/marketing/whatsapp/campanha/passos/PassoDaRevisao.tsx',
  'components/marketing/BalaoDeWhatsApp.tsx',
];

const PALETA =
  'red|green|blue|yellow|amber|orange|gray|slate|zinc|neutral|stone|emerald|rose|indigo|purple|violet|teal|cyan|sky|lime|pink|fuchsia';

/** `bg-green-500`, `text-blue-600`, `hover:border-green-400`… */
const COR_CRUA = new RegExp(
  `\\b(bg|text|border|ring|from|to|via|fill|stroke|divide|placeholder|accent|outline)-(${PALETA})-\\d{2,3}\\b`,
);
/** `text-white`, `bg-black` — não viram de tom com o tema. */
const PRETO_E_BRANCO = /\b(bg|text|border)-(white|black)\b/;
/** Hex solto numa classe arbitrária: `dark:bg-[var(--x,#161616)]`, `bg-[#25D366]`. */
const HEX = /\[[^\]]*#[0-9a-fA-F]{3,8}[^\]]*\]/;

const infratores = (regra: RegExp) =>
  ARQUIVOS.flatMap((arquivo) =>
    readFileSync(join(RAIZ, arquivo), 'utf8')
      .split('\n')
      .map((linha, i) => ({ linha, i }))
      .filter(({ linha }) => regra.test(linha))
      .map(({ i, linha }) => `${arquivo}:${i + 1}  ${linha.trim()}`),
  );

describe('nova campanha de WhatsApp — só tokens do tema', () => {
  it('nenhuma cor da paleta crua do Tailwind', () => {
    expect(infratores(COR_CRUA)).toEqual([]);
  });

  it('nenhum text-white / bg-black', () => {
    expect(infratores(PRETO_E_BRANCO)).toEqual([]);
  });

  it('nenhum hex escrito numa classe', () => {
    expect(infratores(HEX)).toEqual([]);
  });

  it('nenhum rótulo em caixa alta', () => {
    expect(infratores(/\buppercase\b/)).toEqual([]);
  });

  it('nenhuma variante dark: escrita à mão — o token já vira sozinho', () => {
    expect(infratores(/\bdark:/)).toEqual([]);
  });
});
