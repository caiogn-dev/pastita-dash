import {
  variaveisDoEvento,
  exemploDeVariaveis,
  previaDaMensagem,
} from '../variaveisDeMensagem';

describe('variaveisDoEvento', () => {
  it('fora do horário oferece o link do cardápio e não oferece PIX', () => {
    const chaves = variaveisDoEvento('out_of_hours').map((v) => v.key);
    expect(chaves).toEqual(expect.arrayContaining(['website_url', 'menu_url', 'customer_name']));
    expect(chaves).not.toContain('pix_code');
  });

  it('aviso de pedido oferece o que o aviso de status preenche', () => {
    const chaves = variaveisDoEvento('order_out_for_delivery').map((v) => v.key);
    expect(chaves).toEqual(expect.arrayContaining(['order_number', 'primeiro_nome', 'endereco', 'tempo']));
  });

  it('lembrete de PIX oferece código e valor', () => {
    const chaves = variaveisDoEvento('pix_reminder').map((v) => v.key);
    expect(chaves).toEqual(expect.arrayContaining(['pix_code', 'amount', 'order_number']));
  });
});

describe('previaDaMensagem', () => {
  const exemplo = exemploDeVariaveis({
    company_name: 'Cê Saladas',
    link_do_cardapio: 'https://cardapidex.com.br/ce-saladas',
  });

  it('troca {website_url} pelo link real da loja', () => {
    const { texto } = previaDaMensagem('Peça aqui: {website_url}', 'out_of_hours', exemplo);
    expect(texto).toBe('Peça aqui: https://cardapidex.com.br/ce-saladas');
  });

  it('aponta variável que esse tipo de mensagem não preenche', () => {
    const { desconhecidas } = previaDaMensagem('Código {pix_code} {site}', 'out_of_hours', exemplo);
    expect(desconhecidas).toEqual(['pix_code', 'site']);
  });

  it('sem link cadastrado cai no cardápio do Cardapidex pela loja', () => {
    const semLink = exemploDeVariaveis({ company_name: 'Agrião', store_slug: 'agriao' });
    expect(semLink.website_url).toBe('https://cardapidex.com.br/agriao');
  });
});
