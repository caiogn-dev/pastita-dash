/**
 * Os templates de cardápio vêm do backend.
 *
 * Esta lista já foi escrita à mão aqui, com um comentário dizendo "espelha o
 * backend" — e espelho é exatamente o problema: quando o `banquete` entrou no
 * storefront, o painel não soube. O template existia na tela pública, era
 * invisível para o dono, e só dava para ligar por script no banco.
 *
 * Agora quem sabe quais templates existem é quem VALIDA — `Store.StoreTemplate`
 * no server2 — e `GET /stores/templates/` serve essa lista. Adicionar um
 * template é uma linha no model mais os arquivos do storefront; esta tela se
 * atualiza sozinha, sem deploy do painel.
 *
 * O fallback abaixo NÃO é a fonte: é o que a tela mostra se a rede falhar, para
 * a aparência não virar uma tela vazia. Ele pode ficar desatualizado sem
 * consequência — é rede caída, não catálogo.
 */
import api from '../../services/api';
import logger from '../../services/logger';

export interface TemplateDoCardapio {
  id: string;
  label: string;
  /** Para QUEM serve — o dono escolhe pelo próprio negócio, não pela decoração. */
  description: string;
  preview: string;
}

/** Só para rede caída. A fonte é `GET /stores/templates/`. */
export const TEMPLATES_DE_EMERGENCIA: TemplateDoCardapio[] = [
  { id: 'fresh', label: 'Fresh', description: 'Claro, leve e visual. Ideal para saladas, bowls e comida saudável.', preview: '🥗' },
  { id: 'bold', label: 'Bold', description: 'Promocional, forte e direto. Ideal para salgadinhos, pizza, burger e pastel.', preview: '🍔' },
  { id: 'classic', label: 'Classic', description: 'Tradicional e editorial. Ideal para restaurantes, marmitas e cardápios clássicos.', preview: '🍱' },
  { id: 'minimal', label: 'Minimal', description: 'Compacto e rápido. Ideal para cardápio estilo app de delivery.', preview: '⚡' },
  { id: 'dark', label: 'Dark', description: 'Escuro e contrastado. Ideal para marcas noturnas, adegas e lanches premium.', preview: '🌙' },
  { id: 'elegant', label: 'Elegant', description: 'Cards horizontais e tipografia serifada. Ideal para confeitarias, doces e bolos.', preview: '🍰' },
  { id: 'banquete', label: 'Banquete', description: 'Carta impressa, sem depender de fotos. Ideal para banqueterias, buffets e encomendas por peso.', preview: '🕯️' },
];

/** Só aceita item completo: template sem rótulo vira cartão em branco na tela. */
const ehTemplateValido = (t: unknown): t is TemplateDoCardapio => {
  const c = t as Partial<TemplateDoCardapio>;
  return Boolean(c && typeof c.id === 'string' && c.id && typeof c.label === 'string' && c.label);
};

export const buscarTemplates = async (): Promise<TemplateDoCardapio[]> => {
  try {
    const { data } = await api.get('/stores/templates/');
    const lista = (Array.isArray(data?.results) ? data.results : []).filter(ehTemplateValido);
    // Lista vazia é resposta quebrada, não "nenhum template": cair no fallback
    // é melhor que deixar o dono sem nenhuma opção para escolher.
    return lista.length > 0 ? lista : TEMPLATES_DE_EMERGENCIA;
  } catch (error) {
    logger.error('Falha ao buscar os templates de cardápio', error);
    return TEMPLATES_DE_EMERGENCIA;
  }
};
