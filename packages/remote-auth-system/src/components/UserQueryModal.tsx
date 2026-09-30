import React, { useState } from "react";
import "./UserQueryModal.css";
import { toast } from "react-toastify";
import { updateAdditionalQueryStatus } from "../api/additionalQueryApi";
import type { AdditionalQueryListDto } from "../Dto/AdditionalQueryDto";

type Props = {
  open: boolean;
  onClose: () => void;
  data: AdditionalQueryListDto;
  onUpdateSuccess: () => void;
};

const UserQueryModal: React.FC<Props> = ({ open, onClose, data, onUpdateSuccess }) => {
  const [status, setStatus] = useState(data.status);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSave = async () => {
    if (status === data.status) {
      onClose();
      return;
    }

    setLoading(true);
    try {
      const response = await updateAdditionalQueryStatus(data.id, { status });

      if ("statusCode" in response) {
        if (response.statusCode === 200) {
          toast.success("Status updated successfully");
          onUpdateSuccess();
        } else {
          toast.error(response.message || "Failed to update status");
        }
      } else {
        toast.success("Status updated successfully");
        onUpdateSuccess();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="uqm-overlay" onClick={onClose}>
      <div className="uqm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="uqm-header">
          <h2 className="uqm-title">
            QUERY ID: <span>{data.id.slice(0, 8)}</span>
          </h2>
          <button className="uqm-close-btn" onClick={onClose} disabled={loading}>×</button>
        </div>

        <div className="uqm-body">
          <div className="uqm-field">
            <label className="uqm-label">Name</label>
            <input className="uqm-input" value={data.name} readOnly />
          </div>

          <div className="uqm-field">
            <label className="uqm-label">Email</label>
            <input className="uqm-input" value={data.email} readOnly />
          </div>

          <div className="uqm-field">
            <label className="uqm-label">Phone</label>
            <input className="uqm-input" value={data.phone || "—"} readOnly />
          </div>

          <div className="uqm-field">
            <label className="uqm-label">Organization</label>
            <input className="uqm-input" value={data.organization} readOnly />
          </div>

          <div className="uqm-field">
            <label className="uqm-label">Message</label>
            <textarea className="uqm-textarea" value={data.message} readOnly rows={5} />
          </div>

          <div className="uqm-field">
            <label className="uqm-label">Status</label>
            <select
              className="uqm-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={loading}
            >
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>

          <div className="uqm-actions">
            <button 
              className="uqm-btn-cancel" 
              onClick={onClose} 
              disabled={loading}
            >
              Cancel
            </button>
            <button
              className="uqm-btn-save"
              onClick={handleSave}
              disabled={loading || status === data.status}
            >
              {loading ? "Saving..." : "Update Status"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserQueryModal;