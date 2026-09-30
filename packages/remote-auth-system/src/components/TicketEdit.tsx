import React, { useEffect, useState } from "react";
import "./TicketEdit.css";
import BackButton from "./BackButton";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../components/context/AuthContext";
import { getTicketById, updateTicket } from "../api/TicketApi";
import { GetConsultantsWithTicketCount } from "../api/userApi";
import type { ConsultantTicketCountDto } from "../Dto/ConsultantTicketCountDto";

import type { EditTicketDto } from "../Dto/EditTicketDto";
import {
  USER_ROLES,
  type UserRole,
  TICKET_STATUS,
  ASSET_TYPES,
  ENTITY_TYPE,
} from "../common/common";
import { TICKET_CATEGORIES, TICKET_PRIORITIES } from "../common/common";
import type { TicketDetailDto } from "../Dto/TicketDetailDto";
import type { ErrorResponseDto } from "../Dto/ErrorResponseDto";
import ErrorModel from "./ErrorModel";
import type { SuccessResponseDto } from "../Dto/SuccessResponseDto";
import { Paperclip } from "lucide-react";
import type { AssetDto } from "../Dto/AssetDto";

const EditTicket: React.FC = () => {
  const location = useLocation();
  const id = location.state?.id;
  const { auth } = useAuth();
  const navigate = useNavigate();

  const roleId = auth?.roleId;
  const userRole: UserRole =
    roleId === USER_ROLES.BUSINESS_ADMIN_USER
      ? USER_ROLES.BUSINESS_ADMIN_USER
      : roleId === USER_ROLES.BUSINESS_USER
      ? USER_ROLES.BUSINESS_USER
      : roleId === USER_ROLES.MANAGER
      ? USER_ROLES.MANAGER
      : roleId === USER_ROLES.LEAD
      ? USER_ROLES.LEAD
      : roleId === USER_ROLES.CONSULTANT
      ? USER_ROLES.CONSULTANT
      : roleId === USER_ROLES.LEADERSHIP_USER
      ? USER_ROLES.LEADERSHIP_USER
      : roleId === USER_ROLES.OPERATIONS_USER
      ? USER_ROLES.OPERATIONS_USER
      : roleId === USER_ROLES.FINANCE_OPERATION_USER
      ? USER_ROLES.FINANCE_OPERATION_USER
      : USER_ROLES.MANAGER;

  const [form, setForm] = useState({
    title: "",
    category: "",
    priority: "",
    description: "",
    assignedTo: "" as string | null,
    adminDescription: "",
    isAssignEnable:
      userRole === USER_ROLES.MANAGER || userRole === USER_ROLES.LEAD,
  });
  const [existingAssets, setExistingAssets] = useState<AssetDto[]>([]);

  const [originalData, setOriginalData] = useState<EditTicketDto | null>(null);
  const [selectedFile, setSelectedFile] = useState<File[]>([]);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [consultants, setConsultants] = useState<ConsultantTicketCountDto[]>(
    [],
  );
  // const [removedAssetIds, setRemovedAssetIds] = useState<string[]>([]);
  const index = 0;
  const limit = 10;

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const canSeeAdditionalComment =
    userRole === USER_ROLES.MANAGER ||
    userRole === USER_ROLES.LEAD ||
    userRole === USER_ROLES.BUSINESS_ADMIN_USER ||
    userRole === USER_ROLES.CONSULTANT;

  function isTicketDetail(
    response: TicketDetailDto | ErrorResponseDto,
  ): response is TicketDetailDto {
    return typeof response === "object" && "id" in response;
  }

  function isErrorResponse(data: any): data is ErrorResponseDto {
    return (
      typeof data === "object" && "message" in data && "description" in data
    );
  }

  function isSuccess(
    response: SuccessResponseDto | ErrorResponseDto,
  ): response is SuccessResponseDto {
    return "id" in response;
  }

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await getTicketById(id);
        if (isTicketDetail(res)) {
          const assets = Array.isArray(res.asset) ? res.asset : [];

          setExistingAssets(assets);
          setSelectedFile([]);
          setForm({
            title: res.title || "",
            category: res.category || "",
            priority: res.priority || "",
            description: res.description || "",
            assignedTo: res.assignedTo || null,
            adminDescription: res.adminDescription || "",
            isAssignEnable:
              userRole === USER_ROLES.MANAGER || userRole === USER_ROLES.LEAD,
          });

          setOriginalData({
            id: res.id,
            category: res.category || "",
            priority: res.priority || "",
            title: res.title || "",
            description: res.description || "",
            adminDescription: res.adminDescription || "",
            status: res.status,
            assignedTo: res.assignedTo || null,
            // asset: imagaeFolder,
          });
        } else if (isErrorResponse(res) && res.statusCode === 401) {
          setShowSessionModal(true);
        }
      } catch (err) {
        toast.error("Failed to fetch ticket.");
      }
    })();
  }, [id]);

  useEffect(() => {
    const fetchConsultants = async () => {
      try {
        const res = await GetConsultantsWithTicketCount(index, limit);
        if (!("statusCode" in res)) {
          setConsultants(Array.isArray(res) ? res : [res]);
        } else if (isErrorResponse(res) && res.statusCode === 401) {
          setShowSessionModal(true);
        }
      } catch (err) {
      }
    };
    if (userRole === USER_ROLES.MANAGER || userRole === USER_ROLES.LEAD) {
      fetchConsultants();
    }
  }, []);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name.trim()]: value }));
  };

  const getChangedFields = (): Partial<EditTicketDto> => {
    if (!originalData) return {};
    const fieldsToCheck = [
      "title",
      "category",
      "priority",
      "description",
      "assignedTo",
      "adminDescription",
    ] as const;
    const changes: Partial<EditTicketDto> = { id: id as string };

    fieldsToCheck.forEach((key) => {
      if (form[key] !== originalData[key]) {
        changes[key] = form[key] === null ? undefined : form[key];
      }
    });

    if (form.isAssignEnable && form.assignedTo) {
      changes.status = TICKET_STATUS.IN_PROGRESS;
    }
    if ((userRole === USER_ROLES.BUSINESS_USER || userRole === USER_ROLES.OPERATIONS_USER || userRole === USER_ROLES.FINANCE_OPERATION_USER) && originalData.status) {
      changes.status = originalData.status;
    }

    return changes;
  };

  const handleUpdate = async (newStatus?: string) => {
    if (!id || !originalData) {
      toast.error("Missing ticket data.");
      return;
    }

    const changedFields = getChangedFields();
    const changes: EditTicketDto = {
      ...originalData,
      ...changedFields,
    };

    if (newStatus) {
      changes.status = newStatus;
    }
    const finalAssets: any[] = [];

    existingAssets.forEach((asset) => {
      finalAssets.push({
        id: asset.id,
        assetType: asset.assetType,
        fileName: asset.fileName,
        fileType: asset.fileType,
        fileBytes: "existing",
      });
    });

    if (selectedFile.length > 0) {
      const newAssets = await Promise.all(
        selectedFile.map(async (file) => ({
          entityId: id,
          entityType: ENTITY_TYPE.TICKET,
          assetType: ASSET_TYPES.UPLOADED_FILE,
          contentType: file.type,
          fileBytes: await toBase64(file),
          fileName: file.name,
          isSingletonAsset: false,
        })),
      );
      finalAssets.push(...newAssets);
    }
    changes.asset = finalAssets;

    const fieldsToCheck = [
      "title",
      "category",
      "priority",
      "description",
      "assignedTo",
      "adminDescription",
    ];
    const hasFieldChanges = fieldsToCheck.some((field) =>
      changedFields.hasOwnProperty(field),
    );

    if (!hasFieldChanges && !newStatus && !selectedFile) {
      toast.info("No changes to submit.");
      return;
    }

    try {
      const res = await updateTicket(changes);
      if (isSuccess(res) && res.statusCode === 200) {
        toast.success("Ticket updated successfully.");
        navigate("/dashboard");
      } else if (isErrorResponse(res) && res.statusCode === 401) {
        setShowSessionModal(true);
      } else {
        toast.error("Failed to update ticket.");
      }
    } catch (err) {
      toast.error("Failed to update ticket.");
    }
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    setSelectedFile((prev) => [...prev, ...imageFiles]);
  };

  const handleRemoveExisting = (assetId: string) => {
    setExistingAssets((prev) => prev.filter((a) => a.id !== assetId));
    // setRemovedAssetIds((prev) => [...prev, assetId]);
  };

  const handleRemoveNew = (index: number) => {
    setSelectedFile((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="et-container">
      <button className="et-back-btn">
        <BackButton />
      </button>
      <div className="et-box">
        <div className="et-box-sub-container">
          {/* Header */}
          <div className="et-header">
            <svg
              className="et-search-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <h3>Edit your Issue*</h3>
          </div>
          <div className="et-grid-lay">
            <form
              className="et-grid-lay"
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdate();
              }}
            >
              {/* Title + Category */}
              <div className="et-form-grid">
                <div className="et-form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    className="et-input"
                    placeholder="Enter the title"
                  />
                </div>

                <div className="et-form-group">
                  <label>Category</label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    className="et-select"
                  >
                    <option value="">Select category</option>
                    <option value={TICKET_CATEGORIES.TECHNICAL_SUPPORT}>
                      Technical Support
                    </option>
                    <option value={TICKET_CATEGORIES.BILLING_PAYMENT}>
                      Billing & Payment
                    </option>
                    <option value={TICKET_CATEGORIES.GENERAL_INQUIRY}>
                      General Inquiry
                    </option>
                  </select>
                </div>
              </div>

              {/* Priority + AssignedTo */}
              <div className="et-priority-row">
                <div className="et-form-group et-priority-group">
                  <label>Priority</label>
                  <select
                    name="priority"
                    value={form.priority}
                    onChange={handleChange}
                    className="et-select"
                  >
                    <option value="">Select priority</option>
                    <option value={TICKET_PRIORITIES.HIGH}>High</option>
                    <option value={TICKET_PRIORITIES.MEDIUM}>Medium</option>
                    <option value={TICKET_PRIORITIES.LOW}>Low</option>
                  </select>
                </div>

                {(userRole === USER_ROLES.MANAGER ||
                  userRole === USER_ROLES.LEAD) && (
                  <div className="et-form-group assign-container">
                    <label className="assign-label">Assigned To</label>
                    <div className="assign-row">
                      <select
                        name="assignedTo"
                        value={form.assignedTo ?? ""}
                        onChange={handleChange}
                        className="et-select"
                        disabled={!form.isAssignEnable}
                      >
                        <option value="">-- Select User--</option>
                        {consultants.map((c) => (
                          <option key={c.userId} value={c.userId}>
                            {c.name}
                          </option>
                        ))}
                      </select>

                      <div className="check-box-row">
                        <input
                          type="checkbox"
                          name="isAssignEnable"
                          className="et-checkbox"
                          checked={form.isAssignEnable || false}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setForm((prev) => ({
                              ...prev,
                              isAssignEnable: isChecked,
                              assignedTo: isChecked ? prev.assignedTo : "",
                            }));
                          }}
                        />
                        <div>Is Assignable</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="et-form-group et-description-group">
                <label>What can we help you with?</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  className="et-textarea"
                />
              </div>

              {/* Admin Description */}
              {canSeeAdditionalComment && (
                <div className="et-form-group et-description-group">
                  <label>Additional Comment</label>
                  <textarea
                    name="adminDescription"
                    value={form.adminDescription}
                    onChange={handleChange}
                    className="et-textarea"
                    readOnly={
                      userRole === USER_ROLES.MANAGER ||
                      userRole === USER_ROLES.CONSULTANT ||
                      userRole === USER_ROLES.LEAD
                    }
                  />
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Upload Section */}
        {(userRole === USER_ROLES.BUSINESS_ADMIN_USER ||
          userRole === USER_ROLES.BUSINESS_USER || userRole === USER_ROLES.OPERATIONS_USER || userRole === USER_ROLES.FINANCE_OPERATION_USER) && (
          <div className="et-screenshot-section">
            <h3>
              <Paperclip size={18} /> Attach Images (
              {existingAssets.length + selectedFile.length})
            </h3>

            <div className="et-chips-container">
              {existingAssets
                .filter(
                  (asset): asset is AssetDto & { id: string } => !!asset.id,
                )
                .map((asset) => (
                  <div key={asset.id} className="et-chip">
                    <span className="et-chip-text">{asset.fileName}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveExisting(asset.id)}
                      className="et-chip-remove"
                    >
                      ×
                    </button>
                  </div>
                ))}
              {selectedFile.map((file, index) => (
                <div key={`new-${index}`} className="et-chip et-chip-new">
                  <span className="et-chip-text">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveNew(index)}
                    className="et-chip-remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div className="et-upload-section">
              <label className="et-upload-btn">
                + Add Image
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleFileSelect}
                  multiple
                />
              </label>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="et-button-wrapper">
          {userRole === USER_ROLES.BUSINESS_ADMIN_USER ? (
            <>
              {originalData?.status === TICKET_STATUS.OPEN && (
                <>
                  <button
                    className="et-approve-btn"
                    type="button"
                    onClick={() => handleUpdate(TICKET_STATUS.APPROVED)}
                  >
                    Approve
                  </button>
                  <button
                    className="et-decline-btn"
                    type="button"
                    onClick={() => handleUpdate(TICKET_STATUS.DECLINE)}
                  >
                    Decline
                  </button>
                </>
              )}
              {originalData?.status === TICKET_STATUS.RE_APPROVE && (
                <>
                  <button
                    className="et-approve-btn"
                    type="button"
                    onClick={() => handleUpdate(TICKET_STATUS.APPROVED)}
                  >
                    Approve
                  </button>
                  <button
                    className="et-decline-btn"
                    type="button"
                    onClick={() => handleUpdate(TICKET_STATUS.REJECTED)}
                  >
                    Reject
                  </button>
                </>
              )}
            </>
          ) : userRole === USER_ROLES.CONSULTANT ? (
            <>
              {originalData?.status === TICKET_STATUS.IN_PROGRESS && (
                <>
                  <button
                    className="et-approve-btn"
                    type="button"
                    onClick={() => handleUpdate(TICKET_STATUS.RESOLVED)}
                  >
                    Resolved
                  </button>
                  <button
                    className="et-decline-btn"
                    type="button"
                    onClick={() => handleUpdate(TICKET_STATUS.ON_HOLD)}
                  >
                    On Hold
                  </button>
                </>
              )}
              {originalData?.status === TICKET_STATUS.ON_HOLD && (
                <>
                  <button
                    className="et-approve-btn"
                    type="button"
                    onClick={() => handleUpdate(TICKET_STATUS.RESOLVED)}
                  >
                    Resolved
                  </button>
                  <button
                    className="et-decline-btn"
                    type="button"
                    onClick={() => handleUpdate(TICKET_STATUS.IN_PROGRESS)}
                  >
                    In Progress
                  </button>
                </>
              )}
            </>
          ) : (
            <button
              className="et-submit-btn"
              type="button"
              onClick={() => handleUpdate()}
            >
              Update
            </button>
          )}
        </div>

        {showSessionModal && (
          <ErrorModel
            visible={showSessionModal}
            title="Session Expired"
            message="Your session has expired. Please log in again."
            onConfirm={() => {
              setShowSessionModal(false);
              navigate("/");
            }}
            onClose={() => {
              setShowSessionModal(false);
              navigate("/");
            }}
          />
        )}
      </div>
    </div>
  );
};

export default EditTicket;
