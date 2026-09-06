import React from 'react';

import {
  ArrowUpTrayIcon,
  PlusIcon,
  TrashIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

import { SeletorDeAudiencia } from '../../SeletorDeAudiencia';
import type { SystemContact } from '../../../../../services/campaigns';
import { Card, Button, Input } from '../../../../../components/ui';

interface Contato {
  phone: string;
  name?: string;
}

/** O recorte do formulário que ESTA tela lê e mexe. */
interface DadosDeDestinatarios {
  accountId: string;
  contacts: Contato[];
}

interface Props {
  formData: DadosDeDestinatarios;
  setFormData: React.Dispatch<React.SetStateAction<DadosDeDestinatarios>>;
  contactLists: Array<{ id: string; name: string; contact_count: number }>;
  newContact: { phone: string; name: string };
  setNewContact: React.Dispatch<React.SetStateAction<{ phone: string; name: string }>>;
  storeSlug?: string | null;
  onAdicionarContato: () => void;
  onRemoverContato: (indice: number) => void;
  onCarregarLista: (id: string) => void;
  onCarregarContatosDoSistema: () => void;
  onUsarAudiencia: (contatos: SystemContact[]) => void;
  onAbrirImportacao: (aberto: boolean) => void;
}

/**
 * Quem vai receber.
 *
 * Três portas: a audiência do sistema (quem já comprou), uma lista salva, ou
 * digitado/colado à mão. A dedupla de quem entra por aqui vive em
 * `campanha/contatosDoCsv` — repetido é mensagem paga duas vezes e cliente
 * recebendo a promoção em dobro.
 */
export const PassoDosDestinatarios: React.FC<Props> = ({
  formData,
  setFormData,
  contactLists,
  newContact,
  setNewContact,
  storeSlug,
  onAdicionarContato,
  onRemoverContato,
  onCarregarLista,
  onCarregarContatosDoSistema,
  onUsarAudiencia,
  onAbrirImportacao,
}) => (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-fg-token mb-2">
              Adicione os Destinatários
            </h2>
            <p className="text-fg-muted-token">
              Adicione os contatos que receberão a mensagem
            </p>
          </div>

          {/* Add Contact Form */}
          <Card className="p-4">
            <h3 className="font-medium text-fg-token mb-3">Adicionar Contato</h3>
            <div className="flex gap-3">
              <Input
                value={newContact.phone}
                onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Telefone (ex: 5511999999999)"
                className="flex-1"
              />
              <Input
                value={newContact.name}
                onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome (opcional)"
                className="flex-1"
              />
              <Button onClick={onAdicionarContato} aria-label="Adicionar contato">
                <PlusIcon className="w-5 h-5" />
              </Button>
            </div>
          </Card>

          {/* Segmentação: a escolha de QUEM recebe.
              Vem antes de adicionar contato à mão porque é o caminho que
              deveria ser usado — digitar telefone um a um é a exceção. */}
          <SeletorDeAudiencia
            accountId={formData.accountId || undefined}
            storeSlug={storeSlug || undefined}
            onUsarAudiencia={onUsarAudiencia}
          />

          {/* Import Options */}
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={onCarregarContatosDoSistema}>
              <UserGroupIcon className="w-5 h-5 mr-2" />
              Escolher um a um
            </Button>
            
            <Button variant="secondary" onClick={() => onAbrirImportacao(true)}>
              <ArrowUpTrayIcon className="w-5 h-5 mr-2" />
              Importar CSV
            </Button>
            
            {contactLists.length > 0 && (
              <select
                onChange={(e) => e.target.value && onCarregarLista(e.target.value)}
                className="px-3 py-2 border border-border-token rounded-lg bg-surface dark:bg-[var(--dark-bg-hover,#161616)] text-fg-token"
                defaultValue=""
              >
                <option value="">Carregar lista salva...</option>
                {contactLists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name} ({list.contact_count} contatos)
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Contact List */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-fg-token">
                Contatos ({formData.contacts.length})
              </h3>
              {formData.contacts.length > 0 && (
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => setFormData(prev => ({ ...prev, contacts: [] }))}
                >
                  Limpar Todos
                </Button>
              )}
            </div>

            {formData.contacts.length === 0 ? (
              <div className="text-center py-8 text-fg-muted-token">
                <UserGroupIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Nenhum contato adicionado</p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2">
                {formData.contacts.map((contact, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-surface-2 rounded-lg"
                  >
                    <div>
                      <span className="font-medium text-fg-token">
                        {contact.phone}
                      </span>
                      {contact.name && (
                        <span className="text-fg-muted-token ml-2">
                          ({contact.name})
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => onRemoverContato(index)}
                      className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      aria-label={`Remover contato ${contact.phone}`}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
);
