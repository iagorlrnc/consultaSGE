import { Student } from '../types/student';

export type UserRole = 'admin' | 'auditor' | 'operator';

/**
 * Retorna os dados completos e reais do estudante presentes no banco,
 * sem ocultação ou restrição de campos.
 */
export function filterStudentDataByRole(student: Student, _role?: string): Student {
  if (!student) return student;
  return student;
}

