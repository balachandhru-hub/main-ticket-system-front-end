import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import UserIdentificationFormCu from "../components/UserIdentificationFormCu";
import RoleAccessSettingsCu from "../components/RoleAccessSettingsCu";
import UserCredentialsFormCu from "../components/UserCredentialsFormCu";
import ErrorModel from '../components/ErrorModel';
import BackButton from './BackButton';

import { registerUser } from '../api/authApi';
import type { CreateUserPayload } from '../Dto/CreateUserPayload';

import './CreateUserCu.css';
import { useAuth } from './context/AuthContext';
import type { SuccessResponseDto } from '../Dto/SuccessResponseDto';
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';

const CreateUserCu = () => {
  const navigate = useNavigate();
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
    botModels: [] as string[],
    address: '',
    mobilePhone: '',
    designation: '',
    department: '',
    employeeId: '',
    region: '',
    orgANId: '',
  };

  const [formData, setFormData] = useState(initialState);
  const [mobileError, setMobileError] = useState('');
  const [errorPage, setErrorPage] = useState(false);
  const [errorPageData, setErrorPageData] = useState({ title: '', message: '' });
  const [isPasswordValid, setIsPasswordValid] = useState(false);

const updateField = (field: string, value: string | string[]) => {
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

  const validatePasswordStrength = (pwd: string) => {
    const strongPasswordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
    return strongPasswordRegex.test(pwd);
  };

  const handleSubmit = async () => {
    try {
      const domainId = auth?.auth?.domainId;
      const roleId = formData.roleId || auth!.auth!.roleId;
      
      if(!validatePasswordStrength(formData.userSecret)) {
        toast.error("Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.");
        return; 
      }
      
      if (!isPasswordValid) {
        toast.error("Passwords do not match.");
        return;
      }

      if (!domainId) {
        toast.error("Domain ID is missing. Cannot create user.");
        return;
      }

      if (
        !formData.name ||
        !formData.email ||
        !formData.userName ||
        !formData.userSecret ||
        !formData.roleId ||
        !formData.address ||
        !formData.mobilePhone
      ) {
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
        department: formData.department,
        employeeId: formData.employeeId,
        ModelIds: null,
        orgANId: formData.orgANId,
      };

      const response = await registerUser(payload);

      if (isSuccess(response)) {
        toast.success('User created successfully!');
        setFormData(initialState);
        setMobileError('');
        setTimeout(() => {
          navigate('/user-details');
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
    <div className="cu-container">
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

      <div className="cu-back-fixed-wrapper">
        <BackButton />
      </div>

      <h1 className="cu-title">Global User creation</h1>

      <div className="cu-form-wrapper wide">
        <UserIdentificationFormCu updateField={updateField} />
        <RoleAccessSettingsCu updateField={updateField} />
        <UserCredentialsFormCu updateField={updateField} setPasswordValid={setIsPasswordValid} />

        <button className="cu-button-blue small" onClick={handleSubmit}>
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

export default CreateUserCu;