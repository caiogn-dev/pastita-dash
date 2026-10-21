/**
 * "Melhorar com IA" na descrição (do admin do Prefiro). A sugestão aparece ao
 * lado do texto do dono e só entra no formulário se ele clicar em Usar — a IA
 * nunca escreve por cima sozinha, e nada é salvo até o Salvar do produto.
 */
import React, { useState } from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { Button } from '../../components/ui';
import { useStore } from '../../hooks/useStore';
import { getErrorMessage } from '../../services/api';
import { ajudasDoCadastro, type DescricaoSugerida } from '../../services/ajudasDoCadastro';
import { DescriptionPreview } from './DescriptionEditor';

interface Props {
  nome: string;
  descricao: string;
  categoria?: string;
  onUsar: (sugestao: DescricaoSugerida) => void;
}

export const MelhorarComIa: React.FC<Props> = ({ nome, descricao, categoria, onUsar }) => {
  const { storeSlug } = useStore();
  const [pensando, setPensando] = useState(false);
  const [sugestao, setSugestao] = useState<DescricaoSugerida | null>(null);
  const [erro, setErro] = useState('');

  const pedir = async () => {
    if (!storeSlug) return;
    setPensando(true);
    setErro('');
    try {
      setSugestao(await ajudasDoCadastro.melhorarDescricao(storeSlug, { nome, descricao, categoria }));
    } catch (err) {
      setErro(getErrorMessage(err));
    } finally {
      setPensando(false);
    }
  };

  return (
    <div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={pedir}
        isLoading={pensando}
        disabled={!nome.trim() || !storeSlug}
        leftIcon={<SparklesIcon className="h-4 w-4" aria-hidden="true" />}
      >
        Melhorar com IA
      </Button>
      {erro && <p role="alert" className="mt-1 text-xs text-danger-token">{erro}</p>}
      {sugestao && (
        <div className="mt-2 rounded border border-border-token bg-surface-2 p-3" data-testid="sugestao-ia">
          <DescriptionPreview text={sugestao.descricao} />
          {sugestao.descricao_curta && (
            <p className="mt-2 text-xs text-fg-muted-token">{sugestao.descricao_curta}</p>
          )}
          <div className="mt-3 flex gap-2">
            <Button type="button" size="sm" onClick={() => { onUsar(sugestao); setSugestao(null); }}>Usar</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setSugestao(null)}>Descartar</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MelhorarComIa;
