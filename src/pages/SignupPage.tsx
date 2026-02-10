import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios'; // 생성한 axios 인스턴스 import

const SignupPage = () => {
  const navigate = useNavigate();

  // 1. 입력값 상태 관리
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isValid, setIsValid] = useState(true);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    setIsValid(emailRegex.test(value));
  };

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    document.body.style.margin = '0';
    document.body.style.padding = '0';
  }, []);

  const handleSignup = async () => {
    // 2. 유효성 검사
    if (!name || !email || !password || !confirmPassword) {
      alert("모든 필드를 입력해주세요.");
      return;
    }

    if (password !== confirmPassword) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post('/api/users/signup', {
        username: name, 
        email: email,
        password: password
      });

      if (response.status === 200 || response.status === 201) {
        alert("회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.");
        navigate('/login');
      }
    } catch (error: any) {
      console.error("Signup Error:", error);
      // 에러 메시지 처리 (백엔드에서 보내주는 메시지가 있다면 표시)
      const errorMessage = error.response?.data?.message || "회원가입 중 오류가 발생했습니다.";
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* 로고 섹션 */}
      <div style={styles.logoWrapper}>
        <div style={styles.logoBox}>S</div>
        <span style={styles.logoText}>SIMVEX</span>
      </div>

      {/* 회원가입 카드 */}
      <div style={styles.card}>
        <h2 style={styles.title}>회원가입</h2>
        <p style={styles.subtitle}>새로운 계정을 만드세요</p>

        {/* 이름 입력 */}
        <div style={styles.inputGroup}>
          <label style={styles.label}>아이디</label>
          <input 
            type="text" 
            placeholder="userID" 
            style={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* 이메일 입력 */}
        <div style={styles.inputGroup}>
          <label style={styles.label}>이메일</label>
          <input 
            type="email" 
            placeholder="example@email.com" 
            style={{
              ...styles.input,
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: isValid ? 'rgba(255, 255, 255, 0.1)' : '#ef4444',
              transition: 'border-color 0.2s ease', 
            }}
            value={email}
            onChange={handleEmailChange}
          />
          {!isValid && (
            <span style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px', display: 'block' }}>
              올바른 이메일 형식이 아닙니다.
            </span>
          )}
        </div>

        {/* 비밀번호 입력 */}
        <div style={styles.inputGroup}>
          <label style={styles.label}>비밀번호</label>
          <input 
            type="password" 
            placeholder="••••••••" 
            style={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {/* 비밀번호 확인 입력 */}
        <div style={styles.inputGroup}>
          <label style={styles.label}>비밀번호 확인</label>
          <input 
            type="password" 
            placeholder="••••••••" 
            style={styles.input}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        {/* 회원가입 버튼 */}
        <button 
          onClick={handleSignup} 
          style={{
            ...styles.signupButton, 
            // 로딩 중이거나 이메일 형식이 맞지 않으면 불투명도를 낮춰 비활성화 시각화
            opacity: (isLoading || !isValid || !email) ? 0.5 : 1,
            cursor: (isLoading || !isValid || !email) ? 'not-allowed' : 'pointer'
          }}
          // 로딩 중이거나, 이메일이 유효하지 않거나, 이메일이 비어있으면 버튼 클릭 막기
          disabled={isLoading || !isValid || !email}
        >
          {isLoading ? "가입 처리 중..." : (
            <>
              회원가입 <span style={styles.arrow}>→</span>
            </>
          )}
        </button>

        {/* 하단 링크 */}
        <div style={styles.footerText}>
          이미 계정이 있으신가요? 
          <span onClick={() => navigate('/login')} style={styles.link}>
            로그인
          </span>
        </div>
      </div>
    </div>
  );
};

// 스타일 객체 
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'radial-gradient(circle at center, #1e293b 0%, #080c14 100%)',
    color: 'white',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  logoWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '32px',
  },
  logoBox: {
    width: '38px',
    height: '38px',
    backgroundColor: '#4da6ff',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '20px',
  },
  logoText: {
    fontSize: '22px',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: '16px',
    padding: '40px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  },
  title: {
    fontSize: '26px',
    fontWeight: '600',
    margin: '0 0 8px 0',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: '14px',
    marginBottom: '28px',
  },
  inputGroup: {
    marginBottom: '18px',
  },
  label: {
    fontSize: '13px',
    color: '#94a3b8',
    display: 'block',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    backgroundColor: '#1e293b',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    color: 'white',
    boxSizing: 'border-box',
    outline: 'none',
    fontSize: '14px',
  },
  signupButton: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginTop: '10px',
  },
  arrow: {
    fontSize: '16px',
    marginTop: '-2px',
  },
  footerText: {
    textAlign: 'center',
    marginTop: '24px',
    fontSize: '14px',
    color: '#94a3b8',
  },
  link: {
    color: '#4da6ff',
    cursor: 'pointer',
    marginLeft: '6px',
    fontWeight: '500',
  },
};

export default SignupPage;