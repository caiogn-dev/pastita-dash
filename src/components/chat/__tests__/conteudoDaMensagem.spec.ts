/**
 * ESPECIFICAÇÃO — ler o conteúdo de uma mensagem do WhatsApp.
 *
 * O `content` de uma mensagem chega em três formas diferentes, e o painel
 * precisa aguentar as três sem quebrar a conversa inteira:
 *
 *  - string com JSON dentro (o mais comum: o backend guarda serializado);
 *  - objeto já pronto;
 *  - string de texto puro, que NÃO é JSON.
 *
 * A terceira é a que derruba: `JSON.parse('bom dia')` estoura. O código tinha
 * o mesmo `try { JSON.parse } catch { {} }` copiado QUATRO vezes, cada cópia
 * com um detalhe diferente — uma devolvia `{}`, outra `content || {}` — e
 * depois lia tudo com `as any`, que apaga a checagem justamente onde o formato
 * vem de fora e pode mudar sem aviso.
 *
 * Aqui a leitura é uma só, e ela devolve tipo de verdade.
 */
import { comoObjeto, listaDe, numeroDe, textoDe } from '../conteudoDaMensagem';

describe('spec: conteúdo de mensagem', () => {
  describe('como objeto', () => {
    it('string com JSON vira objeto', () => {
      expect(comoObjeto('{"emoji":"🔥"}')).toEqual({ emoji: '🔥' });
    });

    it('objeto passa direto', () => {
      expect(comoObjeto({ emoji: '🔥' })).toEqual({ emoji: '🔥' });
    });

    it('texto puro NÃO estoura — vira objeto vazio', () => {
      // `JSON.parse('bom dia')` lança. Sem isto, uma mensagem de texto comum
      // derrubava a renderização da conversa inteira.
      expect(comoObjeto('bom dia')).toEqual({});
    });

    it('nulo, indefinido e número viram objeto vazio', () => {
      expect(comoObjeto(null)).toEqual({});
      expect(comoObjeto(undefined)).toEqual({});
      expect(comoObjeto(42)).toEqual({});
    });

    it('JSON que é lista, e não objeto, também vira vazio', () => {
      // `comoObjeto` promete OBJETO; devolver um array faria `.emoji` virar
      // `undefined` silenciosamente lá na frente.
      expect(comoObjeto('[1,2,3]')).toEqual({});
    });
  });

  describe('ler um texto', () => {
    it('devolve o primeiro campo que existir, na ordem pedida', () => {
      // O WhatsApp manda `text` em uns eventos e `title` em outros.
      expect(textoDe({ title: 'Confirmar' }, 'text', 'title')).toBe('Confirmar');
      expect(textoDe({ text: 'Sim', title: 'Confirmar' }, 'text', 'title')).toBe('Sim');
    });

    it('campo que não é texto não conta', () => {
      expect(textoDe({ text: 42 }, 'text')).toBeUndefined();
    });

    it('texto vazio não conta como resposta', () => {
      // Senão o botão apareceria com o rótulo em branco.
      expect(textoDe({ text: '', title: 'Confirmar' }, 'text', 'title')).toBe('Confirmar');
    });

    it('nenhum dos campos existe', () => {
      expect(textoDe({}, 'text', 'title')).toBeUndefined();
    });
  });

  describe('ler um número', () => {
    it('número passa direto', () => {
      expect(numeroDe({ latitude: -10.24 }, 'latitude')).toBe(-10.24);
    });

    it('string numérica também — o WhatsApp manda das duas formas', () => {
      expect(numeroDe({ latitude: '-10.24' }, 'latitude')).toBe(-10.24);
    });

    it('texto que não é número vira `undefined`, NÃO NaN', () => {
      // `NaN.toFixed(6)` imprime "NaN" na tela, no lugar da latitude.
      expect(numeroDe({ latitude: 'perto do centro' }, 'latitude')).toBeUndefined();
      expect(numeroDe({}, 'latitude')).toBeUndefined();
    });

    it('zero é número válido — é o Equador, não "sem valor"', () => {
      expect(numeroDe({ latitude: 0 }, 'latitude')).toBe(0);
    });
  });

  describe('ler uma lista', () => {
    it('devolve a lista quando ela é lista', () => {
      expect(listaDe({ product_items: [1, 2] }, 'product_items')).toHaveLength(2);
    });

    it('campo ausente ou de outro tipo vira lista vazia', () => {
      // Assim quem chama pode sempre ler `.length` sem `?.`.
      expect(listaDe({}, 'product_items')).toEqual([]);
      expect(listaDe({ product_items: 'dois' }, 'product_items')).toEqual([]);
    });
  });
});
