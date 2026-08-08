/**
 * Zonas de preço fixo — o recurso que existia no código e nunca foi ligado.
 *
 * `metadata.fixed_price_zones` funciona no backend desde sempre e tem testes
 * lá. Em 08/ago/2026 nenhuma das lojas tinha o campo preenchido: a única forma
 * de configurar era editar JSON direto no banco. Recurso que só o programador
 * consegue ligar é recurso desligado.
 *
 * Aqui mora a tradução entre o formulário e o formato que o backend espera, e
 * a validação — que é onde isso vira frete errado cobrado do cliente real.
 */
import { zonaParaMetadata, validarZona, zonasDoMetadata } from '../zonasDePrecoFixo';

describe('validarZona', () => {
  it('zona sem nome não salva', () => {
    expect(validarZona({ nome: '', taxa: '10' })).toContain('nome');
  });

  it('taxa negativa não salva', () => {
    // Frete negativo vira desconto silencioso no total do pedido.
    expect(validarZona({ nome: 'Polinésia', taxa: '-5' })).toBeTruthy();
  });

  it('taxa vazia não salva quando o modo é preço fixo', () => {
    // Sem taxa a zona casa o endereço e devolve `fee` indefinido: o cliente
    // fecha o pedido com frete R$ 0,00.
    expect(validarZona({ nome: 'Polinésia', taxa: '' })).toBeTruthy();
  });

  it('no modo acréscimo a taxa fixa não é obrigatória', () => {
    expect(validarZona({ nome: 'Alphaville', taxa: '', modo: 'acrescimo', acrescimo: '5' })).toBeNull();
  });

  it('zona válida passa', () => {
    expect(validarZona({ nome: 'Polinésia', taxa: '15' })).toBeNull();
  });

  it('zona com só espaços no nome não passa', () => {
    expect(validarZona({ nome: '   ', taxa: '15' })).toBeTruthy();
  });
});

describe('zonaParaMetadata', () => {
  it('grava fee como número, não string', () => {
    // O backend compara e soma esse valor. String faz "15" + 3 virar "153".
    const z = zonaParaMetadata({ nome: 'Polinésia', taxa: '15' });
    expect(z.fee).toBe(15);
    expect(typeof z.fee).toBe('number');
  });

  it('aceita vírgula decimal — é como se digita aqui', () => {
    expect(zonaParaMetadata({ nome: 'X', taxa: '12,50' }).fee).toBe(12.5);
  });

  it('o nome entra como palavra-chave automaticamente', () => {
    // O backend casa o endereço reverso contra `keywords` + `name`. Quem
    // cadastra "Polinésia" espera que "Polinésia" seja procurado.
    const z = zonaParaMetadata({ nome: 'Polinésia', taxa: '15' });
    expect(z.name).toBe('Polinésia');
  });

  it('palavras-chave extras viram lista, separadas por vírgula', () => {
    const z = zonaParaMetadata({ nome: 'Polinésia', taxa: '15', palavras: 'Residencial Polinesia, Cond. Polinésia' });
    expect(z.keywords).toEqual(['Residencial Polinesia', 'Cond. Polinésia']);
  });

  it('palavra-chave vazia não entra na lista', () => {
    // "a, , b" digitado com vírgula sobrando casaria com QUALQUER endereço:
    // string vazia está contida em tudo.
    const z = zonaParaMetadata({ nome: 'X', taxa: '1', palavras: 'a, , b,' });
    expect(z.keywords).toEqual(['a', 'b']);
  });

  it('modo acréscimo grava surcharge_on_km, não fee', () => {
    const z = zonaParaMetadata({ nome: 'Alphaville', taxa: '', modo: 'acrescimo', acrescimo: '5' });
    expect(z.surcharge_on_km).toBe(true);
    expect(z.surcharge).toBe(5);
    expect(z.fee).toBeUndefined();
  });
});

describe('zonasDoMetadata', () => {
  it('lê o que o backend gravou de volta para o formulário', () => {
    const zonas = zonasDoMetadata([
      { name: 'Polinésia', fee: 15, keywords: ['Cond. Polinesia'] },
      { name: 'Alphaville', surcharge_on_km: true, surcharge: 5 },
    ]);
    expect(zonas[0]).toMatchObject({ nome: 'Polinésia', taxa: '15', palavras: 'Cond. Polinesia' });
    expect(zonas[1]).toMatchObject({ nome: 'Alphaville', modo: 'acrescimo', acrescimo: '5' });
  });

  it('metadata ausente ou torto não quebra a tela', () => {
    expect(zonasDoMetadata(undefined)).toEqual([]);
    expect(zonasDoMetadata('nada disso' as never)).toEqual([]);
  });
});
