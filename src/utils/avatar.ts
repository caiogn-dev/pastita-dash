// Paleta de avatar 100% dentro da identidade Dark Luxe (carvão + ouro):
// variações de ouro/bronze/oliva/cobre — diferenciáveis entre si, mas nenhuma
// foge da marca (nada de azul/roxo/verde/rosa).
const PALETTE = [
  '#C9A24B', // ouro (marca)
  '#A67C2E', // ouro escuro
  '#8C6D3F', // bronze
  '#B0895A', // camelo
  '#7A6A4F', // oliva acinzentado
  '#9C7C38', // ocre
  '#6E5A2E', // oliva escuro
  '#5C5248', // carvão quente
];

export function getAvatarColor(name: string): string {
  const sum = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return PALETTE[sum % PALETTE.length];
}

export function getInitials(name?: string, phone?: string): string {
  if (name) return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return phone?.slice(-2) || '?';
}
