import React, { useState, useEffect, useRef } from "react";
import { FiTrash2 } from "react-icons/fi";
import "./BusinessPlan.css";
import "./EmailCC.css";
import BackButton from "./BackButton";
import { getEmailCCs, createEmailCC, deleteEmailCC } from "../api/EmailCCApi";
import { EMAIL_CC_ENTITY_TYPES } from "../common/common.ts";
import { toast } from "react-toastify";

interface Section {
  id: string;
  title: string;
  emails: { id: string; emailAddress: string; entityType: string }[];
}


const isErrorResponse = (
  response: any
): response is { statusCode: number; message: string; description?: string } => {
  return (
    response &&
    typeof response === "object" &&
    "statusCode" in response &&
    typeof response.statusCode === "number" &&
    response.statusCode >= 400
  );
};

const EmailCC: React.FC = () => {
  const [sections, setSections] = useState<Section[]>([]);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [currentSection, setCurrentSection] = useState<string | null>(null);
  const [currentEmail, setCurrentEmail] = useState<string>("");
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [deleteEmailId, setDeleteEmailId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

 
  const pendingOperations = useRef<Set<string>>(new Set());
  const lastFetchTime = useRef<number>(0);

  useEffect(() => {
    fetchEmails();
  }, []);

  const fetchEmails = async (force: boolean = false) => {
    if (pendingOperations.current.size > 0 && !force) {
      return;
    }

    try {
      const fetchTime = Date.now();
      lastFetchTime.current = fetchTime;

      const results = await Promise.allSettled(
        EMAIL_CC_ENTITY_TYPES.map((type) => getEmailCCs(type))
      );

      if (fetchTime < lastFetchTime.current) {
        return;
      }

      const groupedSections: Section[] = results.map((result, idx) => {
        const entityType = EMAIL_CC_ENTITY_TYPES[idx];
        const baseSection: Section = {
          id: entityType,
          title: `${entityType
            .replace(/_/g, " ")
            .toLowerCase()
            .replace(/\b\w/g, (l) => l.toUpperCase())} Creation`,
          emails: [],
        };

        if (result.status === "fulfilled") {
          const data = result.value;

          if (isErrorResponse(data)) {
            return baseSection;
          }

          if (Array.isArray(data)) {
            return {
              ...baseSection,
              emails: data.map((item) => ({
                id: item.id!,
                emailAddress: item.emailAddress,
                entityType,
              })),
            };
          }
        }

        return baseSection;
      });

      if (pendingOperations.current.size === 0) {
        setSections([...groupedSections]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPopup = (sectionId: string) => {
    setCurrentSection(sectionId);
    setCurrentEmail("");
    setIsPopupOpen(true);
  };

  const handleCreateEmail = async () => {
    if (!currentSection || !currentEmail.trim()) return;

    const sectionId = currentSection;
    const emailAddress = currentEmail.trim();
    const operationId = `create-${Date.now()}`;

    setIsPopupOpen(false);
    setCurrentEmail("");
    setCurrentSection(null);

    pendingOperations.current.add(operationId);

    try {
      const result = await createEmailCC({
        entityType: sectionId,
        emailAddress,
      });

      if (isErrorResponse(result)) {
        toast.error(result.message || "Failed to create email");
        return;
      }

      const newEmail = {
        id: (result as any)?.id ?? `new-${Date.now()}`,
        emailAddress: (result as any)?.emailAddress ?? emailAddress,
        entityType: (result as any)?.entityType ?? sectionId,
      };

      setSections((prev) =>
        prev.map((s) =>
          s.id === sectionId ? { ...s, emails: [...s.emails, newEmail] } : s
        )
      );

      toast.success("Email added successfully");
    } catch (err) {
      toast.error("Failed to create email. Please try again.");
    } finally {
      pendingOperations.current.delete(operationId);

      setTimeout(() => {
        if (pendingOperations.current.size === 0) {
          fetchEmails();
        }
      }, 2000);
    }
  };

  const handleDeleteConfirm = (sectionId: string, index: number) => {
    const section = sections.find((s) => s.id === sectionId);
    const emailToDelete = section?.emails[index];

    if (!emailToDelete) return;

    setCurrentSection(sectionId);
    setDeleteIndex(index);
    setDeleteEmailId(emailToDelete.id);
    setIsDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!currentSection || deleteIndex === null || !deleteEmailId) return;

    const sectionId = currentSection;
    const emailId = deleteEmailId;
    const operationId = `delete-${Date.now()}`;

    const section = sections.find((s) => s.id === sectionId);
    const emailToDelete = section?.emails[deleteIndex];

    if (!emailToDelete) {
      toast.error("Cannot delete email: Email not found.");
      setIsDeleteConfirmOpen(false);
      return;
    }

    setIsDeleteConfirmOpen(false);
    setDeleteIndex(null);
    setDeleteEmailId(null);
    setCurrentSection(null);

    pendingOperations.current.add(operationId);

    try {
      const result = await deleteEmailCC(emailId, emailToDelete.entityType);

      if (isErrorResponse(result)) {
        toast.error(result.message || "Failed to delete email");
      } else {
        setSections((prev) =>
          prev.map((s) =>
            s.id === sectionId
              ? { ...s, emails: s.emails.filter((email) => email.id !== emailId) }
              : s
          )
        );
        toast.success("Email deleted successfully");
      }
    } catch (err) {
      
      toast.error("Failed to delete email. Please try again.");
    } finally {
      pendingOperations.current.delete(operationId);

      setTimeout(() => {
        if (pendingOperations.current.size === 0) {
          fetchEmails();
        }
      }, 2000);
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteConfirmOpen(false);
    setDeleteIndex(null);
    setDeleteEmailId(null);
    setCurrentSection(null);
  };

  const handleCancelCreate = () => {
    setIsPopupOpen(false);
    setCurrentEmail("");
    setCurrentSection(null);
  };

  if (loading) {
    return (
      <div className="loader-container">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="emailcc-back-bar">
        <BackButton />
      </div>
      <div className="title">
        <h2 className="title-text">Email CC</h2>
      </div>

      <div className="business-plans-container">
        {sections.map((section) => (
          <div className="section-wrapper" key={section.id}>
            <div className="emailcc-section-header">
              <div className="emailcc-section-title">{section.title}</div>
              <button
                onClick={() => handleOpenPopup(section.id)}
                className="emailcc-add-btn"
              >
                + Add new
              </button>
            </div>
            <div className="section-card">
              <div className="table-wrapper">
                <table className="emailcc-table">
                  <thead>
                    <tr>
                      <th>Mail ID</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.emails.length === 0 ? (
                      <tr>
                        <td colSpan={2} style={{ textAlign: "center" }}>
                          No data to show
                        </td>
                      </tr>
                    ) : (
                      section.emails.map((email, index) => (
                        <tr key={`${email.id}-${email.emailAddress}`}>
                          <td>{email.emailAddress}</td>
                          <td>
                            <div className="emailcc-action-icons">
                              <FiTrash2
                                className="emailcc-icon-image"
                                onClick={() =>
                                  handleDeleteConfirm(section.id, index)
                                }
                              />
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}
      </div>
      {isPopupOpen && (
        <div className="emailcc-popup-overlay">
          <div className="emailcc-popup-card">
            <h3>Add New Email</h3>
            <input
              type="email"
              value={currentEmail}
              onChange={(e) => setCurrentEmail(e.target.value)}
              placeholder="Enter email"
            />
            <div className="emailcc-popup-actions">
              <button
                onClick={handleCreateEmail}
                className="emailcc-save-btn"
                disabled={!currentEmail.trim()}
              >
                Save
              </button>
              <button onClick={handleCancelCreate} className="emailcc-cancel-btn">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      
      {isDeleteConfirmOpen && (
        <div className="emailcc-popup-overlay">
          <div className="emailcc-popup-card">
            <h3>Are you sure you want to delete?</h3>
            <div className="emailcc-popup-actions">
              <button onClick={handleDelete} className="emailcc-delete-btn">
                Delete
              </button>
              <button onClick={handleCancelDelete} className="emailcc-cancel-btn">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailCC;