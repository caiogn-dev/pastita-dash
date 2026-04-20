/**
 * Order Print Component
 * Formats order data for thermal printers (80mm width - Epson TM-T20)
 * Optimized for thermal printing with high contrast
 */
import { useRef, useCallback } from 'react';
import { Order } from '../../types';

// Type alias for backwards compatibility
type Pedido = Order;

// Hook for printing orders
export const useOrderPrint = () => {
  const printFrameRef = useRef<HTMLIFrameElement | null>(null);

  const printOrder = useCallback((pedido: Pedido, options?: {
    storeName?: string;
    storePhone?: string;
    storeAddress?: string;
  }) => {
    // Create a hidden iframe for printing
    if (!printFrameRef.current) {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.top = '-9999px';
      iframe.style.left = '-9999px';
      iframe.style.width = '76mm';
      iframe.style.height = '0';
      document.body.appendChild(iframe);
      printFrameRef.current = iframe;
    }

    const iframe = printFrameRef.current;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    
    if (!doc) {
      console.error('Could not access iframe document');
      return;
    }

    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    const formatMoney = (value: number | string) => {
      const num = typeof value === 'string' ? parseFloat(value) : value;
      return `R$ ${num.toFixed(2).replace('.', ',')}`;
    };

    const formatAddress = () => {
      const legacyAddress = (pedido as unknown as { endereco_entrega?: unknown }).endereco_entrega;
      const addr = legacyAddress || pedido.delivery_address;
      if (!addr || typeof addr !== 'object') return '';
      
      const addrAny = addr as unknown as Record<string, string>;
      const parts = [];
      if (addrAny.rua || addrAny.street) parts.push(addrAny.rua || addrAny.street);
      if (addrAny.numero || addrAny.number) parts.push(`nº ${addrAny.numero || addrAny.number}`);
      if (addrAny.complemento || addrAny.complement) parts.push(addrAny.complemento || addrAny.complement);
      if (addrAny.bairro || addrAny.neighborhood) parts.push(addrAny.bairro || addrAny.neighborhood);
      
      return parts.join(', ') || addrAny.raw_address || '';
    };

    const getDeliveryMethod = () => {
      const pedidoAny = pedido as unknown as Record<string, unknown>;
      const method = (pedidoAny.delivery_method as string) || 'delivery';
      return method === 'pickup' ? 'RETIRADA' : 'ENTREGA';
    };

    const getPaymentMethod = () => {
      const pedidoAny = pedido as unknown as Record<string, unknown>;
      const method = (pedidoAny.payment_method as string) || 'pix';
      const methods: Record<string, string> = {
        pix: 'PIX',
        credit_card: 'CREDITO',
        debit_card: 'DEBITO',
        cash: 'DINHEIRO',
        card: 'CARTAO',
        mercadopago: 'MERCADO PAGO',
      };
      return methods[method] || method.toUpperCase();
    };

    const getPaymentStatus = () => {
      const status = pedido.payment_status || 'pending';
      const statuses: Record<string, string> = {
        pending: 'AGUARDANDO',
        paid: 'PAGO',
        failed: 'FALHOU',
        refunded: 'REEMBOLSADO',
      };
      return statuses[status] || status.toUpperCase();
    };

    const subtotal = Number(pedido.subtotal || pedido.total || 0);
    const deliveryFee = Number(pedido.delivery_fee || (pedido as unknown as { taxa_entrega?: number | string }).taxa_entrega || 0);
    const discount = Number(pedido.discount || (pedido as unknown as { desconto?: number | string }).desconto || 0);
    const total = Number(pedido.total || 0);

    const storeName = options?.storeName || (pedido as unknown as { store_name?: string }).store_name || 'LOJA';
    const storePhone = options?.storePhone || '';
    const storeAddress = options?.storeAddress || '';

    // Build items HTML
    const itemsHtml = pedido.items?.map((item) => {
      const itemAny = item as unknown as Record<string, unknown>;
      const variantName = itemAny.variant_name as string | undefined;
      const itemNotes = itemAny.notes as string | undefined;
      const itemTotal = item.total_price || (item.quantity * Number(item.unit_price));
      return `
      <tr>
        <td class="item-qty">${item.quantity}x</td>
        <td class="item-name">
          ${item.product_name}
          ${variantName ? `<br><small>${variantName}</small>` : ''}
          ${itemNotes ? `<br><small class="item-notes">Obs.: ${itemNotes}</small>` : ''}
        </td>
        <td class="item-price">${formatMoney(itemTotal)}</td>
      </tr>
    `;
    }).join('') || '';

    // Build notes HTML
    const pedidoAny = pedido as unknown as Record<string, unknown>;
    const notes = (pedidoAny.customer_notes as string)
      || (pedidoAny.observacoes as string)
      || (pedidoAny.delivery_notes as string);
    const notesHtml = notes ? `
      <div class="notes-section">
        <div class="notes-title">OBSERVACOES</div>
        <div class="notes-text">${notes}</div>
      </div>
    ` : '';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Pedido #${pedido.order_number}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 3mm;
          }
          
          @media print {
            html, body {
              width: auto;
              margin: 0;
              padding: 0;
              background: #fff;
            }
          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            width: 72mm;
            max-width: 72mm;
            margin: 0 auto;
            font-family: 'Courier New', 'Liberation Mono', monospace;
            font-size: 12px;
            line-height: 1.35;
            padding: 0;
            color: #000;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            text-rendering: optimizeLegibility;
            overflow-wrap: anywhere;
          }
          
          /* ===== HEADER ===== */
          .header {
            text-align: center;
            padding-bottom: 8px;
            margin-bottom: 8px;
            border-bottom: 1px dashed #000;
          }
          
          .store-name {
            font-size: 18px;
            font-weight: 900;
            letter-spacing: 1px;
            text-transform: uppercase;
            line-height: 1.15;
          }
          
          .store-info {
            font-size: 10px;
            font-weight: 700;
            margin-top: 4px;
            word-break: break-word;
          }
          
          /* ===== ORDER NUMBER ===== */
          .order-header {
            background: #000;
            color: #fff;
            text-align: center;
            padding: 7px 4px;
            margin: 8px 0;
          }
          
          .order-number {
            font-size: 18px;
            font-weight: 900;
            letter-spacing: 1px;
          }
          
          .order-date {
            font-size: 10px;
            font-weight: 600;
            margin-top: 4px;
          }
          
          .delivery-badge {
            display: inline-block;
            font-size: 10px;
            font-weight: 800;
            margin-top: 6px;
            padding: 2px 6px;
            background: #fff;
            color: #000;
            border: 1px solid #000;
          }
          
          /* ===== SECTIONS ===== */
          .section {
            margin: 8px 0;
            padding: 6px 0;
            border-bottom: 1px dashed #000;
          }
          
          .section-title {
            font-size: 11px;
            font-weight: 900;
            text-transform: uppercase;
            margin-bottom: 5px;
            letter-spacing: 0.6px;
          }
          
          /* ===== CUSTOMER ===== */
          .customer-name {
            font-size: 13px;
            font-weight: 800;
          }
          
          .customer-phone {
            font-size: 12px;
            font-weight: 700;
            margin-top: 2px;
          }
          
          .customer-address {
            font-size: 10px;
            font-weight: 600;
            margin-top: 6px;
            padding: 5px 6px;
            border: 1px dashed #000;
            word-break: break-word;
          }
          
          .address-label {
            font-weight: 900;
            font-size: 9px;
            text-transform: uppercase;
            margin-bottom: 3px;
          }
          
          /* ===== ITEMS TABLE ===== */
          .items-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            font-size: 10px;
          }
          
          .items-table td {
            padding: 4px 1px;
            vertical-align: top;
            font-weight: 700;
            word-wrap: break-word;
            overflow-wrap: anywhere;
          }

          .items-table tr:not(:last-child) td {
            border-bottom: 1px dotted #999;
          }
          
          .item-qty {
            width: 24px;
            font-weight: 900;
            font-size: 11px;
          }
          
          .item-name {
            font-weight: 700;
            padding-right: 4px;
            line-height: 1.3;
          }
          
          .item-name small {
            font-size: 9px;
            font-weight: 600;
            color: #333;
          }
          
          .item-notes {
            font-style: italic;
            display: inline-block;
            margin-top: 2px;
          }
          
          .item-price {
            width: 60px;
            text-align: right;
            font-weight: 800;
            white-space: nowrap;
          }
          
          /* ===== TOTALS ===== */
          .totals-section {
            margin: 8px 0;
            padding: 6px 0;
          }
          
          .total-row {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            padding: 2px 0;
            font-size: 11px;
            font-weight: 700;
          }

          .total-row span:first-child {
            flex: 1;
            min-width: 0;
          }

          .total-row span:last-child {
            white-space: nowrap;
          }
          
          .total-row.discount {
            color: #000;
          }
          
          .grand-total {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            margin-top: 6px;
            padding-top: 6px;
            border-top: 3px double #000;
            font-size: 15px;
            font-weight: 900;
          }
          
          /* ===== PAYMENT ===== */
          .payment-section {
            padding: 7px 6px;
            margin: 8px 0;
            border: 1px solid #000;
          }
          
          .payment-row {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            font-size: 11px;
            font-weight: 700;
            padding: 2px 0;
          }

          .payment-row span:first-child {
            flex: 1;
            min-width: 0;
          }

          .payment-row span:last-child {
            text-align: right;
            white-space: nowrap;
          }
          
          .payment-status {
            font-weight: 900;
            font-size: 11px;
          }
          
          /* ===== NOTES ===== */
          .notes-section {
            margin: 8px 0;
            padding: 7px 6px;
            border: 1px solid #000;
          }
          
          .notes-title {
            font-size: 10px;
            font-weight: 900;
            margin-bottom: 4px;
          }
          
          .notes-text {
            font-size: 10px;
            font-weight: 700;
            line-height: 1.35;
            white-space: pre-wrap;
            word-break: break-word;
          }
          
          /* ===== FOOTER ===== */
          .footer {
            text-align: center;
            margin-top: 10px;
            padding-top: 8px;
            border-top: 1px dashed #000;
          }
          
          .footer-thanks {
            font-size: 11px;
            font-weight: 800;
            line-height: 1.3;
          }
          
          .footer-divider {
            font-size: 9px;
            margin: 5px 0;
            letter-spacing: 0;
            white-space: nowrap;
            overflow: hidden;
          }
          
          .footer-time {
            font-size: 9px;
            font-weight: 600;
          }
          
          /* ===== UTILITIES ===== */
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: 900; }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="header">
          <div class="store-name">${storeName}</div>
          ${storePhone ? `<div class="store-info">${storePhone}</div>` : ''}
          ${storeAddress ? `<div class="store-info">${storeAddress}</div>` : ''}
        </div>

        <!-- Order Info -->
        <div class="order-header">
          <div class="order-number">PEDIDO #${pedido.order_number}</div>
          <div class="order-date">${formatDate(pedido.created_at)}</div>
          <div class="delivery-badge">${getDeliveryMethod()}</div>
        </div>

        <!-- Customer Info -->
        <div class="section">
          <div class="section-title">CLIENTE</div>
          <div class="customer-name">${pedido.customer_name || (pedidoAny.cliente_nome as string) || ''}</div>
          <div class="customer-phone">${pedido.customer_phone || (pedidoAny.cliente_telefone as string) || ''}</div>
          ${formatAddress() ? `
            <div class="customer-address">
              <div class="address-label">ENDERECO DE ENTREGA</div>
              ${formatAddress()}
            </div>
          ` : ''}
        </div>

        <!-- Items -->
        <div class="section">
          <div class="section-title">ITENS DO PEDIDO</div>
          <table class="items-table">
            ${itemsHtml}
          </table>
        </div>

        <!-- Totals -->
        <div class="totals-section">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>${formatMoney(subtotal)}</span>
          </div>
          ${deliveryFee > 0 ? `
            <div class="total-row">
              <span>Taxa de Entrega:</span>
              <span>${formatMoney(deliveryFee)}</span>
            </div>
          ` : ''}
          ${discount > 0 ? `
            <div class="total-row discount">
              <span>Desconto:</span>
              <span>- ${formatMoney(discount)}</span>
            </div>
          ` : ''}
          <div class="grand-total">
            <span>TOTAL:</span>
            <span>${formatMoney(total)}</span>
          </div>
        </div>

        <!-- Payment Info -->
        <div class="payment-section">
          <div class="payment-row">
            <span>Forma de Pagamento:</span>
            <span>${getPaymentMethod()}</span>
          </div>
          <div class="payment-row">
            <span>Status:</span>
            <span class="payment-status">${getPaymentStatus()}</span>
          </div>
        </div>

        ${notesHtml}

        <!-- Footer -->
        <div class="footer">
          <div class="footer-thanks">Obrigado pela preferencia!</div>
          <div class="footer-divider">------------------------------------------</div>
          <div class="footer-time">Impresso em ${new Date().toLocaleString('pt-BR')}</div>
        </div>
      </body>
      </html>
    `;

    doc.open();
    doc.write(html);
    doc.close();

    // Wait for content to load then print
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 300);
  }, []);

  return { printOrder };
};

// Auto-print settings storage key
export const AUTO_PRINT_KEY = 'pastita_auto_print_enabled';

export const getAutoPrintEnabled = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(AUTO_PRINT_KEY) === 'true';
};

export const setAutoPrintEnabled = (enabled: boolean): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTO_PRINT_KEY, String(enabled));
};

export default useOrderPrint;
