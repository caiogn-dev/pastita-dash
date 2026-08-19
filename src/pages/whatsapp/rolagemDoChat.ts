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

/**
 * Mantém o container colado no fim enquanto ele ainda estiver crescendo.
 *
 * Rolar uma vez (ou no quadro seguinte) não basta ao ABRIR uma conversa: as
 * ~100 bolhas da primeira página são medidas ao longo de vários quadros —
 * texto quebra linha, avatar carrega, mídia reserva espaço — e o `scrollHeight`
 * continua aumentando depois do primeiro ajuste. O resultado é abrir a conversa
 * parada na primeira mensagem carregada, no topo.
 *
 * Em vez de adivinhar um número de quadros, observa o tamanho: enquanto a caixa
 * crescer, gruda no fim. Devolve a função que solta.
 */
export function grudarNoFim(container: HTMLElement | null): () => void {
  if (!container) return () => {};

  const irAoFim = () => rolarParaOFim(container);
  irAoFim();

  // Duas redes, de propósito. O ResizeObserver corrige no instante exato em que
  // a caixa cresce — é o certo. As tentativas espaçadas cobrem o caso de ele
  // não disparar: navegador sem suporte, crescimento que não passa por resize
  // observado, ou um ambiente onde ele é um stub. Depender de uma só rede aqui
  // custa exatamente o sintoma que isto conserta: abrir a conversa no topo.
  const timers = [0, 60, 180, 400, 800].map((ms) => setTimeout(irAoFim, ms));

  const RO = (globalThis as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
  let observer: ResizeObserver | null = null;
  if (RO) {
    observer = new RO(irAoFim);
    observer.observe(container);
    // Os filhos é que crescem; observar só o pai perde a remedição das bolhas.
    for (const filho of Array.from(container.children)) observer.observe(filho);
  }

  // Teto: passado isso a conversa está estável, e continuar grudado impediria
  // o atendente de subir para ler o histórico.
  const fim = setTimeout(() => observer?.disconnect(), 1200);

  return () => {
    timers.forEach(clearTimeout);
    clearTimeout(fim);
    observer?.disconnect();
  };
}
