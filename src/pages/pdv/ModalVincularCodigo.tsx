/**
 * O código bipado não bateu com nenhum produto — vincular na hora.
 *
 * Saiu da `PdvBalcaoPage` junto com os outros modais: a tela do balcão fica
 * com o que é fluxo de venda, e cada interrupção (código desconhecido, cliente,
 * QR do PIX) vira um pedaço fechado com entrada e saída explícitas.
 *
 * O balcão vende itens de mais de uma loja na mesma comanda, por isso o
 * candidato carrega o nome da loja — mas só mostra quando há mais de uma, senão
 * é uma coluna repetindo a mesma palavra em toda linha.
 */
import React from 'react';

import { Modal, ModalBody, ModalHeader, SearchInput } from '../../components/ui';

export interface CandidatoDeVinculo {
  product: { id: string; name: string; price: number | string; barcode?: string };
  storeName: string;
}

export interface ModalVincularCodigoProps {
  /** `null` = fechado. */
  codigo: string | null;
  onFechar: () => void;
  busca: string;
  onBuscar: (valor: string) => void;
  candidatos: CandidatoDeVinculo[];
  onEscolher: (candidato: CandidatoDeVinculo) => void;
  vinculando: boolean;
  /** Quantas lojas o usuário opera — abaixo de 2 o nome da loja é ruído. */
  totalDeLojas: number;
  formatarValor: (valor: number) => string;
}

export const ModalVincularCodigo: React.FC<ModalVincularCodigoProps> = ({
  codigo,
  onFechar,
  busca,
  onBuscar,
  candidatos,
  onEscolher,
  vinculando,
  totalDeLojas,
  formatarValor,
}) => (
  <Modal isOpen={codigo !== null} onClose={onFechar}>
    <ModalHeader title="Código não cadastrado" />
    <ModalBody>
      <p className="mb-3 text-sm">
        O código <span className="font-mono font-semibold">{codigo}</span> não
        está vinculado a nenhum produto. Escolha o produto pra vincular — o próximo
        bipe já entra direto.
      </p>

      <SearchInput
        autoFocus
        placeholder="Buscar produto por nome…"
        value={busca}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onBuscar(e.target.value)}
      />

      <ul className="mt-3 max-h-64 divide-y divide-[color:var(--border)] overflow-y-auto">
        {candidatos.map((c) => (
          <li key={c.product.id}>
            <button
              type="button"
              disabled={vinculando}
              onClick={() => onEscolher(c)}
              className="flex w-full items-center justify-between gap-2 rounded px-2 py-2.5 text-left transition-colors hover:bg-surface-2 disabled:opacity-60"
            >
              <span className="min-w-0">
                <span className="block truncate">{c.product.name}</span>
                {totalDeLojas > 1 && (
                  <span className="block text-xs text-fg-muted-token">{c.storeName}</span>
                )}
              </span>
              <span className="shrink-0 text-sm text-fg-muted-token">
                {formatarValor(Number(c.product.price))}
                {c.product.barcode ? ' · já tem código' : ''}
              </span>
            </button>
          </li>
        ))}
        {candidatos.length === 0 && (
          <li className="py-4 text-center text-sm text-fg-muted-token">Nenhum produto encontrado</li>
        )}
      </ul>
    </ModalBody>
  </Modal>
);

export default ModalVincularCodigo;
