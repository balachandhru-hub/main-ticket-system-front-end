import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Clock, Ticket, Plus, X, Image } from "lucide-react";
import "./TicketView.css";
import type { TicketDto } from "../Dto/TicketDto";
import TicketMessage from "./TicketMessage";
import { toast } from "react-toastify";
import { createPRTask, getTicketById } from "../api/TicketApi";
import { USER_ROLES } from "../common/common";
import { useAuth } from "../components/context/AuthContext";

interface TicketViewProps {
  ticket: TicketDto | null;
  onTicketUpdate?: (updatedTicket: TicketDto) => void;
}

interface PRTask {
  taskName: string;
  hrs: number;
}

interface PRApiRequest {
  taskName: string;
  hrs: number;
  amount: number;
}

interface TempTask {
  id: string;
  taskName: string;
  estimatedTime: string;
}

const TicketView: React.FC<TicketViewProps> = ({ ticket, onTicketUpdate }) => {
  const [showViewPRModal, setShowViewPRModal] = useState(false);
  const [showNewPRModal, setShowNewPRModal] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskTime, setNewTaskTime] = useState("");
  const [tempTasks, setTempTasks] = useState<TempTask[]>([]);
  const [prTasks, setPrTasks] = useState<PRTask[]>([]);
  const [isLoadingPR, setIsLoadingPR] = useState(false);
  const [isSubmittingPR, setIsSubmittingPR] = useState(false);
  const [hasPRTasksCreated, setHasPRTasksCreated] = useState(false);
  const navigate = useNavigate();

  const { auth } = useAuth();
  const roleId = auth?.roleId;
  const userCanCreatePR =
    roleId === USER_ROLES.MANAGER || roleId === USER_ROLES.LEAD;

  const ticketHasPRTasks =
    ticket &&
    (ticket as any).prDetail &&
    Array.isArray((ticket as any).prDetail) &&
    (ticket as any).prDetail.length > 0;

  const sanitizeInput = (input: string): string => {
    return input
      .trim()
      .replace(/[<>"']/g, "")
      .substring(0, 200);
  };

  const validateTimeInput = (time: string): boolean => {
    const timeFloat = parseFloat(time);
    return !isNaN(timeFloat) && timeFloat > 0 && timeFloat <= 100;
  };

  const refreshTicketFromApi = async (): Promise<TicketDto | null> => {
    if (!ticket?.id) return null;
    try {
      const refreshedTicket = await getTicketById(ticket.id);
      if (!("statusCode" in refreshedTicket)) {
        onTicketUpdate?.(refreshedTicket as TicketDto);
        return refreshedTicket as TicketDto;
      }
    } catch {}
    return null;
  };

  const fetchPRTasks = async () => {
    if (!ticket?.id) return;
    try {
      setIsLoadingPR(true);
      const refreshedTicket = await refreshTicketFromApi();
      if (refreshedTicket && Array.isArray((refreshedTicket as any).prDetail)) {
        const mappedTasks: PRTask[] = (refreshedTicket as any).prDetail.map(
          (pr: any) => ({
            taskName: pr.taskName || "Task",
            hrs: pr.hrs || 0,
          }),
        );
        setPrTasks(mappedTasks);
      } else {
        setPrTasks([]);
      }
    } catch {
      toast.error("Failed to load PR tasks");
      setPrTasks([]);
    } finally {
      setIsLoadingPR(false);
    }
  };

  const formatText = (text: string | undefined | null): string => {
    if (!text) return "Not specified";
    const cleanedText = text.toLowerCase().replace(/_/g, " ").trim();
    return cleanedText.charAt(0).toUpperCase() + cleanedText.slice(1);
  };

  // NEW: Consistent DD/MM/YYYY formatter (same as TicketList)
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return "No Date";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleViewPR = async () => {
    if (!ticket?.id) {
      toast.error("No ticket selected");
      return;
    }
    setShowViewPRModal(true);
    await fetchPRTasks();
  };

  const handleCloseViewPR = () => {
    setShowViewPRModal(false);
  };

  const handleNewPR = () => {
    setShowNewPRModal(true);
    setTempTasks([]);
    setNewTaskName("");
    setNewTaskTime("");
  };

  const handleCloseNewPR = () => {
    setShowNewPRModal(false);
    setNewTaskName("");
    setNewTaskTime("");
    setTempTasks([]);
  };

  const handleAddTask = () => {
    const sanitizedTaskName = sanitizeInput(newTaskName);
    const sanitizedTime = sanitizeInput(newTaskTime);

    if (!sanitizedTaskName) {
      toast.error("Please enter a task name");
      return;
    }
    if (!sanitizedTime || !validateTimeInput(sanitizedTime)) {
      toast.error("Please enter a valid time (0.1 - 100 hours)");
      return;
    }
    if (
      tempTasks.some(
        (task) =>
          task.taskName.toLowerCase() === sanitizedTaskName.toLowerCase(),
      )
    ) {
      toast.error("Task with this name already exists");
      return;
    }
    if (tempTasks.length >= 10) {
      toast.error("Maximum 10 tasks allowed");
      return;
    }

    const newTask: TempTask = {
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      taskName: sanitizedTaskName,
      estimatedTime: sanitizedTime,
    };
    setTempTasks((prev) => [...prev, newTask]);
    setNewTaskName("");
    setNewTaskTime("");
  };

  const handleRemoveTask = (taskId: string) => {
    setTempTasks((prev) => prev.filter((task) => task.id !== taskId));
  };

  const handleSubmitAllTasks = async () => {
    if (tempTasks.length === 0) {
      toast.error("Please add at least one task");
      return;
    }
    if (!ticket?.id) {
      toast.error("No ticket selected");
      return;
    }

    try {
      setIsSubmittingPR(true);
      for (const task of tempTasks) {
        const prData: PRApiRequest = {
          taskName: task.taskName,
          hrs: parseFloat(task.estimatedTime),
          amount: 0,
        };
        const result = await createPRTask(prData, ticket.id);
        if (
          result &&
          typeof result === "object" &&
          "statusCode" in result &&
          result.statusCode >= 400
        ) {
          throw new Error(
            `Failed to create task "${task.taskName}": ${result.message}`,
          );
        }
      }
      toast.success(
        `Successfully created ${tempTasks.length} PR ${
          tempTasks.length === 1 ? "task" : "tasks"
        }!`,
      );
      setHasPRTasksCreated(true);
      handleCloseNewPR();
      await fetchPRTasks();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to  tasks: ${errorMessage}`);
    } finally {
      setIsSubmittingPR(false);
    }
  };

  const handleViewImage = (assetId:string) => {
  // Check if ticket exists and has at least one image
  if (!ticket?.id || !ticket.asset || ticket.asset.length === 0) {
    toast.error("No image is associated with this ticket");
    return;
  }

  // Navigate to image viewer and pass the full array of images
  navigate(`/image/${ticket.id}/${assetId}`, {
    state: {
      assets: ticket.asset,        // This is the array!
      title: ticket.title,
      selectedAssetId: assetId,
    }
  });
};

  if (!ticket) {
    return (
      <div className="ticketview-card ticketview-empty">
        <Ticket className="ticketview-empty-icon" size={48} />
        <h2 className="ticketview-placeholder-text">
          Select a ticket to view details
        </h2>
        <p className="ticketview-placeholder-text">
          Choose a ticket from the list to see its full details and conversation
          history.
        </p>
      </div>
    );
  }

  return (
    <div className="ticketview-container">
      <div className="ticketview-card">
        <div className="ticketview-header">
          <h1 className="ticketview-title">{formatText(ticket.title)}</h1>
          <div className="ticketview-title-buttons">
            <button
              className="ticketview-btn ticketview-btn-view-pr"
              onClick={handleViewPR}
            >
              View PR
            </button>
            {userCanCreatePR && !ticketHasPRTasks && !hasPRTasksCreated && (
              <button
                className="ticketview-btn ticketview-btn-new-pr"
                onClick={handleNewPR}
              >
                <Plus size={16} />
                New PR
              </button>
            )}
          </div>
        </div>

        <div className="ticketview-meta">
          <div className="ticketview-meta-item">
            <User size={16} />
            <span>{ticket.name || "Unknown"}</span>
            {ticket.email || "unknown@example.com"}
          </div>
          <div className="ticketview-meta-item">
            <Clock size={16} />
            {/* FIXED: Now uses DD/MM/YYYY */}
            <span>
              Created{" "}
              {ticket.dateCreated ? formatDate(ticket.dateCreated) : "No Date"}
            </span>
          </div>
          <div className="ticketdetails-org-section">
            Organization: {ticket.organization || "N/A"}
          </div>
        </div>

        <div className="ticketview-section">
          <h3 className="ticketview-section-title">Description</h3>
          <p className="ticketview-description">
            {ticket.description
              ? formatText(ticket.description)
              : "No description provided."}
          </p>
          <h3 className="ticketdetails-section-title">Additional Comment</h3>
          <p className="ticketdetails-description">
            {ticket.adminDescription ? formatText(ticket.adminDescription) : ""}
          </p>
          <br />
          <div className="ticketview-category-line">
            <div className="ticketview-category-item">
              <span className="ticketview-category-label">Category:</span>
              <span className="ticketview-category">
                {formatText(ticket.category)}
              </span>
            </div>
            <div className="ticketdetails-assignedto-info">
              <p>
                <strong>Assigned To:</strong>&nbsp;
                {ticket.assignedToName ?? "Not Assigned"}
              </p>
            </div>
            {ticket?.asset && ticket?.asset?.length > 0 && (
              <div className="flex flex-wrap gap-3 ">
                {ticket?.asset?.map((file) => (
                  <button
                    key={file.id}
                    onClick={()=>handleViewImage(file.id)}
                    className="ticketview-btn ticketview-btn-view-image"
                  >
                    <Image size={16} />
                    {file.assetName || file.fileName || "View Attachment"}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Suggestions */}
      <div className="ticketview-ai-suggestions">
        <div className="ticketview-ai-header">
          <span className="ticketview-ai-icon">AI</span>
          <h3 className="ticketview-ai-title">AI Suggestions</h3>
        </div>
        <div className="ticketview-suggestion-box">
          This appears to be a login issue. Try clearing browser cache and
          cookies, or use the password reset feature.
        </div>
      </div>

      {/* Conversation */}
      <div className="ticketview-conversation-section">
        <TicketMessage ticket={ticket} />
      </div>

      {/* Rest of modals unchanged... */}
      {showNewPRModal && (
        <div className="modal-overlay" onClick={handleCloseNewPR}>
          <div
            className="modal-content ticketview-new-pr-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">New PR</h2>
              <button className="modal-close-btn" onClick={handleCloseNewPR}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body new-pr-body-fixed">
              <div className="new-pr-form-section">
                <div className="form-group">
                  <label className="form-label">Task name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter the task"
                    value={newTaskName}
                    onChange={(e) => setNewTaskName(e.target.value)}
                    maxLength={200}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Estimated time</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Enter the time to finish the task"
                    value={newTaskTime}
                    onChange={(e) => setNewTaskTime(e.target.value)}
                  />
                </div>
                <button
                  className="add-task-btn-new"
                  onClick={handleAddTask}
                  disabled={!newTaskName.trim() || !newTaskTime.trim()}
                >
                  Add
                </button>
              </div>

              {tempTasks.length > 0 && (
                <div className="added-tasks-section">
                  <div className="added-tasks-list">
                    {tempTasks.map((task) => (
                      <div key={task.id} className="added-task-item">
                        <span className="added-task-text">
                          {task.taskName} - {task.estimatedTime} hours
                        </span>
                        <button
                          className="remove-task-btn"
                          onClick={() => handleRemoveTask(task.id)}
                          disabled={isSubmittingPR}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="modal-footer-fixed">
                <button
                  className="submit-pr-btn-fixed"
                  onClick={handleSubmitAllTasks}
                  disabled={isSubmittingPR || tempTasks.length === 0}
                >
                  {isSubmittingPR ? "Submitting..." : "Submit"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showViewPRModal && (
        <div className="modal-overlay" onClick={handleCloseViewPR}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">View PR</h2>
              <button className="modal-close-btn" onClick={handleCloseViewPR}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              {isLoadingPR ? (
                <div className="loading-state">
                  <p>Loading PR tasks...</p>
                </div>
              ) : (
                <div className="pr-table">
                  <div className="pr-table-header">
                    <div className="pr-header-cell">Task Name</div>
                    <div className="pr-header-cell">Hours</div>
                  </div>
                  {prTasks.length === 0 ? (
                    <div className="no-pr-tasks">
                      <p>No PR tasks found for this ticket.</p>
                    </div>
                  ) : (
                    prTasks.map((task, index) => (
                      <div key={index} className="pr-table-row">
                        <div className="pr-cells">{task.taskName}</div>
                        <div className="pr-cells" id="hours-pr">
                          {task.hrs}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketView;
