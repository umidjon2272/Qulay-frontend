import { ArrowLeft, Eye, EyeOff, KeyRound } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

import { ApiError, authApi, getApiErrorMessage } from "../../services/api";
import { useI18n } from "../../i18n/useI18n";
import "./ResetPassword.scss";

const ResetPassword = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(token ? "" : t("auth.resetLinkMissing", "Reset havolasi topilmadi."));
  const [success, setSuccess] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading || !token) return;
    setError("");
    if (newPassword.length < 8 || newPassword.length > 72 || !/\S/.test(newPassword)) {
      setError(t("auth.resetPasswordLength", "Yangi parol 8–72 belgidan iborat bo'lishi kerak."));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("auth.passwordsMismatch2", "Parollar mos kelmaydi."));
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword({ token, newPassword, confirmPassword });
      setSuccess(true);
    } catch (reason) {
      setError(reason instanceof ApiError && reason.status === 400
        ? t("auth.resetLinkInvalid", "Reset havolasi yaroqsiz yoki muddati tugagan.")
        : getApiErrorMessage(reason, t("auth.resetLinkRetry", "Reset havolasini tekshirib qayta urinib ko'ring.")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="reset-page">
      <section className="reset-card" aria-labelledby="reset-title">
        <div className="reset-card__icon"><KeyRound size={20} /></div>
        <span className="reset-card__eyebrow">{t("auth.accountRecovery", "ACCOUNT RECOVERY")}</span>
        <h1 id="reset-title">{t("auth.setNewPassword", "Yangi parol o'rnating")}</h1>
        {success ? (
          <div className="reset-card__success">
            <p>{t("auth.resetSuccess", "Parol yangilandi. Endi yangi parol bilan kiring.")}</p>
            <button type="button" onClick={() => navigate("/login")}><ArrowLeft size={15} /> {t("auth.backToLoginShort", "Login'ga qaytish")}</button>
          </div>
        ) : (
          <>
            <p>{t("auth.resetSubtitle", "Yangi parolingizni kiriting. Havola 30 daqiqa amal qiladi.")}</p>
            <form onSubmit={submit} className="reset-card__form">
              <label htmlFor="reset-password">{t("auth.newPassword", "Yangi parol")}</label>
              <div className="reset-card__password">
                <input id="reset-password" type={showNewPassword ? "text" : "password"} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} maxLength={72} required />
                <button type="button" onClick={() => setShowNewPassword((value) => !value)} aria-label={showNewPassword ? t("auth.hidePassword", "Parolni yashirish") : t("auth.showPassword", "Parolni ko'rsatish")}>{showNewPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </div>
              <label htmlFor="reset-confirm-password">{t("auth.confirmPassword", "Parolni tasdiqlang")}</label>
              <div className="reset-card__password">
                <input id="reset-confirm-password" type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} maxLength={72} required />
                <button type="button" onClick={() => setShowConfirmPassword((value) => !value)} aria-label={showConfirmPassword ? t("auth.hidePassword", "Parolni yashirish") : t("auth.showPassword", "Parolni ko'rsatish")}>{showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </div>
              {error && <p className="reset-card__message reset-card__message--error">{error}</p>}
              <button type="submit" disabled={loading || !token}>{loading ? t("changePassword.updating", "Yangilanmoqda...") : t("changePassword.submit", "Parolni yangilash")}</button>
            </form>
            <button type="button" className="reset-card__back" onClick={() => navigate("/login")}><ArrowLeft size={15} /> {t("auth.backToLogin", "Login sahifasiga qaytish")}</button>
          </>
        )}
      </section>
    </main>
  );
};

export default ResetPassword;
