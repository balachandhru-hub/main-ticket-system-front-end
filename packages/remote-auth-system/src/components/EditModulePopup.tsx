import React, { useState } from "react";
import "./Popup.css";

interface EditModulePopupProps {
  onClose: () => void;
  moduleName: string;
  status: boolean;
  onSave: (name: string, isActive: boolean) => void;
}

const EditModulePopup: React.FC<EditModulePopupProps> = ({ onClose, moduleName, status, onSave }) => {

  const [isActive, setIsActive] = useState(status);

  const handleSave = () => {
    onSave(moduleName, isActive); 
    onClose();
  };

  return (
    <div className="popup-overlay">
      <div className="popup">
        <button className="popup-close" onClick={onClose}>×</button>
        <h2 className="popup-title">Edit Module</h2>

        <label className="popup-label">Module name</label>
        <input
          className="popup-input"
          type="text"
          value={moduleName}
          readOnly 
        />

        <label className="popup-label">Active/Inactive Status</label>
        <div
          className={`toggle-switch ${isActive ? "active" : "inactive"}`}
          onClick={() => setIsActive(!isActive)}
        >
          <div className="toggle-knob" />
        </div>

        <button className="popup-submit" onClick={handleSave}>Save</button>
      </div>
    </div>
  );
};

export default EditModulePopup;
