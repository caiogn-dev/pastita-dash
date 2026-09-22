import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { TrashIcon, UserPlusIcon, UsersIcon } from '@heroicons/react/24/outline';

import { Badge, Button, Card, EmptyState, Input, Loading } from '../../../components/common';
import { PageShell } from '../../../components/ui';
import { crmApi } from '../../../services/crmApi';
import { getErrorMessage } from '../../../services';
import { useStore } from '../../../hooks/useStore';
import type { TeamMember } from '../../../types/crm';
import {
  PAPEIS_ESCOLHIVEIS,
  descricaoDoPapel,
  nomeDoColaborador,
  type Papel,
} from './papeisDaEquipe';

/**
 * Quem trabalha nesta loja.
 *
 * O CRUD existe desde junho e nenhuma loja o usava: o endpoint pedia o id do
 * usuário, e ainda por cima como UUID enquanto a chave é inteira — toda
 * criação voltava 400. Corrigido nos dois lados em 22/09; aqui o convite é
 * pelo telefone, que é o que o dono sabe de cor do funcionário dele.
 */
export const ColaboradoresPage: React.FC = () => {
  const { storeSlug } = useStore();

  const [membros, setMembros] = useState<TeamMember[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [telefone, setTelefone] = useState('');
  const [nome, setNome] = useState('');
  const [papel, setPapel] = useState<Papel>('operator');

  const carregar = useCallback(async () => {
    if (!storeSlug) return;
    setCarregando(true);
    try {
      const { data } = await crmApi.getTeam(storeSlug);
      setMembros(Array.isArray(data) ? data : []);
    } catch (erro) {
      toast.error(getErrorMessage(erro));
    } finally {
      setCarregando(false);
    }
  }, [storeSlug]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const donos = useMemo(
    () => membros.filter((m) => m.role === 'owner').length,
    [membros],
  );

  const convidar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!storeSlug || enviando) return;
    setEnviando(true);
    try {
      const { status } = await crmApi.addTeamMember(storeSlug, {
        phone: telefone,
        name: nome,
        role: papel,
      });
      // 201 = entrou agora; 200 = já estava na equipe e o papel mudou. Dizer
      // "adicionado" nos dois casos faria o dono achar que duplicou.
      toast.success(status === 201 ? 'Colaborador adicionado.' : 'Papel atualizado.');
      setTelefone('');
      setNome('');
      await carregar();
    } catch (erro) {
      toast.error(getErrorMessage(erro));
    } finally {
      setEnviando(false);
    }
  };

  const trocarPapel = async (membro: TeamMember, novo: Papel) => {
    if (!storeSlug) return;
    try {
      await crmApi.updateTeamMember(storeSlug, membro.id, { role: novo });
      await carregar();
    } catch (erro) {
      toast.error(getErrorMessage(erro));
    }
  };

  const remover = async (membro: TeamMember) => {
    if (!storeSlug) return;
    try {
      await crmApi.removeTeamMember(storeSlug, membro.id);
      toast.success('Colaborador removido.');
      await carregar();
    } catch (erro) {
      toast.error(getErrorMessage(erro));
    }
  };

  return (
    <PageShell
      titulo="Colaboradores"
      descricao="Quem pode entrar no painel desta loja e até onde vai."
    >
      <Card className="superficie p-4 sm:p-5">
        <form onSubmit={convidar} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Input
            label="Celular do colaborador"
            placeholder="(63) 99999-0001"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            required
          />
          <Input
            label="Nome"
            placeholder="Como você chama essa pessoa"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          <Button type="submit" disabled={enviando || !telefone.trim()}>
            <UserPlusIcon className="h-5 w-5" aria-hidden="true" />
            {enviando ? 'Convidando…' : 'Convidar'}
          </Button>
        </form>

        <fieldset className="mt-4">
          <legend className="text-sm font-medium">O que essa pessoa vai poder fazer</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {PAPEIS_ESCOLHIVEIS.map((opcao) => (
              <label
                key={opcao.valor}
                className={`controle cursor-pointer rounded-lg border p-3 text-left ${
                  papel === opcao.valor ? 'border-brand' : ''
                }`}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="papel"
                    value={opcao.valor}
                    checked={papel === opcao.valor}
                    onChange={() => setPapel(opcao.valor)}
                  />
                  <span className="font-medium">{opcao.rotulo}</span>
                </span>
                <span className="mt-1 block text-sm text-fg-muted-token">{opcao.resumo}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </Card>

      <div className="mt-5">
        {carregando ? (
          <Loading />
        ) : membros.length === 0 ? (
          <EmptyState
            icon={<UsersIcon className="h-8 w-8" aria-hidden="true" />}
            title="Só você por enquanto"
            description="Convide quem atende os pedidos para dividir o trabalho."
          />
        ) : (
          <ul className="grid gap-3">
            {membros.map((membro) => {
              const papelDele = descricaoDoPapel(membro.role);
              // O dono não sai por botão: o backend recusa, e oferecer o botão
              // seria prometer uma ação que sempre falha.
              const podeRemover = membro.role !== 'owner' || donos > 1;
              return (
                <li key={membro.id}>
                  <Card className="superficie flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{nomeDoColaborador(membro.user)}</p>
                      <p className="text-sm text-fg-muted-token">{papelDele.resumo}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>{papelDele.rotulo}</Badge>
                      {membro.role !== 'owner' && (
                        <select
                          className="controle rounded-lg px-2 py-1 text-sm"
                          aria-label={`Papel de ${nomeDoColaborador(membro.user)}`}
                          value={membro.role}
                          onChange={(e) => trocarPapel(membro, e.target.value as Papel)}
                        >
                          {PAPEIS_ESCOLHIVEIS.map((o) => (
                            <option key={o.valor} value={o.valor}>
                              {o.rotulo}
                            </option>
                          ))}
                        </select>
                      )}
                      {podeRemover && (
                        <Button
                          variant="ghost"
                          aria-label={`Remover ${nomeDoColaborador(membro.user)}`}
                          onClick={() => remover(membro)}
                        >
                          <TrashIcon className="h-5 w-5" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PageShell>
  );
};

export default ColaboradoresPage;
