/**
 * Order Print Component
 * Formats order data for thermal printers (80mm width - Epson TM-T20 compatible)
 */
import { useRef, useCallback } from 'react';
import { Pedido } from '../../services/pastitaApi';

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
      iframe.style.width = '80mm';
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
      const addr = pedido.endereco_entrega || pedido.delivery_address;
      if (!addr || typeof addr !== 'object') return '';
      
      const parts = [];
      if (addr.rua || addr.street) parts.push(addr.rua || addr.street);
      if (addr.numero || addr.number) parts.push(addr.numero || addr.number);
      if (addr.complemento || addr.complement) parts.push(addr.complemento || addr.complement);
      if (addr.bairro || addr.neighborhood) parts.push(addr.bairro || addr.neighborhood);
      
      return parts.join(', ');
    };

    const getPaymentMethod = () => {
      const method = pedido.payment_method || 'pix';
      const methods: Record<string, string> = {
        pix: 'PIX',
        credit_card: 'Cartão de Crédito',
        debit_card: 'Cartão de Débito',
        cash: 'Dinheiro',
        mercadopago: 'Mercado Pago',
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
    const deliveryFee = Number(pedido.delivery_fee || pedido.taxa_entrega || 0);
    const discount = Number(pedido.discount || pedido.desconto || 0);
    const total = Number(pedido.total || 0);

    const storeName = options?.storeName || 'PASTITA';
    const storePhone = options?.storePhone || '(63) 9117-2166';
    const storeAddress = options?.storeAddress || 'Palmas - TO';

    // Build items HTML
    const itemsHtml = pedido.items?.map((item) => `
      <div style="margin: 4px 0;">
        <div style="display: flex; justify-content: space-between;">
          <span>${item.quantity}x ${item.product_name}</span>
          <span>${formatMoney(item.total_price || (item.quantity * Number(item.unit_price)))}</span>
        </div>
        ${item.variant_name ? `<div style="font-size: 10px; padding-left: 8px;">${item.variant_name}</div>` : ''}
      </div>
    `).join('') || '';

    // Build notes HTML
    const notes = pedido.customer_notes || pedido.observacoes || pedido.delivery_notes;
    const notesHtml = notes ? `
      <div style="margin: 8px 0; padding: 8px 0; border-bottom: 1px dashed #000;">
        <div style="font-weight: bold; font-size: 11px; margin-bottom: 4px; text-transform: uppercase;">OBSERVAÇÕES</div>
        <div>${notes}</div>
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
            margin: 0;
          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            width: 80mm;
            max-width: 80mm;
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            line-height: 1.3;
            padding: 5mm;
          }
          
          .header {
            text-align: center;
            border-bottom: 1px dashed #000;
            padding-bottom: 8px;
            margin-bottom: 8px;
          }
          
          .title {
            font-size: 16px;
            font-weight: bold;
          }
          
          .subtitle {
            font-size: 10px;
            margin-top: 4px;
          }
          
          .section {
            margin: 8px 0;
            padding: 8px 0;
            border-bottom: 1px dashed #000;
          }
          
          .section-title {
            font-weight: bold;
            font-size: 11px;
            margin-bottom: 4px;
            text-transform: uppercase;
          }
          
          .row {
            display: flex;
            justify-content: space-between;
            margin: 2px 0;
          }
          
          .total {
            font-size: 14px;
            font-weight: bold;
            text-align: right;
            margin-top: 8px;
            padding-top: 8px;
            border-top: 2px solid #000;
          }
          
          .footer {
            text-align: center;
            font-size: 10px;
            margin-top: 12px;
            padding-top: 8px;
            border-top: 1px dashed #000;
          }
          
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .large { font-size: 14px; }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="header">
          <div class="title">${storeName}</div>
          <div class="subtitle">${storePhone}</div>
          <div class="subtitle">${storeAddress}</div>
        </div>

        <!-- Order Info -->
        <div class="section">
          <div class="center bold large">PEDIDO #${pedido.order_number}</div>
          <div class="center">${formatDate(pedido.created_at)}</div>
        </div>

        <!-- Customer Info -->
        <div class="section">
          <div class="section-title">CLIENTE</div>
          <div>${pedido.customer_name || pedido.cliente_nome}</div>
          <div>${pedido.customer_phone || pedido.cliente_telefone}</div>
          ${formatAddress() ? `
            <div style="margin-top: 4px;">
              <strong>Entrega:</strong><br>
              ${formatAddress()}
            </div>
          ` : ''}
        </div>

        <!-- Items -->
        <div class="section">
          <div class="section-title">ITENS</div>
          ${itemsHtml}
        </div>

        <!-- Totals -->
        <div class="section">
          <div class="row">
            <span>Subtotal:</span>
            <span>${formatMoney(subtotal)}</span>
          </div>
          ${deliveryFee > 0 ? `
            <div class="row">
              <span>Taxa de Entrega:</span>
              <span>${formatMoney(deliveryFee)}</span>
            </div>
          ` : ''}
          ${discount > 0 ? `
            <div class="row">
              <span>Desconto:</span>
              <span>-${formatMoney(discount)}</span>
            </div>
          ` : ''}
          <div class="total">TOTAL: ${formatMoney(total)}</div>
        </div>

        <!-- Payment Info -->
        <div class="section">
          <div class="row">
            <span>Pagamento:</span>
            <span>${getPaymentMethod()}</span>
          </div>
          <div class="row">
            <span>Status:</span>
            <span class="bold">${getPaymentStatus()}</span>
          </div>
        </div>

        ${notesHtml}

        <!-- Footer -->
        <div class="footer">
          <div>Obrigado pela preferência!</div>
          <div style="margin-top: 4px;">================================</div>
          <div style="font-size: 9px; margin-top: 4px;">${new Date().toLocaleString('pt-BR')}</div>
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
    }, 250);
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
