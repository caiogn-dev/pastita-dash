import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowUpTrayIcon,
  CameraIcon,
  DocumentArrowDownIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';

import { Button, Card, Table } from '../../../components/common';
import { PageShell, PageTabs } from '../../../components/ui';
import api from '../../../services/api';
import { getErrorMessage } from '../../../services';
import { useStore } from '../../../hooks/useStore';
import {
  COLUNAS_ACEITAS,
  FORMATOS_ACEITOS,
  MODELO_CSV,
  podeImportar,
  resumoDaConferencia,
  resumoDoResultado,
  type Conferencia,
  type ItemConferido,
} from './planilhaDoCardapio';
import {
  ACEITA_FOTO_OU_PDF,
  corpoDaConfirmacao,
  mensagemDeEspera,
  problemaNaSelecao,
  rotuloDoErro,
  TEMPO_LIMITE_LEITURA_MS,
} from './fotoDoCardapio';

/**
 * Subir o cardápio de uma planilha, de fotos ou de um PDF.
 *
 * Existe porque a implantação custa 7,9 h por cliente e a maior fatia é
 * digitar produto por produto. É o teto que impede vender volume.
 *
 * DOIS PASSOS sempre: confere e mostra, só então grava. Importar 80 produtos
 * errados é pior que não importar. As três portas desaguam na MESMA
 * conferência do backend, e a confirmação manda a tabela que o dono viu —
 * não o arquivo de novo (na foto, ler de novo poderia sair diferente).
 */
