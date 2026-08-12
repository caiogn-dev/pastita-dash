/**
 * O cliente vinculado à venda de balcão — ou o convite para vincular.
 *
 * Vincular é OPCIONAL, e a tela precisa dizer isso sem parecer erro: venda de
 * balcão sem cliente é normal, não é formulário incompleto. Por isso o estado
 * vazio é um botão com a consequência escrita ao lado ("sai como venda
 * anônima"), e não um campo obrigatório piscando.
 *
 * Saiu da `PdvBalcaoPage` no mesmo movimento da comanda: a página fazia scanner,
 * comanda, cliente, pagamento e três modais em 735 linhas.
 */
import React from 'react';
import { UserIcon, XMarkIcon } from '@heroicons/react/24/outline';

import { Button } from '../../components/ui';

export interface ClienteVinculado {
  name: string;
  phone: string;
}

export interface ClienteDaVendaProps {
  cliente: ClienteVinculado | null;
  onVincular: () => void;
  onRemover: () => void;
}

export const ClienteDaVenda: React.FC<ClienteDaVendaProps> = ({
  cliente,
  onVincular,
  onRemover,
}) => (
  <div className="mb-4 flex flex-wrap items-center gap-2" data-testid="pdv-cliente">
    {cliente ? (
      <>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 py-1 pl-2.5 pr-1 text-sm font-medium">
          <UserIcon className="h-4 w-4" />
          {cliente.name}
          <span className="font-normal text-fg-muted-token">· {cliente.phone}</span>
          <button
            type="button"
            aria-label="Remover cliente"
            className="rounded-full p-0.5 transition-colors hover:bg-surface"
            onClick={onRemover}
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </span>
        <span className="text-xs text-fg-muted-token">a venda entra no histórico dele</span>
      </>
    ) : (
      <>
        <Button variant="secondary" size="sm" onClick={onVincular}>
          <UserIcon className="mr-1.5 h-4 w-4" /> Vincular cliente
        </Button>
        <span className="text-xs text-fg-muted-token">
          opcional — sem vínculo sai como venda anônima
        </span>
      </>
    )}
  </div>
);

export default ClienteDaVenda;
