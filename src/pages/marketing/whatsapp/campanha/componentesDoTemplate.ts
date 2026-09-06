import { MessageTemplate } from '../../../../types';

/** De onde a variável veio no template — decide em qual componente ela entra. */
export type OrigemDaVariavel = 'corpo' | 'cabecalho' | 'botao';

export interface VariavelDoTemplate {
  nome: string;
  origem: OrigemDaVariavel;
}

const ORIGEM_POR_TIPO: Record<string, OrigemDaVariavel> = {
  HEADER: 'cabecalho',
  BUTTONS: 'botao',
};

/** Como a Meta descreve um componente. Vem da API dela, sem tipo nosso. */
type ComponenteDaMeta = {
  type?: string;
  format?: string;
  text?: string;
  example?: { body_text_named_params?: Array<{ param_name?: string }> };
};

/**
 * As variáveis que um template pede.
 *
 * Duas fontes: as chaves `{{assim}}` escritas no texto e os
 * `body_text_named_params` que a Meta devolve à parte quando o template usa
 * parâmetros nomeados. As duas precisam ser lidas — um template pode ter só a
 * segunda.
 */
export const variaveisDoTemplate = (template?: MessageTemplate): VariavelDoTemplate[] => {
  if (!template?.components) return [];

  // Map e não array: a mesma variável costuma aparecer duas vezes no texto, e
  // repetir o parâmetro faz a Meta recusar por contagem divergente.
  const achadas = new Map<string, VariavelDoTemplate>();

  (template.components as ComponenteDaMeta[]).forEach((componente) => {
    const tipo = String(componente?.type ?? '').toUpperCase();
    const origem = ORIGEM_POR_TIPO[tipo] ?? 'corpo';

    for (const achado of String(componente?.text ?? '').matchAll(/{{\s*([a-zA-Z0-9_]+)\s*}}/g)) {
      achadas.set(achado[1], { nome: achado[1], origem });
    }

    (componente?.example?.body_text_named_params ?? []).forEach((param) => {
      if (param?.param_name) {
        achadas.set(param.param_name, { nome: param.param_name, origem });
      }
    });
  });

  return Array.from(achadas.values());
};

/**
 * O MOLDE dos componentes do envio. ESPECIFICAÇÃO em
 * `__tests__/componentesDoTemplate.spec.ts` — leia antes de mexer.
 *
 * O `text` sai VAZIO de propósito: o backend substitui `variable` pelo valor
 * de cada destinatário e só depois remove a chave `variable`, que é interna do
 * painel, antes de enviar para a Meta.
 */
export const componentesDoTemplate = (
  template: MessageTemplate | undefined,
  variaveis: VariavelDoTemplate[],
  urlDaImagem?: string,
): Array<Record<string, unknown>> => {
  const componentes: Array<Record<string, unknown>> = [];

  const temCabecalhoDeImagem = (template?.components as ComponenteDaMeta[] | undefined)?.some(
    (c) =>
      String(c?.type ?? '').toUpperCase() === 'HEADER' &&
      String(c?.format ?? '').toUpperCase() === 'IMAGE',
  );

  // Só quando HÁ imagem: um `header` sem link é recusado na hora pela Meta.
  if (temCabecalhoDeImagem && urlDaImagem) {
    componentes.push({
      type: 'header',
      parameters: [{ type: 'image', image: { link: urlDaImagem } }],
    });
  }

  const doCorpo = variaveis.filter((v) => v.origem === 'corpo');
  if (doCorpo.length > 0) {
    componentes.push({
      type: 'body',
      parameters: doCorpo.map((v) => ({
        type: 'text',
        // `{{1}}` é POSICIONAL na Meta; mandar `parameter_name: "1"` junto faz
        // a API recusar o envio.
        ...(/^\d+$/.test(v.nome) ? {} : { parameter_name: v.nome }),
        variable: v.nome,
        text: '',
      })),
    });
  }

  return componentes;
};
