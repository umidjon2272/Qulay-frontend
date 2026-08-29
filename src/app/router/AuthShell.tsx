import { useAuth } from "../../hooks/useAuth";
import { usePlatform } from "../../context/PlatformContext";

import "./AuthShell.scss";

export const AuthBootstrapShell = () => {
  const { name: platformName } = usePlatform();
  return (
    <div className="auth-shell" role="status" aria-label={`${platformName} yuklanmoqda`}>
      <div className="auth-shell__brand"><span>Q</span><strong>{platformName}</strong></div>
      <span className="auth-shell__spinner" aria-hidden="true" />
    </div>
  );
};

export const AuthRecoveryShell = () => {
  const { authError, refresh, logout } = useAuth();
  const { name: platformName } = usePlatform();

  return (
    <div className="auth-recovery" role="alert">
      <div className="auth-recovery__card">
        <div className="auth-shell__brand"><span>Q</span><strong>{platformName}</strong></div>
        <p>{authError ?? "Serverga ulanib bo'lmadi."}</p>
        <div className="auth-recovery__actions">
          <button type="button" onClick={() => void refresh()}>Qayta urinish</button>
          <button type="button" className="auth-recovery__secondary" onClick={() => void logout()}>Chiqish</button>
        </div>
      </div>
    </div>
  );
};
