/**
 * Modelos de mensagem do WhatsApp.
 *
 * Simples (25/09): a lista à esquerda, a prévia à direita no mesmo balão da
 * campanha (`BalaoDeWhatsApp`), variáveis em `Input` do kit. Saíram o fundo
 * verde do WhatsApp em hex, a cor por categoria, o campo de texto cru e os botões
 * "Usar template" e "Editar" que não faziam nada. O que a prévia entrega de
 * verdade é a mensagem pronta: "Copiar mensagem".
 */
import React, { useMemo, useState } from 'react';
import { ChatBubbleLeftRightIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { BalaoDeWhatsApp } from '../../../components/marketing/BalaoDeWhatsApp';
import { Badge, Button, EmptyState, Input, PageShell, PeriodChips, Secao } from '../../../components/ui';
import { cn } from '../../../utils/cn';
import { getTemplatesByCategory, whatsappTemplates, WhatsAppTemplate } from '../../../data/whatsappTemplates';

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
    setEscolhido(modelo);
    setValores(Object.fromEntries(modelo.variables.map((v) => [v, ''])));
  };

  const texto = escolhido ? preencher(escolhido, valores) : '';

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
      descricao="Mensagens prontas para o WhatsApp. Escolha uma, preencha os campos e veja como o cliente recebe."
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

        <div className="lg:sticky lg:top-6">
          {escolhido ? (
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
                descricao="Clique num modelo da lista para ver como ele chega no WhatsApp do cliente."
              />
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
};

export default WhatsAppTemplatesPage;
