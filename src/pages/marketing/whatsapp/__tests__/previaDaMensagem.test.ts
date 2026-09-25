/**
 * A prévia mostra o que o CLIENTE vai ler, não o que o dono digitou.
 *
 * `{{nome_cliente}}` na tela é jargão; "Oi, Maria" é a mensagem. Sem a troca
 * o dono não percebe a vírgula sobrando, o preço sem "R$" nem a variável que
 * o painel não preenche — e descobre depois de pagar o disparo.
 */
import { describe, expect, it } from '@jest/globals';

import {
  exemploDeCliente,
  preencherVariaveis,
  previaDaMensagem,
  rotuloDoEnvio,
  tempoDeEnvio,
} from '../campanha/previaDaMensagem';
import type { MessageTemplate } from '../../../../types';

const template = (components: unknown[]): MessageTemplate => ({
  id: 't1',
  name: 'oferta_do_dia',
  language: 'pt_BR',
  category: 'MARKETING',
  status: 'approved',
  account: 'acc-1',
  components,
});

describe('preencherVariaveis', () => {
  it('troca as variáveis conhecidas, com ou sem espaço dentro das chaves', () => {
    expect(preencherVariaveis('Oi, {{nome}}! {{ produto_1 }} hoje', { nome: 'Ana', produto_1: 'Salada' }))
      .toEqual({ texto: 'Oi, Ana! Salada hoje', semValor: [] });
  });

  it('variável sem valor fica visível e é listada — some calada seria pior', () => {
    expect(preencherVariaveis('Cupom {{1}} e {{1}} de novo', {}))
      .toEqual({ texto: 'Cupom {{1}} e {{1}} de novo', semValor: ['1'] });
  });

  it('valor vazio conta como sem valor (a Meta recusa variável vazia)', () => {
    expect(preencherVariaveis('{{produto_2}}', { produto_2: '' }).semValor).toEqual(['produto_2']);
  });
});

describe('exemploDeCliente', () => {
  it('usa o nome do primeiro destinatário, como o envio usa', () => {
    expect(exemploDeCliente([{ phone: '1', name: '  Maria Souza ' }])).toBe('Maria Souza');
  });

  it('primeiro destinatário sem nome recebe "Cliente" — é o que o envio manda', () => {
    expect(exemploDeCliente([{ phone: '1', name: '' }, { phone: '2', name: 'Ana' }])).toBe('Cliente');
  });

  it('sem destinatário ainda, um nome de exemplo', () => {
    expect(exemploDeCliente([])).toBe('Maria');
  });
});

describe('previaDaMensagem', () => {
  it('texto livre: troca {{nome}} e {{nome_cliente}}', () => {
    const previa = previaDaMensagem({
      tipo: 'text',
      texto: 'Oi, {{nome}}. Tudo bem, {{nome_cliente}}?',
      valores: { nome_cliente: 'Ana' },
    });
    expect(previa.corpo).toBe('Oi, Ana. Tudo bem, Ana?');
    expect(previa.botoes).toEqual([]);
  });

  it('template: corpo, cabeçalho, rodapé e botões saem dos componentes da Meta', () => {
    const previa = previaDaMensagem({
      tipo: 'template',
      texto: '',
      template: template([
        { type: 'HEADER', format: 'TEXT', text: 'Oferta de hoje' },
        { type: 'BODY', text: 'Oi, {{nome_cliente}}! {{produto_1}} por {{preco_1}}.' },
        { type: 'FOOTER', text: 'Responda SAIR para não receber' },
        { type: 'BUTTONS', buttons: [{ type: 'URL', text: 'Pedir agora' }] },
      ]),
      valores: { nome_cliente: 'Ana', produto_1: 'Salada Caesar', preco_1: 'R$ 29,90' },
    });
    expect(previa.cabecalho).toBe('Oferta de hoje');
    expect(previa.corpo).toBe('Oi, Ana! Salada Caesar por R$ 29,90.');
    expect(previa.rodape).toBe('Responda SAIR para não receber');
    expect(previa.botoes).toEqual(['Pedir agora']);
    expect(previa.semValor).toEqual([]);
  });

  it('template com cabeçalho de imagem avisa que espera imagem', () => {
    const previa = previaDaMensagem({
      tipo: 'template',
      texto: '',
      template: template([{ type: 'HEADER', format: 'IMAGE' }, { type: 'BODY', text: 'Oi' }]),
      valores: {},
    });
    expect(previa.cabecalhoDeImagem).toBe(true);
  });

  it('template ainda não escolhido: corpo vazio, sem quebrar', () => {
    expect(previaDaMensagem({ tipo: 'template', texto: '', valores: {} }).corpo).toBe('');
  });
});

describe('rotuloDoEnvio', () => {
  it('diz o que o botão faz, com o número real', () => {
    expect(rotuloDoEnvio(312)).toBe('Enviar para 312 clientes');
    expect(rotuloDoEnvio(1)).toBe('Enviar para 1 cliente');
    expect(rotuloDoEnvio(1500)).toBe('Enviar para 1.500 clientes');
  });

  it('sem ninguém, não promete envio', () => {
    expect(rotuloDoEnvio(0)).toBe('Enviar');
  });
});

describe('tempoDeEnvio', () => {
  it('arredonda para cima, em minutos', () => {
    expect(tempoDeEnvio(312, 60)).toBe('cerca de 6 min');
    expect(tempoDeEnvio(1, 60)).toBe('menos de 1 min');
    expect(tempoDeEnvio(0, 60)).toBe('');
  });
});
