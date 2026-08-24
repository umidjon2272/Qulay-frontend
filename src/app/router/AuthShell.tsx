import { useAuth } from "../../hooks/useAuth";

import "./AuthShell.scss";

export const AuthBootstrapShell = () => (
  <div className="auth-shell" role="status" aria-label="Qulay AI yuklanmoqda">
    <div className="auth-shell__brand"><span>Q</span><strong>Qulay AI</strong></div>
    <span className="auth-shell__spinner" aria-hidden="true" />
  </div>
);

export const AuthRecoveryShell = () => {
  const { authError, refresh, logout } = useAuth();

  return (
    <div className="auth-recovery" role="alert">
      <div className="auth-recovery__card">
        <div className="auth-shell__brand"><span>Q</span><strong>Qulay AI</strong></div>
        <p>{authError ?? "Serverga ulanib bo'lmadi."}</p>
        <div className="auth-recovery__actions">
          <button type="button" onClick={() => void refresh()}>Qayta urinish</button>
          <button type="button" className="auth-recovery__secondary" onClick={() => void logout()}>Chiqish</button>
        </div>
      </div>
    </div>
  );
};
