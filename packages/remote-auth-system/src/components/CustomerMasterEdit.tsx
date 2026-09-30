import { useEffect, useState } from 'react';
import './CustomerMasterEdit.css';
import { ResetPassword } from './ResetPassword';
import BackButton from './BackButton';
import CountrySelect from './CountrySelect';
import { useCountries } from './context/CountryContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { getUserById } from '../api/userApi';
import { updatePersonByID } from '../api/personApi';
import type { GetUserDto } from '../Dto/GetUserDto';
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';
import { toast } from 'react-toastify';
import type { SuccessResponseDto } from '../Dto/SuccessResponseDto';
import ErrorModel from './ErrorModel';
import { getAllBotModels } from '../api/botModelApi';
import { getAllAppModels } from '../api/appModelApi';

function isGetUserDto(
  response: GetUserDto | ErrorResponseDto
): response is GetUserDto {
  return 'email' in response && 'userName' in response;
}

function isSuccess(
  response: SuccessResponseDto | ErrorResponseDto
): response is SuccessResponseDto {
  return 'id' in response && response.statusCode === 200;
}

function isErrorResponse(
  response: SuccessResponseDto | ErrorResponseDto
): response is ErrorResponseDto {
  return 'message' in response && 'description' in response;
}

function formatModelName(name: string): string {
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

const CustomerMasterEdit: React.FC = () => {
  const [showResetPopup, setShowResetPopup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userDetails, setUserDetails] = useState<GetUserDto | null>(null);
  const [errorPage, setErrorPage] = useState(false);
  const [errorPageData, setErrorPageData] = useState<{ title: string; message: string } | null>(null);

  // Bot Models State
  const [allModels, setAllModels] = useState<{ id: string; modelName: string }[]>([]);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  // App Models State
  const [allAppModels, setAllAppModels] = useState<{ id: string; name: string }[]>([]);
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  const [showAppModelDropdown, setShowAppModelDropdown] = useState(false);
  const [reqNameInput, setReqNameInput] = useState('');
  const [reqDeptInput, setReqDeptInput] = useState('');
  const openResetPassword = () => setShowResetPopup(true);
  const closeResetPassword = () => setShowResetPopup(false);
  const countries = useCountries();
  const location = useLocation();
  const navigate = useNavigate();
  const user = location.state as { id: string } | undefined;
  const [userId] = useState(user?.id);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.bd-role-select') && !target.closest('.bd-bot-model-dropdown')) {
        setShowModelDropdown(false);
        setShowAppModelDropdown(false);
      }
    };

    if (showModelDropdown || showAppModelDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showModelDropdown, showAppModelDropdown]);

  useEffect(() => {
    if (!user?.id) {
      toast.error('Invalid user ID.');
      navigate('/');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch all in parallel
        const [userResult, modelsResult, appModelsResult] = await Promise.all([
          getUserById(user.id),
          getAllBotModels(),
          getAllAppModels()
        ]);

        const modelsArray = Array.isArray(modelsResult)
          ? modelsResult
          : (modelsResult as any)?.botModels;

        if (Array.isArray(modelsArray)) {
          const processedModels = modelsArray.map((m: any) => ({ id: m.id, modelName: m.name }));
          setAllModels(processedModels);
        }

        const appModelsArray = Array.isArray(appModelsResult)
          ? appModelsResult
          : (appModelsResult as any)?.appModels;

        if (Array.isArray(appModelsArray)) {
          const processedAppModels = appModelsArray.map((m: any) => ({ id: m.id, name: m.name }));
          setAllAppModels(processedAppModels);
        }

        // Then process user data
        if (isGetUserDto(userResult)) {
          setUserDetails({
            ...userResult,
            personName: userResult.name ?? '',
            aribaUserName: userResult.aribaUserName ?? '',
            aribaPassword: userResult.aribaPassword ?? ''
          });

          // Set selected model IDs from user's assigned models
          if (userResult.models && Array.isArray(userResult.models)) {
            const assignedIds = userResult.models.map(m => m.id);
            setSelectedModelIds(assignedIds);
          } else {
            setSelectedModelIds([]);
          }

          if (userResult.apps && Array.isArray(userResult.apps)) {
            const assignedAppIds = userResult.apps.map(app => app.id);
            setSelectedAppIds(assignedAppIds);
          } else {
            setSelectedAppIds([]);
          }
        } else if (isErrorResponse(userResult)) {
          if (userResult.statusCode === 401) {
            toast.error(userResult.message || 'Unauthorized');
            navigate('/');
          } else {
            toast.error(userResult.message || 'Failed to fetch user');
          }
        } else {
          toast.error('Unexpected response format');
        }
      } catch (error: any) {
        if (error?.response?.status === 401) {
          toast.error('Unauthorized');
          navigate('/');
        } else {
          toast.error('Failed to fetch data');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id, navigate]);

  if (loading) {
    return (
      <div className="loader-container-user">
        <div className="loader"></div>
      </div>
    );
  }

  if (!userDetails) {
    return <div className="error-message">User data not available.</div>;
  }

  const handleModalConfirm = () => {
    setErrorPage(false);
    navigate('/');
  };

  const handleModalClose = () => {
    setErrorPage(false);
    navigate('/');
  };

  const handleUpdate = async () => {
    if (!userId || !userDetails) return;

    const requiredValues = {
      personName: userDetails.personName?.trim(),
      mobilePhone: userDetails.mobilePhone?.trim(),
      designation: userDetails.designation?.trim(),
      department: userDetails.department?.trim(),
      employeeId: userDetails.employeeId?.trim(),
      address: userDetails.address?.trim(),
    };

    const hasMissing = Object.values(requiredValues).some(v => !v || v.length === 0);
    if (hasMissing) {
      toast.error('Please fill all required fields');
      return;
    }

    const payload = {
      name: userDetails.personName ?? '',
      address: userDetails.address ?? '',
      country: userDetails.country ?? '',
      mobilePhone: userDetails.mobilePhone ?? '',
      designation: userDetails.designation ?? '',
      department: userDetails.department ?? '',
      employeeId: userDetails.employeeId ?? '',
      aribaUserName: userDetails.aribaUserName ?? '',
      aribaPassword: userDetails.aribaPassword ?? '',
      modelIds: selectedModelIds,
      appIds: selectedAppIds,
      requesterNames: userDetails.requesterNames ?? [],
      orgANId: userDetails.orgANId ?? ''
    };

    try {
      const result = await updatePersonByID(userId, payload);
      if (isSuccess(result)) {
        toast.success('User updated successfully');
        const refreshed = await getUserById(userId);
        if (isGetUserDto(refreshed)) {
          setUserDetails({
            ...refreshed,
            personName: refreshed.name ?? '',
            aribaUserName: refreshed.aribaUserName ?? '',
            aribaPassword: refreshed.aribaPassword ?? ''
          });
          if (refreshed.models) {
            setSelectedModelIds(refreshed.models.map(m => m.id));
          }
          if (refreshed.apps) {
            setSelectedAppIds(refreshed.apps.map(app => app.id));
          }
        }
      } else if (isErrorResponse(result)) {
        if (result.statusCode === 401) {
          setErrorPage(true);
          setErrorPageData({
            title: result.message || 'Unauthorized',
            message: result.description || 'You are not authorized.',
          });
        } else if (result.statusCode === 412) {
          toast.error(result.message || 'Unable to update, Try Again');
        } else {
          toast.error(result.message || 'Failed to update user');
        }
      }
    } catch (err: any) {
      setErrorPage(true);
      setErrorPageData({
        title: 'Error',
        message: err?.response?.data?.message || 'An error occurred while updating user.',
      });
    }
  };

  const toggleModelSelection = (modelId: string) => {
    setSelectedModelIds(prev => {
      if (prev.includes(modelId)) {
        return prev.filter(id => id !== modelId);
      } else {
        return [...prev, modelId];
      }
    });
  };

  const toggleAppSelection = (appId: string) => {
    setSelectedAppIds(prev => {
      if (prev.includes(appId)) {
        return prev.filter(id => id !== appId);
      } else {
        return [...prev, appId];
      }
    });
  };

  const handleAddReq = () => {
    const name = reqNameInput.trim();
    const department = reqDeptInput.trim();

    if (name && department && userDetails) {
      const currentReqs = userDetails.requesterNames || [];
      setUserDetails({
        ...userDetails,
        requesterNames: [...currentReqs, { name, department }]
      });
      setReqNameInput('');
      setReqDeptInput('');
    } else {
      toast.error('Please enter both Requester Name and Department');
    }
  };

  const handleRemoveReq = (index: number) => {
    if (userDetails && userDetails.requesterNames) {
      const newReqs = userDetails.requesterNames.filter((_, i) => i !== index);
      setUserDetails({
        ...userDetails,
        requesterNames: newReqs
      });
    }
  };

  return (
    <div>
      <div className="button-view">
        <BackButton />
      </div>
      <div className="customer-master-container">
        <div className="customer-master-inner">
          <h1 className="main-heading">Customer/User Edit</h1>

          {/* === Identification Details === */}
          <div className="section-box">
            <h2 className="section-title">Identification Details</h2>
            <div className="row">
              <div className="input-group">
                <label>Name <span className="required">*</span></label>
                <input
                  required
                  type="text"
                  maxLength={50}
                  value={userDetails.personName}
                  onChange={(e) => setUserDetails({ ...userDetails, personName: e.target.value })}
                  placeholder="Enter name"
                />
              </div>
              <div className="input-group">
                <label>Email ID <span className="required">*</span></label>
                <input
                  required
                  type="email"
                  maxLength={50}
                  value={userDetails.email}
                  readOnly
                  placeholder="Enter mail id"
                />
              </div>
            </div>

            <div className="row">
              <div className="input-group">
                <label>Phone Number <span className="required">*</span></label>
                <input
                  required
                  type="text"
                  maxLength={20}
                  value={userDetails.mobilePhone}
                  onChange={(e) => setUserDetails({ ...userDetails, mobilePhone: e.target.value })}
                  placeholder="Mobile Number"
                />
              </div>
              <div className="input-group">
                <label>Designation <span className="required">*</span></label>
                <input
                  required
                  type="text"
                  maxLength={50}
                  value={userDetails.designation}
                  onChange={(e) => setUserDetails({ ...userDetails, designation: e.target.value })}
                  placeholder="Designation"
                />
              </div>
            </div>

            <div className="row">
              <div className="input-group">
                <label>Department <span className="required">*</span></label>
                <input
                  required
                  type="text"
                  maxLength={20}
                  value={userDetails.department}
                  onChange={(e) => setUserDetails({ ...userDetails, department: e.target.value })}
                  placeholder="Department"
                />
              </div>
              <div className="input-group">
                <label>Employee ID <span className="required">*</span></label>
                <input
                  required
                  type="text"
                  maxLength={25}
                  value={userDetails.employeeId}
                  onChange={(e) => setUserDetails({ ...userDetails, employeeId: e.target.value })}
                  placeholder="Employee Id"
                />
              </div>
            </div>

            <div className="row">
              <div className="input-group">
                <label>Country/Region</label>
               <CountrySelect
                  countries={countries}
                  value={userDetails.country || ''}
                  onChange={(country) => setUserDetails({ ...userDetails, country })}
                  placeholder="Select country/region"
                />
              </div>
              <div className="input-group">
                <label>Address <span className="required">*</span></label>
                <input
                  required
                  type="text"
                  maxLength={350}
                  value={userDetails.address}
                  onChange={(e) => setUserDetails({ ...userDetails, address: e.target.value })}
                  placeholder="Enter address"
                />
              </div>
            </div>

            <div className="row">
              <div className="input-group">
                <label>Org ID</label>
                <input
                  type="text"
                  maxLength={25}
                  value={userDetails.orgANId ?? ''}
                  onChange={(e) => setUserDetails({ ...userDetails, orgANId: e.target.value })}
                  placeholder="Enter Org ID"
                />
              </div>
            </div>
          </div>

          {/* === Role & Platform Access === */}
          <div className="section-box">
            <h2 className="section-title">Role & Platform Access</h2>
            <div className="row">
              <div className="input-group short">
                <label>Role Type<span className="required">*</span></label>
                <select value={userDetails.userRole} disabled>
                  <option value="">Select role type</option>
                  <option value="User">User</option>
                  <option value="Business Manager">Business Manager</option>
                  <option value="BUSINESS_ADMIN_USER">Business Admin</option>
                </select>
              </div>
            </div>
          </div>

          {/* === Bot Model Access === */}
          <div className="section-box" style={{ overflow: 'visible' }}>
            <h2 className="section-title">Bot Model Access</h2>

            <div className="bd-role-group">
              <label className="bd-role-label">Bot Models</label>

              <div style={{ width: "100%", position: "relative" }}>
                <div
                  className="bd-role-select"
                  onClick={() => setShowModelDropdown(prev => !prev)}
                >
                  {selectedModelIds.length === 0
                    ? "Select Bot Models"
                    : `${selectedModelIds.length} model${selectedModelIds.length !== 1 ? 's' : ''} selected`}
                </div>

                {showModelDropdown && (
                  <div
                    className="bd-bot-model-dropdown"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {allModels.length === 0 ? (
                      <div className="bd-dropdown-item">No models available (Total: {allModels.length})</div>
                    ) : (
                      <>
                        {allModels.map((model) => {
                          const isChecked = selectedModelIds.includes(model.id);
                          return (
                            <label key={model.id} className="bd-dropdown-item">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleModelSelection(model.id)}
                              />
                              <span>{formatModelName(model.modelName)}</span>
                            </label>
                          );
                        })}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* === App Model Access === */}
          <div className="section-box" style={{ overflow: 'visible' }}>
            <h2 className="section-title">App Model Access</h2>

            <div className="bd-role-group">
              <label className="bd-role-label">App Models</label>

              <div style={{ width: '100%', position: 'relative' }}>
                <div
                  className="bd-role-select"
                  onClick={() => setShowAppModelDropdown(prev => !prev)}
                >
                  {selectedAppIds.length === 0
                    ? 'Select App Models'
                    : `${selectedAppIds.length} app model${selectedAppIds.length !== 1 ? 's' : ''} selected`}
                </div>

                {showAppModelDropdown && (
                  <div
                    className="bd-bot-model-dropdown"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {allAppModels.length === 0 ? (
                      <div className="bd-dropdown-item">No app models available (Total: {allAppModels.length})</div>
                    ) : (
                      <>
                        {allAppModels.map((app) => {
                          const isChecked = selectedAppIds.includes(app.id);
                          return (
                            <label key={app.id} className="bd-dropdown-item">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleAppSelection(app.id)}
                              />
                              <span>{app.name}</span>
                            </label>
                          );
                        })}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* === Requester Details === */}
          <div className="section-box">
            <h2 className="section-title">Requester Details</h2>
            <div className="row">
              <div className="input-group">
                <label>Requester Name</label>
                <input
                  type="text"
                  maxLength={100}
                  value={reqNameInput}
                  onChange={(e) => setReqNameInput(e.target.value)}
                  placeholder="e.g. Sabitha1"
                />
              </div>
              <div className="input-group">
                <label>Department</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    maxLength={100}
                    value={reqDeptInput}
                    onChange={(e) => setReqDeptInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddReq();
                      }
                    }}
                    placeholder="e.g. Finance"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={handleAddReq}
                    style={{
                      padding: '0.6rem 1rem',
                      backgroundColor: '#2563EB',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: 'pointer'
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
            
            {/* Array of requesters display */}
            <div className="row">
              <div className="input-group" style={{ width: '100%' }}>
                {userDetails.requesterNames && userDetails.requesterNames.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                    {userDetails.requesterNames.map((req, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          backgroundColor: '#e2e8f0',
                          padding: '4px 12px',
                          borderRadius: '16px',
                          fontSize: '0.85rem',
                          gap: '6px'
                        }}
                      >
                        <span>{req.name} - {req.department}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveReq(idx)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#64748b',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            padding: '0 4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* === User Credentials === */}
          <div className="section-box">
            <h2 className="section-title">User Credentials</h2>
            <div className="row">
              <div className="input-group short">
                <label>User Name <span className="required">*</span></label>
                <input
                  required
                  type="text"
                  maxLength={50}
                  value={userDetails.userName}
                  readOnly
                  placeholder="Enter user name"
                />
                <br />
                <button className="reset-btn" onClick={openResetPassword}>
                  Reset Password
                </button>
              </div>
            </div>

            <div className="row">
              <div className="input-group">
                <label>Ariba User Name</label>
                <input
                  type="text"
                  maxLength={50}
                  value={userDetails.aribaUserName ?? ''}
                  onChange={(e) => setUserDetails({ ...userDetails, aribaUserName: e.target.value })}
                  placeholder="Enter Ariba user name"
                />
              </div>
              <div className="input-group">
                <label>Ariba Password</label>
                <input
                  type="password"
                  value={userDetails.aribaPassword ?? ''}
                  onChange={(e) => setUserDetails({ ...userDetails, aribaPassword: e.target.value })}
                  placeholder="Enter Ariba password"
                />
              </div>
            </div>
          </div>

          <div className="btn-container">
            <button className="update-btn" onClick={handleUpdate}>
              Update
            </button>
          </div>
        </div>
      </div>

      {/* Reset Password Popup */}
      {showResetPopup && (
        <div className="overlay">
          <div className="popup">
            <ResetPassword userId={String(userId ?? '')} onClose={closeResetPassword} />
          </div>
        </div>
      )}

      {/* Error Modal */}
      {errorPage && errorPageData && (
        <ErrorModel
          visible={true}
          title={errorPageData.title}
          message={errorPageData.message}
          onConfirm={handleModalConfirm}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
};

export default CustomerMasterEdit;