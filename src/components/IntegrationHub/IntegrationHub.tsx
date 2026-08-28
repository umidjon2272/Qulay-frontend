import { ArrowUpRight, Check, ExternalLink, ShieldCheck, Unlink, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useIntegrations } from "../../hooks/useIntegrations";
import { ApiError } from "../../services/api/apiClient";
import {
  connectTelegram,
  disconnectTelegram,
  getTelegramStatus,
  disconnectGoogle,
  getGoogleConnectUrl,
  getGoogleStatus,
  resendTelegramCode,
  verifyTelegramCode,
  verifyTelegramPassword,
  type TelegramDeliveryType,
} from "../../services/integrationService";

import "./IntegrationHub.scss";

type IntegrationHubProps = { limit?: number; columns?: number };
type TelegramStep = "phone" | "code" | "password";

const errorMessage = (error: unknown) => error instanceof ApiError ? error.message : "Telegram bilan ulanishda xatolik yuz berdi.";

const telegramDeliveryMessage = (delivery: TelegramDeliveryType | null): string => {
  switch (delivery) {
    case "telegram_app": return "Kod boshqa ochiq Telegram qurilmangizga yuborildi.";
    case "email": return "Kod Telegram akkauntingizga bog'langan emailga yuborildi.";
    case "sms": return "Kod SMS orqali yuborildi.";
    case "call": return "Kod qo'ng'iroq orqali aytib beriladi.";
    case "fragment": return "Kod Fragment orqali olinadi.";
    case "firebase_sms": return "Kod avtomatik tekshiruv orqali yuborildi.";
    default: return "Tasdiqlash kodi yuborildi.";
  }
};

