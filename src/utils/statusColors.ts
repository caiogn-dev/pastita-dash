export const ORDER_STATUS_COLOR: Record<string, string> = {
  pending:          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  confirmed:        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  preparing:        'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  out_for_delivery: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  delivered:        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  completed:        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  cancelled:        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  failed:           'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  ready:            'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending:          'Pendente',
  confirmed:        'Confirmado',
  preparing:        'Preparando',
  out_for_delivery: 'Em entrega',
  delivered:        'Entregue',
  completed:        'Concluído',
  cancelled:        'Cancelado',
  failed:           'Falhou',
  ready:            'Pronto',
};
