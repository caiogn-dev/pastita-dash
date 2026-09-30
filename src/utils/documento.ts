/**
 * CPF/CNPJ — dígito verificador e máscara.
 *
 * Documento só entra na nota se fechar o dígito: número errado faz a SEFAZ
 * recusar a nota inteira (rejeição 237). Validamos na tela, onde o operador
 * ainda pode corrigir olhando para o cliente.
 */
export const somenteDigitos = (valor: string) => (valor || '').replace(/\D/g, '');

export const cpfValido = (valor: string) => {
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

export const cnpjValido = (valor: string) => {
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
export const classificarDocumento = (valor: string): 'cpf' | 'cnpj' | '' => {
  const numero = somenteDigitos(valor);
  if (cpfValido(numero)) return 'cpf';
  if (cnpjValido(numero)) return 'cnpj';
  return '';
};

/** Máscara de leitura. Número de tamanho inesperado volta como veio. */
export const formatarDocumento = (valor: string): string => {
  const n = somenteDigitos(valor);
  if (n.length === 11) return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (n.length === 14) return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return valor || '';
};

export const formatarCep = (valor: string): string => {
  const n = somenteDigitos(valor).slice(0, 8);
  return n.length > 5 ? `${n.slice(0, 5)}-${n.slice(5)}` : n;
};
