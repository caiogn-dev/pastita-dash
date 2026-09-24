/**
 * A lista de clientes vira planilha.
 *
 * Quem abre o arquivo é o dono no Excel, e as colunas — e-mail, nome, telefone
 * — chegam do cliente pelo storefront. Sem tratamento, dois problemas antigos
 * de exportação voltam:
 *
 * 1. Column-shift: um cliente chamado "Silva, Maria" tem uma vírgula no meio do
 *    nome e desloca todas as colunas seguintes; o arquivo parece certo até
 *    alguém ler o telefone na coluna do status.
 * 2. Formula injection (OWASP): uma célula de TEXTO que começa com `= + - @`
 *    (ou tab/CR) é executada como fórmula pelo Excel/LibreOffice/Sheets ao abrir
 *    o arquivo (ex.: `=HYPERLINK`/`cmd` exfiltram dados na máquina do dono).
 *    Prefixamos `'` para forçar interpretação como texto.
 *
 * Mantemos o separador `,` e o cabeçalho em inglês (`email,name,phone,status`)
 * porque o mesmo formato é relido pela importação (cola de texto separado por
 * vírgula) — trocar para `;` quebraria o ida-e-volta. Mesma defesa do
 * `exportarPedidos.ts`, adaptada ao separador vírgula.
 */
import type { Subscriber } from '../../services/marketingService';

export type AssinanteExportavel = Pick<
  Subscriber,
  'email' | 'name' | 'phone' | 'status'
>;

const COLUNAS = ['email', 'name', 'phone', 'status'] as const;

// Gatilhos de fórmula: início de célula que o Excel executa ao abrir.
const GATILHO_DE_FORMULA = /^[=+\-@\t\r]/;

/** Aspeia quando o valor pode confundir o parser CSV (separador vírgula). */
function campo(texto: string): string {
  // CR entra na condição junto de LF: um CR "cru" fora de célula aspeada é
  // separador de registro para vários leitores e reabriria a formula injection
  // (o trecho após o CR viraria uma nova linha começando com "=").
  if (/[",\n\r]/.test(texto)) {
    // Aspa interna vira aspa dupla — regra do CSV. Removê-la alteraria o dado.
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

/** Célula de texto: neutraliza gatilho de fórmula e então aspeia como CSV. */
function celula(valor: string | null | undefined): string {
  if (valor === null || valor === undefined) return '';
  const bruto = String(valor);
  return campo(GATILHO_DE_FORMULA.test(bruto) ? `'${bruto}` : bruto);
}

export function assinantesParaCsv(assinantes: AssinanteExportavel[]): string {
  const linhas = [COLUNAS.join(',')];
  for (const a of assinantes) {
    linhas.push(
      [
        celula(a.email),
        celula(a.name),
        celula(a.phone ?? ''),
        celula(a.status),
      ].join(','),
    );
  }
  // Lista vazia devolve o cabeçalho sozinho: arquivo de 0 byte parece download
  // quebrado, enquanto o cabeçalho abre e mostra que o recorte não tinha nada.
  return linhas.join('\n');
}
