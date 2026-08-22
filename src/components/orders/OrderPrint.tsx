/**
 * Order Print Component
 * Formats order data for thermal printers (80mm width - Epson TM-T20)
 * Optimized for thermal printing with high contrast
 */
import { useRef, useCallback } from 'react';
import { Order, OrderComboItem } from '../../types';

// Type alias for backwards compatibility
type Pedido = Order;

// Hook for printing orders
export const useOrderPrint = () => {
  const printFrameRef = useRef<HTMLIFrameElement | null>(null);

  const printOrder = useCallback((pedido: Pedido, options?: {
    storeName?: string;
    storePhone?: string;
    storeAddress?: string;
    /** URL da logo da loja — vira o selo no topo da comanda. */
    storeLogo?: string;
    /** Comanda da cozinha: oculta preços, totais e pagamento. */
    hidePrices?: boolean;
  }) => {
    const hidePrices = options?.hidePrices ?? false;
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
    const metadata = pedido.metadata || {};
    const rawSurcharge = metadata.manual_surcharge
      || (metadata.manual_adjustment && typeof metadata.manual_adjustment === 'object'
        ? (metadata.manual_adjustment as Record<string, unknown>).surcharge
        : 0);
    const surcharge = typeof rawSurcharge === 'number' ? rawSurcharge : Number(rawSurcharge || 0);
    const total = Number(pedido.total || 0);

    const storeName = options?.storeName || (pedido as unknown as { store_name?: string }).store_name || 'LOJA';
    const storePhone = options?.storePhone || '';
    const storeLogo = options?.storeLogo || '';

    // Canal de origem: WhatsApp, PDV e site se comportam diferente quando dá
    // problema, e quem atende lê isso na comanda.
    const SOURCE_LABELS: Record<string, string> = {
      whatsapp: 'WhatsApp', instagram: 'Instagram', pdv: 'PDV', balcao: 'balcao',
      web: 'site', site: 'site', storefront: 'site', payment_link: 'link de pagamento',
    };
    const canalLabel = SOURCE_LABELS[(pedido as unknown as { source?: string }).source || ''] || '';

    const unidades = (pedido.items || []).reduce((n, i) => n + Number(i.quantity || 1), 0)
      + (pedido.combo_items || []).reduce((n, c) => n + Number(c.quantity || 1), 0);
    const formatIngredients = (ingredients: Array<{ name: string; role?: string; price?: number }>) => ingredients
      .map((ingredient) => {
        const role = ingredient.role ? `${ingredient.role}: ` : '';
        const price = !hidePrices && ingredient.price && ingredient.price > 0 ? ` (+${formatMoney(ingredient.price)})` : '';
        return `${role}${ingredient.name}${price}`;
      });

    const renderDetailLines = (lines: string[], className = 'det') => lines
      .map((line) => `<div class="${className}">${escapeHtml(line)}</div>`)
      .join('');

    const comboByOrderItem = new Map<string, OrderComboItem>();
    (pedido.combo_items || []).forEach((c) => {
      if (c.order_item) comboByOrderItem.set(c.order_item, c);
    });

    const itemsHtml = pedido.items?.map((item) => {
      const itemAny = item as unknown as Record<string, unknown>;
      const variantName = itemAny.variant_name as string | undefined;
      const itemNotes = itemAny.notes as string | undefined;
      const itemTotal = item.total_price || (item.quantity * Number(item.unit_price));
      const ingredientLines = Array.isArray(item.options?.ingredients)
        ? formatIngredients(item.options.ingredients)
        : [];
      // Sabores/saladas escolhidos no combo, ligados a esta linha
      const combo = comboByOrderItem.get(item.id);
      const comboLines = (combo?.selected_variants_data || [])
        .map((sv) => `${sv.quantity ?? 1}x ${sv.product_name || sv.variant_name || ''}`.trim())
        .filter((l) => l && !l.endsWith('x'));
      const detailLines = [
        variantName,
        ...comboLines,
        ...ingredientLines,
      ].filter((line): line is string => Boolean(line));

      return `
        <div class="item">
          <div class="item-head">
            <span class="marca">[ ] <span class="qty">${item.quantity}x</span></span>
            <span class="nome-item">${escapeHtml(item.product_name)}</span>
            ${hidePrices ? '' : `<span class="preco">${formatMoney(itemTotal)}</span>`}
          </div>
          ${detailLines.length ? renderDetailLines(detailLines) : ''}
          ${itemNotes ? `<div class="obs-item">${escapeHtml(itemNotes)}</div>` : ''}
        </div>
      `;
    }).join('') || '';

    const comboItemsHtml = pedido.combo_items?.map((combo) => {
      const customizationLines = Array.isArray(combo.customizations?.ingredients)
        ? formatIngredients(combo.customizations.ingredients)
        : [];

      return `
        <div class="item">
          <div class="item-head">
            <span class="marca">[ ] <span class="qty">${combo.quantity}x</span></span>
            <span class="nome-item">${escapeHtml(combo.combo_name)}</span>
            ${hidePrices ? '' : `<span class="preco">${formatMoney(combo.subtotal)}</span>`}
          </div>
          <div class="det">[COMBO]</div>
          ${customizationLines.length ? renderDetailLines(customizationLines) : ''}
          ${combo.notes ? `<div class="obs-item">${escapeHtml(combo.notes)}</div>` : ''}
        </div>
      `;
    }).join('') || '';

    // Build notes HTML
    const pedidoAny = pedido as unknown as Record<string, unknown>;
    const notes = (pedidoAny.customer_notes as string)
      || (pedidoAny.observacoes as string)
      || (pedidoAny.delivery_notes as string);
    // Só imprime se existir — sem observação não sobra cabeçalho órfão.
    const notesHtml = notes ? `
      <div class="band">OBSERVACAO DO CLIENTE</div>
      <div class="nota">${escapeHtml(notes)}</div>
    ` : '';

    const internalNotes = typeof pedido.internal_notes === 'string' ? pedido.internal_notes : '';
    const deliveryInstructions = typeof pedido.delivery_instructions === 'string' ? pedido.delivery_instructions : '';
    const prepNotesHtml = [internalNotes, deliveryInstructions]
      .filter(Boolean)
      .map((entry) => `<div class="nota">${escapeHtml(entry)}</div>`)
      .join('');

    const kitchenNotesHtml = prepNotesHtml ? `
      <div class="band">!! ATENCAO DA LOJA !!</div>
      ${prepNotesHtml}
    ` : '';

    const addressLines = formatAddressLines();

    // Pin do mapa x endereço escrito. Vai NA COMANDA, não só na tela: é este
    // papel que o entregador leva, e o aviso só serve se chegar antes da moto
    // sair. Origem: CE-2608140823, pin a 5,15 km do endereço digitado — o Maps
    // segue a coordenada, e a taxa também.
    const divergenciaHtml = (() => {
      const meta = pedido.metadata as Record<string, unknown> | undefined;
      const d = meta?.endereco_divergente as
        { digitado?: string; pin?: string } | undefined;
      if (!d?.digitado || !d?.pin) return '';
      return `
        <div class="aviso">
          !! CONFERIR ENDERECO ANTES DE SAIR !!<br/>
          Cliente escreveu: ${escapeHtml(d.digitado)}<br/>
          Pin do mapa cai em: ${escapeHtml(d.pin)}
        </div>
      `;
    })();
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
          @page { size: 80mm auto; margin: 3mm; }

          @media print {
            html, body { width: auto; margin: 0; padding: 0; background: #fff; }
          }

          * { margin: 0; padding: 0; box-sizing: border-box; }

          body {
            width: 72mm;
            max-width: 72mm;
            margin: 0 auto;
            font-family: 'Courier New', 'Liberation Mono', monospace;
            font-size: 12px;
            line-height: 1.35;
            color: #000;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            text-rendering: optimizeLegibility;
            overflow-wrap: anywhere;
          }

          /* Papel térmico não tem cinza nem cor: o único destaque que sobrevive
             é preto sólido. Por isso as faixas — e por isso elas são raras.
             Cada faixa responde à mesma pergunta: o que muda o que eu faço agora? */
          .band {
            background: #000;
            color: #fff;
            text-align: center;
            font-weight: 900;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: .5px;
            padding: 3px 4px;
            margin: 7px 0;
          }
          .band.lg { font-size: 21px; letter-spacing: 1.5px; padding: 6px 4px; }

          .logo {
            display: block;
            margin: 0 auto 3px;
            width: 18mm;
            height: auto;
            /* aproxima o 1 bit da térmica: sem isso, meio-tom vira mancha */
            filter: grayscale(1) contrast(2.4);
          }
          .store { text-align: center; font-weight: 900; text-transform: uppercase; font-size: 13px; }

          .num { text-align: center; font-size: 27px; font-weight: 900; line-height: 1.05; letter-spacing: 1px; }
          .ctx { text-align: center; font-size: 10px; font-weight: 700; margin-top: 2px; }

          /* O que se lê de longe vai pro centro. A margem esquerda fica
             reservada para uma coisa só: a lista de itens. */
          .who { text-align: center; margin: 8px 0; }
          .who .nome { font-size: 14px; font-weight: 900; text-transform: uppercase; }
          .who .tel  { font-size: 12px; font-weight: 700; }
          .who .end  { font-size: 11px; font-weight: 700; }

          .aviso {
            margin: 6px 0;
            padding: 4px;
            border: 2px solid #000;
            font-weight: 900;
            font-size: 10px;
            text-transform: uppercase;
            line-height: 1.35;
            text-align: center;
          }

          .nota {
            text-align: center;
            font-size: 12px;
            font-weight: 900;
            line-height: 1.35;
            white-space: pre-wrap;
            word-break: break-word;
            margin-bottom: 7px;
          }

          .item { margin: 0 0 8px; }
          .item-head { display: flex; align-items: baseline; gap: 4px; }
          /* Coluna fixa: sem largura travada o nome empurrava a quantidade e a
             linha quebrava em lugar errado. Agora a continuação do nome cai
             sempre embaixo do nome, nunca embaixo do [ ]. */
          .marca {
            flex: 0 0 14mm;
            font-size: 12px;
            font-weight: 900;
            white-space: nowrap;
          }
          /* A quantidade é o dado que mais gera erro na cozinha, então cresce —
             mas em altura, não em largura, senão come a linha do nome. */
          .qty { font-size: 15px; font-weight: 900; }
          .nome-item {
            flex: 1;
            min-width: 0;
            font-size: 13px;
            font-weight: 900;
            line-height: 1.2;
            text-transform: uppercase;
          }
          .preco { flex: 0 0 auto; font-size: 12px; font-weight: 900; white-space: nowrap; }
          .det { padding-left: 14mm; font-size: 10px; font-weight: 700; line-height: 1.35; }
          .obs-item {
            display: inline-block;
            margin: 3px 0 0 14mm;
            background: #000;
            color: #fff;
            padding: 2px 5px;
            font-size: 10px;
            font-weight: 900;
            text-transform: uppercase;
          }

          .rule { border-top: 1px solid #000; margin: 8px 0 5px; }
          .tot { display: flex; justify-content: space-between; gap: 8px; font-size: 11px; font-weight: 700; padding: 1px 0; }
          .tot span:first-child { flex: 1; min-width: 0; }
          .tot span:last-child { white-space: nowrap; }
          .total-final { text-align: center; font-size: 20px; font-weight: 900; margin: 7px 0; }

          .pe {
            text-align: center;
            font-size: 10px;
            font-weight: 700;
            margin-top: 10px;
            padding-top: 7px;
            border-top: 1px solid #000;
          }
        </style>
      </head>
      <body>
        <!-- Selo da loja: com várias lojas na mesma impressora, é a forma que
             separa uma comanda da outra na bancada. Sem logo, sobra o nome. -->
        ${storeLogo ? `<img class="logo" src="${escapeHtml(storeLogo)}" alt="">` : ''}
        <div class="store">${escapeHtml(storeName)}</div>

        <!-- Faixa 1: o modo, que decide o fluxo inteiro -->
        <div class="band lg">${getDeliveryMethod()}</div>

        <div class="num">#${escapeHtml(String(pedido.order_number ?? ''))}</div>
        <div class="ctx">${formatDate(pedido.created_at)}${canalLabel ? ` &middot; via ${escapeHtml(canalLabel)}` : ''}</div>
        ${hidePrices ? '<div class="ctx">VIA DA COZINHA</div>' : ''}

        <!-- Faixa 2: agendamento — quando existe, manda no papel -->
        ${scheduledLabel ? `<div class="band">AGENDADO ${escapeHtml(scheduledLabel)}</div>` : ''}

        <div class="who">
          <div class="nome">${escapeHtml(pedido.customer_name || (pedidoAny.cliente_nome as string) || '')}</div>
          <div class="tel">${escapeHtml(pedido.customer_phone || (pedidoAny.cliente_telefone as string) || '')}</div>
          ${getDeliveryMethod() === 'RETIRADA'
            ? '<div class="end">RETIRADA NO LOCAL</div>'
            : addressLines.map((line) => `<div class="end">${escapeHtml(line)}</div>`).join('')}
        </div>
        ${divergenciaHtml}

        ${kitchenNotesHtml}
        ${notesHtml}

        <!-- Faixa 3: a contagem é a soma das quantidades, não o número de
             linhas — é o número que se confere contra a sacola fechada. -->
        <div class="band">${unidades} ${unidades === 1 ? 'ITEM' : 'ITENS'}</div>
        ${itemsHtml}
        ${comboItemsHtml}

        ${hidePrices ? '' : `
        <div class="rule"></div>
        <div class="tot"><span>Subtotal</span><span>${formatMoney(subtotal)}</span></div>
        ${deliveryFee > 0 ? `<div class="tot"><span>Entrega</span><span>${formatMoney(deliveryFee)}</span></div>` : ''}
        ${discount > 0 ? `<div class="tot"><span>Desconto</span><span>- ${formatMoney(discount)}</span></div>` : ''}
        ${surcharge > 0 ? `<div class="tot"><span>Acrescimo</span><span>${formatMoney(surcharge)}</span></div>` : ''}
        <div class="total-final">TOTAL ${formatMoney(total)}</div>

        <!-- Faixa 4: calma quando pago, grito quando não -->
        <div class="band">${pedido.payment_status === 'paid'
          ? `${getPaymentMethod()} - PAGO`
          : `!! ${getPaymentStatus()} - ${getPaymentMethod()} !!`}</div>
        `}

        <div class="pe">
          ${escapeHtml(storeName)}${storePhone ? ` &middot; ${escapeHtml(storePhone)}` : ''}<br>
          impresso ${new Date().toLocaleString('pt-BR')}
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
export const AUTO_PRINT_KEY = 'cardapidex_auto_print_enabled';

export const getAutoPrintEnabled = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(AUTO_PRINT_KEY) === 'true';
};

export const setAutoPrintEnabled = (enabled: boolean): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTO_PRINT_KEY, String(enabled));
};

export default useOrderPrint;
