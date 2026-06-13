import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import Toast from "./Toast";

const SignupPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/api/v1/signup", { name, email, password });
      const { token } = res.data;
      localStorage.setItem("token", token);
      setToast("Account created! Welcome aboard.");
      setTimeout(() => navigate("/blogs"), 1200);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || "Something went wrong. Try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="auth-page">
        {/* Left Panel */}
        <div className="auth-panel-left">
          <div className="auth-panel-left-content">
            <div className="auth-panel-number">01</div>
            <div style={{ position: "relative", marginTop: "2rem" }}>
              <span
                style={{
                  fontFamily: '"DM Mono", monospace',
                  fontSize: "0.72rem",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "var(--amber)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                }}
              >
                <span
                  style={{
                    display: "block",
                    width: "24px",
                    height: "1.5px",
                    background: "var(--amber)",
                  }}
                ></span>
                Join the Platform
              </span>
            </div>
            <p className="auth-panel-quote">
              Every great story begins with a <em>blank page.</em>
            </p>
            <p className="auth-panel-attr">
              — Ink & Fold Publishing House
            </p>
          </div>

          <div className="auth-panel-bottom">
            <div className="auth-stat">
              <div className="stat-item">
                <div className="stat-number">12K+</div>
                <div className="stat-label">Active Writers</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">84K+</div>
                <div className="stat-label">Stories Published</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">2.1M</div>
                <div className="stat-label">Monthly Readers</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">140+</div>
                <div className="stat-label">Topics Covered</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="auth-panel-right">
          <div className="auth-form-container">
            <div className="auth-form-header">
              <div className="auth-form-label">Create Account</div>
              <h1 className="auth-form-title">
                Start your
                <br />
                writing journey
              </h1>
              <p className="auth-form-subtitle">
                Join thousands of writers sharing their stories.
              </p>
            </div>

            {error && <div className="form-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="name">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  className="form-input"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="email">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  className="form-input"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>

              <button
                id="signup-btn"
                type="submit"
                className="form-btn"
                disabled={loading}
              >
                {loading ? "Creating Account..." : "Create Account →"}
              </button>
            </form>

            <p className="form-link">
              Already have an account?{" "}
              <Link to="/signin">Sign in here</Link>
            </p>
          </div>
        </div>
      </div>

      {toast && (
        <Toast message={toast} onClose={() => setToast("")} />
      )}
    </>
  );
};

export default SignupPage;
