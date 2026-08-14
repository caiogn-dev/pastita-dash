import React, { useCallback, useEffect, useState } from 'react';
import { DocumentTextIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { ordersService, getErrorMessage } from '../../services';
import type { NotaFiscal } from '../../services/orders';
import logger from '../../services/logger';

interface NotaFiscalPedidoProps {
  orderId: string;
  storeSlug?: string;
}

const BOTAO =
  'flex w-full items-center justify-center gap-2 rounded border border-white/15 px-4 py-3 text-sm font-medium transition hover:bg-surface/5 disabled:opacity-50';

const CAMPO =
  'w-full rounded border border-white/15 bg-surface px-3 py-2 text-sm text-fg-token focus:outline-none focus:ring-2 focus:ring-brand';

/** CPF/CNPJ só entra na nota se fechar o dígito verificador — número errado
 *  faz a SEFAZ recusar a nota inteira (rejeição 237). Validamos aqui, onde o
 *  operador ainda pode corrigir olhando pro cliente. */
const somenteDigitos = (valor: string) => valor.replace(/\D/g, '');

const cpfValido = (valor: string) => {
  const cpf = somenteDigitos(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digito = (base: string, pesoInicial: number) => {
    const soma = [...base].reduce((acc, d, i) => acc + Number(d) * (pesoInicial - i), 0);
    const resto = soma % 11;
    return resto < 2 ? '0' : String(11 - resto);
  };
  const d1 = digito(cpf.slice(0, 9), 10);
  return cpf.slice(9) === d1 + digito(cpf.slice(0, 9) + d1, 11);
};

const cnpjValido = (valor: string) => {
  const cnpj = somenteDigitos(valor);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const digito = (base: string) => {
    const pesos = base.length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = [...base].reduce((acc, d, i) => acc + Number(d) * pesos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? '0' : String(11 - resto);
  };
  const d1 = digito(cnpj.slice(0, 12));
  return cnpj.slice(12) === d1 + digito(cnpj.slice(0, 12) + d1);
};

/** '' = documento imprestável; senão diz se é pessoa física ou empresa. */
const classificarDocumento = (valor: string): 'cpf' | 'cnpj' | '' => {
  const numero = somenteDigitos(valor);
  if (cpfValido(numero)) return 'cpf';
  if (cnpjValido(numero)) return 'cnpj';
  return '';
};

const ROTULO_STATUS: Record<string, string> = {
  pending: 'Processando na SEFAZ',
  authorized: 'Autorizada',
  rejected: 'Rejeitada',
  cancelled: 'Cancelada',
  error: 'Falhou',
};

const NOME_MODELO: Record<string, string> = { '65': 'NFC-e', '55': 'NF-e' };

const JUSTIFICATIVA_MIN = 15;
const JANELA_CANCELAMENTO_MS = 30 * 60 * 1000;

const dentroDaJanela = (nota: NotaFiscal) =>
  Boolean(nota.created_at) &&
  Date.now() - new Date(nota.created_at as string).getTime() < JANELA_CANCELAMENTO_MS;

/**
 * Notas fiscais do pedido — emissão manual, um documento por modelo.
 *
 * NFC-e (65) é o cupom do consumidor final: sai com ou sem CPF. NF-e (55) é a
 * venda a empresa: exige documento e endereço completos, e o backend recusa
 * dizendo o que falta. O mesmo pedido pode ter as duas.
 *
 * Só aparece em loja com emissão configurada: sem isso, as outras lojas
 * ganhariam um botão que só sabe responder erro.
 */
export const NotaFiscalPedido: React.FC<NotaFiscalPedidoProps> = ({ orderId, storeSlug }) => {
  const [habilitado, setHabilitado] = useState(false);
  const [documentos, setDocumentos] = useState<NotaFiscal[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [emitindo, setEmitindo] = useState<'65' | '55' | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [documento, setDocumento] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [cancelandoModelo, setCancelandoModelo] = useState<'65' | '55' | null>(null);

  const carregar = useCallback(async () => {
    try {
      const resposta = await ordersService.consultarNfce(orderId, storeSlug);
      setHabilitado(resposta.habilitado);
      setDocumentos(resposta.documentos);
    } catch (erro) {
      logger.error('Erro ao consultar notas do pedido:', erro);
    } finally {
      setCarregado(true);
    }
  }, [orderId, storeSlug]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const emitir = async (modelo: '65' | '55') => {
    const numero = documento.trim();
    const tipo = numero ? classificarDocumento(numero) : '';
    if (numero && !tipo) {
      toast.error('CPF/CNPJ inválido — confira o número.');
      return;
    }
    // NF-e não tem "consumidor não identificado": sem documento não existe.
    if (modelo === '55' && !tipo) {
      toast.error('NF-e exige o CPF ou CNPJ do destinatário.');
      return;
    }
    setEmitindo(modelo);
    try {
      const resultado = await ordersService.emitirNfce(
        orderId, { modelo, cpf: numero || undefined }, storeSlug,
      );
      setDocumentos(prev => [...prev.filter(d => d.modelo !== modelo), resultado]);
      if (resultado.status === 'authorized') toast.success(`${NOME_MODELO[modelo]} autorizada`);
      else if (resultado.status === 'pending') toast(`${NOME_MODELO[modelo]} enviada, aguardando a SEFAZ`);
      else toast.error(resultado.error_message || 'A SEFAZ não autorizou a nota');
    } catch (erro) {
      toast.error(getErrorMessage(erro));
    } finally {
      setEmitindo(null);
    }
  };

  const cancelar = async (modelo: '65' | '55') => {
    setCancelando(true);
    try {
      const resultado = await ordersService.cancelarNfce(
        orderId, justificativa.trim(), modelo, storeSlug,
      );
      setDocumentos(prev => prev.map(d => (d.modelo === modelo ? resultado : d)));
      setCancelandoModelo(null);
      setJustificativa('');
      toast.success('Nota cancelada');
    } catch (erro) {
      toast.error(getErrorMessage(erro));
    } finally {
      setCancelando(false);
    }
  };

  if (!carregado || !habilitado) return null;

  const tipoDigitado = classificarDocumento(documento);
  const jaEmitida = (modelo: '65' | '55') =>
    documentos.some(d => d.modelo === modelo && (d.status === 'authorized' || d.status === 'pending'));

  return (
    <div className="mt-6 rounded border border-white/15 p-4">
      <div className="flex items-center gap-2">
        <DocumentTextIcon className="h-4 w-4 text-fg-muted-token" />
        <h3 className="text-sm font-semibold text-fg-token">Nota fiscal</h3>
      </div>

      {(!jaEmitida('65') || !jaEmitida('55')) && (
        <div className="mt-3 grid gap-2">
          <label className="text-xs text-fg-muted-token">
            CPF/CNPJ do cliente
            <input
              type="text"
              inputMode="numeric"
              value={documento}
              onChange={e => setDocumento(e.target.value)}
              placeholder="Opcional na NFC-e, obrigatório na NF-e"
              className={`${CAMPO} mt-1`}
            />
          </label>

          {!jaEmitida('65') && (
            <button onClick={() => emitir('65')} disabled={emitindo !== null} className={BOTAO}>
              <DocumentTextIcon className="h-4 w-4" />
              {emitindo === '65' ? 'Emitindo…' : 'Emitir NFC-e (consumidor)'}
            </button>
          )}

          {/* NF-e só se oferece quando faz sentido: cliente identificado.
              Botão que só sabe dar erro é pior que botão ausente. */}
          {!jaEmitida('55') && tipoDigitado !== '' && (
            <button onClick={() => emitir('55')} disabled={emitindo !== null} className={BOTAO}>
              <DocumentTextIcon className="h-4 w-4" />
              {emitindo === '55' ? 'Emitindo…' : 'Emitir NF-e (empresa)'}
            </button>
          )}
          {!jaEmitida('55') && tipoDigitado === '' && (
            <p className="text-xs text-fg-muted-token">
              Informe o CNPJ do cliente para liberar a NF-e (modelo 55). Ela também exige o
              endereço completo no pedido.
            </p>
          )}
        </div>
      )}

      {documentos.map(nota => {
        const modelo = (nota.modelo ?? '65') as '65' | '55';
        const emitida = nota.status === 'authorized';
        const podeCancelar = emitida && dentroDaJanela(nota);
        return (
          <div key={nota.id ?? modelo} className="mt-4 border-t border-white/10 pt-3 text-xs text-fg-muted-token">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-fg-token">{NOME_MODELO[modelo]}</span>
              <span>{nota.status ? ROTULO_STATUS[nota.status] ?? nota.status : ''}</span>
            </div>

            {emitida && (
              <div className="mt-2 grid gap-1">
                <p>Nº {nota.numero}/{nota.serie}</p>
                {nota.chave_acesso && <p className="break-all">Chave: {nota.chave_acesso}</p>}
                {nota.danfe_url && (
                  <a
                    href={nota.danfe_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[var(--brand)] hover:underline"
                  >
                    <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                    Abrir {modelo === '55' ? 'DANFE' : 'cupom (DANFE)'}
                  </a>
                )}
                {podeCancelar && cancelandoModelo !== modelo && (
                  <button onClick={() => setCancelandoModelo(modelo)} className={`${BOTAO} mt-1`}>
                    Cancelar nota
                  </button>
                )}
                {podeCancelar && cancelandoModelo === modelo && (
                  <div className="mt-1 grid gap-2">
                    <textarea
                      value={justificativa}
                      onChange={e => setJustificativa(e.target.value)}
                      rows={2}
                      placeholder="Motivo do cancelamento (mínimo 15 caracteres, exigência da SEFAZ)"
                      className={CAMPO}
                    />
                    <button
                      onClick={() => cancelar(modelo)}
                      disabled={cancelando || justificativa.trim().length < JUSTIFICATIVA_MIN}
                      className={BOTAO}
                    >
                      {cancelando ? 'Cancelando…' : 'Confirmar cancelamento'}
                    </button>
                  </div>
                )}
                {!podeCancelar && (
                  <p>
                    Prazo de cancelamento encerrado (30 min). Para desfazer, emita nota de devolução.
                  </p>
                )}
              </div>
            )}

            {(nota.status === 'rejected' || nota.status === 'error') && (
              <div className="mt-2 grid gap-2">
                <p className="text-amber-500">{nota.error_message || 'A nota não foi autorizada.'}</p>
                <button onClick={() => emitir(modelo)} disabled={emitindo !== null} className={BOTAO}>
                  {emitindo === modelo ? 'Emitindo…' : 'Tentar de novo'}
                </button>
              </div>
            )}

            {nota.status === 'pending' && (
              <button onClick={carregar} className={`${BOTAO} mt-2`}>
                Atualizar status
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default NotaFiscalPedido;
