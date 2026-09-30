import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaSearch, FaPen } from "react-icons/fa";
import BackButton from "./BackButton";
import { getUsersByDomain } from "../api/userApi";
import { toast } from "react-toastify";
import "./CustomerMaster.css";
import type { CompanyPreviewDto } from "../Dto/CompanyPreviewDto";
import type { ErrorResponseDto } from "../Dto/ErrorResponseDto";
import ErrorModel from "./ErrorModel";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

const PAGE_SIZE = 15;

const CustomerMaster: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const customer = location.state as CompanyPreviewDto | undefined;

  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [showSessionModal, setShowSessionModal] = useState(false);

  function isUserListResponse(data: any): data is User[] {
    return (
      Array.isArray(data) &&
      data.every((user) => "name" in user && "email" in user && "role" in user)
    );
  }

  function isErrorResponse(data: any): data is ErrorResponseDto {
    return (
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      "description" in data
    );
  }

  const formatText = (text: string | undefined | null) => {
    if (!text) return "Not specified";
    return text
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const fetchUsers = async (pageNumber: number, search: string = "") => {
    try {
      setLoading(true);

      const domainId = customer?.id;
      if (!domainId) {
        toast.error("Missing domain ID from company data.");
        return;
      }

      const offset = pageNumber * PAGE_SIZE;
      const data = await getUsersByDomain(domainId, offset, PAGE_SIZE, search);

      if (isUserListResponse(data)) {
        setUsers(data);
        setHasMore(data.length === PAGE_SIZE);
      } else if (isErrorResponse(data)) {
        if (data.statusCode === 401) {
          setShowSessionModal(true);
        } else if (data.statusCode === 404) {
          setUsers([]);
          setHasMore(false);
        }
      }
    } catch (error) {
      toast.error("Failed to load customer data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customer?.id) {
      fetchUsers(page, searchTerm);
    }
  }, [page]);

  useEffect(() => {
    if (location.state?.refresh && customer?.id) {
      setPage(0);
      fetchUsers(0);
    }
  }, [location.state, customer?.id]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim() === "") {
      toast.warning("Please enter a search term.");
      return;
    }

    setPage(0);
    fetchUsers(0, searchTerm);
  };

  return (
    <div className="customer-wrapper">
      <div className="customer-align">
        <div className="title-row"></div>
        <div className="customer-back-btn">
  <BackButton />
</div>

      </div>
      <div className="title-container">
        <h2 className="customer-title">Customer Master Report</h2>
      </div>

       <div className="menu-header-user-detail">
          <div className="search-section">
            <label htmlFor="search-input" className="search-label">Search</label>
            <form onSubmit={handleSearch} className="search-form">
              <div className="styled-search-container">
                <input
                id="search-input"
                type="text"
                placeholder="Search by Name or Email"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="styled-search-input"
                />
                <button type="submit" className="styled-search-output">
                  <FaSearch size={14} color="#666" />
                </button>
              </div>
            </form>
          </div>
          <button
            className="create-user-button"
            onClick={() => navigate("/create-business-user", { state: customer })}
            >
              Create Business User
          </button>
      </div>

      {loading ? (
        <div className="loader-container-user">
          <div className="loader"></div>
        </div>
      ) : users.length === 0 ? (
        <div className="no-users-container">
          <p>No users found.</p>
        </div>
      ) : (
        <>
          <div className="customer-table-wrapper">
            <table className="customer-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <tr key={user.id}>
                    <td>{index + 1 + page * PAGE_SIZE}</td>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{formatText(user.role)}</td>
                    <td>
                      <div className="action-icons">
                        <div className="edit-wrapper">
                          <FaPen
                            onClick={() =>
                              navigate("/customer-master-edit", { state: user })
                            }
                            className="edit-icon"
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination-controls-master">
            <button
              disabled={page === 0}
              onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
            >
              Previous
            </button>
            <button
              disabled={!hasMore}
              onClick={() => setPage((prev) => prev + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}

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

export default CustomerMaster;