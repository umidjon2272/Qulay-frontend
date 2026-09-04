import { ArrowUpRight, Check, ExternalLink, RefreshCw, ShieldCheck, Unlink, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import QRCode from "qrcode";

import { useIntegrations } from "../../hooks/useIntegrations";
import { ApiError } from "../../services/api/apiClient";
import { integrationsHealthApi, type IntegrationsHealth, type IntegrationHealth } from "../../services/api/integrationsHealthApi";
import {
  connectTelegram,
  disconnectTelegram,
  getTelegramStatus,
  disconnectGoogle,
  getGoogleConnectUrl,
  getGoogleStatus,
  resendTelegramCode,
  restartTelegramCode,
  startTelegramQrLogin,
  getTelegramQrStatus,
  verifyTelegramCode,
  verifyTelegramPassword,
  type TelegramDeliveryType,
} from "../../services/integrationService";

import { useI18n } from "../../i18n/useI18n";
import { useToast } from "../../hooks/useToast";

import "./IntegrationHub.scss";

type IntegrationHubProps = { limit?: number; columns?: number; navigateOnSelect?: boolean };
type TelegramStep = "phone" | "code" | "password";
type TelegramLoginMethod = "phone" | "qr";

const errorMessage = (error: unknown, fallback = "Integratsiya bilan ulanishda xatolik yuz berdi.") => error instanceof ApiError ? error.message : fallback;

const HEALTH_LABELS: Record<IntegrationHealth["state"], string> = {
  CONNECTED: "Ulangan",
  TEMPORARY_ISSUE: "Vaqtincha muammo",
  RECONNECT_REQUIRED: "Qayta ruxsat kerak",
  DISCONNECTED: "Uzilgan",
};

const healthForItem = (health: IntegrationsHealth | null, id: string): IntegrationHealth | null => {
  if (!health) return null;
  if (id === "google-calendar" || id === "google-drive") return health.google;
  if (id === "telegram") return health.telegram;
  return null;
};

const telegramDeliveryMessage = (delivery: TelegramDeliveryType | null, ru = false): string => {
  const messages: Record<string, [string, string]> = {
    telegram_app: ['Kod shu raqam bilan kirilgan Telegram ilovasidagi “Telegram” xizmat chatiga yuborildi. Telefon yoki kompyuteringizdagi Telegramni tekshiring.', 'Код отправлен в служебный чат «Telegram» в приложении, где выполнен вход с этим номером. Проверьте телефон или компьютер.'],
    email: ['Kod Telegramga bog‘langan emailingizga yuborildi. Spam papkasini ham tekshiring.', 'Код отправлен на привязанную почту. Проверьте также папку «Спам».'],
    email_setup: ['Telegram avval kirish emailini sozlashni talab qildi. QR orqali ulaning yoki rasmiy Telegram ilovasida emailni sozlang.', 'Telegram требует настроить почту для входа. Используйте QR или настройте почту в официальном приложении.'],
    sms: ['Kod SMS orqali yuborildi.', 'Код отправлен по SMS.'],
    call: ['Kod telefon qo‘ng‘irog‘i orqali beriladi.', 'Код будет передан по телефону.'],
    fragment: ['Kod Fragment hisobingiz orqali olinadi.', 'Код доступен через ваш аккаунт Fragment.'],
    firebase_sms: ['Telegram bu raqam uchun rasmiy mobil ilovadagi SMS tekshiruvini talab qildi. QR orqali ulaning.', 'Для этого номера Telegram требует SMS-проверку в официальном мобильном приложении. Используйте QR.'],
  };
  return messages[delivery ?? '']?.[ru ? 1 : 0] ?? (ru ? 'Telegram принял запрос, но не сообщил способ доставки. Проверьте активное приложение или используйте QR.' : 'Telegram so‘rovni qabul qildi, lekin kod keladigan usulni ko‘rsatmadi. Ochiq Telegram ilovasini tekshiring yoki QR orqali ulaning.');
};

const IntegrationHub = ({ limit, columns = 5, navigateOnSelect = false }: IntegrationHubProps) => {
  const navigate = useNavigate();
  const { locale, t } = useI18n();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const focusedIntegration = searchParams.get("focus");
  const { integrations, connect, disconnect, sync } = useIntegrations();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [telegramPhone, setTelegramPhone] = useState("");
  const [telegramCode, setTelegramCode] = useState("");
  const [telegramPassword, setTelegramPassword] = useState("");
  const [telegramStep, setTelegramStep] = useState<TelegramStep>("phone");
  const [telegramLoginMethod, setTelegramLoginMethod] = useState<TelegramLoginMethod>("phone");
  const [telegramQr, setTelegramQr] = useState<{ qrUrl: string; expiresAt: string } | null>(null);
  const [telegramQrImage, setTelegramQrImage] = useState<string | null>(null);
  const [telegramBusy, setTelegramBusy] = useState(false);
  const [telegramError, setTelegramError] = useState<string | null>(null);
  const [telegramTemporaryError, setTelegramTemporaryError] = useState(false);
  const [telegramDelivery, setTelegramDelivery] = useState<TelegramDeliveryType | null>(null);
  const [telegramNextDelivery, setTelegramNextDelivery] = useState<TelegramDeliveryType | null>(null);
  const [telegramResendAvailableAt, setTelegramResendAvailableAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [health, setHealth] = useState<IntegrationsHealth | null>(null);
  const connectTimerRef = useRef<number | null>(null);
  const applyQrResultRef = useRef<(result: Awaited<ReturnType<typeof startTelegramQrLogin>>) => Promise<void>>(async () => undefined);

  useEffect(() => {
    let active = true;
    void integrationsHealthApi.get().then((result) => { if (active) setHealth(result); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if ((telegramStep !== "code" || telegramResendAvailableAt === null) && !telegramQr) return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [telegramStep, telegramResendAvailableAt, telegramQr]);

  useEffect(() => {
    if (!telegramQr) { setTelegramQrImage(null); return undefined; }
    let active = true;
    void QRCode.toDataURL(telegramQr.qrUrl, { width: 220, margin: 2, errorCorrectionLevel: "M" })
      .then((image) => { if (active) setTelegramQrImage(image); })
      .catch(() => { if (active) setTelegramError("QR kodni yaratib bo'lmadi."); });
    return () => { active = false; };
  }, [telegramQr]);

  useEffect(() => {
    if (selectedId !== "telegram") return undefined;
    let active = true;
    void getTelegramStatus().then((status) => {
      if (!active) return;
      setTelegramTemporaryError(Boolean(status.temporaryError));
      sync("telegram", status.connected, status.username ?? status.displayName ?? "Telegram");
    }).catch(() => { if (active) setTelegramTemporaryError(true); });
    return () => { active = false; };
  }, [selectedId, sync]);

  useEffect(() => {
    let active = true;
    void getGoogleStatus().then((status) => {
      if (!active) return;
      const account = status.email ?? status.displayName ?? "Google";
      sync("google-calendar", Boolean(status.connected && status.calendarEnabled), account);
      sync("google-drive", Boolean(status.connected && status.driveEnabled), account);
    }).catch((error) => {
      if (active) showToast(errorMessage(error, "Google ulanish holatini tekshirib bo'lmadi."), "error");
    });
    return () => { active = false; };
  }, [showToast, sync]);

  useEffect(() => () => {
    if (connectTimerRef.current !== null) window.clearTimeout(connectTimerRef.current);
  }, []);

  const visible = limit ? integrations.slice(0, limit) : integrations;
  const selected = integrations.find((item) => item.id === selectedId);
  const SelectedIcon = selected?.icon;
  const resendRemainingSeconds = telegramResendAvailableAt ? Math.max(0, Math.ceil((telegramResendAvailableAt - now) / 1000)) : 0;
  const telegramQrExpiresAt = telegramQr?.expiresAt;
  const qrRemainingSeconds = telegramQr ? Math.max(0, Math.ceil((new Date(telegramQr.expiresAt).getTime() - now) / 1000)) : 0;

  const closeModal = () => {
    if (connectTimerRef.current !== null) {
      window.clearTimeout(connectTimerRef.current);
      connectTimerRef.current = null;
    }
    setConnectingId(null); setSelectedId(null); setUsername(""); setTelegramPhone(""); setTelegramCode(""); setTelegramPassword(""); setTelegramStep("phone"); setTelegramLoginMethod("phone"); setTelegramQr(null); setTelegramQrImage(null); setTelegramBusy(false); setTelegramError(null);
    setTelegramDelivery(null); setTelegramNextDelivery(null); setTelegramResendAvailableAt(null); setTelegramTemporaryError(false);
  };

  const finishTelegramConnection = async () => {
    const status = await getTelegramStatus();
    connect("telegram", status.username ?? status.displayName ?? "Telegram");
    closeModal();
  };

  const applyQrResult = async (result: Awaited<ReturnType<typeof startTelegramQrLogin>>) => {
    if (result.status === "success") { await finishTelegramConnection(); return; }
    if (result.status === "password_required") { setTelegramStep("password"); setTelegramQr(null); return; }
    if (result.status === "pending" && result.qrUrl && result.expiresAt) setTelegramQr({ qrUrl: result.qrUrl, expiresAt: result.expiresAt });
    else setTelegramError("QR login holati topilmadi. Qayta boshlang.");
  };
  applyQrResultRef.current = applyQrResult;

  const startQr = async () => {
    if (telegramBusy) return;
    setTelegramBusy(true); setTelegramError(null); setTelegramStep("phone");
    try { await applyQrResult(await startTelegramQrLogin()); }
    catch (error) { setTelegramError(errorMessage(error, "Telegram QR loginni boshlashda xatolik yuz berdi.")); }
    finally { setTelegramBusy(false); }
  };

  useEffect(() => {
    if (selectedId !== "telegram" || telegramLoginMethod !== "qr" || telegramStep === "password" || !telegramQrExpiresAt) return undefined;
    let active = true;
    let checking = false;
    const check = async () => {
      if (!active || checking) return;
      checking = true;
      try { await applyQrResultRef.current(await getTelegramQrStatus()); }
      catch (error) { if (active) setTelegramError(errorMessage(error, "QR holatini tekshirib bo'lmadi.")); }
      finally { checking = false; }
    };
    const id = window.setInterval(() => void check(), 3000);
    return () => { active = false; window.clearInterval(id); };
  }, [selectedId, telegramLoginMethod, telegramStep, telegramQrExpiresAt]);

  useEffect(() => {
    if (selectedId !== 'telegram' || telegramLoginMethod !== 'phone') return;
    let active = true;
    void getTelegramStatus().then(status => {
      if (!active || !status.pendingLogin) return;
      setTelegramStep('code');
      setTelegramDelivery(status.pendingLogin.delivery);
      setTelegramNextDelivery(status.pendingLogin.nextDelivery);
      setTelegramResendAvailableAt(Date.now() + status.pendingLogin.timeoutSeconds * 1000);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [selectedId, telegramLoginMethod]);

  const submitTelegramStep = async () => {
    if (telegramBusy) return;
    setTelegramBusy(true); setTelegramError(null);
    try {
      if (telegramStep === "phone") {
        const result = await connectTelegram(telegramPhone.trim().replace(/[\s()-]/g, "").replace(/^00/, "+"));
        setTelegramDelivery(result.delivery);
        setTelegramNextDelivery(result.nextDelivery);
        const waitSeconds = result.timeoutSeconds ?? (result.nextDelivery ? 0 : 45);
        setTelegramResendAvailableAt(waitSeconds > 0 ? Date.now() + waitSeconds * 1000 : null);
        setTelegramStep("code");
      } else if (telegramStep === "code") {
        const result = await verifyTelegramCode(telegramCode.trim());
        if (result.status === "password_required") setTelegramStep("password");
        else await finishTelegramConnection();
      } else {
        await verifyTelegramPassword(telegramPassword);
        await finishTelegramConnection();
      }
    } catch (error) {
      setTelegramError(errorMessage(error));
      const retry = (error as { details?: { retryAfterSeconds?: number } })?.details?.retryAfterSeconds;
      if (typeof retry === 'number' && retry > 0) setTelegramResendAvailableAt(Date.now() + retry * 1000);
    } finally {
      setTelegramBusy(false);
    }
  };

  const resendTelegramStep = async () => {
    if (telegramBusy || resendRemainingSeconds > 0) return;
    setTelegramBusy(true);
    setTelegramError(null);
    try {
      const result = telegramNextDelivery
        ? await resendTelegramCode()
        : await restartTelegramCode();
      setTelegramDelivery(result.delivery);
      setTelegramNextDelivery(result.nextDelivery);
      const waitSeconds = result.timeoutSeconds ?? (result.nextDelivery ? 0 : 45);
      setTelegramResendAvailableAt(waitSeconds > 0 ? Date.now() + waitSeconds * 1000 : null);
    } catch (error) {
      setTelegramError(errorMessage(error));
      const retry = (error as { details?: { retryAfterSeconds?: number } })?.details?.retryAfterSeconds;
      if (typeof retry === 'number' && retry > 0) {
        setTelegramResendAvailableAt(Date.now() + retry * 1000);
      }
    } finally {
      setTelegramBusy(false);
    }
  };

  const disconnectSelected = async () => {
    if (!selected) return;
    if (selected.id === "google-calendar" || selected.id === "google-drive") {
      setTelegramBusy(true); setTelegramError(null);
      try {
        await disconnectGoogle();
        disconnect("google-calendar"); disconnect("google-drive"); closeModal();
      } catch (error) { setTelegramError(errorMessage(error)); }
      finally { setTelegramBusy(false); }
      return;
    }
    if (selected.id !== "telegram") { disconnect(selected.id); closeModal(); return; }
    setTelegramBusy(true); setTelegramError(null);
    try { await disconnectTelegram(); disconnect("telegram"); closeModal(); }
    catch (error) { setTelegramError(errorMessage(error)); }
    finally { setTelegramBusy(false); }
  };

  return (
    <>
      <div className="integration-hub__grid" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {visible.map((item) => {
          const Icon = item.icon;
          const itemHealth = healthForItem(health, item.id);
          const needsReconnect = itemHealth?.state === "RECONNECT_REQUIRED";
          return <article key={item.id} className={`integration-card integration-card--${item.color} ${focusedIntegration === item.id ? "integration-card--focused" : ""}`}>
            <div className="integration-card__top">
              <div className="integration-card__icon"><Icon size={20} /></div>
              {item.comingSoon ? <span className="integration-card__soon">{t("integrations.soon", "Tez kunda")}</span>
                : itemHealth ? <span className={`integration-card__connected integration-card__connected--${itemHealth.state.toLowerCase()}`}>{itemHealth.state === "CONNECTED" && <Check size={10} />} {HEALTH_LABELS[itemHealth.state]}</span>
                : item.connected && <span className="integration-card__connected"><Check size={10} /> {t("integrations.connected", "Ulangan")}</span>}
            </div>
            <div className="integration-card__info"><h3>{item.name}</h3><p>{item.description}</p></div>
            <button type="button" className={`integration-card__button ${item.connected ? "integration-card__button--connected" : ""}`} disabled={item.comingSoon} onClick={() => { if (item.comingSoon) return; if (navigateOnSelect) { navigate(`/settings?tab=integrations&focus=${item.id}`); return; } setSelectedId(item.id); }}>{item.comingSoon ? t("integrations.unavailable", "Hozircha mavjud emas") : item.connected ? t("integrations.manage", "Boshqarish") : needsReconnect ? "Qayta ulash" : connectingId === item.id ? "Ulanmoqda..." : t("integrations.connect", "Ulash")}{!item.comingSoon && <ArrowUpRight size={13} />}</button>
          </article>;
        })}
      </div>

      {selected && <div className="integration-modal__overlay" onClick={closeModal}>
        <div className="integration-modal" onClick={(event) => event.stopPropagation()}>
          <button type="button" className="integration-modal__close" onClick={closeModal} aria-label={t("integrations.modal.close", "Integratsiya oynasini yopish")}><X size={17} /></button>
          <div className={`integration-modal__icon integration-modal__icon--${selected.color}`}>{SelectedIcon && <SelectedIcon size={23} />}</div>
          <h2>{selected.name}</h2>
          <p>{selected.id === "telegram" && selected.connected ? "Telegram ulangan" : selected.connected ? `${selected.name} Qulay AI bilan ulangan.` : `${selected.name}ni Qulay AI bilan ulang.`}</p>
          {selected.id === "telegram" && selected.connected && telegramTemporaryError && <span className="integration-modal__error">{t("integrations.telegram.temporaryIssue", "Telegram bilan vaqtinchalik aloqa muammosi")}</span>}
          {(() => {
            const itemHealth = healthForItem(health, selected.id);
            if (!itemHealth) return null;
            return (
              <div className="integration-modal__health">
                <span className={`integration-modal__health-badge integration-modal__health-badge--${itemHealth.state.toLowerCase()}`}>{HEALTH_LABELS[itemHealth.state]}</span>
                {itemHealth.lastSuccessfulSyncAt && <small>{t("integrations.lastSuccessfulSync", "Oxirgi muvaffaqiyatli sinxronizatsiya")}: {new Date(itemHealth.lastSuccessfulSyncAt).toLocaleString(locale)}</small>}
                {itemHealth.lastErrorCode && <small>{t("common.error", "Xato")}: {itemHealth.lastErrorCode}</small>}
              </div>
            );
          })()}

          {selected.connected ? <>
            <div className="integration-modal__security"><ShieldCheck size={17} /><div><strong>{t("integrations.connectedAccount", "Ulangan hisob")}</strong><span>{selected.username || t("integrations.activeConnection", "Faol ulanish")}</span></div></div>
            <button type="button" className="integration-modal__connect integration-modal__connect--danger" onClick={() => void disconnectSelected()} disabled={telegramBusy}><Unlink size={15} /> {telegramBusy ? t('integrations.disconnecting', 'Uzilmoqda...') : t('integrations.disconnectAction', 'Ulanishni uzish')}</button>
            {telegramError && <span className="integration-modal__error">{telegramError}</span>}
          </> : selected.id === "telegram" ? <>
            <div className="integration-modal__login-tabs" role="tablist" aria-label={t('integrations.loginMethod', 'Telegram ulash usuli')}>
              <button type="button" role="tab" aria-selected={telegramLoginMethod === "phone"} className={telegramLoginMethod === "phone" ? "is-active" : ""} disabled={telegramBusy} onClick={() => { setTelegramLoginMethod("phone"); setTelegramQr(null); setTelegramError(null); setTelegramStep("phone"); }}>{t('integrations.byPhone', 'Telefon orqali')}</button>
              <button type="button" role="tab" aria-selected={telegramLoginMethod === "qr"} className={telegramLoginMethod === "qr" ? "is-active" : ""} disabled={telegramBusy} onClick={() => { setTelegramLoginMethod("qr"); setTelegramError(null); void startQr(); }}>{t('integrations.byQr', 'QR orqali')}</button>
            </div>
            {telegramLoginMethod === "phone" ? <>
              <label className="integration-modal__label">{telegramStep === "phone" ? t('integrations.phoneNumber', 'Telefon raqam') : telegramStep === "code" ? t('integrations.loginCode', 'Telegram kodi') : t('integrations.twoFactor', '2FA parol')}</label>
              {telegramStep === "phone" && <input type="tel" className="integration-modal__field" placeholder="+998901234567" value={telegramPhone} onChange={(event) => setTelegramPhone(event.target.value)} autoComplete="tel" />}
              {telegramStep === "code" && <input type="text" className="integration-modal__field" placeholder={t('integrations.loginCode', 'Telegram kodi')} value={telegramCode} onChange={(event) => setTelegramCode(event.target.value)} autoComplete="one-time-code" />}
              {telegramStep === "password" && <input type="password" className="integration-modal__field" placeholder={t("integrations.telegram.twoFactorPassword", "Telegram 2FA paroli")} value={telegramPassword} onChange={(event) => setTelegramPassword(event.target.value)} autoComplete="current-password" />}
              {telegramStep === "code" && <span className="integration-modal__note integration-modal__note--delivery">{telegramDeliveryMessage(telegramDelivery, locale === "ru")}</span>}
              {telegramError && <span className="integration-modal__error">{telegramError}</span>}
              <button type="button" className="integration-modal__connect" onClick={() => void submitTelegramStep()} disabled={telegramBusy}>{telegramBusy ? t('integrations.checking', 'Tekshirilmoqda...') : telegramStep === "phone" ? t('integrations.sendCode', 'Kodni yuborish') : telegramStep === "code" ? t('integrations.verifyCode', 'Kodni tasdiqlash') : t('integrations.finish', 'Ulanishni yakunlash')}<ExternalLink size={15} /></button>
              {telegramStep === "code" && <button type="button" className="integration-modal__resend" onClick={() => void resendTelegramStep()} disabled={telegramBusy || resendRemainingSeconds > 0}>{resendRemainingSeconds > 0 ? `${locale === "ru" ? "Повторить через" : "Qayta yuborish"} (${resendRemainingSeconds}s)` : telegramNextDelivery === "sms" ? (locale === "ru" ? "Отправить по SMS" : "SMS orqali yuborish") : telegramNextDelivery ? (locale === "ru" ? "Отправить повторно" : "Qayta yuborish") : (locale === "ru" ? "Запросить новый код" : "Yangi kod so‘rash")}</button>}
              {telegramStep === "code" && <span className="integration-modal__note">{t('integrations.tryQr', "Kod kelmasa, QR orqali ulashni sinab ko'ring.")}</span>}
            </> : <div className="integration-modal__qr-panel">
              {telegramStep === "password" ? <>
                <label className="integration-modal__label">{t('integrations.twoFactor', '2FA parol')}</label>
                <input type="password" className="integration-modal__field" placeholder={t('integrations.telegram.twoFactorPassword', 'Telegram 2FA paroli')} value={telegramPassword} onChange={(event) => setTelegramPassword(event.target.value)} autoComplete="current-password" />
                <button type="button" className="integration-modal__connect" onClick={() => void submitTelegramStep()} disabled={telegramBusy}>{t('integrations.finish', 'Ulanishni yakunlash')}</button>
              </> : <>
                <p>{t('integrations.qrInstructions', 'Telegram ilovasida Sozlamalar → Qurilmalar → Qurilmani ulash orqali QR kodni skaner qiling.')}</p>
                <div className="integration-modal__qr-code">{telegramQrImage ? <img src={telegramQrImage} alt={t('integrations.qrAlt', 'Telegram login QR kodi')} /> : <span>{telegramBusy ? t('integrations.qrPreparing', 'QR tayyorlanmoqda...') : t('integrations.qrLoading', 'QR yuklanmoqda...')}</span>}</div>
                <span className="integration-modal__qr-expiry">{telegramQr ? qrRemainingSeconds > 0 ? t('integrations.qrExpires', '{seconds} soniyada yangilanadi', { seconds: qrRemainingSeconds }) : t('integrations.qrRefreshing', 'QR yangilanmoqda...') : t('common.loading', 'Yuklanmoqda...')}</span>
                {telegramQr && <a className="integration-modal__connect" href={telegramQr.qrUrl}>{t('integrations.openTelegram', 'Telegramda ochish')} <ExternalLink size={15} /></a>}
                <button type="button" className="integration-modal__resend" onClick={() => void startQr()} disabled={telegramBusy}><RefreshCw size={13} /> {t('integrations.refreshQr', 'QR kodni yangilash')}</button>
              </>}
              {telegramError && <span className="integration-modal__error">{telegramError}</span>}
            </div>}
            <span className="integration-modal__note">{t("integrations.telegram.sessionEncrypted", "Session Qulay AI serverida shifrlangan holda saqlanadi.")}</span>
          </> : (selected.id === "google-calendar" || selected.id === "google-drive") ? <>
            <button type="button" className="integration-modal__connect" onClick={() => { if (connectingId) return; setConnectingId(selected.id); void getGoogleConnectUrl().then(({ url }) => { window.location.assign(url); }).catch((error) => { const message = errorMessage(error, "Google OAuth oynasini ochib bo'lmadi."); setTelegramError(message); showToast(message, "error"); setConnectingId(null); }); }} disabled={connectingId === selected.id}>{connectingId === selected.id ? "Google oynatilmoqda..." : "Google bilan ulash"}<ExternalLink size={15} /></button>
            {telegramError && <span className="integration-modal__error">{telegramError}</span>}
            <span className="integration-modal__note">{t("integrations.google.oauthHint", "Google OAuth oynasida Calendar va Drive ruxsatlarini tasdiqlang.")}</span>
          </> : <>
            <label className="integration-modal__label">{t("integrations.username", "Username")}</label>
            <input type="text" className="integration-modal__field" placeholder="@username" value={username} onChange={(event) => setUsername(event.target.value)} />
            <button type="button" className="integration-modal__connect" onClick={() => { if (connectingId) return; setConnectingId(selected.id); connectTimerRef.current = window.setTimeout(() => { connect(selected.id, username); closeModal(); }, 650); }} disabled={connectingId === selected.id}>{connectingId === selected.id ? "Ulanmoqda..." : `${selected.name}ni ulash`}<ExternalLink size={15} /></button>
            <span className="integration-modal__note">{t("integrations.oauthComingSoon", "OAuth ulanishi keyingi bosqichda qo‘shiladi.")}</span>
          </>}
        </div>
      </div>}
    </>
  );
};

export default IntegrationHub;
