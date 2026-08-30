import { useEffect } from "react";
import { isRouteErrorResponse, useRouteError } from "react-router-dom";
import { useI18n } from "../../i18n/useI18n";
import "./AdminErrorBoundary.scss";

const AdminErrorBoundary = () => {
  const error = useRouteError();
  const { t } = useI18n();

  useEffect(() => {
    console.error("Admin console crashed:", error);
  }, [error]);

  const detail = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : String(error);

  return (
    <div className="admin-crash">
      <div className="admin-crash__card">
        <span className="admin-crash__eyebrow">QULAY AI ADMIN</span>
        <h1>{t("admin.error.title", "Nimadir noto'g'ri ketdi")}</h1>
        <p>{t("admin.error.description", "Admin sahifasini yuklab bo'lmadi.")}</p>
        <div className="admin-crash__actions">
          <button type="button" onClick={() => window.location.reload()}>{t("common.retry", "Qayta urinish")}</button>
          <a href="/admin">{t("admin.error.back", "Admin bosh sahifasiga qaytish")}</a>
        </div>
        {import.meta.env.DEV && <pre className="admin-crash__detail">{detail}</pre>}
      </div>
    </div>
  );
};

export default AdminErrorBoundary;
