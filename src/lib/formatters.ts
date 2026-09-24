// Dicionários Oficiais de Tradução de Códigos do SISS / SGE

export const GENDER_MAP: Record<string, string> = {
  '0': 'Não informado',
  '1': 'Masculino',
  '2': 'Feminino'
};

export const RACE_MAP: Record<string, string> = {
  '0': 'Não declarada',
  '1': 'Branca',
  '2': 'Preta',
  '3': 'Parda',
  '4': 'Amarela',
  '5': 'Indígena'
};

export const DISABILITY_MAP: Record<string, string> = {
  '0': 'Nenhuma deficiência declarada',
  '1': 'Cegueira / Deficiência Visual Severa',
  '2': 'Baixa Visão',
  '3': 'Surdez / Deficiência Auditiva',
  '4': 'Deficiência Física / Motora',
  '5': 'Deficiência Intelectual / TEA / AEE',
  '6': 'Surdocegueira',
  '7': 'Múltipla Deficiência'
};

export function formatCep(val: string | undefined | null): string {
  if (!val) return 'Não informado';
  const clean = String(val).replace(/\D/g, '').slice(0, 8);
  if (clean.length === 8) {
    return clean.replace(/(\d{2})(\d{3})(\d{3})/, '$1.$2-$3');
  }
  return val;
}

export function formatDate(isoStr: string | { $date: string } | undefined | null): string {
  if (!isoStr) return '--';
  const val = typeof isoStr === 'object' && '$date' in isoStr ? isoStr.$date : String(isoStr);
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) {
      const parts = val.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return val;
    }
    const day = String(d.getUTCDate()).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const year = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return val;
  }
}

export function calculateAge(isoStr: string | { $date: string } | undefined | null): string {
  if (!isoStr) return '--';
  const val = typeof isoStr === 'object' && '$date' in isoStr ? isoStr.$date : String(isoStr);
  try {
    const birth = new Date(val);
    if (isNaN(birth.getTime())) return '--';
    const now = new Date();
    let age = now.getFullYear() - birth.getUTCFullYear();
    const m = now.getMonth() - birth.getUTCMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getUTCDate())) {
      age--;
    }
    return `${age} anos`;
  } catch {
    return '--';
  }
}

export function getInitials(name: string | undefined | null): string {
  if (!name) return 'ES';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getSituationBadgeClass(situation: string | undefined | null): string {
  if (!situation) return 'badge-situation-outro';
  const s = situation.toLowerCase();
  if (s.includes('cursando')) return 'badge-situation-cursando';
  if (s.includes('aprovado') || s.includes('conclu')) return 'badge-situation-aprovado';
  if (s.includes('reprovado') || s.includes('abandono') || s.includes('evadido')) return 'badge-situation-reprovado';
  if (s.includes('transferido')) return 'badge-situation-transferido';
  if (s.includes('remanejado') || s.includes('desalocado')) return 'badge-situation-remanejado';
  return 'badge-situation-outro';
}
