/**
 * Reajuste de preço em massa — escolher itens, somar ou reduzir em R$ ou %,
 * ver a prévia (antes → depois) e aplicar. Pedido do dono (06/10), visto no
 * Prefiro: reajustar o cardápio era abrir produto por produto.
 *
 * O servidor é quem decide (server2 7ee4e27): tudo ou nada, preço que ficaria
 * zerado trava e diz quais itens, avisos de promoção/"de" acima do novo preço.
 */
import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { Badge, Button, Modal, ModalBody, ModalFooter } from '../../../components/ui';
import { reajusteDePrecoService, type ItemReajustado, type Modo, type Operacao } from '../../../services/reajusteDePreco';
import { getErrorMessage } from '../../../services/api';
import type { Product } from '../../../services/products';
import type { StoreCategory } from '../../../services/storesApi';
import { cn } from '../../../utils/cn';

const reais = (v: string | number) =>
  `R$ ${Number(v).toFixed(2).replace('.', ',')}`;

interface Props {
  isOpen: boolean;
  loja: string;
  produtos: Product[];
  categorias: StoreCategory[];
  onClose: () => void;
  onAplicado: () => void;
}

const Alternar: React.FC<{ opcoes: { valor: string; rotulo: string }[]; valor: string; onMudar: (v: string) => void; rotulo: string }> = ({ opcoes, valor, onMudar, rotulo }) => (
  <div role="group" aria-label={rotulo} className="inline-flex rounded-lg border border-[var(--border)] p-0.5">
    {opcoes.map((o) => (
      <button
        key={o.valor}
        type="button"
        aria-pressed={valor === o.valor}
        onClick={() => onMudar(o.valor)}
        className={cn('rounded-md px-3 py-1 text-sm', valor === o.valor ? 'bg-brand text-on-brand' : 'text-fg-muted-token')}
      >
        {o.rotulo}
      </button>
    ))}
  </div>
);

