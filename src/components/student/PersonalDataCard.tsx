import React from 'react';
import { Student } from '../../types/student';
import { formatDate, calculateAge, GENDER_MAP, RACE_MAP, DISABILITY_MAP } from '../../lib/formatters';

interface PersonalDataCardProps {
  student: Student;
}

export const PersonalDataCard: React.FC<PersonalDataCardProps> = ({ student }) => {
  const birthIso = student.birthDate;
  const birthFormatted = formatDate(birthIso);
  const age = calculateAge(birthIso);

  const genderKey = String(
    typeof student.gender === 'object' && student.gender && '$numberLong' in student.gender
      ? student.gender.$numberLong
      : student.gender ?? '0'
  );
  const genderText = GENDER_MAP[genderKey] || 'Outro / Não informado';

  const raceKey = String(
    typeof student.raceColor === 'object' && student.raceColor && '$numberLong' in student.raceColor
      ? student.raceColor.$numberLong
      : student.raceColor ?? '0'
  );
  const raceText = RACE_MAP[raceKey] || 'Não declarada';

  const stId = String(
    typeof student.studentId === 'object' && student.studentId && '$numberLong' in student.studentId
      ? student.studentId.$numberLong
      : student.studentId || '--'
  );

  const disabilities = student.disabilityTypes || [];

  return (
    <div className="detail-card">
      <div className="card-header">
        <div className="card-header-title">
          <div className="card-icon icon-purple">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h3>Dados Pessoais</h3>
        </div>
        <span className="card-tag">Registro</span>
      </div>

      <div className="card-body">
        <div className="fields-row">
          <div className="data-field">
            <label>Data de Nascimento</label>
            <span className="value-text">{birthFormatted}</span>
          </div>
          <div className="data-field">
            <label>Idade Atual</label>
            <span className="value-text font-bold">{age}</span>
          </div>
        </div>

        <div className="fields-row">
          <div className="data-field">
            <label>Gênero</label>
            <span className="value-text">{genderText}</span>
          </div>
          <div className="data-field">
            <label>Cor / Raça (IBGE)</label>
            <span className="value-text">{raceText}</span>
          </div>
        </div>

        <div className="fields-row">
          <div className="data-field">
            <label>Código do Aluno</label>
            <span className="code-value font-mono">{stId}</span>
          </div>
          <div className="data-field">
            <label>E-mail</label>
            <span className="value-text">{student.email || 'Não informado'}</span>
          </div>
        </div>

        <div className="data-field">
          <label>Acessibilidade & AEE</label>
          <div className="tags-container">
            {disabilities.length > 0 ? (
              disabilities.map((d, idx) => {
                const code = String(typeof d === 'object' && d && '$numberLong' in d ? d.$numberLong : d);
                const label = DISABILITY_MAP[code] || `Deficiência Tipo #${code}`;
                return (
                  <span key={idx} className="tag tag-warning">
                    {label}
                  </span>
                );
              })
            ) : (
              <span className="tag tag-neutral">Nenhuma deficiência declarada</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
