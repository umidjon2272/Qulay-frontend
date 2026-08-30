import { useEffect, useState } from "react";
import { AlertTriangle, ArrowUpRight, Sunrise } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAIChat } from "../../../../features/ai/hooks/useAIChat";
import { briefingApi, type MorningBriefing } from "../../../../services/api/briefingApi";
import { useI18n } from "../../../../i18n/useI18n";

import "./BriefingCard.scss";

const BriefingCard = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { open: openAIChat, sendMessage } = useAIChat();
  const [briefing, setBriefing] = useState<MorningBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    briefingApi.morning().then((result) => { if (active) setBriefing(result); }).catch(() => { if (active) setFailed(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const askForMore = () => {
    openAIChat();
    sendMessage(t("briefing.askPrompt", "Bugungi rejamni ayt"));
  };

  if (loading) {
    return (
      <section className="briefing-card briefing-card--loading">
        <span className="briefing-card__icon"><Sunrise size={18} /></span>
        <span>{t("common.loading", "Yuklanmoqda...")}</span>
      </section>
    );
  }

  if (failed || !briefing) return null;

  const hasContent = briefing.overdueTasks.length || briefing.todayMeetings.length || briefing.todayTasks.length
    || briefing.todayReminders.length || briefing.priorities.length || briefing.weekFinance.length;
  if (!hasContent) return null;

  return (
    <section className="briefing-card">
      <header className="briefing-card__header">
        <span className="briefing-card__icon"><Sunrise size={18} /></span>
        <div>
          <h2>{t("briefing.title", "Bugungi briefing")}</h2>
          <p>{briefing.narrative}</p>
        </div>
        <button type="button" className="briefing-card__link" onClick={askForMore}>
          {t("common.more", "Batafsil")} <ArrowUpRight size={14} />
        </button>
      </header>

      {briefing.priorities.length > 0 && (
        <ul className="briefing-card__priorities">
          {briefing.priorities.map((priority, index) => (
            <li key={`${priority.label}-${index}`}><strong>{priority.label}:</strong> {priority.detail}</li>
          ))}
        </ul>
      )}

      {briefing.integrationIssues.length > 0 && (
        <button type="button" className="briefing-card__issue" onClick={() => navigate("/integrations")}>
          <AlertTriangle size={14} />
          {t("briefing.integrationIssue", "Integratsiyada e'tibor talab qilinadi")}
        </button>
      )}
    </section>
  );
};

export default BriefingCard;
