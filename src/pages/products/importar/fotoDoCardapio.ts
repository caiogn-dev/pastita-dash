/**
 * Foto ou PDF do cardápio — o que a tela decide antes e depois do servidor.
 *
 * Quem lê a foto é o backend (modelo de visão da NVIDIA) e ele devolve a
 * MESMA conferência da planilha. Aqui mora só o que o lojista precisa ouvir:
 * se o que escolheu faz sentido, quanto vai esperar, e como confirmar sem
 * mandar a foto de novo.
 */
import type { Conferencia, ItemConferido, Origem } from './planilhaDoCardapio';

/** Páginas por envio — o mesmo teto do backend (`MAX_PAGINAS`). */
export const MAX_PAGINAS = 8;

/** O que o seletor de arquivo oferece na aba de foto. */
export const ACEITA_FOTO_OU_PDF = 'image/jpeg,image/png,image/webp,application/pdf,.pdf';

/**
 * O padrão do painel é 15 s (`api.ts`). Uma página leva ~5 s no modelo, mas a
 * primeira chamada do dia e o provedor sob carga passam de 20 s. Cortar em
 * 15 s mostraria "falhou" para uma leitura que ia dar certo.
 */
export const TEMPO_LIMITE_LEITURA_MS = 100_000;

interface Selecionado {
  name: string;
  type: string;
}

const ehPdf = (a: Selecionado) => a.type === 'application/pdf' || /\.pdf$/i.test(a.name);
const ehImagem = (a: Selecionado) =>
  a.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/i.test(a.name);

/** O problema com o que foi escolhido, ou `null` se dá para enviar. */
export function problemaNaSelecao(arquivos: Selecionado[]): string | null {
  if (arquivos.length === 0) return null;
  if (arquivos.some((a) => !ehPdf(a) && !ehImagem(a))) {
    return 'Aqui vão fotos ou PDF. Para Excel ou CSV, use a aba Planilha.';
  }
  const pdfs = arquivos.filter(ehPdf).length;
  if (pdfs > 0 && arquivos.length > 1) {
    return 'Envie um PDF por vez, sem fotos junto. Várias fotos juntas podem — são as páginas do cardápio.';
  }
  if (arquivos.length > MAX_PAGINAS) {
    return `Envie no máximo ${MAX_PAGINAS} fotos por vez. Cardápio maior sobe em duas vezes.`;
  }
  return null;
}

export function mensagemDeEspera(paginas: number): string {
  if (paginas <= 1) return 'Lendo o cardápio… leva uns 10 segundos.';
  return `Lendo ${paginas} páginas do cardápio… leva uns 10 a 20 segundos.`;
}

/** "Item 3" na foto (não existe linha para contar); "Linha 3" na planilha. */
export function rotuloDoErro(origem: Origem | undefined, linha: number): string {
  return origem === 'foto' || origem === 'pdf' ? `Item ${linha}` : `Linha ${linha}`;
}

/**
 * O corpo da confirmação: a tabela que o dono VIU. Reenviar a foto chamaria
 * o modelo de novo — mais espera, outra cobrança, e uma leitura que pode sair
 * diferente da aprovada. O backend passa `linhas` pelo mesmo `conferir()`.
 */
export function corpoDaConfirmacao(c: Conferencia): { linhas: ItemConferido[]; confirmar: true } {
  return {
    linhas: c.validos.map(({ nome, preco, categoria, descricao }) => ({
      nome,
      preco,
      categoria,
      descricao: descricao ?? '',
    })),
    confirmar: true,
  };
}
