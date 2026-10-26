/**
 * Quem entrega: cadastro dos entregadores da loja.
 *
 * Morava no fim de "Equipe e entregas", em Pedidos, abaixo de dois rankings
 * (26/10): cadastro dentro de relatório, e "equipe" em duas telas do menu.
 * Agora a equipe inteira — quem tem login e quem entrega — mora em
 * Configurações → Equipe; o ranking foi para Relatórios › Operação.
 */
import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { Button, CampoDeTelefone, FalhaAoCarregar, Input, Secao, Skeleton, Switch, Tabela } from '../../../components/ui';
import { getErrorMessage } from '../../../services';
import { operacaoService, type Entregador } from '../../../services/operacao';
import { mascararTelefone } from '../../../components/ui/CampoDeTelefone';

export const EntregadoresSection: React.FC<{ loja: string }> = ({ loja }) => {
  const [lista, setLista] = useState<Entregador[] | null>(null);
  const [falhou, setFalhou] = useState(false);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setFalhou(false);
    try {
      setLista(await operacaoService.entregadores(loja));
    } catch {
      setFalhou(true);
    }
  }, [loja]);

  useEffect(() => { void carregar(); }, [carregar]);

  const cadastrar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!nome.trim()) return;
    setSalvando(true);
    try {
      const novo = await operacaoService.criarEntregador(loja, { nome: nome.trim(), telefone: telefone.trim() });
      setLista((atual) => [...(atual ?? []), novo].sort((a, b) => a.nome.localeCompare(b.nome)));
      setNome('');
      setTelefone('');
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSalvando(false);
    }
  };

  const alternar = async (e: Entregador) => {
    try {
      const mudado = await operacaoService.mudarEntregador(loja, e.id, { is_active: !e.is_active });
      setLista((atual) => (atual ?? []).map((x) => (x.id === e.id ? mudado : x)));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Secao titulo="Entregadores" contador={lista?.length}>
      {falhou ? (
        <FalhaAoCarregar titulo="Não foi possível carregar os entregadores" onTentarDeNovo={carregar} />
      ) : lista === null ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <>
          {lista.length > 0 && (
            <div className="mb-4">
              <Tabela
                itens={lista}
                chave={(e) => e.id}
                rotuloDaLinha={(e) => e.nome}
                classeDaLinha={(e) => (e.is_active ? '' : 'opacity-60')}
                colunas={[
                  { chave: 'nome', cabecalho: 'Nome', render: (e) => <span className="font-medium">{e.nome}</span> },
                  { chave: 'telefone', cabecalho: 'WhatsApp', render: (e) => (e.telefone ? mascararTelefone(e.telefone) : '—') },
                  {
                    chave: 'ativo', cabecalho: 'Ativo', alinhamento: 'direita',
                    render: (e) => <Switch ligado={e.is_active} onMudar={() => alternar(e)} rotulo={`${e.nome} ativo`} />,
                  },
                ]}
              />
            </div>
          )}
          <form onSubmit={cadastrar} className="flex flex-wrap items-end gap-3">
            <div className="w-56 max-sm:w-full">
              <Input label="Nome" value={nome} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNome(e.target.value)} />
            </div>
            <div className="w-48 max-sm:w-full">
              <CampoDeTelefone rotulo="WhatsApp" valor={telefone} onMudar={setTelefone} />
            </div>
            <Button type="submit" disabled={salvando || !nome.trim()}>Adicionar entregador</Button>
          </form>
        </>
      )}
    </Secao>
  );
};

export default EntregadoresSection;
