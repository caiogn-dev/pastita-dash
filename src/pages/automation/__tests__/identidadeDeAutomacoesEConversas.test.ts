/**
 * Automações, inbox do Messenger, Conversas e "O que o cliente pede" com UMA
 * identidade (25/09). Cada uma tinha a sua paleta: rosa no aniversário, azul
 * do Messenger em todo balão, gradiente do Instagram, esmeralda do WhatsApp,
 * índigo e roxo nos números de intenção, verde cru no botão "Criar". Cor agora
 * só diz ESTADO, e o estado vem de `estados.ts`.
 *
 * Teste de string, arquivo por arquivo: é o que impede a volta.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from '@jest/globals';

const PAGINAS = [
  'marketing/AutomationsPage.tsx',
  'messenger/MessengerInbox.tsx',
  'conversations/ConversationsPage.tsx',
  'automation/AutoMessagesPage.tsx',
  'automation/IntentStatsPage.tsx',
];

const ler = (rel: string) => readFileSync(join(__dirname, '..', '..', rel), 'utf8');

const PALETA =
  'red|green|blue|yellow|amber|orange|gray|slate|zinc|neutral|stone|emerald|rose|indigo|purple|violet|teal|cyan|sky|lime|pink|fuchsia';
const COR_CRUA = new RegExp(
  `\\b(bg|text|border|ring|from|to|via|fill|stroke|divide|placeholder|accent|outline)-(${PALETA})-\\d{2,3}\\b`,
  'g',
);

/** O que a catraca não pega, mas é cor fora do tema do mesmo jeito. */
const COR_FORA_DO_TEMA = [
  /\[[^\]]*#[0-9a-fA-F]{3,8}[^\]]*\]/, // hex numa classe
  /\b(text|bg|border|from|to)-(white|black)\b/,
  /\bprimary-\d{2,3}\b/, // paleta antiga, fora dos tokens
  /gradient/,
  /\bdark:/, // o token já vira sozinho com o tema
];

describe.each(PAGINAS)('%s', (rel) => {
  const fonte = ler(rel);

  it('zero cor crua do Tailwind', () => {
    expect(fonte.match(COR_CRUA) ?? []).toEqual([]);
  });

  it('zero cor fora do tema (hex, branco/preto fixo, paleta antiga, gradiente, dark:)', () => {
    expect(COR_FORA_DO_TEMA.filter((re) => re.test(fonte)).map(String)).toEqual([]);
  });

  it('nada em caixa alta', () => {
    expect(fonte).not.toMatch(/\buppercase\b/);
    expect(fonte).not.toMatch(/className="[^"]*\boverline\b/);
  });

  it('nenhum campo cru: Input/Select/NumberField/Textarea/Switch do kit', () => {
    expect(fonte).not.toMatch(/<(select|input|textarea)\b/);
  });

  it('nenhuma superfície montada à mão', () => {
    expect(fonte).not.toMatch(/rounded-(lg|xl|2xl)\s+border\s+border-border/);
    expect(fonte).not.toMatch(/bg-bg-card|border-border-primary/);
  });

  it('nenhum componente local que já existe no kit, nenhum mapa de cor próprio', () => {
    expect(fonte).not.toMatch(/const (StatCard|Selo|StatusBadge|Progresso|Toggle)\b/);
    expect(fonte).not.toMatch(/TRIGGER_CONFIG|bgColor|getAvatarColor|function PlatformGlyph/);
  });

  it('sem emoji na interface', () => {
    expect(fonte).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  });
});

describe('estado de coisa vem de SeloDeEstado + estados.ts', () => {
  it.each([
    ['marketing/AutomationsPage.tsx', 'estadoDeAutomacao'],
    ['automation/AutoMessagesPage.tsx', 'estadoDeAutomacao'],
    ['conversations/ConversationsPage.tsx', 'estadoDeConversa'],
  ])('%s usa %s', (rel, mapa) => {
    const fonte = ler(rel);
    expect(fonte).toMatch(/SeloDeEstado/);
    expect(fonte).toMatch(new RegExp(mapa));
  });

  it('liga/desliga de automação é o Switch do kit', () => {
    for (const rel of ['marketing/AutomationsPage.tsx', 'automation/AutoMessagesPage.tsx']) {
      expect(ler(rel)).toMatch(/<Switch\b/);
    }
  });
});

describe('chassi', () => {
  it.each(PAGINAS)('%s monta a página no PageShell', (rel) => {
    expect(ler(rel)).toMatch(/<PageShell\b/);
  });

  it('números de página são KpiGrid, não cartões à mão', () => {
    for (const rel of ['conversations/ConversationsPage.tsx', 'automation/IntentStatsPage.tsx']) {
      expect(ler(rel)).toMatch(/<KpiGrid\b/);
    }
  });

  it('falha de carga das intenções é FalhaAoCarregar, não banner vermelho', () => {
    expect(ler('automation/IntentStatsPage.tsx')).toMatch(/<FalhaAoCarregar\b/);
  });

  it('número formatado por utils/formatters, não toLocaleString solto', () => {
    expect(ler('automation/IntentStatsPage.tsx')).not.toMatch(/toLocaleString\(|toFixed\(/);
  });
});
