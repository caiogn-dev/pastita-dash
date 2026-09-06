/**
 * Altura da casca do painel.
 *
 * O painel é uma APP SHELL: a janela NÃO rola, o conteúdo rola por dentro.
 * A coluna de navegação e a barra de identidade ficam de pé porque estão fora
 * da área que rola — não porque acertaram um `sticky`.
 *
 * Antes, só as rotas de tela cheia (inbox, KDS) eram presas na viewport, e a
 * página comum deixava a janela rolar. O preço disso, medido no navegador na
 * página de Fidelidade: a coluna de navegação sumia depois de 695px de
 * rolagem, porque o `sticky` dela só valia enquanto o pai — de 695px — estava
 * em vista, e a página tinha 4490px.
 *
 * `dvh` e não `vh`: no celular a barra do navegador entra e sai, e `100vh`
 * ignora isso — o composer do chat ficava escondido atrás dela.
 *
 * O parâmetro continua existindo porque as rotas de tela cheia também pedem
 * `min-h-0` nas camadas internas; hoje o valor é o mesmo para as duas, e o
 * teste garante que continue sendo.
 */
export const classeDeAltura = (_alturaFixa: boolean): string =>
  'h-[100dvh] overflow-hidden';
