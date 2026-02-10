import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.body.style.margin = '0';
    document.body.style.padding = '0';
  }, []);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'radial-gradient(circle at center, #1e293b 0%, #080c14 100%)',
      color: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      
      {/* 로고 영역 */}
      <div style={{
        width: '64px',
        height: '64px',
        backgroundColor: '#4da6ff',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 0 30px rgba(77, 166, 255, 0.4)',
        marginBottom: '24px'
      }}>
        <span style={{ fontSize: '32px', fontWeight: 'bold' }}>S</span>
      </div>

      <h1 style={{ fontSize: '48px', fontWeight: 'bold', margin: '0 0 8px 0', letterSpacing: '2px' }}>SIMVEX</h1>
      <p style={{ color: '#94a3b8', fontSize: '18px', margin: '0 0 40px 0' }}>Engineering & CAD Platform</p>

      <p style={{ color: '#cbd5e1', fontSize: '14px', marginBottom: '48px', opacity: 0.8 }}>
        프로젝트 관리와 CAD 설계를 위한 통합 플랫폼
      </p>

      {/* 버튼 영역 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '320px' }}>
        {/* Login 버튼 수정: /login 으로 이동 */}
        <button 
          onClick={() => navigate('/login')}
          style={{
            padding: '14px',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Login
        </button>
        
        {/* Signup 버튼: /signup 으로 이동 */}
        <button 
          onClick={() => navigate('/signup')}
          style={{
            padding: '14px',
            backgroundColor: 'rgba(30, 41, 59, 0.5)',
            color: '#cbd5e1',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Signup
        </button>
      </div>

    </div>
  );
};

export default LandingPage;