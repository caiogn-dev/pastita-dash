import * as fs from 'fs';
import * as path from 'path';
import { buildNavSections } from '../navSections';

/**
 * Menu enxuto (03/10/2026): 50 destinos em 12 seções, e o uso medido nos logs
 * do nginx (17/09–03/10) concentrado em ~15. Saíram do MENU as telas com até
 * 8 chamadas em 16 dias e as de depuração ("painel é produto do lojista, não
 * debugger"). As ROTAS continuam de pé: link salvo não quebra, e voltar ao
 * menu é uma linha.
 */
const FORA_DO_MENU: Array<[string, string]> = [
  ['Agentes de IA', '/agents'],
  ['Respostas automáticas', '/automation/companies'],
  ['Mensagens automáticas', '/automation/messages'],
  ['Conversas da IA', '/automation/intents/stats'],
  ['Campanha por e-mail', '/marketing/email/campaigns'],
  ['E-mails automáticos', '/marketing/automations'],
  ['Sessões', '/automation/sessions'],
  ['Conversão do bot', '/atendimento/conversao-do-bot'],
  ['Insights', '/automation/conversation-insights'],
  ['Metas e Conquistas', '/conquistas'],
  ['Diagnóstico do WhatsApp', '/whatsapp/diagnostics'],
  ['Diagnóstico do chat', '/whatsapp/debug'],
];

const secoes = () =>
  buildNavSections({ storeHref: (p: string) => `/stores/loja-x/${p}`, automationEnabled: true });

const destinos = () => secoes().flatMap((s) => (s.href ? [s.href] : []).concat(s.items.map((i) => i.href)));

describe('menu enxuto', () => {
  it.each(FORA_DO_MENU)('%s saiu do menu', (nome, href) => {
    const nomes = secoes().flatMap((s) => s.items.map((i) => i.name));
    expect(nomes).not.toContain(nome);
    expect(destinos()).not.toContain(href);
  });

  it('a seção Automação não existe mais', () => {
    expect(secoes().map((s) => s.label)).not.toContain('Automação');
  });

  // 39 desde 22/10: o dono pediu "Mensagens prontas" no menu — o texto que o
  // bot manda sozinho só era alcançável por Modelos de mensagem → Editar.
  // 40 no mesmo dia: "Equipe e entregas" (só se chegava por um botão no Histórico).
  // 41 em 26/10: o extrato de Pagamentos virou 'Pagamentos recebidos' em
  // Financeiro, e Configurações → Pagamentos passou a configurar o recebimento.
  // 40 de novo no mesmo dia: Mensagens prontas + Avisos enviados viraram
  // uma tela só (Avisos automáticos).
  it('o menu inteiro cabe em até 40 destinos', () => {
    expect(destinos().length).toBeLessThanOrEqual(40);
  });

  // 26/10: as telas órfãs foram apagadas, mas o endereço salvo não quebra —
  // cai num redirect (exato ou por prefixo "x/*").
  it.each(FORA_DO_MENU)('o endereço de %s ainda leva a algum lugar', (_nome, href) => {
    const app = fs.readFileSync(path.resolve(__dirname, '../../../App.tsx'), 'utf8');
    const caminhos = Array.from(app.matchAll(/path="([^"]+)"/g), (m) => m[1]);
    const alvo = href.replace(/^\//, '');
    const atende = caminhos.some((c) =>
      c === alvo || (c.endsWith('/*') && (alvo + '/').startsWith(c.slice(0, -1))));
    expect(atende).toBe(true);
  });
});
