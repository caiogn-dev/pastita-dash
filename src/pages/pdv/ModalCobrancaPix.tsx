/**
 * O QR do PIX depois de fechar a venda no balcão.
 *
 * Saiu de dentro da `PdvBalcaoPage` (735 linhas) porque é um pedaço fechado: a
 * tela do balcão precisa saber vender, e não precisa saber desenhar QR. O que
 * entra aqui são as cobranças e o que sai é o fechar — nada de estado próprio.
 *
 * Uma comanda pode virar mais de um pedido (itens de lojas diferentes), então
 * a lista é plural por natureza: cada loja tem o seu QR e o seu "pago".
 */
import React from 'react';
import { CheckCircleIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';

import { Button, Modal, ModalBody, ModalHeader } from '../../components/ui';

export interface CobrancaPix {
  storeName: string;
  paid: boolean;
  order: {
    id: string;
    order_number: string;
    total: number | string;
    pix_qr_code?: string;
    pix_code?: string;
    payment_error?: string;
  };
}

export interface ModalCobrancaPixProps {
  /** `null` = fechado. */
  cobrancas: CobrancaPix[] | null;
  onFechar: () => void;
  onCopiar: (codigo?: string) => void;
  formatarValor: (valor: number) => string;
}

export const ModalCobrancaPix: React.FC<ModalCobrancaPixProps> = ({
  cobrancas,
  onFechar,
  onCopiar,
  formatarValor,
}) => {
  const tudoPago = (cobrancas ?? []).every((c) => c.paid);

  return (
    <Modal isOpen={cobrancas !== null} onClose={onFechar}>
      <ModalHeader title="Cobrança PIX" />
      <ModalBody>
        <p className="mb-4 text-sm text-fg-muted-token">
          Mostre o QR pro cliente pagar. O status atualiza sozinho quando o PIX cair.
        </p>

        <div className="space-y-5" data-testid="pdv-pix-charges">
          {(cobrancas ?? []).map((c) => (
            <div key={c.order.id} className="rounded border border-border-token p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="font-semibold text-fg-token">
                  {c.storeName}
                  <span className="font-normal text-fg-muted-token">
                    {' '}— {formatarValor(Number(c.order.total))}
                  </span>
                </div>
                {c.paid ? (
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--success)]">
                    <CheckCircleIcon className="h-5 w-5" /> Pago
                  </span>
                ) : (
                  <span className="text-sm text-fg-muted-token">Aguardando…</span>
                )}
              </div>

              {!c.paid && c.order.pix_qr_code && (
                <img
                  src={`data:image/png;base64,${c.order.pix_qr_code}`}
                  alt={`QR Code PIX de ${c.storeName}`}
                  className="mx-auto mb-3 h-52 w-52 rounded bg-surface p-2"
                />
              )}

              {!c.paid && c.order.pix_code && (
                <Button variant="secondary" className="w-full" onClick={() => onCopiar(c.order.pix_code)}>
                  <ClipboardDocumentIcon className="mr-1.5 h-4 w-4" /> Copiar código PIX
                </Button>
              )}

              {!c.paid && !c.order.pix_code && (
                <p className="text-sm text-[var(--danger)]">
                  O QR não foi gerado ({String(c.order.payment_error || 'erro no provedor')}).
                  Abra o pedido {c.order.order_number} e use “Gerar cobrança”.
                </p>
              )}
            </div>
          ))}
        </div>

        <Button variant="secondary" className="mt-4 w-full" onClick={onFechar}>
          {tudoPago ? 'Concluir' : 'Fechar (pedido fica aguardando pagamento)'}
        </Button>
      </ModalBody>
    </Modal>
  );
};

export default ModalCobrancaPix;
