import { ParsedModality } from '../types/student';

export function parseEducationModality(
  classDesc: string | undefined | null,
  gradeDesc: string | undefined | null
): ParsedModality {
  if (!classDesc && !gradeDesc) {
    return {
      level: 'Não informada',
      modality: 'Não informada',
      shift: 'Não informado',
      regime: 'Anual',
      fullLabel: 'Não informada'
    };
  }

  const cd = (classDesc || '').toUpperCase();
  const gd = (gradeDesc || '').toUpperCase();

  let level = '';
  let modality = '';
  let shift = '';
  let regime = '';
  let extra = '';

  const parts = cd.split('/');
  const codePart = parts.length > 1 ? parts[1] : cd;

  if (codePart.includes(' - ')) {
    extra = codePart.split(' - ').slice(1).join(' - ').trim();
  }

  if (codePart.includes('EJA') || codePart.includes('CEJA') || gd.includes('PERÍODO')) {
    level = 'Educação de Jovens e Adultos (EJA)';
    if (codePart.includes('1ºSEG') || codePart.includes('1º SEG') || gd.includes('1º PERÍODO') || gd.includes('2º PERÍODO')) {
      modality = '1º Segmento (Anos Iniciais)';
    } else if (codePart.includes('2ºSEG') || codePart.includes('2º SEG') || gd.includes('3º PERÍODO') || gd.includes('4º PERÍODO')) {
      modality = '2º Segmento (Anos Finais)';
    } else if (codePart.includes('3ºSEG') || codePart.includes('3º SEG') || gd.includes('5º PERÍODO') || gd.includes('6º PERÍODO')) {
      modality = '3º Segmento (Ensino Médio)';
    } else {
      modality = 'Segmento Modular';
    }
  } else if (codePart.includes('EMI') || gd.includes('-IN') || extra.includes('TÉCNIC') || extra.includes('AGROPEC')) {
    level = 'Ensino Médio Integrado / Técnico';
    modality = extra || 'Educação Profissional';
  } else if (gd.includes('CICLO')) {
    level = 'Ensino Fundamental';
    modality = 'Ciclo de Aprendizagem / Avanço';
  } else if (codePart.includes('EFCI') || codePart.includes('EMCI')) {
    level = codePart.includes('EMCI') ? 'Ensino Médio' : 'Ensino Fundamental';
    modality = 'Educação do Campo / Indígena';
  } else if (codePart.includes('MULT')) {
    level = 'Ensino Fundamental';
    modality = 'Turma Multisseriada';
  } else if (codePart.includes('EM') || gd.includes('SÉRIE')) {
    level = 'Ensino Médio';
    modality = codePart.includes('.INT') ? 'Tempo Integral' : 'Ensino Regular';
  } else if (codePart.includes('EF') || gd.includes('ANO')) {
    level = 'Ensino Fundamental';
    modality = codePart.includes('.INT') ? 'Tempo Integral' : 'Ensino Regular';
  } else {
    level = 'Ensino Regular';
    modality = 'Regular';
  }

  // Turno (Shift)
  if (codePart.includes('.MAT') || codePart.includes('MAT-') || codePart.includes('.MAT-')) shift = 'Matutino';
  else if (codePart.includes('.VESP') || codePart.includes('VESP-') || codePart.includes('.VESP-')) shift = 'Vespertino';
  else if (codePart.includes('.NOT') || codePart.includes('NOT-') || codePart.includes('.NOT-')) shift = 'Noturno';
  else if (codePart.includes('.INT') || codePart.includes('INT-')) shift = 'Tempo Integral';

  // Regime
  if (codePart.includes('SEM1') || codePart.includes('SEM 1')) regime = '1º Semestre';
  else if (codePart.includes('SEM2') || codePart.includes('SEM 2')) regime = '2º Semestre';
  else if (codePart.includes('ANL') || codePart.includes('ANUAL')) regime = 'Anual';

  const details = [modality, shift, regime].filter(Boolean).join(' • ');
  return {
    level,
    modality: modality || 'Regular',
    shift: shift || 'Não informado',
    regime: regime || 'Anual',
    extra,
    fullLabel: `${level} — ${details}`
  };
}
