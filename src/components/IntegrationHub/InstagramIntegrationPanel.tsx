import { ExternalLink, RefreshCw, Unlink } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useI18n } from "../../i18n/useI18n";
import {
  connectInstagram,
  disconnectInstagram,
  getInstagramConnectUrl,
  getInstagramStatus,
  testInstagram,
  updateInstagramSalesAgentSettings,
  type InstagramStatus,
} from "../../services/integrationService";

type Props = {
  salesAllowed: boolean;
  onConnectionChange: (status: InstagramStatus) => void;
  onDisconnected: () => void;
  onUpgrade: () => void;
};

const errorMessage = (_error: unknown, fallback: string) => fallback;

export const InstagramIntegrationPanel = ({ salesAllowed, onConnectionChange, onDisconnected, onUpgrade }: Props) => {
  const { t } = useI18n();
  const [status, setStatus] = useState<InstagramStatus | null>(null);
  const [instagramUserId, setInstagramUserId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connected = status?.connected === true;

  const loadStatus = useCallback(async (nextStatus?: InstagramStatus) => {
    const current = nextStatus ?? await getInstagramStatus();
    setStatus(current);
    onConnectionChange(current);
    return current;
  }, [onConnectionChange]);

  useEffect(() => {
    let active = true;
    void getInstagramStatus().then((current) => {
      if (!active) return;
      setStatus(current);
      onConnectionChange(current);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [onConnectionChange]);

  const submitConnect = async () => {
    if (busy || !instagramUserId.trim() || !accessToken.trim()) return;
    setBusy(true); setError(null);
    try {
      const next = await connectInstagram({ instagramUserId: instagramUserId.trim(), accessToken: accessToken.trim() });
      setAccessToken("");
      await loadStatus(next);
    } catch (err) {
      setError(errorMessage(err, t("integrations.instagram.connectError", "Instagramni ulab bo‘lmadi.")));
    } finally { setBusy(false); }
  };

  const updateSetting = async (patch: Partial<Pick<InstagramStatus, "enabled" | "dmEnabled" | "commentsEnabled" | "imageVisionEnabled">>) => {
    if (busy || !status) return;
    setBusy(true); setError(null);
    try {
      const next = await updateInstagramSalesAgentSettings(patch);
      setStatus(next); onConnectionChange(next);
    } catch (err) { setError(errorMessage(err, t("integrations.instagram.settingsSaveError", "Instagram AI sozlamasini saqlab bo‘lmadi."))); }
    finally { setBusy(false); }
  };

  const testConnection = async () => {
    if (busy) return;
    setBusy(true); setError(null);
    try { await loadStatus(await testInstagram()); }
    catch (err) { setError(errorMessage(err, t("integrations.instagram.testError", "Instagram ulanishini tekshirib bo‘lmadi."))); }
    finally { setBusy(false); }
  };

  const doDisconnect = async () => {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      await disconnectInstagram();
      const next = await getInstagramStatus();
      setStatus(next); onDisconnected(); onConnectionChange(next);
    } catch (err) { setError(errorMessage(err, t("integrations.instagram.disconnectError", "Instagram ulanishini uzib bo‘lmadi."))); }
    finally { setBusy(false); }
  };

  if (!status) return <span className="integration-modal__note">{t("integrations.instagram.statusChecking", "Instagram holati tekshirilmoqda...")}</span>;

  if (!connected) return <div className="instagram-integration-panel">
    {status.configured === false && <span className="integration-modal__error">{t("integrations.instagram.notConfigured", "Instagram server sozlamalari hali tayyor emas. Administrator Meta/Render sozlamalarini yakunlashi kerak.")}</span>}
    {salesAllowed ? <>
      <button
        type="button"
        className="integration-modal__connect"
        disabled={busy || !status.oauthReady}
        onClick={() => {
          if (busy) return;
          setBusy(true); setError(null);
          void getInstagramConnectUrl()
            .then(({ url }) => { window.location.assign(url); })
            .catch((err) => { setError(errorMessage(err, t("integrations.instagram.loginOpenError", "Instagram login oynasini ochib bo‘lmadi."))); setBusy(false); });
        }}
      >{busy ? t("integrations.instagram.opening", "Instagram oynasi ochilmoqda...") : t("integrations.instagram.connect", "Instagram bilan ulash")}<ExternalLink size={15} /></button>
      <span className="integration-modal__note">{t("integrations.instagram.oauthHint", "Instagram Professional akkauntingizga kirasiz va ruxsat berasiz. User ID yoki tokenni qo‘lda kiritish shart emas.")}</span>
      {!status.oauthReady && <span className="integration-modal__error">{t("integrations.instagram.oauthNotReady", "Instagram tez ulash hali administrator tomonidan sozlanmagan.")}</span>}
    </> : <button type="button" className="integration-modal__connect" onClick={onUpgrade}>{t("integrations.viewPlan", "Tarifni ko‘rish")}</button>}

    {salesAllowed && <>
      <button type="button" className="integration-modal__resend" onClick={() => setManualOpen((value) => !value)}>{manualOpen ? t("integrations.manualConnectClose", "Qo‘lda ulashni yopish") : t("integrations.manualConnectAdvanced", "Qo‘lda ulash / Advanced")}</button>
      {manualOpen && <div className="integration-modal__advanced integration-modal__advanced--manual">
        <div className="integration-modal__manual-head"><strong>{t("integrations.manualConnect", "Qo‘lda ulash")}</strong><span>{t("integrations.fallbackMethod", "Zaxira usul")}</span></div>
        <label className="integration-modal__label">{t("integrations.instagram.userId", "Instagram User ID")}</label>
        <input className="integration-modal__field" inputMode="numeric" placeholder="1784..." value={instagramUserId} onChange={(event) => setInstagramUserId(event.target.value.replace(/\D/g, ""))} />
        <label className="integration-modal__label">{t("integrations.accessToken", "Kirish tokeni")}</label>
        <input className="integration-modal__field" type="password" placeholder={t("integrations.meta.accessTokenPlaceholder", "Meta kirish tokeni")} autoComplete="off" value={accessToken} onChange={(event) => setAccessToken(event.target.value)} />
        <button type="button" className="integration-modal__connect" disabled={busy || status.configured === false || !instagramUserId || !accessToken} onClick={() => void submitConnect()}>{busy ? t("integrations.checking", "Tekshirilmoqda...") : t("integrations.manualConnect", "Qo‘lda ulash")}<ExternalLink size={15} /></button>
        <span className="integration-modal__note">{t("integrations.instagram.manualHint", "Bu usul faqat tez ulash ishlamasa kerak bo‘ladi. Token backendda shifrlangan holda saqlanadi.")}</span>
      </div>}
    </>}
    {error && <span className="integration-modal__error">{error}</span>}
  </div>;

  return <div className="instagram-integration-panel">
    <div className="integration-modal__sales-agent">
      <div className="integration-modal__sales-agent-head">
        <div><strong>{t("integrations.instagram.salesAgent", "Instagram AI sotuv agenti")}</strong><span>{t("integrations.instagram.salesDescription", "DM, izoh va rasmli savollar bitta Sales Brain orqali ishlaydi.")}</span></div>
        {salesAllowed ? <button type="button" role="switch" aria-checked={status.enabled} className={`integration-modal__switch ${status.enabled ? "is-on" : ""}`} disabled={busy} onClick={() => void updateSetting({ enabled: !status.enabled })}><span /></button> : null}
      </div>
      {!salesAllowed ? <button type="button" className="integration-modal__connect" onClick={onUpgrade}>{t("integrations.viewSalesPlan", "Sales AI tarifini ko‘rish")}</button> : <>
        <div className="integration-modal__sales-options">
          <label><input type="checkbox" checked={status.dmEnabled} disabled={busy || !status.enabled} onChange={(event) => void updateSetting({ dmEnabled: event.target.checked })} /><span><strong>{t("integrations.instagram.direct", "Instagram Direct")}</strong><small>{t("integrations.instagram.directHint", "Mijoz DM yozsa AI sotuvni davom ettiradi.")}</small></span></label>
          <label><input type="checkbox" checked={status.commentsEnabled} disabled={busy || !status.enabled} onChange={(event) => void updateSetting({ commentsEnabled: event.target.checked })} /><span><strong>{t("integrations.instagram.comments", "Commentlar")}</strong><small>{t("integrations.instagram.commentsHint", "Izohlarga javob va izohdan DM’ga avtomatlashtirish ishlaydi.")}</small></span></label>
          <label><input type="checkbox" checked={status.imageVisionEnabled} disabled={busy || !status.enabled} onChange={(event) => void updateSetting({ imageVisionEnabled: event.target.checked })} /><span><strong>{t("integrations.instagram.imageUnderstanding", "Rasmni tushunish")}</strong><small>{t("integrations.instagram.imageHint", "Rasmni tushunadi, keyin real katalog yoki owner ma’lumotlari bilan tekshiradi.")}</small></span></label>
        </div>
        <div className="integration-modal__sales-status"><span className={status.enabled ? "is-active" : ""} />{status.enabled ? t("integrations.agent.active", "Agent faol") : t("integrations.agent.disabled", "Agent o‘chiq")}</div>
      </>}
      <div className="integration-modal__health"><small>@{status.username ?? status.instagramUserId ?? "Instagram"}</small><small>{t("integrations.webhook.label", "Webhook")}: {status.webhookSubscribed ? t("integrations.webhook.connected", "ulangan") : t("integrations.webhook.checkRequired", "Meta panelda tekshirish kerak")}</small></div>
      <span className="integration-modal__note">{t("integrations.instagram.automationHint", "Post avtomatlashtirishlarini AI Chat’da oddiy yozib boshqaring: “Oxirgi postimga prompt yozganlarga direct yubor”, “shu avtomatlashtirishni to‘xtat” va hokazo.")}</span>
      <button type="button" className="integration-modal__connect" disabled={busy} onClick={() => void testConnection()}><RefreshCw size={15} /> {busy ? t("integrations.checking", "Tekshirilmoqda...") : t("integrations.testConnection", "Ulanishni tekshirish")}</button>
    </div>

    {error && <span className="integration-modal__error">{error}</span>}
    <button type="button" className="integration-modal__connect integration-modal__connect--danger" disabled={busy} onClick={() => void doDisconnect()}><Unlink size={15} /> {busy ? t("integrations.disconnecting", "Uzilmoqda...") : t("integrations.disconnectAction", "Ulanishni uzish")}</button>
  </div>;
};
