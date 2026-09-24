import React, { useState, useMemo, useEffect } from 'react';
import { TOCANTINS_IBGE_CITIES, IbgeCity, normalizeCityName } from '../../data/ibgeTocantins';
import { CopyButton } from '../ui/CopyButton';

interface IbgeLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCityName?: string;
  onNotify?: (msg: string) => void;
}

export const IbgeLookupModal: React.FC<IbgeLookupModalProps> = ({
  isOpen,
  onClose,
  selectedCityName,
  onNotify
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Filter cities by search term
  const filteredCities = useMemo(() => {
    if (!searchTerm.trim()) {
      return TOCANTINS_IBGE_CITIES;
    }
    const term = normalizeCityName(searchTerm);
    const digits = searchTerm.replace(/\D/g, '');

    return TOCANTINS_IBGE_CITIES.filter((city: IbgeCity) => {
      const matchName = normalizeCityName(city.name).includes(term);
      const matchCode = digits ? city.id.includes(digits) : false;
      return matchName || matchCode;
    });
  }, [searchTerm]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setSearchTerm(text.trim());
        if (onNotify) onNotify(`Texto colado: "${text.trim()}"`);
      }
    } catch {
      if (onNotify) onNotify('Não foi possível acessar a área de transferência.');
    }
  };

  const handleCopied = (city: IbgeCity) => {
    if (onNotify) {
      onNotify(`Código IBGE ${city.id} (${city.name}) copiado com sucesso!`);
    }
  };

  if (!isOpen) return null;

  const currentNormalized = selectedCityName ? normalizeCityName(selectedCityName) : '';

  return (
    <div className="ibge-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="ibge-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ibge-modal-header">
          <div className="ibge-modal-title-group">
            <div className="ibge-modal-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <div>
              <h3>Códigos IBGE dos Municípios do Tocantins</h3>
              <p>Tabela oficial dos 139 municípios do Estado (UF 17 - Tocantins)</p>
            </div>
          </div>
          <button
            type="button"
            className="ibge-modal-close"
            onClick={onClose}
            title="Fechar (Esc)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Search Bar with Paste Button */}
        <div className="ibge-modal-search-box">
          <div className="ibge-search-input-wrapper">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Pesquise por município ou código IBGE..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
              className="ibge-search-input"
            />
            {searchTerm && (
              <button
                type="button"
                className="ibge-search-clear"
                onClick={() => setSearchTerm('')}
                title="Limpar pesquisa"
              >
                ✕
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handlePaste}
            className="ibge-paste-btn"
            title="Colar texto copiado na pesquisa"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            </svg>
            <span>Colar</span>
          </button>
        </div>

        {/* City count status */}
        <div className="ibge-results-count">
          <span>
            Exibindo <strong>{filteredCities.length}</strong> de <strong>{TOCANTINS_IBGE_CITIES.length}</strong> municípios
          </span>
          {selectedCityName && (
            <span className="ibge-student-city-note">
              Cidade do estudante: <strong>{selectedCityName}</strong>
            </span>
          )}
        </div>

        {/* List of Cities */}
        <div className="ibge-modal-list">
          {filteredCities.length === 0 ? (
            <div className="ibge-empty-state">
              <p>Nenhum município encontrado com o termo "{searchTerm}".</p>
              <button
                type="button"
                className="btn-link"
                onClick={() => setSearchTerm('')}
              >
                Limpar busca
              </button>
            </div>
          ) : (
            <div className="ibge-table-container">
              <table className="ibge-table">
                <thead>
                  <tr>
                    <th>Município</th>
                    <th style={{ width: '130px' }}>Código IBGE</th>
                    <th style={{ width: '85px', textAlign: 'center' }}>Copiar</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCities.map((city) => {
                    const isSelected = normalizeCityName(city.name) === currentNormalized;
                    return (
                      <tr
                        key={city.id}
                        className={isSelected ? 'ibge-row-highlight' : ''}
                      >
                        <td>
                          <div className="ibge-city-cell">
                            <span className="ibge-city-name">{city.name}</span>
                            {isSelected && (
                              <span className="ibge-badge-student">
                                Cidade do Aluno
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <code className="ibge-code-badge">{city.id}</code>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <CopyButton
                            textToCopy={city.id}
                            onCopied={() => handleCopied(city)}
                            title={`Copiar código IBGE de ${city.name}`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="ibge-modal-footer">
          <span className="ibge-source-text">Fonte: Instituto Brasileiro de Geografia e Estatística (IBGE)</span>
          <button type="button" className="ibge-btn-close" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
