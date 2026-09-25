import React from 'react';

import {
  ArrowUpTrayIcon,
  PlusIcon,
  TrashIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

import { SeletorDeAudiencia } from '../../SeletorDeAudiencia';
import type { SystemContact } from '../../../../../services/campaigns';
import { Button, Input, Select } from '../../../../../components/ui';

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
 * digitado/colado à mão. A audiência vem primeiro porque é o caminho certo;
 * digitar telefone um a um é a exceção. A dedupla de quem entra por aqui vive
 * em `campanha/contatosDoCsv` — repetido é mensagem paga duas vezes.
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
}) => {
  const total = formData.contacts.length;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h2 className="text-lg font-semibold text-fg-token">Escolha quem recebe</h2>
        <p className="mt-1 text-body text-fg-muted-token">
          Filtre sua base de clientes, importe uma lista ou digite os números.
        </p>
      </header>

      <SeletorDeAudiencia
        accountId={formData.accountId || undefined}
        storeSlug={storeSlug || undefined}
        onUsarAudiencia={onUsarAudiencia}
      />

      <section aria-labelledby="outras-formas" className="flex flex-col gap-3">
        <h3 id="outras-formas" className="text-body font-semibold text-fg-token">
          Outras formas de adicionar
        </h3>

        {/* Form de verdade: Enter no telefone adiciona, sem caçar o botão. */}
        <form
          className="flex flex-wrap items-start gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            onAdicionarContato();
          }}
        >
          <div className="min-w-[12rem] flex-1">
            <Input
              aria-label="Telefone"
              inputMode="tel"
              autoComplete="off"
              value={newContact.phone}
              onChange={(e) => setNewContact((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="Telefone (ex: 5511999999999)"
            />
          </div>
          <div className="min-w-[10rem] flex-1">
            <Input
              aria-label="Nome (opcional)"
              autoComplete="off"
              value={newContact.name}
              onChange={(e) => setNewContact((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Nome (opcional)"
            />
          </div>
          <Button type="submit" variant="outline" aria-label="Adicionar contato">
            <PlusIcon className="h-5 w-5" aria-hidden />
          </Button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={onCarregarContatosDoSistema}
            leftIcon={<UserGroupIcon className="h-5 w-5" aria-hidden />}
          >
            Escolher um a um
          </Button>
          <Button
            variant="outline"
            onClick={() => onAbrirImportacao(true)}
            leftIcon={<ArrowUpTrayIcon className="h-5 w-5" aria-hidden />}
          >
            Importar CSV
          </Button>
          {contactLists.length > 0 && (
            <Select
              className="min-w-[14rem]"
              rotuloOculto="Carregar lista salva"
              vazio="Carregar lista salva…"
              valor=""
              onMudar={(id) => id && onCarregarLista(id)}
              opcoes={contactLists.map((l) => ({
                valor: l.id,
                rotulo: `${l.name} (${l.contact_count} contatos)`,
              }))}
            />
          )}
        </div>
      </section>

      <section aria-labelledby="na-lista" className="superficie p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 id="na-lista" className="text-body font-semibold text-fg-token">
            Na lista <span className="tabular-nums text-fg-muted-token">({total})</span>
          </h3>
          {total > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFormData((prev) => ({ ...prev, contacts: [] }))}
            >
              Limpar lista
            </Button>
          )}
        </div>

        {total === 0 ? (
          <div className="flex flex-col items-center gap-1.5 py-6 text-center">
            <UserGroupIcon className="h-8 w-8 text-fg-muted-token" aria-hidden />
            <p className="text-body font-medium text-fg-token">Ninguém na lista ainda</p>
            <p className="text-caption text-fg-muted-token">
              Use um filtro acima ou adicione um número.
            </p>
          </div>
        ) : (
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {formData.contacts.map((contact, index) => (
              <li
                key={`${contact.phone}-${index}`}
                className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-2"
              >
                <div className="min-w-0">
                  <span className="font-medium tabular-nums text-fg-token">{contact.phone}</span>
                  {contact.name && (
                    <span className="ml-2 truncate text-fg-muted-token">{contact.name}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onRemoverContato(index)}
                  className="rounded p-1.5 text-fg-muted-token transition-colors hover:bg-danger-soft hover:text-danger-token focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  aria-label={`Remover contato ${contact.phone}`}
                >
                  <TrashIcon className="h-4 w-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
