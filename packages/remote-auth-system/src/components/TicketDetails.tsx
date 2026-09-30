import React, { useState, useEffect } from "react";
import { User, Ticket, Image, Plus, Clock, X } from "lucide-react";
import "./TicketDetails.css";
import { toast } from "react-toastify";
import TicketMessage from "./TicketMessage";
import type { TicketDto } from "../Dto/TicketDto";
import { useNavigate } from "react-router-dom";
import { createPRTask, getTicketById } from "../api/TicketApi";
import { TICKET_STATUS, USER_ROLES } from "../common/common";
import { useAuth } from "../components/context/AuthContext";

interface TicketDetailsProps {
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

const TicketDetails: React.FC<TicketDetailsProps> = ({
  ticket,
  onTicketUpdate,
}) => {
  const [showViewPRModal, setShowViewPRModal] = useState(false);
  const [showNewPRModal, setShowNewPRModal] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskTime, setNewTaskTime] = useState("");
  const [tempTasks, setTempTasks] = useState<TempTask[]>([]);
  const [prTasks, setPrTasks] = useState<PRTask[]>([]);
  const [isLoadingPR, setIsLoadingPR] = useState(false);
  const [isSubmittingPR, setIsSubmittingPR] = useState(false);
  const navigate = useNavigate();

  const { auth } = useAuth();
  const roleId = auth?.roleId;
  const userCanCreatePR =
    roleId === USER_ROLES.MANAGER || roleId === USER_ROLES.LEAD;

  useEffect(() => {
    if (ticket) {
      fetchPRTasks();
    }
  }, [ticket]);

  const ticketHasPRTasks =
    ticket &&
    (ticket as any).prDetail &&
    Array.isArray((ticket as any).prDetail) &&
    (ticket as any).prDetail.length > 0;

