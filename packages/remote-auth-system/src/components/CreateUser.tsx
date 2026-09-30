import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import RequesterSetting from '../components/RequesterSetting';
import UserIdentificationForm from "../components/UserIdentificationForm";
import RoleAccessSettings from "../components/RoleAccessSettings";
import UserCredentialsForm from "../components/UserCredentialsForm";
import ErrorModel from '../components/ErrorModel';
import BackButton from './BackButton';

import { registerUser } from '../api/authApi';
import type { CreateUserPayload } from '../Dto/CreateUserPayload';

import './CreateUser.css';
import { useAuth } from './context/AuthContext';
import type { CompanyPreviewDto } from '../Dto/CompanyPreviewDto';
import type { SuccessResponseDto } from '../Dto/SuccessResponseDto';
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';

const CreateUser = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();

const initialState = {
  name: '',
  email: '',
  domain: '',
  aribaUserName: '',
  aribaPassword: '',
  userName: '',
  userSecret: '',
  roleId: '',
  ModelIds: [] as string[],
  AppIds: [] as string[],
  address: '',
  mobilePhone: '',
  designation: '',
  department: '',
  employeeId: '',
  region: '',
  orgANId: '',
  requesterNames: [] as { name: string; department: string }[],
};
  const [formData, setFormData] = useState(initialState);
  const [mobileError, setMobileError] = useState('');
  const [errorPage, setErrorPage] = useState(false);
  const [errorPageData, setErrorPageData] = useState({ title: '', message: '' });
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const customer = location.state as CompanyPreviewDto | undefined;

const updateField = (field: string, value: any) => {
  if (field === 'mobilePhone' && typeof value === 'string') {
    const numericOnly = value.replace(/\D/g, '');
    if (numericOnly.length > 15) {
      setMobileError('Mobile number must not exceed 15 digits.');
    } else {
      setMobileError('');
    }
    setFormData(prev => ({ ...prev, mobilePhone: numericOnly }));
  } else {
    setFormData(prev => ({ ...prev, [field]: value }));
  }
};

  function isSuccess(response: SuccessResponseDto | ErrorResponseDto): response is SuccessResponseDto {
    return 'id' in response;
  }

  function isErrorResponse(response: SuccessResponseDto | ErrorResponseDto): response is ErrorResponseDto {
    return 'message' in response && 'statusCode' in response;
  }

const handleSubmit = async () => {
  try {
    const domainId = customer?.id;
    const roleId = formData.roleId || auth!.auth!.roleId;

    if (!isPasswordValid) {
      toast.error("Passwords do not match.");
      return;
    }

    if (!domainId) {
      toast.error("Domain ID is missing. Cannot create user.");
      return;
    }

    if (!roleId) {
      toast.error("Role ID is missing. Cannot create user.");
      return;
    }

    if (!formData.ModelIds || formData.ModelIds.length === 0) {
      toast.error("Please select at least one bot model.");
      return;
    }

    if (!formData.address || !formData.mobilePhone || !formData.name || !formData.email || !formData.userName || !formData.userSecret) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (mobileError) {
      toast.error("Fix mobile number error before submitting.");
      return;
    }

    const payload: CreateUserPayload = {
      name: formData.name,
      email: formData.email,
      address: formData.address,
      mobilePhone: formData.mobilePhone,
      domainId: domainId,
      realmId: null,
      tenantId: null,
      tempTenantId: null,
      aribaUserName: formData.aribaUserName || null,
      aribaPassword: formData.aribaPassword || null,
      roleId: roleId,
      userName: formData.userName,
      userSecret: formData.userSecret,
      designation: formData.designation,
      employeeId: formData.employeeId,
      department: formData.department,
      requesterNames: formData.requesterNames,
      ModelIds: formData.ModelIds,
      AppIds: formData.AppIds,
      orgANId: formData.orgANId,
    };

    const response = await registerUser(payload);

    if (isSuccess(response)) {
      toast.success('User created successfully');
      setFormData(initialState);
      setMobileError('');

      setTimeout(() => {
        navigate("/customer-master", { state: { ...customer, refresh: true } });
      }, 2000);

    } else if (isErrorResponse(response) && response.statusCode === 401) {
      setErrorPage(true);
      setErrorPageData({
        title: response.message || 'Unauthorized',
        message: response.description || 'You are not authorized to perform this action.',
      });
    } else if (isErrorResponse(response) && response.statusCode === 412) {
      toast.error(response.message || 'Unable to Create the User, Try Again');
    } else {
      toast.error(response.message || 'Failed to create user');
    }

  } catch (error: any) {
    if (error?.response?.status === 400 && error?.response?.data) {
      const errorData = error.response.data;

      if (typeof errorData === 'object' && !('message' in errorData)) {
        const errorMessages = Object.entries(errorData)
          .map(([, messages]: [string, any]) => {
            if (Array.isArray(messages)) {
              return messages.join(', ');
            }
            return messages;
          })
          .join(' ');
        
        toast.error(errorMessages || 'Validation error occurred');
        return;
      }
    }
    setErrorPage(true);
    setErrorPageData({
      title: "Error",
      message: error?.response?.data?.message || 'An error occurred while creating user.',
    });
  }
};
  const handleModalConfirm = () => {
    setErrorPage(false);
    navigate('/');
  };

  const handleModalClose = () => {
    setErrorPage(false);
    navigate('/');
  };

  return (
    <div className="bd-container">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnFocusLoss
        draggable
        theme="light"
      />

      <div className="bd-back-fixed-wrapper">
        <BackButton />
      </div>

      <h1 className="bd-title">Business User Creation</h1>

      <div className="bd-form-wrapper wide">
        <UserIdentificationForm updateField={updateField} />
        <RoleAccessSettings updateField={updateField} />
        <UserCredentialsForm updateField={updateField} setPasswordValid={setIsPasswordValid} />
        <RequesterSetting updateField={updateField} />

        <button className="bd-button-blue small" onClick={handleSubmit}>
          Submit
        </button>
      </div>

      {errorPage && (
        <ErrorModel
          visible={true}
          title={errorPageData.title}
          message={errorPageData.message}
          onClose={handleModalClose}
          onConfirm={handleModalConfirm}
        />
      )}
    </div>
  );
};

export default CreateUser;