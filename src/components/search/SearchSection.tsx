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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Se o usuário estiver digitando letras, permite busca por Nome
    const hasLetters = /[a-zA-ZÀ-ÿ]/.test(raw);
    if (hasLetters) {
      setInputValue(raw);
    } else {
      const masked = applyCpfMask(raw);
      setInputValue(masked);
    }
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
            Digite o CPF, Nome ou ID do aluno para visualizar a ficha cadastral completa, escola vinculada e histórico de matrículas
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
              placeholder="Digite o CPF, Nome ou ID do aluno"
              maxLength={80}
              value={inputValue}
              onChange={handleInputChange}
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
