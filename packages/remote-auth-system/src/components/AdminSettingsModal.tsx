import React, { useState } from "react";
import { X } from "lucide-react";
import "./AdminSettingsModal.css";

interface AdminSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AdminSettingsModal: React.FC<AdminSettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<"buyer" | "email" | "api">("buyer");

  if (!isOpen) return null;

  const handleClose = () => {
    onClose();
    setActiveTab("buyer");
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <h2>Admin Settings</h2>
          <button className="modal-close" onClick={handleClose}>
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="settings-tabs">
          <div
            className={`tab ${activeTab === "buyer" ? "active" : ""}`}
            onClick={() => setActiveTab("buyer")}
          >
            Buyer Registration
          </div>
          <div
            className={`tab ${activeTab === "email" ? "active" : ""}`}
            onClick={() => setActiveTab("email")}
          >
            Email Settings
          </div>
          <div
            className={`tab ${activeTab === "api" ? "active" : ""}`}
            onClick={() => setActiveTab("api")}
          >
            API & BOT
          </div>
        </div>

        {/* Tab Content */}
        <div className="modal-body">
          {/* Buyer Registration */}
          {activeTab === "buyer" && (
            <div>
              <h3 className="section-title">Buyer Credentials</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>
                    Buyer Name<span className="required">*</span>
                  </label>
                  <input type="text" placeholder="Enter username" />
                </div>
                <div className="form-group">
                  <label>
                    Password<span className="required">*</span>
                  </label>
                  <input type="password" placeholder="Enter password" />
                </div>
                <div className="form-group">
                  <label>
                    Confirm Password<span className="required">*</span>
                  </label>
                  <input type="password" placeholder="Confirm password" />
                </div>
                <div className="form-group">
                  <label>Ariba User Name</label>
                  <input type="text" placeholder="Enter Ariba username" />
                </div>
                <div className="form-group">
                  <label>Ariba Password</label>
                  <input type="password" placeholder="Enter Ariba password" />
                </div>
              </div>

              <h3 className="section-title">Buyer Identification Details</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>
                    Name<span className="required">*</span>
                  </label>
                  <input type="text" placeholder="Enter name" />
                </div>
                <div className="form-group">
                  <label>
                    Phone Number<span className="required">*</span>
                  </label>
                  <input type="text" placeholder="Enter phone number" />
                </div>
                <div className="form-group">
                  <label>
                    Email ID<span className="required">*</span>
                  </label>
                  <input type="email" placeholder="Enter email id" />
                </div>
                <div className="form-group">
                  <label>
                    Designation<span className="required">*</span>
                  </label>
                  <input type="text" placeholder="Enter designation" />
                </div>
                <div className="form-group">
                  <label>
                    Employee ID<span className="required">*</span>
                  </label>
                  <input type="text" placeholder="Enter employee id" />
                </div>
                <div className="form-group">
                  <label>
                    Department<span className="required">*</span>
                  </label>
                  <input type="text" placeholder="Enter department" />
                </div>
                <div className="form-group form-group-full">
                  <label>
                    Countries / Region<span className="required">*</span>
                  </label>
                  <select>
                    <option value="">Select the countries / region</option>
                    <option>United States</option>
                    <option>United Kingdom</option>
                    <option>India</option>
                    <option>Canada</option>
                    <option>Australia</option>
                  </select>
                </div>
                <div className="form-group form-group-full">
                  <label>
                    Address<span className="required">*</span>
                  </label>
                  <input type="text" placeholder="Enter address" />
                </div>
                <div className="form-group form-group-full">
                  <label>
                    Buyers Name<span className="required">*</span>
                  </label>
                  <input type="text" placeholder="Enter buyer's name" />
                </div>
              </div>
            </div>
          )}

          {/* Email Settings */}
          {activeTab === "email" && (
            <div>
              <h3 className="section-title">Email Settings</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Email ID</label>
                  <input type="email" placeholder="Enter email" />
                </div>
                <div className="form-group">
                  <label>SMTP Host</label>
                  <input type="text" placeholder="Enter SMTP Host" />
                </div>
                <div className="form-group">
                  <label>SMTP Port</label>
                  <input type="number" placeholder="Enter SMTP Port" />
                </div>
                <div className="form-group">
                  <label>SMTP Password</label>
                  <input type="password" placeholder="Enter SMTP password" />
                </div>
              </div>
            </div>
          )}

          {/* API & BOT */}
          {activeTab === "api" && (
            <div>
              <h3 className="section-title">API & BOT</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>RPA URL</label>
                  <input type="text" placeholder="Enter RPA URL" />
                </div>
                <div className="form-group">
                  <label>RPA User</label>
                  <input type="text" placeholder="Enter RPA User" />
                </div>
                <div className="form-group">
                  <label>RPA Password</label>
                  <input type="password" placeholder="Enter RPA credentials" />
                </div>
                <div className="form-group">
                  <label>PO API</label>
                  <input type="text" placeholder="Enter PO API" />
                </div>
                <div className="form-group">
                  <label>RCT API</label>
                  <input type="text" placeholder="Enter RCT API" />
                </div>
                <div className="form-group form-group-full">
                  <label>End Point API</label>
                  <input type="text" placeholder="Enter End Point API" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button type="button" className="btn-cancel" onClick={handleClose}>
            Cancel
          </button>
          <button type="button" className="btn-submit">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsModal;
