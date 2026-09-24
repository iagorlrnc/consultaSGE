import React from 'react';
import { StatsData } from '../../types/stats';

interface StatsOverviewProps {
  stats: StatsData | null;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ stats }) => {
  const total = stats?.totalRecords || 239449;
  const enrollments = stats?.totalEnrollments || 361748;
  const schools = stats?.uniqueSchools || 495;
  const withCpf = stats?.withCpf || 230917;
  const pctCpf = total > 0 ? ((withCpf / total) * 100).toFixed(1) : '96.4';

  return (
    <section className="empty-state">
      <div className="empty-icon">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="11" y1="8" x2="11" y2="8" />
          <line x1="11" y1="12" x2="11" y2="14" />
        </svg>
      </div>
      <h3>Pronto para Consulta Integrada</h3>
      <p>Digite o CPF do aluno acima para visualizar os dados cadastrais e o histórico escolar completo.</p>

      <div className="stats-overview">
        <div className="stat-card">
          <span className="stat-number">{total.toLocaleString('pt-BR')}</span>
          <span className="stat-label">Total de Estudantes</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{enrollments.toLocaleString('pt-BR')}</span>
          <span className="stat-label">Matrículas</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{schools.toLocaleString('pt-BR')}</span>
          <span className="stat-label">Escolas no Tocantins</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{withCpf.toLocaleString('pt-BR')}</span>
          <span className="stat-label">Alunos com CPF ({pctCpf}%)</span>
        </div>
      </div>
    </section>
  );
};
