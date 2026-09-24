/**
 * Para quem avisar quando a impressora parar.
 *
 * O vigia de impressão do backend manda o aviso pelo WhatsApp da loja para
 * `store.metadata.telefone_de_alerta`. Vazio, cai no telefone da loja — e na
 * loja em que esse telefone É o número do WhatsApp, o aviso não sai para
 * ninguém (mandar para si mesmo seria falar sozinho). Por isso o campo.
 *
 * O PATCH da loja troca o `metadata` INTEIRO; a loja é lida de novo logo
 * antes de salvar, para não apagar o que outra tela gravou nesse meio-tempo.
 */
import React, { useEffect, useState } from 'react';

import { Card, Button, Input } from '../ui';
import { getStore, updateStore } from '../../services/storesApi';
import logger from '../../services/logger';

export const CHAVE_TELEFONE_DE_ALERTA = 'telefone_de_alerta';

const soDigitos = (valor: string) => valor.replace(/\D/g, '');

interface TelefoneDeAlertaSectionProps {
  /** id ou slug da loja — o que o endpoint da loja aceita. */
  storeId: string;
}

export const TelefoneDeAlertaSection: React.FC<TelefoneDeAlertaSectionProps> = ({ storeId }) => {
  const [valor, setValor] = useState('');
  const [carregou, setCarregou] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let vivo = true;
    getStore(storeId)
      .then((loja) => {
        if (!vivo) return;
        setValor(String(loja?.metadata?.[CHAVE_TELEFONE_DE_ALERTA] ?? ''));
        setCarregou(true);
      })
      .catch((e) => {
        logger.error('Erro ao ler telefone de alerta:', e);
        if (vivo) setErro('Não consegui ler o telefone salvo. Recarregue a página.');
      });
    return () => { vivo = false; };
  }, [storeId]);

  const salvar = async () => {
    setErro('');
    setSalvo(false);
    const telefone = soDigitos(valor);
    if (telefone && (telefone.length < 10 || telefone.length > 13)) {
      setErro('Use o telefone com DDD, ex.: (63) 98888-7777.');
      return;
    }
    setSalvando(true);
    try {
      const atual = await getStore(storeId);
      await updateStore(storeId, {
        metadata: { ...(atual?.metadata || {}), [CHAVE_TELEFONE_DE_ALERTA]: telefone },
      });
      setValor(telefone);
      setSalvo(true);
    } catch (e) {
      logger.error('Erro ao salvar telefone de alerta:', e);
      setErro('Não consegui salvar. Tente de novo.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[14rem] flex-1 max-w-sm">
          <Input
            id="telefone-de-alerta"
            label="Telefone para avisos de impressora (WhatsApp)"
            inputMode="tel"
            placeholder="(63) 98888-7777"
            value={valor}
            disabled={!carregou}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setValor(e.target.value); setSalvo(false); }}
            error={erro || undefined}
          />
        </div>
        <Button onClick={salvar} disabled={salvando || !carregou}>
          {salvando ? 'Salvando…' : 'Salvar telefone'}
        </Button>
        {salvo && <span className="text-sm text-fg-muted-token">Salvo.</span>}
      </div>
      <p className="mt-2 text-sm text-fg-muted-token">
        Quando a impressora parar, avisamos neste número pelo WhatsApp da loja. Não pode ser o
        próprio número do WhatsApp da loja.
      </p>
    </Card>
  );
};

export default TelefoneDeAlertaSection;
