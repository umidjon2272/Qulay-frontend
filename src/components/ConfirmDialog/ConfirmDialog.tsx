import { AlertTriangle, X } from "lucide-react";

import "./ConfirmDialog.scss";

type ConfirmDialogProps = {
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

const ConfirmDialog = ({
  title,
  description,
  confirmLabel = "Tasdiqlash",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => (
  <div className="confirm-dialog__overlay" onClick={onCancel}>
    <section
      className="confirm-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={(event) => event.stopPropagation()}
    >
      <button type="button" className="confirm-dialog__close" onClick={onCancel} aria-label="Yopish">
        <X size={17} />
      </button>
      <div className="confirm-dialog__icon"><AlertTriangle size={20} /></div>
      <h2 id="confirm-dialog-title">{title}</h2>
      <p>{description}</p>
      <div className="confirm-dialog__actions">
        <button type="button" className="confirm-dialog__cancel" onClick={onCancel}>Bekor qilish</button>
        <button type="button" className="confirm-dialog__confirm" onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </section>
  </div>
);

export default ConfirmDialog;
