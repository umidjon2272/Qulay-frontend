import {
  Check,
  ArrowUpRight,
  X,
  ShieldCheck,
  ExternalLink,
  Unlink,
} from "lucide-react";

import { useEffect, useRef, useState } from "react";

import { useIntegrations } from "../../hooks/useIntegrations";

import "./IntegrationHub.scss";

type IntegrationHubProps = {
  limit?: number;
  columns?: number;
};

const IntegrationHub = ({ limit, columns = 5 }: IntegrationHubProps) => {
  const { integrations, connect, disconnect } = useIntegrations();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const connectTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (connectTimerRef.current !== null) window.clearTimeout(connectTimerRef.current);
  }, []);

  const visible = limit ? integrations.slice(0, limit) : integrations;
  const selected = integrations.find((item) => item.id === selectedId);

  const closeModal = () => {
    if (connectTimerRef.current !== null) {
      window.clearTimeout(connectTimerRef.current);
      connectTimerRef.current = null;
    }
    setConnectingId(null);
    setSelectedId(null);
    setUsername("");
  };

  return (
    <>
      <div
        className="integration-hub__grid"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {visible.map((item) => {
          const Icon = item.icon;

          return (
            <article
              key={item.id}
              className={`integration-card integration-card--${item.color}`}
            >
              <div className="integration-card__top">
                <div className="integration-card__icon">
                  <Icon size={20} />
                </div>

                {item.connected && (
                  <span className="integration-card__connected">
                    <Check size={10} />
                    Ulangan
                  </span>
                )}
              </div>

              <div className="integration-card__info">
                <h3>{item.name}</h3>

                <p>{item.description}</p>
              </div>

              <button
                type="button"
                className={`integration-card__button ${
                  item.connected
                    ? "integration-card__button--connected"
                    : ""
                }`}
                onClick={() => setSelectedId(item.id)}
              >
                {item.connected ? "Boshqarish" : connectingId === item.id ? "Ulanmoqda..." : "Ulash"}
                <ArrowUpRight size={13} />
              </button>
            </article>
          );
        })}
      </div>

      {selected && (
        <div className="integration-modal__overlay" onClick={closeModal}>
          <div
            className="integration-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="integration-modal__close"
              onClick={closeModal}
              aria-label="Integratsiya oynasini yopish"
            >
              <X size={17} />
            </button>

            {(() => {
              const Icon = selected.icon;

              return (
                <div
                  className={`integration-modal__icon integration-modal__icon--${selected.color}`}
                >
                  <Icon size={23} />
                </div>
              );
            })()}

            <h2>{selected.name}</h2>

            <p>
              {selected.connected
                ? `${selected.name} Yechim AI bilan ulangan.`
                : `${selected.name}ni Yechim AI bilan ulang.`}
            </p>

            {selected.connected ? (
              <>
                <div className="integration-modal__security">
                  <ShieldCheck size={17} />

                  <div>
                    <strong>Ulangan hisob</strong>
                    <span>{selected.username || "Faol ulanish"}</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="integration-modal__connect integration-modal__connect--danger"
                  onClick={() => {
                    disconnect(selected.id);
                    closeModal();
                  }}
                >
                  <Unlink size={15} />
                  Ulanishni uzish
                </button>
              </>
            ) : (
              <>
                <label className="integration-modal__label">Username</label>

                <input
                  type="text"
                  className="integration-modal__field"
                  placeholder="@username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />

                <button
                  type="button"
                  className="integration-modal__connect"
                  onClick={() => {
                    if (connectingId) return;
                    setConnectingId(selected.id);
                    connectTimerRef.current = window.setTimeout(() => {
                      connect(selected.id, username);
                      connectTimerRef.current = null;
                      setConnectingId(null);
                      closeModal();
                    }, 650);
                  }}
                  disabled={connectingId === selected.id}
                >
                  {connectingId === selected.id ? "Ulanmoqda..." : `${selected.name}ni ulash`}
                  <ExternalLink size={15} />
                </button>

                <span className="integration-modal__note">
                  OAuth ulanishi keyingi bosqichda qo‘shiladi.
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default IntegrationHub;