  const sanitizeInput = (input: string): string => {
    return input
      .trim()
      .replace(/[<>\"']/g, "")
      .substring(0, 200);
  };

  const validateTimeInput = (time: string): boolean => {
    const timeFloat = parseFloat(time);
    return !isNaN(timeFloat) && timeFloat > 0 && timeFloat <= 100;
  };

  const silentRefetchTicket = async () => {
    if (!ticket?.id) return;
    try {
      const refreshedTicket = await getTicketById(ticket.id);
      if (!("statusCode" in refreshedTicket)) {
        onTicketUpdate?.(refreshedTicket as TicketDto);
        if (
          (refreshedTicket as any).prDetail &&
          Array.isArray((refreshedTicket as any).prDetail)
        ) {
          const mappedTasks: PRTask[] = (refreshedTicket as any).prDetail.map(
            (pr: any) => ({
              taskName: pr.taskName || "Task",
              hrs: pr.hrs || 0,
            }),
          );
          setPrTasks(mappedTasks);
        }
      }
    } catch (error) {
      // silent
    }
  };

  const fetchPRTasks = async () => {
    try {
      setIsLoadingPR(true);
      if (
        ticket &&
        (ticket as any).prDetail &&
        Array.isArray((ticket as any).prDetail)
      ) {
        const mappedTasks: PRTask[] = (ticket as any).prDetail.map(
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
      handleCloseNewPR();
      await silentRefetchTicket();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to  tasks: ${errorMessage}`);
    } finally {
      setIsSubmittingPR(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter") {
      e.preventDefault();
      action();
    }
  };

  const handleViewImage = (assetId: string) => {
    if (!ticket?.id || !ticket.asset || ticket.asset.length === 0) {
      toast.error("No image is associated with this ticket");
      return;
    }
    navigate(`/image/${ticket.id}/${assetId}`, {
      state: {
        assets: ticket.asset,
        title: ticket.title,
        selectedAssetId: assetId,
      }
    });
  };

  if (!ticket) {
    return (
      <div className="ticketdetails-card ticketdetails-empty">
        <Ticket className="ticketdetails-empty-icon" size={48} />
        <h2 className="ticketdetails-placeholder-text">
          Select a ticket to view details
        </h2>
        <p className="ticketdetails-placeholder-text">
          Choose a ticket from the list to see its full details and conversation
          history.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="ticketdetails-card">
        <div className="ticketdetails-title-section">
          <h1 className="ticketdetails-main-title">
            {formatText(ticket.title)}
          </h1>
          <div className="ticketdetails-title-buttons">
            <button
              className="ticketdetails-btn ticketdetails-btn-view-pr"
              onClick={handleViewPR}
            >
              View PR
            </button>
            {userCanCreatePR &&
              !ticketHasPRTasks &&
              ticket.status === TICKET_STATUS.APPROVED && (
                <button
                  className="ticketdetails-btn ticketdetails-btn-new-pr"
                  onClick={handleNewPR}
                >
                  <Plus size={16} />
                  New PR
                </button>
              )}
          </div>
        </div>

        <div className="ticketdetails-meta">
          <div className="ticketdetails-meta-item">
            <User size={16} />
            <span>
              {ticket.name || "Unknown"} (
              {ticket.email || "unknown@example.com"})
            </span>
          </div>
          <div className="ticketdetails-meta-item">
            <Clock size={16} />
            <span>
              Created{" "}
              {ticket.dateCreated ? formatDate(ticket.dateCreated) : "No Date"}
            </span>
          </div>
          <div className="ticketdetails-org-section">
            Organization: {ticket.organization || "N/A"}
          </div>
        </div>

        <div className="ticketdetails-section">
          <h3 className="ticketdetails-section-title">Description</h3>
          <p className="ticketdetails-description">
            {ticket.description ? formatText(ticket.description) : ""}
          </p>
          <h3 className="ticketdetails-section-title">Additional Comment</h3>
          <p className="ticketdetails-description">
            {ticket.adminDescription ? formatText(ticket.adminDescription) : ""}
          </p>

          <div className="ticketdetails-category-row">
            <div className="ticketdetails-category-info">
              <strong>Category:</strong>
              <span className="ticketdetails-category">
                {formatText(ticket.category)}
              </span>
            </div>

            <div className="ticketdetails-hours-section">
              {prTasks.length > 0 && (
                <div className="ticketdetails-total-hours">
                  <strong>Total Hours:</strong>&nbsp;
                  <span className="ticketdetails-total-hours-value">
                    {ticket.totalHours}
                  </span>
                </div>
              )}
            </div>

            <div className="ticketdetails-assignedto-info">
              <p>
                <strong>Assigned To:</strong>&nbsp;
                {ticket.assignedToName ?? "Not Assigned"}
              </p>
            </div>
            {Array.isArray(ticket?.asset) && ticket.asset.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-4">
                {ticket.asset.map((file) => (
                  <button
                    key={file.id}
                    onClick={() => handleViewImage(file.id)}
                    className="ticketdetails-btn ticketdetails-btn-view-image"
                  >
                    <Image size={16} />
                    {file.assetName || file.fileName || "Asset"}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="ticketdetails-ai-suggestions">
        <div className="ticketdetails-ai-header">
          <span className="ticketdetails-ai-icon">AI</span>
          <h3 className="ticketdetails-ai-title">AI Suggestions</h3>
        </div>
        <div className="ticketdetails-ai-content">
          This appears to be a login issue. Try clearing browser cache and
          cookies, or use the password reset feature.
        </div>
      </div>

      <div className="ticketcontent-message-view">
        <TicketMessage ticket={ticket} />
      </div>

      {/* New PR Modal */}
      {showNewPRModal && (
        <div className="modal-overlay" onClick={handleCloseNewPR}>
          <div
            className="modal-content new-pr-modal-fixed"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">New PR</h2>
              <button className="modal-close-btn" onClick={handleCloseNewPR}>
                <X size={24} />
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
                    onKeyPress={(e) => handleKeyPress(e, handleAddTask)}
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
                    onKeyPress={(e) => handleKeyPress(e, handleAddTask)}
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

              <div className="added-tasks-grid">
                {tempTasks.map((task) => (
                  <div key={task.id} className="added-task-item">
                    <span
                      className="added-task-text"
                      data-fulltext={`${task.taskName} - ${task.estimatedTime} hours`}
                    >
                      {task.taskName} - {task.estimatedTime} hours
                    </span>
                    <button
                      className="remove-task-btn"
                      onClick={() => handleRemoveTask(task.id)}
                      disabled={isSubmittingPR}
                      aria-label={`Remove task ${task.taskName}`}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

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
      )}

      {/* View PR Modal */}
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
                        <div className="pr-cell">{task.taskName}</div>
                        <div className="pr-cell">{task.hrs}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TicketDetails;
