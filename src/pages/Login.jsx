import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";
import "../styles/Login.css";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const { login, currentUser, loading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  
  const from = location.state?.from?.pathname || "/dashboard";

  useEffect(() => {
    if (currentUser) {
      navigate(from, { replace: true });
    }
  }, [currentUser, navigate, from]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    
    if (!username || !password) {
      setErrorMsg("Please enter both username and password");
      return;
    }

    const res = await login(username, password);
    if (!res.success) {
      setErrorMsg(res.error);
    } else {
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="login-page">

      {/* ── Left Brand Panel ──────────────────── */}
      <div className="login-brand-panel">
        <div className="login-brand-logo">
          <div className="login-brand-icon">🛒</div>
          <span className="login-brand-name">DrinqKart</span>
        </div>

        <div className="login-brand-tagline">
          <h1>
            Smart <span>Procurement</span><br />
            Made Simple
          </h1>
          <p>
            Streamline your purchase orders, indent approvals, and receiving workflows — all in one place.
          </p>

          <div className="login-brand-features">
            <div className="login-feature-item">
              <div className="login-feature-dot" />
              Real-time indent tracking & approvals
            </div>
            <div className="login-feature-item">
              <div className="login-feature-dot" />
              Automated purchase order generation
            </div>
            <div className="login-feature-item">
              <div className="login-feature-dot" />
              Receiving verification & discrepancy logs
            </div>
            <div className="login-feature-item">
              <div className="login-feature-dot" />
              WhatsApp delivery confirmations
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Form Panel ──────────────────── */}
      <div className="login-form-panel">
        <div className="login-container">

          <div className="login-header">
            <h2>Welcome back 👋</h2>
            <p>Sign in to your account to continue</p>
          </div>

          {errorMsg && (
            <div className="login-error">
              ⚠️ {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">

            <div className="form-group">
              <label htmlFor="login-username">Username</label>
              <div className="login-input-wrapper">
                <svg
                  className="login-input-icon"
                  width="16" height="16" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <input
                  id="login-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  disabled={loading}
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="login-password">Password</label>
              <div className="login-input-wrapper">
                <svg
                  className="login-input-icon"
                  width="16" height="16" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={loading}
                  autoComplete="current-password"
                  style={{ paddingRight: "3rem" }}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  disabled={loading}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              <span>
                {loading ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </>
                )}
              </span>
            </button>

          </form>
        </div>

        <div className="login-footer">
          © {new Date().getFullYear()} DrinqKart · All rights reserved
        </div>
      </div>

      {/* Spinner keyframes inline */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default Login;
