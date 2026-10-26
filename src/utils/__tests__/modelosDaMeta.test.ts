/**
 * Modelo da Meta dito em português (26/10). O chat mostrava
 * "APPROVED · pt_BR · MARKETING" cru.
 */
import {
  categoriaDoModelo,
  estadoDoModelo,
  idiomaDoModelo,
  resumoDoModelo,
  textoDoModelo,
} from '../modelosDaMeta';

it('situação: aprovado, em análise, recusado', () => {
  expect(estadoDoModelo('approved')).toEqual({ rotulo: 'Aprovado', tone: 'success' });
  expect(estadoDoModelo('APPROVED').rotulo).toBe('Aprovado');
  expect(estadoDoModelo('pending')).toEqual({ rotulo: 'Em análise', tone: 'warning' });
  expect(estadoDoModelo('in_appeal').rotulo).toBe('Em análise');
  expect(estadoDoModelo('rejected')).toEqual({ rotulo: 'Recusado', tone: 'danger' });
  expect(estadoDoModelo('paused').rotulo).toBe('Pausado');
});

it('idioma por extenso', () => {
  expect(idiomaDoModelo('pt_BR')).toBe('Português');
  expect(idiomaDoModelo('en_US')).toBe('Inglês');
  expect(idiomaDoModelo('es')).toBe('Espanhol');
  expect(idiomaDoModelo('')).toBe('Português');
});

it('categoria sem jargão', () => {
  expect(categoriaDoModelo('MARKETING')).toBe('Promoção');
  expect(categoriaDoModelo('utility')).toBe('Aviso');
  expect(categoriaDoModelo('authentication')).toBe('Código de acesso');
});

it('resumo numa linha, sem código cru', () => {
  expect(resumoDoModelo({ status: 'APPROVED', language: 'pt_BR', category: 'MARKETING' }))
    .toBe('Aprovado · Português · Promoção');
});

it('texto do corpo do modelo', () => {
  expect(textoDoModelo([{ type: 'HEADER', text: 'x' }, { type: 'BODY', text: 'Oi {{1}}' }])).toBe('Oi {{1}}');
  expect(textoDoModelo(undefined)).toBe('');
});
