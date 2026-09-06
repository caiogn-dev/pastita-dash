import React from 'react';

import { DevicePhoneMobileIcon } from '@heroicons/react/24/outline';
import { WhatsAppAccount } from '../../../../../types';

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
export const PassoDaConta: React.FC<Props> = ({
  accounts,
  formData,
  handleAccountSelect,
}) => (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-fg-token mb-2">
              Selecione a Conta WhatsApp
            </h2>
            <p className="text-fg-muted-token">
              Escolha a conta que será usada para enviar as mensagens
            </p>
          </div>

          <div className="grid grid-cols-2 max-md:grid-cols-1 gap-4">
            {accounts.map((account) => (
              <button
                key={account.id}
                onClick={() => handleAccountSelect(account.id)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  formData.accountId === account.id
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-border-token dark:border-zinc-800 hover:border-green-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    account.status === 'active' ? 'bg-green-100' : 'bg-surface-2'
                  }`}>
                    <DevicePhoneMobileIcon className={`w-6 h-6 ${
                      account.status === 'active' ? 'text-green-600' : 'text-fg-muted-token'
                    }`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-fg-token">{account.name}</h3>
                    <p className="text-sm text-fg-muted-token">
                      {account.display_phone_number || account.phone_number}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    account.status === 'active' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-surface-2 text-fg-muted-token'
                  }`}>
                    {account.status === 'active' ? 'Ativa' : account.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
);
