import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaSearch, FaPen, FaPlus } from "react-icons/fa";
import BackButton from "./BackButton";
import { getUsersByDomain } from "../api/userApi";
import { toast } from "react-toastify";
import "./CustomerMaster.css";
import type { CompanyPreviewDto } from "../Dto/CompanyPreviewDto";
import type { ErrorResponseDto } from "../Dto/ErrorResponseDto";
import ErrorModel from "./ErrorModel";
import { fetchAuthInfo } from "../util/auth";
import { impersonateUser } from "../api/authApi";
import { useAuth } from "./context/AuthContext";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

const PAGE_SIZE = 15;

const UserDetails: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const customer = location.state as CompanyPreviewDto | undefined;
  const auth = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [impersonateUserData, setImpersonateUserData] = useState<{ id: string; name: string } | null>(null);

  function isUserListResponse(data: any): data is User[] {
    return (
      Array.isArray(data) &&
      data.every(user => "name" in user && "email" in user && "role" in user)
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
      .replace(/\b\w/g, l => l.toUpperCase());
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
         } 
      }
    } catch {
      toast.error("Failed to load customer data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customer?.id) {
      fetchUsers(page);
    }
  }, [page, customer?.id]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim() === "") {
      toast.warning("Please enter a search term.");
      return;
    }

    setPage(0);
    fetchUsers(0, searchTerm);
  };

  const handleCreateUser = async () => {
    try {
      const auth = await fetchAuthInfo();
      if ("domainId" in auth) {
        navigate("/create-business-user", { state: { id: auth.domainId } });
      } else {
        toast.error("Unable to fetch domain info from token.");
      }
    } catch {
      toast.error("Something went wrong while preparing create user.");
    }
  };

  const handleImpersonate = async (userId: string) => {
    try {
      const result = await impersonateUser(userId);
      if ('statusCode' in result && result.statusCode !== 200) {
        return;
      }
     
      await auth.fetchAndSetAuth();
      toast.success('Login successful');
     
      navigate(`/dashboard/${userId}`);
    } catch (error) {
      
    }
  };

  return (
    <div className="customer-wrapper">
      <div className="customer-align">
        <div className="title-row">
          <div className="back-btn-userdetails">
            <BackButton />
          </div>
        </div>
        <div className="title-container">
          <h2 className="customer-title">Customer Master Report</h2>
        </div>

        <div className="search-create-container">
          <form className="search-row" onSubmit={handleSearch}>
            <label htmlFor="search" className="search-label">
              Search
            </label>
            <div className="styled-search-container">
              <input
                type="text"
                id="search"
                placeholder="Search by Name or Email"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="styled-search-input"
              />
              <button type="submit" className="styled-search-button">
                <FaSearch size={12} color="#666" />
              </button>
            </div>
          </form>

          <button className="create-user-btn" onClick={handleCreateUser}>
            <FaPlus size={14} />
            Create User
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
          <div className="table-wrapper">
            <table className="customer-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Action</th>
                  <th>Login</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <tr key={index}>
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
                    <td><button className="llogin-as-button" onClick={(e) => { e.stopPropagation(); setImpersonateUserData({ id: user.id, name: user.name }); }}>Login AS</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pagination-controls-master">
              <button
                disabled={page === 0}
                onClick={() => setPage(prev => Math.max(prev - 1, 0))}
              >
                Previous
              </button>
              <button
                disabled={!hasMore}
                onClick={() => setPage(prev => prev + 1)}
              >
                Next
              </button>
            </div>
          </div>
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

        {impersonateUserData && <ErrorModel
          visible={!!impersonateUserData}
          title="Confirm Login"
          message={`Are you sure you want to login as ${impersonateUserData.name}?`}
          onConfirm={() => {
            handleImpersonate(impersonateUserData.id);
            setImpersonateUserData(null);
          }}
          onClose={() => {
            setImpersonateUserData(null);
          }}
        />}
      </div>
    </div>
  );
};

export default UserDetails;
