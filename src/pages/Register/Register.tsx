import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { createMockSession } from "../../services/authService";
import { updateProfile } from "../../services/profileService";
import { getSafeReturnPath } from "../../app/router/routeUtils";
import { getSettings } from "../../services/settingsService";
import "./Register.scss";

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const returnPath = getSafeReturnPath(location.state);
  const goToDefaultPage = () => {
    if (returnPath) {
      navigate(returnPath, { replace: true });
      return;
    }

    const page = getSettings().defaultPage;
    navigate(page === "AI yordamchi" ? "/ai-assistant" : page === "Vazifalar" ? "/tasks" : "/dashboard", { replace: true });
  };
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (name.trim().length < 2) { setError("Ismingizni kiriting."); return; }
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) { setError("To'g'ri email manzilini kiriting."); return; }
    if (password.length < 6) { setError("Parol kamida 6 ta belgidan iborat bo‘lishi kerak."); return; }
    if (password !== confirm) { setError("Parollar mos kelmadi."); return; }
    setLoading(true);
    window.setTimeout(() => { updateProfile({ name: name.trim(), email: normalizedEmail }); createMockSession(name.trim(), normalizedEmail); setLoading(false); setSuccess("Hisob yaratildi. Yuborilmoqda..."); window.setTimeout(goToDefaultPage, 450); }, 550);
  };

  return <main className="register"><div className="register__left"><div className="register__brand"><div className="register__logo">✦</div><span>YECHIM AI</span></div><div className="register__content"><span className="register__badge">AI Business Assistant</span><h1>Biznesingizni<br /><span>AI bilan boshqaring.</span></h1><p>Vazifalar, uchrashuvlar, hujjatlar va kundalik ishlaringizni bitta aqlli yordamchi orqali boshqaring.</p><div className="register__features"><div><span>✓</span>AI bilan ovozli muloqot</div><div><span>✓</span>Vazifa va uchrashuvlarni boshqarish</div><div><span>✓</span>Telegram, Gmail va Calendar integratsiyasi</div></div></div><div className="register__footer">© 2026 YECHIM AI</div></div><div className="register__right"><div className="register__form-wrapper"><div className="register__heading"><h2>Hisob yaratish 👋</h2><p>YECHIM AI'dan foydalanishni boshlang.</p></div><form className="register__form" onSubmit={submit}><div className="register__field"><label htmlFor="register-name">Ismingiz</label><input id="register-name" type="text" placeholder="Ismingizni kiriting" value={name} onChange={(event) => setName(event.target.value)} required /></div><div className="register__field"><label htmlFor="register-email">Email</label><input id="register-email" type="email" placeholder="example@gmail.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></div><div className="register__field"><label htmlFor="register-password">Parol</label><div className="auth-password"><input id="register-password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Parolni ko‘rsatish">{showPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button></div></div><div className="register__field"><label htmlFor="register-confirm">Parolni tasdiqlang</label><div className="auth-password"><input id="register-confirm" type={showConfirm ? "text" : "password"} placeholder="••••••••" value={confirm} onChange={(event) => setConfirm(event.target.value)} minLength={6} required /><button type="button" onClick={() => setShowConfirm((value) => !value)} aria-label="Tasdiqlash parolini ko‘rsatish">{showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}</button></div></div>{error && <p className="auth-message auth-message--error">{error}</p>}{success && <p className="auth-message auth-message--success">{success}</p>}<button type="submit" className="register__submit" disabled={loading}>{loading ? "Yaratilmoqda..." : "Hisob yaratish"}</button></form><div className="register__divider"><span>yoki</span></div><button type="button" className="register__google" onClick={() => { createMockSession("Google foydalanuvchi", "google@yechim.ai"); goToDefaultPage(); }}><span>G</span>Google bilan ro‘yxatdan o‘tish</button><p className="register__login">Allaqachon hisobingiz bormi?<button type="button" onClick={() => navigate("/login")}>Kirish</button></p></div></div></main>;
};

export default Register;
