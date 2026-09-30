// CreateTicket.tsx
import { useState, useRef, useEffect } from "react";
import { toast } from "react-toastify";
import { createTicket } from "../api/TicketApi";
import type { TicketCreateDto } from "../Dto/TicketCreateDto";
import "./NewTickets.css";
import {
  ASSET_TYPES,
  ENTITY_TYPE,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
} from "../common/common";
import RoleBasedSelect from "../components/RoleBasedSelect";
import type { SuccessResponseDto } from "../Dto/SuccessResponseDto";
import type { ErrorResponseDto } from "../Dto/ErrorResponseDto";
import ErrorModel from "../components/ErrorModel";
import { useNavigate } from "react-router-dom";
import type { AssetNewUploadDto } from "../Dto/AssetNewUploadDto";

const CreateTicket = () => {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<File[]>([]);

  const [showSessionModal, setShowSessionModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const [titleError, setTitleError] = useState("");
  const [descriptionError, setDescriptionError] = useState("");

  const navigate = useNavigate();
  const [errorPageData, setErrorPageData] = useState({
    title: "",
    message: "",
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const TITLE_MAX_LENGTH = 50;
  const DESCRIPTION_MAX_LENGTH = 200;

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const resetForm = () => {
    setTitle("");
    setCategory("");
    setPriority("");
    setDescription("");
    setImage([]);
    setTitleError("");
    setDescriptionError("");
    if (textareaRef.current) textareaRef.current.value = "";
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= TITLE_MAX_LENGTH) {
      setTitle(value);
      setTitleError("");
    } else {
      setTitleError(`Title cannot exceed ${TITLE_MAX_LENGTH} characters`);
    }
  };

  const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const value = e.target.value;
    if (value.length <= DESCRIPTION_MAX_LENGTH) {
      setDescription(value);
      setDescriptionError("");
    } else {
      setDescriptionError(
        `Description cannot exceed ${DESCRIPTION_MAX_LENGTH} characters`,
      );
    }
  };
  // from QuickSES we were taking screenshot and navigate here
useEffect(() => {
  const dataUrl = sessionStorage.getItem("autoAttachScreenshot");
  if (!dataUrl) return;
  if (sessionStorage.getItem("screenshotAttached") === "true") return;

  const attach = async () => {
    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], `screenshot-${Date.now()}.png`, { type: "image/png" });

      setImage(current => {
        const filtered = current.filter(f => !f.name.startsWith("screenshot-"));
        const updated = [...filtered, file];
        return updated.length > 10 ? updated.slice(-10) : updated;
      });
        toast.success("Screenshot attached automatically!", {
        onClose: () => {
          sessionStorage.removeItem("screenshotAttached");
          sessionStorage.removeItem("autoAttachScreenshot");
        }
      });

    } catch (err) {
      sessionStorage.removeItem("autoAttachScreenshot");
      sessionStorage.removeItem("screenshotAttached");
    }
  };

  attach();
}, []);

  const handleSubmit = async () => {
    if (loading) return; // PREVENT DOUBLE SUBMIT

    const trimmedTitle = title.trim();
    const trimmedCategory = category.trim();
    const trimmedPriority = priority.trim();
    const trimmedDescription = description.trim();

    setTitleError("");
    setDescriptionError("");

    if (
      !trimmedTitle ||
      !trimmedCategory ||
      !trimmedPriority ||
      !trimmedDescription
    ) {
      toast.warn("Please fill in all required fields");

      if (!trimmedTitle) setTitleError("Title is required");
      if (!trimmedDescription) setDescriptionError("Description is required");

      return;
    }

    function isSuccess(
      response: SuccessResponseDto | ErrorResponseDto,
    ): response is SuccessResponseDto {
      return "id" in response;
    }

    function isErrorResponse(
      response: SuccessResponseDto | ErrorResponseDto,
    ): response is ErrorResponseDto {
      return "message" in response && "statusCode" in response;
    }

    setLoading(true);
    let assets: AssetNewUploadDto[] = [];

    if (image.length > 0) {
      const base64Strings = await Promise.all(
        image.map((file) => toBase64(file)),
      );

      assets = image.map((file, index) => ({
        entityType: ENTITY_TYPE.TICKET,
        contentType: file.type || "application/octet-stream",
        assetType: ASSET_TYPES.UPLOADED_FILE,
        fileBytes: base64Strings[index],
        fileName: file.name,
        isSingletonAsset: false,
      }));
    }

    const ticketPayload: TicketCreateDto = {
      title: trimmedTitle,
      description: trimmedDescription,
      priority: trimmedPriority,
      category: trimmedCategory,
      ipAddress: null,
      isExceed: false,
      asset: assets.length > 0 ? assets : null,
    };

    try {
      const res = await createTicket(ticketPayload);

      if (isSuccess(res)) {
        toast.success("Ticket submitted successfully");
        resetForm();
        navigate("/dashboard/tickets"); // FIXED: proper redirect
      } else if (isErrorResponse(res)) {
        if (res.statusCode === 401) {
          setShowSessionModal(true);
          setErrorPageData({
            ...errorPageData,
            title: res.message,
            message: res.description,
          });
        } else {
          toast.error(res.message || "Ticket creation failed");
        }
      }
    } catch (err) {
      toast.error("Unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSessionConfirm = () => {
    setShowSessionModal(false);
    navigate("/");
  };
  const MAX_FILES = 10;
  const MAX_SIZE_MB = 10;
  const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  const allowedTypes = ["image/png", "image/jpeg"];

  const validFiles = Array.from(files).filter((file) => {
    if (!allowedTypes.includes(file.type)) {
      toast.error(`"${file.name}" is not allowed. Only PNG and JPG formats are allowed.`);
      return false;
    }
    if (file.size > MAX_SIZE_BYTES) {
      alert(`"${file.name}" is larger than 10MB`);
      return false;
    }
    return true;
  });

  setImage((prev) => {
    const combined = [...prev, ...validFiles];
    if (combined.length > MAX_FILES) {
      alert(`Maximum 10 images allowed. Only first 10 kept.`);
      return combined.slice(0, MAX_FILES);
    }
    return combined;
  });

  e.target.value = "";
};
  const removeImage = (index: number) => {
    setImage((prev) => prev.filter((_, i) => i !== index));
  };
  const truncateFileName = (name: string, maxLength = 20): string => {
    if (name.length <= maxLength) return name;

    const lastDot = name.lastIndexOf(".");
    if (lastDot === -1) {
      return name.substring(0, maxLength - 3) + "...";
    }

    const base = name.substring(0, lastDot);
    const ext = name.substring(lastDot);

    if (base.length <= maxLength - ext.length - 3) {
      return name;
    }

    return base.substring(0, maxLength - ext.length - 3) + "..." + ext;
  };

  return (
    <div className="su-container">
      <div className="su-box">
        <div className="su-box-sub-container">
          <div className="su-header">
            <svg
              className="su-search-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <h3>Describe your Issue*</h3>
          </div>

          <div className="su-form-grid">
            <div className="su-form-group">
              <label>Title</label>
              <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                className="su-input"
                placeholder="Enter the title"
              />
              {titleError && (
                <div className="su-error-message">{titleError}</div>
              )}
              <div
                className={`su-char-counter ${
                  title.length > TITLE_MAX_LENGTH * 0.8
                    ? "su-counter-warning"
                    : ""
                }`}
              >
                {title.length}/{TITLE_MAX_LENGTH}
              </div>
            </div>

            <div className="su-form-group">
              <label>Category</label>
              <RoleBasedSelect
                name="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="All categories"
                options={[
                  { value: TICKET_CATEGORIES.TECHNICAL_SUPPORT, label: "Technical Support" },
                  { value: TICKET_CATEGORIES.BILLING_PAYMENT, label: "Billing & Payment" },
                  { value: TICKET_CATEGORIES.GENERAL_INQUIRY, label: "General Inquiry" },
                ]}
              />
            </div>
          </div>

          <div className="su-priority-row">
            <div className="su-form-group su-priority-group">
              <label>Priority</label>
              <RoleBasedSelect
                name="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                placeholder="All priorities"
                options={[
                  { value: TICKET_PRIORITIES.HIGH, label: "High" },
                  { value: TICKET_PRIORITIES.MEDIUM, label: "Medium" },
                  { value: TICKET_PRIORITIES.LOW, label: "Low" },
                ]}
              />
            </div>
          </div>

          <div className="su-form-group su-description-group">
            <label>What can we help you with?</label>
            <textarea
              ref={textareaRef}
              value={description}
              onChange={handleDescriptionChange}
              className="su-textarea"
              placeholder="Describe your issue..."
            />
            {descriptionError && (
              <div className="su-error-message">{descriptionError}</div>
            )}
            <div
              className={`su-char-counter ${
                description.length > DESCRIPTION_MAX_LENGTH * 0.8
                  ? "su-counter-warning"
                  : ""
              }`}
            >
              {description.length}/{DESCRIPTION_MAX_LENGTH}
            </div>
          </div>
        </div>

        <div className="su-screenshot-section">
          <h3>Screenshot</h3>
          <div className="su-upload-section">
            <label className="su-upload-btn">
              <svg
                className="su-upload-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7,10 12,15 17,10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Upload Image
              <input
                type="file"
                accept="image/png, image/jpeg"
                hidden
                multiple
                onChange={handleFileChange}
              />
            </label>
          </div>
          {image.length > 0 && (
            <div className="su-chips-container">
              {image.map((file, index) => {
                const previewUrl = URL.createObjectURL(file);
                return (
                  <span
                    key={file.name + file.size + index}
                    className="su-chip"
                    onClick={() => window.open(previewUrl, "_blank")}
                    title={`Click to view: ${file.name} (${(
                      file.size /
                      1024 /
                      1024
                    ).toFixed(1)} MB)`}
                  >
                    <span className="su-chip-filename">
                      {truncateFileName(file.name, 20)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(index);
                      }}
                      className="su-chip-remove"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
              <span className="su-count">
                {image.length} / 10 {`(<10MB)`}
              </span>
            </div>
          )}
        </div>

        <div className="button-wrapper">
          <button
            className="su-submit-btn"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Submitting..." : "Submit"}
          </button>
        </div>

        {showSessionModal && (
          <ErrorModel
            visible={showSessionModal}
            title=""
            message={errorPageData.title}
            onConfirm={handleSessionConfirm}
            onClose={handleSessionConfirm}
          />
        )}
      </div>
    </div>
  );
};

export default CreateTicket;
