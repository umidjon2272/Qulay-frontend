import { ArrowLeft, Mail } from "lucide-react";
import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { authApi, getApiErrorMessage } from "../../services/api";
import "./ForgotPassword.scss";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const submittedRef = useRef(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
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
    try {
      await authApi.forgotPassword(normalizedEmail);
      setLoading(false);
      setSuccess("Agar bu email ro‘yxatdan o‘tgan bo‘lsa, parolni tiklash ko‘rsatmasi yuboriladi.");
      submittedRef.current = false;
    } catch (reason) {
      setLoading(false);
      submittedRef.current = false;
      setError(getApiErrorMessage(reason));
    }
  };

  return (
    <main className="forgot-page">
      <section className="forgot-card" aria-labelledby="forgot-title">
        <div className="forgot-card__icon"><Mail size={20} /></div>
        <span className="forgot-card__eyebrow">ACCOUNT RECOVERY</span>
        <h1 id="forgot-title">Parolni tiklash</h1>
        <p>Email manzilingizni kiriting. Agar akkaunt mavjud bo'lsa, tiklash ko'rsatmasi yuboriladi.</p>

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
