import { Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { getApiErrorMessage } from "../../services/api";
import { AdminAccessDeniedError, signInAdmin } from "../../services/authService";
import { useAuth } from "../../hooks/useAuth";
import { useI18n } from "../../i18n/useI18n";
import "./AdminLogin.scss";

type AdminLoginLocationState = {
  accessDenied?: boolean;
  from?: string;
};

const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useI18n();
  const state = (location.state ?? {}) as AdminLoginLocationState;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(state.accessDenied ? t("adminLogin.accessDenied", "Admin huquqi mavjud emas.") : "");

  useEffect(() => {
    if (user?.role === "ADMIN") navigate("/admin", { replace: true });
  }, [navigate, user]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;

    const normalizedEmail = email.trim().toLowerCase();
    setError("");
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError(t("adminLogin.invalidEmail", "To'g'ri email manzilini kiriting."));
      return;
    }
    if (password.length < 8) {
      setError(t("adminLogin.passwordTooShort", "Parol kamida 8 ta belgidan iborat bo'lishi kerak."));
      return;
    }

    setLoading(true);
    try {
      await signInAdmin(normalizedEmail, password);
      navigate(state.from?.startsWith("/admin") ? state.from : "/admin", { replace: true });
    } catch (reason) {
      setLoading(false);
      setError(reason instanceof AdminAccessDeniedError ? reason.message : getApiErrorMessage(reason));
    }
  };

  return (
    <main className="admin-login">
      <div className="admin-login__orb admin-login__orb--one" />
      <div className="admin-login__orb admin-login__orb--two" />

      <section className="admin-login__showcase" aria-label="Qulay AI Admin">
        <div className="admin-login__brand"><span>Q</span><strong>Qulay AI</strong></div>
        <div className="admin-login__showcase-copy">
          <span className="admin-login__eyebrow">{t("adminLogin.eyebrow", "PRIVATE WORKSPACE")}</span>
          <h1>{t("adminLogin.headlinePrefix", "Platformani")}<br /><em>{t("adminLogin.headlineEmphasis", "aniqlik bilan")}</em> {t("adminLogin.headlineSuffix", "boshqaring.")}</h1>
          <p>{t("adminLogin.showcaseText", "Foydalanuvchilar, usage va tizim holatini bitta xavfsiz admin markazida kuzating.")}</p>
        </div>
        <div className="admin-login__signal"><span><ShieldCheck size={17} /></span><div><strong>{t("adminLogin.secureAccess", "Secure admin access")}</strong><small>{t("adminLogin.roleBased", "Role-based workspace protection")}</small></div><i /></div>
      </section>

      <section className="admin-login__panel" aria-labelledby="admin-login-title">
        <div className="admin-login__card">
          <div className="admin-login__icon"><LockKeyhole size={20} /></div>
          <span className="admin-login__eyebrow">{t("adminLogin.brandEyebrow", "QULAY AI ADMIN")}</span>
          <h2 id="admin-login-title">{t("adminLogin.welcome", "Xush kelibsiz")}</h2>
          <p className="admin-login__intro">{t("adminLogin.intro", "Admin panelga kirish uchun hisob ma'lumotlaringizni kiriting.")}</p>

          <form className="admin-login__form" onSubmit={submit}>
            <div className="admin-login__field">
              <label htmlFor="admin-email">{t("auth.email", "Email")}</label>
              <input id="admin-email" type="email" autoComplete="username" placeholder="admin@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </div>
            <div className="admin-login__field">
              <label htmlFor="admin-password">{t("auth.password", "Parol")}</label>
              <div className="admin-login__password">
                <input id="admin-password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="••••••••" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />
                <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? t("auth.hidePassword", "Parolni yashirish") : t("auth.showPassword", "Parolni ko'rsatish")}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </div>
            </div>
            {error && <p className="admin-login__error" role="alert">{error}</p>}
            <button className="admin-login__submit" type="submit" disabled={loading}>{loading && <span className="admin-login__spinner" aria-hidden="true" />}{loading ? t("auth.checking", "Tekshirilmoqda...") : t("auth.login", "Kirish")}</button>
          </form>

          <p className="admin-login__note"><ShieldCheck size={14} /> {t("adminLogin.note", "Faqat ADMIN huquqiga ega akkauntlar uchun")}</p>
          <button className="admin-login__back" type="button" onClick={() => navigate("/login")}>{t("adminLogin.backToLogin", "Oddiy login sahifasiga qaytish")}</button>
        </div>
      </section>
    </main>
  );
};

export default AdminLogin;
