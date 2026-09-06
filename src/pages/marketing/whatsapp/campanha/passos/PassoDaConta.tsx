import React from 'react';
import { DevicePhoneMobileIcon } from '@heroicons/react/24/outline';

import { WhatsAppAccount } from '../../../../../types';
import { cn } from '../../../../../utils/cn';

interface Props {
  accounts: WhatsAppAccount[];
  formData: { accountId: string };
  handleAccountSelect: (id: string) => void;
}

/**
 * Primeiro passo: por qual número a campanha sai.
 *
 * Não é detalhe — enviar da conta errada é o cliente responder para um
 * WhatsApp que ninguém lê. Por isso a escolha é explícita quando há mais de
 * uma conta; a tela só pré-seleciona quando existe UMA, onde não há o que
 * errar.
 */
export const PassoDaConta: React.FC<Props> = ({ accounts, formData, handleAccountSelect }) => (
  <div className="flex flex-col gap-6">
    <div>
      <h2 className="mb-2 text-lg font-semibold text-fg-token">Selecione a conta de WhatsApp</h2>
      <p className="text-fg-muted-token">Escolha o número que vai enviar as mensagens</p>
    </div>

    <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
      {accounts.map((account) => {
        const escolhida = formData.accountId === account.id;
        const ativa = account.status === 'active';
        return (
          <button
            key={account.id}
            type="button"
            // Sem isto o leitor de tela anuncia quatro botões iguais e não diz
            // qual está escolhido — a informação mais importante do passo.
            aria-pressed={escolhida}
            onClick={() => handleAccountSelect(account.id)}
            className={cn(
              'rounded-xl border-2 p-4 text-left transition-all',
              // Verde cru era de outro produto: o painel é carvão e ouro, e
              // `green-500` não existe na paleta.
              escolhida
                ? 'border-brand bg-brand-soft'
                : 'border-border-token hover:border-[var(--border-strong)]',
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'rounded-lg p-2',
                  ativa ? 'bg-[var(--success-soft)]' : 'bg-surface-2',
                )}
              >
                <DevicePhoneMobileIcon
                  className={cn('h-6 w-6', ativa ? 'text-[var(--success)]' : 'text-fg-muted-token')}
                />
              </div>
              <div className="min-w-0">
                <h3 className="truncate font-semibold text-fg-token">{account.name}</h3>
                <p className="truncate text-sm text-fg-muted-token">
                  {account.display_phone_number || account.phone_number}
                </p>
              </div>
            </div>

            <div className="mt-3">
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  ativa
                    ? 'bg-[var(--success-soft)] text-[var(--success)]'
                    : 'bg-surface-2 text-fg-muted-token',
                )}
              >
                {ativa ? 'Ativa' : account.status}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  </div>
);
