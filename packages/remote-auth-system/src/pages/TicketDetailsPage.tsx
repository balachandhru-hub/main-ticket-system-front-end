import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../components/context/AuthContext";
import { getTicketById } from "../api/TicketApi";
import { USER_ROLES, type UserRole, TICKET_STATUS } from "../common/common";
import type { TicketDetailDto } from "../Dto/TicketDetailDto";
import type { ErrorResponseDto } from "../Dto/ErrorResponseDto";
import BackButton from "../components/BackButton";
import ErrorModel from "../components/ErrorModel";
import TicketView from "../components/TicketView";
import "./TicketDetailsPage.css";

const TicketDetailsPage: React.FC = () => {
  const location = useLocation();
  const id = location.state?.id;
  const ticketFromState = location.state?.ticket as TicketDetailDto;
  const { auth } = useAuth();
  const navigate = useNavigate();

  const roleId = auth?.roleId;
  const userRole: UserRole =
    roleId === USER_ROLES.BUSINESS_ADMIN_USER
      ? USER_ROLES.BUSINESS_ADMIN_USER
      : roleId === USER_ROLES.BUSINESS_USER
      ? USER_ROLES.BUSINESS_USER
      : USER_ROLES.MANAGER;

  const [ticket, setTicket] = useState<TicketDetailDto | null>(
    ticketFromState || null,
  );
  const [loading, setLoading] = useState(!ticketFromState);
  const [showSessionModal, setShowSessionModal] = useState(false);

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

  useEffect(() => {
    if (ticketFromState) {
      return;
    }

    if (!id) {
      toast.error("No ticket ID provided");
      navigate("/dashboard");
      return;
    }

    (async () => {
      try {
        setLoading(true);
        const res = await getTicketById(id);
        if (isTicketDetail(res)) {
          setTicket(res);
        } else if (isErrorResponse(res) && res.statusCode === 401) {
          setShowSessionModal(true);
        } else {
          toast.error("Failed to fetch ticket details");
          navigate("/dashboard");
        }
      } catch (err) {
        toast.error("Failed to fetch ticket details");
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate, ticketFromState]);

  const handleEdit = () => {
    navigate("/ticket-edit", { state: { id: ticket?.id } });
  };

  if (loading) {
    return (
      <div className="loader-container">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="ticket-view-page">
      {/* Header with back button and centered title */}
      <div className="ticket-header">
        <button className="ticketview-back-btn">
          <BackButton />
        </button>
        <h2 className="ticketview-heading">Ticket Details</h2>
        <div className="header-spacer"></div>
      </div>

      {/* Ticket content */}
      <div className="ticket-content">
        {/* Edit button - conditional based on user role and status */}
        {ticket &&
          [
            USER_ROLES.MANAGER,
            USER_ROLES.BUSINESS_USER,
            USER_ROLES.BUSINESS_ADMIN_USER,
          ].includes(userRole) && (
            <div className="edit-button-container" style={{ display: "none" }}>
              {(() => {
                const isBusinessUser =
                  userRole === USER_ROLES.BUSINESS_ADMIN_USER ||
                  userRole === USER_ROLES.BUSINESS_USER;
                const ticketStatus = ticket.status?.toUpperCase();
                const canBusinessUserEdit =
                  ticketStatus === TICKET_STATUS.OPEN ||
                  ticketStatus === TICKET_STATUS.RE_APPROVE;
                const shouldEnableEdit = !isBusinessUser || canBusinessUserEdit;

                if (shouldEnableEdit) {
                  return (
                    <button
                      onClick={handleEdit}
                      style={{
                        padding: "10px 20px",
                        background: "#3b82f6",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        fontWeight: "500",
                        cursor: "pointer",
                      }}
                    >
                      Edit Ticket
                    </button>
                  );
                } else {
                  return (
                    <button
                      disabled
                      style={{
                        padding: "10px 20px",
                        background: "#9ca3af",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        fontWeight: "500",
                        cursor: "not-allowed",
                      }}
                    >
                      Cannot Edit -{" "}
                      {ticket.status
                        ?.replace(/_/g, " ")
                        .toLowerCase()
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </button>
                  );
                }
              })()}
            </div>
          )}

        {/* Ticket view component */}
        <TicketView
          ticket={
            ticket
              ? {
                  ...ticket,
                  assignedTo: ticket.assignedTo || "Unassigned",
                  assignedBy: ticket.assignedBy || "System",
                  name: ticket.name || "Unknown User",
                  asset: ticket.asset ?? [],
                  prDetail: ticket.prDetail || [],
                } as any
              : null
          }
        />
      </div>

      {/* Session modal */}
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
  );
};

export default TicketDetailsPage;
