/**
 * Conta ligada com token recusado pela Meta é um canal MUDO — não pode
 * aparecer como "Funcionando".
 *
 * Em 21/09 a @cesalada estava verde na tela e toda chamada à Meta respondia
 * "token inválido": era resto do login do Facebook, com o token vencido.
 */
import { estadoDoInstagram } from '../estadoDoInstagram';

it('conta boa está funcionando', () => {
  expect(estadoDoInstagram({ isActive: true, precisaReconectar: false })).toBe('funcionando');
});

it('token recusado pela Meta = precisa reconectar', () => {
  expect(estadoDoInstagram({ isActive: true, precisaReconectar: true })).toBe('desconectado');
});

it('conta desligada pelo lojista fica pausada', () => {
  expect(estadoDoInstagram({ isActive: false, precisaReconectar: false })).toBe('pausado');
});
