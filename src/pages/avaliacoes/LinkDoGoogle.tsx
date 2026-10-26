/**
 * Link de avaliação do Google — o que o cliente recebe para avaliar a loja.
 *
 * Morava em Configurações → Geral → Avaliações (26/10). O backend troca o
 * `metadata` inteiro no PATCH, então o resto vai junto.
 */
import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

import { Button, Campo, Input } from '../../components/ui';
import { getStore, updateStore } from '../../services/storesApi';
import logger from '../../services/logger';

export const LinkDoGoogle: React.FC<{ loja: string; onSalvo?: () => void }> = ({ loja, onSalvo }) => {
  const [metadata, setMetadata] = useState<Record<string, unknown> | null>(null);
  const [link, setLink] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    getStore(loja)
      .then((dados) => {
        const meta = (dados.metadata || {}) as Record<string, unknown>;
        setMetadata(meta);
        setLink(String(meta.google_review_url || ''));
      })
      .catch((e) => logger.error('Erro ao carregar o link do Google:', e));
  }, [loja]);

  const salvar = async () => {
    if (!metadata) return;
    setSalvando(true);
    try {
      await updateStore(loja, { metadata: { ...metadata, google_review_url: link.trim() } });
      toast.success('Link salvo');
      onSalvo?.();
    } catch (e) {
      logger.error('Erro ao salvar o link do Google:', e);
      toast.error('Não foi possível salvar o link.');
    } finally {
      setSalvando(false);
    }
  };

  if (!metadata) return null;

  return (
    <div className="flex flex-col gap-4">
      <Campo rotulo="Link de avaliação do Google" dica={'Perfil da Empresa no Google → "Pedir avaliações" → copiar link.'}>
        <Input
          type="url"
          placeholder="https://g.page/r/SEU_CODIGO/review"
          value={link}
          onChange={(e) => setLink(e.target.value)}
        />
      </Campo>
      <div className="flex justify-end">
        <Button onClick={salvar} isLoading={salvando}>Salvar</Button>
      </div>
    </div>
  );
};

export default LinkDoGoogle;
