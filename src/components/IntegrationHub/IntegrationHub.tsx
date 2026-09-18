import { ArrowUpRight, BookOpen, Check, ExternalLink, KeyRound, Phone, RefreshCw, ShieldCheck, Unlink, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import QRCode from "qrcode";

import { useIntegrations } from "../../hooks/useIntegrations";
import { integrationsHealthApi, type IntegrationsHealth, type IntegrationHealth } from "../../services/api/integrationsHealthApi";
import { subscriptionApi, type PlanFeature } from "../../services/api/subscriptionApi";
import {
  connectTelegram,
  disconnectTelegram,
  getTelegramStatus,
  getTelegramSalesAgentSettings,
  updateTelegramSalesAgentSettings,
  getTelegramChats,
  disconnectGoogle,
  getGoogleConnectUrl,
  getGoogleStatus,
  resendTelegramCode,
  restartTelegramCode,
  startTelegramQrLogin,
  getTelegramQrStatus,
  verifyTelegramCode,
  verifyTelegramPassword,
  disconnectBito,
  getBitoConnectUrl,
  getBitoStatus,
  testBito,
  type BitoStatus,
  type TelegramDeliveryType,
  type TelegramSalesAgentSettings,
  type TelegramPeer,
  type WhatsAppStatus,
  type WhatsAppEmbeddedConfig,
  getWhatsAppStatus,
  getWhatsAppEmbeddedConfig,
  connectWhatsAppEmbedded,
  connectWhatsApp,
  updateWhatsAppSalesAgentSettings,
  testWhatsApp,
  disconnectWhatsApp,
} from "../../services/integrationService";

import { useI18n } from "../../i18n/useI18n";
import { useToast } from "../../hooks/useToast";

import { InstagramIntegrationPanel } from "./InstagramIntegrationPanel";
import { resolveWhatsAppHealth } from "./integrationHealth";

import "./IntegrationHub.scss";

type IntegrationHubProps = { limit?: number; columns?: number; navigateOnSelect?: boolean };
type TelegramStep = "phone" | "code" | "password";
type TelegramLoginMethod = "phone" | "qr";
type MetaFacebookSdk = {
  init: (options: Record<string, unknown>) => void;
  login: (callback: (response: { authResponse?: { code?: string } }) => void, options: Record<string, unknown>) => void;
};
type WhatsAppEmbeddedEvent = {
  type?: string;
  event?: string;
  data?: { phone_number_id?: string; waba_id?: string };
};

type TFn = (key: string, fallback: string, params?: Record<string, string | number>) => string;

const errorMessage = (_error: unknown, fallback: string) => fallback;

const healthLabel = (t: TFn, state: IntegrationHealth["state"]): string => ({
  CONNECTED: t("integrations.health.connected", "Ulangan"),
  TEMPORARY_ISSUE: t("integrations.health.temporaryIssue", "Vaqtincha muammo"),
  RECONNECT_REQUIRED: t("integrations.health.reconnectRequired", "Qayta ruxsat kerak"),
  DISCONNECTED: t("integrations.health.disconnected", "Uzilgan"),
})[state];

const healthForItem = (health: IntegrationsHealth | null, id: string): IntegrationHealth | null => {
  if (!health) return null;
  if (id === "google-calendar" || id === "google-drive") return health.google;
  if (id === "telegram") return health.telegram;
  if (id === "bito") return health.bito;
  if (id === "whatsapp") return health.whatsapp;
  if (id === "instagram") return health.instagram;
  return null;
};

const resolvedHealthForItem = (health: IntegrationsHealth | null, id: string, whatsAppStatus: WhatsAppStatus | null): IntegrationHealth | null => {
  const base = healthForItem(health, id);
  return id === "whatsapp" ? resolveWhatsAppHealth(base, whatsAppStatus) : base;
};

const requiredFeatureForIntegration = (id: string): PlanFeature | null => {
  if (id === "google-calendar" || id === "google-drive") return "GOOGLE";
  if (id === "telegram") return "TELEGRAM";
  if (id === "bito") return "BITO";
  if (id === "whatsapp") return "WHATSAPP_SALES";
  if (id === "instagram") return "INSTAGRAM_SALES";
  return null;
};

const telegramDeliveryMessage = (t: TFn, delivery: TelegramDeliveryType | null): string => {
  const keys: Partial<Record<TelegramDeliveryType, [string, string]>> = {
    telegram_app: ["integrations.telegram.delivery.app", "Kod shu raqam bilan kirilgan Telegram ilovasidagi “Telegram” xizmat chatiga yuborildi. Telefon yoki kompyuteringizdagi Telegramni tekshiring."],
    email: ["integrations.telegram.delivery.email", "Kod Telegramga bog‘langan emailingizga yuborildi. Spam papkasini ham tekshiring."],
    email_setup: ["integrations.telegram.delivery.emailSetup", "Telegram avval kirish emailini sozlashni talab qildi. QR orqali ulaning yoki rasmiy Telegram ilovasida emailni sozlang."],
    sms: ["integrations.telegram.delivery.sms", "Kod SMS orqali yuborildi."],
    call: ["integrations.telegram.delivery.call", "Kod telefon qo‘ng‘irog‘i orqali beriladi."],
    fragment: ["integrations.telegram.delivery.fragment", "Kod Fragment hisobingiz orqali olinadi."],
    firebase_sms: ["integrations.telegram.delivery.firebaseSms", "Telegram bu raqam uchun rasmiy mobil ilovadagi SMS tekshiruvini talab qildi. QR orqali ulaning."],
  };
  const message = delivery ? keys[delivery] : undefined;
  return message ? t(message[0], message[1]) : t("integrations.telegram.delivery.unknown", "Telegram so‘rovni qabul qildi, lekin kod keladigan usulni ko‘rsatmadi. Ochiq Telegram ilovasini tekshiring yoki QR orqali ulaning.");
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
  const [telegramSalesSettings, setTelegramSalesSettings] = useState<TelegramSalesAgentSettings | null>(null);
  const [telegramGroupChats, setTelegramGroupChats] = useState<TelegramPeer[]>([]);
  const [telegramGroupsLoading, setTelegramGroupsLoading] = useState(false);
  const [telegramSalesBusy, setTelegramSalesBusy] = useState(false);
  const [telegramDelivery, setTelegramDelivery] = useState<TelegramDeliveryType | null>(null);
  const [telegramNextDelivery, setTelegramNextDelivery] = useState<TelegramDeliveryType | null>(null);
  const [telegramResendAvailableAt, setTelegramResendAvailableAt] = useState<number | null>(null);
  const [bitoStatus, setBitoStatus] = useState<BitoStatus | null>(null);
  const [whatsAppStatus, setWhatsAppStatus] = useState<WhatsAppStatus | null>(null);
  const [whatsAppEmbeddedConfig, setWhatsAppEmbeddedConfig] = useState<WhatsAppEmbeddedConfig | null>(null);
  const [whatsAppGuideOpen, setWhatsAppGuideOpen] = useState(false);
  const [whatsAppPhoneNumberId, setWhatsAppPhoneNumberId] = useState("");
  const [whatsAppWabaId, setWhatsAppWabaId] = useState("");
  const [whatsAppAccessToken, setWhatsAppAccessToken] = useState("");
  const [whatsAppBusy, setWhatsAppBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [health, setHealth] = useState<IntegrationsHealth | null>(null);
  const [planFeatures, setPlanFeatures] = useState<PlanFeature[] | null>(null);
  const connectTimerRef = useRef<number | null>(null);
  const applyQrResultRef = useRef<(result: Awaited<ReturnType<typeof startTelegramQrLogin>>) => Promise<void>>(async () => undefined);

  useEffect(() => {
    let active = true;
    void integrationsHealthApi.get().then((result) => { if (active) setHealth(result); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    void subscriptionApi.mine().then((info) => { if (active) setPlanFeatures(info.canUseAi ? info.plan.features : []); }).catch(() => { if (active) setPlanFeatures([]); });
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
      .catch(() => { if (active) setTelegramError(t("integrations.telegram.qrCreateError", "QR kodni yaratib bo‘lmadi.")); });
    return () => { active = false; };
  }, [t, telegramQr]);

  useEffect(() => { setTelegramError(null); }, [locale]);

  useEffect(() => {
    if (selectedId !== "telegram") return undefined;
    let active = true;
    setTelegramGroupsLoading(true);
    void Promise.all([
      getTelegramStatus(),
      getTelegramSalesAgentSettings().catch(() => null),
      getTelegramChats(100).catch(() => [] as TelegramPeer[]),
    ]).then(([status, salesSettings, chats]) => {
      if (!active) return;
      setTelegramTemporaryError(Boolean(status.temporaryError));
      setTelegramSalesSettings(salesSettings);
      setTelegramGroupChats(chats.filter((chat) => chat.type === "GROUP"));
      sync("telegram", status.connected, status.username ?? status.displayName ?? "Telegram");
    }).catch(() => { if (active) setTelegramTemporaryError(true); }).finally(() => { if (active) setTelegramGroupsLoading(false); });
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
      if (active) showToast(errorMessage(error, t("integrations.google.statusError", "Google ulanish holatini tekshirib bo‘lmadi.")), "error");
    });
    return () => { active = false; };
  }, [showToast, sync, t]);

  useEffect(() => {
    let active = true;
    void Promise.all([getBitoStatus(), integrationsHealthApi.get().catch(() => null)]).then(([status, healthResult]) => {
      if (!active) return;
      setBitoStatus(status);
      if (healthResult) setHealth(healthResult);
      sync("bito", status.connected, status.serverName ?? status.serverHost ?? "Bito ERP");
    }).catch(() => {
      // Bito is optional; connection errors are shown only when the user opens its modal.
    });
    return () => { active = false; };
  }, [sync]);

  useEffect(() => {
    let active = true;
    void Promise.all([getWhatsAppStatus(), integrationsHealthApi.get().catch(() => null), getWhatsAppEmbeddedConfig().catch(() => null)]).then(([status, healthResult, embeddedConfig]) => {
      if (!active) return;
      setWhatsAppStatus(status);
      if (healthResult) setHealth(healthResult);
      if (embeddedConfig) setWhatsAppEmbeddedConfig(embeddedConfig);
      sync("whatsapp", status.connected, status.verifiedName ?? status.displayPhoneNumber ?? "WhatsApp");
    }).catch(() => undefined);
    return () => { active = false; };
  }, [sync]);

  useEffect(() => () => {
    if (connectTimerRef.current !== null) window.clearTimeout(connectTimerRef.current);
  }, []);

  const visible = limit ? integrations.slice(0, limit) : integrations;
  const selected = integrations.find((item) => item.id === selectedId);
  const selectedConnected = selected?.id === "bito" ? bitoStatus?.connected === true : selected?.id === "whatsapp" ? whatsAppStatus?.connected === true : selected?.connected === true;
  const telegramSalesAllowed = planFeatures?.includes("TELEGRAM_SALES") === true;
  const whatsAppSalesAllowed = planFeatures?.includes("WHATSAPP_SALES") === true;
  const instagramSalesAllowed = planFeatures?.includes("INSTAGRAM_SALES") === true;
  const bitoStatusLoading = selected?.id === "bito" && bitoStatus === null;
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
    setTelegramDelivery(null); setTelegramNextDelivery(null); setTelegramResendAvailableAt(null); setTelegramTemporaryError(false); setTelegramSalesSettings(null); setTelegramGroupChats([]); setTelegramGroupsLoading(false); setTelegramSalesBusy(false);
    setWhatsAppPhoneNumberId(""); setWhatsAppWabaId(""); setWhatsAppAccessToken(""); setWhatsAppBusy(false); setWhatsAppGuideOpen(false);
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
    else setTelegramError(t("integrations.telegram.qrMissing", "QR login holati topilmadi. Qayta boshlang."));
  };
  applyQrResultRef.current = applyQrResult;

  const startQr = async () => {
    if (telegramBusy) return;
    setTelegramBusy(true); setTelegramError(null); setTelegramStep("phone");
    try { await applyQrResult(await startTelegramQrLogin()); }
    catch (error) { setTelegramError(errorMessage(error, t("integrations.telegram.qrStartError", "Telegram QR loginni boshlashda xatolik yuz berdi."))); }
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
      catch (error) { if (active) setTelegramError(errorMessage(error, t("integrations.telegram.qrStatusError", "QR holatini tekshirib bo‘lmadi."))); }
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
      setTelegramError(errorMessage(error, t("integrations.genericError", "Integratsiyaga ulanishda xatolik yuz berdi.")));
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
      setTelegramError(errorMessage(error, t("integrations.genericError", "Integratsiyaga ulanishda xatolik yuz berdi.")));
      const retry = (error as { details?: { retryAfterSeconds?: number } })?.details?.retryAfterSeconds;
      if (typeof retry === 'number' && retry > 0) {
        setTelegramResendAvailableAt(Date.now() + retry * 1000);
      }
    } finally {
      setTelegramBusy(false);
    }
  };

  const submitBito = async () => {
    if (telegramBusy) return;
    setTelegramBusy(true);
    setTelegramError(null);
    try {
      const result = await getBitoConnectUrl();
      if (result.connected) {
        const status = await getBitoStatus();
        setBitoStatus(status);
        sync("bito", status.connected, status.serverName ?? status.serverHost ?? "Bito ERP");
        if (!status.connected) throw new Error(t("integrations.bito.statusError", "Bito ulanish holatini tekshirib bo‘lmadi"));
        showToast(t("integrations.bito.connectedToast", "Bito ERP ulandi. {count} ta MCP tool topildi.", { count: result.toolCount }), "success");
        closeModal();
        return;
      }
      if (!result.url) throw new Error(t("integrations.bito.urlMissing", "Bito ruxsat manzili topilmadi"));
      window.location.assign(result.url);
    } catch (error) {
      setTelegramError(errorMessage(error, t("integrations.bito.oauthOpenError", "Bito ruxsat oynasini ochib bo‘lmadi.")));
      setTelegramBusy(false);
    }
  };

  const updateTelegramSalesSetting = async (patch: Partial<Pick<TelegramSalesAgentSettings, "enabled" | "privateChats" | "groups" | "allowedGroupIds" | "voiceEnabled">>) => {
    if (telegramSalesBusy) return;
    setTelegramSalesBusy(true);
    setTelegramError(null);
    try {
      const next = await updateTelegramSalesAgentSettings(patch);
      setTelegramSalesSettings(next);
      showToast(next.enabled ? t("integrations.telegram.salesUpdated", "Telegram AI sotuv agenti yangilandi.") : t("integrations.telegram.salesDisabled", "Telegram AI sotuv agenti o‘chirildi."), "success");
    } catch (error) {
      setTelegramError(errorMessage(error, t("integrations.telegram.salesSaveError", "Telegram AI sotuv agenti sozlamasini saqlab bo‘lmadi.")));
    } finally {
      setTelegramSalesBusy(false);
    }
  };

  const toggleTelegramSalesGroup = (peerId: string, checked: boolean) => {
    if (!telegramSalesSettings || telegramSalesBusy) return;
    const current = telegramSalesSettings.allowedGroupIds ?? [];
    const next = checked
      ? [...new Set([...current, peerId])]
      : current.filter((id) => id !== peerId);
    void updateTelegramSalesSetting({ allowedGroupIds: next });
  };

  const syncWhatsAppStatus = async (status: WhatsAppStatus) => {
    setWhatsAppStatus(status);
    sync("whatsapp", status.connected, status.verifiedName ?? status.displayPhoneNumber ?? "WhatsApp");
    const healthResult = await integrationsHealthApi.get().catch(() => null);
    if (healthResult) setHealth(healthResult);
    return status;
  };

  const loadMetaSdk = async (config: WhatsAppEmbeddedConfig) => {
    if (!config.appId) throw new Error(t("integrations.meta.appIdMissing", "Meta App ID topilmadi"));
    const metaWindow = window as typeof window & { FB?: MetaFacebookSdk; fbAsyncInit?: () => void };
    if (metaWindow.FB) { metaWindow.FB.init({ appId: config.appId, cookie: true, xfbml: true, version: config.graphApiVersion }); return metaWindow.FB; }
    await new Promise<void>((resolve, reject) => {
      const existing = document.getElementById("facebook-jssdk") as HTMLScriptElement | null;
      const timer = window.setTimeout(() => reject(new Error(t("integrations.meta.sdkLoadError", "Meta SDK yuklanmadi"))), 15000);
      metaWindow.fbAsyncInit = () => { window.clearTimeout(timer); resolve(); };
      if (existing) return;
      const script = document.createElement("script");
      script.id = "facebook-jssdk"; script.async = true; script.defer = true; script.crossOrigin = "anonymous"; script.src = "https://connect.facebook.net/en_US/sdk.js";
      script.onerror = () => { window.clearTimeout(timer); reject(new Error(t("integrations.meta.sdkLoadError", "Meta SDK yuklanmadi"))); };
      document.head.appendChild(script);
    });
    const sdk = (metaWindow as { FB?: MetaFacebookSdk }).FB;
    if (!sdk) throw new Error(t("integrations.meta.sdkStartError", "Meta SDK ishga tushmadi"));
    sdk.init({ appId: config.appId, cookie: true, xfbml: true, version: config.graphApiVersion });
    return sdk;
  };

  const submitWhatsAppEmbedded = async () => {
    if (whatsAppBusy) return;
    const config = whatsAppEmbeddedConfig ?? await getWhatsAppEmbeddedConfig();
    setWhatsAppEmbeddedConfig(config);
    if (!config.ready || !config.configId) { setTelegramError(t("integrations.whatsapp.embeddedUnavailable", "Bir bosishda WhatsApp ulash hali administrator tomonidan sozlanmagan. Qo‘lda ulash bo‘limidan foydalanish mumkin.")); return; }
    setWhatsAppBusy(true); setTelegramError(null);
    let cleanup = () => undefined;
    try {
      const FB = await loadMetaSdk(config);
      let resolveSession: (value: { phoneNumberId: string; wabaId: string }) => void = () => undefined;
      let rejectSession: (reason?: unknown) => void = () => undefined;
      const sessionPromise = new Promise<{ phoneNumberId: string; wabaId: string }>((resolve, reject) => { resolveSession = resolve; rejectSession = reject; });
      const sessionTimer = window.setTimeout(() => rejectSession(new Error(t("integrations.whatsapp.selectionTimeout", "Meta WhatsApp tanlovi vaqti tugadi"))), 120000);
      const handler = (event: MessageEvent) => {
        try {
          const origin = new URL(event.origin);
          if (origin.protocol !== "https:" || (origin.hostname !== "facebook.com" && !origin.hostname.endsWith(".facebook.com"))) return;
        } catch { return; }
        let payload: WhatsAppEmbeddedEvent | null = null;
        try { payload = typeof event.data === "string" ? JSON.parse(event.data) as WhatsAppEmbeddedEvent : event.data as WhatsAppEmbeddedEvent; } catch { return; }
        if (payload?.type !== "WA_EMBEDDED_SIGNUP") return;
        if (payload.event === "FINISH" && payload.data?.phone_number_id && payload.data?.waba_id) resolveSession({ phoneNumberId: payload.data.phone_number_id, wabaId: payload.data.waba_id });
        if (payload.event === "CANCEL" || payload.event === "ERROR") rejectSession(new Error(t("integrations.whatsapp.cancelled", "WhatsApp ulash bekor qilindi")));
      };
      window.addEventListener("message", handler);
      cleanup = () => { window.clearTimeout(sessionTimer); window.removeEventListener("message", handler); };
      const codePromise = new Promise<string>((resolve, reject) => {
        FB.login((response) => { const code = response.authResponse?.code; if (code) resolve(code); else reject(new Error(t("integrations.meta.permissionDenied", "Meta ruxsati olinmadi"))); }, {
          config_id: config.configId,
          response_type: "code",
          override_default_response_type: true,
          extras: { setup: {}, sessionInfoVersion: "3" },
        });
      });
      const [code, session] = await Promise.all([codePromise, sessionPromise]);
      const status = await connectWhatsAppEmbedded({ code, phoneNumberId: session.phoneNumberId, wabaId: session.wabaId });
      await syncWhatsAppStatus(status);
      showToast(t("integrations.whatsapp.connectedToast", "WhatsApp muvaffaqiyatli ulandi."), "success");
    } catch (error) {
      setTelegramError(errorMessage(error, t("integrations.whatsapp.metaConnectError", "WhatsAppni Meta orqali ulab bo‘lmadi.")));
    } finally { cleanup(); setWhatsAppBusy(false); }
  };

  const submitWhatsApp = async () => {
    if (whatsAppBusy) return;
    setWhatsAppBusy(true);
    setTelegramError(null);
    try {
      const status = await connectWhatsApp({
        phoneNumberId: whatsAppPhoneNumberId.trim(),
        wabaId: whatsAppWabaId.trim() || undefined,
        accessToken: whatsAppAccessToken.trim(),
      });
      await syncWhatsAppStatus(status);
      setWhatsAppAccessToken("");
      showToast(
        status.webhookSubscribed ? t("integrations.whatsapp.cloudConnected", "WhatsApp Cloud API ulandi.") : t("integrations.whatsapp.savedCheckWebhook", "WhatsApp saqlandi. Endi webhook holatini tekshiring."),
        "success",
      );
    } catch (error) {
      setTelegramError(errorMessage(error, t("integrations.whatsapp.connectError", "WhatsAppni ulab bo‘lmadi.")));
    } finally {
      setWhatsAppBusy(false);
    }
  };

  const updateWhatsAppSalesSetting = async (patch: Partial<Pick<WhatsAppStatus, "enabled" | "salesOnly" | "voiceEnabled">>) => {
    if (whatsAppBusy) return;
    setWhatsAppBusy(true); setTelegramError(null);
    try {
      const status = await updateWhatsAppSalesAgentSettings(patch);
      await syncWhatsAppStatus(status);
      showToast(status.enabled ? t("integrations.whatsapp.salesUpdated", "WhatsApp AI sotuv agenti yangilandi.") : t("integrations.whatsapp.salesDisabled", "WhatsApp AI sotuv agenti o‘chirildi."), "success");
    } catch (error) { setTelegramError(errorMessage(error, t("integrations.whatsapp.salesSaveError", "WhatsApp sotuv agenti sozlamasi saqlanmadi."))); }
    finally { setWhatsAppBusy(false); }
  };

  const testWhatsAppConnection = async () => {
    if (whatsAppBusy) return;
    setWhatsAppBusy(true); setTelegramError(null);
    try {
      const status = await testWhatsApp();
      await syncWhatsAppStatus(status);
      showToast(t("integrations.whatsapp.testSuccess", "WhatsApp ulanishi ishlayapti."), "success");
    } catch (error) { setTelegramError(errorMessage(error, t("integrations.whatsapp.testError", "WhatsApp ulanishini tekshirib bo‘lmadi."))); }
    finally { setWhatsAppBusy(false); }
  };

  const testBitoConnection = async () => {
    if (telegramBusy) return;
    setTelegramBusy(true);
    setTelegramError(null);
    try {
      const result = await testBito();
      const [status, healthResult] = await Promise.all([getBitoStatus(), integrationsHealthApi.get().catch(() => null)]);
      setBitoStatus(status);
      if (healthResult) setHealth(healthResult);
      sync("bito", status.connected, status.serverName ?? status.serverHost ?? "Bito ERP");
      if (!status.connected) throw new Error(t("integrations.bito.statusError", "Bito ulanish holatini tekshirib bo‘lmadi"));
      showToast(t("integrations.bito.testSuccess", "Bito ishlayapti. {count} ta MCP tool mavjud.", { count: result.toolCount }), "success");
    } catch (error) {
      setTelegramError(errorMessage(error, t("integrations.bito.testError", "Bito ulanishini tekshirib bo‘lmadi.")));
      // A transient test failure does not prove that OAuth was disconnected.
      // Refresh authoritative server status instead of forcing a false badge.
      void getBitoStatus().then((status) => {
        setBitoStatus(status);
        sync("bito", status.connected, status.serverName ?? status.serverHost ?? "Bito ERP");
      }).catch(() => undefined);
    } finally {
      setTelegramBusy(false);
    }
  };

  const disconnectSelected = async () => {
    if (!selected) return;
    if (selected.id === "bito") {
      setTelegramBusy(true); setTelegramError(null);
      try {
        await disconnectBito();
        const status = await getBitoStatus();
        setBitoStatus(status);
        sync("bito", status.connected, status.serverName ?? status.serverHost ?? "Bito ERP");
        disconnect("bito");
        closeModal();
      }
      catch (error) { setTelegramError(errorMessage(error, t("integrations.genericError", "Integratsiyaga ulanishda xatolik yuz berdi."))); }
      finally { setTelegramBusy(false); }
      return;
    }
    if (selected.id === "whatsapp") {
      setWhatsAppBusy(true); setTelegramError(null);
      try {
        await disconnectWhatsApp();
        const status = await getWhatsAppStatus();
        await syncWhatsAppStatus(status);
        disconnect("whatsapp");
        closeModal();
      } catch (error) { setTelegramError(errorMessage(error, t("integrations.genericError", "Integratsiyaga ulanishda xatolik yuz berdi."))); }
      finally { setWhatsAppBusy(false); }
      return;
    }
    if (selected.id === "google-calendar" || selected.id === "google-drive") {
      setTelegramBusy(true); setTelegramError(null);
      try {
        await disconnectGoogle();
        disconnect("google-calendar"); disconnect("google-drive"); closeModal();
      } catch (error) { setTelegramError(errorMessage(error, t("integrations.genericError", "Integratsiyaga ulanishda xatolik yuz berdi."))); }
      finally { setTelegramBusy(false); }
      return;
    }
    if (selected.id !== "telegram") { disconnect(selected.id); closeModal(); return; }
    setTelegramBusy(true); setTelegramError(null);
    try { await disconnectTelegram(); disconnect("telegram"); closeModal(); }
    catch (error) { setTelegramError(errorMessage(error, t("integrations.genericError", "Integratsiyaga ulanishda xatolik yuz berdi."))); }
    finally { setTelegramBusy(false); }
  };

  return (
    <>
      <div className="integration-hub__grid" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {visible.map((item) => {
          const Icon = item.icon;
          const itemHealth = resolvedHealthForItem(health, item.id, whatsAppStatus);
          const needsReconnect = itemHealth?.state === "RECONNECT_REQUIRED";
          const requiredFeature = requiredFeatureForIntegration(item.id);
          const planBlocked = !item.connected && planFeatures !== null && requiredFeature !== null && !planFeatures.includes(requiredFeature);
          return <article key={item.id} className={`integration-card integration-card--${item.color} ${focusedIntegration === item.id ? "integration-card--focused" : ""}`}>
            <div className="integration-card__top">
              <div className="integration-card__icon"><Icon size={20} /></div>
              {item.comingSoon ? <span className="integration-card__soon">{t("integrations.soon", "Tez kunda")}</span>
                : itemHealth ? <span className={`integration-card__connected integration-card__connected--${itemHealth.state.toLowerCase()}`}>{itemHealth.state === "CONNECTED" && <Check size={10} />} {healthLabel(t, itemHealth.state)}</span>
                : item.connected && <span className="integration-card__connected"><Check size={10} /> {t("integrations.connected", "Ulangan")}</span>}
            </div>
            <div className="integration-card__info"><h3>{item.name}</h3><p>{t(item.descriptionKey, item.description)}</p></div>
            <button type="button" className={`integration-card__button ${item.connected ? "integration-card__button--connected" : ""}`} disabled={item.comingSoon} onClick={() => { if (item.comingSoon) return; if (planBlocked) { navigate("/billing"); return; } if (navigateOnSelect) { navigate(`/settings?tab=integrations&focus=${item.id}`); return; } setSelectedId(item.id); }}>{item.comingSoon ? t("integrations.unavailable", "Hozircha mavjud emas") : item.connected ? t("integrations.manage", "Boshqarish") : planBlocked ? t("integrations.viewPlan", "Tarifni ko‘rish") : needsReconnect ? t("integrations.reconnect", "Qayta ulash") : connectingId === item.id ? t("integrations.connecting", "Ulanmoqda...") : t("integrations.connect", "Ulash")}{!item.comingSoon && <ArrowUpRight size={13} />}</button>
          </article>;
        })}
      </div>

      {selected && <div className="integration-modal__overlay" onClick={closeModal}>
        <div className="integration-modal" onClick={(event) => event.stopPropagation()}>
          <button type="button" className="integration-modal__close" onClick={closeModal} aria-label={t("integrations.modal.close", "Integratsiya oynasini yopish")}><X size={17} /></button>
          <div className={`integration-modal__icon integration-modal__icon--${selected.color}`}>{SelectedIcon && <SelectedIcon size={23} />}</div>
          <h2>{selected.name}</h2>
          <p>{selected.id === "telegram" && selectedConnected ? t("integrations.telegram.connectedSentence", "Telegram ulangan") : selectedConnected ? t("integrations.connectedSentence", "{name} Qulay AI bilan ulangan.", { name: selected.name }) : t("integrations.connectSentence", "{name}ni Qulay AI bilan ulang.", { name: selected.name })}</p>
          {selected.id === "telegram" && selectedConnected && telegramTemporaryError && <span className="integration-modal__error">{t("integrations.telegram.temporaryIssue", "Telegram bilan vaqtinchalik aloqa muammosi")}</span>}
          {(() => {
            if (selected.id === "bito" && bitoStatus?.authorizing) {
              return <div className="integration-modal__health"><span className="integration-modal__health-badge integration-modal__health-badge--temporary_issue">{t("integrations.authorizationPending", "Ruxsat kutilmoqda")}</span></div>;
            }
            const itemHealth = resolvedHealthForItem(health, selected.id, whatsAppStatus);
            if (!itemHealth) return null;
            return (
              <div className="integration-modal__health">
                <span className={`integration-modal__health-badge integration-modal__health-badge--${itemHealth.state.toLowerCase()}`}>{healthLabel(t, itemHealth.state)}</span>
                {itemHealth.lastSuccessfulSyncAt && <small>{t("integrations.lastSuccessfulSync", "Oxirgi muvaffaqiyatli sinxronizatsiya")}: {new Date(itemHealth.lastSuccessfulSyncAt).toLocaleString(locale)}</small>}
                {itemHealth.lastErrorCode && <small>{t("common.error", "Xato")}: {itemHealth.lastErrorCode}</small>}
              </div>
            );
          })()}

          {selected.id === "instagram" ? <InstagramIntegrationPanel
            salesAllowed={instagramSalesAllowed}
            onConnectionChange={(status) => sync("instagram", status.connected, status.username ?? status.displayName ?? "Instagram")}
            onDisconnected={() => disconnect("instagram")}
            onUpgrade={() => navigate("/billing")}
          /> : selectedConnected ? <>
            <div className="integration-modal__security"><ShieldCheck size={17} /><div><strong>{t("integrations.connectedAccount", "Ulangan hisob")}</strong><span>{selected.username || t("integrations.activeConnection", "Faol ulanish")}</span></div></div>
            {selected.id === "telegram" && (telegramSalesAllowed ? <div className="integration-modal__sales-agent">
              <div className="integration-modal__sales-agent-head">
                <div>
                  <strong>{t("integrations.salesAgent", "AI sotuv agenti")}</strong>
                  <span>{t("integrations.telegram.salesDescription", "Mijozlarga Telegram’da avtomatik javob beradi.")}</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={telegramSalesSettings?.enabled === true}
                  className={`integration-modal__switch ${telegramSalesSettings?.enabled ? "is-on" : ""}`}
                  disabled={telegramSalesBusy || !telegramSalesSettings}
                  onClick={() => void updateTelegramSalesSetting({ enabled: !telegramSalesSettings?.enabled })}
                ><span /></button>
              </div>
              {telegramSalesSettings && <>
                <div className="integration-modal__sales-options">
                  <label>
                    <input type="checkbox" checked={telegramSalesSettings.privateChats} disabled={telegramSalesBusy || !telegramSalesSettings.enabled} onChange={(event) => void updateTelegramSalesSetting({ privateChats: event.target.checked })} />
                    <span><strong>{t("integrations.telegram.privateChats", "Professional shaxsiy chat")}</strong><small>{t("integrations.telegram.privateChatsHint", "Yoqilganda har bir kiruvchi shaxsiy xabarni mijoz suhbati sifatida davom ettiradi — qisqa gap, xato yozuv, “ha/mayli”, rasm va ovozli xabarlarda ham sababsiz jim qolmaydi.")}</small></span>
                  </label>
                  <label>
                    <input type="checkbox" checked={telegramSalesSettings.groups} disabled={telegramSalesBusy || !telegramSalesSettings.enabled} onChange={(event) => void updateTelegramSalesSetting({ groups: event.target.checked })} />
                    <span><strong>{t("integrations.telegram.selectedGroups", "Tanlangan guruhlar")}</strong><small>{t("integrations.telegram.selectedGroupsHint", "AI faqat pastda belgilangan guruhlarda ishlaydi. Boshqa guruhlarda mutlaqo jim turadi.")}</small></span>
                  </label>
                  {telegramSalesSettings.groups && <div className="integration-modal__group-picker">
                    <div className="integration-modal__group-picker-head"><strong>{t("integrations.telegram.enabledGroups", "AI ishlaydigan guruhlar")}</strong><small>{t("integrations.telegram.selectedCount", "{count} ta tanlangan", { count: (telegramSalesSettings.allowedGroupIds ?? []).length })}</small></div>
                    {telegramGroupsLoading ? <span className="integration-modal__note">{t("integrations.telegram.groupsLoading", "Guruhlar yuklanmoqda...")}</span> : telegramGroupChats.length ? <div className="integration-modal__group-list">
                      {telegramGroupChats.map((group) => <label key={group.peerId} className="integration-modal__group-row">
                        <input type="checkbox" checked={(telegramSalesSettings.allowedGroupIds ?? []).includes(group.peerId)} disabled={telegramSalesBusy || !telegramSalesSettings.enabled} onChange={(event) => toggleTelegramSalesGroup(group.peerId, event.target.checked)} />
                        <span><strong>{group.displayName}</strong><small>{group.username || t("integrations.telegram.group", "Telegram guruh")}</small></span>
                      </label>)}
                    </div> : <span className="integration-modal__note">{t("integrations.telegram.noGroups", "Telegram dialoglarida guruh topilmadi. Guruhni Telegram’da ochib, keyin bu oynani qayta oching.")}</span>}
                    {(telegramSalesSettings.allowedGroupIds ?? []).length === 0 && <span className="integration-modal__note">{t("integrations.telegram.noSelectedGroups", "Guruhlar yoqilgan, lekin hech biri tanlanmagan — AI hozir hech qaysi guruhda javob bermaydi.")}</span>}
                  </div>}
                  <label>
                    <input type="checkbox" checked={telegramSalesSettings.voiceEnabled} disabled={telegramSalesBusy || !telegramSalesSettings.enabled} onChange={(event) => void updateTelegramSalesSetting({ voiceEnabled: event.target.checked })} />
                    <span><strong>{t("integrations.voiceUnderstanding", "Ovozli xabarni tushunish")}</strong><small>{t("integrations.telegram.voiceHint", "Maksimum {seconds} soniya. Professional shaxsiy chatda ovozli xabarni ham mijoz xabari sifatida tushunadi.", { seconds: telegramSalesSettings.maxVoiceSeconds })}</small></span>
                  </label>
                </div>
                <div className="integration-modal__sales-status">
                  <span className={telegramSalesSettings.listenerActive && telegramSalesSettings.listenerHealthy ? "is-active" : ""} />
                  {telegramSalesSettings.enabled
                    ? telegramSalesSettings.listenerActive && telegramSalesSettings.listenerHealthy
                      ? t("integrations.agent.active", "Agent faol")
                      : telegramSalesSettings.listenerActive
                        ? t("integrations.agent.reconnecting", "Agent qayta ulanmoqda...")
                        : t("integrations.agent.starting", "Agent ishga tushmoqda...")
                    : t("integrations.agent.disabled", "Agent o‘chiq")}
                </div>
              </>}
            </div> : <div className="integration-modal__sales-agent">
              <div className="integration-modal__sales-agent-head"><div><strong>{t("integrations.salesAgent", "AI sotuv agenti")}</strong><span>{t("integrations.telegram.salesPlanRequired", "Telegram AI sotuvchi Sales AI tarifida mavjud.")}</span></div></div>
              <button type="button" className="integration-modal__connect" onClick={() => navigate("/billing")}>{t("integrations.viewSalesPlan", "Sales AI tarifini ko‘rish")} <ArrowUpRight size={14} /></button>
            </div>)}
            {selected.id === "whatsapp" && whatsAppStatus && (whatsAppSalesAllowed ? <div className="integration-modal__sales-agent">
              <div className="integration-modal__sales-agent-head">
                <div><strong>{t("integrations.salesAgent", "AI sotuv agenti")}</strong><span>{t("integrations.whatsapp.salesDescription", "WhatsApp biznes inboxida har bir mijoz xabarini professional sotuvchi kabi davom ettiradi.")}</span></div>
                <button type="button" role="switch" aria-checked={whatsAppStatus.enabled} className={`integration-modal__switch ${whatsAppStatus.enabled ? "is-on" : ""}`} disabled={whatsAppBusy} onClick={() => void updateWhatsAppSalesSetting({ enabled: !whatsAppStatus.enabled })}><span /></button>
              </div>
              <div className="integration-modal__sales-options">
                <label><input type="checkbox" checked={whatsAppStatus.voiceEnabled} disabled={whatsAppBusy || !whatsAppStatus.enabled} onChange={(event) => void updateWhatsAppSalesSetting({ voiceEnabled: event.target.checked })} /><span><strong>{t("integrations.voiceUnderstanding", "Ovozli xabarni tushunish")}</strong><small>{t("integrations.whatsapp.voiceHint", "Maksimum {seconds} soniya. Javob matn ko‘rinishida bo‘ladi.", { seconds: whatsAppStatus.maxVoiceSeconds })}</small></span></label>
              </div>
              <div className="integration-modal__sales-status"><span className={whatsAppStatus.enabled ? "is-active" : ""} />{whatsAppStatus.enabled ? t("integrations.agent.active", "Agent faol") : t("integrations.agent.disabled", "Agent o‘chiq")}</div>
              <div className="integration-modal__health"><small>{t("integrations.webhook.label", "Webhook")}: {whatsAppStatus.webhookSubscribed ? t("integrations.webhook.connected", "ulangan") : t("integrations.webhook.checkRequired", "Meta panelda webhookni tekshirish kerak")}</small></div>
              <button type="button" className="integration-modal__connect" onClick={() => void testWhatsAppConnection()} disabled={whatsAppBusy}><RefreshCw size={15} /> {whatsAppBusy ? t("integrations.checking", "Tekshirilmoqda...") : t("integrations.testConnection", "Ulanishni tekshirish")}</button>
            </div> : <div className="integration-modal__sales-agent">
              <div className="integration-modal__sales-agent-head"><div><strong>{t("integrations.salesAgent", "AI sotuv agenti")}</strong><span>{t("integrations.whatsapp.salesPlanRequired", "WhatsApp AI sotuvchi Sales AI tarifida mavjud. Ulanish ma’lumoti saqlanadi, lekin agent obunasiz javob bermaydi.")}</span></div></div>
              <button type="button" className="integration-modal__connect" onClick={() => navigate("/billing")}>{t("integrations.viewSalesPlan", "Sales AI tarifini ko‘rish")} <ArrowUpRight size={14} /></button>
            </div>)}
            {selected.id === "bito" && <>
              <div className="integration-modal__health">
                <small>{t("integrations.mcp", "MCP")}: {bitoStatus?.protocolVersion || t("integrations.detecting", "aniqlanmoqda")}</small>
                <small>{t("integrations.tools", "Vositalar")}: {bitoStatus?.toolCount ?? "—"}</small>
              </div>
              <button type="button" className="integration-modal__connect" onClick={() => void testBitoConnection()} disabled={telegramBusy}><RefreshCw size={15} /> {telegramBusy ? t("integrations.checking", "Tekshirilmoqda...") : t("integrations.testConnection", "Ulanishni tekshirish")}</button>
            </>}
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
              {telegramStep === "code" && <span className="integration-modal__note integration-modal__note--delivery">{telegramDeliveryMessage(t, telegramDelivery)}</span>}
              {telegramError && <span className="integration-modal__error">{telegramError}</span>}
              <button type="button" className="integration-modal__connect" onClick={() => void submitTelegramStep()} disabled={telegramBusy}>{telegramBusy ? t('integrations.checking', 'Tekshirilmoqda...') : telegramStep === "phone" ? t('integrations.sendCode', 'Kodni yuborish') : telegramStep === "code" ? t('integrations.verifyCode', 'Kodni tasdiqlash') : t('integrations.finish', 'Ulanishni yakunlash')}<ExternalLink size={15} /></button>
              {telegramStep === "code" && <button type="button" className="integration-modal__resend" onClick={() => void resendTelegramStep()} disabled={telegramBusy || resendRemainingSeconds > 0}>{resendRemainingSeconds > 0 ? t("integrations.telegram.resendAfter", "{seconds} soniyadan keyin qayta yuborish", { seconds: resendRemainingSeconds }) : telegramNextDelivery === "sms" ? t("integrations.telegram.sendSms", "SMS orqali yuborish") : telegramNextDelivery ? t("integrations.telegram.resend", "Qayta yuborish") : t("integrations.telegram.requestNewCode", "Yangi kod so‘rash")}</button>}
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
          </> : selected.id === "whatsapp" ? <>
            {whatsAppStatus?.configured === false && <span className="integration-modal__error">{t("integrations.whatsapp.notConfigured", "WhatsApp server kalitlari hali sozlanmagan. Administrator Render ENV sozlamalarini yakunlashi kerak.")}</span>}
            {whatsAppEmbeddedConfig?.ready === true && <>
              <button type="button" className="integration-modal__connect" onClick={() => void submitWhatsAppEmbedded()} disabled={whatsAppBusy || whatsAppStatus?.configured === false}>{whatsAppBusy ? t("integrations.meta.opening", "Meta oynasi ochilmoqda...") : t("integrations.whatsapp.quickConnect", "Meta orqali tez ulash")}<ExternalLink size={15} /></button>
              <span className="integration-modal__note">{t("integrations.whatsapp.quickConnectHint", "Meta biznes verifikatsiyasi tayyor bo‘lsa, shu usulda ID va token kiritmasdan ulanadi.")}</span>
            </>}

            <button type="button" className="integration-modal__resend integration-modal__resend--guide" onClick={() => setWhatsAppGuideOpen((value) => !value)}><BookOpen size={14} /> {whatsAppGuideOpen ? t("integrations.guide.close", "Qo‘llanmani yopish") : t("integrations.whatsapp.guide.open", "WhatsAppni qanday ulash?")}</button>
            {whatsAppGuideOpen && <div className="integration-modal__whatsapp-guide">
              <div className="integration-modal__guide-step">
                <div className="integration-modal__guide-visual integration-modal__guide-visual--meta" aria-hidden="true"><span className="mock-dot" /><span className="mock-line" /><b>WhatsApp</b><em>{t("integrations.apiSetup", "API sozlamasi")}</em></div>
                <div><strong>1. Meta Developers → WhatsApp</strong><small>{t("integrations.whatsapp.guide.step1", "QULAY AI ilovasini oching va WhatsApp / API Setup sahifasiga kiring.")}</small></div>
              </div>
              <div className="integration-modal__guide-step">
                <div className="integration-modal__guide-visual integration-modal__guide-visual--ids" aria-hidden="true"><small>{t("integrations.whatsapp.phoneNumberId", "Telefon raqami ID")}</small><b>1234••••</b><small>{t("integrations.whatsapp.wabaShort", "WABA ID")}</small><b>9876••••</b></div>
                <div><strong>{t("integrations.whatsapp.guide.step2Title", "2. Ikki ID’ni nusxalang")}</strong><small>{t("integrations.whatsapp.guide.step2", "Phone Number ID va WhatsApp Business Account ID (WABA) ni QULAY’dagi mos maydonlarga qo‘ying.")}</small></div>
              </div>
              <div className="integration-modal__guide-step">
                <div className="integration-modal__guide-visual integration-modal__guide-visual--token" aria-hidden="true"><KeyRound size={13} /><span>••••••••••••</span><b>{t("integrations.generateToken", "Token yaratish")}</b></div>
                <div><strong>{t("integrations.whatsapp.guide.step3Title", "3. Access Token yarating")}</strong><small>{t("integrations.whatsapp.guide.step3", "Meta’dagi Generate token tugmasini bosing. Tokenni kiriting va WhatsAppni ulash tugmasini bosing.")}</small></div>
              </div>
              <div className="integration-modal__guide-tip"><Phone size={14} /><span>{t("integrations.whatsapp.guide.tip", "Test uchun Meta bergan test raqam va token ishlaydi. Token muddati tugasa yangi token bilan qayta ulang.")}</span></div>
              <a className="integration-modal__guide-link" href="https://developers.facebook.com/apps/" target="_blank" rel="noreferrer">{t("integrations.meta.openDevelopers", "Meta Developers’ni ochish")} <ExternalLink size={13} /></a>
            </div>}

            <div className="integration-modal__advanced integration-modal__advanced--manual">
              <div className="integration-modal__manual-head"><strong>{t("integrations.manualConnect", "Qo‘lda ulash")}</strong><span>{t("integrations.currentConnectMethod", "Hozirgi ulash usuli")}</span></div>
              <label className="integration-modal__label">{t("integrations.whatsapp.phoneNumberId", "Telefon raqami ID")}</label>
              <input type="text" className="integration-modal__field" placeholder="123456789012345" value={whatsAppPhoneNumberId} onChange={(event) => setWhatsAppPhoneNumberId(event.target.value.replace(/\D/g, ""))} />
              <label className="integration-modal__label">{t("integrations.whatsapp.wabaId", "WhatsApp Business Account ID (WABA)")}</label>
              <input type="text" className="integration-modal__field" placeholder="123456789012345" value={whatsAppWabaId} onChange={(event) => setWhatsAppWabaId(event.target.value.replace(/\D/g, ""))} />
              <label className="integration-modal__label">{t("integrations.accessToken", "Kirish tokeni")}</label>
              <input type="password" className="integration-modal__field" placeholder={t("integrations.meta.accessTokenPlaceholder", "Meta kirish tokeni")} value={whatsAppAccessToken} onChange={(event) => setWhatsAppAccessToken(event.target.value)} autoComplete="off" />
              <button type="button" className="integration-modal__connect" onClick={() => void submitWhatsApp()} disabled={whatsAppBusy || whatsAppStatus?.configured === false || !whatsAppPhoneNumberId || !whatsAppWabaId || !whatsAppAccessToken}>{whatsAppBusy ? t("integrations.checking", "Tekshirilmoqda...") : t("integrations.whatsapp.connect", "WhatsAppni ulash")}<ExternalLink size={15} /></button>
              <span className="integration-modal__note">{t("integrations.whatsapp.tokenHint", "Token serverda shifrlangan holda saqlanadi. Test tokeni muddati tugasa yangisini yaratib qayta ulang.")}</span>
            </div>
            {telegramError && <span className="integration-modal__error">{telegramError}</span>}
            <span className="integration-modal__note">{t("integrations.whatsapp.cloudApiHint", "Rasmiy WhatsApp Cloud API individual chatlar uchun ishlaydi. Guruh chatlari rasmiy API’da bot uchun qo‘llanmaydi.")}</span>
          </> : selected.id === "bito" ? <>
            {bitoStatus?.configured === false && <span className="integration-modal__error">{t("integrations.bito.notConfigured", "Bito xizmati hozir sozlanmagan. Administratorga murojaat qiling.")}</span>}
            {bitoStatus?.configured !== false && bitoStatus?.oauthReady === false && <span className="integration-modal__error">{t("integrations.bito.oauthNotReady", "Bito ulanishi hozir tayyor emas. Administratorga murojaat qiling.")}</span>}
            {bitoStatus?.status === "DEGRADED" && <><span className="integration-modal__error">{t("integrations.bito.degraded", "Bito ulanishi saqlangan, lekin hozir xizmatdan ma’lumot olib bo‘lmadi.")}</span><button type="button" className="integration-modal__connect" onClick={() => void testBitoConnection()} disabled={telegramBusy}>{t("integrations.checkAgain", "Qayta tekshirish")}</button></>}
            {bitoStatus?.status === "EXPIRED" && <span className="integration-modal__error">{t("integrations.bito.expired", "Bito ruxsatini yangilash kerak. Qayta ulang.")}</span>}
            {bitoStatus?.authorizing && <span className="integration-modal__note">{t("integrations.bito.authorizationHint", "Bito ruxsati kutilmoqda. Ulanishni qayta boshlash uchun tugmani bosishingiz mumkin.")}</span>}
            {telegramError && <span className="integration-modal__error">{telegramError}</span>}
            <button type="button" className="integration-modal__connect" onClick={() => void submitBito()} disabled={telegramBusy || bitoStatusLoading || bitoStatus?.configured === false || bitoStatus?.oauthReady === false}>{bitoStatusLoading ? t("integrations.statusChecking", "Holat tekshirilmoqda...") : telegramBusy ? t("integrations.bito.opening", "Bito oynasi ochilmoqda...") : t("integrations.bito.connect", "Bito bilan ulash")}<ExternalLink size={15} /></button>
            <span className="integration-modal__note">{t("integrations.bito.helper", "Qulay AI Bito MCP orqali ombor, savdo, moliya, mijozlar, xodimlar va Bito akkauntingiz ruxsat bergan boshqa ERP ma’lumotlarini o‘qiy oladi. O‘zgartiruvchi amallar alohida tasdiqlanadi; tokenni qo‘lda kiritish shart emas.")}</span>
          </> : (selected.id === "google-calendar" || selected.id === "google-drive") ? <>
            <button type="button" className="integration-modal__connect" onClick={() => { if (connectingId) return; setConnectingId(selected.id); void getGoogleConnectUrl().then(({ url }) => { window.location.assign(url); }).catch((error) => { const message = errorMessage(error, t("integrations.google.oauthOpenError", "Google OAuth oynasini ochib bo‘lmadi.")); setTelegramError(message); showToast(message, "error"); setConnectingId(null); }); }} disabled={connectingId === selected.id}>{connectingId === selected.id ? t("integrations.google.opening", "Google oynasi ochilmoqda...") : t("integrations.google.connect", "Google bilan ulash")}<ExternalLink size={15} /></button>
            {telegramError && <span className="integration-modal__error">{telegramError}</span>}
            <span className="integration-modal__note">{t("integrations.google.oauthHint", "Google OAuth oynasida Calendar va Drive ruxsatlarini tasdiqlang.")}</span>
          </> : <>
            <label className="integration-modal__label">{t("integrations.username", "Username")}</label>
            <input type="text" className="integration-modal__field" placeholder="@username" value={username} onChange={(event) => setUsername(event.target.value)} />
            <button type="button" className="integration-modal__connect" onClick={() => { if (connectingId) return; setConnectingId(selected.id); connectTimerRef.current = window.setTimeout(() => { connect(selected.id, username); closeModal(); }, 650); }} disabled={connectingId === selected.id}>{connectingId === selected.id ? t("integrations.connecting", "Ulanmoqda...") : t("integrations.connectNamed", "{name}ni ulash", { name: selected.name })}<ExternalLink size={15} /></button>
            <span className="integration-modal__note">{t("integrations.oauthComingSoon", "OAuth ulanishi keyingi bosqichda qo‘shiladi.")}</span>
          </>}
        </div>
      </div>}
    </>
  );
};

export default IntegrationHub;
