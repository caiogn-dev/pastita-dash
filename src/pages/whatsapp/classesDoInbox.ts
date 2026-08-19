/**
 * Classe raiz do inbox, que decide o que aparece em tela estreita.
 *
 * `.conversations-panel` é `width: 320px; flex-shrink: 0` e não tem nenhum
 * breakpoint: num celular de 360px sobram 40px para o chat. Como o shell mobile
 * não tem tela própria de inbox, é a página desktop que chega no celular.
 *
 * No estreito passa a valer o padrão do WhatsApp: uma coluna por vez. Sem
 * conversa escolhida, a lista ocupa tudo; com conversa aberta, o chat ocupa
 * tudo e a lista sai. No largo continua lado a lado, como sempre foi.
 */
export const classesDoInbox = (temConversaAberta: boolean): string =>
  ['whatsapp-inbox', temConversaAberta ? 'whatsapp-inbox--conversa-aberta' : '']
    .filter(Boolean)
    .join(' ');
