/**
 * Globais que o navegador tem e o TypeScript não declara sozinho.
 *
 * Sem isto, cada uso vira `(window as any)` — e o `any` não fica só na linha
 * dele: contamina tudo que sai da expressão. `(window as any).google.maps.Map`
 * devolve `any`, então o mapa inteiro deixa de ser verificado e um erro de
 * digitação em `setCenter` só aparece quando o cliente abre a tela.
 *
 * Declarar uma vez custa este arquivo e devolve a checagem para os oito usos.
 */

/// <reference types="google.maps" />

interface Window {
  /**
   * Safari só expõe `AudioContext` com prefixo. É o que toca o alerta de
   * pedido novo — sem o prefixo, o iPad do balcão fica mudo.
   */
  webkitAudioContext?: typeof AudioContext;

  /**
   * O SDK do Maps entra por `<script>` e se pendura em `window`. Opcional de
   * propósito: enquanto o script não terminou de carregar, ele NÃO existe, e é
   * o `?.` que impede o "cannot read property of undefined" que derrubava a
   * tela de zonas de entrega quando a rede estava lenta.
   */
  google?: typeof google;

  /** Callback que o loader do Maps chama quando o script termina. */
  __gmReadyCardapidex__?: () => void;
}
