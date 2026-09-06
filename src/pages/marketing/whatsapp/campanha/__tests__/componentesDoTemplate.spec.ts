/**
 * ESPECIFICAÇÃO — o corpo que vai para a Meta.
 *
 * Estas duas funções montam o payload de um template do WhatsApp. Viviam
 * soltas dentro de uma tela de 1.741 linhas, sem um teste, e são o ponto onde
 * um erro custa uma campanha inteira: template mal montado é recusado pela
 * Meta, e o dono descobre depois de pagar pelo disparo.
 *
 * O CONTRATO COM O BACKEND, conferido no fonte de `server2` antes de escrever
 * esta spec — porque à primeira vista o payload parece errado:
 *
 *   O painel emite `{ type: 'text', variable: 'nome_cliente', text: '' }`.
 *   O `text` vazio NÃO é bug. `campaign_service._build_components` troca
 *   `variable` pelo valor daquele contato e escreve em `text`; depois
 *   `whatsapp_api_service._clean_template_components` REMOVE a chave
 *   `variable`, que é interna do painel, antes de enviar para a Meta.
 *
 * Ou seja: o que sai daqui é um MOLDE, preenchido uma vez por destinatário.
 * Quem mexer nestas funções precisa saber disso — é para isso que a spec
 * existe.
 */
import { componentesDoTemplate, variaveisDoTemplate } from '../componentesDoTemplate';

const template = (components: unknown[]) => ({ components }) as never;

describe('spec: variáveis de um template', () => {
  it('acha as variáveis escritas no corpo', () => {
    const achadas = variaveisDoTemplate(
      template([{ type: 'BODY', text: 'Olá {{nome_cliente}}, {{produto_1}} saiu!' }]),
    );

    expect(achadas.map((v) => v.nome)).toEqual(['nome_cliente', 'produto_1']);
  });

  it('tolera o espaço que a Meta aceita dentro das chaves', () => {
    const achadas = variaveisDoTemplate(template([{ type: 'BODY', text: 'Olá {{ nome }}!' }]));

    expect(achadas.map((v) => v.nome)).toEqual(['nome']);
  });

  it('não repete a mesma variável usada duas vezes', () => {
    const achadas = variaveisDoTemplate(
      template([{ type: 'BODY', text: '{{nome}}, seu pedido {{nome}}' }]),
    );

    expect(achadas).toHaveLength(1);
  });

  it('marca de ONDE cada variável veio — cabeçalho, corpo ou botão', () => {
    // A origem decide em qual componente o parâmetro entra. Errar isso é o
    // template ser recusado.
    const achadas = variaveisDoTemplate(
      template([
        { type: 'HEADER', text: '{{titulo}}' },
        { type: 'BODY', text: '{{corpo}}' },
        { type: 'BUTTONS', text: '{{link}}' },
      ]),
    );

    expect(achadas).toEqual([
      { nome: 'titulo', origem: 'cabecalho' },
      { nome: 'corpo', origem: 'corpo' },
      { nome: 'link', origem: 'botao' },
    ]);
  });

  it('lê também os parâmetros nomeados que a Meta devolve fora do texto', () => {
    const achadas = variaveisDoTemplate(
      template([
        {
          type: 'BODY',
          text: 'sem chaves aqui',
          example: { body_text_named_params: [{ param_name: 'cupom' }] },
        },
      ]),
    );

    expect(achadas.map((v) => v.nome)).toEqual(['cupom']);
  });

  it('template sem componentes não quebra a tela', () => {
    expect(variaveisDoTemplate(undefined)).toEqual([]);
    expect(variaveisDoTemplate(template([]))).toEqual([]);
  });
});

describe('spec: componentes do envio', () => {
  const comNome = [{ nome: 'nome_cliente', origem: 'corpo' as const }];

  it('o parâmetro é um MOLDE: `text` vazio e a chave interna `variable`', () => {
    const [corpo] = componentesDoTemplate(undefined, comNome);

    expect(corpo).toEqual({
      type: 'body',
      parameters: [
        { type: 'text', parameter_name: 'nome_cliente', variable: 'nome_cliente', text: '' },
      ],
    });
  });

  it('variável POSICIONAL não leva `parameter_name`', () => {
    // `{{1}}` é posicional na Meta; mandar `parameter_name: "1"` junto faz a
    // API recusar o envio.
    const [corpo] = componentesDoTemplate(undefined, [{ nome: '1', origem: 'corpo' }]);

    expect((corpo as { parameters: object[] }).parameters[0]).not.toHaveProperty('parameter_name');
  });

  it('cabeçalho de imagem entra ANTES do corpo, com o link', () => {
    // A ordem importa: a Meta lê os componentes na sequência em que chegam.
    const componentes = componentesDoTemplate(
      template([{ type: 'HEADER', format: 'IMAGE' }]),
      comNome,
      'https://exemplo/foto.jpg',
    );

    expect(componentes[0]).toEqual({
      type: 'header',
      parameters: [{ type: 'image', image: { link: 'https://exemplo/foto.jpg' } }],
    });
    expect(componentes[1]).toMatchObject({ type: 'body' });
  });

  it('cabeçalho de imagem SEM imagem escolhida não vira componente', () => {
    // Mandar `header` sem link é recusa na hora.
    const componentes = componentesDoTemplate(
      template([{ type: 'HEADER', format: 'IMAGE' }]),
      comNome,
    );

    expect(componentes.every((c) => (c as { type: string }).type !== 'header')).toBe(true);
  });

  it('imagem escolhida para um template SEM cabeçalho de imagem é ignorada', () => {
    const componentes = componentesDoTemplate(
      template([{ type: 'BODY', text: 'oi' }]),
      comNome,
      'https://exemplo/foto.jpg',
    );

    expect(componentes.every((c) => (c as { type: string }).type !== 'header')).toBe(true);
  });

  it('sem variável de corpo, não manda componente de corpo vazio', () => {
    expect(componentesDoTemplate(undefined, [])).toEqual([]);
  });

  it('variáveis de cabeçalho e botão NÃO entram no corpo', () => {
    const componentes = componentesDoTemplate(undefined, [
      { nome: 'titulo', origem: 'cabecalho' },
      { nome: 'link', origem: 'botao' },
    ]);

    expect(componentes).toEqual([]);
  });
});
