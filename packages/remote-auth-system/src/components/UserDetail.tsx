import React, { useEffect, useState } from 'react';
import './UserDetail.css';
import { useNavigate } from 'react-router-dom';
import { getUsersByDomain, type User } from '../api/userApi';
import { toast } from 'react-toastify';
import { FaSearch, FaPen } from 'react-icons/fa';
import SmartTable from './Table/SmartTable';
import ErrorModel from './ErrorModel';
import BackButton from './BackButton';
import { useAuth } from './context/AuthContext';
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';
import { impersonateUser } from '../api/authApi';

const PAGE_SIZE = 15;

const UserDetail: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [initialFetchComplete, setInitialFetchComplete] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [impersonateUserData, setImpersonateUserData] = useState<{ id: string; name: string } | null>(null);
  const auth = useAuth();

  function isUserListResponse(data: any): data is User[] {
    return Array.isArray(data) && data.every(user => 'id' in user && 'name' in user && 'email' in user && 'role' in user);
  }

  function isErrorResponse(data: any): data is ErrorResponseDto {
    return typeof data === 'object' && 'message' in data && 'description' in data;
  }


  const fetchUsers = async (pageNumber: number, search: string = '') => {
    try {
      setLoading(true);
      const domainId = auth!.auth?.domainId;

      if (!domainId) {
        toast.error('Domain ID is missing from token.');
        return;
      }

      const offset = pageNumber * PAGE_SIZE;
      const data = await getUsersByDomain(domainId, offset, PAGE_SIZE, search);
      if (isUserListResponse(data)) {
        setUsers(data);
        setHasMore(data.length === PAGE_SIZE);
      }
      else if (isErrorResponse(data)) {
        if (data.statusCode === 401) {
          setShowSessionModal(true);
        }
        else if(data.statusCode === 404) {
          setUsers([]);
          // setShowSessionModal(true);
          setHasMore(false);
        }
      }
    } catch (error: any) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
      setInitialFetchComplete(true);
    }
  };

  useEffect(() => {
    const delayInitialFetch = setTimeout(() => {
      fetchUsers(page);
    }, 100);

    return () => clearTimeout(delayInitialFetch);
  }, [page]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim() === '') {
      toast.warning('Please enter a search term.');
      return;
    }

    setPage(0);
    fetchUsers(0, searchTerm);
  };

  const handleImpersonate = async (userId: string) => {
    try {
      const result = await impersonateUser(userId);
      if ('statusCode' in result && result.statusCode !== 200) {
        return;
      }
      
      await auth.fetchAndSetAuth();
      toast.success('Loginsuccessful');
     
      navigate(`/dashboard/${userId}`);
    } catch (error) {
      
    }
  };

  const columns = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "role", label: "Designation" }
  ];

  const actionRenderer = (row: User) => (
    <FaPen
      onClick={(e) => {
        e.stopPropagation();
        navigate('/customer-master-edit', { state: row });
      }}
      className="edit-icon"
      style={{ cursor: 'pointer' }}
    />
  );

  return (
    <div className="menu-content">
      <div className="top-row-back">
        <BackButton />
      </div>
       <div className="heading-section">
        <h2 className="main-heading">User Details</h2>
        </div>
      <div className="menu-header-user-details">
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
          onClick={() => navigate('/create-global-user')}
        >
          Create User
        </button>
      </div>

      <section className="user-role-section">
        {loading || !initialFetchComplete ? (
          <div className="loader-container-user">
            <div className="loader"></div>
          </div>
        ) : users.length === 0 ? (
          <p className='no-user-data'>No users found.</p>
        ) : (
          <div className="user-table-wrapper">
            <SmartTable
              columns={columns}
              data={users}
              startIndex={page * PAGE_SIZE}
              actionRenderer={actionRenderer}
            />

            <div className="pagination-controls">
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
      </section>

      {showSessionModal && <ErrorModel
        visible={showSessionModal}
        title="Session Expired"
        message="Your session has expired. Please log in again."
        onConfirm={() => {
          setShowSessionModal(false);
          navigate('/');
        }}
        onClose={() => {
          setShowSessionModal(false);
          navigate('/');
        }}
      />}

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
  );
};

export default UserDetail;
