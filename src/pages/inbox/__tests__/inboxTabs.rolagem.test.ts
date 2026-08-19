import { INBOX_TABS, rolagemDaAba } from '../inboxTabs';

/**
 * Quem rola: a aba ou o wrapper?
 *
 * O wrapper do conteúdo era `overflow-y-auto` para TODAS as abas. Isso entrou
 * por um motivo real: a aba "Todas" é uma página de altura natural e, sem
 * rolagem em nenhum ancestral, ficava CORTADA — do 6º card em diante não
 * aparecia nada e a roda do mouse não fazia efeito.
 *
 * Só que a aba WhatsApp é um shell tipo WhatsApp Web: ela precisa ocupar
 * exatamente a altura disponível e rolar por DENTRO (só a caixa de mensagens).
 * Com o wrapper rolando, o chat inteiro — mensagens MAIS o campo de digitar —
 * virava conteúdo de uma página comprida: a lista de conversas saía da tela e
 * só dava para escrever depois de rolar até o fim.
 *
 * Uma escolha só não serve para as duas. A aba declara como quer rolar.
 */
describe('rolagem por aba do inbox', () => {
  it('a aba WhatsApp cuida da própria rolagem', () => {
    expect(rolagemDaAba('whatsapp')).toBe('propria');
  });

  it('a aba Todas rola no wrapper — senão fica cortada', () => {
    expect(rolagemDaAba('conversas')).toBe('wrapper');
  });

  it('toda aba declara sua rolagem — aba nova não entra sem decidir', () => {
    for (const t of INBOX_TABS) {
      expect(['propria', 'wrapper']).toContain(rolagemDaAba(t.id));
    }
  });
});
