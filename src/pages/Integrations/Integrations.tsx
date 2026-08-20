import { ArrowUpRight } from "lucide-react";

import { useNavigate } from "react-router-dom";

import IntegrationHub from "../../components/IntegrationHub/IntegrationHub";

import "./Integrations.scss";

const Integrations = () => {
  const navigate = useNavigate();

  return (
    <section className="integrations">
      <div className="integrations__header">
        <div>
          <span className="integrations__eyebrow">
            CONNECTIONS
          </span>

          <h2>Integratsiyalar</h2>

          <p>
            Yechim AI'ni kundalik xizmatlaringizga ulang.
          </p>
        </div>

        <button
          type="button"
          className="integrations__all"
          onClick={() => navigate("/settings?tab=integrations")}
        >
          Barchasini ko‘rish
          <ArrowUpRight size={14} />
        </button>
      </div>

      <IntegrationHub limit={5} columns={5} />
    </section>
  );
};

export default Integrations;
