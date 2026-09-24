import React from 'react';
import { Address } from '../../types/student';
import { formatCep } from '../../lib/formatters';

interface AddressCardProps {
  address?: Address;
}

export const AddressCard: React.FC<AddressCardProps> = ({ address }) => {
  const street = address?.street || 'Não informado';
  const number = address?.number || 'S/N';
  const neighborhood = address?.neighborhood || 'Não informado';
  const zip = formatCep(address?.zipCode);
  const city = address?.city || 'TOCANTINS';
  const state = address?.state || 'TO';

  return (
    <div className="detail-card">
      <div className="card-header">
        <div className="card-header-title">
          <div className="card-icon icon-emerald">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <h3>Endereço Residencial</h3>
        </div>
        <span className="card-tag">Localização</span>
      </div>

      <div className="card-body">
        <div className="data-field">
          <label>Logradouro / Rua / Quadra</label>
          <span className="value-text font-medium">{street}</span>
        </div>

        <div className="fields-row">
          <div className="data-field">
            <label>Número</label>
            <span className="value-text">{number}</span>
          </div>
          <div className="data-field">
            <label>Bairro / Setor</label>
            <span className="value-text font-medium">{neighborhood}</span>
          </div>
        </div>

        <div className="fields-row">
          <div className="data-field">
            <label>CEP</label>
            <span className="code-value font-mono">{zip}</span>
          </div>
          <div className="data-field">
            <label>Cidade / UF</label>
            <span className="value-text font-bold">{city} - {state}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
