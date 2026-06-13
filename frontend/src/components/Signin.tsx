import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import Toast from "./Toast";

const SigninPage = () => {
  const navigate = useNavigate();
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
      const res = await api.post("/api/v1/signin", { email, password });
      const { token } = res.data;
      localStorage.setItem("token", token);
      setToast("Welcome back! Redirecting...");
      setTimeout(() => navigate("/blogs"), 1200);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || "Invalid credentials. Try again.";
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
            <div className="auth-panel-number">02</div>
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
                Welcome Back
              </span>
            </div>
            <p className="auth-panel-quote">
              The world always needs another <em>voice</em> worth hearing.
            </p>
            <p className="auth-panel-attr">— Ink & Fold</p>
          </div>

          <div className="auth-panel-bottom">
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.2rem",
              }}
            >
              {[
                { icon: "✦", text: "Discover curated stories from real writers" },
                { icon: "✦", text: "Publish your thoughts, no algorithm games" },
                { icon: "✦", text: "Build an audience that truly cares" },
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    alignItems: "flex-start",
                  }}
                >
                  <span
                    style={{
                      color: "var(--amber)",
                      fontSize: "0.6rem",
                      marginTop: "0.2rem",
                      flexShrink: 0,
                    }}
                  >
                    {item.icon}
                  </span>
                  <span
                    style={{
                      fontSize: "0.88rem",
                      color: "#9b8e7a",
                      lineHeight: 1.6,
                    }}
                  >
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="auth-panel-right">
          <div className="auth-form-container">
            <div className="auth-form-header">
              <div className="auth-form-label">Sign In</div>
              <h1 className="auth-form-title">
                Good to see
                <br />
                you again
              </h1>
              <p className="auth-form-subtitle">
                Sign in to continue reading and writing.
              </p>
            </div>

            {error && <div className="form-error">{error}</div>}

            <form onSubmit={handleSubmit}>
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
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button
                id="signin-btn"
                type="submit"
                className="form-btn"
                disabled={loading}
              >
                {loading ? "Signing In..." : "Sign In →"}
              </button>
            </form>

            <p className="form-link">
              Don't have an account?{" "}
              <Link to="/signup">Create one here</Link>
            </p>
          </div>
        </div>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </>
  );
};

export default SigninPage;
