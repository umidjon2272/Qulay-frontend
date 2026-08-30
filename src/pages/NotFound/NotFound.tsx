import { ArrowLeft, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/useI18n";

import "./NotFound.scss";

const NotFound = () => {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <main className="not-found">
      <section className="not-found__card">
        <span>404</span>
        <h1>{t("notFound.title", "Sahifa topilmadi")}</h1>
        <p>{t("notFound.subtitle", "Bu manzil mavjud emas yoki ko'chirilgan.")}</p>
        <div className="not-found__actions">
          <button type="button" onClick={() => navigate(-1)}><ArrowLeft size={15} />{t("common.back", "Orqaga")}</button>
          <button type="button" onClick={() => navigate("/dashboard")}><Home size={15} />{t("nav.home", "Bosh sahifa")}</button>
        </div>
      </section>
    </main>
  );
};

export default NotFound;
