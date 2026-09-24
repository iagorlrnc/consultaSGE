import React, { useState } from 'react';

interface CopyButtonProps {
  textToCopy: string;
  onCopied?: (text: string) => void;
  title?: string;
}

export const CopyButton: React.FC<CopyButtonProps> = ({ textToCopy, onCopied, title = 'Copiar valor' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!textToCopy || textToCopy === '--' || textToCopy.includes('Não informado')) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      if (onCopied) onCopied(textToCopy);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Falha ao copiar:', err);
    }
  };

  return (
    <button
      type="button"
      className="copy-btn"
      onClick={handleCopy}
      title={copied ? 'Copiado!' : title}
    >
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
};
