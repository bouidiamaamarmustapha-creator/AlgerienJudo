import React from 'react';
import { useNavigate } from 'react-router-dom';
import './index.css';

export default function ButtonTest() {
  const navigate = useNavigate();

  return (
    <div style={{ 
      padding: '50px', 
      backgroundColor: '#f0f0f0', 
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '30px'
    }}>
      <h1>Button Comparison Test</h1>
      
      <div style={{ 
        display: 'flex', 
        gap: '20px', 
        alignItems: 'center',
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: '10px', fontWeight: 'bold' }}>primary-btn class:</p>
          <button className="primary-btn">Primary Button</button>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: '10px', fontWeight: 'bold' }}>primary-b class:</p>
          <button className="primary-b">Primary B Button</button>
        </div>
      </div>

      <div style={{ 
        display: 'flex', 
        gap: '20px', 
        alignItems: 'center',
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: '10px', fontWeight: 'bold' }}>primary-bt class (for comparison):</p>
          <button className="primary-bt">Primary BT Button</button>
        </div>
      </div>

      <p style={{ 
        maxWidth: '600px', 
        textAlign: 'center', 
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        The first two buttons (primary-btn and primary-b) should look <strong>exactly identical</strong> 
        with the same gradient, animations, and hover effects. The third button (primary-bt) has 
        different enhanced styling for comparison.
      </p>

      <button 
        className="secondary-btn" 
        onClick={() => navigate('/')}
        style={{ marginTop: '20px' }}
      >
        Back to Home
      </button>
    </div>
  );
}