import { classeDeAltura } from '../alturaDaCasca';

describe('altura da casca', () => {
  it('página comum cresce com o conteúdo', () => {
    expect(classeDeAltura(false)).toContain('min-h-screen');
  });

  it('rota de tela cheia é presa na viewport', () => {
    expect(classeDeAltura(true)).toContain('h-[100dvh]');
  });

  it('tela cheia não deixa a página rolar por fora', () => {
    // Sem isto o chat empurra o layout e a lista de conversas sai da tela.
    expect(classeDeAltura(true)).toContain('overflow-hidden');
  });

  it('tela cheia NÃO usa min-h-screen — é ele que tira o teto de altura', () => {
    expect(classeDeAltura(true)).not.toContain('min-h-screen');
  });

  it('usa dvh e não vh — a barra do navegador no celular escondia o composer', () => {
    expect(classeDeAltura(true)).toContain('dvh');
    expect(classeDeAltura(true)).not.toContain('100vh');
  });
});
