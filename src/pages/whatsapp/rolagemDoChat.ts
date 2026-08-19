/**
 * Rolagem da caixa de mensagens do inbox.
 *
 * ANTES: `messagesEndRef.current.scrollIntoView()`.
 * Dois problemas, e os dois aparecem só em conversa longa:
 *
 * 1. `scrollIntoView` rola TODOS os ancestrais roláveis para trazer o elemento
 *    à vista — não apenas a caixa de mensagens. Numa conversa comprida ele
 *    arrastava a página inteira, e navbar e lista de conversas saíam da tela.
 * 2. O `block` padrão é `'start'`: o marcador do FIM era alinhado ao TOPO da
 *    viewport, empurrando o layout para cima.
 *
 * Mexer só no `scrollTop` do próprio container não tem como vazar para o pai:
 * é uma propriedade daquele elemento e de mais ninguém.
 */
export function rolarParaOFim(container: HTMLElement | null): void {
  if (!container) return;
  container.scrollTop = container.scrollHeight;
}

/** Está perto o bastante do fim para valer acompanhar mensagem nova? */
export function estaNoFim(container: HTMLElement | null, folga = 120): boolean {
  if (!container) return true;
  return container.scrollHeight - container.scrollTop - container.clientHeight <= folga;
}
