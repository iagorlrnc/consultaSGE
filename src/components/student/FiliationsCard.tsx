import React from 'react';
import { Filiation } from '../../types/student';
import { formatCpf, maskCpfPrivacy } from '../../lib/cpf';
import { useAuth } from '../../context/AuthContext';

interface FiliationsCardProps {
  filiations?: Filiation[];
}

export const FiliationsCard: React.FC<FiliationsCardProps> = ({ filiations }) => {
  const { privacyMode } = useAuth();
  const list = filiations || [];

  return (
    <div className="detail-card full-width-card">
      <div className="card-header">
        <div className="card-header-title">
          <div className="card-icon icon-rose">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h3>Filiação e Responsáveis Legais</h3>
        </div>
        <span className="card-tag">
          {list.length} {list.length === 1 ? 'Registro' : 'Registros'}
        </span>
      </div>

      <div className="card-body">
        {list.length > 0 ? (
          <div className="filiations-grid">
            {list.map((f, idx) => {
              const displayCpf = f.cpf ? formatCpf(f.cpf) : null;

              return (
                <div key={idx} className="filiation-card">
                  <div className="filiation-header">
                    <span className="kinship-badge">{f.kinshipLevel || 'Responsável'}</span>
                    {displayCpf ? (
                      <span className="filiation-cpf">
                        <strong>CPF:</strong> {displayCpf}
                      </span>
                    ) : (
                      <span className="filiation-cpf text-muted">CPF não inf.</span>
                    )}
                  </div>
                  <div className="filiation-name">{f.name || 'NOME NÃO INFORMADO'}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-muted" style={{ padding: '0.5rem 0' }}>
            Nenhum responsável vinculado neste cadastro.
          </p>
        )}
      </div>
    </div>
  );
};
