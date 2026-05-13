const PALETTE = [
  '#722F37', '#2563eb', '#16a34a', '#d97706',
  '#7c3aed', '#db2777', '#0891b2', '#65a30d',
];

export function getAvatarColor(name: string): string {
  const sum = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return PALETTE[sum % PALETTE.length];
}

export function getInitials(name?: string, phone?: string): string {
  if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return phone?.slice(-2) || '?';
}