export const ReajusteDePrecoModal: React.FC<Props> = ({ isOpen, loja, produtos, categorias, onClose, onAplicado }) => {
  const [operacao, setOperacao] = useState<Operacao>('acrescentar');
  const [modo, setModo] = useState<Modo>('percentual');
  const [valor, setValor] = useState('');
  const [busca, setBusca] = useState('');
  const [escolhidos, setEscolhidos] = useState<Set<string>>(new Set());
  const [previa, setPrevia] = useState<ItemReajustado[] | null>(null);
  const [recusados, setRecusados] = useState<{ nome: string; antes: string }[]>([]);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const porCategoria = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const visiveis = produtos.filter((p) => !termo || p.name.toLowerCase().includes(termo));
    const grupos = categorias.map((c) => ({ id: c.id, nome: c.name, itens: visiveis.filter((p) => p.category === c.id) }));
    const semCategoria = visiveis.filter((p) => !categorias.some((c) => c.id === p.category));
    if (semCategoria.length) grupos.push({ id: 'sem', nome: 'Sem categoria', itens: semCategoria });
    return grupos.filter((g) => g.itens.length);
  }, [produtos, categorias, busca]);

  const limparResultado = () => { setPrevia(null); setRecusados([]); setErro(''); };

  const alternarProduto = (id: string) => {
    limparResultado();
    setEscolhidos((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const alternarCategoria = (ids: string[]) => {
    limparResultado();
    setEscolhidos((s) => {
      const n = new Set(s);
      const todos = ids.every((id) => n.has(id));
      ids.forEach((id) => (todos ? n.delete(id) : n.add(id)));
      return n;
    });
  };

  const pedir = async (ehPrevia: boolean) => {
    setOcupado(true);
    setErro('');
    setRecusados([]);
    try {
      const r = await reajusteDePrecoService.reajustar({
        store: loja, operacao, modo, valor: valor.replace(',', '.'), produtos: [...escolhidos], previa: ehPrevia,
      });
      if (ehPrevia) {
        setPrevia(r.itens);
      } else {
        toast.success(`${r.itens.length} preço${r.itens.length === 1 ? '' : 's'} reajustado${r.itens.length === 1 ? '' : 's'}.`);
        onAplicado();
        onClose();
      }
    } catch (e) {
      const dados = (e as { response?: { data?: { error?: string; recusados?: { nome: string; antes: string }[] } } })?.response?.data;
      setPrevia(null);
      setRecusados(dados?.recusados ?? []);
      setErro(dados?.error || getErrorMessage(e));
    } finally {
      setOcupado(false);
    }
  };

  const valorOk = Number(valor.replace(',', '.')) > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reajustar preços" size="lg">
      <ModalBody className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <Alternar rotulo="Operação" valor={operacao} onMudar={(v) => { setOperacao(v as Operacao); limparResultado(); }}
            opcoes={[{ valor: 'acrescentar', rotulo: 'Acrescentar' }, { valor: 'reduzir', rotulo: 'Reduzir' }]} />
          <Alternar rotulo="Modo" valor={modo} onMudar={(v) => { setModo(v as Modo); limparResultado(); }}
            opcoes={[{ valor: 'percentual', rotulo: '%' }, { valor: 'valor', rotulo: 'R$' }]} />
          <label className="flex flex-col text-sm text-fg-muted-token">
            Valor
            <input
              inputMode="decimal"
              className="mt-1 w-28 rounded border px-3 py-1.5 text-fg-token"
              value={valor}
              onChange={(e) => { setValor(e.target.value); limparResultado(); }}
              placeholder={modo === 'percentual' ? '10' : '2,00'}
            />
          </label>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="search"
            aria-label="Buscar produto para reajustar"
            placeholder="Buscar produto…"
            className="flex-1 rounded border px-3 py-1.5"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <span className="text-sm text-fg-muted-token">{escolhidos.size} escolhido{escolhidos.size === 1 ? '' : 's'}</span>
        </div>

        <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
          {porCategoria.map((g) => {
            const ids = g.itens.map((p) => String(p.id));
            const todos = ids.every((id) => escolhidos.has(id));
            return (
              <fieldset key={g.id}>
                <label className="flex items-center gap-2 text-sm font-semibold text-fg-token">
                  <input type="checkbox" checked={todos} onChange={() => alternarCategoria(ids)} aria-label={`${g.nome} (categoria inteira)`} />
                  {g.nome}
                </label>
                <div className="mt-1 space-y-1 pl-6">
                  {g.itens.map((p) => (
                    <label key={p.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-2">
                        <input type="checkbox" checked={escolhidos.has(String(p.id))} onChange={() => alternarProduto(String(p.id))} aria-label={p.name} />
                        {p.name}
                      </span>
                      <span className="tabular-nums text-fg-muted-token">{reais(p.price)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            );
          })}
        </div>

        {erro && (
          <div role="alert" className="rounded border border-[var(--danger)] p-3 text-sm text-danger-token">
            <p>{erro}</p>
            {recusados.length > 0 && (
              <ul className="mt-1 list-disc pl-5">
                {recusados.map((r) => <li key={r.nome}>{r.nome} (hoje {reais(r.antes)})</li>)}
              </ul>
            )}
          </div>
        )}

        {previa && (
          <section aria-label="Prévia do reajuste" className="space-y-1 rounded border border-[var(--border)] p-3">
            {previa.map((i) => (
              <div key={i.id} className="text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-fg-token">{i.nome}</span>
                  <span className="tabular-nums">{`${reais(i.antes)} → ${reais(i.depois)}`}</span>
                </div>
                {i.variantes.map((v) => (
                  <div key={v.nome} className="flex justify-between gap-2 pl-4 text-xs text-fg-muted-token">
                    <span>{v.nome}</span><span className="tabular-nums">{`${reais(v.antes)} → ${reais(v.depois)}`}</span>
                  </div>
                ))}
                {i.avisos.map((a) => <Badge key={a} tone="warning" className="mt-1">{a}</Badge>)}
              </div>
            ))}
          </section>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        {previa ? (
          <Button onClick={() => void pedir(false)} isLoading={ocupado}>
            Aplicar em {previa.length} {previa.length === 1 ? 'item' : 'itens'}
          </Button>
        ) : (
          <Button onClick={() => void pedir(true)} isLoading={ocupado} disabled={!escolhidos.size || !valorOk}>
            Ver prévia
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
};

export default ReajusteDePrecoModal;
