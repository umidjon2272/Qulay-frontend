import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";

import "./ConfirmDialog.scss";

type ConfirmDialogProps = {
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

const ConfirmDialog = ({
  title,
  description,
  confirmLabel = "Tasdiqlash",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return <div className="confirm-dialog__overlay" onClick={busy ? undefined : onCancel}>
    <section
      className="confirm-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={(event) => event.stopPropagation()}
    >
      <button type="button" className="confirm-dialog__close" onClick={onCancel} aria-label="Yopish" disabled={busy}>
        <X size={17} />
      </button>
      <div className="confirm-dialog__icon"><AlertTriangle size={20} /></div>
      <h2 id="confirm-dialog-title">{title}</h2>
      <p>{description}</p>
      <div className="confirm-dialog__actions">
        <button type="button" className="confirm-dialog__cancel" onClick={onCancel} disabled={busy}>Bekor qilish</button>
        <button type="button" className="confirm-dialog__confirm" onClick={confirm} disabled={busy}>{busy ? "Saqlanmoqda..." : confirmLabel}</button>
      </div>
    </section>
  </div>
};

export default ConfirmDialog;
