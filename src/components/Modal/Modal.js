import React from 'react';
import './Modal.css';

export default function Modal({ title, message, onClose, type = 'error' }) {
  const isSuccess = type === 'success';
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className={`modal-icon ${isSuccess ? 'success' : 'error'}`}>
            {isSuccess ? (
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M8 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            )}
          </div>
        </div>
        <div className="modal-body">
          <h3>{title || (isSuccess ? 'Sucesso!' : 'Erro de Autenticação')}</h3>
          <p>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="modal-btn" onClick={onClose}>
            {isSuccess ? 'OK' : 'Tentar Novamente'}
          </button>
        </div>
      </div>
    </div>
  );
}
