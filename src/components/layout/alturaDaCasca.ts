/**
 * Altura da casca do painel.
 *
 * A raiz era `min-h-screen` para TODA rota. Isso está certo para página comum:
 * ela cresce com o conteúdo e a janela rola. Mas quebra as rotas de tela cheia
 * (inbox, KDS), que são shells tipo WhatsApp Web: elas precisam ocupar
 * exatamente a viewport e rolar por dentro.
 *
 * Com `min-h-screen`, nenhuma altura percentual abaixo tem teto — `h-full` e
 * `height: 100%` resolvem contra um pai que pode crescer. O resultado é o chat
 * empurrando a página inteira: a coluna de conversas sai da tela e só dá para
 * escrever depois de rolar até o fim. Nenhum `overflow-hidden` mais abaixo
 * resolve, porque o problema é a falta de teto lá em cima.
 *
 * `dvh` e não `vh`: no celular a barra do navegador entra e sai, e `100vh`
 * ignora isso — o composer ficava escondido atrás dela.
 */
export const classeDeAltura = (alturaFixa: boolean): string =>
  alturaFixa ? 'h-[100dvh] overflow-hidden' : 'min-h-screen';
