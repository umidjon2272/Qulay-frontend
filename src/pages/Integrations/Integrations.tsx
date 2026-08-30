import { ArrowUpRight } from "lucide-react";

import { useNavigate } from "react-router-dom";

import IntegrationHub from "../../components/IntegrationHub/IntegrationHub";
import { useI18n } from "../../i18n/useI18n";

import "./Integrations.scss";

const Integrations = ({ dashboard = false }: { dashboard?: boolean }) => {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <section className="integrations">
      <div className="integrations__header">
        <div>
          <span className="integrations__eyebrow">
            {t("integrationsPage.eyebrow", "CONNECTIONS")}
          </span>

          <h2>{t("settings.integrations", "Integratsiyalar")}</h2>

          <p>
            {t("integrationsPage.subtitle", "Qulay AI'ni kundalik xizmatlaringizga ulang.")}
          </p>
        </div>

        <button
          type="button"
          className="integrations__all"
          onClick={() => navigate("/settings?tab=integrations")}
        >
          {t("integrationsPage.viewAll", "Barchasini ko‘rish")}
          <ArrowUpRight size={14} />
        </button>
      </div>

      <IntegrationHub limit={5} columns={5} navigateOnSelect={dashboard} />
    </section>
  );
};

export default Integrations;
