/**
 * Quanto a coluna lateral está ocupando AGORA, para a navbar acompanhar.
 *
 * A coluna recolhida reserva 72px no fluxo; ao espiar, ela cresce para 264px
 * mas FLUTUA — o espaço reservado continua 72px de propósito, senão a página
 * inteira andaria 192px a cada passada de mouse.
 *
 * Só que a navbar ficava embaixo dessa parte flutuante e parecia não reagir.
 * A diferença (192px) vira um recuo aplicado SÓ na navbar: o topo acompanha a
 * coluna e o conteúdo da página não se mexe.
 *
 * Publicado como variável CSS em vez de estado do React: hover não pode
 * re-renderizar a árvore inteira da página.
 */
export const LARGURA_RECOLHIDA = 72;
export const LARGURA_ABERTA = 264;

/** Recuo extra que a navbar precisa para não ficar sob a coluna espiada. */
export const recuoDaNavbar = (espiada: boolean): string =>
  espiada ? `${LARGURA_ABERTA - LARGURA_RECOLHIDA}px` : '0px';

export const VAR_RECUO = '--recuo-da-navbar';

export function publicarRecuo(espiada: boolean): void {
  if (typeof document === 'undefined') return;
  document.documentElement.style.setProperty(VAR_RECUO, recuoDaNavbar(espiada));
}
