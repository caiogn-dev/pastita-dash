/**
 * O fluxo em passos: escolher o post, escrever a regra, escrever o prêmio.
 * Cada passo só libera o seguinte quando tem o que precisa — é isso que
 * substitui o formulário de dez campos.
 */
import { PASSOS, passoLiberado, primeiroPassoIncompleto } from '../passosDaPromocao';

const vazio = { media_id: '', palavra_chave: '', mensagem_dm: '', nome: '' };

it('sem post escolhido, o passo da regra não abre', () => {
  expect(passoLiberado('regra', vazio)).toBe(false);
  expect(passoLiberado('publicacao', vazio)).toBe(true);
});

it('com post escolhido, a regra abre e o prêmio ainda não', () => {
  const comPost = { ...vazio, media_id: '123' };
  expect(passoLiberado('regra', comPost)).toBe(true);
  expect(passoLiberado('premio', comPost)).toBe(true);
});

it('o primeiro passo incompleto é para onde a tela leva', () => {
  expect(primeiroPassoIncompleto(vazio)).toBe('publicacao');
  expect(primeiroPassoIncompleto({ ...vazio, media_id: '1' })).toBe('premio');
  expect(primeiroPassoIncompleto({ ...vazio, media_id: '1', mensagem_dm: 'oi' })).toBe(null);
});

it('são três passos, nessa ordem', () => {
  expect(PASSOS.map((p) => p.id)).toEqual(['publicacao', 'regra', 'premio']);
});
