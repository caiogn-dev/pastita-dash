/**
 * Como o cliente recebe: entrega/retirada, prazo e pedido mínimo (26/10).
 *
 * Moravam em três lugares: ligar entrega e o prazo em Configurações → Geral,
 * o preço nesta tela, e o pedido mínimo só no formulário de CRIAR a loja —
 * depois disso, nunca mais editável. Agora "entrega" é uma tela só.
 *
 * Os interruptores gravam no ato (efeito imediato no cardápio; erro volta o
 * estado). Prazo e pedido mínimo gravam juntos, no Salvar que só aparece
 * quando algo mudou — o mesmo padrão das outras seções desta tela.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { BuildingStorefrontIcon, TruckIcon } from '@heroicons/react/24/outline';

import { Button, Campo, CampoDeDinheiro, Input, Secao, Switch } from '../../components/ui';
import { getStore, updateStore, type Store } from '../../services/storesApi';
import logger from '../../services/logger';
import { aoAlternarModo, resumoDosModos, type ModosDeRecebimento, type Modo } from '../stores/modosDeRecebimento';

interface Valores {
  prazoMin: string;
  prazoMax: string;
  pedidoMinimo: number | null;
}

const minutosOuZero = (texto: string) => {
  const n = parseInt(texto, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const lerValores = (loja: Partial<Store>): Valores => ({
  prazoMin: loja.prazo_entrega_min ? String(loja.prazo_entrega_min) : '',
  prazoMax: loja.prazo_entrega_max ? String(loja.prazo_entrega_max) : '',
  pedidoMinimo: Number(loja.min_order_value) || null,
});

const MODOS: { modo: Modo; titulo: string; Icone: typeof TruckIcon }[] = [
  { modo: 'delivery', titulo: 'Entrega', Icone: TruckIcon },
  { modo: 'pickup', titulo: 'Retirada no balcão', Icone: BuildingStorefrontIcon },
];

export const ComoOClienteRecebe: React.FC<{ loja: string }> = ({ loja }) => {
  const [carregado, setCarregado] = useState(false);
  const [modos, setModos] = useState<ModosDeRecebimento>({ delivery: true, pickup: true });
  const [salvandoModo, setSalvandoModo] = useState<Modo | null>(null);
  const [salvo, setSalvo] = useState<Valores>({ prazoMin: '', prazoMax: '', pedidoMinimo: null });
  const [valores, setValores] = useState<Valores>(salvo);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let vivo = true;
    getStore(loja)
      .then((dados) => {
        if (!vivo) return;
        setModos({ delivery: dados.delivery_enabled !== false, pickup: dados.pickup_enabled !== false });
        const lidos = lerValores(dados);
        setSalvo(lidos);
        setValores(lidos);
        setCarregado(true);
      })
      .catch((e) => logger.error('Erro ao carregar como o cliente recebe:', e));
    return () => { vivo = false; };
  }, [loja]);

  const alternar = useCallback(async (modo: Modo, ligado: boolean) => {
    const anterior = modos;
    const novo = aoAlternarModo(anterior, modo, ligado);
    if (!novo) {
      toast.error('A loja precisa de pelo menos uma forma de receber: entrega ou retirada.');
      return;
    }
    setModos(novo);
    setSalvandoModo(modo);
    try {
      await updateStore(loja, { delivery_enabled: novo.delivery, pickup_enabled: novo.pickup });
      toast.success(resumoDosModos(novo));
    } catch (e) {
      setModos(anterior);
      logger.error('Erro ao salvar formas de recebimento:', e);
      toast.error('Não foi possível salvar. Nada mudou no cardápio.');
    } finally {
      setSalvandoModo(null);
    }
  }, [modos, loja]);

  const mudou = JSON.stringify(valores) !== JSON.stringify(salvo);

  const salvar = async () => {
    const minimo = minutosOuZero(valores.prazoMin);
    const maximo = minutosOuZero(valores.prazoMax);
    if (maximo && minimo > maximo) {
      setErro('O mínimo não pode passar do máximo.');
      return;
    }
    setErro(null);
    setSalvando(true);
    try {
      const gravada = await updateStore(loja, {
        prazo_entrega_min: minimo,
        prazo_entrega_max: maximo,
        min_order_value: valores.pedidoMinimo ?? 0,
      });
      const lidos = lerValores(gravada);
      setSalvo(lidos);
      setValores(lidos);
      toast.success('Entrega salva');
    } catch (e) {
      logger.error('Erro ao salvar prazo e pedido mínimo:', e);
      toast.error('Não foi possível salvar. As alterações continuam aqui.');
    } finally {
      setSalvando(false);
    }
  };

  if (!carregado) return null;

  return (
    <Secao
      titulo="Como o cliente recebe"
      descricao={resumoDosModos(modos)}
      acoes={mudou ? (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => { setValores(salvo); setErro(null); }}>Descartar</Button>
          <Button size="sm" onClick={salvar} isLoading={salvando}>Salvar</Button>
        </div>
      ) : undefined}
    >
      <ul className="divide-y divide-border-token">
        {MODOS.map(({ modo, titulo, Icone }) => (
          <li key={modo} className="flex items-center gap-3 py-3 first:pt-0">
            <Icone className="h-5 w-5 text-fg-muted-token" aria-hidden />
            <span className="flex-1 text-sm font-semibold text-fg-token">{titulo}</span>
            <Switch
              ligado={modos[modo]}
              desabilitado={salvandoModo !== null}
              onMudar={(v) => alternar(modo, v)}
              rotulo={titulo}
            />
          </li>
        ))}
      </ul>

      <div className="mt-4 grid max-w-xl grid-cols-3 items-start gap-4 border-t border-border-token pt-4 max-sm:grid-cols-1">
        {/* A promessa que o cliente vê no cardápio, no checkout e no WhatsApp. */}
        <Campo rotulo="Prazo mínimo" erro={erro}>
          <Input
            type="number" inputMode="numeric" min={0} max={600}
            rightAddon="min" className="tabular-nums" placeholder="30"
            value={valores.prazoMin}
            onChange={(e) => setValores((v) => ({ ...v, prazoMin: e.target.value }))}
          />
        </Campo>
        <Campo rotulo="Prazo máximo">
          <Input
            type="number" inputMode="numeric" min={0} max={600}
            rightAddon="min" className="tabular-nums" placeholder="45"
            value={valores.prazoMax}
            onChange={(e) => setValores((v) => ({ ...v, prazoMax: e.target.value }))}
          />
        </Campo>
        <CampoDeDinheiro
          rotulo="Pedido mínimo"
          valor={valores.pedidoMinimo}
          onMudar={(pedidoMinimo) => setValores((v) => ({ ...v, pedidoMinimo }))}
        />
      </div>
    </Secao>
  );
};

export default ComoOClienteRecebe;
