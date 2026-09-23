import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowUpTrayIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';

import { Button, Card, Table } from '../../../components/common';
import { PageShell } from '../../../components/ui';
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
} from './planilhaDoCardapio';

/**
 * Subir o cardápio de uma planilha.
 *
 * Existe porque a implantação custa 7,9 h por cliente e a maior fatia é
 * digitar produto por produto. É o teto que impede vender volume.
 *
 * DOIS PASSOS sempre: confere e mostra, só então grava. Importar 80 produtos
 * errados é pior que não importar.
 */
export const ImportarCardapioPage: React.FC = () => {
  const { storeSlug } = useStore();
  const entrada = useRef<HTMLInputElement>(null);

  const [arquivo, setArquivo] = useState<File | null>(null);
  const [nomeDoArquivo, setNomeDoArquivo] = useState('');
  const [conferencia, setConferencia] = useState<Conferencia | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const escolher = async (evento: React.ChangeEvent<HTMLInputElement>) => {
    const escolhido = evento.target.files?.[0];
    if (!escolhido || !storeSlug) return;
    // O ARQUIVO vai inteiro para o servidor. Ler com `.text()` aqui quebrava
    // duas vezes: .xlsx é binário, e o CSV do Excel brasileiro vem em cp1252
    // (lido como UTF-8, "Preço" virava "Pre?o" e a coluna sumia).
    setArquivo(escolhido);
    setNomeDoArquivo(escolhido.name);
    setConferencia(null);
    setOcupado(true);
    try {
      const corpo = new FormData();
      corpo.append('arquivo', escolhido);
      corpo.append('confirmar', 'false');
      const { data } = await api.post(`/stores/${storeSlug}/produtos/importar/`, corpo);
      setConferencia(data);
    } catch (erro) {
      toast.error(getErrorMessage(erro));
    } finally {
      setOcupado(false);
    }
  };

  const importar = async () => {
    if (!storeSlug || !arquivo || !podeImportar(conferencia)) return;
    setOcupado(true);
    try {
      const corpo = new FormData();
      corpo.append('arquivo', arquivo);
      corpo.append('confirmar', 'true');
      const { data } = await api.post(`/stores/${storeSlug}/produtos/importar/`, corpo);
      toast.success(resumoDoResultado(data));
      setConferencia(null);
      setArquivo(null);
      setNomeDoArquivo('');
      if (entrada.current) entrada.current.value = '';
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
      descricao="Suba uma planilha e cadastre o cardápio inteiro de uma vez."
    >
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
            aria-label="Planilha do cardápio (Excel ou CSV)"
            className="controle w-full rounded-lg p-2 text-sm"
          />
          {nomeDoArquivo && (
            <p className="mt-1 text-xs text-fg-muted-token">{nomeDoArquivo}</p>
          )}
        </div>
      </Card>

      {conferencia && (
        <Card className="superficie mt-5 p-4 sm:p-5">
          <p className="font-medium text-fg-token">{resumoDaConferencia(conferencia)}</p>

          {conferencia.erros.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium text-danger-token">
                Linhas que ficaram de fora
              </p>
              <ul className="mt-1 space-y-1 text-sm text-fg-muted-token">
                {conferencia.erros.map((e) => (
                  <li key={e.linha}>
                    <strong>Linha {e.linha}:</strong> {e.motivo}
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
