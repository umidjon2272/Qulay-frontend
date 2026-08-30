import { useAuth } from "../../hooks/useAuth";
import { usePlatform } from "../../context/PlatformContext";
import { useI18n } from "../../i18n/useI18n";

import "./AuthShell.scss";

export const AuthBootstrapShell = () => {
  const { name: platformName } = usePlatform();
  const { t } = useI18n();
  return (
    <div className="auth-shell" role="status" aria-label={t("auth.platformLoading", "{{platform}} yuklanmoqda", { platform: platformName })}>
      <div className="auth-shell__brand"><span>Q</span><strong>{platformName}</strong></div>
      <span className="auth-shell__spinner" aria-hidden="true" />
    </div>
  );
};

export const AuthRecoveryShell = () => {
  const { authError, refresh, logout } = useAuth();
  const { name: platformName } = usePlatform();
  const { t } = useI18n();

  return (
    <div className="auth-recovery" role="alert">
      <div className="auth-recovery__card">
        <div className="auth-shell__brand"><span>Q</span><strong>{platformName}</strong></div>
        <p>{authError ?? t("auth.serverUnavailable", "Serverga ulanib bo'lmadi.")}</p>
        <div className="auth-recovery__actions">
          <button type="button" onClick={() => void refresh()}>{t("common.retry", "Qayta urinish")}</button>
          <button type="button" className="auth-recovery__secondary" onClick={() => void logout()}>{t("nav.logout", "Chiqish")}</button>
        </div>
      </div>
    </div>
  );
};
