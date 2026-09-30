import React, { useEffect, useMemo, useState } from 'react';
import {
  BuildingOffice2Icon, MagnifyingGlassIcon, ReceiptPercentIcon, ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import {
  Aviso, Button, ChoiceCards, Input, Modal, SearchInput, Select, SeloDeEstado, estadoDeNota,
} from '../../components/ui';
import { getErrorMessage } from '../../services/api';
import {
  fiscalService,
  type DestinatarioDaNota, type DestinatarioSalvo, type EnderecoFiscal,
  type ModeloDeNota, type NotaDaLoja, type PedidoParaNota,
} from '../../services/fiscal';
import {
  classificarDocumento, cnpjValido, formatarCep, formatarDocumento, somenteDigitos,
} from '../../utils/documento';
import { formatCurrency } from '../../utils/formatters';

export interface EmitirNotaProps {
  aberto: boolean;
  onFechar: () => void;
  loja: string;
  /** Pedido já escolhido — quem chega do detalhe do pedido ou de "Tentar de novo". */
  pedidoInicial?: string;
  /** Documento digitado na tela de origem; vence o que o pedido sugere. */
  documentoInicial?: string;
  onEmitida: (nota: NotaDaLoja) => void;
}

const NOME_MODELO: Record<ModeloDeNota, string> = { '65': 'NFC-e', '55': 'NF-e' };

const ENDERECO_VAZIO: EnderecoFiscal = {
  street: '', number: '', complement: '', neighborhood: '', city: '', state: '', zip_code: '',
};

// O que a SEFAZ exige do destinatário numa NF-e. Complemento não entra.
const OBRIGATORIOS_DA_NFE: (keyof EnderecoFiscal)[] = [
  'zip_code', 'street', 'number', 'neighborhood', 'city', 'state',
];

type Erros = Partial<Record<'documento' | 'nome' | keyof EnderecoFiscal, string>>;

const OPCOES_DE_MODELO = [
  { valor: '55' as ModeloDeNota, titulo: 'NF-e', descricao: 'Empresa', icone: BuildingOffice2Icon },
  { valor: '65' as ModeloDeNota, titulo: 'NFC-e', descricao: 'Consumidor', icone: ReceiptPercentIcon },
];

/**
 * Emissão manual: pedido → tipo → para quem a nota sai.
 *
 * O destinatário é digitado AQUI e guardado no cadastro da loja. Antes ele era
 * lido do endereço de entrega do pedido, e um pedido de retirada não tem
 * número nem bairro — a NF-e travava sem que houvesse onde preencher.
 */
export const EmitirNota: React.FC<EmitirNotaProps> = ({
  aberto, onFechar, loja, pedidoInicial, documentoInicial, onEmitida,
}) => {
  const [busca, setBusca] = useState('');
  const [pedidos, setPedidos] = useState<PedidoParaNota[]>([]);
  const [buscandoPedidos, setBuscandoPedidos] = useState(false);
  const [pedido, setPedido] = useState<PedidoParaNota | null>(null);
  const [salvos, setSalvos] = useState<DestinatarioSalvo[]>([]);

  const [modelo, setModelo] = useState<ModeloDeNota>('55');
  const [documento, setDocumento] = useState('');
  const [nome, setNome] = useState('');
  const [inscricao, setInscricao] = useState('');
  const [endereco, setEndereco] = useState<EnderecoFiscal>(ENDERECO_VAZIO);

  const [erros, setErros] = useState<Erros>({});
  const [rejeicao, setRejeicao] = useState('');
  const [consultando, setConsultando] = useState(false);
  const [emitindo, setEmitindo] = useState(false);

  const preencher = (dados: Partial<DestinatarioDaNota>) => {
    if (dados.documento !== undefined) setDocumento(formatarDocumento(dados.documento));
    if (dados.nome !== undefined) setNome(dados.nome);
    if (dados.inscricao_estadual !== undefined) setInscricao(dados.inscricao_estadual);
    if (dados.endereco) setEndereco({ ...ENDERECO_VAZIO, ...dados.endereco });
    setErros({});
  };

  const escolher = (escolhido: PedidoParaNota, documentoDeFora = '') => {
    setPedido(escolhido);
    setRejeicao('');
    const documentoFinal = documentoDeFora || escolhido.sugestao.documento;
    preencher({ ...escolhido.sugestao, documento: documentoFinal });
    // CNPJ pede NF-e; CPF ou nada é cupom de consumidor.
    setModelo(classificarDocumento(documentoFinal) === 'cnpj' ? '55' : '65');
  };

  // Abrir zera o formulário: reaproveitar o destinatário da emissão anterior
  // em outro pedido é como sai nota para a empresa errada.
  useEffect(() => {
    if (!aberto) return;
    setPedido(null);
    setBusca('');
    setRejeicao('');
    preencher({ documento: '', nome: '', inscricao_estadual: '', endereco: ENDERECO_VAZIO });
    fiscalService.listarDestinatarios(loja).then(setSalvos).catch(() => setSalvos([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, loja]);

  useEffect(() => {
    if (!aberto || pedido) return undefined;
    let ativo = true;
    setBuscandoPedidos(true);
    const filtro = pedidoInicial ? { id: pedidoInicial } : { q: busca.trim() || undefined };
    const espera = setTimeout(() => {
      fiscalService.listarPedidos(loja, filtro)
        .then((lista) => {
          if (!ativo) return;
          setPedidos(lista);
          const alvo = pedidoInicial && lista.find((p) => p.id === pedidoInicial);
          if (alvo) escolher(alvo, documentoInicial);
        })
        .catch(() => { if (ativo) setPedidos([]); })
        .finally(() => { if (ativo) setBuscandoPedidos(false); });
    }, busca ? 300 : 0);
    return () => { ativo = false; clearTimeout(espera); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, loja, busca, pedido, pedidoInicial]);

  const numero = somenteDigitos(documento);
  const tipo = classificarDocumento(documento);

  const mudarEndereco = (campo: keyof EnderecoFiscal, valor: string) => {
    setEndereco((atual) => ({ ...atual, [campo]: valor }));
    setErros((atual) => ({ ...atual, [campo]: undefined }));
  };

  const buscarCnpj = async () => {
    setConsultando(true);
    try {
      const dados = await fiscalService.consultarCnpj(loja, numero);
      preencher({ nome: dados.nome, endereco: dados.endereco });
    } catch (erro) {
      toast.error(getErrorMessage(erro));
    } finally {
      setConsultando(false);
    }
  };

  const validar = (): Erros => {
    const faltas: Erros = {};
    if (numero && !tipo) faltas.documento = 'Inválido';
    if (modelo === '55') {
      if (!tipo) faltas.documento = numero ? 'Inválido' : 'Obrigatório';
      if (!nome.trim()) faltas.nome = 'Obrigatório';
      for (const campo of OBRIGATORIOS_DA_NFE) {
        if (!endereco[campo].trim()) faltas[campo] = 'Obrigatório';
      }
      if (somenteDigitos(endereco.zip_code).length !== 8) faltas.zip_code = 'Inválido';
    }
    return faltas;
  };

  const emitir = async () => {
    if (!pedido) return;
    const faltas = validar();
    setErros(faltas);
    if (Object.values(faltas).some(Boolean)) return;

    const destinatario: DestinatarioDaNota | undefined = numero
      ? {
        documento: numero,
        nome: nome.trim() || pedido.customer_name,
        inscricao_estadual: somenteDigitos(inscricao),
        endereco: {
          street: endereco.street.trim(),
          number: endereco.number.trim(),
          complement: endereco.complement.trim(),
          neighborhood: endereco.neighborhood.trim(),
          city: endereco.city.trim(),
          state: endereco.state.trim().toUpperCase(),
          zip_code: somenteDigitos(endereco.zip_code),
        },
      }
      : undefined;

    setEmitindo(true);
    setRejeicao('');
    try {
      const nota = await fiscalService.emitir(loja, {
        order_id: pedido.id,
        modelo,
        ...(destinatario ? { destinatario } : {}),
      });
      onEmitida(nota);
      if (nota.status === 'authorized') {
        toast.success(`${NOME_MODELO[modelo]} autorizada`);
        onFechar();
      } else if (nota.status === 'pending') {
        toast(`${NOME_MODELO[modelo]} enviada, aguardando a SEFAZ`);
        onFechar();
      } else {
        // A recusa fica na tela com o formulário aberto: o motivo costuma
        // ser um campo daqui, e fechar obrigaria a digitar tudo de novo.
        setRejeicao(nota.error_message || 'A SEFAZ não autorizou a nota.');
      }
    } catch (erro) {
      setRejeicao(getErrorMessage(erro));
    } finally {
      setEmitindo(false);
    }
  };

  const opcoesDeSalvos = useMemo(
    () => salvos.map((s) => ({ valor: s.id, rotulo: `${s.nome} · ${formatarDocumento(s.documento)}` })),
    [salvos],
  );

  const campoDeEndereco = (
    campo: keyof EnderecoFiscal, rotulo: string, extra: Pick<React.InputHTMLAttributes<HTMLInputElement>, 'inputMode' | 'maxLength'> = {},
  ) => (
    <Input
      label={rotulo}
      value={campo === 'zip_code' ? formatarCep(endereco[campo]) : endereco[campo]}
      onChange={(e) => mudarEndereco(campo, e.target.value)}
      error={erros[campo]}
      aria-invalid={erros[campo] ? true : undefined}
      {...extra}
    />
  );

  return (
    <Modal open={aberto} onClose={onFechar} title="Emitir nota" size="xl">
      <div className="space-y-5">
        {!pedido && (
          <div className="space-y-3">
            <SearchInput
              aria-label="Buscar pedido"
              placeholder="Número do pedido, cliente ou telefone"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              loading={buscandoPedidos}
            />
            <ul className="superficie max-h-72 divide-y divide-border-token overflow-y-auto">
              {pedidos.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => escolher(p)}
                    className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-left text-sm hover:bg-surface-muted-token focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <span className="font-semibold text-fg-token">{p.order_number}</span>
                    <span className="min-w-0 flex-1 truncate text-fg-muted-token">{p.customer_name}</span>
                    {p.notas.map((n) => (
                      <SeloDeEstado key={n.modelo} tone={estadoDeNota(n.status).tone}>
                        {NOME_MODELO[n.modelo]} {estadoDeNota(n.status).rotulo.toLowerCase()}
                      </SeloDeEstado>
                    ))}
                    <span className="font-medium text-fg-token">{formatCurrency(p.total)}</span>
                  </button>
                </li>
              ))}
              {!buscandoPedidos && pedidos.length === 0 && (
                <li className="px-4 py-6 text-center text-sm text-fg-muted-token">Nenhum pedido encontrado</li>
              )}
            </ul>
          </div>
        )}

        {pedido && (
          <>
            <div className="superficie flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm">
              <span className="font-semibold text-fg-token">{pedido.order_number}</span>
              <span className="min-w-0 flex-1 truncate text-fg-muted-token">{pedido.customer_name}</span>
              <span className="font-medium text-fg-token">{formatCurrency(pedido.total)}</span>
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<ArrowsRightLeftIcon className="h-4 w-4" />}
                onClick={() => setPedido(null)}
              >
                Trocar
              </Button>
            </div>

            <ChoiceCards rotulo="Tipo de nota" opcoes={OPCOES_DE_MODELO} valor={modelo} onChange={setModelo} />

            <fieldset className="space-y-3">
              <legend className="mb-2 text-body font-semibold text-fg-token">Destinatário</legend>

              {opcoesDeSalvos.length > 0 && (
                <Select
                  rotulo="Destinatário salvo"
                  vazio="Novo destinatário"
                  opcoes={opcoesDeSalvos}
                  valor={salvos.find((s) => s.documento === numero)?.id ?? ''}
                  onMudar={(id) => {
                    const escolhido = salvos.find((s) => s.id === id);
                    if (escolhido) preencher(escolhido);
                  }}
                />
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
                <div className="flex items-end gap-2 sm:col-span-3">
                  <div className="min-w-0 flex-1">
                    <Input
                      label="CPF ou CNPJ"
                      inputMode="numeric"
                      value={documento}
                      onChange={(e) => {
                        const digitos = somenteDigitos(e.target.value);
                        setDocumento([11, 14].includes(digitos.length) ? formatarDocumento(digitos) : e.target.value);
                        setErros((atual) => ({ ...atual, documento: undefined }));
                      }}
                      error={erros.documento}
                      aria-invalid={erros.documento ? true : undefined}
                    />
                  </div>
                  <Button
                    variant="secondary"
                    aria-label="Buscar CNPJ"
                    title="Buscar na Receita"
                    onClick={buscarCnpj}
                    isLoading={consultando}
                    disabled={!cnpjValido(numero)}
                    className={erros.documento ? 'mb-6' : undefined}
                  >
                    <MagnifyingGlassIcon className="h-4 w-4" />
                  </Button>
                </div>
                <div className="sm:col-span-3">
                  <Input
                    label="Inscrição estadual"
                    inputMode="numeric"
                    placeholder="Isento"
                    value={inscricao}
                    onChange={(e) => setInscricao(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-6">
                  <Input
                    label="Nome ou razão social"
                    value={nome}
                    onChange={(e) => {
                      setNome(e.target.value);
                      setErros((atual) => ({ ...atual, nome: undefined }));
                    }}
                    error={erros.nome}
                    aria-invalid={erros.nome ? true : undefined}
                  />
                </div>
                <div className="sm:col-span-2">{campoDeEndereco('zip_code', 'CEP', { inputMode: 'numeric' })}</div>
                <div className="sm:col-span-4">{campoDeEndereco('street', 'Rua')}</div>
                <div className="sm:col-span-2">{campoDeEndereco('number', 'Número')}</div>
                <div className="sm:col-span-4">{campoDeEndereco('complement', 'Complemento')}</div>
                <div className="sm:col-span-3">{campoDeEndereco('neighborhood', 'Bairro')}</div>
                <div className="sm:col-span-2">{campoDeEndereco('city', 'Cidade')}</div>
                <div className="sm:col-span-1">{campoDeEndereco('state', 'UF', { maxLength: 2 })}</div>
              </div>
            </fieldset>

            {rejeicao && <Aviso tom="erro" titulo="A nota não saiu">{rejeicao}</Aviso>}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={onFechar}>Fechar</Button>
              <Button onClick={emitir} isLoading={emitindo}>{`Emitir ${NOME_MODELO[modelo]}`}</Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default EmitirNota;
