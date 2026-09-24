import React from 'react';
import { FlattenedAcademicHistory } from '../../types/student';
import { parseEducationModality } from '../../lib/modality';
import { formatDate, getSituationBadgeClass } from '../../lib/formatters';

interface AcademicHistoryCardProps {
  history: FlattenedAcademicHistory[];
}

export const AcademicHistoryCard: React.FC<AcademicHistoryCardProps> = ({ history }) => {
  return (
    <div className="detail-card full-width-card">
      <div className="card-header">
        <div className="card-header-title">
          <div className="card-icon icon-amber">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <h3>Histórico Escolar & Linha do Tempo de Matrículas</h3>
        </div>
        <span className="card-tag">
          {history.length} {history.length === 1 ? 'Registro' : 'Registros'}
        </span>
      </div>

      <div className="card-body">
        <div className="table-responsive">
          <table className="history-table">
            <thead>
              <tr>
                <th>Ano Letivo</th>
                <th>Etapa / Modalidade</th>
                <th>Série</th>
                <th>Turma</th>
                <th>Escola</th>
                <th>Período</th>
                <th>Situação</th>
                <th>Motivo / Conclusão</th>
              </tr>
            </thead>
            <tbody>
              {history.length > 0 ? (
                history.map((row, idx) => {
                  const periodStr = row.classEndDate
                    ? `${formatDate(row.classStartDate)} a ${formatDate(row.classEndDate)}`
                    : row.classStartDate
                    ? `A partir de ${formatDate(row.classStartDate)}`
                    : 'Ano todo';

                  const parsedRowMod = parseEducationModality(row.classDescription, row.gradeDescription);

                  return (
                    <tr key={idx}>
                      <td>
                        <strong className="font-mono">{row.academicYear}</strong>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#1e40af' }}>{parsedRowMod.level}</div>
                        <small className="text-muted">
                          {parsedRowMod.modality}{' '}
                          {parsedRowMod.shift !== 'Não informado' ? `• ${parsedRowMod.shift}` : ''}
                        </small>
                      </td>
                      <td>
                        <span className="font-bold">{row.gradeDescription}</span>
                      </td>
                      <td>
                        <span className="font-mono code-value small-code">{row.classDescription}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{row.schoolName}</div>
                        <small className="text-muted">{row.schoolCity || 'TO'}</small>
                      </td>
                      <td>
                        <small className="text-muted">{periodStr}</small>
                      </td>
                      <td>
                        <span className={`badge-situation ${getSituationBadgeClass(row.situation)}`}>
                          {row.situation}
                        </span>
                      </td>
                      <td>
                        <small className="text-muted">{row.completionReason || '--'}</small>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="text-muted" style={{ textAlign: 'center', padding: '1.5rem' }}>
                    Nenhum histórico de enturmação vinculado a este estudante no arquivo de matrículas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
