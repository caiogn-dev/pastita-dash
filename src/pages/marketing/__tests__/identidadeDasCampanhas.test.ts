/**
 * As telas de campanha com UMA identidade (25/09). O dono: "as campanhas que
 * já foram estão feias; quero simples". Cada tela tinha a sua paleta: cartão
 * colorido por status, ícone colorido por tipo, gradiente nas ações rápidas,
 * verde do WhatsApp em hex. Cor agora só diz ESTADO, e vem do kit.
 *
 * Teste de string, arquivo por arquivo: é o que impede a volta.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from '@jest/globals';

const PAGINAS = [
  'whatsapp/WhatsAppCampaignsPage.tsx',
  'email/CampaignsListPage.tsx',
  'whatsapp/WhatsAppTemplatesPage.tsx',
  'MarketingPage.tsx',
];

const ler = (rel: string) => readFileSync(join(__dirname, '..', rel), 'utf8');

/** Mesma expressão da catraca (src/styles/__tests__/coresCruas.test.ts). */
const COR_CRUA = /\b(bg|text|border|ring|from|to|via)-(gray|slate|zinc|neutral|stone|blue|green|red|yellow|purple|indigo|pink|amber|emerald|orange|teal|rose|violet|cyan|sky|lime|fuchsia)-(50|100|200|300|400|500|600|700|800|900|950)\b/g;

/** O que a catraca não pega, mas é cor fora do tema do mesmo jeito. */
const COR_FORA_DO_TEMA = [
  /#[0-9a-fA-F]{3,8}\b/, // hex solto (o verde do WhatsApp)
  /\b(text|bg|border|from|to)-(white|black)\b/,
  /\bprimary-\d{2,3}\b/, // paleta antiga, fora dos tokens
  /gradient/,
];

describe.each(PAGINAS)('%s', (rel) => {
  const fonte = ler(rel);

  it('zero cor crua do Tailwind', () => {
    expect(fonte.match(COR_CRUA) ?? []).toEqual([]);
  });

  it('zero cor fora do tema (hex, branco/preto fixo, paleta antiga, gradiente)', () => {
    expect(COR_FORA_DO_TEMA.filter((re) => re.test(fonte)).map(String)).toEqual([]);
  });

  it('nada em caixa alta', () => {
    expect(fonte).not.toMatch(/\buppercase\b/);
    expect(fonte).not.toMatch(/className="[^"]*\boverline\b/);
  });

  it('nenhum campo cru: Input/Select/NumberField/Switch do kit', () => {
    expect(fonte).not.toMatch(/<(select|input|textarea)\b/);
  });

  it('nenhum componente local que já existe no kit, nenhum mapa de status próprio', () => {
    expect(fonte).not.toMatch(/const (StatCard|QuickAction|TemplateCard|Selo|StatusBadge|Progresso)\b/);
    expect(fonte).not.toMatch(/getStatusBadge|STATUS_CONFIG|typeColors|role="progressbar"/);
  });

  it('estado vem de SeloDeEstado + estados.ts', () => {
    if (rel.endsWith('WhatsAppTemplatesPage.tsx')) return; // modelo de mensagem não tem estado
    expect(fonte).toMatch(/SeloDeEstado/);
    expect(fonte).toMatch(/estadoDeCampanha/);
  });

  it('sem emoji na interface', () => {
    expect(fonte).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  });
});
