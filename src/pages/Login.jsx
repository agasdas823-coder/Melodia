import { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, Music2, Mail, Lock, User, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../utils/config";
import { authService } from "../services/apiService";

function MelodiLogo() {
  return (
    <div className="flex items-center justify-center mb-4">
      <img src="/logo-login.png" alt="Melodia Logo" className="h-20 w-auto object-contain mix-blend-lighten" />
    </div>
  );
}

function GoogleLogo({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function InputField({
  label,
  type,
  placeholder,
  icon: Icon,
  value,
  onChange,
  toggle,
  onToggle,
}) {
  return (
    <div className="flex flex-col gap-1.5 text-left">
      <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#8888a8" }}>{label}</label>
      <div className="relative flex items-center">
        <div className="absolute left-3.5 pointer-events-none" style={{ color: "#55557a" }}>
          <Icon size={16} />
        </div>
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          className="w-full rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-[#55557a] outline-none transition-all duration-200 focus:ring-2 bg-[#1a1a2a]/60"
          style={{
            border: "1px solid rgba(255,255,255,0.08)",
            "--tw-ring-color": "rgba(124,92,252,0.4)",
          }}
        />
        {toggle && (
          <button
            type="button"
            onClick={onToggle}
            className="absolute right-3.5 transition-colors cursor-pointer"
            style={{ color: "#55557a" }}
          >
            {type === "password" ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}

export default function Login({ initialTab = "login" }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/explore";

  const [tab, setTab] = useState(initialTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Invalid email or password");
      }
      login(data.user, data.token);
      navigate(data.user.role === "admin" ? "/admin" : from);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!agreed) {
      setError("You must agree to the Terms of Service and Privacy Policy");
      return;
    }

    setLoading(true);

    try {
      const res = await authService.register({ fullName, email, password });
      const data = res.data;
      login(data.user, data.token);
      navigate(from);
    } catch (err) {
      const serverMessage = err?.response?.data?.error?.message || err?.response?.data?.message;
      setError(serverMessage || err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };


  // Use Google Identity Services to show the real Google account chooser popup
  const triggerRealGoogleLogin = (clientId) => {
    try {
      if (!window.google?.accounts?.id) {
        setError("Google Sign-In library is still loading. Please wait a moment and try again.");
        setLoading(false);
        return;
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          try {
            // Decode JWT payload from the credential
            const parts = response.credential.split(".");
            const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
            
            login(
              {
                id: `google-${payload.sub}`,
                username: payload.name || payload.email?.split("@")[0] || "Google User",
                email: payload.email || "",
                avatar: payload.picture || null,
                role: "user",
              },
              response.credential
            );

            if (payload.picture) {
              localStorage.setItem("melodia_avatar", payload.picture);
            }
            navigate(from);
          } catch (err) {
            console.error("Google sign-in decode error:", err);
            setError("Failed to process Google sign-in. Please try again.");
          }
          setLoading(false);
        },
        ux_mode: "popup",
        auto_select: false,
        itp_support: true,
      });

      // Show the Google One Tap / account chooser popup
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // If One Tap is blocked (3rd party cookies, dismissed previously, etc.),
          // fall back to rendering a standard Google Sign-In button and auto-clicking it
          const tempContainer = document.createElement("div");
          tempContainer.id = "gsi-temp-btn-" + Date.now();
          tempContainer.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:99999;";
          document.body.appendChild(tempContainer);

          window.google.accounts.id.renderButton(tempContainer, {
            type: "standard",
            theme: "filled_blue",
            size: "large",
            text: "continue_with",
            shape: "pill",
            width: 300,
          });

          // Wait for the button iframe to load, then click it
          setTimeout(() => {
            const btn = tempContainer.querySelector('div[role="button"]');
            if (btn) {
              btn.click();
            }
            setTimeout(() => {
              if (tempContainer.parentNode) tempContainer.remove();
            }, 1000);
          }, 500);

          setLoading(false);
        }
      });
    } catch (err) {
      console.error("Google Sign-In error:", err);
      setError("Google Sign-In failed. Please check your Client ID and try again.");
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setError("");
    setLoading(true);

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!clientId || clientId === "YOUR_GOOGLE_CLIENT_ID_HERE") {
      setError("Google Client ID is not configured. Please set VITE_GOOGLE_CLIENT_ID in your .env file.");
      setLoading(false);
      return;
    }

    triggerRealGoogleLogin(clientId);
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "#07070F", fontFamily: "Urbanist, sans-serif" }}
    >
      {/* Ambient background glows */}
      <div
        className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)" }}
      />
      <div
        className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(192,132,252,0.06) 0%, transparent 70%)" }}
      />

      {/* Subtle grid texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Card */}
        <div
          className="rounded-3xl p-8"
          style={{
            background: "rgba(14, 14, 28, 0.75)",
            border: "1px solid rgba(139, 92, 246, 0.15)",
            backdropFilter: "blur(24px)",
            boxShadow: "0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.02) inset",
          }}
        >
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <MelodiLogo />
          </div>

          {/* Tab switcher */}
          <div className="flex rounded-xl p-1 mb-7 bg-[#111120] border border-white/5">
            {(["login", "signup"]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTab(t);
                  setError("");
                }}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 relative cursor-pointer"
                style={{
                  color: tab === t ? "#ffffff" : "#6B6B8E",
                }}
              >
                {tab === t && (
                  <motion.div
                    layoutId="tab-pill"
                    className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 shadow-md shadow-purple-600/20"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">
                  {t === "login" ? "Sign In" : "Create Account"}
                </span>
              </button>
            ))}
          </div>

          {/* Heading */}
          <div className="mb-6 text-left">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                <h1 className="text-xl font-bold text-white mb-1">
                  {tab === "login" ? "Welcome Back" : "Join Melodia"}
                </h1>
                <p className="text-sm text-[#A9A9CC]">
                  {tab === "login"
                    ? "Sign in to continue your music journey"
                    : "Start listening to your favorite music"}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-red-900/30 text-red-200 border border-red-500/20 rounded-xl text-xs font-medium text-left">
              {error}
            </div>
          )}

          {/* Social login - Google */}
          <div className="mb-6">
            <button
              type="button"
              onClick={() => handleGoogleLogin()}
              disabled={loading}
              className="flex items-center justify-center gap-2.5 w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90 bg-[#1A1A2E] border border-white/5 text-[#EEF0FF] cursor-pointer disabled:opacity-50"
            >
              <GoogleLogo size={16} />
              Continue with Google
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-white/5" />
            <span className="text-xs text-[#6B6B8E]">or continue with email</span>
            <div className="flex-1 h-px bg-white/5" />
          </div>

          {/* Form */}
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, x: tab === "signup" ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: tab === "signup" ? -20 : 20 }}
              transition={{ duration: 0.22 }}
            >
              {tab === "login" ? (
                <form className="flex flex-col gap-5" onSubmit={handleLoginSubmit}>
                  <InputField
                    label="Email address"
                    type="email"
                    placeholder="you@example.com"
                    icon={Mail}
                    value={email}
                    onChange={setEmail}
                  />
                  <InputField
                    label="Password"
                    type={showPass ? "text" : "password"}
                    placeholder="Enter your password"
                    icon={Lock}
                    value={password}
                    onChange={setPassword}
                    toggle
                    onToggle={() => setShowPass(!showPass)}
                  />
                  <div className="flex justify-end">
                    <button type="button" className="text-xs transition-colors hover:text-white cursor-pointer text-[#8B5CF6] font-semibold">
                      Forgot password?
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98] mt-1 bg-gradient-to-r from-purple-600 to-indigo-600 shadow-lg shadow-purple-600/25 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? "Signing in..." : "Sign in to Melodia"}
                    <ArrowRight size={16} />
                  </button>
                </form>
              ) : (
                <form className="flex flex-col gap-4" onSubmit={handleSignupSubmit}>
                  <InputField
                    label="Full name"
                    type="text"
                    placeholder="Your name"
                    icon={User}
                    value={fullName}
                    onChange={setFullName}
                  />
                  <InputField
                    label="Email address"
                    type="email"
                    placeholder="you@example.com"
                    icon={Mail}
                    value={email}
                    onChange={setEmail}
                  />
                  <InputField
                    label="Password"
                    type={showPass ? "text" : "password"}
                    placeholder="Create a password"
                    icon={Lock}
                    value={password}
                    onChange={setPassword}
                    toggle
                    onToggle={() => setShowPass(!showPass)}
                  />
                  <label className="flex items-start gap-2.5 cursor-pointer mt-1 text-left">
                    <div
                      onClick={() => setAgreed(!agreed)}
                      className="w-4 h-4 mt-0.5 rounded flex items-center justify-center flex-shrink-0 transition-all duration-200 cursor-pointer"
                      style={{
                        background: agreed ? "#8B5CF6" : "transparent",
                        border: agreed ? "1px solid #8B5CF6" : "1px solid rgba(255,255,255,0.2)",
                      }}
                    >
                      {agreed && (
                        <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                          <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className="text-xs leading-relaxed text-[#8888a8]">
                      I agree to the{" "}
                      <span className="cursor-pointer hover:underline text-[#8B5CF6]">Terms of Service</span>
                      {" "}and{" "}
                      <span className="cursor-pointer hover:underline text-[#8B5CF6]">Privacy Policy</span>
                    </span>
                  </label>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98] mt-1 bg-gradient-to-r from-purple-600 to-indigo-600 shadow-lg shadow-purple-600/25 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? "Creating account..." : "Create your account"}
                    <ArrowRight size={16} />
                  </button>
                </form>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Footer switch */}
          <p className="text-center text-xs mt-6 text-[#6B6B8E]">
            {tab === "login" ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => {
                setTab(tab === "login" ? "signup" : "login");
                setError("");
              }}
              className="font-semibold transition-colors hover:underline text-[#8B5CF6] cursor-pointer"
            >
              {tab === "login" ? "Sign up free" : "Sign in"}
            </button>
          </p>
        </div>

        {/* Bottom tagline */}
        <p className="text-center mt-5 text-xs text-[#6B6B8E]/60">
          By continuing you agree to Melodia&apos;s Terms &amp; Privacy Policy
        </p>
      </div>
    </div>
  );
}
