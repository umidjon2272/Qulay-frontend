import { useEffect, useState } from "react";
import { AlertTriangle, Bell, Clock, Info, X } from "lucide-react";
import { proactiveApi, type ProactiveSuggestion } from "../../services/api/proactiveApi";
import { useI18n } from "../../i18n/useI18n";

import "./ProactiveSuggestions.scss";

const POLL_INTERVAL_MS = 3 * 60_000;
const MAX_VISIBLE = 3;

const SEVERITY_ICON = { INFO: Info, WARNING: AlertTriangle, CRITICAL: AlertTriangle } as const;

const ProactiveSuggestions = () => {
  const { t } = useI18n();
  const [items, setItems] = useState<ProactiveSuggestion[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = () => {
      proactiveApi.list("ACTIVE").then((result) => { if (active) setItems(result); }).catch(() => undefined);
    };
    load();
    const timer = window.setInterval(load, POLL_INTERVAL_MS);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const dismiss = async (id: string) => {
    setBusyId(id);
    try { await proactiveApi.dismiss(id); setItems((current) => current.filter((item) => item.id !== id)); }
    catch { /* leave the card visible so the user can retry */ }
    finally { setBusyId(null); }
  };

  const snooze = async (id: string) => {
    setBusyId(id);
    try { await proactiveApi.snooze(id); setItems((current) => current.filter((item) => item.id !== id)); }
    catch { /* leave the card visible so the user can retry */ }
    finally { setBusyId(null); }
  };

  const visible = items.slice(0, MAX_VISIBLE);
  if (!visible.length) return null;

  return (
    <div className="proactive-suggestions" role="region" aria-label={t("proactive.title", "AI tavsiyalari")}>
      {visible.map((item) => {
        const Icon = SEVERITY_ICON[item.severity];
        const expanded = expandedId === item.id;
        return (
          <div className={`proactive-suggestion proactive-suggestion--${item.severity.toLowerCase()}`} key={item.id}>
            <span className="proactive-suggestion__icon"><Icon size={15} /></span>
            <div className="proactive-suggestion__body">
              <strong>{item.title}</strong>
              <p>{item.body}</p>
              <button type="button" className="proactive-suggestion__why" onClick={() => setExpandedId(expanded ? null : item.id)}>
                {t("proactive.why", "Nega bu tavsiya qilindi?")}
              </button>
              {expanded && <p className="proactive-suggestion__reason"><Bell size={11} /> {item.reason}</p>}
              <div className="proactive-suggestion__actions">
                <button type="button" disabled={busyId === item.id} onClick={() => void snooze(item.id)}><Clock size={12} /> {t("proactive.snooze", "Keyinroq")}</button>
                <button type="button" disabled={busyId === item.id} onClick={() => void dismiss(item.id)}>{t("proactive.dismiss", "Yopish")}</button>
              </div>
            </div>
            <button type="button" className="proactive-suggestion__close" onClick={() => void dismiss(item.id)} aria-label={t("proactive.dismiss", "Yopish")} disabled={busyId === item.id}>
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ProactiveSuggestions;
