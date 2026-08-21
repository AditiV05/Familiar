// pages/Login.jsx
import { useState } from "react";
import axios from "axios";
import { API_URL } from "../config"; // keep this if API_URL already includes '/api'
import { useNavigate, useLocation, Link } from "react-router-dom";
import "./Auth.css";

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  // Google refuses OAuth inside embedded in-app browsers (LinkedIn, WhatsApp, Instagram...).
  // Nothing we can do about it, so don't offer a button that's guaranteed to fail.
  const isInAppBrowser = () => {
    const ua = navigator.userAgent || "";
    return /FBAN|FBAV|Instagram|LinkedInApp|WhatsApp|Snapchat|Pinterest|Line\/|Twitter/i.test(
      ua,
    );
  };

  // If your API_URL includes '/api', this is correct:
  const GOOGLE_URL = `${API_URL}/auth/google`;

  // Navigating straight to the backend while Render is asleep means the user
  // stares at a blank server page for 40 seconds with nothing to look at.
  // Wake it first, behind our own spinner, then hand over to Google.
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25000);
      await fetch(`${API_URL}/health`, {
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timer);
    } catch {
      // Still asleep or unreachable. Go anyway rather than trapping the user.
    }
    window.location.href = GOOGLE_URL;
  };

  const handleChange = (e) => {
    setFormData((s) => ({ ...s, [e.target.name]: e.target.value }));
  };

  const handleResend = async () => {
    setResending(true);
    setResendMsg("");
    try {
      const { data } = await axios.post(`${API_URL}/auth/resend-verification`, {
        email: formData.email,
      });
      setResendMsg(data.message);
    } catch {
      setResendMsg("Couldn't send right now. Try again in a moment.");
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setNeedsVerification(false);
    setResendMsg("");
    setLoading(true);

    try {
      const { data } = await axios.post(`${API_URL}/auth/login`, formData, {
        headers: { "Content-Type": "application/json" },
      });

      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", data.user?._id || "");
      localStorage.setItem("userName", data.user?.name || "");

      const to = location.state?.from?.pathname || "/";
      navigate(to, { replace: true });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (err.code === "ERR_NETWORK"
          ? "Network error: API unreachable"
          : "Login failed");
      setError(msg);
      // 403 means the account exists but hasn't been verified yet
      setNeedsVerification(err.response?.status === 403);
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <aside className="auth-left">
        <div className="auth-wordmark">Familiar</div>
        <p className="auth-statement">
          Where <em>ideas</em> find the people who need them.
        </p>
        <p className="auth-footnote">
          A quiet place to read, write, and think out loud. Stories from writers
          on any topic that matters.
        </p>
      </aside>

      <main className="auth-right">
        <div className="auth-card">
          <div className="auth-tabs">
            <span className="auth-tab active">Sign in</span>
            <Link to="/signup" className="auth-tab">
              Create account
            </Link>
          </div>

          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-sub">Sign in to keep reading and writing.</p>

          {error && <p className="auth-error">{error}</p>}

          {needsVerification && (
            <div className="auth-resend">
              {resendMsg ? (
                <p className="auth-resend-note">{resendMsg}</p>
              ) : (
                <button
                  type="button"
                  className="auth-resend-btn"
                  onClick={handleResend}
                  disabled={resending}
                >
                  {resending ? "Sending..." : "Resend verification email"}
                </button>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                name="email"
                placeholder="you@email.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="auth-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
            <div className="auth-forgot">
              <Link to="/forgot-password">Forgot password?</Link>
            </div>
            <button
              type="submit"
              className="auth-btn auth-btn-primary"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="auth-divider">or</div>

          {isInAppBrowser() ? (
            <p className="auth-inapp-note">
              Google sign-in needs a full browser. Tap the ••• menu and choose
              &ldquo;Open in Safari&rdquo;, or use your email and password
              above.
            </p>
          ) : (
            <>
              <button
                onClick={handleGoogleLogin}
                className="auth-btn-google"
                disabled={googleLoading}
              >
                <svg viewBox="0 0 48 48">
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.1 0 24 0 14.6 0 6.4 5.4 2.5 13.3l7.8 6.1C12.2 13.6 17.6 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.5 3-2.2 5.5-4.7 7.2l7.3 5.7c4.3-4 6.7-9.8 6.7-17.4z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.3 28.6c-.5-1.4-.7-2.9-.7-4.6s.3-3.2.7-4.6l-7.8-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.5 10.7l7.8-6.1z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.1 0 11.3-2 15-5.5l-7.3-5.7c-2 1.4-4.7 2.3-7.7 2.3-6.4 0-11.8-4.1-13.7-9.9l-7.8 6.1C6.4 42.6 14.6 48 24 48z"
                  />
                </svg>
                {googleLoading ? "Connecting..." : "Continue with Google"}
              </button>

              {googleLoading && (
                <p className="auth-inapp-note">
                  Waking the server. This can take a moment the first time.
                </p>
              )}
            </>
          )}

          <p className="auth-foot">
            New to Familiar? <Link to="/signup">Create an account</Link>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Login;
