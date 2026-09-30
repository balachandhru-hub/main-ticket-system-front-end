import React from 'react';
import { FiX } from 'react-icons/fi';
import './InvoiceEditPopup.css';

export interface InvoiceEditForm {
  description: string;
  contractValue: string;
  valueAlreadyPaid: string;
  remainingBalance: string;
}

interface InvoiceEditPopupProps {
  isOpen: boolean;
  invoiceId: string | null;
  initialForm: InvoiceEditForm;
  onSave: (form: InvoiceEditForm) => Promise<void>;
  onClose: () => void;
}

const InvoiceEditPopup: React.FC<InvoiceEditPopupProps> = ({
  isOpen,
  invoiceId,
  initialForm,
  onSave,
  onClose,
}) => {
  const [form, setForm] = React.useState<InvoiceEditForm>(initialForm);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) setForm(initialForm);
  }, [isOpen, initialForm]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen || !invoiceId) return null;

  return (
    <div className="edit-popup-overlay" onClick={handleOverlayClick}>
      <div className="edit-popup-content" onClick={(e) => e.stopPropagation()}>
        <div className="edit-popup-header">
          <h2>Edit Invoice Details</h2>
          <button className="edit-popup-close-btn" onClick={onClose} disabled={saving}>
            <FiX size={22} />
          </button>
        </div>

        <div className="edit-popup-body">
          <div className="edit-field">
            <label>Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              disabled={saving}
            />
          </div>
          <div className="edit-field">
            <label>Contract Value</label>
            <input
              type="number"
              step="0.01"
              value={form.contractValue}
              onChange={(e) => setForm(f => ({ ...f, contractValue: e.target.value }))}
              disabled={saving}
            />
          </div>
          <div className="edit-field">
            <label>Value Already Paid</label>
            <input
              type="number"
              step="0.01"
              value={form.valueAlreadyPaid}
              onChange={(e) => setForm(f => ({ ...f, valueAlreadyPaid: e.target.value }))}
              disabled={saving}
            />
          </div>
          <div className="edit-field">
            <label>Remaining Balance</label>
            <input
              type="number"
              step="0.01"
              value={form.remainingBalance}
              onChange={(e) => setForm(f => ({ ...f, remainingBalance: e.target.value }))}
              disabled={saving}
            />
          </div>
        </div>

        <div className="edit-popup-footer">
          <button className="edit-popup-btn save" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button className="edit-popup-btn cancel" onClick={onClose} disabled={saving}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceEditPopup;