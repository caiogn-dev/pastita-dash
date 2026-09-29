/**
 * Recuperador no WhatsApp — o que sai sozinho para quem não fechou.
 *
 * Guardado em `store.metadata.recuperador`. O lembrete de carrinho já existia;
 * "quem só perguntou" é novo (28/09) e nasce desligado: é texto para quem
 * falou e sumiu, e cada loja decide se quer.
 */
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { Button, Input, Secao, Switch, Textarea } from '../../../components/ui';
import { useStore } from '../../../hooks/useStore';
import { useRootStore } from '../../../stores/rootStore';
import { updateStore } from '../../../services/storesApi';

export const CHAVE_RECUPERADOR = 'recuperador';
export const TEXTO_PADRAO_PERGUNTOU = 'Oi, {nome}! Ficou alguma dúvida? Se quiser, eu já monto seu pedido por aqui. 😊{oferta}';

export interface ConfigDoRecuperador {
  carrinho: { incluir_oferta: boolean };
  perguntou: { ativo: boolean; apos_horas: number; texto: string };
}

export function lerRecuperador(metadata: unknown): ConfigDoRecuperador {
  const bruto = ((metadata as { recuperador?: Partial<ConfigDoRecuperador> } | null)?.recuperador) || {};
  const horas = Number(bruto.perguntou?.apos_horas);
  return {
    carrinho: { incluir_oferta: bruto.carrinho?.incluir_oferta !== false },
    perguntou: {
      ativo: bruto.perguntou?.ativo === true,
      apos_horas: Number.isFinite(horas) && horas >= 1 ? Math.min(20, Math.round(horas)) : 3,
      texto: (bruto.perguntou?.texto || '').trim() || TEXTO_PADRAO_PERGUNTOU,
    },
  };
}

export const RecuperadorWhatsAppSecao: React.FC = () => {
  const { storeId, store } = useStore();
  const [cfg, setCfg] = useState<ConfigDoRecuperador>(() => lerRecuperador(store?.metadata));
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { setCfg(lerRecuperador(store?.metadata)); }, [store?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const gravar = async (nova: ConfigDoRecuperador) => {
    if (!storeId) return;
    if (!nova.perguntou.texto.trim()) { toast.error('Escreva o texto.'); return; }
    setSalvando(true);
    try {
      const salva = await updateStore(storeId, { metadata: { ...(store?.metadata || {}), [CHAVE_RECUPERADOR]: nova } });
      const { stores, setStores } = useRootStore.getState();
      setStores(stores.map((s) => (s.id === salva.id ? { ...s, ...salva } : s)));
      setCfg(nova);
      toast.success('Recuperador salvo.');
    } catch {
      toast.error('Não consegui salvar.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Secao titulo="Recuperador no WhatsApp">
      <div className="grid gap-4">
        <label className="flex items-center gap-3 text-sm text-fg-token">
          <Switch ligado={cfg.carrinho.incluir_oferta} onMudar={(v) => void gravar({ ...cfg, carrinho: { incluir_oferta: v } })} rotulo="Lembrete de carrinho cita a promoção de hoje" desabilitado={salvando} />
          Lembrete de carrinho (2 h) cita a promoção de hoje
        </label>
        <label className="flex items-center gap-3 text-sm text-fg-token">
          <Switch ligado={cfg.perguntou.ativo} onMudar={(v) => void gravar({ ...cfg, perguntou: { ...cfg.perguntou, ativo: v } })} rotulo="Mandar mensagem para quem só perguntou e sumiu" desabilitado={salvando} />
          Quem só perguntou e sumiu recebe uma mensagem
        </label>
        <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
          <Input
            label="Depois de quantas horas"
            type="number"
            min={1}
            max={20}
            value={cfg.perguntou.apos_horas}
            onChange={(e) => setCfg({ ...cfg, perguntou: { ...cfg.perguntou, apos_horas: Number(e.target.value) || 3 } })}
            onBlur={() => void gravar(cfg)}
          />
          <Textarea
            label="Texto"
            rows={3}
            value={cfg.perguntou.texto}
            onChange={(e) => setCfg({ ...cfg, perguntou: { ...cfg.perguntou, texto: e.target.value } })}
           
            maxLength={600}
          />
        </div>
        <div>
          <Button size="sm" variant="outline" onClick={() => void gravar(cfg)} isLoading={salvando}>Salvar texto</Button>
        </div>
      </div>
    </Secao>
  );
};
