/** Quem: busca por nome, telefone ou documento; cliente novo pede só o telefone. */
import React from 'react';
import { CustomerSearchInput } from '../../../components/crm/CustomerSearchInput';
import { CampoDeTelefone } from '../../../components/ui';
import type { NewOrderWizard } from '../../../components/orders/newOrder/useNewOrderWizard';

export function ClienteDoPedido({ wiz }: { wiz: NewOrderWizard }) {
  const novo = wiz.customer?.id === '';
  return (
    <div className="space-y-3">
      <CustomerSearchInput
        storeSlug={wiz.storeSlug}
        onSelect={wiz.setCustomer}
        onClear={() => wiz.setCustomer(null)}
        selectedCustomer={wiz.customer}
      />
      {novo && wiz.customer && (
        <CampoDeTelefone
          rotulo="Telefone do cliente novo"
          obrigatorio
          valor={(wiz.customer.phone_number_edited || '').replace(/[^\d+]/g, '')}
          onMudar={(tel) => wiz.customer && wiz.setCustomer({ ...wiz.customer, phone_number_edited: tel })}
        />
      )}
    </div>
  );
}
