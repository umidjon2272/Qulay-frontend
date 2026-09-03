import { ArrowUpRight, Download, FileImage, FileSpreadsheet, FileText, Folder, Grid3X3, List, MoreHorizontal, Plus, Search, Star, Upload, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ConfirmDialog from "../../components/ConfirmDialog/ConfirmDialog";
import { useAIChat } from "../../features/ai/hooks/useAIChat";
import { useCloseOnOutsideClick } from "../../hooks/useCloseOnOutsideClick";
import { useToast } from "../../hooks/useToast";
import { ApiError, getApiErrorMessage } from "../../services/api/apiClient";
import { createFolder, deleteFile, deleteFolder, downloadFile, getFileContent, listFiles, listFolders, updateFile, updateFolder, uploadFileWithProgress } from "../../services/api/fileApi";
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
  const [fileDialog, setFileDialog] = useState<{ file: ApiFile; mode: 'rename' | 'move'; value: string } | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const loadRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { open: openAIChat } = useAIChat();
  const { showToast } = useToast();
  const { t, locale } = useI18n();

  const load = useCallback(async () => {
    loadRef.current?.abort();
    const controller = new AbortController(); loadRef.current = controller;
    setLoading(true); setError("");
    try {
      const [fileResult, folderResult] = await Promise.all([listFiles({ search: search.trim() || undefined, folderId: folderId ?? (search.trim() ? undefined : 'root'), page, limit: 50 }, controller.signal), listFolders(controller.signal)]);
      if (controller.signal.aborted) return;
      setFiles(fileResult.items); setTotal(fileResult.meta.total); setFolders(folderResult);
      if (page > Math.max(1, fileResult.meta.totalPages)) setPage(Math.max(1, fileResult.meta.totalPages));
    }
    catch (caught) { if (!controller.signal.aborted) setError(getApiErrorMessage(caught, t("files.loadError", "Fayllarni yuklashda xatolik yuz berdi."))); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }, [folderId, search, page, t]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 180); return () => { window.clearTimeout(timer); loadRef.current?.abort(); }; }, [load]);
  useEffect(() => { setPage(1); }, [folderId, search]);
  useCloseOnOutsideClick(openMenu !== null, () => setOpenMenu(null));
  useEffect(() => () => { if (preview?.url) URL.revokeObjectURL(preview.url); }, [preview]);

  const handleFiles = async (selected: FileList | null) => {
    if (!selected?.length) return;
    for (const file of Array.from(selected)) {
      if (!supportedTypes.includes(file.type)) { showToast(t("files.unsupportedType", "{name}: bu fayl turi qo'llab-quvvatlanmaydi", { name: file.name }), "error"); continue; }
      if (file.size > maxFileSize) { showToast(t("files.tooLarge", "{name}: maksimal hajm {size} MB", { name: file.name, size: maxFileSizeMb }), "error"); continue; }
      setUploading((current) => ({ ...current, [file.name]: 0 }));
      try { await uploadFileWithProgress(file, { folderId, onProgress: (progress) => setUploading((current) => ({ ...current, [file.name]: progress })) }); showToast(t("files.uploaded", "{name} yuklandi", { name: file.name }), "success"); }
      catch (caught) { showToast(`${file.name}: ${caught instanceof ApiError ? getApiErrorMessage(caught) : t("files.uploadFailed", "yuklash amalga oshmadi")}`, "error"); }
      finally { setUploading((current) => { const next = { ...current }; delete next[file.name]; return next; }); }
    }
    await load();
  };
  const requestRemove = (file: ApiFile) => { setPendingDelete(file); setOpenMenu(null); };
  const confirmRemove = async () => { if (!pendingDelete) return; try { await deleteFile(pendingDelete.id); showToast(t("files.deleted", "Fayl o'chirildi"), "success"); await load(); } catch (caught) { showToast(getApiErrorMessage(caught, t("files.deleteError", "Faylni o'chirib bo'lmadi.")), "error"); } finally { setPendingDelete(null); } };
  const openFile = async (file: ApiFile) => {
    setOpenMenu(null);
    try {
      if (!file.mimeType.startsWith("image/")) {
        const extracted = await getFileContent(file.id).catch(() => null);
        if (extracted?.extractedText) { setPreview({ file, text: extracted.extractedText }); return; }
      }
      const blob = await downloadFile(file.id); if (file.mimeType.startsWith("image/")) setPreview({ file, url: URL.createObjectURL(blob) }); else if (["text/plain", "text/csv", "application/json"].includes(file.mimeType)) setPreview({ file, text: await blob.text() }); else { const url = URL.createObjectURL(blob); window.open(url, "_blank", "noopener,noreferrer"); setTimeout(() => URL.revokeObjectURL(url), 60_000); }
    }
    catch (caught) { showToast(getApiErrorMessage(caught, t("files.openError", "Faylni ochib bo'lmadi.")), "error"); }
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
    if (name.length < 2) { showToast(t("files.folderNameTooShort", "Papka nomi kamida 2 ta belgidan iborat bo'lsin"), "error"); return; }
    const current = folders.find((folder) => folder.id === folderId);
    const targetParentId = folderDialog.mode === "rename" ? (current?.parentId ?? null) : (folderId ?? null);
    const duplicate = folders.some((folder) => folder.parentId === targetParentId && folder.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase() && folder.id !== folderId);
    if (duplicate) { showToast(t("files.folderNameDuplicate", "Bu nomli papka allaqachon mavjud"), "error"); return; }
    setFolderBusy(true);
    try {
      if (folderDialog.mode === "create") await createFolder(name, folderId);
      else if (folderId) await updateFolder(folderId, name);
      await load();
      setFolderDialog(null);
      showToast(folderDialog.mode === "create" ? t("files.folderCreated", "Papka yaratildi") : t("files.folderRenamed", "Papka nomi yangilandi"), "success");
    } catch (caught) {
      showToast(getApiErrorMessage(caught, folderDialog.mode === "create" ? t("files.folderCreateError", "Papka yaratilmadi.") : t("files.folderRenameError", "Papka yangilanmadi.")), "error");
    } finally { setFolderBusy(false); }
  };
  const removeCurrentFolder = () => { if (folderId) setPendingFolderDelete(true); };
  const confirmRemoveCurrentFolder = async () => {
    if (!folderId) return;
    try { await deleteFolder(folderId); loadRef.current?.abort(); setFolderId(undefined); setPage(1); showToast(t("files.folderDeleted", "Papka o'chirildi"), "success"); }
    catch (caught) { showToast(getApiErrorMessage(caught, t("files.folderDeleteError", "Papka o'chirilmadi.")), "error"); }
    finally { setPendingFolderDelete(false); }
  };
  const downloadSelectedFile = async (file: ApiFile) => {
    setOpenMenu(null);
    try {
      const blob = await downloadFile(file.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.originalName || t("files.fallbackName", "fayl");
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (caught) { showToast(getApiErrorMessage(caught, t("files.downloadError", "Faylni yuklab bo'lmadi.")), "error"); }
  };
  const currentFolder = folders.find((folder) => folder.id === folderId);
  const childFolders = useMemo(() => folders.filter((folder) => search.trim()
    ? folder.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
    : (folder.parentId ?? null) === (folderId ?? null)), [folders, folderId, search]);
  const saveFile = async () => {
    if (!fileDialog || folderBusy) return;
    setFolderBusy(true);
    try {
      await updateFile(fileDialog.file.id, fileDialog.mode === 'rename' ? { originalName: fileDialog.value.trim() } : { folderId: fileDialog.value || null });
      setFileDialog(null); await load();
      showToast(t('files.saved', 'Fayl yangilandi'), 'success');
    } catch (caught) { showToast(getApiErrorMessage(caught, t('files.updateError', 'Faylni yangilab bo‘lmadi')), 'error'); }
    finally { setFolderBusy(false); }
  };
  const fileCountLabel = (count: number) => t("files.countSuffix", "{count} ta fayl", { count });

  return <main className="files-page">
    <header className="files-page__header"><div><span className="files-page__eyebrow">{t("files.eyebrow", "ISH MAYDONINGIZ")}</span><h1>{t("files.title", "Fayllar")}</h1><p>{t("files.subtitle", "Hujjatlaringizni real backend’da xavfsiz saqlang va boshqaring.")}</p></div><div className="files-page__actions"><button type="button" className="files-page__secondary" onClick={() => inputRef.current?.click()}><Upload size={15} />{t("files.upload", "Yuklash")}</button><button type="button" className="files-page__primary" onClick={createNewFolder}><Plus size={15} />{t("files.folder", "Papka yaratish")}</button><input ref={inputRef} type="file" hidden multiple accept={supportedTypes.join(",")} onChange={(event) => { void handleFiles(event.target.files); event.currentTarget.value = ""; }} /></div></header>
    <div className="files-toolbar"><label className="files-toolbar__search"><Search size={15} /><span className="sr-only">{t("files.search", "Fayllardan qidirish...")}</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("files.search", "Fayllardan qidirish...")} aria-label={t("files.search", "Fayllardan qidirish...")} /></label><div className="files-toolbar__right"><button type="button" className={view === "grid" ? "is-active" : ""} onClick={() => setView("grid")} aria-label={t("files.gridView", "Katakli ko‘rinish")}><Grid3X3 size={15} /></button><button type="button" className={view === "list" ? "is-active" : ""} onClick={() => setView("list")} aria-label={t("files.listView", "Ro‘yxat ko‘rinishi")}><List size={15} /></button></div></div>
    <section className="files-section"><div className="files-section__heading"><div><span>{t("files.collectionsEyebrow", "TO‘PLAMLAR")}</span><h2>{currentFolder ? currentFolder.name : t("files.folders", "Papkalar")}</h2></div><span className="files-count">{fileCountLabel(total)}</span></div>{currentFolder && <div className="files-page__actions"><button type="button" className="files-page__secondary" onClick={() => setFolderId(currentFolder.parentId || undefined)}>← {t("files.back", "Orqaga")}</button><button type="button" className="files-page__secondary" onClick={() => void editCurrentFolder()}>{t("files.rename", "Nomini o'zgartirish")}</button><button type="button" className="files-page__secondary" onClick={() => void removeCurrentFolder()}>{t("files.delete", "O'chirish")}</button></div>}<div className="folders">{childFolders.map((folder) => <button type="button" className="folder-card" key={folder.id} onClick={() => setFolderId(folder.id)}><div className="folder-card__icon"><Folder size={19} /></div><div><strong>{folder.name}</strong><span>{t("files.itemCount", "{count} fayl", { count: folder._count?.files ?? 0 })}</span></div><ArrowUpRight className="folder-card__arrow" size={14} /></button>)}{!currentFolder && !search.trim() && total > 0 && <div className="folder-card folder-card--summary" aria-label={t("files.all", "Barcha fayllar")}><div className="folder-card__icon"><Star size={19} /></div><div><strong>{t("files.all", "Barcha fayllar")}</strong><span>{t("files.inRootFolder", "{count} fayl asosiy katalogda", { count: total })}</span></div></div>}</div></section>
    <section className="files-section"><div className="files-section__heading"><div><span>{t("files.recentEyebrow", "SO‘NGGI")}</span><h2>{t("files.recent", "So'nggi fayllar")}</h2></div><span className="files-count">{t("files.safe", "Xavfsiz saqlash")}</span></div><div className={`file-list ${view === "list" ? "file-list--list" : ""}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void handleFiles(event.dataTransfer.files); }}>{Object.entries(uploading).map(([name, progress]) => <div className="files-empty" key={name}><strong>{t("files.uploadingProgress", "{name} yuklanmoqda… {progress}%", { name, progress })}</strong><span>{"█".repeat(Math.max(1, Math.round(progress / 10)))}{"░".repeat(10 - Math.max(1, Math.round(progress / 10)))}</span></div>)}{loading && <div className="files-empty"><strong>{t("files.loading", "Fayllar yuklanmoqda…")}</strong></div>}{!loading && error && <div className="files-empty"><strong>{error}</strong><button type="button" onClick={() => void load()}>{t("common.retry", "Qayta urinish")}</button></div>}{!loading && !error && files.map((file) => { const Icon = iconFor(file); const open = openMenu === file.id; return <article className={`file-card ${open ? "file-card--menu-open" : ""}`} key={file.id}><button type="button" className={`file-card__icon file-card__icon--${colorFor(file)}`} onClick={() => void openFile(file)} aria-label={t("files.openFileAria", "{name} faylini ochish", { name: file.originalName })}><Icon size={19} /></button><div className="file-card__info"><strong>{file.label || file.originalName}</strong><span>{fileType(file)} · {formatSize(file.sizeBytes)} · {file.source === "GOOGLE_DRIVE" ? "Google Drive" : file.source === "TELEGRAM" ? "Telegram" : t("files.sourceUploaded", "Yuklangan")}</span></div><div className="file-card__date">{new Date(file.createdAt).toLocaleDateString(locale === "ru" ? "ru-RU" : "uz-UZ")}</div><div className="file-card__menu-wrap" onClick={event => event.stopPropagation()}><button type="button" className="file-card__more" onClick={() => setOpenMenu(open ? null : file.id)} aria-label={t("files.openActionsAria", "Fayl amallarini ochish")}><MoreHorizontal size={17} /></button>{open && <div className="file-card__dropdown"><button type="button" onClick={() => void openFile(file)}>{t("files.open", "Ochish")}</button><button type="button" onClick={() => void downloadSelectedFile(file)}><Download size={14} />{t("files.download", "Yuklab olish")}</button><button type="button" onClick={() => { setOpenMenu(null); setFileDialog({ file, mode: "rename", value: file.originalName }); }}>{t("files.rename", "Nomini o‘zgartirish")}</button><button type="button" onClick={() => { setOpenMenu(null); setFileDialog({ file, mode: "move", value: file.folderId ?? "" }); }}>{t("files.move", "Papkaga ko‘chirish")}</button><button type="button" className="danger" onClick={() => requestRemove(file)}>{t("files.delete", "O'chirish")}</button></div>}</div></article>; })}{!loading && !error && files.length === 0 && <div className="files-empty"><Search size={22} /><strong>{t("files.empty", "Fayllar hali yo'q")}</strong><span>{t("files.emptyHelp", "Faylni shu yerga sudrab olib keling yoki Yuklash tugmasini bosing.")}</span></div>}</div></section>
    <section className="files-ai"><div className="files-ai__icon"><Star size={19} /></div><div><span>QULAY AI</span><h2>{t("files.aiCard.title", "PDF, Word va Excel bilan ishlang")}</h2><p>{t("files.aiCard.subtitle", "Yuklangan hujjat matni xavfsiz ajratiladi; AI undan qidiradi va savollarga javob beradi.")}</p></div><button type="button" onClick={openAIChat}>Qulay AI<ArrowUpRight size={14} /></button></section>
    {total > 50 && <nav className="files-page__actions"><button type="button" disabled={page === 1 || loading} onClick={() => setPage(p => p - 1)}>{t('common.previous', 'Oldingi')}</button><span>{page} / {Math.ceil(total / 50)}</span><button type="button" disabled={page * 50 >= total || loading} onClick={() => setPage(p => p + 1)}>{t('common.next', 'Keyingi')}</button></nav>}
    {fileDialog && <div className="folder-dialog__overlay"><form className="folder-dialog" role="dialog" aria-modal="true" onSubmit={event => { event.preventDefault(); void saveFile(); }}>
      <h2>{fileDialog.mode === 'rename' ? t('files.rename', 'Nomini o‘zgartirish') : t('files.move', 'Papkaga ko‘chirish')}</h2>
      {fileDialog.mode === 'rename' ? <input aria-label={t('files.fileName', 'Fayl nomi')} autoFocus required maxLength={255} value={fileDialog.value} onChange={event => setFileDialog({ ...fileDialog, value: event.target.value })} /> : <select aria-label={t('files.folder', 'Papka')} value={fileDialog.value} onChange={event => setFileDialog({ ...fileDialog, value: event.target.value })}><option value="">{t('files.root', 'Asosiy katalog')}</option>{folders.map(folder => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select>}
      <div className="folder-dialog__actions"><button type="button" disabled={folderBusy} onClick={() => setFileDialog(null)}>{t('files.cancel', 'Bekor qilish')}</button><button type="submit" disabled={folderBusy}>{t('files.save', 'Saqlash')}</button></div>
    </form></div>}
    {preview && <div className="file-preview__overlay" onClick={() => setPreview(null)}><div className="file-preview" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><button type="button" onClick={() => setPreview(null)} aria-label={t("files.closePreview", "Ko‘rish oynasini yopish")}><X size={16} /></button><h2>{preview.file.originalName}</h2>{preview.url && <img src={preview.url} alt={preview.file.originalName} />}{preview.text !== undefined && <pre>{preview.text}</pre>}<p>{fileType(preview.file)} · {formatSize(preview.file.sizeBytes)}</p></div></div>}
    {folderDialog && <div className="folder-dialog__overlay" onClick={() => !folderBusy && setFolderDialog(null)}><form className="folder-dialog" onSubmit={(event) => { event.preventDefault(); void saveFolderDialog(); }} onClick={(event) => event.stopPropagation()}>
      <button type="button" className="folder-dialog__close" onClick={() => setFolderDialog(null)} aria-label={t("files.closeFolderDialog", "Papka oynasini yopish")}><X size={16} /></button>
      <div className="folder-dialog__icon"><Folder size={20} /></div>
      <h2>{folderDialog.mode === "create" ? t("files.newFolder", "Yangi papka") : t("files.rename", "Papka nomini o'zgartirish")}</h2>
      <p>{folderDialog.mode === "create" ? t("files.newFolderHint", "Fayllaringizni tartibli saqlash uchun papkaga aniq nom bering.") : t("files.renameFolderHint", "Yangi nom shu workspace ichida yagona bo'lishi kerak.")}</p>
      <label>{t("files.folderName", "Papka nomi")}<input autoFocus maxLength={80} value={folderDialog.name} onChange={(event) => setFolderDialog((current) => current ? { ...current, name: event.target.value } : current)} placeholder={t("files.folderNamePlaceholder", "Masalan: Shartnomalar")} /></label>
      <div className="folder-dialog__actions"><button type="button" onClick={() => setFolderDialog(null)} disabled={folderBusy}>{t("files.cancel", "Bekor qilish")}</button><button type="submit" className="is-primary" disabled={folderBusy}>{folderBusy ? t("common.saving", "Saqlanmoqda...") : folderDialog.mode === "create" ? t("files.create", "Yaratish") : t("files.save", "Saqlash")}</button></div>
    </form></div>}
    {pendingDelete && <ConfirmDialog title={t("files.deleteFileTitle", "Faylni o'chirish")} description={t("files.deleteFileDescription", "\"{name}\" faylini o'chirishni tasdiqlaysizmi?", { name: pendingDelete.originalName })} confirmLabel={t("files.delete", "O'chirish")} onConfirm={confirmRemove} onCancel={() => setPendingDelete(null)} />}
    {pendingFolderDelete && <ConfirmDialog title={t("files.deleteFolderTitle", "Papkani o'chirish")} description={t("files.deleteFolderDescription", "Papka o'chiriladi. Ichidagi fayllar asosiy katalogga ko'chiriladi. Davom etilsinmi?")} confirmLabel={t("files.delete", "O'chirish")} onConfirm={confirmRemoveCurrentFolder} onCancel={() => setPendingFolderDelete(false)} />}
  </main>;
};

export default Files;
