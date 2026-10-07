/**
 * O caminho do pedido depende de COMO ele chega ao cliente.
 *
 * Bug real (12/ago, pedido CE-2608129257 da Diana): a página de pedido levava
 * TODO pedido por `ready` antes de `out_for_delivery`. Como cada mudança de
 * status dispara uma mensagem no WhatsApp, a cliente recebeu duas com dois
 * segundos de diferença — e a primeira, "pronto para retirada", numa entrega.
 *
 * O kanban já ramificava por `delivery_method`; a página de pedido não. Duas
 * cópias da mesma regra, uma delas errada. Agora é uma função só.
 */
import { proximaAcaoDoPedido } from '../proximaAcao';

const pedido = (status: string, delivery_method?: string) =>
  ({ status, delivery_method } as never);

describe('proximaAcaoDoPedido', () => {
  describe('entrega', () => {
    it('do preparo vai DIRETO para "saiu para entrega" — sem passar por pronto', () => {
      const acao = proximaAcaoDoPedido(pedido('preparing', 'delivery'));

      expect(acao?.status).toBe('out_for_delivery');
      expect(acao?.rotulo).toMatch(/entrega/i);
    });

    it('de "saiu para entrega" fecha em entregue', () => {
      expect(proximaAcaoDoPedido(pedido('out_for_delivery', 'delivery'))?.status)
        .toBe('delivered');
    });

    it('se já estiver em "pronto", segue para a entrega (não trava)', () => {
      // Pedidos antigos ficaram em `ready` por causa do bug; a tela precisa
      // conseguir tocá-los para a frente.
      expect(proximaAcaoDoPedido(pedido('ready', 'delivery'))?.status)
        .toBe('out_for_delivery');
    });
  });

  describe('retirada', () => {
    it('do preparo vai para "pronto p/ retirada"', () => {
      const acao = proximaAcaoDoPedido(pedido('preparing', 'pickup'));

      expect(acao?.status).toBe('ready');
      expect(acao?.rotulo).toMatch(/retirada/i);
    });

    it('de "pronto" fecha em entregue — retirada NUNCA sai para entrega', () => {
      const acao = proximaAcaoDoPedido(pedido('ready', 'pickup'));

      expect(acao?.status).toBe('delivered');
      expect(acao?.rotulo).not.toMatch(/entrega/i);
    });

    it('digital segue o mesmo caminho da retirada', () => {
      expect(proximaAcaoDoPedido(pedido('preparing', 'digital'))?.status).toBe('ready');
    });
  });

  describe('início do fluxo (igual para os dois)', () => {
    it.each(['pending', 'processing'])('%s → confirmar', status => {
      expect(proximaAcaoDoPedido(pedido(status, 'delivery'))?.status).toBe('confirmed');
    });

    it.each(['confirmed', 'paid'])('%s → preparar', status => {
      expect(proximaAcaoDoPedido(pedido(status, 'delivery'))?.status).toBe('preparing');
    });
  });

  describe('fim de linha', () => {
    it.each(['delivered', 'completed', 'cancelled', 'refunded'])('%s não tem próximo passo', status => {
      expect(proximaAcaoDoPedido(pedido(status, 'delivery'))).toBeNull();
    });
  });

  it('sem delivery_method assume entrega — é o padrão da loja', () => {
    expect(proximaAcaoDoPedido(pedido('preparing'))?.status).toBe('out_for_delivery');
  });
});

describe('uma regra só', () => {
  // O Início tinha a própria tabela ("preparing → Despachar → out_for_delivery")
  // e mandava retirada para "Saiu para entrega" (06/10). Cópia diverge: catraca.
  it('nenhuma tela declara a própria tabela de próximo status', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path') as typeof import('path');
    const raiz = path.resolve(__dirname, '../../..');
    const suspeitos: string[] = [];
    const varrer = (dir: string) => {
      for (const nome of fs.readdirSync(dir)) {
        const caminho = path.join(dir, nome);
        if (nome === '__tests__' || nome === 'node_modules') continue;
        if (fs.statSync(caminho).isDirectory()) { varrer(caminho); continue; }
        if (!/\.tsx?$/.test(nome)) continue;
        const texto = fs.readFileSync(caminho, 'utf8');
        if (/preparing:\s*\{[^}]*next:\s*'out_for_delivery'/.test(texto)) suspeitos.push(path.relative(raiz, caminho));
      }
    };
    varrer(raiz);
    expect(suspeitos).toEqual([]);
  });
});
