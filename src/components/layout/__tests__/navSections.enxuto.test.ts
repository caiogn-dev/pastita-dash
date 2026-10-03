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

  it('o menu inteiro cabe em até 38 destinos', () => {
    expect(destinos().length).toBeLessThanOrEqual(38);
  });

  it.each(FORA_DO_MENU)('a rota de %s continua no roteador', (_nome, href) => {
    const app = fs.readFileSync(path.resolve(__dirname, '../../../App.tsx'), 'utf8');
    const semBarra = href.replace(/^\//, '');
    expect(app.includes(`path="${semBarra}"`) || app.includes(`path="${href}"`)).toBe(true);
  });
});
