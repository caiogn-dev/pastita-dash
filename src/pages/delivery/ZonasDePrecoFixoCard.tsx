/**
 * Cadastro das zonas de preço fixo — o recurso que existia e ninguém conseguia ligar.
 *
 * `metadata.fixed_price_zones` funciona no backend desde sempre: o endereço do
 * cliente é geocodificado ao contrário e casado contra as palavras-chave da
 * zona. Em 08/ago/2026 nenhuma loja tinha o campo preenchido, porque a única
 * forma de configurar era editar JSON direto no banco.
 *
 * As faixas por km da tabela acima resolvem a cidade. Esta seção resolve as
 * EXCEÇÕES — o condomínio longe onde a conta por km sairia absurda, o prédio
 * fechado onde o entregador perde dez minutos na portaria.
 *
 * A tela mostra o que o backend vai procurar (o nome + as palavras-chave),
 * porque a causa nº 1 de "cadastrei e não funcionou" é a zona nunca casar com
 * o endereço que o Google devolve.
 */
import React, { useState } from 'react';
import { PlusIcon, TrashIcon, MapPinIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { Card, Button } from '../../components/ui';
import {
  validarZona,
  zonaParaMetadata,
  zonasDoMetadata,
  type ZonaNoFormulario,
} from '../stores/zonasDePrecoFixo';

export interface ZonasDePrecoFixoCardProps {
  metadataAtual: Record<string, unknown> | undefined;
  onSalvar: (fixedPriceZones: unknown[]) => Promise<void>;
}

const inputCls =
  'w-full rounded-lg border border-border-token bg-surface px-3 py-2 text-sm text-fg-token ' +
  'outline-none focus:ring-2 focus:ring-brand';

export const ZonasDePrecoFixoCard: React.FC<ZonasDePrecoFixoCardProps> = ({
  metadataAtual,
  onSalvar,
}) => {
  const [zonas, setZonas] = useState<ZonaNoFormulario[]>(
    () => zonasDoMetadata(metadataAtual?.fixed_price_zones)
  );
  const [salvando, setSalvando] = useState(false);

  const mudar = (i: number, campo: keyof ZonaNoFormulario, valor: string) => {
    setZonas((atual) => atual.map((z, idx) => (idx === i ? { ...z, [campo]: valor } : z)));
  };

  const adicionar = () =>
    setZonas((atual) => [...atual, { nome: '', taxa: '', palavras: '', modo: 'fixo' }]);

  const remover = (i: number) => setZonas((atual) => atual.filter((_, idx) => idx !== i));

  const salvar = async () => {
    // Valida TODAS antes de salvar qualquer uma: salvar as válidas e reclamar
    // das outras deixaria metade da configuração no ar sem o dono perceber.
    for (const [i, z] of zonas.entries()) {
      const erro = validarZona(z);
      if (erro) {
        toast.error(`Zona ${i + 1}: ${erro}`);
        return;
      }
    }

    setSalvando(true);
    try {
      await onSalvar(zonas.map(zonaParaMetadata));
      toast.success(
        zonas.length === 0
          ? 'Zonas removidas — voltou a valer só a taxa por km.'
          : 'Zonas salvas. Vale no próximo pedido.'
      );
    } catch {
      toast.error('Não foi possível salvar as zonas.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Card className="p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-fg-token">Endereços com preço combinado</h2>
          <p className="mt-1 max-w-2xl text-sm text-fg-muted-token">
            As faixas acima resolvem a cidade; aqui ficam as exceções. Quando o endereço do
            cliente bate com uma destas zonas, o valor abaixo substitui (ou complementa) a
            taxa por quilômetro.
          </p>
        </div>
        <Button variant="secondary" leftIcon={<PlusIcon className="h-4 w-4" />} onClick={adicionar}>
          Adicionar zona
        </Button>
      </div>

      {zonas.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-border-token p-6 text-center">
          <MapPinIcon className="mx-auto mb-2 h-7 w-7 text-fg-muted-token" />
          <p className="text-sm font-semibold text-fg-token">Nenhuma zona cadastrada</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-fg-muted-token">
            Todo pedido usa a taxa por quilômetro. Cadastre uma zona quando um condomínio
            ou bairro precisar de um valor combinado — por exemplo, quando a conta por km
            ficaria cara demais para um lugar que você atende sempre.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {zonas.map((z, i) => (
            <div key={i} className="rounded-xl border border-border-token p-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[200px] flex-1">
                  <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-fg-muted-token" htmlFor={`zona-nome-${i}`}>
                    Nome da zona
                  </label>
                  <input
                    id={`zona-nome-${i}`}
                    className={inputCls}
                    placeholder="Ex.: Residencial Polinésia"
                    value={z.nome}
                    onChange={(e) => mudar(i, 'nome', e.target.value)}
                  />
                </div>

                <div className="w-[190px]">
                  <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-fg-muted-token" htmlFor={`zona-modo-${i}`}>
                    Como cobrar
                  </label>
                  <select
                    id={`zona-modo-${i}`}
                    className={inputCls}
                    value={z.modo ?? 'fixo'}
                    onChange={(e) => mudar(i, 'modo', e.target.value)}
                  >
                    <option value="fixo">Valor fixo</option>
                    <option value="acrescimo">Somar à taxa por km</option>
                  </select>
                </div>

                <div className="w-[140px]">
                  <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-fg-muted-token" htmlFor={`zona-valor-${i}`}>
                    {(z.modo ?? 'fixo') === 'fixo' ? 'Taxa (R$)' : 'Acréscimo (R$)'}
                  </label>
                  <input
                    id={`zona-valor-${i}`}
                    className={inputCls}
                    inputMode="decimal"
                    placeholder="15,00"
                    value={(z.modo ?? 'fixo') === 'fixo' ? z.taxa : (z.acrescimo ?? '')}
                    onChange={(e) =>
                      mudar(i, (z.modo ?? 'fixo') === 'fixo' ? 'taxa' : 'acrescimo', e.target.value)
                    }
                  />
                </div>

                <button
                  type="button"
                  onClick={() => remover(i)}
                  aria-label={`Remover zona ${z.nome || i + 1}`}
                  className="rounded-lg p-2 text-fg-muted-token transition-colors hover:bg-surface-2 hover:text-[var(--danger)]"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-3">
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-fg-muted-token" htmlFor={`zona-palavras-${i}`}>
                  Outros jeitos de escrever (separados por vírgula)
                </label>
                <input
                  id={`zona-palavras-${i}`}
                  className={inputCls}
                  placeholder="Cond. Polinesia, Res Polinésia, Quadra 1004 Sul"
                  value={z.palavras ?? ''}
                  onChange={(e) => mudar(i, 'palavras', e.target.value)}
                />
                {/* A causa nº 1 de "cadastrei e não funcionou" é a zona nunca
                    casar com o texto que o Google devolve para o endereço. */}
                <p className="mt-1 text-xs text-fg-muted-token">
                  Procuramos <strong>{z.nome.trim() || 'o nome da zona'}</strong>
                  {(z.palavras ?? '').trim() && <> e <strong>{z.palavras}</strong></>} dentro do
                  endereço do cliente. Acentos e maiúsculas não importam — mas se o mapa escreve
                  o lugar de outro jeito, adicione essa forma aqui.
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 flex justify-end border-t border-border-token pt-4">
        <Button onClick={salvar} disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar zonas'}
        </Button>
      </div>
    </Card>
  );
};

export default ZonasDePrecoFixoCard;
