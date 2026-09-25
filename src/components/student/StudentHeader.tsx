import React, { useState } from 'react';
import { Student, Enrollment, FlattenedAcademicHistory } from '../../types/student';
import { formatDate, calculateAge, GENDER_MAP, RACE_MAP } from '../../lib/formatters';
import { formatCpf } from '../../lib/cpf';
import { getIbgeCity } from '../../data/ibgeTocantins';
import { CopyButton } from '../ui/CopyButton';
import { IbgeLookupModal } from './IbgeLookupModal';

interface StudentHeaderProps {
  student: Student;
  primaryEnrollment?: Enrollment | null;
  activeClass?: FlattenedAcademicHistory | null;
  inep?: string;
  onNotify?: (msg: string) => void;
}

export const StudentHeader: React.FC<StudentHeaderProps> = ({
  student,
  primaryEnrollment,
  activeClass,
  inep,
  onNotify
}) => {
  const [isIbgeModalOpen, setIsIbgeModalOpen] = useState(false);

  const birthIso = student.birthDate;
  const age = calculateAge(birthIso);
  const formattedBirth = formatDate(birthIso);

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

  const city = student.address?.city || 'TOCANTINS';
  const state = student.address?.state || 'TO';
  const ibgeCity = getIbgeCity(city);

  // 1. CPF
  const rawCpf = student.documents?.cpf;
  const displayCpf = rawCpf ? formatCpf(rawCpf) : 'Não informado';
  const copyCpf = rawCpf ? formatCpf(rawCpf) : '';

  // 2. Código do Aluno
  const stId = String(
    typeof student.studentId === 'object' && student.studentId && '$numberLong' in student.studentId
      ? student.studentId.$numberLong
      : student.studentId || '--'
  );
  const copyStId = stId && stId !== '--' ? stId : '';

  // 3. Código INEP
  const inepCode = inep || primaryEnrollment?.school?.inep || activeClass?.schoolInep || 'Não informado';
  const copyInep = inepCode && inepCode !== 'Não informado' && inepCode !== '--' ? inepCode : '';

  // 4. Código IBGE
  const ibgeCode = ibgeCity ? ibgeCity.id : 'N/D';
  const copyIbge = ibgeCity ? ibgeCity.id : '';

  return (
    <>
      <div className="student-header-card">
        <div className="student-main-info">
          <div className="student-names">
            <div className="student-title-row">
              <h2>{student.name || 'NOME NÃO INFORMADO'}</h2>
            </div>

            {student.socialName && student.socialName.trim() && (
              <p className="social-name">
                <strong>Nome Social:</strong> <span>{student.socialName}</span>
              </p>
            )}

            <div className="student-meta-tags">
              <span className="meta-tag">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <strong>{age}</strong> ({formattedBirth})
              </span>
              <span className="meta-tag">Gênero: {genderText}</span>
              <span className="meta-tag">Cor/Raça: {raceText}</span>
              <span className="meta-tag">{city} / {state}</span>

              <button
                type="button"
                className="ibge-lookup-trigger-btn"
                onClick={() => setIsIbgeModalOpen(true)}
                title="Consultar códigos IBGE de todas as 139 cidades do Tocantins"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <span>Cidades (TO)</span>
              </button>
            </div>

            {/* Seção Dados Essenciais */}
            <div className="essential-data-block">
              <div className="essential-data-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>Dados Essenciais</span>
              </div>

              <div className="essential-data-grid">
                {/* CPF */}
                <div className="essential-item">
                  <span className="essential-item-label">CPF</span>
                  <div className="essential-item-value">
                    <span className="font-mono">{displayCpf}</span>
                    {copyCpf && (
                      <CopyButton
                        textToCopy={copyCpf}
                        onCopied={(txt) => onNotify?.(`CPF copiado: ${txt}`)}
                        title="Copiar CPF"
                      />
                    )}
                  </div>
                </div>

                {/* Código do Aluno */}
                <div className="essential-item">
                  <span className="essential-item-label">Código do Aluno</span>
                  <div className="essential-item-value">
                    <span className="font-mono">{stId}</span>
                    {copyStId && (
                      <CopyButton
                        textToCopy={copyStId}
                        onCopied={(txt) => onNotify?.(`Código do Aluno copiado: ${txt}`)}
                        title="Copiar Código do Aluno"
                      />
                    )}
                  </div>
                </div>

                {/* Código INEP */}
                <div className="essential-item">
                  <span className="essential-item-label">Código INEP</span>
                  <div className="essential-item-value">
                    <span className="font-mono">{inepCode}</span>
                    {copyInep && (
                      <CopyButton
                        textToCopy={copyInep}
                        onCopied={(txt) => onNotify?.(`Código INEP copiado: ${txt}`)}
                        title="Copiar Código INEP"
                      />
                    )}
                  </div>
                </div>

                {/* Código IBGE */}
                <div className="essential-item">
                  <span className="essential-item-label">Código IBGE</span>
                  <div className="essential-item-value">
                    <span className="font-mono">{ibgeCode}</span>
                    {copyIbge && (
                      <CopyButton
                        textToCopy={copyIbge}
                        onCopied={(txt) => onNotify?.(`Código IBGE (${city}) copiado: ${txt}`)}
                        title={`Copiar código IBGE (${ibgeCode})`}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de consulta de todas as cidades do Tocantins */}
      <IbgeLookupModal
        isOpen={isIbgeModalOpen}
        onClose={() => setIsIbgeModalOpen(false)}
        selectedCityName={city}
        onNotify={onNotify}
      />
    </>
  );
};
