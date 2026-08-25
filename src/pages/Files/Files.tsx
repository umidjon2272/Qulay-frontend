import { ArrowUpRight, FileImage, FileSpreadsheet, FileText, Folder, Grid3X3, List, MoreHorizontal, Plus, Search, Star, Upload, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ConfirmDialog from "../../components/ConfirmDialog/ConfirmDialog";
import { useAIChat } from "../../features/ai/hooks/useAIChat";
import { useCloseOnOutsideClick } from "../../hooks/useCloseOnOutsideClick";
import { useToast } from "../../hooks/useToast";
import { ApiError, getApiErrorMessage } from "../../services/api/apiClient";
import { createFolder, deleteFile, deleteFolder, downloadFile, listFiles, listFolders, updateFolder, uploadFileWithProgress } from "../../services/api/fileApi";
import type { ApiFile, ApiFolder } from "../../services/api/types";
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
  const inputRef = useRef<HTMLInputElement>(null);
  const { open: openAIChat } = useAIChat();
  const { showToast } = useToast();

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
    try { const blob = await downloadFile(file.id); if (file.mimeType.startsWith("image/")) setPreview({ file, url: URL.createObjectURL(blob) }); else if (["text/plain", "text/csv", "application/json"].includes(file.mimeType)) setPreview({ file, text: await blob.text() }); else { const url = URL.createObjectURL(blob); window.open(url, "_blank", "noopener,noreferrer"); setTimeout(() => URL.revokeObjectURL(url), 60_000); } }
    catch (caught) { showToast(getApiErrorMessage(caught, "Faylni ochib bo'lmadi."), "error"); }
  };
  const createNewFolder = async () => { const name = window.prompt("Papka nomi"); if (!name?.trim()) return; try { await createFolder(name.trim(), folderId); await load(); showToast("Papka yaratildi", "success"); } catch (caught) { showToast(getApiErrorMessage(caught, "Papka yaratilmadi."), "error"); } };
  const editCurrentFolder = async () => { const folder = folders.find((item) => item.id === folderId); if (!folder) return; const name = window.prompt("Papka nomi", folder.name); if (!name?.trim()) return; try { await updateFolder(folder.id, name.trim()); await load(); } catch (caught) { showToast(getApiErrorMessage(caught, "Papka yangilanmadi."), "error"); } };
  const removeCurrentFolder = async () => { if (!folderId || !window.confirm("Papka o'chiriladi, ichidagi fayllar rootga o'tadi. Davom etilsinmi?")) return; try { await deleteFolder(folderId); setFolderId(undefined); await load(); showToast("Papka o'chirildi", "success"); } catch (caught) { showToast(getApiErrorMessage(caught, "Papka o'chirilmadi."), "error"); } };
  const currentFolder = folders.find((folder) => folder.id === folderId);
  const childFolders = useMemo(() => folders.filter((folder) => folder.parentId === folderId), [folders, folderId]);

  return <main className="files-page">
    <header className="files-page__header"><div><span className="files-page__eyebrow">YOUR WORKSPACE</span><h1>Fayllar</h1><p>Hujjatlaringizni real backend’da xavfsiz saqlang va boshqaring.</p></div><div className="files-page__actions"><button type="button" className="files-page__secondary" onClick={() => inputRef.current?.click()}><Upload size={15} />Yuklash</button><button type="button" className="files-page__primary" onClick={createNewFolder}><Plus size={15} />Papka yaratish</button><input ref={inputRef} type="file" hidden multiple accept={supportedTypes.join(",")} onChange={(event) => { void handleFiles(event.target.files); event.currentTarget.value = ""; }} /></div></header>
    <div className="files-toolbar"><label className="files-toolbar__search"><Search size={15} /><span className="sr-only">Fayllardan qidirish</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Fayllardan qidirish..." aria-label="Fayllardan qidirish" /></label><div className="files-toolbar__right"><button type="button" className={view === "grid" ? "is-active" : ""} onClick={() => setView("grid")} aria-label="Grid ko'rinishi"><Grid3X3 size={15} /></button><button type="button" className={view === "list" ? "is-active" : ""} onClick={() => setView("list")} aria-label="List ko'rinishi"><List size={15} /></button></div></div>
    <section className="files-section"><div className="files-section__heading"><div><span>COLLECTIONS</span><h2>{currentFolder ? currentFolder.name : "Papkalar"}</h2></div><span className="files-count">{files.length} ta fayl</span></div>{currentFolder && <div className="files-page__actions"><button type="button" className="files-page__secondary" onClick={() => setFolderId(currentFolder.parentId || undefined)}>← Orqaga</button><button type="button" className="files-page__secondary" onClick={() => void editCurrentFolder()}>Nomini o'zgartirish</button><button type="button" className="files-page__secondary" onClick={() => void removeCurrentFolder()}>O'chirish</button></div>}<div className="folders">{childFolders.map((folder) => <button type="button" className="folder-card" key={folder.id} onClick={() => setFolderId(folder.id)}><div className="folder-card__icon"><Folder size={19} /></div><div><strong>{folder.name}</strong><span>{folder._count?.files ?? 0} fayl</span></div><ArrowUpRight className="folder-card__arrow" size={14} /></button>)}{!currentFolder && <button type="button" className="folder-card" onClick={() => showToast(`${files.length} ta fayl workspace'da saqlangan`, "info")}><div className="folder-card__icon"><Star size={19} /></div><div><strong>Workspace</strong><span>{files.length} fayl</span></div><ArrowUpRight className="folder-card__arrow" size={14} /></button>}</div></section>
    <section className="files-section"><div className="files-section__heading"><div><span>RECENT</span><h2>So'nggi fayllar</h2></div><span className="files-count">Backend storage</span></div><div className={`file-list ${view === "list" ? "file-list--list" : ""}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void handleFiles(event.dataTransfer.files); }}>{Object.entries(uploading).map(([name, progress]) => <div className="files-empty" key={name}><strong>{name} yuklanmoqda… {progress}%</strong><span>{"█".repeat(Math.max(1, Math.round(progress / 10)))}{"░".repeat(10 - Math.max(1, Math.round(progress / 10)))}</span></div>)}{loading && <div className="files-empty"><strong>Fayllar yuklanmoqda…</strong></div>}{!loading && error && <div className="files-empty"><strong>{error}</strong><button type="button" onClick={() => void load()}>Qayta urinish</button></div>}{!loading && !error && files.map((file) => { const Icon = iconFor(file); const open = openMenu === file.id; return <article className={`file-card ${open ? "file-card--menu-open" : ""}`} key={file.id}><button type="button" className={`file-card__icon file-card__icon--${colorFor(file)}`} onClick={() => void openFile(file)} aria-label={`${file.originalName} faylini ochish`}><Icon size={19} /></button><div className="file-card__info"><strong>{file.label || file.originalName}</strong><span>{fileType(file)} · {formatSize(file.sizeBytes)}</span></div><div className="file-card__date">{new Date(file.createdAt).toLocaleDateString("uz-UZ")}</div><div className="file-card__menu-wrap"><button type="button" className="file-card__more" onClick={() => setOpenMenu(open ? null : file.id)} aria-label="Fayl amallarini ochish"><MoreHorizontal size={17} /></button>{open && <div className="file-card__dropdown"><button type="button" onClick={() => void openFile(file)}>Ochish</button><button type="button" className="danger" onClick={() => requestRemove(file)}>O'chirish</button></div>}</div></article>; })}{!loading && !error && files.length === 0 && <div className="files-empty"><Search size={22} /><strong>Fayllar hali yo'q</strong><span>Faylni shu yerga sudrab olib keling yoki Yuklash tugmasini bosing.</span></div>}</div></section>
    <section className="files-ai"><div className="files-ai__icon"><Star size={19} /></div><div><span>QULAY AI</span><h2>Fayllaringiz bilan aqlliroq ishlang</h2><p>Metadata qidiruvi va kelajakdagi xavfsiz content extraction uchun foundation tayyor.</p></div><button type="button" onClick={openAIChat}>Qulay AI<ArrowUpRight size={14} /></button></section>
    {preview && <div className="file-preview__overlay" onClick={() => setPreview(null)}><div className="file-preview" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><button type="button" onClick={() => setPreview(null)} aria-label="Previewni yopish"><X size={16} /></button><h2>{preview.file.originalName}</h2>{preview.url && <img src={preview.url} alt={preview.file.originalName} />}{preview.text !== undefined && <pre>{preview.text}</pre>}<p>{fileType(preview.file)} · {formatSize(preview.file.sizeBytes)}</p></div></div>}
    {pendingDelete && <ConfirmDialog title="Faylni o'chirish" description={`"${pendingDelete.originalName}" faylini o'chirishni tasdiqlaysizmi?`} confirmLabel="O'chirish" onConfirm={confirmRemove} onCancel={() => setPendingDelete(null)} />}
  </main>;
};

export default Files;
