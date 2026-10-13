/**
 * Prévia ao vivo (13/10): o painel manda o rascunho para o iframe da vitrine
 * (/preview/{slug}) a cada mudança, antes de salvar. Do outro lado,
 * cardapidex-web/src/hooks/useRascunhoDoPainel.js.
 */
import { renderHook, act } from '@testing-library/react';

import { usePreviaAoVivo } from '../usePreviaAoVivo';

const ORIGEM = 'https://cardapidex.com.br';

function iframeFalso() {
  const postMessage = jest.fn();
  const contentWindow = { postMessage } as unknown as Window;
  return { el: { contentWindow } as unknown as HTMLIFrameElement, postMessage, contentWindow };
}

describe('usePreviaAoVivo', () => {
  it('manda o rascunho só para a origem da prévia', () => {
    const f = iframeFalso();
    const { result } = renderHook(() => usePreviaAoVivo(`${ORIGEM}/preview/ce`));
    act(() => { result.current.registrarIframe(f.el); });
    act(() => { result.current.enviarRascunho({ exibicao: { foto_posicao: 'direita' } }); });
    expect(f.postMessage).toHaveBeenCalledWith(
      { tipo: 'cardapidex:rascunho', exibicao: { foto_posicao: 'direita' } },
      ORIGEM,
    );
  });

  it('focar pede a área', () => {
    const f = iframeFalso();
    const { result } = renderHook(() => usePreviaAoVivo(`${ORIGEM}/preview/ce`));
    act(() => { result.current.registrarIframe(f.el); });
    act(() => { result.current.focar('topo'); });
    expect(f.postMessage).toHaveBeenCalledWith({ tipo: 'cardapidex:focar', area: 'topo' }, ORIGEM);
  });

  it('prévia que (re)carregou recebe o último rascunho de novo', () => {
    const f = iframeFalso();
    const { result } = renderHook(() => usePreviaAoVivo(`${ORIGEM}/preview/ce`));
    act(() => { result.current.registrarIframe(f.el); });
    act(() => { result.current.enviarRascunho({ loja: { primary_color: '#111111' } }); });
    f.postMessage.mockClear();

    act(() => {
      window.dispatchEvent(new MessageEvent('message', {
        origin: ORIGEM, source: f.contentWindow as MessageEventSource, data: { tipo: 'cardapidex:previa-pronta' },
      }));
    });
    expect(f.postMessage).toHaveBeenCalledWith(
      { tipo: 'cardapidex:rascunho', loja: { primary_color: '#111111' } }, ORIGEM,
    );
  });

  it('aviso de outra origem é ignorado', () => {
    const f = iframeFalso();
    const { result } = renderHook(() => usePreviaAoVivo(`${ORIGEM}/preview/ce`));
    act(() => { result.current.registrarIframe(f.el); });
    act(() => { result.current.enviarRascunho({ exibicao: {} }); });
    f.postMessage.mockClear();
    act(() => {
      window.dispatchEvent(new MessageEvent('message', { origin: 'https://evil.com', data: { tipo: 'cardapidex:previa-pronta' } }));
    });
    expect(f.postMessage).not.toHaveBeenCalled();
  });

  it('url inválida não quebra', () => {
    const { result } = renderHook(() => usePreviaAoVivo(''));
    expect(() => result.current.enviarRascunho({})).not.toThrow();
  });
});
