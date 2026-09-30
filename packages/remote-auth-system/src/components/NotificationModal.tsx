import React from "react";
import "./NotificationModal.css";

interface NotificationModalProps {
  show: boolean;
  type: "success" | "error" | "confirm";
  title: string;
  message: string | string[] | { success?: string; errors?: string[] };
  onClose: () => void;
  onConfirm?: () => void; // New prop for confirmation
  confirmText?: string; // New prop for custom confirm button text
  cancelText?: string; // New prop for custom cancel button text
}

const NotificationModal: React.FC<NotificationModalProps> = ({
  show,
  type,
  title,
  message,
  onClose,
  onConfirm,
  confirmText = "Yes",
  cancelText = "No",
}) => {
  if (!show) return null;

  const renderContent = () => {
    if (typeof message === "string") {
      return <p className="po-message-line">{message}</p>;
    }
    if (Array.isArray(message)) {
      return (
        <ul className="po-message-list">
          {message.map((msg, idx) => (
            <li key={idx} className="po-message-item">
              {msg}
            </li>
          ))}
        </ul>
      );
    }
    if (typeof message === "object" && message !== null) {
      return (
        <>
          {message.success && (
            <p className="po-message-line po-success">{message.success}</p>
          )}
          {message.errors && message.errors.length > 0 && (
            <ul className="po-message-list">
              {message.errors.map((err, idx) => (
                <li key={idx} className="po-message-item">
                  {err}
                </li>
              ))}
            </ul>
          )}
        </>
      );
    }
    return null;
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  return (
    <div className="po-notification-overlay">
      <div className={`po-notification-modal po-${type}`}>
        <div className="po-notification-header">
          <h3>{title}</h3>
          {type !== "confirm" && (
            <button className="po-close-btn" onClick={onClose}>
              ✕
            </button>
          )}
        </div>
        <div className="po-notification-body">{renderContent()}</div>
        <div className="po-notification-footer">
          {type === "confirm" ? (
            <div className="po-confirm-buttons">
              <button onClick={onClose} className="po-cancel-btn">
                {cancelText}
              </button>
              <button onClick={handleConfirm} className="po-confirm-btn">
                {confirmText}
              </button>
            </div>
          ) : (
            <button onClick={onClose} className="po-ok-btn">
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationModal;