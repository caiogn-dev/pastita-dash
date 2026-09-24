/**
 * A aba Nutricional do formulário de produto, atrás do portão do adicional
 * Etiqueta ANVISA. Arquivo próprio para continuar carregado sob demanda: o
 * formulário não importa o cliente de API só por causa desta aba.
 */
import { PortaoDoAdicional } from '../../components/billing/PortaoDoAdicional';
import { ADICIONAL_ETIQUETA } from '../../services/billing';
import RecipeBuilder from './RecipeBuilder';

export default function ReceitaDoProduto({ productId, storeUuid }: { productId: string; storeUuid?: string }) {
  return (
    <PortaoDoAdicional chave={ADICIONAL_ETIQUETA}>
      <RecipeBuilder productId={productId} storeUuid={storeUuid} ingredients={[]} />
    </PortaoDoAdicional>
  );
}
