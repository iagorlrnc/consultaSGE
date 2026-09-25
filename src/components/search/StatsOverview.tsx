import React from 'react';
import { StatsData } from '../../types/stats';

interface StatsOverviewProps {
  stats: StatsData | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  stats,
  loading = false,
  error = null,
  onRetry
}) => {
  const hasError = Boolean(error) || (!loading && !stats);

  const total = stats?.totalRecords;
  const enrollments = stats?.totalEnrollments;
  const withCpf = stats?.withCpf;
  const pctCpf = (total !== undefined && total > 0 && withCpf !== undefined && withCpf !== null)
    ? ((withCpf / total) * 100).toFixed(1)
    : null;

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

      {hasError && (
        <div
          role="alert"
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            borderRadius: '8px',
            padding: '0.85rem 1.25rem',
            margin: '0 auto 1.5rem',
            maxWidth: '680px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            textAlign: 'left'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <strong style={{ display: 'block', fontSize: '0.88rem', color: '#991b1b' }}>
                Falha de comunicação com o banco de dados
              </strong>
              <span style={{ fontSize: '0.82rem', color: '#b91c1c' }}>
                {error || 'O dado não foi encontrado no banco de dados.'}
              </span>
            </div>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              type="button"
              style={{
                background: '#ffffff',
                border: '1px solid #f87171',
                color: '#b91c1c',
                padding: '0.4rem 0.85rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Tentar novamente
            </button>
          )}
        </div>
      )}

      <div className="stats-overview">
        {/* Total de Estudantes */}
        <div className="stat-card">
          <span
            className="stat-number"
            style={
              loading
                ? { color: 'var(--text-muted)', fontSize: '1rem' }
                : (hasError || total === undefined)
                ? { color: '#ef4444', fontSize: '1rem' }
                : {}
            }
          >
            {loading ? 'Carregando...' : (total !== undefined && !hasError) ? total.toLocaleString('pt-BR') : 'Dado não encontrado'}
          </span>
          <span className="stat-label">Total de Estudantes</span>
        </div>

        {/* Matrículas */}
        <div className="stat-card">
          <span
            className="stat-number"
            style={
              loading
                ? { color: 'var(--text-muted)', fontSize: '1rem' }
                : (hasError || enrollments === undefined)
                ? { color: '#ef4444', fontSize: '1rem' }
                : {}
            }
          >
            {loading ? 'Carregando...' : (enrollments !== undefined && !hasError) ? enrollments.toLocaleString('pt-BR') : 'Dado não encontrado'}
          </span>
          <span className="stat-label">Matrículas</span>
        </div>

        {/* Alunos com CPF */}
        <div className="stat-card">
          <span
            className="stat-number"
            style={
              loading
                ? { color: 'var(--text-muted)', fontSize: '1rem' }
                : (hasError || withCpf === undefined)
                ? { color: '#ef4444', fontSize: '1rem' }
                : {}
            }
          >
            {loading ? 'Carregando...' : (withCpf !== undefined && !hasError) ? withCpf.toLocaleString('pt-BR') : 'Dado não encontrado'}
          </span>
          <span className="stat-label">
            {pctCpf !== null && !hasError ? `Alunos com CPF (${pctCpf}%)` : 'Alunos com CPF'}
          </span>
        </div>
      </div>
    </section>
  );
};
