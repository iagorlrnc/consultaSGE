import React from 'react';
import { Documents } from '../../types/student';
import { formatCpf, maskCpfPrivacy, maskDocumentPrivacy } from '../../lib/cpf';
import { useAuth } from '../../context/AuthContext';
import { CopyButton } from '../ui/CopyButton';

interface DocumentsCardProps {
  documents?: Documents;
  onNotify: (msg: string) => void;
}

export const DocumentsCard: React.FC<DocumentsCardProps> = ({ documents, onNotify }) => {
  const { privacyMode } = useAuth();

  const rawCpf = documents?.cpf;
  const displayCpf = rawCpf ? formatCpf(rawCpf) : 'Não cadastrado';
  const copyCpf = rawCpf ? formatCpf(rawCpf) : '';

  const rawRg = documents?.rg || 'Não informado';
  const displayRg = rawRg;

  const issuingBody = documents?.issuingBody || 'SSP';
  const rawNis = documents?.nis || 'Não informado';
  const displayNis = rawNis;

  const cnh = documents?.cnh || 'Não possui';
  const rawBirthCert = documents?.birthCertificate || 'Não informada';
  const displayBirthCert = rawBirthCert;

  return (
    <div className="detail-card">
      <div className="card-header">
        <div className="card-header-title">
          <div className="card-icon icon-blue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <h3>Documentos</h3>
        </div>
        <span className="card-tag">Identificação</span>
      </div>

      <div className="card-body">
        <div className="data-field highlight-field">
          <label>CPF do Estudante</label>
          <div className="copy-field">
            <span className="code-value font-mono">{displayCpf}</span>
            {copyCpf && (
              <CopyButton
                textToCopy={copyCpf}
                onCopied={(txt) => onNotify(`CPF copiado: ${txt}`)}
                title="Copiar CPF"
              />
            )}
          </div>
        </div>

        <div className="fields-row">
          <div className="data-field">
            <label>Registro Geral (RG)</label>
            <span className="value-text">{displayRg}</span>
          </div>
          <div className="data-field">
            <label>Órgão Emissor</label>
            <span className="value-text">{issuingBody}</span>
          </div>
        </div>

        <div className="fields-row">
          <div className="data-field">
            <label>NIS (CadÚnico)</label>
            <span className="value-text">{displayNis}</span>
          </div>
          <div className="data-field">
            <label>CNH</label>
            <span className="value-text">{cnh}</span>
          </div>
        </div>

        <div className="data-field">
          <label>Certidão de Nascimento (Termo/Matrícula)</label>
          <div className="copy-field">
            <span className="code-value font-mono small-code">{displayBirthCert}</span>
            {rawBirthCert !== 'Não informada' && (
              <CopyButton
                textToCopy={rawBirthCert}
                onCopied={(txt) => onNotify(`Certidão copiada: ${txt}`)}
                title="Copiar Certidão"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
