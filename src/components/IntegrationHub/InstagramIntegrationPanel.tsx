import { ExternalLink, Image as ImageIcon, RefreshCw, Trash2, Unlink } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ApiError } from "../../services/api/apiClient";
import {
  connectInstagram,
  createInstagramAutomation,
  deleteInstagramAutomation,
  disconnectInstagram,
  getInstagramAutomations,
  getInstagramPosts,
  getInstagramStatus,
  testInstagram,
  updateInstagramAutomation,
  updateInstagramSalesAgentSettings,
  type InstagramCommentAutomation,
  type InstagramPost,
  type InstagramStatus,
} from "../../services/integrationService";

type Props = {
  salesAllowed: boolean;
  onConnectionChange: (status: InstagramStatus) => void;
  onDisconnected: () => void;
  onUpgrade: () => void;
};

const errorMessage = (error: unknown, fallback: string) => error instanceof ApiError ? error.message : fallback;

export const InstagramIntegrationPanel = ({ salesAllowed, onConnectionChange, onDisconnected, onUpgrade }: Props) => {
  const [status, setStatus] = useState<InstagramStatus | null>(null);
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [automations, setAutomations] = useState<InstagramCommentAutomation[]>([]);
  const [instagramUserId, setInstagramUserId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMediaId, setSelectedMediaId] = useState("");
  const [triggerText, setTriggerText] = useState("promt");
  const [dmMessage, setDmMessage] = useState("");
  const [replyPublicly, setReplyPublicly] = useState(true);
  const [publicReply, setPublicReply] = useState("Directga yubordim ✅");
  const [semanticMatch, setSemanticMatch] = useState(true);

  const connected = status?.connected === true;

  const loadInstagramData = useCallback(async (nextStatus?: InstagramStatus) => {
    const current = nextStatus ?? await getInstagramStatus();
    setStatus(current);
    onConnectionChange(current);
    if (!current.connected) {
      setPosts([]);
      setAutomations([]);
      return;
    }
    setLoadingPosts(true);
    try {
      const [nextPosts, nextAutomations] = await Promise.all([
        getInstagramPosts(30).catch(() => [] as InstagramPost[]),
        getInstagramAutomations(false).catch(() => [] as InstagramCommentAutomation[]),
      ]);
      setPosts(nextPosts);
      setAutomations(nextAutomations);
      setSelectedMediaId((value) => value || nextPosts[0]?.id || "");
    } finally {
      setLoadingPosts(false);
    }
  }, [onConnectionChange]);

  useEffect(() => {
    let active = true;
    void getInstagramStatus().then((current) => {
      if (!active) return;
      setStatus(current);
      onConnectionChange(current);
      if (current.connected) void loadInstagramData(current);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [loadInstagramData, onConnectionChange]);

  const selectedPost = useMemo(() => posts.find((post) => post.id === selectedMediaId) ?? null, [posts, selectedMediaId]);

  const submitConnect = async () => {
    if (busy || !instagramUserId.trim() || !accessToken.trim()) return;
    setBusy(true); setError(null);
    try {
      const next = await connectInstagram({ instagramUserId: instagramUserId.trim(), accessToken: accessToken.trim() });
      setAccessToken("");
      await loadInstagramData(next);
    } catch (err) {
      setError(errorMessage(err, "Instagramni ulab bo‘lmadi."));
    } finally { setBusy(false); }
  };

  const updateSetting = async (patch: Partial<Pick<InstagramStatus, "enabled" | "dmEnabled" | "commentsEnabled" | "imageVisionEnabled">>) => {
    if (busy || !status) return;
    setBusy(true); setError(null);
    try {
      const next = await updateInstagramSalesAgentSettings(patch);
      setStatus(next); onConnectionChange(next);
    } catch (err) { setError(errorMessage(err, "Instagram AI sozlamasini saqlab bo‘lmadi.")); }
    finally { setBusy(false); }
  };

  const testConnection = async () => {
    if (busy) return;
    setBusy(true); setError(null);
    try { await loadInstagramData(await testInstagram()); }
    catch (err) { setError(errorMessage(err, "Instagram ulanishini tekshirib bo‘lmadi.")); }
    finally { setBusy(false); }
  };

  const doDisconnect = async () => {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      await disconnectInstagram();
      const next = await getInstagramStatus();
      setStatus(next); setPosts([]); setAutomations([]); onDisconnected(); onConnectionChange(next);
    } catch (err) { setError(errorMessage(err, "Instagram ulanishini uzib bo‘lmadi.")); }
    finally { setBusy(false); }
  };

  const createAutomation = async () => {
    if (busy || !selectedMediaId || !triggerText.trim() || !dmMessage.trim()) return;
    setBusy(true); setError(null);
    try {
      const created = await createInstagramAutomation({
        mediaId: selectedMediaId,
        triggerText: triggerText.trim(),
        dmMessage: dmMessage.trim(),
        semanticMatch,
        sendPrivateReply: true,
        replyPublicly,
        publicReply: replyPublicly ? publicReply.trim() || "Directga yubordim ✅" : undefined,
        active: true,
      });
      setAutomations((items) => [created, ...items.filter((item) => item.id !== created.id)]);
      setDmMessage("");
    } catch (err) { setError(errorMessage(err, "Instagram comment automation yaratilmadi.")); }
    finally { setBusy(false); }
  };

  const toggleAutomation = async (automation: InstagramCommentAutomation) => {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const updated = await updateInstagramAutomation(automation.id, { active: !automation.active });
      setAutomations((items) => items.map((item) => item.id === updated.id ? updated : item));
    } catch (err) { setError(errorMessage(err, "Automation holatini o‘zgartirib bo‘lmadi.")); }
    finally { setBusy(false); }
  };

  const removeAutomation = async (automation: InstagramCommentAutomation) => {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      await deleteInstagramAutomation(automation.id);
      setAutomations((items) => items.filter((item) => item.id !== automation.id));
    } catch (err) { setError(errorMessage(err, "Automationni o‘chirib bo‘lmadi.")); }
    finally { setBusy(false); }
  };

  if (!status) return <span className="integration-modal__note">Instagram holati tekshirilmoqda...</span>;

  if (!connected) return <div className="instagram-integration-panel">
    {status.configured === false && <span className="integration-modal__error">Instagram server sozlamalari hali tayyor emas. Render ENV’da Instagram App Secret, webhook verify token va encryption key sozlanishi kerak.</span>}
    <div className="integration-modal__advanced integration-modal__advanced--manual">
      <div className="integration-modal__manual-head"><strong>Instagram Professional akkauntini ulash</strong><span>Meta Graph API</span></div>
      <label className="integration-modal__label">Instagram User ID</label>
      <input className="integration-modal__field" inputMode="numeric" placeholder="1784..." value={instagramUserId} onChange={(event) => setInstagramUserId(event.target.value.replace(/\D/g, ""))} />
      <label className="integration-modal__label">Access Token</label>
      <input className="integration-modal__field" type="password" placeholder="Meta access token" autoComplete="off" value={accessToken} onChange={(event) => setAccessToken(event.target.value)} />
      <button type="button" className="integration-modal__connect" disabled={busy || status.configured === false || !instagramUserId || !accessToken} onClick={() => void submitConnect()}>{busy ? "Tekshirilmoqda..." : "Instagramni ulash"}<ExternalLink size={15} /></button>
      <span className="integration-modal__note">Token faqat backendda shifrlangan holda saqlanadi. DM, comment va postlar professional Instagram akkaunti orqali ishlaydi.</span>
      <a className="integration-modal__guide-link" href="https://developers.facebook.com/apps/" target="_blank" rel="noreferrer">Meta Developers’ni ochish <ExternalLink size={13} /></a>
    </div>
    {error && <span className="integration-modal__error">{error}</span>}
  </div>;

  return <div className="instagram-integration-panel">
    <div className="integration-modal__sales-agent">
      <div className="integration-modal__sales-agent-head">
        <div><strong>Instagram AI sotuv agenti</strong><span>DM, comment va mijoz yuborgan mahsulot rasmlarini bitta Sales Brain tushunadi.</span></div>
        {salesAllowed ? <button type="button" role="switch" aria-checked={status.enabled} className={`integration-modal__switch ${status.enabled ? "is-on" : ""}`} disabled={busy} onClick={() => void updateSetting({ enabled: !status.enabled })}><span /></button> : null}
      </div>
      {!salesAllowed ? <button type="button" className="integration-modal__connect" onClick={onUpgrade}>Sales AI tarifini ko‘rish</button> : <>
        <div className="integration-modal__sales-options">
          <label><input type="checkbox" checked={status.dmEnabled} disabled={busy || !status.enabled} onChange={(event) => void updateSetting({ dmEnabled: event.target.checked })} /><span><strong>Instagram Direct</strong><small>Mijoz DM’da yozsa sotuv suhbatini davom ettiradi.</small></span></label>
          <label><input type="checkbox" checked={status.commentsEnabled} disabled={busy || !status.enabled} onChange={(event) => void updateSetting({ commentsEnabled: event.target.checked })} /><span><strong>Commentlar</strong><small>Sotuv commentlariga javob beradi va automation triggerlarini bajaradi.</small></span></label>
          <label><input type="checkbox" checked={status.imageVisionEnabled} disabled={busy || !status.enabled} onChange={(event) => void updateSetting({ imageVisionEnabled: event.target.checked })} /><span><strong>Rasmni tushunish</strong><small>“Bunaqasi bormi?” kabi rasmli savolni ko‘rib, keyin real katalog/saqlangan product knowledge bilan tekshiradi.</small></span></label>
        </div>
        <div className="integration-modal__sales-status"><span className={status.enabled ? "is-active" : ""} />{status.enabled ? "Agent faol" : "Agent o‘chiq"}</div>
      </>}
      <div className="integration-modal__health"><small>@{status.username ?? status.instagramUserId ?? "Instagram"}</small><small>Webhook: {status.webhookSubscribed ? "ulangan" : "Meta panelda tekshirish kerak"}</small></div>
      <button type="button" className="integration-modal__connect" disabled={busy} onClick={() => void testConnection()}><RefreshCw size={15} /> {busy ? "Tekshirilmoqda..." : "Ulanishni tekshirish"}</button>
    </div>

    {salesAllowed && <div className="instagram-automation">
      <div className="instagram-automation__head"><div><strong>Comment → Direct automation</strong><span>Masalan postga “promt” yozganlarga avtomatik DM yuborish.</span></div><button type="button" className="integration-modal__resend" disabled={loadingPosts || busy} onClick={() => void loadInstagramData()}><RefreshCw size={13} /> Postlarni yangilash</button></div>
      {loadingPosts ? <span className="integration-modal__note">Instagram postlari yuklanmoqda...</span> : posts.length === 0 ? <span className="integration-modal__note">Post topilmadi. Instagram permission/webhook sozlamasini tekshiring.</span> : <div className="instagram-posts">
        {posts.map((post) => <button type="button" key={post.id} className={`instagram-post ${selectedMediaId === post.id ? "is-selected" : ""}`} onClick={() => setSelectedMediaId(post.id)}>
          {(post.thumbnailUrl || post.mediaUrl) ? <img src={post.thumbnailUrl || post.mediaUrl || ""} alt="Instagram post" /> : <span className="instagram-post__placeholder"><ImageIcon size={20} /></span>}
          <span><strong>{post.caption?.trim().slice(0, 70) || post.mediaType || "Instagram post"}</strong><small>{post.timestamp ? new Date(post.timestamp).toLocaleDateString("uz-UZ") : post.id}</small></span>
        </button>)}
      </div>}
      {selectedPost && <div className="instagram-automation__form">
        <span className="integration-modal__note">Tanlangan post: {selectedPost.caption?.trim().slice(0, 100) || selectedPost.id}</span>
        <label className="integration-modal__label">Trigger / ma’no</label>
        <input className="integration-modal__field" placeholder="promt" value={triggerText} onChange={(event) => setTriggerText(event.target.value)} />
        <label className="integration-modal__label">Directga yuboriladigan xabar</label>
        <textarea className="integration-modal__field instagram-automation__textarea" placeholder="Mana so‘ragan promptingiz..." value={dmMessage} onChange={(event) => setDmMessage(event.target.value)} />
        <label className="instagram-automation__check"><input type="checkbox" checked={semanticMatch} onChange={(event) => setSemanticMatch(event.target.checked)} /><span>Typo va ma’nodosh commentlarni ham tushunsin</span></label>
        <label className="instagram-automation__check"><input type="checkbox" checked={replyPublicly} onChange={(event) => setReplyPublicly(event.target.checked)} /><span>Commentga ham javob yozsin</span></label>
        {replyPublicly && <input className="integration-modal__field" placeholder="Directga yubordim ✅" value={publicReply} onChange={(event) => setPublicReply(event.target.value)} />}
        <button type="button" className="integration-modal__connect" disabled={busy || !selectedMediaId || !triggerText.trim() || !dmMessage.trim()} onClick={() => void createAutomation()}>{busy ? "Saqlanmoqda..." : "Automation yaratish"}</button>
      </div>}

      {automations.length > 0 && <div className="instagram-automation__list">
        <strong>Faol automationlar</strong>
        {automations.map((automation) => <div className="instagram-automation__row" key={automation.id}>
          <div><strong>{automation.triggerText}</strong><small>{automation.mediaCaption?.trim().slice(0, 90) || `Post ${automation.mediaId}`}</small></div>
          <button type="button" className={`integration-modal__switch ${automation.active ? "is-on" : ""}`} role="switch" aria-checked={automation.active} disabled={busy} onClick={() => void toggleAutomation(automation)}><span /></button>
          <button type="button" className="instagram-automation__delete" aria-label="Automationni o‘chirish" disabled={busy} onClick={() => void removeAutomation(automation)}><Trash2 size={15} /></button>
        </div>)}
      </div>}
    </div>}

    {error && <span className="integration-modal__error">{error}</span>}
    <button type="button" className="integration-modal__connect integration-modal__connect--danger" disabled={busy} onClick={() => void doDisconnect()}><Unlink size={15} /> {busy ? "Uzilmoqda..." : "Ulanishni uzish"}</button>
  </div>;
};
