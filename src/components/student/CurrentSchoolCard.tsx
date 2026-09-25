import React from 'react';
import { Enrollment, FlattenedAcademicHistory } from '../../types/student';
import { parseEducationModality } from '../../lib/modality';
import { formatDate, getSituationBadgeClass } from '../../lib/formatters';
import { CopyButton } from '../ui/CopyButton';

interface CurrentSchoolCardProps {
  primaryEnrollment: Enrollment | null;
  activeClass: FlattenedAcademicHistory | null;
  studentCity?: string;
  onNotify: (msg: string) => void;
}

export const CurrentSchoolCard: React.FC<CurrentSchoolCardProps> = ({
  primaryEnrollment,
  activeClass,
  studentCity = 'TOCANTINS',
  onNotify
}) => {
  const school = primaryEnrollment?.school;
  const schoolName = school?.name || activeClass?.schoolName || 'Escola Estadual Cadastrada';
  const schoolCity = school?.city || activeClass?.schoolCity || studentCity;
  const schoolInep = school?.inep || activeClass?.schoolInep || 'Não informado';
  const board = school?.board || activeClass?.schoolBoard || 'TOCANTINS';

  const parsedMod = parseEducationModality(
    activeClass?.classDescription,
    activeClass?.gradeDescription
  );

  const situation = activeClass?.situation || 'Cursando';
  const classStart = activeClass?.classStartDate
    ? formatDate(activeClass.classStartDate)
    : 'Início do Ano Letivo';

  return (
    <div className="detail-card school-highlight-card">
      <div className="card-header">
        <div className="card-header-title">
          <div className="card-icon icon-indigo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
          </div>
          <h3>Matrícula Atual</h3>
        </div>
        <span className="card-tag tag-dre">SRE {board}</span>
      </div>

      <div className="card-body">
        <div className="data-field highlight-field school-name-field">
          <label>Unidade Escolar Atual</label>
          <div className="school-name-text">{schoolName}</div>
          <div className="school-subinfo">
            <span>
              <strong>Município:</strong> {schoolCity}
            </span>
            <span>•</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <strong>Código INEP:</strong> <span className="font-mono">{schoolInep}</span>
              {schoolInep && schoolInep !== 'Não informado' && schoolInep !== '--' && (
                <CopyButton
                  textToCopy={schoolInep}
                  onCopied={(txt) => onNotify(`Código INEP copiado: ${txt}`)}
                  title="Copiar Código INEP"
                />
              )}
            </span>
          </div>
        </div>

        <div className="data-field highlight-field modality-field">
          <label>Modalidade de Ensino</label>
          <div className="modality-text">{parsedMod.fullLabel}</div>
          <div className="modality-subinfo">
            <span>
              <strong>Nível:</strong> {parsedMod.level}
            </span>
            <span>•</span>
            <span>
              <strong>Turno:</strong> {parsedMod.shift}
            </span>
            <span>•</span>
            <span>
              <strong>Regime:</strong> {parsedMod.regime}
            </span>
          </div>
        </div>

        <div className="fields-row">
          <div className="data-field highlight-field">
            <label>Série / Ano Atual</label>
            <span className="value-text font-bold current-grade-text">
              {activeClass?.gradeDescription || 'Não informada'}
            </span>
          </div>
          <div className="data-field highlight-field">
            <label>Turma Vigente</label>
            <span className="value-text font-mono font-bold">
              {activeClass?.classDescription || 'Não informada'}
            </span>
          </div>
        </div>

        <div className="fields-row">
          <div className="data-field">
            <label>Ano Letivo</label>
            <span className="value-text font-bold">
              {activeClass?.academicYear || '2026'}
            </span>
          </div>
          <div className="data-field">
            <label>Situação do Aluno</label>
            <div>
              <span className={`badge ${getSituationBadgeClass(situation)}`}>
                {situation}
              </span>
            </div>
          </div>
          <div className="data-field">
            <label>Início na Turma</label>
            <span className="value-text">{classStart}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
