// components/Common/ConfirmDialog.jsx
import React from 'react';

export default function ConfirmDialog({ message, onConfirm, onCancel, isProcessing }) {
  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10001, // Выше тостов и других элементов
  };

  const dialogStyle = {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '10px',
    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.4)',
    maxWidth: '400px',
    width: '90%',
    textAlign: 'center',
    fontFamily: 'Arial, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  };

  const buttonStyle = {
    padding: '10px 20px',
    borderRadius: '5px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'background-color 0.2s, transform 0.1s',
  };

  const confirmButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#dc3545', // Красный для подтверждения удаления
    color: 'white',
  };

  const cancelButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#6c757d', // Серый для отмены
    color: 'white',
  };

  const disabledButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#cccccc',
    cursor: 'not-allowed',
  };

  return (
    <div style={overlayStyle}>
      <div style={dialogStyle}>
        <p style={{ margin: 0, fontSize: '18px', color: '#333', fontWeight: 'bold' }}>
          {message}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-around', gap: '15px', marginTop: '15px' }}>
          <button
            onClick={onCancel}
            style={isProcessing ? disabledButtonStyle : cancelButtonStyle}
            disabled={isProcessing}
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            style={isProcessing ? disabledButtonStyle : confirmButtonStyle}
            disabled={isProcessing}
          >
            {isProcessing ? 'Удаляю...' : 'Подтвердить'}
          </button>
        </div>
      </div>
    </div>
  );
}
