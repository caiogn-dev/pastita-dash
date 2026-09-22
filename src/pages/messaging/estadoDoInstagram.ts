/**
 * O estado real da conexão do Instagram.
 *
 * "Ligada" e "funcionando" não são a mesma coisa: a conta pode estar ativa no
 * banco e com o token recusado pela Meta — canal mudo, e o lojista sem saber.
 */
export type EstadoDaConexao = 'funcionando' | 'desconectado' | 'pausado';

export function estadoDoInstagram({
  isActive,
  precisaReconectar,
}: { isActive?: boolean; precisaReconectar?: boolean }): EstadoDaConexao {
  if (!isActive) return 'pausado';
  return precisaReconectar ? 'desconectado' : 'funcionando';
}
