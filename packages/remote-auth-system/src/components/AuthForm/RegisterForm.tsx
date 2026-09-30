// src/components/AuthForm/RegisterForm.tsx
import React, { useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { registerUser } from '../../api/authApi';
import type { CreateUserPayload } from '../../Dto/CreateUserPayload'; 
import 'react-toastify/dist/ReactToastify.css';
import './RegisterForm.css';
import { useAuth } from '../context/AuthContext';

const RegisterForm: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    domain: '',
    aribaUserName: '',
    aribaPassword: '', // Added aribaPassword field
    userName: '',
    userSecret: '',
    confirmPassword: '',
    address: '',
    mobilePhone: '',
  });

  const [loading, setLoading] = useState(false);
  const auth = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (formData.userSecret !== formData.confirmPassword) {
      toast.error('Passwords do not match!');
      return;
    }

    const domainId = auth?.auth?.domainId;

    if (!domainId) {
      toast.error("Domain ID is missing. Cannot create user.");
      return;
    }

    try {
      setLoading(true);

      const payload: CreateUserPayload = {
        name: formData.name,
        email: formData.email,
        address: formData.address,
        mobilePhone: formData.mobilePhone,
        domainId: domainId,
        realmId: "",
        tenantId: "",
        tempTenantId: null,
        aribaUserName: formData.aribaUserName || null, // Added aribaUserName to payload
        aribaPassword: formData.aribaPassword || null, // Added aribaPassword to payload
        roleId: "",
        userName: formData.userName,
        userSecret: formData.userSecret,
        designation: null,
        department: null,
        employeeId: null,
        ModelIds: [] 
      };

      await registerUser(payload);
      toast.success('Registration successful! Redirecting...');
      setTimeout(() => navigate('/'), 2000);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Registration failed!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rs-wrapper">
      <ToastContainer />
      <div className="rs-box">
        <h2 className="rs-title">Register New CAS User</h2>
        <form className="rs-form" onSubmit={handleSubmit} noValidate>
          <div className="rs-grid">
            {[
              { name: 'name', label: 'Name', type: 'text' },
              { name: 'email', label: 'Email', type: 'email' },
              { name: 'domain', label: 'Domain', type: 'text' },
              { name: 'aribaUserName', label: 'Ariba Username', type: 'text' },
              { name: 'aribaPassword', label: 'Ariba Password', type: 'password' }, // Added aribaPassword field
              { name: 'userName', label: 'Username', type: 'text' },
              { name: 'userSecret', label: 'Password', type: 'password' },
              { name: 'confirmPassword', label: 'Confirm Password', type: 'password' },
              { name: 'address', label: 'Address', type: 'text' },
              { name: 'mobilePhone', label: 'Mobile Number', type: 'text' },
            ].map((field) => (
              <div className="rs-form-group" key={field.name}>
                <input
                  type={field.type}
                  name={field.name}
                  id={field.name}
                  value={(formData as any)[field.name]}
                  onChange={handleChange}
                  className="rs-input"
                  placeholder=" "
                  required
                />
                <label htmlFor={field.name} className="rs-label">{field.label}</label>
              </div>
            ))}
          </div>
          <button type="submit" className="rs-button" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegisterForm;