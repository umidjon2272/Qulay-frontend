import { ArrowUpRight, Download, FileImage, FileSpreadsheet, FileText, Folder, Grid3X3, List, MoreHorizontal, Plus, Search, Star, Upload, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ConfirmDialog from "../../components/ConfirmDialog/ConfirmDialog";
import { useAIChat } from "../../features/ai/hooks/useAIChat";
import { useCloseOnOutsideClick } from "../../hooks/useCloseOnOutsideClick";
import { useToast } from "../../hooks/useToast";
import { ApiError, getApiErrorMessage } from "../../services/api/apiClient";
import { createFolder, deleteFile, deleteFolder, downloadFile, getFileContent, listFiles, listFolders, updateFolder, uploadFileWithProgress } from "../../services/api/fileApi";
import type { ApiFile, ApiFolder } from "../../services/api/types";
import { useI18n } from "../../i18n/useI18n";
import "./Files.scss";

const supportedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf", "text/plain", "text/csv", "application/json", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
const maxFileSizeMb = Number(import.meta.env.VITE_FILE_MAX_SIZE_MB ?? 20);
const maxFileSize = maxFileSizeMb * 1024 * 1024;
const formatSize = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const fileType = (file: ApiFile) => (file.extension || file.mimeType.split("/").pop() || "FILE").toUpperCase();
const iconFor = (file: ApiFile) => file.mimeType.startsWith("image/") ? FileImage : file.mimeType.includes("sheet") || file.mimeType === "text/csv" ? FileSpreadsheet : FileText;
const colorFor = (file: ApiFile) => file.mimeType.startsWith("image/") ? "blue" : file.mimeType === "application/pdf" ? "purple" : file.mimeType.includes("sheet") || file.mimeType === "text/csv" ? "green" : "orange";

const Files = () => {
  const [files, setFiles] = useState<ApiFile[]>([]);
  const [folders, setFolders] = useState<ApiFolder[]>([]);
  const [folderId, setFolderId] = useState<string | undefined>();
  const [view, setView] = useState<"grid" | "list">(() => typeof window !== "undefined" && window.innerWidth <= 700 ? "list" : "grid");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState<Record<string, number>>({});
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ file: ApiFile; url?: string; text?: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ApiFile | null>(null);
  const [folderDialog, setFolderDialog] = useState<{ mode: "create" | "rename"; name: string } | null>(null);
  const [pendingFolderDelete, setPendingFolderDelete] = useState(false);
  const [folderBusy, setFolderBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { open: openAIChat } = useAIChat();
  const { showToast } = useToast();
  const { t, locale } = useI18n();

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const [fileResult, folderResult] = await Promise.all([listFiles({ search: search.trim() || undefined, folderId, limit: 100 }), listFolders()]); setFiles(fileResult.items); setFolders(folderResult); }
    catch (caught) { setError(getApiErrorMessage(caught, "Fayllarni yuklashda xatolik yuz berdi.")); }
    finally { setLoading(false); }
  }, [folderId, search]);
  useEffect(() => { void load(); }, [load]);
  useCloseOnOutsideClick(openMenu !== null, () => setOpenMenu(null));
  useEffect(() => () => { if (preview?.url) URL.revokeObjectURL(preview.url); }, [preview]);

  const handleFiles = async (selected: FileList | null) => {
    if (!selected?.length) return;
    for (const file of Array.from(selected)) {
      if (!supportedTypes.includes(file.type)) { showToast(`${file.name}: bu fayl turi qo'llab-quvvatlanmaydi`, "error"); continue; }
      if (file.size > maxFileSize) { showToast(`${file.name}: maksimal hajm ${maxFileSizeMb} MB`, "error"); continue; }
      setUploading((current) => ({ ...current, [file.name]: 0 }));
      try { await uploadFileWithProgress(file, { folderId, onProgress: (progress) => setUploading((current) => ({ ...current, [file.name]: progress })) }); showToast(`${file.name} yuklandi`, "success"); }
      catch (caught) { showToast(`${file.name}: ${caught instanceof ApiError ? getApiErrorMessage(caught) : "yuklash amalga oshmadi"}`, "error"); }
      finally { setUploading((current) => { const next = { ...current }; delete next[file.name]; return next; }); }
    }
    await load();
  };
  const requestRemove = (file: ApiFile) => { setPendingDelete(file); setOpenMenu(null); };
  const confirmRemove = async () => { if (!pendingDelete) return; try { await deleteFile(pendingDelete.id); showToast("Fayl o'chirildi", "success"); await load(); } catch (caught) { showToast(getApiErrorMessage(caught, "Faylni o'chirib bo'lmadi."), "error"); } finally { setPendingDelete(null); } };
  const openFile = async (file: ApiFile) => {
    setOpenMenu(null);
    try {
      if (!file.mimeType.startsWith("image/")) {
        const extracted = await getFileContent(file.id);
        if (extracted.extractedText) { setPreview({ file, text: extracted.extractedText }); return; }
      }
      const blob = await downloadFile(file.id); if (file.mimeType.startsWith("image/")) setPreview({ file, url: URL.createObjectURL(blob) }); else if (["text/plain", "text/csv", "application/json"].includes(file.mimeType)) setPreview({ file, text: await blob.text() }); else { const url = URL.createObjectURL(blob); window.open(url, "_blank", "noopener,noreferrer"); setTimeout(() => URL.revokeObjectURL(url), 60_000); }
    }
    catch (caught) { showToast(getApiErrorMessage(caught, "Faylni ochib bo'lmadi."), "error"); }
  };
  const createNewFolder = () => setFolderDialog({ mode: "create", name: "" });
  const editCurrentFolder = () => {
    const folder = folders.find((item) => item.id === folderId);
    if (!folder) return;
    setFolderDialog({ mode: "rename", name: folder.name });
  };
  const saveFolderDialog = async () => {
    if (!folderDialog || folderBusy) return;
    const name = folderDialog.name.trim();
    if (name.length < 2) { showToast("Papka nomi kamida 2 ta belgidan iborat bo'lsin", "error"); return; }
    const current = folders.find((folder) => folder.id === folderId);
    const targetParentId = folderDialog.mode === "rename" ? (current?.parentId ?? null) : (folderId ?? null);
    const duplicate = folders.some((folder) => folder.parentId === targetParentId && folder.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase() && folder.id !== folderId);
    if (duplicate) { showToast("Bu nomli papka allaqachon mavjud", "error"); return; }
    setFolderBusy(true);
    try {
      if (folderDialog.mode === "create") await createFolder(name, folderId);
      else if (folderId) await updateFolder(folderId, name);
      await load();
      setFolderDialog(null);
      showToast(folderDialog.mode === "create" ? "Papka yaratildi" : "Papka nomi yangilandi", "success");
    } catch (caught) {
      showToast(getApiErrorMessage(caught, folderDialog.mode === "create" ? "Papka yaratilmadi." : "Papka yangilanmadi."), "error");
    } finally { setFolderBusy(false); }
  };
  const removeCurrentFolder = () => { if (folderId) setPendingFolderDelete(true); };
  const confirmRemoveCurrentFolder = async () => {
    if (!folderId) return;
    try { await deleteFolder(folderId); setFolderId(undefined); await load(); showToast("Papka o'chirildi", "success"); }
    catch (caught) { showToast(getApiErrorMessage(caught, "Papka o'chirilmadi."), "error"); }
    finally { setPendingFolderDelete(false); }
  };
  const downloadSelectedFile = async (file: ApiFile) => {
    setOpenMenu(null);
    try {
      const blob = await downloadFile(file.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.originalName || "fayl";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (caught) { showToast(getApiErrorMessage(caught, "Faylni yuklab bo'lmadi."), "error"); }
  };
  const currentFolder = folders.find((folder) => folder.id === folderId);
  const childFolders = useMemo(() => folders.filter((folder) => folder.parentId === folderId), [folders, folderId]);

  return <main className="files-page">
    <header className="files-page__header"><div><span className="files-page__eyebrow">YOUR WORKSPACE</span><h1>{t("files.title", "Fayllar")}</h1><p>{t("files.subtitle", "Hujjatlaringizni real backend’da xavfsiz saqlang va boshqaring.")}</p></div><div className="files-page__actions"><button type="button" className="files-page__secondary" onClick={() => inputRef.current?.click()}><Upload size={15} />{t("files.upload", "Yuklash")}</button><button type="button" className="files-page__primary" onClick={createNewFolder}><Plus size={15} />{t("files.folder", "Papka yaratish")}</button><input ref={inputRef} type="file" hidden multiple accept={supportedTypes.join(",")} onChange={(event) => { void handleFiles(event.target.files); event.currentTarget.value = ""; }} /></div></header>
    <div className="files-toolbar"><label className="files-toolbar__search"><Search size={15} /><span className="sr-only">Fayllardan qidirish</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("files.search", "Fayllardan qidirish...")} aria-label="Fayllardan qidirish" /></label><div className="files-toolbar__right"><button type="button" className={view === "grid" ? "is-active" : ""} onClick={() => setView("grid")} aria-label="Grid ko'rinishi"><Grid3X3 size={15} /></button><button type="button" className={view === "list" ? "is-active" : ""} onClick={() => setView("list")} aria-label="List ko'rinishi"><List size={15} /></button></div></div>
    <section className="files-section"><div className="files-section__heading"><div><span>COLLECTIONS</span><h2>{currentFolder ? currentFolder.name : t("files.folders", "Papkalar")}</h2></div><span className="files-count">{files.length} ta fayl</span></div>{currentFolder && <div className="files-page__actions"><button type="button" className="files-page__secondary" onClick={() => setFolderId(currentFolder.parentId || undefined)}>← {t("files.back", "Orqaga")}</button><button type="button" className="files-page__secondary" onClick={() => void editCurrentFolder()}>{t("files.rename", "Nomini o'zgartirish")}</button><button type="button" className="files-page__secondary" onClick={() => void removeCurrentFolder()}>{t("files.delete", "O'chirish")}</button></div>}<div className="folders">{childFolders.map((folder) => <button type="button" className="folder-card" key={folder.id} onClick={() => setFolderId(folder.id)}><div className="folder-card__icon"><Folder size={19} /></div><div><strong>{folder.name}</strong><span>{folder._count?.files ?? 0} fayl</span></div><ArrowUpRight className="folder-card__arrow" size={14} /></button>)}{!currentFolder && files.length > 0 && <div className="folder-card folder-card--summary" aria-label="Barcha fayllar"><div className="folder-card__icon"><Star size={19} /></div><div><strong>{t("files.all", "Barcha fayllar")}</strong><span>{files.length} fayl asosiy katalogda</span></div></div>}</div></section>
    <section className="files-section"><div className="files-section__heading"><div><span>RECENT</span><h2>{t("files.recent", "So'nggi fayllar")}</h2></div><span className="files-count">{t("files.safe", "Xavfsiz saqlash")}</span></div><div className={`file-list ${view === "list" ? "file-list--list" : ""}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void handleFiles(event.dataTransfer.files); }}>{Object.entries(uploading).map(([name, progress]) => <div className="files-empty" key={name}><strong>{name} yuklanmoqda… {progress}%</strong><span>{"█".repeat(Math.max(1, Math.round(progress / 10)))}{"░".repeat(10 - Math.max(1, Math.round(progress / 10)))}</span></div>)}{loading && <div className="files-empty"><strong>Fayllar yuklanmoqda…</strong></div>}{!loading && error && <div className="files-empty"><strong>{error}</strong><button type="button" onClick={() => void load()}>{t("common.retry", "Qayta urinish")}</button></div>}{!loading && !error && files.map((file) => { const Icon = iconFor(file); const open = openMenu === file.id; return <article className={`file-card ${open ? "file-card--menu-open" : ""}`} key={file.id}><button type="button" className={`file-card__icon file-card__icon--${colorFor(file)}`} onClick={() => void openFile(file)} aria-label={`${file.originalName} faylini ochish`}><Icon size={19} /></button><div className="file-card__info"><strong>{file.label || file.originalName}</strong><span>{fileType(file)} · {formatSize(file.sizeBytes)} · {file.source === "GOOGLE_DRIVE" ? "Google Drive" : file.source === "TELEGRAM" ? "Telegram" : "Yuklangan"}</span></div><div className="file-card__date">{new Date(file.createdAt).toLocaleDateString(locale === "ru" ? "ru-RU" : "uz-UZ")}</div><div className="file-card__menu-wrap"><button type="button" className="file-card__more" onClick={() => setOpenMenu(open ? null : file.id)} aria-label="Fayl amallarini ochish"><MoreHorizontal size={17} /></button>{open && <div className="file-card__dropdown"><button type="button" onClick={() => void openFile(file)}>{t("files.open", "Ochish")}</button><button type="button" onClick={() => void downloadSelectedFile(file)}><Download size={14} />{t("files.download", "Yuklab olish")}</button><button type="button" className="danger" onClick={() => requestRemove(file)}>{t("files.delete", "O'chirish")}</button></div>}</div></article>; })}{!loading && !error && files.length === 0 && <div className="files-empty"><Search size={22} /><strong>{t("files.empty", "Fayllar hali yo'q")}</strong><span>{t("files.emptyHelp", "Faylni shu yerga sudrab olib keling yoki Yuklash tugmasini bosing.")}</span></div>}</div></section>
    <section className="files-ai"><div className="files-ai__icon"><Star size={19} /></div><div><span>QULAY AI</span><h2>PDF, Word va Excel bilan ishlang</h2><p>Yuklangan hujjat matni xavfsiz ajratiladi; AI undan qidiradi va savollarga javob beradi.</p></div><button type="button" onClick={openAIChat}>Qulay AI<ArrowUpRight size={14} /></button></section>
    {preview && <div className="file-preview__overlay" onClick={() => setPreview(null)}><div className="file-preview" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><button type="button" onClick={() => setPreview(null)} aria-label="Previewni yopish"><X size={16} /></button><h2>{preview.file.originalName}</h2>{preview.url && <img src={preview.url} alt={preview.file.originalName} />}{preview.text !== undefined && <pre>{preview.text}</pre>}<p>{fileType(preview.file)} · {formatSize(preview.file.sizeBytes)}</p></div></div>}
    {folderDialog && <div className="folder-dialog__overlay" onClick={() => !folderBusy && setFolderDialog(null)}><form className="folder-dialog" onSubmit={(event) => { event.preventDefault(); void saveFolderDialog(); }} onClick={(event) => event.stopPropagation()}>
      <button type="button" className="folder-dialog__close" onClick={() => setFolderDialog(null)} aria-label="Papka oynasini yopish"><X size={16} /></button>
      <div className="folder-dialog__icon"><Folder size={20} /></div>
      <h2>{folderDialog.mode === "create" ? t("files.newFolder", "Yangi papka") : t("files.rename", "Papka nomini o'zgartirish")}</h2>
      <p>{folderDialog.mode === "create" ? "Fayllaringizni tartibli saqlash uchun papkaga aniq nom bering." : "Yangi nom shu workspace ichida yagona bo'lishi kerak."}</p>
      <label>{t("files.folderName", "Papka nomi")}<input autoFocus maxLength={80} value={folderDialog.name} onChange={(event) => setFolderDialog((current) => current ? { ...current, name: event.target.value } : current)} placeholder="Masalan: Shartnomalar" /></label>
      <div className="folder-dialog__actions"><button type="button" onClick={() => setFolderDialog(null)} disabled={folderBusy}>{t("files.cancel", "Bekor qilish")}</button><button type="submit" className="is-primary" disabled={folderBusy}>{folderBusy ? t("common.loading", "Saqlanmoqda...") : folderDialog.mode === "create" ? t("files.create", "Yaratish") : t("files.save", "Saqlash")}</button></div>
    </form></div>}
    {pendingDelete && <ConfirmDialog title="Faylni o'chirish" description={`"${pendingDelete.originalName}" faylini o'chirishni tasdiqlaysizmi?`} confirmLabel="O'chirish" onConfirm={confirmRemove} onCancel={() => setPendingDelete(null)} />}
    {pendingFolderDelete && <ConfirmDialog title="Papkani o'chirish" description="Papka o'chiriladi. Ichidagi fayllar asosiy katalogga ko'chiriladi. Davom etilsinmi?" confirmLabel="O'chirish" onConfirm={confirmRemoveCurrentFolder} onCancel={() => setPendingFolderDelete(false)} />}
  </main>;
};

export default Files;
