import { Download, ExternalLink, FileImage, FileSpreadsheet, FileText, MoreHorizontal, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import ConfirmDialog from "../../../../components/ConfirmDialog/ConfirmDialog";
import { useToast } from "../../../../hooks/useToast";
import { getFiles, removeFile } from "../../../../services/fileService";
import { subscribeToWorkspaceData } from "../../../../services/workspaceEvents";
import type { WorkspaceFile } from "../../../../types/workspace";
import "./RecentFiles.scss";

const RecentFiles = () => {
  const [files, setFiles] = useState<WorkspaceFile[]>(getFiles);
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<WorkspaceFile | null>(null);
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => subscribeToWorkspaceData("files", () => setFiles(getFiles())), []);

  const recent = files.slice(0, 4);
  const iconFor = (file: WorkspaceFile) => file.mimeType.startsWith("image/") ? FileImage : file.mimeType.includes("sheet") ? FileSpreadsheet : FileText;
  const timeFor = (file: WorkspaceFile) => new Date(file.addedAt).toLocaleString("uz-UZ", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

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

  const download = (file: WorkspaceFile) => {
    setOpenMenu(null);
    if (!file.dataUrl) {
      showToast("Bu demo fayl uchun yuklab olinadigan asl fayl mavjud emas", "info");
      return;
    }

    const link = document.createElement("a");
    link.href = file.dataUrl;
    link.download = file.name;
    link.click();
    showToast("Fayl yuklab olindi", "success");
  };

  return (
    <>
      <section className="recent-files">
        <div className="recent-files__header">
          <div><h2>So'nggi fayllar</h2><p>Oxirgi yuklangan hujjatlaringiz</p></div>
          <button type="button" onClick={() => navigate("/files")}>Barchasi<ExternalLink size={13} /></button>
        </div>
        <div className="recent-files__list">
          {recent.length === 0 && <div className="recent-files__empty">Hali fayl yuklanmagan. <button type="button" onClick={() => navigate("/files")}>Fayl yuklash</button></div>}
          {recent.map((file) => {
            const Icon = iconFor(file);
            const isOpen = openMenu === file.id;
            return (
              <article key={file.id} className={`recent-file ${isOpen ? "recent-file--menu-open" : ""}`}>
                <button type="button" className="recent-file__icon recent-file__icon--purple" onClick={() => navigate("/files")} aria-label={`${file.name} faylini ochish`}><Icon size={17} /></button>
                <button type="button" className="recent-file__info" onClick={() => navigate("/files")}><h3>{file.name}</h3><div><span>{file.type}</span><i /><span>{timeFor(file)}</span></div></button>
                <div className="recent-file__actions">
                  <button type="button" className="recent-file__more" onClick={() => setOpenMenu(isOpen ? null : file.id)} aria-label="Fayl amallarini ochish"><MoreHorizontal size={17} /></button>
                  {isOpen && <div className="recent-file__menu">
                    <button type="button" onClick={() => navigate("/files")}><ExternalLink size={14} /><span>Ochish</span></button>
                    <button type="button" onClick={() => download(file)}><Download size={14} /><span>Yuklab olish</span></button>
                    <button type="button" className="recent-file__delete" onClick={() => requestRemove(file)}><Trash2 size={14} /><span>O'chirish</span></button>
                  </div>}
                </div>
              </article>
            );
          })}
        </div>
      </section>
      {pendingDelete && <ConfirmDialog title="Faylni o'chirish" description={`"${pendingDelete.name}" faylini o'chirishni tasdiqlaysizmi?`} confirmLabel="O'chirish" onConfirm={confirmRemove} onCancel={() => setPendingDelete(null)} />}
    </>
  );
};

export default RecentFiles;
