import { ArrowLeft, Mail } from "lucide-react";
import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import "./ForgotPassword.scss";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const submittedRef = useRef(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittedRef.current) return;

    const normalizedEmail = email.trim().toLowerCase();
    setError("");
    setSuccess("");

    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError("To'g'ri email manzilini kiriting.");
      return;
    }

    submittedRef.current = true;
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      setSuccess(`Demo tiklash havolasi ${normalizedEmail} manziliga yuborildi.`);
      submittedRef.current = false;
    }, 500);
  };

  return (
    <main className="forgot-page">
      <section className="forgot-card" aria-labelledby="forgot-title">
        <div className="forgot-card__icon"><Mail size={20} /></div>
        <span className="forgot-card__eyebrow">ACCOUNT RECOVERY</span>
        <h1 id="forgot-title">Parolni tiklash</h1>
        <p>Email manzilingizni kiriting. Frontend demo rejimida tiklash holati shu yerda ko'rsatiladi.</p>

        <form onSubmit={submit} className="forgot-card__form">
          <label htmlFor="forgot-email">Email</label>
          <input id="forgot-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="example@gmail.com" required />
          {error && <p className="forgot-card__message forgot-card__message--error">{error}</p>}
          {success && <p className="forgot-card__message forgot-card__message--success">{success}</p>}
          <button type="submit" disabled={loading}>{loading ? "Yuborilmoqda..." : "Tiklash havolasini yuborish"}</button>
        </form>

        <button type="button" className="forgot-card__back" onClick={() => navigate("/login")}>
          <ArrowLeft size={15} /> Login sahifasiga qaytish
        </button>
      </section>
    </main>
  );
};

export default ForgotPassword;
