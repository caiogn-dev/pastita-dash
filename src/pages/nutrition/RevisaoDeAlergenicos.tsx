import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api, { getErrorMessage, normalizePaginatedResponse } from '../../services/api';
import { Button, Card } from '../../components/ui';

interface Alergenico { valor: string; rotulo: string; gluten: boolean }
interface Pendente {
  id: string; display_name: string; store: string | null; source: string;
  allergens: string[]; may_contain: string[];
}

/**
 * Revisar alergênico de 51 ingredientes, um modal por vez, é onde a pessoa
 * desiste — e enquanto ela não termina, NENHUMA etiqueta declara alergênico,
 * porque a regra se recusa a afirmar em cima de cadastro não revisado.
 *
 * A maioria são alimentos íntegros da TACO e da POF: alface, cenoura, cebola.
 * Não têm alergênico nenhum. Mas "não tem" precisa ser dito, não deduzido do
 * silêncio — então o caminho rápido existe e é explícito, não automático.
 */
export default function RevisaoDeAlergenicos({ storeUuid, aoTerminar }: {
  storeUuid?: string; aoTerminar?: () => void;
}) {
  const [alergenicos, setAlergenicos] = useState<Alergenico[]>([]);
  const [pendentes, setPendentes] = useState<Pendente[]>([]);
  const [marcados, setMarcados] = useState<Record<string, string[]>>({});
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [listaAlerg, listaIng] = await Promise.all([
        api.get('/nutrition/alergenicos/'),
        api.get('/nutrition/ingredients/pendentes/', { params: { store: storeUuid } }),
      ]);
      setAlergenicos(listaAlerg.data.alergenicos || []);
      const itens = normalizePaginatedResponse<Pendente>(listaIng.data);
      setPendentes(itens);
      setMarcados(Object.fromEntries(itens.map((i) => [i.id, i.allergens || []])));
    } catch (e) { toast.error(getErrorMessage(e)); } finally { setCarregando(false); }
  }, [storeUuid]);

  useEffect(() => { carregar(); }, [carregar]);

  const alternar = (id: string, valor: string) => setMarcados((m) => {
    const atual = m[id] || [];
    return { ...m, [id]: atual.includes(valor) ? atual.filter((v) => v !== valor) : [...atual, valor] };
  });

  const alternarSelecao = (id: string) => setSelecionados((s) => {
    const novo = new Set(s);
    if (novo.has(id)) novo.delete(id); else novo.add(id);
    return novo;
  });

  const semAlergenico = useMemo(
    () => pendentes.filter((p) => !(marcados[p.id] || []).length).map((p) => p.id),
    [pendentes, marcados],
  );

  const confirmar = async (ids: string[]) => {
    if (!ids.length) return;
    setSalvando(true);
    let feitos = 0;
    for (const id of ids) {
      const pendente = pendentes.find((p) => p.id === id);
      if (!pendente) continue;
      try {
        // Alimento oficial não é editável: a loja adota uma cópia sua e
        // revisa nela, e as receitas dela passam a apontar para a cópia.
        let alvo = pendente.id;
        if (!pendente.store) {
          const { data } = await api.post(`/nutrition/ingredients/${pendente.id}/adotar/`, { store: storeUuid });
          alvo = data.id;
        }
        await api.patch(`/nutrition/ingredients/${alvo}/`, {
          allergens: marcados[id] || [], allergens_reviewed: true,
        });
        feitos += 1;
      } catch (e) { toast.error(`${pendente.display_name}: ${getErrorMessage(e)}`); }
    }
    setSalvando(false);
    if (feitos) {
      toast.success(`${feitos} ingrediente(s) revisado(s)`);
      setSelecionados(new Set());
      await carregar();
      aoTerminar?.();
    }
  };

  if (carregando) return <Card className="p-4 text-sm opacity-70">Carregando pendências…</Card>;

  if (!pendentes.length) {
    return (
      <Card className="p-4">
        <p className="font-medium">Alergênicos em dia</p>
        <p className="text-sm opacity-70">Todo ingrediente usado nas suas receitas já foi revisado.</p>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Revisar alergênicos</h2>
        <p className="text-sm opacity-70">
          {pendentes.length} ingredientes usados nas suas receitas ainda não foram conferidos. Enquanto
          houver um pendente, a etiqueta não declara alergênico — nem para dizer que não tem.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-black/10 p-3">
        <Button variant="secondary" disabled={salvando || !semAlergenico.length}
                onClick={() => confirmar(semAlergenico)}>
          Confirmar {semAlergenico.length} sem alergênico
        </Button>
        <span className="text-xs opacity-70">
          Alface, cenoura, cebola e afins não têm alergênico — mas isso precisa ser afirmado por você.
        </span>
        <div className="flex-1" />
        <Button disabled={salvando || !selecionados.size}
                onClick={() => confirmar([...selecionados])}>
          Revisar {selecionados.size || ''} selecionado(s)
        </Button>
      </div>

      <ul className="divide-y divide-black/10">
        {pendentes.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2">
            <input type="checkbox" aria-label={`Selecionar ${p.display_name}`}
                   checked={selecionados.has(p.id)} onChange={() => alternarSelecao(p.id)} />
            <span className="min-w-48 flex-1 text-sm">
              {p.display_name}
              {!p.store && <span className="ml-2 text-xs uppercase opacity-45">{p.source}</span>}
            </span>
            <div className="flex flex-wrap gap-1">
              {alergenicos.map((a) => {
                const on = (marcados[p.id] || []).includes(a.valor);
                return (
                  <button key={a.valor} type="button" aria-pressed={on}
                    onClick={() => alternar(p.id, a.valor)}
                    className={`rounded-full border px-2 py-0.5 text-xs ${on ? 'border-red-600 bg-red-600 text-white' : 'border-black/15 opacity-70 hover:opacity-100'}`}>
                    {a.rotulo}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
