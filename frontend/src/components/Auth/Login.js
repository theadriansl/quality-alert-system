import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const Login = () => {
  const { theme: t } = useTheme();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(formData.email, formData.password);
      window.location.href = '/';
    } catch (error) {
      setError(error.response?.data?.message || 'Login error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const styles = {
    page: {
      minHeight: '100vh',
      backgroundColor: t.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    },
    container: {
      width: '100%',
      maxWidth: '400px',
      padding: '32px'
    },
    card: {
      backgroundColor: t.bgCard,
      border: `1px solid ${t.border}`,
      borderRadius: '4px',
      padding: '32px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.07)'
    },
    logo: {
      width: '48px',
      height: '48px',
      backgroundColor: t.primary,
      borderRadius: '4px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontWeight: '700',
      fontSize: '16px',
      margin: '0 auto 24px'
    },
    title: {
      fontSize: '18px',
      fontWeight: '600',
      color: t.text,
      textAlign: 'center',
      margin: '0 0 4px 0'
    },
    subtitle: {
      fontSize: '13px',
      color: t.textMuted,
      textAlign: 'center',
      margin: '0 0 32px 0'
    },
    error: {
      backgroundColor: t.id === 'dark' ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
      border: `1px solid ${t.error}`,
      color: t.error,
      padding: '12px',
      borderRadius: '4px',
      marginBottom: '16px',
      fontSize: '13px'
    },
    fieldGroup: {
      marginBottom: '16px'
    },
    label: {
      display: 'block',
      fontSize: '11px',
      fontWeight: '500',
      color: t.textMuted,
      textTransform: 'uppercase',
      letterSpacing: '0.03em',
      marginBottom: '6px'
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      fontSize: '14px',
      border: `1px solid ${t.border}`,
      borderRadius: '4px',
      backgroundColor: t.bgCard,
      color: t.text,
      boxSizing: 'border-box'
    },
    inputFocus: {
      outline: 'none',
      borderColor: t.primary,
      boxShadow: `0 0 0 2px ${t.accent}20`
    },
    passwordWrapper: {
      position: 'relative'
    },
    passwordToggle: {
      position: 'absolute',
      right: '12px',
      top: '50%',
      transform: 'translateY(-50%)',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: '4px',
      color: t.textMuted,
      fontSize: '12px',
      fontWeight: '500'
    },
    submitBtn: {
      width: '100%',
      padding: '12px',
      fontSize: '14px',
      fontWeight: '500',
      color: 'white',
      backgroundColor: t.primary,
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      marginTop: '8px'
    },
    submitBtnDisabled: {
      backgroundColor: t.textDim,
      cursor: 'not-allowed'
    },
    footer: {
      marginTop: '24px',
      padding: '16px',
      backgroundColor: t.bgPanel,
      border: `1px solid ${t.border}`,
      borderRadius: '4px'
    },
    footerTitle: {
      fontSize: '11px',
      fontWeight: '600',
      color: t.textMuted,
      textTransform: 'uppercase',
      letterSpacing: '0.03em',
      margin: '0 0 12px 0'
    },
    credential: {
      fontSize: '12px',
      color: t.textMuted,
      marginBottom: '6px',
      fontFamily: 'monospace'
    },
    credentialLabel: {
      fontWeight: '600',
      color: t.text
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.logo}>QMS</div>
          <h1 style={styles.title}>Quality Management System</h1>
          <p style={styles.subtitle}>Sign in to your account</p>

          {error && (
            <div style={styles.error}>{error}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Email</label>
              <input
                name="email"
                type="email"
                required
                style={styles.input}
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                onFocus={(e) => e.target.style.borderColor = t.primary}
                onBlur={(e) => e.target.style.borderColor = t.border}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Password</label>
              <div style={styles.passwordWrapper}>
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  style={{ ...styles.input, paddingRight: '60px' }}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={(e) => e.target.style.borderColor = t.primary}
                  onBlur={(e) => e.target.style.borderColor = t.border}
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  style={styles.passwordToggle}
                >
                  {showPassword ? 'HIDE' : 'SHOW'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.submitBtn,
                ...(loading ? styles.submitBtnDisabled : {})
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <div style={styles.footer}>
          <p style={styles.footerTitle}>Test Credentials</p>
          <div style={styles.credential}>
            <span style={styles.credentialLabel}>Champion:</span> admin@8dsystem.com / password123
          </div>
          <div style={styles.credential}>
            <span style={styles.credentialLabel}>Manager:</span> manager@8dsystem.com / password123
          </div>
          <div style={styles.credential}>
            <span style={styles.credentialLabel}>Engineer:</span> engineer@8dsystem.com / password123
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
