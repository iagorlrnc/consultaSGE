import { Student } from '../types/student';
import { maskCpfPrivacy } from './cpf';

export type UserRole = 'admin' | 'auditor' | 'operator';

/**
 * Aplica regras de minimização de dados conforme Art. 6º, III e Art. 14 da LGPD (Melhor Interesse do Menor)
 * e mitigação de acesso excessivo / IDOR (VULN-004).
 * 
 * - Auditores e Administradores: Acesso integral com registro estrito em trilha de auditoria.
 * - Operadores Comuns: Dados altamente sensíveis de menores (endereço residencial exato,
 *   certidão de nascimento e CPF de responsáveis/filiação) são minimizados por padrão.
 */
export function filterStudentDataByRole(student: Student, role?: string): Student {
  if (!student) return student;

  const normalizedRole = (role || '').toLowerCase();
  const isPrivileged = normalizedRole.includes('admin') || normalizedRole.includes('auditor');

  if (isPrivileged) {
    return student;
  }

  // Minimização de dados para operadores padrão conforme LGPD Art. 14
  const minimized: Student = {
    ...student,
    address: student.address
      ? {
          ...student.address,
          street: student.address.street ? '[Restrito - LGPD Art. 14]' : undefined,
          number: student.address.number ? '[Restrito]' : undefined
        }
      : undefined,
    documents: student.documents
      ? {
          ...student.documents,
          birthCertificate: student.documents.birthCertificate ? '[Restrito - Menor de Idade]' : undefined
        }
      : undefined,
    filiations: student.filiations?.map(f => ({
      ...f,
      cpf: f.cpf ? maskCpfPrivacy(f.cpf) : undefined
    }))
  };

  return minimized;
}
