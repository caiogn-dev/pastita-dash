/**
 * ESPECIFICAÇÃO — quando dá para avançar na criação da campanha.
 *
 * Estas são as regras que decidem se o botão "Próximo" acende. Elas viviam
 * num `switch` dentro de uma tela de 1.741 linhas, e cada uma existe porque
 * deixar passar custa caro:
 *
 *  - Template de OFERTA precisa de DOIS produtos. O template aprovado na Meta
 *    tem `{{produto_1}}` e `{{produto_2}}`; mandar um só deixa a segunda
 *    variável vazia, e a Meta recusa por contagem de parâmetros.
 *  - Template com cabeçalho de IMAGEM precisa da imagem. Sem ela o envio é
 *    recusado na hora — e o dono já gastou o clique.
 *  - Mensagem livre precisa de texto OU mídia. As duas vazias é uma campanha
 *    que sai em branco.
 *  - Sem destinatário não existe campanha.
 */
import { podeAvancar, PASSOS, proximoPasso, passoAnterior } from '../passosDaCampanha';

const base = {
  temConta: true,
  tipo: 'template' as const,
  temTemplate: true,
  precisaDeProdutosDaOferta: false,
  produtosEscolhidos: 0,
  precisaDeImagemNoCabecalho: false,
  temImagem: false,
  texto: '',
  quantidadeDeContatos: 0,
};

describe('spec: avançar na campanha', () => {
  describe('passo da conta', () => {
    it('precisa de uma conta escolhida', () => {
      expect(podeAvancar('account', { ...base, temConta: false })).toBe(false);
      expect(podeAvancar('account', base)).toBe(true);
    });
  });

  describe('passo da mensagem, com template', () => {
    it('precisa do template escolhido', () => {
      expect(podeAvancar('message', { ...base, temTemplate: false })).toBe(false);
      expect(podeAvancar('message', base)).toBe(true);
    });

    it('template de oferta com UM produto não passa', () => {
      // `{{produto_2}}` ficaria vazio e a Meta recusa por contagem.
      const oferta = { ...base, precisaDeProdutosDaOferta: true };

      expect(podeAvancar('message', { ...oferta, produtosEscolhidos: 1 })).toBe(false);
      expect(podeAvancar('message', { ...oferta, produtosEscolhidos: 2 })).toBe(true);
    });

    it('template com cabeçalho de imagem exige a imagem', () => {
      const comImagem = { ...base, precisaDeImagemNoCabecalho: true };

      expect(podeAvancar('message', comImagem)).toBe(false);
      expect(podeAvancar('message', { ...comImagem, temImagem: true })).toBe(true);
    });
  });

  describe('passo da mensagem, texto livre', () => {
    const livre = { ...base, tipo: 'text' as const, temTemplate: false };

    it('texto OU mídia basta', () => {
      expect(podeAvancar('message', { ...livre, texto: 'Promoção hoje!' })).toBe(true);
      expect(podeAvancar('message', { ...livre, temImagem: true })).toBe(true);
    });

    it('os dois vazios não passam — a campanha sairia em branco', () => {
      expect(podeAvancar('message', livre)).toBe(false);
    });

    it('só espaço em branco não conta como texto', () => {
      expect(podeAvancar('message', { ...livre, texto: '   ' })).toBe(false);
    });
  });

  describe('passo dos destinatários', () => {
    it('sem ninguém na lista não avança', () => {
      expect(podeAvancar('recipients', base)).toBe(false);
      expect(podeAvancar('recipients', { ...base, quantidadeDeContatos: 1 })).toBe(true);
    });
  });

  describe('navegação entre passos', () => {
    it('a ordem é conta → mensagem → destinatários → revisão', () => {
      expect(PASSOS.map((p) => p.id)).toEqual(['account', 'message', 'recipients', 'review']);
    });

    it('do último não passa, do primeiro não volta', () => {
      expect(proximoPasso('review')).toBe('review');
      expect(passoAnterior('account')).toBe('account');
    });

    it('anda um de cada vez, para frente e para trás', () => {
      expect(proximoPasso('account')).toBe('message');
      expect(passoAnterior('recipients')).toBe('message');
    });
  });
});
