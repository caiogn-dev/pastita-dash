import React, { useCallback, useEffect, useRef, useState } from 'react';
import { QrCodeIcon } from '@heroicons/react/24/outline';

import { PageShell } from '../../components/ui';
import { useStore } from '../../hooks';
import { getErrorMessage } from '../../services';
import { getOrders, updateOrderStatus } from '../../services/storesApi';
import type { Order } from '../../types';
import { acaoDaBipagem, codigoBipado, ehBipagemRepetida, pedidoDoCodigo } from './bipagem';

interface Registro {
  id: number;
  codigo: string;
  tipo: 'ok' | 'erro';
  texto: string;
  quando: string;
}

/**
 * Expedição — bipar o código de barras da comanda avança o pedido para a
 * saída (pronto p/ retirada, saiu para entrega ou entregue).
 *
 * O leitor USB é um teclado: digita o número e aperta Enter. Por isso a tela é
 * um campo só, sempre com foco. O próximo passo vem da máquina de estados
 * única (`proximaAcao.ts`, via `bipagem.ts`) — esta tela não conhece status.
 */
const ExpedicaoPage: React.FC = () => {
  const { storeId, storeSlug } = useStore();
  const loja = storeSlug || storeId || undefined;
  const [valor, setValor] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const campo = useRef<HTMLInputElement>(null);
  const ultima = useRef<{ codigo: string; em: number } | null>(null);
  const seq = useRef(0);

  const focar = useCallback(() => campo.current?.focus(), []);
  useEffect(() => { focar(); }, [focar]);

  const registrar = (codigo: string, tipo: Registro['tipo'], texto: string) => {
    seq.current += 1;
    const quando = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setRegistros((atual) => [{ id: seq.current, codigo, tipo, texto, quando }, ...atual].slice(0, 30));
  };

  const processar = async (bruto: string) => {
    const codigo = codigoBipado(bruto);
    if (!codigo) return;
    const agora = Date.now();
    if (ocupado || ehBipagemRepetida(ultima.current, codigo, agora)) return;
    ultima.current = { codigo, em: agora };

    setOcupado(true);
    try {
      const resposta = await getOrders({ store: loja, search: codigo, page_size: 5 });
      const pedido = pedidoDoCodigo(resposta.results as unknown as Order[], codigo);
      if (!pedido) {
        registrar(codigo, 'erro', 'Nenhum pedido com este código nesta loja.');
        return;
      }
      const acao = acaoDaBipagem(pedido);
      if (acao.tipo === 'recusa') {
        registrar(codigo, 'erro', `${pedido.customer_name || 'Cliente'}: ${acao.motivo}`);
        return;
      }
      await updateOrderStatus(pedido.id, acao.status);
      registrar(codigo, 'ok', `${pedido.customer_name || 'Cliente'}: ${acao.rotulo}`);
    } catch (erro) {
      registrar(codigo, 'erro', getErrorMessage(erro));
    } finally {
      setOcupado(false);
      focar();
    }
  };

  const aoEnviar = (evento: React.FormEvent) => {
    evento.preventDefault();
    const bruto = valor;
    setValor('');
    void processar(bruto);
  };

  const ultimo = registros[0];

  return (
    <PageShell
      titulo="Expedição"
      descricao="Bipe o código de barras da comanda: o pedido avança para pronto, saiu para entrega ou entregue."
    >
      <form onSubmit={aoEnviar} className="max-w-xl" onClick={focar}>
        <label htmlFor="codigo-bipado" className="mb-2 flex items-center gap-2 text-sm font-medium text-fg-token">
          <QrCodeIcon className="h-5 w-5" />
          Código do pedido
        </label>
        <input
          id="codigo-bipado"
          ref={campo}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onBlur={() => window.setTimeout(focar, 150)}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="Bipe ou digite e aperte Enter"
          className="w-full rounded-lg border-2 border-border-token bg-surface px-4 py-3 font-mono text-2xl text-fg-token focus:border-brand focus:outline-none"
        />
        {ocupado && <p className="mt-2 text-sm text-fg-muted-token">Procurando pedido…</p>}
      </form>

      {ultimo && (
        <div
          role="status"
          className={`mt-6 max-w-xl rounded-xl px-5 py-4 text-lg font-semibold ${
            ultimo.tipo === 'ok'
              ? 'bg-[var(--success-soft)] text-[var(--success)]'
              : 'bg-[var(--danger-soft)] text-[var(--danger)]'
          }`}
        >
          <span className="font-mono">{ultimo.codigo}</span> — {ultimo.texto}
        </div>
      )}

      {registros.length > 1 && (
        <ul className="mt-6 max-w-xl divide-y divide-border-token rounded-xl border border-border-token bg-surface">
          {registros.slice(1).map((r) => (
            <li key={r.id} className="flex items-baseline gap-3 px-4 py-2 text-sm">
              <span className="text-fg-muted-token">{r.quando}</span>
              <span className="font-mono">{r.codigo}</span>
              <span className={r.tipo === 'ok' ? 'text-fg-token' : 'text-[var(--danger)]'}>{r.texto}</span>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
};

export default ExpedicaoPage;
