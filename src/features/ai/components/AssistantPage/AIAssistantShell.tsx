import "./AIAssistantShell.scss";
import { useI18n } from "../../../../i18n/useI18n";

const AIAssistantShell = () => {
  const { t } = useI18n();
  return <main className="ai-shell" aria-label={t("ai.loading", "Qulay AI yuklanmoqda")}>
    <header className="ai-shell__header">
      <div className="ai-shell__brand"><span>✦</span><strong>Qulay AI</strong><small>{t("ai.workspace", "AI ish maydoni")}</small></div>
      <div className="ai-shell__header-actions"><i /><i /><i /></div>
    </header>
    <section className="ai-shell__messages" aria-hidden="true">
      <span className="ai-shell__bubble ai-shell__bubble--short" />
      <span className="ai-shell__bubble ai-shell__bubble--long" />
      <span className="ai-shell__bubble ai-shell__bubble--tiny" />
    </section>
    <div className="ai-shell__composer"><span>{t("ai.input.placeholder", "Xabar yozing...")}</span><b>↑</b></div>
  </main>
};

export default AIAssistantShell;
