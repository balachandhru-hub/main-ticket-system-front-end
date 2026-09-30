import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Loader } from 'lucide-react';
import './EditContractModal.css';

export interface ContractEditDto {
  description: string;
  contractValue: string;
}

interface EditContractModalProps {
  isOpen: boolean;
  invoiceId: string | null;
  initialForm: ContractEditDto;
  onSave: (form: ContractEditDto) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
}

const EditContractModal: React.FC<EditContractModalProps> = ({
  isOpen,
  invoiceId,
  initialForm,
  onSave,
  onClose,
}) => {
  const [form, setForm] = useState<ContractEditDto>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Update form when initialForm changes
  useEffect(() => {
    setForm(initialForm);
    setError(null);
  }, [initialForm, isOpen]);

  if (!isOpen || !invoiceId) return null;

  const handleConfirm = async () => {
    setError(null);

    // Validation
    if (!form.description.trim()) {
      setError('Description is required');
      return;
    }

    const valueNum = parseFloat(form.contractValue);
    if (isNaN(valueNum) || valueNum < 0) {
      setError('Contract value must be a valid number');
      return;
    }

    setLoading(true);
    try {
      // Call onSave - which handles everything including closing the modal
      await onSave(form);
      // The modal will be closed by the parent component (handleEditSaveFromPopup)
      // So we don't need to do anything here
    } catch (err) {
      // Error handling is done in parent component
      // Keep loading false here
      const errorMessage =
        err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setForm(initialForm);
    setError(null);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !loading) {
      handleCancel();
    }
  };

  const handleChange = (field: keyof ContractEditDto, value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="ecm-backdrop" onClick={handleBackdropClick}>
      <div className="ecm-modal">
        {/* Header */}
        <div className="ecm-header">
          <h2 className="ecm-title">Edit Contract Details</h2>
          <button
            onClick={handleCancel}
            className="ecm-close-button"
            title="Close"
            disabled={loading}
          >
            <X className="ecm-icon" />
          </button>
        </div>

        {/* Body */}
        <div className="ecm-body">
          <div className="ecm-content">
            {/* Contract ID (Read-only) */}
            <div className="ecm-form-group">
              <label htmlFor="contractId" className="ecm-label">
                Contract ID
              </label>
              <input
                id="contractId"
                type="text"
                value={invoiceId || ''}
                className="ecm-input ecm-input-readonly"
                disabled
                readOnly
              />
            </div>

            {/* Description */}
            <div className="ecm-form-group">
              <label htmlFor="description" className="ecm-label">
                Description
              </label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Enter contract description..."
                className="ecm-textarea"
                rows={4}
                disabled={loading}
                maxLength={500}
              />
              <div className="ecm-helper-text">
                {form.description.length}/500 characters
              </div>
            </div>

            {/* Contract Value */}
            <div className="ecm-form-group">
              <label htmlFor="contractValue" className="ecm-label">
                Contract Value
              </label>
              <input
                id="contractValue"
                type="number"
                value={form.contractValue}
                onChange={(e) => handleChange('contractValue', e.target.value)}
                placeholder="Enter contract value..."
                className="ecm-input"
                disabled={loading}
                step="0.01"
                min="0"
              />
              <div className="ecm-helper-text">
                Format: Numeric value (e.g., 7000.00)
              </div>
            </div>

            {/* Error Message - Only show validation errors from modal */}
            {error && (
              <div className="ecm-error">
                <AlertCircle className="ecm-error-icon" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="ecm-footer">
          <button
            onClick={handleCancel}
            className="ecm-button ecm-button-cancel"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="ecm-button ecm-button-save"
            disabled={loading || !form.description.trim()}
          >
            {loading ? (
              <>
                <Loader className="ecm-icon ecm-icon-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditContractModal;