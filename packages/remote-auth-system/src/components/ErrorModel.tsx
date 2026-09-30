import React, { useEffect } from 'react';
import './ErrorModel.css';

interface ErrorModelProps {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onClose: () => void;
  autoClose?: boolean; 
}

const ErrorModel: React.FC<ErrorModelProps> = ({
  visible,
  title,
  message,
  onConfirm,
  onClose,
   autoClose = false,
}) => {
  useEffect(() => {
  if (visible && autoClose) {
      const timer = setTimeout(() => {
        onConfirm();
        onClose();
      }, 2000); 
      return () => clearTimeout(timer);
    }
  }, [visible, autoClose, onConfirm, onClose]);

  if (!visible) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content-error">
        <button className="modal-close" onClick={onClose}>
          &times;
        </button>
        <h2>{title}</h2>
        <p>{message}</p>
        <button className="modal-ok-button" onClick={() => {
          onConfirm();
          onClose();
        }}>
          OK
        </button>
      </div>
    </div>
  );
};

export default ErrorModel;
