import React, { useEffect, useState } from 'react';

import { Button, Input, NumberField, Secao, Switch } from '../../components/ui';
import { updateStore, type Store } from '../../services/storesApi';
import { useRootStore } from '../../stores/rootStore';
import logger from '../../services/logger';
import { CHAVE_AVISO_FILA_HUMANA, lerAvisoFilaHumana, type AvisoFilaHumana } from '../../utils/avisoFilaHumana';

const soDigitos = (s: string) => s.replace(/\D/g, '');

interface AvisoFilaHumanaSectionProps {
  loja: Pick<Store, 'id'> & { metadata?: Record<string, unknown> | null };
  /** A loja como o backend devolveu, para a página refazer o próprio estado. */
  onSalvo?: (loja: Store) => void;
}

/**
 * "Avisar no WhatsApp quando alguém espera atendente". Opt-in: nasce
 * desligado. O backend substitui o `metadata` inteiro no PATCH, então o que
 * já estava lá vai junto (mesmo padrão de `CaixaDinheiroSection`).
 */
export const AvisoFilaHumanaSection: React.FC<AvisoFilaHumanaSectionProps> = ({ loja, onSalvo }) => {
  const [aviso, setAviso] = useState(() => lerAvisoFilaHumana(loja.metadata));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [salvo, setSalvo] = useState(false);

  useEffect(() => { setAviso(lerAvisoFilaHumana(loja.metadata)); }, [loja]);

  const mudar = (parcial: Partial<AvisoFilaHumana>) => {
    setAviso((a) => ({ ...a, ...parcial }));
    setErro('');
    setSalvo(false);
  };

  const salvar = async () => {
    const telefone = soDigitos(aviso.telefone);
    if (aviso.ativo && telefone.length < 10) {
      setErro('Informe o telefone com DDD que vai receber o aviso.');
      return;
    }
    setSalvando(true);
    setErro('');
    try {
      const salva = await updateStore(loja.id, {
        metadata: {
          ...(loja.metadata || {}),
          [CHAVE_AVISO_FILA_HUMANA]: { ativo: aviso.ativo, apos_minutos: aviso.apos_minutos, telefone },
        },
      });
      const { stores, setStores } = useRootStore.getState();
      setStores(stores.map((s) => (s.id === salva.id ? { ...s, ...salva } : s)));
      onSalvo?.(salva);
      setSalvo(true);
    } catch (e) {
      logger.error('Erro ao salvar aviso da fila humana:', e);
      setErro('Não consegui salvar. O aviso continua como estava.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Secao
      titulo="Avisar no WhatsApp quando alguém espera atendente"
      descricao="Você recebe uma mensagem pelo WhatsApp da loja quando um cliente fica esperando mais que este tempo."
      acoes={(
        <Switch
          ligado={aviso.ativo}
          onMudar={(ligado) => mudar({ ativo: ligado })}
          rotulo="Avisar no WhatsApp quando alguém espera atendente"
          desabilitado={salvando}
        />
      )}
    >
      <div className="flex flex-col gap-4">
        <NumberField
          rotulo="Depois de quantos minutos esperando"
          valor={aviso.apos_minutos}
          onMudar={(n) => mudar({ apos_minutos: n })}
          min={1}
          max={240}
          sufixo="min"
        />
        <Input
          label="Telefone que recebe o aviso"
          type="tel"
          inputMode="tel"
          placeholder="(63) 99999-0000"
          value={aviso.telefone}
          onChange={(e) => mudar({ telefone: e.target.value })}
          helperText="O seu celular ou o de quem cuida do atendimento, com DDD."
        />
        {erro && <p role="alert" className="text-sm text-danger-token">{erro}</p>}
        {salvo && !erro && <p className="text-sm text-success-token">Aviso salvo.</p>}
        <div>
          <Button onClick={() => void salvar()} disabled={salvando} isLoading={salvando}>
            Salvar aviso
          </Button>
        </div>
      </div>
    </Secao>
  );
};

export default AvisoFilaHumanaSection;
