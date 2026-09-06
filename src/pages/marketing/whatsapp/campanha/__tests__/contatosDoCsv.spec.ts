/**
 * ESPECIFICAÇÃO — a lista colada vira destinatários.
 *
 * Esta é a porta por onde entra a lista de quem vai receber a campanha. Um
 * erro aqui custa DINHEIRO por linha: cada destinatário a mais é uma mensagem
 * de template paga, e a partir de 01/10 até a mensagem de serviço passa a ser
 * cobrada.
 *
 * O BUG QUE ESTA SPEC CORRIGE: a versão anterior removia duplicata só contra a
 * lista JÁ montada, nunca contra o próprio CSV. Colar uma planilha com o mesmo
 * número em duas linhas — coisa comum em export de sistema de pedido, onde o
 * cliente aparece uma vez por compra — adicionava o contato duas vezes, e a
 * pessoa recebia a promoção duplicada. O contador ainda dizia "2 contatos
 * importados", então nada na tela denunciava.
 */
import { contatosDoCsv } from '../contatosDoCsv';

describe('spec: contatos colados', () => {
  it('lê telefone e nome separados por vírgula', () => {
    const { contatos } = contatosDoCsv('11999998888,Ana', []);

    expect(contatos).toEqual([{ phone: '11999998888', name: 'Ana' }]);
  });

  it('aceita ponto e vírgula e tabulação — é o que o Excel brasileiro exporta', () => {
    expect(contatosDoCsv('11999998888;Ana', []).contatos).toHaveLength(1);
    expect(contatosDoCsv('11999998888\tAna', []).contatos).toHaveLength(1);
  });

  it('limpa a máscara do telefone', () => {
    const { contatos } = contatosDoCsv('(11) 99999-8888, Ana', []);

    expect(contatos[0].phone).toBe('11999998888');
  });

  it('pula o cabeçalho quando a planilha tem um', () => {
    const { contatos } = contatosDoCsv('telefone,nome\n11999998888,Ana', []);

    expect(contatos).toHaveLength(1);
    expect(contatos[0].name).toBe('Ana');
  });

  it('NÃO repete o mesmo número que aparece duas vezes no arquivo', () => {
    // Era o bug: export de sistema de pedido traz o cliente uma vez por
    // compra. A pessoa recebia a promoção duas vezes e o dono pagava duas.
    const { contatos, repetidos } = contatosDoCsv(
      '11999998888,Ana\n11999998888,Ana Maria\n11988887777,Bia',
      [],
    );

    expect(contatos.map((c) => c.phone)).toEqual(['11999998888', '11988887777']);
    expect(repetidos).toBe(1);
  });

  it('a primeira ocorrência é a que fica, com o nome dela', () => {
    const { contatos } = contatosDoCsv('11999998888,Ana\n11999998888,Ana Maria', []);

    expect(contatos[0].name).toBe('Ana');
  });

  it('não repete quem já estava na lista', () => {
    const { contatos, repetidos } = contatosDoCsv('11999998888,Ana\n11988887777,Bia', [
      { phone: '11999998888' },
    ]);

    expect(contatos.map((c) => c.phone)).toEqual(['11988887777']);
    expect(repetidos).toBe(1);
  });

  it('descarta linha sem telefone utilizável', () => {
    const { contatos, invalidos } = contatosDoCsv('abc,Ana\n999,Bia\n11999998888,Cida', []);

    expect(contatos.map((c) => c.name)).toEqual(['Cida']);
    expect(invalidos).toBe(2);
  });

  it('nome é opcional', () => {
    const { contatos } = contatosDoCsv('11999998888', []);

    expect(contatos).toEqual([{ phone: '11999998888', name: '' }]);
  });

  it('linha em branco no meio não conta como nada', () => {
    const { contatos, invalidos } = contatosDoCsv('11999998888,Ana\n\n\n11988887777,Bia', []);

    expect(contatos).toHaveLength(2);
    expect(invalidos).toBe(0);
  });

  it('texto vazio devolve lista vazia sem estourar', () => {
    expect(contatosDoCsv('', []).contatos).toEqual([]);
    expect(contatosDoCsv('   \n  ', []).contatos).toEqual([]);
  });
});
