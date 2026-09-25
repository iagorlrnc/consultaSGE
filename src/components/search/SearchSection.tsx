import React, { useState, useEffect } from 'react';
import { applyCpfMask } from '../../lib/cpf';
import { SampleStudentMeta } from '../../types/stats';

interface QuickSamplesProps {
  samples?: SampleStudentMeta[];
  onSelect?: (cpf: string) => void;
}

export const QuickSamples: React.FC<QuickSamplesProps> = () => {
  return null;
};

interface SearchSectionProps {
  onSearch: (cpf: string) => void;
  loading: boolean;
  onSelectSample?: (cpf: string) => void;
  sampleCpfs?: SampleStudentMeta[];
  currentCpfValue: string;
}

export const SearchSection: React.FC<SearchSectionProps> = ({
  onSearch,
  loading,
  currentCpfValue
}) => {
  const [inputValue, setInputValue] = useState(currentCpfValue);

  useEffect(() => {
    setInputValue(currentCpfValue);
  }, [currentCpfValue]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Permite teclas de navegação, edição e atalhos (Ctrl/Cmd)
    if (
      e.key === 'Backspace' ||
      e.key === 'Delete' ||
      e.key === 'Tab' ||
      e.key === 'Escape' ||
      e.key === 'Enter' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      e.key === 'Home' ||
      e.key === 'End' ||
      e.ctrlKey ||
      e.metaKey
    ) {
      return;
    }

    // Bloqueia qualquer caractere que não seja número (0 a 9)
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Garante que apenas dígitos sejam aceitos mesmo ao colar texto
    const digitsOnly = e.target.value.replace(/\D/g, '');
    const masked = applyCpfMask(digitsOnly);
    setInputValue(masked);
  };

  const handleClear = () => {
    setInputValue('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    onSearch(inputValue);
  };

  return (
    <section className="search-section">
      <div className="search-card">
        <div className="search-title-area">
          <h2>Consultar Estudante</h2>
          <p>
            Digite o CPF do aluno para visualizar a ficha cadastral completa, escola vinculada e histórico de matrículas
          </p>
        </div>

        <form onSubmit={handleSubmit} className="search-form" autoComplete="off">
          <div className="search-input-wrapper">
            <div className="search-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <input
              type="text"
              id="cpfInput"
              placeholder="Digite o CPF do aluno"
              maxLength={14}
              inputMode="numeric"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            {inputValue && (
              <button
                type="button"
                className="clear-btn"
                onClick={handleClear}
                title="Limpar campo"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          <div className="search-actions">
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span>{loading ? 'Consultando Banco...' : 'Pesquisar Aluno'}</span>
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};
