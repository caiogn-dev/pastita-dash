/**
 * A loja precisa ler a regra em uma frase antes de publicar — e ser barrada
 * quando a promoção não pode funcionar.
 */
import { frasePublica, problemasDaPromocao, idDaPublicacao } from '../promocaoDeComentario';

const base = {
  nome: 'Cupom',
  media_id: '123',
  mensagem_dm: 'Seu cupom: SET10',
  palavra_chave: 'EU QUERO',
  exige_marcar_amigos: 0,
  exige_seguir: false,
};

it('descreve a regra do jeito que o cliente vai ler', () => {
  expect(frasePublica(base)).toBe('Comente "EU QUERO" para receber no direct.');
});

it('junta marcar amigos e seguir na mesma frase', () => {
  expect(frasePublica({ ...base, exige_marcar_amigos: 2, exige_seguir: true }))
    .toBe('Comente "EU QUERO", marque 2 amigos e siga a loja para receber no direct.');
});

it('sem palavra-chave, qualquer comentário vale', () => {
  expect(frasePublica({ ...base, palavra_chave: '' }))
    .toBe('Comente na publicação para receber no direct.');
});

it('promoção sem mensagem no direct não pode ir ao ar', () => {
  expect(problemasDaPromocao({ ...base, mensagem_dm: '  ' }))
    .toContain('Escreva a mensagem que vai chegar no direct.');
});

it('promoção sem publicação não pode ir ao ar', () => {
  expect(problemasDaPromocao({ ...base, media_id: '' }))
    .toContain('Escolha a publicação em que a promoção vale.');
});

it('promoção completa não tem impedimento', () => {
  expect(problemasDaPromocao(base)).toEqual([]);
});

it('aceita o link da publicação no lugar do código', () => {
  expect(idDaPublicacao('https://www.instagram.com/p/C1x2Y3z/')).toBe('C1x2Y3z');
  expect(idDaPublicacao('  17912345678901234  ')).toBe('17912345678901234');
});