export const ImportarCardapioPage: React.FC = () => {
  const { storeSlug } = useStore();
  const entrada = useRef<HTMLInputElement>(null);

  const entradaFoto = useRef<HTMLInputElement>(null);

  const [nomeDoArquivo, setNomeDoArquivo] = useState('');
  const [conferencia, setConferencia] = useState<Conferencia | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [lendo, setLendo] = useState('');

  const limpar = () => {
    setConferencia(null);
    setNomeDoArquivo('');
    if (entrada.current) entrada.current.value = '';
    if (entradaFoto.current) entradaFoto.current.value = '';
  };

  /** Manda os arquivos para CONFERIR. O servidor decide pelo conteúdo. */
  const conferir = async (arquivos: File[], espera: string, tempoLimite?: number) => {
    if (arquivos.length === 0 || !storeSlug) return;
    setNomeDoArquivo(arquivos.map((a) => a.name).join(', '));
    setConferencia(null);
    setOcupado(true);
    setLendo(espera);
    try {
      const corpo = new FormData();
      arquivos.forEach((a) => corpo.append('arquivo', a));
      corpo.append('confirmar', 'false');
      const { data } = await api.post(
        `/stores/${storeSlug}/produtos/importar/`,
        corpo,
        tempoLimite ? { timeout: tempoLimite } : undefined,
      );
      setConferencia(data);
    } catch (erro) {
      toast.error(getErrorMessage(erro));
    } finally {
      setOcupado(false);
      setLendo('');
    }
  };

  const escolher = async (evento: React.ChangeEvent<HTMLInputElement>) => {
    const escolhido = evento.target.files?.[0];
    // O ARQUIVO vai inteiro para o servidor. Ler com `.text()` aqui quebrava
    // duas vezes: .xlsx é binário, e o CSV do Excel brasileiro vem em cp1252
    // (lido como UTF-8, "Preço" virava "Pre?o" e a coluna sumia).
    if (escolhido) await conferir([escolhido], 'Conferindo a planilha…');
  };

  const escolherFotos = async (evento: React.ChangeEvent<HTMLInputElement>) => {
    const arquivos = Array.from(evento.target.files ?? []);
    const problema = problemaNaSelecao(arquivos);
    if (problema) {
      toast.error(problema);
      limpar();
      return;
    }
    await conferir(arquivos, mensagemDeEspera(arquivos.length), TEMPO_LIMITE_LEITURA_MS);
  };

  const importar = async () => {
    if (!storeSlug || !conferencia || !podeImportar(conferencia)) return;
    setOcupado(true);
    try {
      const { data } = await api.post(
        `/stores/${storeSlug}/produtos/importar/`,
        corpoDaConfirmacao(conferencia),
      );
      toast.success(resumoDoResultado(data));
      limpar();
    } catch (erro) {
      toast.error(getErrorMessage(erro));
    } finally {
      setOcupado(false);
    }
  };

  const baixarModelo = () => {
    // BOM no começo: sem ele o Excel abre "Preço" como "PreÃ§o" e o dono
    // acha que o modelo veio quebrado.
    const blob = new Blob(['﻿' + MODELO_CSV], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo-cardapio.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PageShell
      titulo="Importar cardápio"
      descricao="Suba uma planilha, fotos ou o PDF do cardápio e cadastre tudo de uma vez."
    >
      <PageTabs
        ariaLabel="Como enviar o cardápio"
        abas={[
          { id: 'planilha', rotulo: 'Planilha', icone: TableCellsIcon },
          { id: 'foto', rotulo: 'Foto ou PDF do cardápio', icone: CameraIcon },
        ]}
      >
        {(aba) =>
          aba === 'foto' ? (
            <Card className="superficie p-4 sm:p-5">
              <ol className="space-y-3 text-sm text-fg-token">
                <li>
                  <strong>1.</strong> Tire uma foto de cada página do cardápio — de
                  frente, com boa luz e sem cortar os preços. Serve também o PDF da
                  gráfica.
                </li>
                <li>
                  <strong>2.</strong> Pode escolher várias fotos de uma vez: cada uma
                  é uma página.
                </li>
                <li>
                  <strong>3.</strong> Você confere o que eu li <em>antes</em> de
                  confirmar. Item sem preço legível fica de fora, com o nome, para
                  você cadastrar à mão — nunca entra de graça.
                </li>
              </ol>

              <div className="mt-4">
                <input
                  ref={entradaFoto}
                  type="file"
                  multiple
                  accept={ACEITA_FOTO_OU_PDF}
                  onChange={(e) => void escolherFotos(e)}
                  disabled={ocupado}
                  aria-label="Fotos ou PDF do cardápio"
                  className="controle w-full rounded-lg p-2 text-sm"
                />
                {nomeDoArquivo && !lendo && (
                  <p className="mt-1 text-xs text-fg-muted-token">{nomeDoArquivo}</p>
                )}
                {lendo && (
                  <p className="mt-2 text-sm text-fg-muted-token" role="status">{lendo}</p>
                )}
              </div>
            </Card>
          ) : (
            <Card className="superficie p-4 sm:p-5">
              <ol className="space-y-3 text-sm text-fg-token">
                <li>
                  <strong>1.</strong> Baixe o modelo e preencha com os seus produtos.{' '}
                  <button
                    type="button"
                    onClick={baixarModelo}
                    className="inline-flex items-center gap-1 font-medium text-brand-ink underline underline-offset-2"
                  >
                    <DocumentArrowDownIcon className="h-4 w-4" aria-hidden="true" />
                    Baixar modelo
                  </button>
                </li>
                <li>
                  <strong>2.</strong> Serve {FORMATOS_ACEITOS}. Preço pode ser{' '}
                  <code>32,90</code> ou <code>R$ 32,90</code>, e a categoria é criada
                  sozinha se ainda não existir.
                </li>
                <li>
                  {/* Os nomes aceitos viviam só no backend. Sem isto o lojista
                      renomeava as colunas à mão — o trabalho que a tela veio tirar. */}
                  <strong>3.</strong> Não precisa renomear suas colunas. Eu entendo:
                  <ul className="mt-1 space-y-0.5">
                    {COLUNAS_ACEITAS.map((c) => (
                      <li key={c.chave} className="text-fg-muted-token">
                        <span className="text-fg-token">{c.titulo}</span>
                        {c.obrigatoria ? ' (obrigatória)' : ' (opcional)'} —{' '}
                        {c.exemplos.map((e) => (
                          <code key={e} className="mr-1">{e}</code>
                        ))}
                      </li>
                    ))}
                  </ul>
                </li>
                <li>
                  <strong>4.</strong> Você vê o que vai entrar <em>antes</em> de
                  confirmar.
                </li>
              </ol>

              <div className="mt-4">
                <input
                  ref={entrada}
                  type="file"
                  accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                  onChange={(e) => void escolher(e)}
                  disabled={ocupado}
                  aria-label="Planilha do cardápio (Excel ou CSV)"
                  className="controle w-full rounded-lg p-2 text-sm"
                />
                {nomeDoArquivo && !lendo && (
                  <p className="mt-1 text-xs text-fg-muted-token">{nomeDoArquivo}</p>
                )}
                {lendo && (
                  <p className="mt-2 text-sm text-fg-muted-token" role="status">{lendo}</p>
                )}
              </div>
            </Card>
          )
        }
      </PageTabs>

      {conferencia && (
        <Card className="superficie mt-5 p-4 sm:p-5">
          <p className="font-medium text-fg-token">{resumoDaConferencia(conferencia)}</p>

          {conferencia.erros.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium text-danger-token">
                {conferencia.origem === 'foto' || conferencia.origem === 'pdf'
                  ? 'Itens que ficaram de fora'
                  : 'Linhas que ficaram de fora'}
              </p>
              <ul className="mt-1 space-y-1 text-sm text-fg-muted-token">
                {conferencia.erros.map((e) => (
                  <li key={e.linha}>
                    <strong>{rotuloDoErro(conferencia.origem, e.linha)}:</strong> {e.motivo}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {conferencia.validos.length > 0 && (
            <div className="mt-4">
              {/* `Table` comum, nao tabela a mao: o guarda de tabelas do
                  painel existe porque cada tabela artesanal reimplementa
                  cabecalho, vazio e responsividade de um jeito diferente. */}
              <Table
                columns={[
                  { key: 'nome', header: 'Produto' },
                  {
                    key: 'preco',
                    header: 'Preço',
                    render: (p) => `R$ ${Number(p.preco).toFixed(2).replace('.', ',')}`,
                  },
                  {
                    key: 'categoria',
                    header: 'Categoria',
                    render: (p) => p.categoria || '—',
                  },
                  // Descrição só aparece quando veio alguma: na foto o modelo
                  // lê os ingredientes embaixo do item, e o dono precisa ver
                  // se grudou no produto certo.
                  ...(conferencia.validos.some((p) => p.descricao)
                    ? [{
                        key: 'descricao',
                        header: 'Descrição',
                        render: (p: ItemConferido) => p.descricao || '—',
                      }]
                    : []),
                ]}
                data={conferencia.validos}
                keyExtractor={(p) => p.nome}
              />
            </div>
          )}

          <Button
            className="mt-5"
            disabled={ocupado || !podeImportar(conferencia)}
            onClick={() => void importar()}
          >
            <ArrowUpTrayIcon className="h-5 w-5" aria-hidden="true" />
            {ocupado ? 'Importando…' : 'Importar para o cardápio'}
          </Button>
        </Card>
      )}
    </PageShell>
  );
};

export default ImportarCardapioPage;
