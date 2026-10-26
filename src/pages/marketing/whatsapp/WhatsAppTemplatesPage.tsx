/**
 * Modelos de mensagem — os modelos que a Meta aprovou para o WhatsApp da loja.
 *
 * Modelo aprovado é o que fura a janela de 24 h (erro 131047): é com ele que
 * campanha e promoção chegam a quem não falou com a loja hoje.
 *
 * 26/10: até aqui a tela listava cinco textos fixos do código (que a Meta
 * nunca viu e que não furam janela nenhuma) e uma cópia somente-leitura dos
 * avisos do pedido, que têm tela própria em Avisos automáticos. Agora lista
 * os modelos de verdade da conta, com a situação na Meta, e leva direto à
 * campanha com o modelo escolhido.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowPathIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { Button, EmptyState, FalhaAoCarregar, PageShell, Secao, SeloDeEstado } from '../../../components/ui';
import { Loading } from '../../../components/common/Loading';
import whatsappService from '../../../services/whatsapp';
import { estadoDaLista } from '../../../utils/estadoDaLista';
import { categoriaDoModelo, estadoDoModelo, idiomaDoModelo, textoDoModelo } from '../../../utils/modelosDaMeta';
import { usePerfilDeAutomacao } from '../../automation/usePerfilDeAutomacao';
import type { MessageTemplate } from '../../../types';

const listarModelos = async (conta: string): Promise<MessageTemplate[]> => {
  const { data } = await whatsappService.getTemplates(conta);
  const lista = (data as { results?: MessageTemplate[] })?.results ?? data;
  return Array.isArray(lista) ? lista : [];
};

/** Código de acesso (authentication) não serve para campanha. */
const usavelEmCampanha = (m: MessageTemplate) =>
  String(m.status).toLowerCase() === 'approved' && String(m.category).toLowerCase() !== 'authentication';

const WhatsAppTemplatesPage: React.FC = () => {
  const navigate = useNavigate();
  const { perfil, estado: estadoDoPerfil, tentarDeNovo } = usePerfilDeAutomacao();
  const conta = perfil?.account || '';
  const [sincronizando, setSincronizando] = useState(false);

  const consulta = useQuery({
    queryKey: ['modelos-da-meta', conta],
    queryFn: () => listarModelos(conta),
    enabled: !!conta,
  });
  const modelos = consulta.data ?? [];

  const sincronizar = async () => {
    if (!conta) return;
    setSincronizando(true);
    try {
      await whatsappService.syncTemplates(conta);
      await consulta.refetch();
      toast.success('Modelos sincronizados');
    } catch {
      toast.error('Não foi possível sincronizar com a Meta. Tente de novo.');
    } finally {
      setSincronizando(false);
    }
  };

  const semConta = estadoDoPerfil === 'sem-perfil' || (estadoDoPerfil === 'pronto' && !conta);

  const estado = estadoDaLista({
    temDados: consulta.data !== undefined,
    buscando: estadoDoPerfil === 'carregando' || consulta.isFetching,
    falhou: consulta.isError,
    quantidade: modelos.length,
  });

  const botaoSincronizar = (
    <Button
      variant="outline"
      leftIcon={<ArrowPathIcon className="h-4 w-4" />}
      onClick={() => void sincronizar()}
      isLoading={sincronizando}
      disabled={!conta}
    >
      Sincronizar
    </Button>
  );

  let conteudo: React.ReactNode;
  if (semConta) {
    conteudo = (
      <EmptyState
        variante="ativacao"
        estado="WhatsApp não conectado"
        titulo="Conecte o WhatsApp da loja para usar os modelos da Meta"
        acao={<Button onClick={() => navigate('/connections')}>Conectar WhatsApp</Button>}
      />
    );
  } else if (estadoDoPerfil === 'falhou') {
    conteudo = <FalhaAoCarregar titulo="Não foi possível carregar os modelos" onTentarDeNovo={tentarDeNovo} />;
  } else if (estado === 'carregando') {
    conteudo = (
      <div className="flex h-48 items-center justify-center">
        <Loading size="md" rotulo="Carregando modelos" />
      </div>
    );
  } else if (estado === 'falhou') {
    conteudo = <FalhaAoCarregar titulo="Não foi possível carregar os modelos" onTentarDeNovo={() => void consulta.refetch()} />;
  } else if (estado === 'vazio') {
    conteudo = <EmptyState titulo="Nenhum modelo nesta conta" acao={botaoSincronizar} />;
  } else {
    conteudo = (
      <Secao titulo="Modelos" contador={modelos.length}>
        <ul className="-my-3 divide-y divide-border-token">
          {modelos.map((m) => {
            const situacao = estadoDoModelo(m.status);
            const texto = textoDoModelo(m.components);
            return (
              <li key={m.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-fg-token">{m.name}</span>
                    <SeloDeEstado tone={situacao.tone}>{situacao.rotulo}</SeloDeEstado>
                    <span className="text-caption text-fg-muted-token">
                      {idiomaDoModelo(m.language)} · {categoriaDoModelo(m.category)}
                    </span>
                  </div>
                  {texto && <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-fg-muted-token">{texto}</p>}
                </div>
                {usavelEmCampanha(m) && (
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<PaperAirplaneIcon className="h-4 w-4" />}
                    onClick={() => navigate(`/marketing/whatsapp/new?modelo=${encodeURIComponent(m.id)}`)}
                  >
                    Usar em campanha
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </Secao>
    );
  }

  return (
    <PageShell titulo="Modelos de mensagem" acoes={semConta ? undefined : botaoSincronizar}>
      {conteudo}
    </PageShell>
  );
};

export default WhatsAppTemplatesPage;
