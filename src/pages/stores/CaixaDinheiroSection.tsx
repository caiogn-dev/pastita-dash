import React, { useEffect, useState } from 'react';
import { Secao, Switch } from '../../components/ui';
import { updateStore, type Store } from '../../services/storesApi';
import { useRootStore } from '../../stores/rootStore';
import logger from '../../services/logger';
import { CHAVE_USA_CAIXA, lojaUsaCaixa } from '../../utils/lojaUsaCaixa';

interface CaixaDinheiroSectionProps {
  loja: Pick<Store, 'id'> & { metadata?: Record<string, unknown> | null };
  /** A loja como o backend devolveu, para a página refazer o próprio estado. */
  onSalvo?: (loja: Store) => void;
}

/**
 * "Uso caixa com dinheiro vivo". Desligado, o Caixa sai do menu.
 *
 * Salva no ato, como os interruptores de entrega/retirada da mesma tela. O
 * backend substitui o `metadata` inteiro no PATCH, então o que já estava lá
 * vai junto. Depois de salvar, a loja é trocada também no rootStore — é de lá
 * que o menu lê; sem isso o Caixa só sumiria no próximo F5.
 */
export const CaixaDinheiroSection: React.FC<CaixaDinheiroSectionProps> = ({ loja, onSalvo }) => {
  const [ligado, setLigado] = useState(() => lojaUsaCaixa(loja));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => { setLigado(lojaUsaCaixa(loja)); }, [loja]);

  const alternar = async (marcado: boolean) => {
    const anterior = ligado;
    setLigado(marcado);
    setErro('');
    setSalvando(true);
    try {
      const salva = await updateStore(loja.id, {
        metadata: { ...(loja.metadata || {}), [CHAVE_USA_CAIXA]: marcado },
      });
      const { stores, setStores } = useRootStore.getState();
      setStores(stores.map((s) => (s.id === salva.id ? { ...s, ...salva } : s)));
      onSalvo?.(salva);
    } catch (e) {
      logger.error('Erro ao salvar preferência do caixa:', e);
      setLigado(anterior);
      setErro('Não consegui salvar. Nada mudou no menu.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Secao titulo="Caixa">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-fg-token">Uso caixa com dinheiro vivo</span>
        <Switch
          ligado={ligado}
          desabilitado={salvando}
          onMudar={alternar}
          rotulo="Uso caixa com dinheiro vivo"
        />
      </div>
      {erro && <p role="alert" className="mt-2 text-sm text-danger-token">{erro}</p>}
    </Secao>
  );
};

export default CaixaDinheiroSection;
