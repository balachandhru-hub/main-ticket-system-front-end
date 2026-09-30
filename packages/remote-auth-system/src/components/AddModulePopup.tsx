import React, { useState } from "react";
import "./Popup.css";

interface AddModulePopupProps {
  onClose: () => void;
  onAdd: (name: string, isActive: boolean) => void;
}

const AddModulePopup: React.FC<AddModulePopupProps> = ({ onClose, onAdd }) => {
  const [moduleName, setModuleName] = useState("");
  const [isActive, setIsActive] = useState(true);

  const handleSubmit = () => {
    onAdd(moduleName, isActive);
    onClose();
  };

  return (
    <div className="popup-overlay">
      <div className="popup">
        <button className="popup-close" onClick={onClose}>×</button>
        <h2 className="popup-title">Add New Module</h2>

        <label className="popup-label">Module name</label>
        <input
          className="popup-input"
          type="text"
          value={moduleName}
          onChange={(e) => setModuleName(e.target.value)}
        />

        <label className="popup-label">Active/Inactive Status</label>
        <div
          className={`toggle-switch ${isActive ? "active" : "inactive"}`}
          onClick={() => setIsActive(!isActive)}
        >
          <div className="toggle-knob" />
        </div>

        <button className="popup-submit" onClick={handleSubmit}>Add</button>
      </div>
    </div>
  );
};

export default AddModulePopup;
