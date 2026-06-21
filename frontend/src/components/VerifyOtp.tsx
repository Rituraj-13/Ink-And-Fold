import { useState, type FormEvent, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api";
import Toast from "./Toast";

const VerifyOtpPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!email) {
      setError("No email address provided. Please sign up first.");
    }
  }, [email]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/api/v1/verify-otp", { email, otp });
      const { token } = res.data;
      localStorage.setItem("token", token);
      setToast("Verification successful! Logging you in...");
      setTimeout(() => navigate("/blogs"), 1200);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || "Invalid verification code. Try again.";
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
            <div className="auth-panel-number">03</div>
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
                Security First
              </span>
            </div>
            <p className="auth-panel-quote">
              Protecting your <em>words</em> and your digital presence.
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
                { icon: "✦", text: "One-time code sent directly to your inbox" },
                { icon: "✦", text: "Keeps your account secure from unauthorized access" },
                { icon: "✦", text: "Session cookies stored safely and securely" },
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
              <div className="auth-form-label">Verify Email</div>
              <h1 className="auth-form-title">
                Enter your
                <br />
                verification code
              </h1>
              <p className="auth-form-subtitle">
                We sent a 6-digit verification code to <strong style={{ color: "var(--foreground)" }}>{email || "your email"}</strong>.
              </p>
            </div>

            {error && <div className="form-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="otp">
                  Verification Code (OTP)
                </label>
                <input
                  id="otp"
                  type="text"
                  className="form-input"
                  placeholder="123456"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  required
                  disabled={!email || loading}
                  style={{
                    letterSpacing: "0.3em",
                    textAlign: "center",
                    fontSize: "1.25rem",
                    fontFamily: '"DM Mono", monospace',
                  }}
                />
              </div>

              <button
                id="verify-btn"
                type="submit"
                className="form-btn"
                disabled={loading || !email || otp.length !== 6}
              >
                {loading ? "Verifying..." : "Verify & Sign In →"}
              </button>
            </form>

            <p className="form-link">
              Need to try a different email?{" "}
              <Link to="/signup">Go back to Sign Up</Link>
            </p>
          </div>
        </div>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </>
  );
};

export default VerifyOtpPage;
