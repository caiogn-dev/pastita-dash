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

    const escapeHtml = (value: string) => value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

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

    const formatAddressLines = () => {
      const legacyAddress = (pedido as unknown as { endereco_entrega?: unknown }).endereco_entrega;
      const addr = legacyAddress || pedido.delivery_address;
      if (!addr || typeof addr !== 'object') {
        const fallback = formatAddress();
        return fallback ? [fallback] : [];
      }

      const addrAny = addr as unknown as Record<string, string>;
      const line1 = [
        addrAny.rua || addrAny.street,
        (addrAny.numero || addrAny.number) ? `nº ${addrAny.numero || addrAny.number}` : '',
      ].filter(Boolean).join(', ');
      const line2 = [
        addrAny.complemento || addrAny.complement,
        addrAny.bairro || addrAny.neighborhood,
      ].filter(Boolean).join(' - ');
      const line3 = [
        addrAny.cidade || addrAny.city,
        addrAny.estado || addrAny.state,
        addrAny.cep || addrAny.zip_code,
      ].filter(Boolean).join(' / ');

      return [line1, line2, line3].filter(Boolean);
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
    const formatIngredients = (ingredients: Array<{ name: string; role?: string; price?: number }>) => ingredients
      .map((ingredient) => {
        const role = ingredient.role ? `${ingredient.role}: ` : '';
        const price = ingredient.price && ingredient.price > 0 ? ` (+${formatMoney(ingredient.price)})` : '';
        return `${role}${ingredient.name}${price}`;
      });

    const renderDetailLines = (lines: string[], className = 'item-detail') => lines
      .map((line) => `<div class="${className}">${escapeHtml(line)}</div>`)
      .join('');

    const itemsHtml = pedido.items?.map((item) => {
      const itemAny = item as unknown as Record<string, unknown>;
      const variantName = itemAny.variant_name as string | undefined;
      const itemNotes = itemAny.notes as string | undefined;
      const itemTotal = item.total_price || (item.quantity * Number(item.unit_price));
      const ingredientLines = Array.isArray(item.options?.ingredients)
        ? formatIngredients(item.options.ingredients)
        : [];
      const detailLines = [
        variantName,
        ...ingredientLines,
      ].filter((line): line is string => Boolean(line));

      return `
        <div class="item-card">
          <div class="item-row">
            <div class="item-main">
              <span class="item-qty">${item.quantity}x</span>
              <span class="item-name">${escapeHtml(item.product_name)}</span>
            </div>
            <div class="item-price">${formatMoney(itemTotal)}</div>
          </div>
          ${detailLines.length ? renderDetailLines(detailLines) : ''}
          ${itemNotes ? `<div class="item-note-box">OBS. ITEM: ${escapeHtml(itemNotes)}</div>` : ''}
        </div>
      `;
    }).join('') || '';

    const comboItemsHtml = pedido.combo_items?.map((combo) => {
      const customizationLines = Array.isArray(combo.customizations?.ingredients)
        ? formatIngredients(combo.customizations.ingredients)
        : [];

      return `
        <div class="item-card combo-card">
          <div class="item-row">
            <div class="item-main">
              <span class="item-qty">${combo.quantity}x</span>
              <span class="item-name">${escapeHtml(combo.combo_name)}</span>
            </div>
            <div class="item-price">${formatMoney(combo.subtotal)}</div>
          </div>
          <div class="item-detail">COMBO</div>
          ${customizationLines.length ? renderDetailLines(customizationLines) : ''}
          ${combo.notes ? `<div class="item-note-box">OBS. COMBO: ${escapeHtml(combo.notes)}</div>` : ''}
        </div>
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
        <div class="notes-text">${escapeHtml(notes)}</div>
      </div>
    ` : '';

    const internalNotes = typeof pedido.internal_notes === 'string' ? pedido.internal_notes : '';
    const deliveryInstructions = typeof pedido.delivery_instructions === 'string' ? pedido.delivery_instructions : '';
    const prepNotesHtml = [internalNotes, deliveryInstructions]
      .filter(Boolean)
      .map((entry) => `<div class="notes-text">${escapeHtml(entry)}</div>`)
      .join('');

    const kitchenNotesHtml = prepNotesHtml ? `
      <div class="notes-section kitchen-notes">
        <div class="notes-title">ATENCAO DA LOJA</div>
        ${prepNotesHtml}
      </div>
    ` : '';

    const addressLines = formatAddressLines();
    const scheduledLabel = [pedido.scheduled_date, pedido.scheduled_time]
      .filter(Boolean)
      .join(' ');

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
          
          /* ===== ITEMS ===== */
          .items-list {
            display: grid;
            gap: 8px;
          }

          .item-card {
            border: 1px solid #000;
            padding: 6px;
          }

          .combo-card {
            border-style: dashed;
          }

          .item-row {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 8px;
          }

          .item-main {
            flex: 1;
            min-width: 0;
          }

          .item-qty {
            display: inline-block;
            min-width: 28px;
            font-weight: 900;
            font-size: 14px;
            vertical-align: top;
          }
          
          .item-name {
            display: inline;
            font-weight: 900;
            font-size: 13px;
            line-height: 1.25;
          }
          
          .item-price {
            text-align: right;
            font-weight: 900;
            font-size: 12px;
            white-space: nowrap;
          }

          .item-detail {
            margin-top: 4px;
            padding-left: 28px;
            font-size: 10px;
            font-weight: 700;
            line-height: 1.3;
          }

          .item-note-box {
            margin-top: 5px;
            padding: 4px 5px;
            border: 1px dashed #000;
            font-size: 10px;
            font-weight: 900;
            line-height: 1.3;
            background: #f7f7f7;
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

          .kitchen-notes {
            border-width: 2px;
          }

          .meta-strip {
            display: grid;
            gap: 4px;
            margin: 8px 0;
          }

          .meta-chip {
            border: 1px solid #000;
            padding: 4px 6px;
            font-size: 10px;
            font-weight: 800;
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

        ${scheduledLabel ? `
          <div class="meta-strip">
            <div class="meta-chip">AGENDADO PARA: ${escapeHtml(scheduledLabel)}</div>
          </div>
        ` : ''}

        <!-- Customer Info -->
        <div class="section">
          <div class="section-title">CLIENTE</div>
          <div class="customer-name">${escapeHtml(pedido.customer_name || (pedidoAny.cliente_nome as string) || '')}</div>
          <div class="customer-phone">${escapeHtml(pedido.customer_phone || (pedidoAny.cliente_telefone as string) || '')}</div>
          ${getDeliveryMethod() === 'RETIRADA' ? `
            <div class="customer-address">
              <div class="address-label">ENTREGA</div>
              PEDIDO PARA RETIRADA
            </div>
          ` : addressLines.length ? `
            <div class="customer-address">
              <div class="address-label">ENDERECO DE ENTREGA</div>
              ${addressLines.map((line) => `<div>${escapeHtml(line)}</div>`).join('')}
            </div>
          ` : ''}
        </div>

        ${kitchenNotesHtml}
        ${notesHtml}

        <!-- Items -->
        <div class="section">
          <div class="section-title">ITENS DO PEDIDO</div>
          <div class="items-list">
            ${itemsHtml}
            ${comboItemsHtml}
          </div>
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
