import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { getInitials } from '../../lib/formatters';

interface HeaderProps {
  onNotify: (msg: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onNotify }) => {
  const { user, logout } = useAuth();

  const handleLogoutClick = () => {
    logout();
    onNotify('Sessão encerrada com segurança.');
  };

  const name = user?.name || 'Administrador SGE';
  const role = user?.role || 'Operador Estadual';
  const state = user?.state || 'Tocantins - TO';
  const initials = getInitials(name);

  return (
    <header className="app-header">
      <div className="header-container">
        <div className="brand">
          <div className="brand-text">
            <h1>BACKUP SGE</h1>
            <h1>
              <span>Consulta & Histórico</span>
            </h1>
          </div>
        </div>

        <div className="header-right">
          <span className="badge badge-state">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10" />
            </svg>
            {state}
          </span>

          <div className="user-profile-badge">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <span className="user-name">{name}</span>
              <span className="user-role">{role}</span>
            </div>
            <button
              type="button"
              onClick={handleLogoutClick}
              className="btn-logout"
              title="Encerrar Sessão"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span>Sair</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
