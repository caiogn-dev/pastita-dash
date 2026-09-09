/**
 * O endereço que o entregador lê.
 *
 * `buildCompactAddress` juntava rua + número + bairro + cidade + UF + CEP e
 * DESCARTAVA o complemento — "Recepção da ortolife, espaço life" é exatamente
 * o que faz a entrega chegar. Em 52 dos 115 pedidos de entrega da Cê Saladas o
 * complemento existia e não aparecia.
 *
 * E quando o checkout grava o endereço inteiro dentro de `street` (4 pedidos),
 * a concatenação repetia bairro e cidade três vezes na mesma linha.
 */
import { enderecoDaEntrega } from '../enderecoDaEntrega';

it('mostra o complemento — é o que faz a entrega chegar', () => {
  const e = enderecoDaEntrega({
    street: 'Quadra 501 Sul Avenida NS 1', number: '9',
    complement: 'Recepção da ortolife, espaço life',
    neighborhood: 'Centro', city: 'Palmas', state: 'TO', zip_code: '77016006',
  });
  expect(e.linhas[0]).toBe('Quadra 501 Sul Avenida NS 1, 9');
  expect(e.linhas[1]).toBe('Recepção da ortolife, espaço life');
  expect(e.linhas).toContain('Centro · Palmas/TO · 77016006');
});

it('não repete o que a rua já diz', () => {
  // O caso real do pedido CE-2609098839: o checkout gravou o endereço
  // formatado inteiro dentro de `street`.
  const sujo = 'Quadra 501 Sul Avenida NS 1, 9, Recepção da ortolife - Centro, Palmas, TO';
  const e = enderecoDaEntrega({
    street: sujo, number: '9', complement: 'Recepção da ortolife',
    neighborhood: 'Centro', city: 'Palmas', state: 'TO', zip_code: '77016006',
  });
  const texto = e.linhas.join(' | ');
  expect(texto.match(/Palmas/g) ?? []).toHaveLength(1);
  expect(texto.match(/Centro/g) ?? []).toHaveLength(1);
  expect(texto.match(/Recepção da ortolife/g) ?? []).toHaveLength(1);
});

it('o bairro fica destacado — é por ele que se decide a rota', () => {
  const e = enderecoDaEntrega({ street: 'Rua A', number: '10', neighborhood: 'Plano Diretor Sul', city: 'Palmas' });
  expect(e.bairro).toBe('Plano Diretor Sul');
});

it('monta link do Maps pela coordenada quando existe', () => {
  const e = enderecoDaEntrega({ street: 'Rua A', number: '10', lat: '-10.24', lng: '-48.35' });
  expect(e.mapa).toBe('https://www.google.com/maps/search/?api=1&query=-10.24,-48.35');
});

it('prefere a maps_url que o pedido já traz', () => {
  const e = enderecoDaEntrega({ street: 'Rua A', maps_url: 'https://maps.app.goo.gl/xyz', lat: '-10.2', lng: '-48.3' });
  expect(e.mapa).toBe('https://maps.app.goo.gl/xyz');
});

it('sem coordenada, busca o Maps pelo texto do endereço', () => {
  const e = enderecoDaEntrega({ street: 'Rua A', number: '10', city: 'Palmas' });
  expect(e.mapa).toContain('https://www.google.com/maps/search/?api=1&query=');
  expect(decodeURIComponent(e.mapa!)).toContain('Rua A, 10');
});

it('endereço vazio não vira linha em branco nem link', () => {
  const e = enderecoDaEntrega({});
  expect(e.linhas).toHaveLength(0);
  expect(e.mapa).toBeNull();
  expect(e.vazio).toBe(true);
});

it('cai no texto livre quando só existe raw_address', () => {
  const e = enderecoDaEntrega({ raw_address: 'Rua sem número, perto da praça' });
  expect(e.linhas).toEqual(['Rua sem número, perto da praça']);
});

it('a referência do cliente entra como linha própria', () => {
  const e = enderecoDaEntrega({ street: 'Rua A', number: '1', reference: 'portão azul ao lado da padaria' });
  expect(e.linhas).toContain('portão azul ao lado da padaria');
});

it('limpa a repetição de dentro da própria rua', () => {
  // O checkout gravou o endereço formatado DUAS VEZES dentro de `street`
  // (pedido CE-2609098839). Deduplicar entre campos não bastava: a repetição
  // está dentro de um campo só.
  const e = enderecoDaEntrega({
    street: 'Quadra 501 Sul Avenida NS 1, 9, Recepção da ortolife - Centro, Palmas, TO, 9, Recepção da ortolife - Centro, Palmas, TO',
    number: '9', complement: 'Recepção da ortolife',
    neighborhood: 'Centro', city: 'Palmas', state: 'TO', zip_code: '77016006',
  });
  const texto = e.linhas.join(' | ');
  expect(texto.match(/Recepção da ortolife/g) ?? []).toHaveLength(1);
  expect(texto.match(/Palmas/g) ?? []).toHaveLength(1);
  expect(e.linhas[0]).toBe('Quadra 501 Sul Avenida NS 1, 9, Recepção da ortolife - Centro, Palmas, TO');
});

it('espaço antes da vírgula não engana a comparação', () => {
  // Caso real: a rua traz "ortolife, espaço life" e o complemento
  // "ortolife , espaço life" — o mesmo texto, digitado com um espaço a mais.
  const e = enderecoDaEntrega({
    street: 'Quadra 501 Sul, 9, Recepção da ortolife, espaço life - Centro, Palmas, TO',
    complement: 'Recepção da ortolife , espaço life ',
    city: 'Palmas', state: 'TO', zip_code: '77016006',
  });
  expect(e.linhas.join(' | ').match(/ortolife/g) ?? []).toHaveLength(1);
});
