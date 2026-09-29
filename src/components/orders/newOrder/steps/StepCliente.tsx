import React from 'react';
import { CustomerSearchInput } from '../../../crm/CustomerSearchInput';
import type { Customer } from '../types';

/** Step 1 */
export function StepCliente({
  storeSlug,
  customer,
  onCustomerSelected,
  onCustomerCleared,
}: {
  storeSlug: string;
  customer: Customer | null;
  onCustomerSelected: (c: Customer) => void;
  onCustomerCleared: () => void;
}) {
  const isNewCustomer = customer && customer.id === '';

  const handlePhoneChange = (phone: string) => {
    if (customer && isNewCustomer) {
      onCustomerSelected({
        ...customer,
        phone_number_edited: phone,
      });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest text-fg-muted-token mb-2">
          Buscar cliente
        </label>
        <CustomerSearchInput
          storeSlug={storeSlug}
          onSelect={onCustomerSelected}
          onClear={onCustomerCleared}
          selectedCustomer={customer}
        />
      </div>
      {!customer && (
        <p className="text-xs text-fg-muted-token">
          Digite nome ou telefone para buscar. Se não encontrar, um novo cliente
          será criado.
        </p>
      )}
      {isNewCustomer && (
        <div className="rounded-xl border border-border-token bg-warning-soft p-3 space-y-3">
          <p className="text-xs font-semibold text-warning-token ">
            Novo cliente — preencha o telefone
          </p>
          <input
            type="tel"
            value={customer.phone_number_edited || ''}
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder="(11) 99999-9999"
            className="controle w-full py-2 text-sm placeholder:text-fg-muted-token"
          />
        </div>
      )}
      {customer && customer.addresses.length > 0 && (
        <div className="rounded-xl border border-border-token p-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-fg-muted-token mb-2">
            Endereços salvos
          </p>
          <div className="space-y-1">
            {customer.addresses.slice(0, 3).map((addr) => (
              <p key={addr.id} className="text-xs text-fg-muted-token">
                {addr.label}: {addr.street}, {addr.number} — {addr.neighborhood}, {addr.city}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
