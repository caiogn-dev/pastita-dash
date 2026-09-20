/**
 * O CSV é o que sai do painel e entra na planilha do contador.
 *
 * Exportação quebra sempre no mesmo lugar: um cliente chamado "Silva, Maria"
 * ou um endereço com ponto e vírgula desloca todas as colunas seguintes, e o
 * arquivo parece certo até alguém somar a coluna errada.
 */
import { pedidosParaCsv } from '../exportarPedidos';

const pedido = (over: Record<string, unknown> = {}) => ({
  id: '1',
  order_number: 'CE-001',
  created_at: '2026-08-08T14:30:00-03:00',
  customer_name: 'Maria',
  customer_phone: '63999990000',
  status: 'delivered',
  payment_status: 'paid',
  payment_method: 'pix',
  total: 45.9,
  discount: 0,
  delivery_fee: 5,
  items: [{ id: 'a' }],
  ...over,
}) as never;

describe('pedidosParaCsv', () => {
  it('primeira linha é o cabeçalho em português', () => {
    // Quem abre o arquivo é o contador, não o programador.
    const linhas = pedidosParaCsv([pedido()]).split('\n');
    expect(linhas[0]).toMatch(/Pedido/);
    expect(linhas[0]).toMatch(/Cliente/);
    expect(linhas[0]).not.toMatch(/order_number|customer_name/);
  });

  it('nome com vírgula não desloca as colunas', () => {
    const csv = pedidosParaCsv([pedido({ customer_name: 'Silva, Maria' })]);
    expect(csv).toContain('"Silva, Maria"');
    // O cabeçalho tem N colunas; a linha de dados precisa ter as mesmas N.
    const [cab, dados] = csv.split('\n');
    const contarColunas = (l: string) => l.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).length;
    expect(contarColunas(dados)).toBe(contarColunas(cab));
  });

  it('aspas dentro do texto são escapadas, não removidas', () => {
    const csv = pedidosParaCsv([pedido({ customer_name: 'Ana "Nana"' })]);
    expect(csv).toContain('"Ana ""Nana"""');
  });

  it('valores saem com vírgula decimal — a planilha aqui é pt-BR', () => {
    // "45.90" numa planilha brasileira vira quarenta e cinco mil e noventa.
    const csv = pedidosParaCsv([pedido({ total: 45.9 })]);
    expect(csv).toContain('45,90');
  });

  it('status vem traduzido', () => {
    const csv = pedidosParaCsv([pedido({ status: 'cancelled' })]);
    expect(csv).toContain('Cancelado');
    expect(csv).not.toContain('cancelled');
  });

  it('lista vazia devolve só o cabeçalho, não string vazia', () => {
    // Arquivo de 0 byte parece download quebrado; com cabeçalho, a planilha
    // abre e mostra que o recorte não tinha pedido.
    const csv = pedidosParaCsv([]);
    expect(csv.split('\n')).toHaveLength(1);
    expect(csv).toMatch(/Pedido/);
  });

  it('campo ausente vira vazio, nunca "undefined"', () => {
    const csv = pedidosParaCsv([pedido({ customer_phone: undefined })]);
    expect(csv).not.toMatch(/undefined/);
  });

  // Segurança — CSV/formula injection (OWASP). O nome/telefone vêm do cliente
  // no storefront: um valor de TEXTO começando com = + - @ TAB CR é executado
  // como fórmula pelo Excel/Sheets ao abrir o arquivo na máquina do lojista.
  it('neutraliza nome que começa com "=" (formula injection)', () => {
    const csv = pedidosParaCsv([pedido({ customer_name: '=1+2' })]);
    // O gatilho vira texto: prefixo "'". Nenhuma célula pode começar com "=".
    expect(csv).toContain("'=1+2");
    expect(csv).not.toMatch(/(^|,)=1\+2/);
  });

  it('neutraliza =HYPERLINK, mantendo o texto legível e aspeado', () => {
    const csv = pedidosParaCsv([
      pedido({ customer_name: '=HYPERLINK("http://evil","x")' }),
    ]);
    expect(csv).toContain("'=HYPERLINK");
  });

  it('neutraliza telefone internacional começando com "+"', () => {
    const csv = pedidosParaCsv([pedido({ customer_phone: '+5563999990000' })]);
    expect(csv).toContain("'+5563999990000");
  });

  it('neutraliza gatilhos "@" e "-" em texto controlado pelo cliente', () => {
    const csvArroba = pedidosParaCsv([pedido({ customer_name: '@cmd' })]);
    expect(csvArroba).toContain("'@cmd");
    const csvHifen = pedidosParaCsv([pedido({ source: '-2+3' })]);
    expect(csvHifen).toContain("'-2+3");
  });

  it('NÃO prefixa dinheiro negativo — número precisa seguir número no Excel', () => {
    // O "-" da moeda produzida por nós não pode virar texto: quebraria a soma
    // do contador. O gatilho de fórmula vale só para o texto do cliente.
    const csv = pedidosParaCsv([pedido({ total: -5, delivery_fee: -3 })]);
    expect(csv).toContain('"-5,00"');
    expect(csv).not.toContain("'-5,00");
    expect(csv).not.toContain("'-3,00");
  });

  it('não altera nome comum (sem gatilho)', () => {
    const csv = pedidosParaCsv([pedido({ customer_name: 'Maria' })]);
    expect(csv).not.toContain("'Maria");
  });
});
