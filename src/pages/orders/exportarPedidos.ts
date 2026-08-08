/**
 * O histórico vira planilha.
 *
 * Quem abre o arquivo é o contador ou o próprio dono no Excel, não um
 * programador: cabeçalho em português, valor com vírgula decimal, status
 * traduzido. `total: "45.90"` numa planilha brasileira vira quarenta e cinco
 * mil e noventa — e ninguém revisa a soma de um arquivo que "abriu direito".
 *
 * O escape existe porque exportação quebra sempre no mesmo lugar: um cliente
 * chamado "Silva, Maria" desloca todas as colunas seguintes, e o arquivo
 * parece certo até alguém somar a coluna errada.
 */
import type { StoreOrder } from '../../services/storesApi';
import {
  STATUS_LABELS as STATUS,
  PAYMENT_METHOD_LABELS as PAGAMENTO,
} from '../../utils/rotulosDeEstado';


const COLUNAS = [
  'Pedido', 'Data', 'Hora', 'Cliente', 'Telefone', 'Itens',
  'Canal', 'Pagamento', 'Pago', 'Status', 'Desconto', 'Entrega', 'Total',
] as const;

/** Envolve em aspas quando o valor pode confundir o parser. */
function campo(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  const texto = String(valor);
  if (/[",;\n]/.test(texto)) {
    // Aspa interna vira aspa dupla — regra do CSV. Remover a aspa alteraria o
    // nome do cliente no arquivo.
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

/** Número no formato que a planilha pt-BR entende. */
function moeda(v: number | string | null | undefined): string {
  const n = typeof v === 'string' ? Number(v) : (v ?? 0);
  return (Number.isFinite(n) ? n : 0).toFixed(2).replace('.', ',');
}

export function pedidosParaCsv(pedidos: StoreOrder[]): string {
  const linhas = [COLUNAS.join(',')];

  for (const p of pedidos) {
    const d = new Date(p.created_at);
    const qtd = (p.items?.length ?? 0) + (p.combo_items?.length ?? 0);
    linhas.push([
      campo(p.order_number),
      campo(d.toLocaleDateString('pt-BR')),
      campo(d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })),
      campo(p.customer_name),
      campo(p.customer_phone),
      campo(qtd),
      campo(p.source ?? ''),
      campo(PAGAMENTO[p.payment_method] ?? p.payment_method ?? ''),
      campo(p.payment_status === 'paid' ? 'Sim' : 'Não'),
      campo(STATUS[p.status] ?? p.status),
      campo(moeda(p.discount)),
      campo(moeda(p.delivery_fee)),
      campo(moeda(p.total)),
    ].join(','));
  }

  // Lista vazia devolve o cabeçalho sozinho: arquivo de 0 byte parece download
  // quebrado, enquanto o cabeçalho abre e mostra que o recorte não tinha nada.
  return linhas.join('\n');
}

export function baixarCsv(conteudo: string, nomeDoArquivo: string): void {
  // BOM: sem ele o Excel no Windows lê UTF-8 como Latin-1 e "Ação" vira
  // "AÃ§Ã£o" na primeira coluna que o dono olha.
  const blob = new Blob([`﻿${conteudo}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeDoArquivo;
  a.click();
  URL.revokeObjectURL(url);
}
