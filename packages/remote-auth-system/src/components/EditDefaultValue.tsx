import React, { useState } from "react";
import "./EditDefaultValue.css";
import { updatePlanConfig } from "../api/planConfig";
import type { UpdatePlanConfigDto } from "../Dto/UpdatePlanConfigDto";
import type { SuccessResponseDto } from "../Dto/SuccessResponseDto";
import type { ErrorResponseDto } from "../Dto/ErrorResponseDto";
import { toast } from 'react-toastify';

interface Props {
  fieldName: string;
  defaultValue: string;
  id: string;
  onClose: () => void;
  onSaveSuccess?: (newValue: string) => void;
}

const EditDefaultValue: React.FC<Props> = ({
  fieldName,
  defaultValue,
  id,
  onClose,
  onSaveSuccess,
}) => {
  const [value, setValue] = useState(defaultValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    const dto: UpdatePlanConfigDto = { id, value };

    try {
      const response: SuccessResponseDto | ErrorResponseDto = await updatePlanConfig(dto);

      if ("statusCode" in response && response.statusCode >= 400) {
        if (response.statusCode === 401) {
          setError("Unauthorized. Please login again.");
          toast.error("Unauthorized. Redirecting to login...");
          setTimeout(() => {
            window.location.href = "/";
          }, 2000);
        } else {
          setError(response.message || "Failed to update.");
          toast.error(response.message || "Failed to update.");
        }
      } else {
        toast.success("Value updated successfully!");
        if (onSaveSuccess) {
          onSaveSuccess(value);
        }
        onClose();
      }
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setError("Unauthorized. Please login again.");
        toast.error("Unauthorized. Redirecting to login...");
        setTimeout(() => {
          window.location.href = "/";
        }, 2000);
      } else {
        setError("Unexpected error while updating.");
        toast.error("Unexpected error while updating.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="edit-default-overlay">
      <div className="edit-default-modal">
        <button className="edit-default-close" onClick={() => {
          onClose();
        }}>
          ✕
        </button>

        <h2 className="edit-default-title">Edit Default Value</h2>
        <p className="edit-default-subtitle">Editing: {fieldName}</p>

        <label className="edit-default-label">Field name</label>
        <input type="text" value={fieldName} disabled className="edit-default-input" />

        <label className="edit-default-label">Default value</label>
        <input
          type="number"
          value={value}
          onChange={(e) => {
            const inputValue = e.target.value;
            if (/^\d*$/.test(inputValue) && Number(inputValue) <= 100000) {
              setValue(inputValue);
            }
          }}
          className="edit-default-input"
        />

        {error && <p className="error-text">{error}</p>}

        <button
          className="edit-default-button"
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
};

export default EditDefaultValue;
