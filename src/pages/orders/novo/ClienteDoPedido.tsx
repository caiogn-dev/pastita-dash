/** Quem: busca por nome, telefone ou documento; cliente novo pede só o telefone. */
import React from 'react';
import { CustomerSearchInput } from '../../../components/crm/CustomerSearchInput';
import { Button, CampoDeTelefone } from '../../../components/ui';
import { formatCurrency } from '../../../utils/formatters';
import { formatarDocumento } from '../../../utils/documento';
import type { NewOrderWizard } from '../../../components/orders/newOrder/useNewOrderWizard';

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase() || '?';
}

/** `onEscolhido`: cliente já cadastrado escolhido — o assistente segue sozinho. */
export function ClienteDoPedido({ wiz, onEscolhido }: { wiz: NewOrderWizard; onEscolhido?: () => void }) {
  const c = wiz.customer;

  if (!c) {
    return (
      <CustomerSearchInput
        storeSlug={wiz.storeSlug}
        onSelect={(escolhido) => { wiz.setCustomer(escolhido); if (escolhido?.id) onEscolhido?.(); }}
        onClear={() => wiz.setCustomer(null)}
      />
    );
  }

  const novo = c.id === '';
  const documento = c.cadastro?.documento;
  const detalhes = [
    c.phone_number,
    documento ? `${c.cadastro?.tipo_pessoa === 'pj' ? 'CNPJ' : 'CPF'} ${formatarDocumento(documento)}` : '',
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="superficie flex items-center gap-4 p-4">
        <span
          aria-hidden
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand text-base font-bold text-on-brand"
        >
          {iniciais(c.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-fg-token">{c.name || 'Cliente novo'}</p>
          {detalhes.length > 0 && (
            <p className="truncate text-sm text-fg-muted-token">{detalhes.join(' · ')}</p>
          )}
        </div>
        {!novo && c.total_orders > 0 && (
          <dl className="hidden shrink-0 grid-cols-2 gap-x-6 text-right sm:grid">
            <dt className="text-xs text-fg-muted-token">Pedidos</dt>
            <dt className="text-xs text-fg-muted-token">Gasto</dt>
            <dd className="text-sm font-semibold tabular-nums text-fg-token">{c.total_orders}</dd>
            <dd className="text-sm font-semibold tabular-nums text-fg-token">{formatCurrency(c.total_spent)}</dd>
          </dl>
        )}
        <Button variant="outline" size="sm" onClick={() => wiz.setCustomer(null)}>
          Trocar
        </Button>
      </div>

      {novo && (
        <div className="max-w-sm">
          <CampoDeTelefone
            rotulo="Telefone do cliente novo"
            obrigatorio
            valor={(c.phone_number_edited || '').replace(/[^\d+]/g, '')}
            onMudar={(tel) => wiz.setCustomer({ ...c, phone_number_edited: tel })}
          />
        </div>
      )}
    </div>
  );
}
