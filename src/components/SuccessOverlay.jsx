import React from 'react';

const SuccessOverlay = ({ success, onClose }) => {
  if (!success) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: 'white',
          padding: '20px 30px',
          borderRadius: '10px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          maxWidth: '500px',
          width: '90%',
          textAlign: 'center',
          border: '3px solid #00ff00'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#00aa00',
          marginBottom: '15px'
        }}>
          ✅ Success
        </div>
        <div style={{
          fontSize: '16px',
          color: '#333',
          marginBottom: '20px',
          lineHeight: '1.4'
        }}>
          {success}
        </div>
        <button
          style={{
            backgroundColor: '#00aa00',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            fontSize: '16px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
          onClick={onClose}
        >
          OK
        </button>
      </div>
    </div>
  );
};

export default SuccessOverlay;