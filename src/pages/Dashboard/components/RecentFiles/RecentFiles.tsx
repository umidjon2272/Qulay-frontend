import { ExternalLink, FileImage, FileSpreadsheet, FileText, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listFiles } from "../../../../services/api/fileApi";
import type { ApiFile } from "../../../../services/api/types";
import { useI18n } from "../../../../i18n/useI18n";
import "./RecentFiles.scss";

const RecentFiles = () => {
  const [files, setFiles] = useState<ApiFile[]>([]);
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const dateLocale = locale === "ru" ? "ru-RU" : "uz-UZ";
  useEffect(() => { void listFiles({ limit: 4 }).then((result) => setFiles(result.items)).catch(() => setFiles([])); }, []);
  const iconFor = (file: ApiFile) => file.mimeType.startsWith("image/") ? FileImage : file.mimeType.includes("sheet") ? FileSpreadsheet : FileText;
  const timeFor = (file: ApiFile) => new Date(file.createdAt).toLocaleString(dateLocale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return <section className="recent-files"><div className="recent-files__header"><div><h2>{t("recentFiles.title", "So'nggi fayllar")}</h2><p>{t("recentFiles.subtitle", "Oxirgi yuklangan hujjatlaringiz")}</p></div><button type="button" onClick={() => navigate("/files")}>{t("recentFiles.all", "Barchasi")}<ExternalLink size={13} /></button></div><div className="recent-files__list">{files.length === 0 && <div className="recent-files__empty"><span className="recent-files__empty-icon"><Upload size={20} /></span><strong>{t("recentFiles.emptyTitle", "Hali fayl yuklanmagan")}</strong><span>{t("recentFiles.emptySubtitle", "Hujjatlaringiz shu yerda ko'rinadi.")}</span><button type="button" onClick={() => navigate("/files")}><Upload size={15} /> {t("recentFiles.upload", "Fayl yuklash")}</button></div>}{files.map((file) => { const Icon = iconFor(file); return <article key={file.id} className="recent-file"><button type="button" className="recent-file__icon recent-file__icon--purple" onClick={() => navigate("/files")} aria-label={t("recentFiles.openAria", "{name} faylini ochish", { name: file.originalName })}><Icon size={17} /></button><button type="button" className="recent-file__info" onClick={() => navigate("/files")}><h3>{file.label || file.originalName}</h3><div><span>{(file.extension || "FILE").toUpperCase()}</span><i /><span>{timeFor(file)}</span></div></button></article>; })}</div></section>;
};

export default RecentFiles;
