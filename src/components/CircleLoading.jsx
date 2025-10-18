import React, { useEffect } from 'react';

const CircleLoading = ({ message = "Loading..." }) => {
  console.log("CircleLoading component is rendering");
  
  // Add CSS animation to document head
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }
      
      @keyframes pulse {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(2px)'
      }}>
      <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          border: '2px solid #22c55e',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '25px',
          minWidth: '300px'
        }}>
        
        {/* Spinning Circle */}
        <div style={{
          width: '60px',
          height: '60px',
          border: '6px solid rgba(34, 197, 94, 0.2)',
          borderTop: '6px solid #22c55e',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        
        {/* Loading Text */}
        <span style={{ 
          color: '#22c55e', 
          fontWeight: '600',
          fontSize: '16px',
          textAlign: 'center',
          animation: 'pulse 2s ease-in-out infinite'
        }}>
          {message}
        </span>
      </div>
    </div>
  );
};

export default CircleLoading;