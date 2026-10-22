/**
 * Modelos de mensagem do WhatsApp.
 *
 * Simples (25/09): a lista à esquerda, a prévia à direita no mesmo balão da
 * campanha (`BalaoDeWhatsApp`), variáveis em `Input` do kit. Saíram o fundo
 * verde do WhatsApp em hex, a cor por categoria, o campo de texto cru e os botões
 * "Usar template" e "Editar" que não faziam nada. O que a prévia entrega de
 * verdade é a mensagem pronta: "Copiar mensagem".
 *
 * 19/10: os avisos de status do pedido (confirmado, em preparo, saiu, entregue)
 * vinham de uma lista fixa daqui e NÃO eram o que a loja mandava — a Maria
 * Vitória, de retirada, recebeu "em breve estará a caminho". Agora a seção
 * "Avisos automáticos do pedido" lê as AutoMessages da loja no servidor: o que
 * aparece é o que sai, e o "Editar" leva para onde se muda.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChatBubbleLeftRightIcon, DocumentDuplicateIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { BalaoDeWhatsApp } from '../../../components/marketing/BalaoDeWhatsApp';
import { Badge, Button, EmptyState, Input, PageShell, PeriodChips, Secao } from '../../../components/ui';
import { cn } from '../../../utils/cn';
import { getTemplatesByCategory, whatsappTemplates, WhatsAppTemplate } from '../../../data/whatsappTemplates';
import { useStore } from '../../../hooks/useStore';
import { autoMessageService, eventTypeLabels } from '../../../services/automation';
import type { AutoMessage, AutoMessageEventType } from '../../../types';

/** Avisos que saem sozinhos quando o status do pedido muda, na ordem do pedido. */
const EVENTOS_DE_STATUS: AutoMessageEventType[] = [
  'order_confirmed', 'order_preparing', 'order_ready',
  'order_out_for_delivery', 'order_delivered', 'order_cancelled',
];

/** Valores de exemplo para a prévia — as mesmas chaves que o servidor preenche. */
const EXEMPLO_DO_PEDIDO: Record<string, string> = {
  customer_name: 'Maria Vitória',
  primeiro_nome: 'Maria',
  order_number: 'CE-2610194335',
  order_status: 'Em preparo',
  order_total: '76.43',
  total: '76,43',
  tempo: '40',
  endereco: 'Quadra 110 Norte, Alameda 8, 29',
  entregue_ou_retirado: 'entregue',
  proximo_passo: 'Pode vir buscar!',
};

function previaDoAviso(texto: string): string {
  return texto.replace(/\{(\w+)\}/g, (marca, chave: string) => EXEMPLO_DO_PEDIDO[chave] ?? marca);
}

type Categoria = 'all' | WhatsAppTemplate['category'];

const CATEGORIAS: Record<WhatsAppTemplate['category'], { rotulo: string; descricao: string }> = {
  transactional: {
    rotulo: 'Transacional',
    descricao: 'Confirmação, status do pedido e entrega. Pode sair a qualquer momento.',
  },
  marketing: {
    rotulo: 'Marketing',
    descricao: 'Promoção e reativação. Exige que o cliente aceite receber e conta no limite da Meta.',
  },
  support: {
    rotulo: 'Suporte',
    descricao: 'Atendimento e resposta a dúvida do cliente.',
  },
};

const DESCRICAO_TODOS = 'Fora da janela de 24 horas, só modelo chega ao cliente.';

/** Troca `{{variavel}}` pelo valor; sem valor, a marca fica e o balão destaca. */
function preencher(modelo: WhatsAppTemplate, valores: Record<string, string>): string {
  return Object.entries(valores).reduce(
    (texto, [chave, valor]) => (valor ? texto.split(`{{${chave}}}`).join(valor) : texto),
    modelo.content,
  );
}

