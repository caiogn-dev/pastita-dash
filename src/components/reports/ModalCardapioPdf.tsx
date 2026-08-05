/**
 * Escolha das categorias que entram no cardápio em PDF.
 *
 * Nem todo produto ativo é item de cardápio: numa loja de saladas montáveis,
 * "Alface" e "Repolho" são INGREDIENTES do builder e ficam no catálogo ao lado
 * das saladas prontas. Não existe campo no modelo que separe os dois, e toda
 * heurística testada errou — na Cê Saladas, são as SALADAS que aparecem como
 * opção de combo, não os ingredientes. Então quem decide é o dono.
 *
 * A escolha fica no localStorage por loja: quem monta o cardápio uma vez não
 * repete o trabalho todo mês.
 */
import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Modal, Button } from '../common';
import * as storesApi from '../../services/storesApi';
import type { StoreCategory } from '../../services/storesApi';
import { reportsService } from '../../services/reports';

const chaveMemoria = (storeId: string) => `cardapio-pdf:categorias:${storeId}`;

interface Props {
  aberto: boolean;
  onFechar: () => void;
  storeId?: string;
}

const ModalCardapioPdf: React.FC<Props> = ({ aberto, onFechar, storeId }) => {
  const [categorias, setCategorias] = useState<StoreCategory[]>([]);
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!aberto || !storeId) return;
    setCarregando(true);
    storesApi
      .getCategories(storeId)
      .then((resp) => {
        const lista = Array.isArray(resp) ? resp : resp?.results ?? [];
        setCategorias(lista);
        // Restaura a escolha anterior; na primeira vez, tudo marcado.
        let salvo: string[] | null = null;
        try {
          const bruto = localStorage.getItem(chaveMemoria(storeId));
          salvo = bruto ? JSON.parse(bruto) : null;
        } catch { /* storage indisponível */ }
        setMarcadas(new Set(salvo ?? lista.map((c) => c.slug)));
      })
      .catch(() => setCategorias([]))
      .finally(() => setCarregando(false));
  }, [aberto, storeId]);

  const alternar = (slug: string) => {
    setMarcadas((prev) => {
      const proximo = new Set(prev);
      if (proximo.has(slug)) proximo.delete(slug);
      else proximo.add(slug);
      return proximo;
    });
  };

  const todasMarcadas = categorias.length > 0 && marcadas.size === categorias.length;

  const [gerando, setGerando] = useState(false);

  const gerar = async () => {
    if (storeId) {
      try {
        localStorage.setItem(chaveMemoria(storeId), JSON.stringify([...marcadas]));
      } catch { /* storage indisponível */ }
    }
    setGerando(true);
    try {
      // Nenhum filtro quando tudo está marcado: URL mais curta e o backend
      // devolve o catálogo inteiro pelo caminho padrão.
      await reportsService.abrirCardapioPdf(todasMarcadas ? undefined : [...marcadas]);
      onFechar();
    } catch (e) {
      console.error('[cardapio-pdf]', e);
      toast.error('Não foi possível gerar o cardápio. Tente de novo.');
    } finally {
      setGerando(false);
    }
  };

  const nenhuma = marcadas.size === 0;

  return (
    <Modal isOpen={aberto} onClose={onFechar} title="Cardápio em PDF">
      <div className="space-y-4">
        <p className="text-sm text-fg-muted">
          Escolha o que entra no cardápio. Itens que são só ingredientes do
          montador (alface, repolho…) normalmente ficam de fora.
        </p>

        {carregando ? (
          <p className="text-sm text-fg-muted">Carregando categorias…</p>
        ) : categorias.length === 0 ? (
          <p className="text-sm text-fg-muted">Nenhuma categoria encontrada.</p>
        ) : (
          <>
            <button
              type="button"
              onClick={() =>
                setMarcadas(todasMarcadas ? new Set() : new Set(categorias.map((c) => c.slug)))
              }
              className="text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
            >
              {todasMarcadas ? 'Desmarcar todas' : 'Marcar todas'}
            </button>

            <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-border-primary p-2">
              {categorias.map((cat) => (
                <label
                  key={cat.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-bg-secondary"
                >
                  <input
                    type="checkbox"
                    checked={marcadas.has(cat.slug)}
                    onChange={() => alternar(cat.slug)}
                    className="h-4 w-4 rounded border-border-primary text-primary-600"
                  />
                  <span className="text-sm text-fg-primary">{cat.name}</span>
                </label>
              ))}
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onFechar}>Cancelar</Button>
          <Button onClick={() => void gerar()} disabled={nenhuma || gerando}>
            {gerando ? 'Gerando…' : nenhuma ? 'Escolha ao menos uma' : 'Gerar PDF'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ModalCardapioPdf;
