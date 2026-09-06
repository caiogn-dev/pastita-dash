export type PassoDaCampanha = 'account' | 'message' | 'recipients' | 'review';
export type TipoDeMensagem = 'template' | 'text';

export const PASSOS: { id: PassoDaCampanha; label: string }[] = [
  { id: 'account', label: 'Conta' },
  { id: 'message', label: 'Mensagem' },
  { id: 'recipients', label: 'Destinatários' },
  { id: 'review', label: 'Enviar' },
];

/** O estado que as regras olham. Nada de React aqui — é só a decisão. */
export interface EstadoDaCampanha {
  temConta: boolean;
  tipo: TipoDeMensagem;
  temTemplate: boolean;
  precisaDeProdutosDaOferta: boolean;
  produtosEscolhidos: number;
  precisaDeImagemNoCabecalho: boolean;
  temImagem: boolean;
  texto: string;
  quantidadeDeContatos: number;
}

/** O template de oferta aprovado tem `{{produto_1}}` E `{{produto_2}}`. */
const PRODUTOS_DA_OFERTA = 2;

/**
 * Se o passo atual está completo.
 * ESPECIFICAÇÃO em `__tests__/passosDaCampanha.spec.ts`.
 *
 * Cada regra existe porque deixar passar custa caro: parâmetro faltando faz a
 * Meta recusar o disparo, e o dono descobre depois de gastar o clique.
 */
export const podeAvancar = (passo: PassoDaCampanha, e: EstadoDaCampanha): boolean => {
  switch (passo) {
    case 'account':
      return e.temConta;

    case 'message':
      if (e.tipo === 'template') {
        if (!e.temTemplate) return false;
        // Um produto só deixaria `{{produto_2}}` vazio — recusa por contagem.
        if (e.precisaDeProdutosDaOferta && e.produtosEscolhidos < PRODUTOS_DA_OFERTA) return false;
        // Cabeçalho de imagem sem imagem é recusa na hora.
        if (e.precisaDeImagemNoCabecalho && !e.temImagem) return false;
        return true;
      }
      // Texto OU mídia: os dois vazios é uma campanha que sai em branco.
      return Boolean(e.texto.trim()) || e.temImagem;

    case 'recipients':
      return e.quantidadeDeContatos > 0;

    case 'review':
      return true;

    default:
      return false;
  }
};

const indice = (passo: PassoDaCampanha) => PASSOS.findIndex((p) => p.id === passo);

export const proximoPasso = (passo: PassoDaCampanha): PassoDaCampanha =>
  PASSOS[Math.min(indice(passo) + 1, PASSOS.length - 1)].id;

export const passoAnterior = (passo: PassoDaCampanha): PassoDaCampanha =>
  PASSOS[Math.max(indice(passo) - 1, 0)].id;
