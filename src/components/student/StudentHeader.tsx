import React, { useState } from 'react';
import { Student } from '../../types/student';
import { formatDate, calculateAge, GENDER_MAP, RACE_MAP } from '../../lib/formatters';
import { getIbgeCity } from '../../data/ibgeTocantins';
import { CopyButton } from '../ui/CopyButton';
import { IbgeLookupModal } from './IbgeLookupModal';

interface StudentHeaderProps {
  student: Student;
  onNotify?: (msg: string) => void;
}

export const StudentHeader: React.FC<StudentHeaderProps> = ({ student, onNotify }) => {
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

  const handleCopyIbge = (code: string) => {
    if (onNotify) {
      onNotify(`Código IBGE ${code} (${ibgeCity?.name || city}) copiado!`);
    }
  };

  return (
    <>
      <div className="student-header-card">
        <div className="student-main-info">
          <div className="student-names">
            <div className="student-title-row">
              <h2>{student.name || 'NOME NÃO INFORMADO'}</h2>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span className="badge badge-success">Matrícula Ativa</span>
                <span className="badge badge-state" style={{ fontSize: '0.72rem', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                  Exibição Completa
                </span>
              </div>
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

              {/* Informação do Código IBGE da cidade do estudante com opção de copiar e consulta de todas as cidades */}
              <div className="ibge-header-badge-group">
                <span
                  className="meta-tag ibge-meta-tag"
                  title={ibgeCity ? `Código IBGE oficial de ${ibgeCity.name}: ${ibgeCity.id}` : `Código IBGE não identificado para "${city}"`}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>IBGE:</span>
                  <strong className="font-mono">{ibgeCity ? ibgeCity.id : 'N/D'}</strong>
                  {ibgeCity && (
                    <CopyButton
                      textToCopy={ibgeCity.id}
                      onCopied={() => handleCopyIbge(ibgeCity.id)}
                      title={`Copiar código IBGE (${ibgeCity.id})`}
                    />
                  )}
                </span>

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
