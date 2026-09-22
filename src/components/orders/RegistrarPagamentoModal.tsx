/**
 * Registrar pagamento recebido fora do sistema.
 *
 * Pedido de balcão pago em dinheiro (ou na maquininha) ficava "Falta receber"
 * para sempre: o único botão era "Pagamento lançado", tudo ou nada, sem valor
 * nem forma. Aqui o dono diz COMO e QUANTO — e o parcial continua parcial.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Button, Modal } from '../common';
import { ordersService, getErrorMessage } from '../../services';
import type { Order } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { FORMAS_DE_REGISTRO } from '../../pages/orders/saldoDoPedido';

interface PedidoParaRegistro {
  id: string;
  order_number?: string;
  status?: string;
  total?: number | string | null;
  amount_paid?: number | string | null;
  amount_due?: number | string | null;
}

interface Props {
  isOpen: boolean;
  order: PedidoParaRegistro;
  storeSlug?: string;
  onClose: () => void;
  onRegistrado: (order: Order) => void;
}

const novaChave = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function RegistrarPagamentoModal({ isOpen, order, storeSlug, onClose, onRegistrado }: Props) {
  const falta = Number(order.amount_due ?? 0) || 0;
  const [forma, setForma] = useState('cash');
  const [valor, setValor] = useState(String(falta));
  const [observacao, setObservacao] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  // Trava síncrona: o `enviando` do estado só existe no próximo render, e o
  // segundo clique do duplo clique chega antes dele.
  const emVoo = useRef(false);
  // Uma chave por abertura: reenviar o mesmo formulário é o mesmo registro.
  const chave = useMemo(() => (isOpen ? novaChave() : ''), [isOpen, order.id]);

  useEffect(() => {
    if (isOpen) {
      setForma('cash');
      setValor(String(falta));
      setObservacao('');
      setErro('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, order.id]);

  const enviar = async () => {
    if (emVoo.current) return;
    const numero = Number(valor.trim().replace(',', '.'));
    if (!Number.isFinite(numero) || numero <= 0) {
      setErro('Informe um valor maior que zero.');
      return;
    }
    if (numero > falta + 0.001) {
      setErro(`Falta receber ${formatCurrency(falta)} — registre no máximo esse valor (troco não entra).`);
      return;
    }
    setErro('');
    emVoo.current = true;
    setEnviando(true);
    try {
      const { order: atualizado } = await ordersService.registrarPagamento(
        order.id,
        {
          payment_method: forma,
          amount: Math.round(numero * 100) / 100,
          idempotency_key: chave,
          ...(observacao.trim() ? { observacao: observacao.trim() } : {}),
        },
        storeSlug,
      );
      toast.success(
        Number(atualizado.amount_due ?? 0) > 0
          ? `Registrado. Ainda falta ${formatCurrency(Number(atualizado.amount_due))}.`
          : 'Pagamento registrado. Pedido quitado.',
      );
      onRegistrado(atualizado);
      onClose();
    } catch (e) {
      setErro(getErrorMessage(e) || 'Não foi possível registrar o pagamento.');
    } finally {
      emVoo.current = false;
      setEnviando(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar pagamento" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-fg-muted-token">
          Pedido #{order.order_number} · falta receber{' '}
          <strong className="text-fg-token">{formatCurrency(falta)}</strong>
        </p>

        <fieldset>
          <legend className="mb-2 text-xs font-semibold text-fg-muted-token">Como o cliente pagou</legend>
          <div role="radiogroup" className="grid grid-cols-2 gap-2">
            {FORMAS_DE_REGISTRO.map((f) => (
              <label
                key={f.valor}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                  forma === f.valor
                    ? 'border-[var(--brand)] bg-brand-soft font-semibold text-fg-token'
                    : 'border-border-token text-fg-token hover:bg-surface-2'
                }`}
              >
                <input
                  type="radio"
                  name="forma-de-pagamento"
                  value={f.valor}
                  checked={forma === f.valor}
                  onChange={() => setForma(f.valor)}
                  aria-label={f.rotulo}
                  className="sr-only"
                />
                {f.rotulo}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="valor-recebido" className="mb-1 block text-xs font-semibold text-fg-muted-token">
            Valor recebido (R$)
          </label>
          <input
            id="valor-recebido"
            aria-label="Valor recebido"
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="w-full superficie px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
          />
          <p className="mt-1 text-xs text-fg-muted-token">
            Menos que o total deixa o pedido com saldo a receber.
          </p>
        </div>

        <div>
          <label htmlFor="obs-pagamento" className="mb-1 block text-xs font-semibold text-fg-muted-token">
            Observação (opcional)
          </label>
          <input
            id="obs-pagamento"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Ex.: maquininha do balcão"
            className="w-full superficie px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
          />
        </div>

        {erro && (
          <p role="alert" className="rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
            {erro}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={enviar} isLoading={enviando}>
            Registrar pagamento
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default RegistrarPagamentoModal;
