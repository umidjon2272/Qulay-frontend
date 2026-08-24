import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { getSafeReturnPath } from "../../app/router/routeUtils";
import { signUp } from "../../services/authService";
import { getApiErrorMessage } from "../../services/api";
import { getSettings } from "../../services/settingsService";
import "./Register.scss";

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const returnPath = getSafeReturnPath(location.state);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const goToDefaultPage = () => {
    if (returnPath) {
      navigate(returnPath, { replace: true });
      return;
    }

    const page = getSettings().defaultPage;
    navigate(page === "AI yordamchi" ? "/ai-assistant" : page === "Vazifalar" ? "/tasks" : "/dashboard", { replace: true });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;
    setError("");
    setSuccess("");
    if (firstName.trim().length < 1 || lastName.trim().length < 1) { setError("Ism va familiyangizni kiriting."); return; }
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) { setError("To'g'ri email manzilini kiriting."); return; }
    if (password.length < 8) { setError("Parol kamida 8 ta belgidan iborat bo'lishi kerak."); return; }
    if (password !== confirm) { setError("Parollar mos kelmadi."); return; }

    setLoading(true);
    try {
      await signUp({ email: normalizedEmail, password, firstName: firstName.trim(), lastName: lastName.trim() });
      goToDefaultPage();
    } catch (reason) {
      setLoading(false);
      setError(getApiErrorMessage(reason));
    }
  };

  const signUpWithGoogle = () => {
    setError("Google OAuth hali ulanmagan.");
  };

  return (
    <main className="register">
      <div className="register__left">
        <div className="register__brand"><div className="register__logo">✦</div><span>QULAY AI</span></div>
        <div className="register__content">
          <span className="register__badge">AI Business Assistant</span>
          <h1>Biznesingizni<br /><span>AI bilan boshqaring.</span></h1>
          <p>Vazifalar, uchrashuvlar, hujjatlar va kundalik ishlaringizni bitta aqlli yordamchi orqali boshqaring.</p>
          <div className="register__features"><div><span>✓</span>AI bilan ovozli muloqot</div><div><span>✓</span>Vazifa va uchrashuvlarni boshqarish</div><div><span>✓</span>Telegram, Gmail va Calendar integratsiyasi</div></div>
        </div>
        <div className="register__footer">© 2026 QULAY AI</div>
      </div>
      <div className="register__right">
        <div className="register__form-wrapper">
          <div className="register__heading"><h2>Hisob yaratish 👋</h2><p>QULAY AI'dan foydalanishni boshlang.</p></div>
          <form className="register__form" onSubmit={submit}>
            <div className="register__field"><label htmlFor="register-first-name">Ism</label><input id="register-first-name" type="text" placeholder="Ismingizni kiriting" value={firstName} onChange={(event) => setFirstName(event.target.value)} required /></div>
            <div className="register__field"><label htmlFor="register-last-name">Familiya</label><input id="register-last-name" type="text" placeholder="Familiyangizni kiriting" value={lastName} onChange={(event) => setLastName(event.target.value)} required /></div>
            <div className="register__field"><label htmlFor="register-email">Email</label><input id="register-email" type="email" placeholder="example@gmail.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
            <div className="register__field"><label htmlFor="register-password">Parol</label><div className="auth-password"><input id="register-password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}>{showPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button></div></div>
            <div className="register__field"><label htmlFor="register-confirm">Parolni tasdiqlang</label><div className="auth-password"><input id="register-confirm" type={showConfirm ? "text" : "password"} placeholder="••••••••" value={confirm} onChange={(event) => setConfirm(event.target.value)} minLength={6} required /><button type="button" onClick={() => setShowConfirm((value) => !value)} aria-label={showConfirm ? "Tasdiqlash parolini yashirish" : "Tasdiqlash parolini ko'rsatish"}>{showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}</button></div></div>
            {error && <p className="auth-message auth-message--error">{error}</p>}
            {success && <p className="auth-message auth-message--success">{success}</p>}
            <button type="submit" className="register__submit" disabled={loading}>{loading ? "Yaratilmoqda..." : "Hisob yaratish"}</button>
          </form>
          <div className="register__divider"><span>yoki</span></div>
          <button type="button" className="register__google" onClick={signUpWithGoogle}><span>G</span>Google bilan ro'yxatdan o'tish</button>
          <p className="register__login">Allaqachon hisobingiz bormi?<button type="button" onClick={() => navigate("/login")}>Kirish</button></p>
        </div>
      </div>
    </main>
  );
};

export default Register;
