import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { createMockSession } from "../../services/authService";
import { updateProfile } from "../../services/profileService";
import { getSettings } from "../../services/settingsService";
import "./Login.scss";

const Login = () => {
  const navigate = useNavigate();
  const goToDefaultPage = () => {
    const page = getSettings().defaultPage;
    navigate(page === "AI yordamchi" ? "/ai-assistant" : page === "Vazifalar" ? "/tasks" : "/dashboard");
  };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) { setError("To'g'ri email manzilini kiriting."); return; }
    if (password.length < 6) { setError("Parol kamida 6 ta belgidan iborat bo‘lishi kerak."); return; }
    setLoading(true);
    window.setTimeout(() => { createMockSession("Yechim foydalanuvchi", normalizedEmail, { remember }); updateProfile({ email: normalizedEmail }); setLoading(false); setSuccess(remember ? "Muvaffaqiyatli kirdingiz. Sessiya saqlandi." : "Muvaffaqiyatli kirdingiz."); window.setTimeout(goToDefaultPage, 450); }, 500);
  };

  return <main className="login"><div className="login__left"><div className="login__brand"><div className="login__logo">✦</div><span>YECHIM AI</span></div><div className="login__content"><span className="login__badge">AI Business Assistant</span><h1>Ishingizni<br /><span>AI'ga topshiring.</span></h1><p>Kunlik vazifalar, uchrashuvlar, hujjatlar va biznes ishlaringizni aqlli yordamchi bilan boshqaring.</p><div className="login__assistant"><div className="login__assistant-icon">✦</div><div><span>YECHIM AI</span><strong>Bugun sizga yordam berishga tayyor.</strong></div></div></div><div className="login__footer">© 2026 YECHIM AI</div></div><div className="login__right"><div className="login__form-wrapper"><div className="login__heading"><h2>Xush kelibsiz 👋</h2><p>Hisobingizga kirib, ishlaringizni davom ettiring.</p></div><form className="login__form" onSubmit={submit}><div className="login__field"><label htmlFor="login-email">Email</label><input id="login-email" type="email" placeholder="example@gmail.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></div><div className="login__field"><div className="login__label-row"><label htmlFor="login-password">Parol</label><button type="button" onClick={() => setSuccess("Parolni tiklash havolasi mock rejimda emailga yuborildi.")}>Parolni unutdingizmi?</button></div><div className="auth-password"><input id="login-password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Parolni yashirish" : "Parolni ko‘rsatish"}>{showPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button></div></div><label className="login__remember"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /><span>Meni eslab qol</span></label>{error && <p className="auth-message auth-message--error">{error}</p>}{success && <p className="auth-message auth-message--success">{success}</p>}<button type="submit" className="login__submit" disabled={loading}>{loading ? "Tekshirilmoqda..." : "Kirish"}</button></form><div className="login__divider"><span>yoki</span></div><button type="button" className="login__google" onClick={() => { createMockSession("Google foydalanuvchi", "google@yechim.ai"); navigate("/dashboard"); }}><span>G</span>Google bilan kirish</button><p className="login__register">Hisobingiz yo‘qmi?<button type="button" onClick={() => navigate("/register")}>Ro‘yxatdan o‘tish</button></p></div></div></main>;
};

export default Login;
