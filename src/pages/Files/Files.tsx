import {
  ArrowUpRight,
  FileImage,
  FileSpreadsheet,
  FileText,
  Folder,
  Grid3X3,
  List,
  MoreHorizontal,
  Plus,
  Search,
  Star,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import ConfirmDialog from "../../components/ConfirmDialog/ConfirmDialog";
import { useAIChat } from "../../features/ai/hooks/useAIChat";
import { useCloseOnOutsideClick } from "../../hooks/useCloseOnOutsideClick";
import { useToast } from "../../hooks/useToast";
import { addFile, getFiles, removeFile } from "../../services/fileService";
import { subscribeToWorkspaceData } from "../../services/workspaceEvents";
import type { WorkspaceFile } from "../../types/workspace";
import "./Files.scss";

const supportedTypes = [
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
  "image/webp",
];
const maxFileSize = 10 * 1024 * 1024;
const maxPreviewSize = 2 * 1024 * 1024;
const supportedExtensions = new Set(["pdf", "txt", "csv", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "png", "jpg", "jpeg", "webp"]);

const formatSize = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const fileType = (file: File) => file.name.split(".").pop()?.toUpperCase() || "FILE";
const iconFor = (file: WorkspaceFile) => file.mimeType.startsWith("image/") ? FileImage : file.mimeType.includes("sheet") || file.type === "CSV" ? FileSpreadsheet : FileText;
const colorFor = (file: WorkspaceFile) => file.mimeType.startsWith("image/") ? "blue" : file.type === "PDF" ? "purple" : file.type === "XLSX" || file.type === "CSV" ? "green" : "orange";
const isSupportedFile = (file: File) => supportedTypes.includes(file.type) || (!file.type && supportedExtensions.has(file.name.split(".").pop()?.toLowerCase() ?? ""));

const Files = () => {
  const [files, setFiles] = useState<WorkspaceFile[]>(getFiles);
  const [view, setView] = useState<"grid" | "list">(() => typeof window !== "undefined" && window.innerWidth <= 700 ? "list" : "grid");
  const [search, setSearch] = useState("");
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [preview, setPreview] = useState<WorkspaceFile | null>(null);
  const [pendingDelete, setPendingDelete] = useState<WorkspaceFile | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { open: openAIChat } = useAIChat();
  const { showToast } = useToast();

  useEffect(() => subscribeToWorkspaceData("files", () => setFiles(getFiles())), []);
  useCloseOnOutsideClick(openMenu !== null, () => setOpenMenu(null));

  const handleFiles = (selected: FileList | null) => {
    if (!selected?.length) return;

    Array.from(selected).forEach((file) => {
      if (!isSupportedFile(file)) {
        showToast(`${file.name}: bu fayl turi qo'llab-quvvatlanmaydi`, "error");
        return;
      }
      if (file.size > maxFileSize) {
        showToast(`${file.name}: maksimal hajm 10 MB`, "error");
        return;
      }

      const finish = (dataUrl?: string, previewText?: string) => {
        try {
          addFile({ name: file.name, type: fileType(file), mimeType: file.type || "application/octet-stream", size: file.size, dataUrl, previewText });
          setFiles(getFiles());
          showToast(`${file.name} yuklandi`, "success");
        } catch {
          showToast(`${file.name}: faylni lokal saqlab bo'lmadi`, "error");
        }
      };

      if (file.type.startsWith("image/") && file.size <= maxPreviewSize) {
        const reader = new FileReader();
        reader.onload = () => finish(typeof reader.result === "string" ? reader.result : undefined);
        reader.onerror = () => finish();
        reader.readAsDataURL(file);
      } else if ((file.type === "text/plain" || file.type === "text/csv") && file.size <= maxPreviewSize) {
        const reader = new FileReader();
        reader.onload = () => finish(undefined, typeof reader.result === "string" ? reader.result : undefined);
        reader.onerror = () => finish();
        reader.readAsText(file);
      } else {
        finish();
      }
    });
  };

  const filteredFiles = files.filter((file) => file.name.toLocaleLowerCase().includes(search.toLocaleLowerCase().trim()));

  const requestRemove = (file: WorkspaceFile) => {
    setPendingDelete(file);
    setOpenMenu(null);
  };

  const confirmRemove = () => {
    if (!pendingDelete) return;
    removeFile(pendingDelete.id);
    setFiles(getFiles());
    setPendingDelete(null);
    showToast("Fayl o'chirildi", "success");
  };

  const openFile = (file: WorkspaceFile) => {
    if (file.dataUrl || file.previewText) setPreview(file);
    else showToast("Preview faqat rasm fayllari uchun mavjud", "info");
  };

  return (
    <main className="files-page">
      <header className="files-page__header">
        <div><span className="files-page__eyebrow">YOUR WORKSPACE</span><h1>Fayllar</h1><p>Hujjatlaringizni bir joyda saqlang va boshqaring.</p></div>
        <div className="files-page__actions">
          <button type="button" className="files-page__secondary" onClick={() => inputRef.current?.click()}><Upload size={15} />Yuklash</button>
          <button type="button" className="files-page__primary" onClick={() => inputRef.current?.click()}><Plus size={15} />Yangi fayl</button>
          <input ref={inputRef} type="file" hidden multiple accept={supportedTypes.join(",")} onChange={(event) => { handleFiles(event.target.files); event.currentTarget.value = ""; }} />
        </div>
      </header>

      <div className="files-toolbar">
        <label className="files-toolbar__search"><Search size={15} /><span className="sr-only">Fayllardan qidirish</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Fayllardan qidirish..." aria-label="Fayllardan qidirish" /></label>
        <div className="files-toolbar__right">
          <button type="button" className={view === "grid" ? "is-active" : ""} onClick={() => setView("grid")} aria-label="Grid ko'rinishi" aria-pressed={view === "grid"}><Grid3X3 size={15} /></button>
          <button type="button" className={view === "list" ? "is-active" : ""} onClick={() => setView("list")} aria-label="List ko'rinishi" aria-pressed={view === "list"}><List size={15} /></button>
        </div>
      </div>

      <section className="files-section"><div className="files-section__heading"><div><span>COLLECTIONS</span><h2>Papkalar</h2></div><span className="files-count">{files.length} ta fayl</span></div><div className="folders"><button type="button" className="folder-card" onClick={() => showToast(`${files.length} ta fayl workspace'da saqlangan`, "info")}><div className="folder-card__icon"><Folder size={19} /></div><div><strong>Workspace</strong><span>{files.length} fayl</span></div><ArrowUpRight className="folder-card__arrow" size={14} /></button><button type="button" className="folder-card" onClick={() => showToast("AI tahlil uchun fayllarni tanlang", "info")}><div className="folder-card__icon"><Star size={19} /></div><div><strong>AI tahlil</strong><span>Tanlangan fayllar</span></div><ArrowUpRight className="folder-card__arrow" size={14} /></button></div></section>

      <section className="files-section"><div className="files-section__heading"><div><span>RECENT</span><h2>So'nggi fayllar</h2></div><span className="files-count">Local browser storage</span></div><div className={`file-list ${view === "list" ? "file-list--list" : ""}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); handleFiles(event.dataTransfer.files); }}>
        {filteredFiles.map((file) => { const Icon = iconFor(file); const open = openMenu === file.id; return <article className={`file-card ${open ? "file-card--menu-open" : ""}`} key={file.id}><button type="button" className={`file-card__icon file-card__icon--${colorFor(file)}`} onClick={() => openFile(file)} aria-label={`${file.name} faylini ochish`}><Icon size={19} /></button><div className="file-card__info"><strong>{file.name}</strong><span>{file.type} · {formatSize(file.size)}</span></div><div className="file-card__date">{new Date(file.addedAt).toLocaleDateString("uz-UZ")}</div><div className="file-card__menu-wrap"><button type="button" className="file-card__more" onClick={() => setOpenMenu(open ? null : file.id)} aria-label="Fayl amallarini ochish"><MoreHorizontal size={17} /></button>{open && <div className="file-card__dropdown"><button type="button" onClick={() => { openFile(file); setOpenMenu(null); }}>Ochish</button><button type="button" onClick={() => requestRemove(file)}>O'chirish</button></div>}</div></article>; })}
        {filteredFiles.length === 0 && <div className="files-empty"><Search size={22} /><strong>{files.length ? "Fayl topilmadi" : "Fayllar hali yo'q"}</strong><span>{files.length ? "Boshqa nom bilan qidirib ko'ring." : "Faylni shu yerga sudrab olib keling yoki Yuklash tugmasini bosing."}</span></div>}
      </div></section>

      <section className="files-ai"><div className="files-ai__icon"><Star size={19} /></div><div><span>AI FILE ASSISTANT</span><h2>Fayllaringiz bilan aqlliroq ishlang</h2><p>Hujjatlarni tahlil qilish, xulosa chiqarish va kerakli ma'lumotlarni tez topish.</p></div><button type="button" onClick={openAIChat}>AI Assistant<ArrowUpRight size={14} /></button></section>

      {preview && <div className="file-preview__overlay" onClick={() => setPreview(null)}><div className="file-preview" role="dialog" aria-modal="true" aria-labelledby="file-preview-title" onClick={(event) => event.stopPropagation()}><button type="button" onClick={() => setPreview(null)} aria-label="Previewni yopish"><X size={16} /></button><h2 id="file-preview-title">{preview.name}</h2>{preview.dataUrl && <img src={preview.dataUrl} alt={preview.name} />}{preview.previewText && <pre>{preview.previewText}</pre>}<p>{preview.type} · {formatSize(preview.size)}</p></div></div>}
      {pendingDelete && <ConfirmDialog title="Faylni o'chirish" description={`"${pendingDelete.name}" faylini o'chirishni tasdiqlaysizmi?`} confirmLabel="O'chirish" onConfirm={confirmRemove} onCancel={() => setPendingDelete(null)} />}
    </main>
  );
};

export default Files;