const WhatsAppTemplatesPage: React.FC = () => {
  const [categoria, setCategoria] = useState<Categoria>('all');
  const [escolhido, setEscolhido] = useState<WhatsAppTemplate | null>(null);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [aviso, setAviso] = useState<AutoMessage | null>(null);
  const [avisos, setAvisos] = useState<AutoMessage[]>([]);
  const { storeId } = useStore();

  useEffect(() => {
    if (!storeId) return undefined;
    let vivo = true;
    autoMessageService
      .list({ page_size: 100 })
      .then((resposta) => {
        if (!vivo) return;
        const daLoja = (resposta.results ?? []).filter(
          (m) => m.store_id === storeId && EVENTOS_DE_STATUS.includes(m.event_type),
        );
        daLoja.sort((a, b) => EVENTOS_DE_STATUS.indexOf(a.event_type) - EVENTOS_DE_STATUS.indexOf(b.event_type));
        setAvisos(daLoja);
      })
      .catch(() => {
        if (vivo) setAvisos([]);
      });
    return () => {
      vivo = false;
    };
  }, [storeId]);

  const lista = categoria === 'all' ? whatsappTemplates : getTemplatesByCategory(categoria);

  const opcoes = useMemo(
    () => [
      { value: 'all' as Categoria, label: 'Todos', count: whatsappTemplates.length },
      ...(Object.keys(CATEGORIAS) as WhatsAppTemplate['category'][]).map((c) => ({
        value: c as Categoria,
        label: CATEGORIAS[c].rotulo,
        count: getTemplatesByCategory(c).length,
      })),
    ],
    [],
  );

  const escolher = (modelo: WhatsAppTemplate) => {
    setAviso(null);
    setEscolhido(modelo);
    setValores(Object.fromEntries(modelo.variables.map((v) => [v, ''])));
  };

  const escolherAviso = (mensagem: AutoMessage) => {
    setEscolhido(null);
    setAviso(mensagem);
  };

  const texto = aviso ? previaDoAviso(aviso.message_text) : escolhido ? preencher(escolhido, valores) : '';

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success('Mensagem copiada');
    } catch {
      toast.error('Não foi possível copiar. Selecione o texto e copie à mão.');
    }
  };

  return (
    <PageShell
      trilha={[{ rotulo: 'Campanhas', href: '/marketing' }, { rotulo: 'Modelos' }]}
      titulo="Modelos de mensagem"
     
      filtros={
        <PeriodChips<Categoria>
          options={opcoes}
          value={categoria}
          onChange={setCategoria}
          ariaLabel="Filtrar modelos por categoria"
        />
      }
    >
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <div className="flex min-w-0 flex-col gap-5">
        {avisos.length > 0 && (
          <Secao
            titulo="Avisos automáticos do pedido"
            contador={avisos.length}
            acoes={
              <Link
                to="/atendimento/mensagens-prontas"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
              >
                <PencilSquareIcon className="h-4 w-4" />
                Editar
              </Link>
            }
          >
            <ul className="-mx-2 flex flex-col gap-1">
              {avisos.map((mensagem) => {
                const ativo = aviso?.id === mensagem.id;
                return (
                  <li key={mensagem.id}>
                    <button
                      type="button"
                      aria-pressed={ativo}
                      onClick={() => escolherAviso(mensagem)}
                      className={cn(
                        'flex w-full items-center rounded-lg px-3 py-2.5 text-left font-medium text-fg-token transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                        ativo ? 'bg-brand-soft' : 'hover:bg-surface-2',
                      )}
                    >
                      {eventTypeLabels[mensagem.event_type] ?? mensagem.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          </Secao>
        )}

        <Secao
          titulo="Modelos"
          contador={lista.length}
          descricao={categoria === 'all' ? DESCRICAO_TODOS : CATEGORIAS[categoria].descricao}
        >
          <ul className="-mx-2 flex flex-col gap-1">
            {lista.map((modelo) => {
              const ativo = escolhido?.id === modelo.id;
              return (
                <li key={modelo.id}>
                  <button
                    type="button"
                    aria-pressed={ativo}
                    onClick={() => escolher(modelo)}
                    className={cn(
                      'flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                      ativo ? 'bg-brand-soft' : 'hover:bg-surface-2',
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block font-medium text-fg-token">{modelo.name}</span>
                      <span className="block text-caption text-fg-muted-token">{modelo.description}</span>
                    </span>
                    <Badge tone="neutral" className="shrink-0">
                      {CATEGORIAS[modelo.category]?.rotulo ?? modelo.category}
                    </Badge>
                  </button>
                </li>
              );
            })}
          </ul>
        </Secao>
        </div>

        <div className="lg:sticky lg:top-6">
          {aviso ? (
            <Secao titulo="Prévia" descricao={eventTypeLabels[aviso.event_type] ?? aviso.name}>
              <BalaoDeWhatsApp remetente="Sua loja" texto={texto} />
            </Secao>
          ) : escolhido ? (
            <Secao
              titulo="Prévia"
              descricao={escolhido.name}
              acoes={
                <Button size="sm" onClick={copiar} leftIcon={<DocumentDuplicateIcon className="h-4 w-4" />}>
                  Copiar mensagem
                </Button>
              }
            >
              <div className="flex flex-col gap-4">
                {escolhido.variables.length > 0 && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {escolhido.variables.map((variavel) => (
                      <Input
                        key={variavel}
                        id={`variavel-${variavel}`}
                        label={variavel}
                        size="sm"
                        value={valores[variavel] ?? ''}
                        onChange={(e) => setValores((v) => ({ ...v, [variavel]: e.target.value }))}
                        placeholder={`Exemplo para ${variavel}`}
                      />
                    ))}
                  </div>
                )}
                <BalaoDeWhatsApp remetente="Sua loja" texto={texto} />
              </div>
            </Secao>
          ) : (
            <div className="superficie">
              <EmptyState
                icone={<ChatBubbleLeftRightIcon className="h-10 w-10" />}
                titulo="Escolha um modelo"
               
              />
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
};

export default WhatsAppTemplatesPage;
