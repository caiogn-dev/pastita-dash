/**
 * Regressão de layout do inbox: conversa longa não pode estourar o container.
 *
 * Sintoma relatado em produção: ao abrir uma conversa com muitas mensagens, o
 * feed crescia até a altura do histórico inteiro. O composer saía da tela e a
 * coluna de conversas ficava com uma faixa branca gigante embaixo. Conversas
 * curtas funcionavam — por isso demorou a aparecer.
 *
 * Causa: flex item nasce com `min-height: auto` e se recusa a encolher abaixo do
 * conteúdo. A cadeia .whatsapp-inbox → .chat-panel → .messages-container só
 * respeita a altura do pai se cada elo declarar `min-height: 0`.
 *
 * jsdom não faz layout, então o teste inspeciona o contrato no CSS: cada elo da
 * cadeia precisa do min-height: 0. É o que impede alguém de removê-lo por
 * parecer supérfluo.
 */
import * as fs from 'fs';
import * as path from 'path';

const css = fs.readFileSync(path.resolve(__dirname, '../WhatsAppInbox.css'), 'utf8');

/** Corpo da primeira regra do seletor, sem comentários. */
const regra = (seletor: string): string => {
  const escapado = seletor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escapado}\\s*\\{([^}]*)\\}`));
  if (!match) throw new Error(`seletor ${seletor} não encontrado no CSS`);
  return match[1].replace(/\/\*[\s\S]*?\*\//g, '');
};

const temMinHeightZero = (seletor: string): boolean =>
  /min-height:\s*0(?:px)?\s*;/.test(regra(seletor));

describe('cadeia de altura do inbox', () => {
  it.each(['.whatsapp-inbox', '.chat-panel', '.messages-container', '.conversations-panel'])(
    '%s declara min-height: 0 para não crescer com o conteúdo',
    (seletor) => {
      expect(temMinHeightZero(seletor)).toBe(true);
    },
  );

  it('o histórico rola dentro da própria caixa', () => {
    expect(regra('.messages-container')).toMatch(/overflow-y:\s*auto/);
  });

  it('a lista de conversas rola dentro da própria caixa', () => {
    expect(regra('.conversations-list')).toMatch(/overflow-y:\s*auto/);
  });

  it('o container raiz não deixa nada vazar para a página', () => {
    expect(regra('.whatsapp-inbox')).toMatch(/overflow:\s*hidden/);
  });
});
