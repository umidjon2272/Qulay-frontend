import { Eye, EyeOff, KeyRound, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { getApiErrorMessage } from "../../services/api/apiClient";
import { changePassword } from "../../services/authService";
import { useI18n } from "../../i18n/useI18n";

import "./ChangePasswordModal.scss";

type ChangePasswordModalProps = {
  onCancel: () => void;
  onSuccess: () => Promise<void> | void;
};

type PasswordField = "currentPassword" | "newPassword" | "confirmPassword";

const ChangePasswordModal = ({ onCancel, onSuccess }: ChangePasswordModalProps) => {
  const { t } = useI18n();
  const fieldLabels: Record<PasswordField, string> = {
    currentPassword: t("changePassword.current", "Joriy parol"),
    newPassword: t("changePassword.new", "Yangi parol"),
    confirmPassword: t("changePassword.confirm", "Yangi parolni takrorlang"),
  };
  const [values, setValues] = useState<Record<PasswordField, string>>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [visible, setVisible] = useState<Record<PasswordField, boolean>>({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [busy, onCancel]);

  const updateValue = (field: PasswordField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setError(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    if (!values.currentPassword.trim() || !values.newPassword.trim() || !values.confirmPassword.trim()) {
      setError(t("changePassword.fillAll", "Barcha maydonlarni to'ldiring."));
      return;
    }
    if (values.newPassword.length < 8) {
      setError(t("changePassword.tooShort", "Yangi parol kamida 8 ta belgidan iborat bo'lsin"));
      return;
    }
    if (values.newPassword !== values.confirmPassword) {
      setError(t("changePassword.mismatch", "Yangi parollar mos emas"));
      return;
    }

    setBusy(true);
    try {
      const response = await changePassword(values);
      if (response.requiresRelogin) await onSuccess();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="change-password__overlay" onClick={busy ? undefined : onCancel}>
      <section className="change-password" role="dialog" aria-modal="true" aria-labelledby="change-password-title" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="change-password__close" onClick={onCancel} aria-label={t("common.close", "Yopish")} disabled={busy}>
          <X size={17} />
        </button>
        <div className="change-password__icon"><KeyRound size={20} /></div>
        <h2 id="change-password-title">{t("changePassword.title", "Parolni o'zgartirish")}</h2>
        <p>{t("changePassword.subtitle", "Hisobingiz xavfsizligi uchun yangi parol kiriting.")}</p>

        <form onSubmit={submit}>
          {(Object.keys(fieldLabels) as PasswordField[]).map((field) => (
            <label key={field} className="change-password__field">
              <span>{fieldLabels[field]}</span>
              <span className="change-password__input-wrap">
                <input
                  type={visible[field] ? "text" : "password"}
                  value={values[field]}
                  onChange={(event) => updateValue(field, event.target.value)}
                  autoComplete={field === "currentPassword" ? "current-password" : "new-password"}
                  maxLength={72}
                  disabled={busy}
                  required
                />
                <button type="button" onClick={() => setVisible((current) => ({ ...current, [field]: !current[field] }))} aria-label={visible[field] ? `${fieldLabels[field]}ni yashirish` : `${fieldLabels[field]}ni ko'rsatish`} disabled={busy}>
                  {visible[field] ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </label>
          ))}

          {error && <p className="change-password__error" role="alert">{error}</p>}
          <div className="change-password__actions">
            <button type="button" className="change-password__cancel" onClick={onCancel} disabled={busy}>{t("common.cancel", "Bekor qilish")}</button>
            <button type="submit" className="change-password__submit" disabled={busy}>{busy ? t("changePassword.updating", "Yangilanmoqda...") : t("changePassword.submit", "Parolni yangilash")}</button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default ChangePasswordModal;
