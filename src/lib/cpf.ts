/**
 * Utilitários de CPF: Limpeza, formatação e validação de acordo com o algoritmo
 * oficial da Receita Federal do Brasil (cálculo de 2 dígitos verificadores).
 */

export function cleanCpf(cpf: string | undefined | null): string {
  if (!cpf) return '';
  return String(cpf).replace(/\D/g, '').padStart(11, '0').slice(0, 11);
}

export function formatCpf(val: string | undefined | null): string {
  if (!val) return 'Não informado';
  const clean = String(val).replace(/\D/g, '');
  if (!clean) return 'Não informado';
  const padded = clean.padStart(11, '0').slice(0, 11);
  return padded.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function maskCpfPrivacy(val: string | undefined | null): string {
  if (!val) return 'Não informado';
  const clean = cleanCpf(val);
  if (clean.length === 11) {
    return `***.${clean.slice(3, 6)}.***-**`;
  }
  return '***.***.***-**';
}

export function maskDocumentPrivacy(val: string | undefined | null): string {
  if (!val) return '--';
  const str = String(val).trim();
  if (str.length <= 4) return '****';
  return `${str.slice(0, 2)}${'*'.repeat(Math.min(str.length - 4, 6))}${str.slice(-2)}`;
}

export function applyCpfMask(input: string): string {
  let v = input.replace(/\D/g, '');
  if (v.length > 11) v = v.slice(0, 11);

  if (v.length > 9) {
    return v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
  } else if (v.length > 6) {
    return v.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
  } else if (v.length > 3) {
    return v.replace(/(\d{3})(\d{1,3})/, '$1.$2');
  }
  return v;
}

/**
 * Validação oficial do CPF com verificação de dígitos verificadores (Módulo 11)
 */
export function validateCpf(cpf: string | undefined | null): { valid: boolean; reason?: string } {
  if (!cpf) {
    return { valid: false, reason: 'CPF não informado' };
  }

  const clean = String(cpf).replace(/\D/g, '');

  if (clean.length === 0) {
    return { valid: false, reason: 'CPF vazio' };
  }

  if (clean.length !== 11) {
    return { valid: false, reason: 'CPF deve conter exatamente 11 dígitos' };
  }

  // Rejeita sequências de dígitos repetidos (00000000000, 11111111111, etc.)
  if (/^(\d)\1{10}$/.test(clean)) {
    return { valid: false, reason: 'CPF com todos os dígitos repetidos é inválido' };
  }

  // Validação do 1º Dígito Verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean.charAt(i), 10) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9), 10)) {
    return { valid: false, reason: 'Dígito verificador do CPF inválido' };
  }

  // Validação do 2º Dígito Verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean.charAt(i), 10) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(10), 10)) {
    return { valid: false, reason: 'Dígito verificador do CPF inválido' };
  }

  return { valid: true };
}
