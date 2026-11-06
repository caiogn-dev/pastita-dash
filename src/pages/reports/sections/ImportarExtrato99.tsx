/**
 * "Importar extrato da 99" — na linha do canal 99Food em Relatórios › Vendas.
 *
 * O dono cola a lista do 99store (ou envia CSV/planilha), vê a prévia e só
 * então confirma. A gravação diz ao relatório quanto caiu na conta por pedido.
 */
import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Modal, Textarea } from '../../../components/ui';
import { importarExtrato99, type ResultadoDoExtrato99 } from '../../../services/reports';
import { formatBRL } from './shared';

function mensagemDeErro(erro: unknown): string {
  const data = (erro as { response?: { data?: { error?: string } } })?.response?.data;
  return data?.error || 'Não deu para ler o extrato. Tente de novo.';
}

export const ImportarExtrato99: React.FC = () => {
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previa, setPrevia] = useState<ResultadoDoExtrato99 | null>(null);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const fechar = () => {
    setAberto(false);
    setTexto('');
    setArquivo(null);
    setPrevia(null);
    setErro('');
  };

  const enviar = async (gravar: boolean) => {
    setEnviando(true);
    setErro('');
    try {
      const resultado = await importarExtrato99({ texto, arquivo, gravar });
      if (gravar) {
        await queryClient.invalidateQueries({ queryKey: ['reports'] });
        fechar();
      } else {
        setPrevia(resultado);
      }
    } catch (e) {
      setPrevia(null);
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  };

  const vazio = !texto.trim() && !arquivo;

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setAberto(true)}>
        Importar extrato da 99
      </Button>
      <Modal open={aberto} onClose={fechar} title="Importar extrato da 99" size="md">
        <div className="flex flex-col gap-3">
          <Textarea
            label="Cole a lista do 99store"
            rows={6}
            value={texto}
            onChange={(e) => { setTexto(e.target.value); setPrevia(null); }}
          />
          <label className="text-sm text-fg-muted-token">
            ou envie o arquivo (.csv, .xlsx)
            <input
              type="file"
              accept=".csv,.xlsx,text/csv"
              className="block mt-1 text-sm"
              onChange={(e) => { setArquivo(e.target.files?.[0] ?? null); setPrevia(null); }}
            />
          </label>

          {erro && <p role="alert" className="text-sm text-danger-token">{erro}</p>}

          {previa && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm rounded-lg bg-surface-2 p-3">
              <dt>Conciliados</dt><dd className="text-right tabular-nums">{previa.conciliados}</dd>
              <dt>Sem pedido</dt><dd className="text-right tabular-nums">{previa.sem_pedido}</dd>
              <dt>Divergentes</dt><dd className="text-right tabular-nums">{previa.divergentes}</dd>
              <dt>Venda</dt><dd className="text-right tabular-nums">{formatBRL(Number(previa.venda))}</dd>
              <dt className="font-semibold">Recebido</dt>
              <dd className="text-right tabular-nums font-semibold">{formatBRL(Number(previa.recebido))}</dd>
            </dl>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={fechar}>Cancelar</Button>
            {previa ? (
              <Button onClick={() => { void enviar(true); }} disabled={enviando || previa.conciliados === 0}>
                Confirmar
              </Button>
            ) : (
              <Button onClick={() => { void enviar(false); }} disabled={enviando || vazio}>
                Ver prévia
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
};
