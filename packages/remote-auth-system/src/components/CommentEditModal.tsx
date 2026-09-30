import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import "./CommentEditModal.css";
import { getAllReasons } from "../api/invoiceApi-table";

interface CommentEditModalProps {
  isOpen: boolean;
  invoiceId: string;
  currentComment: string;
  onClose: () => void;
  onSave: (comment: string) => Promise<void>;
  isSaving: boolean;
}
const CommentEditModal: React.FC<CommentEditModalProps> = ({
  isOpen,
  invoiceId,
  currentComment,
  onClose,
  onSave,
  isSaving,
}) => {
  const [comment, setComment] = useState(currentComment);
  const [selectedOption, setSelectedOption] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState<boolean>(false);

  useEffect(() => {
    setComment(currentComment);
    setSelectedOption("");
  }, [currentComment, isOpen]);

  useEffect(() => {
    if (isOpen) {
      const fetchOptions = async () => {
        setIsLoadingOptions(true);
        try {
          const apiReasons = await getAllReasons();
          setOptions(apiReasons); 
        } catch (error) {
          setOptions(["No Data Available"]);
        } finally {
          setIsLoadingOptions(false);
        }
      };

      fetchOptions();
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!comment.trim()) {
      alert("Please enter a comment");
      return;
    }
    await onSave(comment);
  };

  const handleDropdownChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const value = e.target.value;
    setSelectedOption(value);

    if (value) {
      setComment(value);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="comment-modal-overlay">
      <div className="comment-modal-content">
        <div className="comment-modal-header">
          <h3 className="comment-modal-title">
            Ariba Comment
          </h3>

          <button
            className="comment-modal-close"
            onClick={onClose}
            disabled={isSaving}
          >
            <X size={20} />
          </button>
        </div>

        <div className="comment-modal-info">
          <span className="info-label">
            Invoice ID:
          </span>

          <span className="info-value">
            {invoiceId}
          </span>
        </div>

        <div className="comment-modal-field">
          <label className="comment-modal-label">
            Select Reason
          </label>

          <select
            className="comment-modal-select"
            value={selectedOption}
            onChange={handleDropdownChange}
            disabled={isSaving || isLoadingOptions}
          >
            <option value="">
              {isLoadingOptions ? "Loading reasons..." : "Select a reason"}
            </option>

            {options.map((option) => (
              <option
                key={option}
                value={option}
              >
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="comment-modal-field">
          <label className="comment-modal-label">
            Ariba Comment
          </label>

          <textarea
            className="comment-modal-textarea"
            value={comment}
            onChange={(e) =>
              setComment(e.target.value)
            }
            placeholder="Enter Ariba comment..."
            disabled={isSaving}
            maxLength={500}
          />

          <div className="comment-char-count">
            {comment.length}/500
          </div>
        </div>

        <div className="comment-modal-buttons">
          <button
            className="comment-modal-btn cancel-btn"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </button>

          <button
            className="comment-modal-btn sv-btn"
            onClick={handleSave}
            disabled={isSaving || !comment.trim()}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommentEditModal;