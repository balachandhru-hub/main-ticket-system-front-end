import React, { useState } from "react";
import "./ConfirmationModal.css";

interface ConfirmationModalProps {
  isOpen: boolean;
  message: string;
  onConfirm: () => Promise<{ message: string }> | void; 
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  message,
  onConfirm,
  onCancel,
}) => {
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirmClick = async () => {
    setLoading(true);
    const res = await onConfirm();
    if (res && res.message) {
      setSuccessMessage(res.message);
      setTimeout(() => {
        setSuccessMessage("");
        onCancel();
      }, 2000); 
    }
    setLoading(false);
  };

  return (
    <div className="confirmation-modal-overlay">
      <div className="confirmation-modal">
        {successMessage ? (
          <p className="confirmation-success">{successMessage}</p>
        ) : (
          <>
            <p className="confirmation-message">{message}</p>
            <div className="confirmation-buttons">
              <button
                className="confirm-btn"
                onClick={handleConfirmClick}
                disabled={loading}
              >
                {loading ? "Processing" : "Yes"}
              </button>
              <button className="cancel-btn" onClick={onCancel}>
                No
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ConfirmationModal;
