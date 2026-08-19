import { rolarParaOFim, estaNoFim } from '../rolagemDoChat';

/** Container de mentira: jsdom não faz layout, então os tamanhos são fixados. */
const caixa = (scrollHeight: number, clientHeight: number, scrollTop = 0) => {
  const el = document.createElement('div');
  Object.defineProperty(el, 'scrollHeight', { value: scrollHeight, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: clientHeight, configurable: true });
  el.scrollTop = scrollTop;
  return el;
};

describe('rolagem da caixa de mensagens', () => {
  it('leva a conversa para a última mensagem', () => {
    const el = caixa(8000, 600);
    rolarParaOFim(el);
    expect(el.scrollTop).toBe(8000);
  });

  it('não explode quando o container ainda não existe', () => {
    expect(() => rolarParaOFim(null)).not.toThrow();
  });

  it('mexe SÓ no próprio container — nunca chama scrollIntoView', () => {
    const el = caixa(8000, 600);
    const espiao = jest.fn();
    el.scrollIntoView = espiao;
    rolarParaOFim(el);
    // scrollIntoView rolaria os ancestrais junto: era isso que empurrava a
    // página e sumia com a navbar e a lista de conversas.
    expect(espiao).not.toHaveBeenCalled();
  });

  it('reconhece que já está no fim', () => {
    expect(estaNoFim(caixa(1000, 400, 600))).toBe(true);
  });

  it('reconhece que o usuário subiu para ler histórico', () => {
    expect(estaNoFim(caixa(8000, 600, 100))).toBe(false);
  });

  it('conversa curta que nem rola conta como estando no fim', () => {
    expect(estaNoFim(caixa(300, 600, 0))).toBe(true);
  });
});
