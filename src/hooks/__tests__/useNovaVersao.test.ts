import { hashDoBundle } from '../useNovaVersao';

describe('nova versão do painel', () => {
  it('lê o hash do bundle no index.html e na URL do script', () => {
    expect(hashDoBundle('<script type="module" src="/assets/index-Cdhvr9d8.js"></script>')).toBe('Cdhvr9d8');
    expect(hashDoBundle('https://painel.cardapidex.com.br/assets/index-BY7K34MG.js')).toBe('BY7K34MG');
    expect(hashDoBundle('<html></html>')).toBeNull();
  });
});
