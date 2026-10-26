/**
 * O perfil de atendimento automático (CompanyProfile) da loja selecionada.
 *
 * Três telas precisam dele (26/10): Avisos automáticos (os textos), o
 * Recuperador (os lembretes de carrinho) e Modelos de mensagem (a conta do
 * WhatsApp de onde vêm os modelos da Meta). Cada uma resolvia à mão, e uma
 * delas listava sem filtro — trazendo as mensagens de todas as lojas do dono.
 *
 * `idFixo` é a rota antiga `automation/companies/:id/messages`, que já diz o
 * perfil na URL.
 */
import { useCallback, useEffect, useState } from 'react';

import { companyProfileService } from '../../services/automation';
import { useStore } from '../../hooks/useStore';
import type { CompanyProfile } from '../../types';

export type EstadoDoPerfil = 'carregando' | 'pronto' | 'sem-perfil' | 'falhou';

export function usePerfilDeAutomacao(idFixo?: string) {
  const { storeSlug } = useStore();
  const [perfil, setPerfil] = useState<CompanyProfile | null>(null);
  const [estado, setEstado] = useState<EstadoDoPerfil>('carregando');
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    if (!idFixo && !storeSlug) return undefined;
    let vivo = true;
    setPerfil(null);
    setEstado('carregando');
    const busca = idFixo
      ? companyProfileService.get(idFixo)
      : companyProfileService.list({ store_slug: storeSlug as string }).then((r) => r.results?.[0] ?? null);
    busca
      .then((achado) => {
        if (!vivo) return;
        setPerfil(achado);
        setEstado(achado ? 'pronto' : 'sem-perfil');
      })
      .catch(() => {
        if (vivo) setEstado('falhou');
      });
    return () => {
      vivo = false;
    };
  }, [idFixo, storeSlug, tentativa]);

  const tentarDeNovo = useCallback(() => setTentativa((n) => n + 1), []);

  return { perfil, estado, tentarDeNovo };
}