const IntegrationHub = ({ limit, columns = 5 }: IntegrationHubProps) => {
  const { integrations, connect, disconnect } = useIntegrations();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [telegramPhone, setTelegramPhone] = useState("");
  const [telegramCode, setTelegramCode] = useState("");
  const [telegramPassword, setTelegramPassword] = useState("");
  const [telegramStep, setTelegramStep] = useState<TelegramStep>("phone");
  const [telegramBusy, setTelegramBusy] = useState(false);
  const [telegramError, setTelegramError] = useState<string | null>(null);
  const [telegramTemporaryError, setTelegramTemporaryError] = useState(false);
  const [telegramDelivery, setTelegramDelivery] = useState<TelegramDeliveryType | null>(null);
  const [telegramResendAvailableAt, setTelegramResendAvailableAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const connectTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (telegramStep !== "code" || telegramResendAvailableAt === null) return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [telegramStep, telegramResendAvailableAt]);

  useEffect(() => {
    if (selectedId !== "telegram") return undefined;
    let active = true;
    void getTelegramStatus().then((status) => {
      if (!active) return;
      setTelegramTemporaryError(Boolean(status.temporaryError));
      if (status.connected) connect("telegram", status.username ?? status.displayName ?? "Telegram");
      else disconnect("telegram");
    }).catch(() => { if (active) setTelegramTemporaryError(true); });
    return () => { active = false; };
  }, [connect, disconnect, selectedId]);

  useEffect(() => {
    let active = true;
    void getGoogleStatus().then((status) => {
      if (!active) return;
      if (status.connected) {
        const account = status.email ?? status.displayName ?? "Google";
        connect("google-calendar", account);
        connect("google-drive", account);
      } else {
        disconnect("google-calendar");
        disconnect("google-drive");
      }
    }).catch(() => undefined);
    return () => { active = false; };
  }, [connect, disconnect]);

  useEffect(() => () => {
    if (connectTimerRef.current !== null) window.clearTimeout(connectTimerRef.current);
  }, []);

  const visible = limit ? integrations.slice(0, limit) : integrations;
  const selected = integrations.find((item) => item.id === selectedId);
  const SelectedIcon = selected?.icon;
  const resendRemainingSeconds = telegramResendAvailableAt ? Math.max(0, Math.ceil((telegramResendAvailableAt - now) / 1000)) : 0;

  const closeModal = () => {
    if (connectTimerRef.current !== null) {
      window.clearTimeout(connectTimerRef.current);
      connectTimerRef.current = null;
    }
    setConnectingId(null); setSelectedId(null); setUsername(""); setTelegramPhone(""); setTelegramCode(""); setTelegramPassword(""); setTelegramStep("phone"); setTelegramBusy(false); setTelegramError(null);
    setTelegramDelivery(null); setTelegramResendAvailableAt(null); setTelegramTemporaryError(false);
  };

  const finishTelegramConnection = async () => {
    const status = await getTelegramStatus();
    connect("telegram", status.username ?? status.displayName ?? "Telegram");
    closeModal();
  };

  const submitTelegramStep = async () => {
    if (telegramBusy) return;
    setTelegramBusy(true); setTelegramError(null);
    try {
      if (telegramStep === "phone") {
        const result = await connectTelegram(telegramPhone.trim());
        setTelegramDelivery(result.delivery);
        setTelegramResendAvailableAt(result.timeoutSeconds ? Date.now() + result.timeoutSeconds * 1000 : null);
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
    } finally {
      setTelegramBusy(false);
    }
  };

  const resendTelegramStep = async () => {
    if (telegramBusy || resendRemainingSeconds > 0) return;
    setTelegramBusy(true); setTelegramError(null);
    try {
      const result = await resendTelegramCode();
      setTelegramDelivery(result.delivery);
      setTelegramResendAvailableAt(result.timeoutSeconds ? Date.now() + result.timeoutSeconds * 1000 : null);
    } catch (error) {
      setTelegramError(errorMessage(error));
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
          return <article key={item.id} className={`integration-card integration-card--${item.color}`}>
            <div className="integration-card__top"><div className="integration-card__icon"><Icon size={20} /></div>{item.connected && <span className="integration-card__connected"><Check size={10} /> Ulangan</span>}</div>
            <div className="integration-card__info"><h3>{item.name}</h3><p>{item.description}</p></div>
            <button type="button" className={`integration-card__button ${item.connected ? "integration-card__button--connected" : ""}`} onClick={() => setSelectedId(item.id)}>{item.connected ? "Boshqarish" : connectingId === item.id ? "Ulanmoqda..." : "Ulash"}<ArrowUpRight size={13} /></button>
          </article>;
        })}
      </div>

      {selected && <div className="integration-modal__overlay" onClick={closeModal}>
        <div className="integration-modal" onClick={(event) => event.stopPropagation()}>
          <button type="button" className="integration-modal__close" onClick={closeModal} aria-label="Integratsiya oynasini yopish"><X size={17} /></button>
          <div className={`integration-modal__icon integration-modal__icon--${selected.color}`}>{SelectedIcon && <SelectedIcon size={23} />}</div>
          <h2>{selected.name}</h2>
          <p>{selected.id === "telegram" && selected.connected ? "Telegram ulangan" : selected.connected ? `${selected.name} Qulay AI bilan ulangan.` : `${selected.name}ni Qulay AI bilan ulang.`}</p>
          {selected.id === "telegram" && selected.connected && telegramTemporaryError && <span className="integration-modal__error">Telegram bilan vaqtinchalik aloqa muammosi</span>}

          {selected.connected ? <>
            <div className="integration-modal__security"><ShieldCheck size={17} /><div><strong>Ulangan hisob</strong><span>{selected.username || "Faol ulanish"}</span></div></div>
            <button type="button" className="integration-modal__connect integration-modal__connect--danger" onClick={() => void disconnectSelected()} disabled={telegramBusy}><Unlink size={15} /> {telegramBusy ? "Uzilmoqda..." : selected.id === "telegram" ? "Uzish" : "Ulanishni uzish"}</button>
            {telegramError && <span className="integration-modal__error">{telegramError}</span>}
          </> : selected.id === "telegram" ? <>
            <label className="integration-modal__label">{telegramStep === "phone" ? "Telefon raqam" : telegramStep === "code" ? "Telegram kodi" : "2FA parol"}</label>
            {telegramStep === "phone" && <input type="tel" className="integration-modal__field" placeholder="+998901234567" value={telegramPhone} onChange={(event) => setTelegramPhone(event.target.value)} autoComplete="tel" />}
            {telegramStep === "code" && <input type="text" inputMode="numeric" className="integration-modal__field" placeholder="12345" value={telegramCode} onChange={(event) => setTelegramCode(event.target.value)} autoComplete="one-time-code" />}
            {telegramStep === "password" && <input type="password" className="integration-modal__field" placeholder="Telegram 2FA paroli" value={telegramPassword} onChange={(event) => setTelegramPassword(event.target.value)} autoComplete="current-password" />}
            {telegramStep === "code" && <span className="integration-modal__note integration-modal__note--delivery">{telegramDeliveryMessage(telegramDelivery)}</span>}
            {telegramError && <span className="integration-modal__error">{telegramError}</span>}
            <button type="button" className="integration-modal__connect" onClick={() => void submitTelegramStep()} disabled={telegramBusy}>{telegramBusy ? "Tekshirilmoqda..." : telegramStep === "phone" ? "Kodni yuborish" : telegramStep === "code" ? "Kodni tasdiqlash" : "Ulanishni yakunlash"}<ExternalLink size={15} /></button>
            {telegramStep === "code" && <button type="button" className="integration-modal__resend" onClick={() => void resendTelegramStep()} disabled={telegramBusy || resendRemainingSeconds > 0}>{resendRemainingSeconds > 0 ? `Qayta yuborish (${resendRemainingSeconds}s)` : "Qayta yuborish"}</button>}
            <span className="integration-modal__note">Session Qulay AI serverida shifrlangan holda saqlanadi.</span>
          </> : (selected.id === "google-calendar" || selected.id === "google-drive") ? <>
            <button type="button" className="integration-modal__connect" onClick={() => { if (connectingId) return; setConnectingId(selected.id); void getGoogleConnectUrl().then(({ url }) => { window.location.assign(url); }).catch((error) => { setTelegramError(errorMessage(error)); setConnectingId(null); }); }} disabled={connectingId === selected.id}>{connectingId === selected.id ? "Google oynatilmoqda..." : "Google bilan ulash"}<ExternalLink size={15} /></button>
            {telegramError && <span className="integration-modal__error">{telegramError}</span>}
            <span className="integration-modal__note">Google OAuth oynasida Calendar va Drive ruxsatlarini tasdiqlang.</span>
          </> : <>
            <label className="integration-modal__label">Username</label>
            <input type="text" className="integration-modal__field" placeholder="@username" value={username} onChange={(event) => setUsername(event.target.value)} />
            <button type="button" className="integration-modal__connect" onClick={() => { if (connectingId) return; setConnectingId(selected.id); connectTimerRef.current = window.setTimeout(() => { connect(selected.id, username); closeModal(); }, 650); }} disabled={connectingId === selected.id}>{connectingId === selected.id ? "Ulanmoqda..." : `${selected.name}ni ulash`}<ExternalLink size={15} /></button>
            <span className="integration-modal__note">OAuth ulanishi keyingi bosqichda qo‘shiladi.</span>
          </>}
        </div>
      </div>}
    </>
  );
};

export default IntegrationHub;
