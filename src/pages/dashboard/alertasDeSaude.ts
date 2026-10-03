import type { InsightItem } from '../../components/ui/InsightList';

export interface AlertaDeSaude {
  key: string;
  quantidade: number;
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/**
 * Alertas de saúde da loja (backend: onboarding_checklist.alertas_de_saude)
 * viram linhas do "Precisa de você": o que hoje impede a loja de vender, e
 * o botão que leva ao lugar de resolver. Em 03/10 o cardápio inteiro da
 * Agrião estava escondido e nada avisou.
 */
export function itensDeSaude(
  alertas: AlertaDeSaude[],
  storeRoute: string,
  ir: (rota: string) => void,
): InsightItem[] {
  const produtos = `/stores/${storeRoute}/products`;
  return alertas.flatMap((a): InsightItem[] => {
    switch (a.key) {
      case 'entrega_sem_endereco':
        return [{
          direcao: 'alta',
          titulo: 'Entrega ligada sem o endereço da loja',
          recomendacao: 'sem ele o frete não é calculado',
          acao: { rotulo: 'Marcar no mapa', onClick: () => ir(`/stores/${storeRoute}/settings`) },
        }];
      case 'produto_sem_preco':
        return [{
          direcao: 'alta',
          titulo: `${plural(a.quantidade, 'produto', 'produtos')} à venda por R$ 0,00`,
          valor: String(a.quantidade),
          recomendacao: 'o cliente leva sem pagar',
          acao: { rotulo: 'Ver produtos', onClick: () => ir(produtos) },
        }];
      case 'produto_escondido':
        return [{
          direcao: 'alta',
          titulo: `${plural(a.quantidade, 'produto à venda escondido', 'produtos à venda escondidos')} do cardápio`,
          valor: String(a.quantidade),
          recomendacao: 'a categoria deles está desligada',
          acao: { rotulo: 'Ver produtos', onClick: () => ir(produtos) },
        }];
      default:
        return [];
    }
  });
}
