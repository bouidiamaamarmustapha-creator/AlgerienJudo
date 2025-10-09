import React, { useEffect } from 'react';

const BarLoading = ({ message = "Loading..." }) => {
  // Add CSS animation to document head
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes loadingBar {
        0% {
          transform: scaleX(0);
        }
        50% {
          transform: scaleX(0.7);
        }
        100% {
          transform: scaleX(1);
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
          borderRadius: '15px',
          padding: '30px 40px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          minWidth: '300px'
        }}>
        
        {/* Loading Bar Container */}
        <div style={{
          width: '100%',
          height: '8px',
          backgroundColor: '#e5e7eb',
          borderRadius: '4px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          {/* Animated Loading Bar */}
          <div style={{
            height: '100%',
            backgroundColor: '#22c55e',
            borderRadius: '4px',
            animation: 'loadingBar 2s ease-in-out infinite',
            transformOrigin: 'left'
          }}></div>
        </div>
        
        {/* Loading Text */}
        <span style={{ 
          color: '#22c55e', 
          fontWeight: '600',
          fontSize: '16px',
          textAlign: 'center'
        }}>
          {message}
        </span>
      </div>
    </div>
  );
};

export default BarLoading;