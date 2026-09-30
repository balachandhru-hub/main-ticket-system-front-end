import React, { useState, useEffect, useRef } from 'react';
import './LoginForm.css';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { loginUser } from '../../api/authApi';
import { microsoftLogin } from '../../api/microsoftAuthApi';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getMsalInstance,
  initializeMsal,
  isInteractionInProgress,
  loginRequest,
} from '../../api/msalConfig';
import { LuEyeClosed } from 'react-icons/lu';
import { MdOutlineRemoveRedEye } from 'react-icons/md';

const msalInstance = getMsalInstance();

interface LoginFormProps {
  onShowError: (title: string, message: string) => void;
  onOpenSupport: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onShowError, onOpenSupport }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [msalLoading, setMsalLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rateLimitError, setRateLimitError] = useState('');
  const navigate = useNavigate();
  const { fetchAndSetAuth } = useAuth();
  // Guards the redirect handling against React StrictMode's double effect run.
  const redirectHandledRef = useRef(false);
  // Guards loginRedirect against double-clicks / concurrent calls.
  const msalLoadingRef = useRef(false);

  // Initialize MSAL and finish any pending redirect interaction.
  useEffect(() => {
    const handleMsalRedirect = async () => {
      if (redirectHandledRef.current) return;
      redirectHandledRef.current = true;

      try {
        // Always awaited, never skipped: handleRedirectPromise() is what
        // consumes the #code=... response and clears MSAL's
        // `interaction_in_progress` flag.
        const { response, error: redirectError } = await initializeMsal();

        if (redirectError) {
          // Typically AADSTS70008: the authorization code was already stale by
          // the time it reached us. The user just needs to sign in again.
          toast.error('Microsoft sign-in expired. Please try signing in again.');
          return;
        }

        if (response && response.account) {
          const email = response.account.username;
          if (email) {
            setMsalLoading(true);
            try {
              const backendResponse = await microsoftLogin(email);
              if (backendResponse.statusCode === 200) {
                toast.success('Microsoft login successful!');
                await fetchAndSetAuth();
                setTimeout(() => navigate('/dashboard'), 900);
              } else if (backendResponse.statusCode === 401) {
                onShowError('', (backendResponse as any).message);
              }
            } catch (error: any) {
              const errorMsg = error?.response?.data?.message || error.message || 'Login failed';
              toast.error(errorMsg);
              onShowError('Login Failed', errorMsg);
            } finally {
              setMsalLoading(false);
            }
          }
        }
      } catch (error) {
        redirectHandledRef.current = false;
      }
    };
    handleMsalRedirect();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (rateLimitError) setRateLimitError('');
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setRateLimitError('');

    try {
      const response = await loginUser({
        username: formData.username,
        password: formData.password,
      }) as { token: string; refreshToken: string; statusCode: number; message: string; description: string };

      if (response.statusCode == 200) {
        toast.success('Login successful!');
        sessionStorage.removeItem("hasSyncedOnce");
        sessionStorage.removeItem("syncDashAutoSyncedPR");
        await fetchAndSetAuth();
        setTimeout(() => {
          navigate('/dashboard');
        }, 900);
      }
      else if (response.statusCode == 401) {
        onShowError('', response.message);
      } else if (response.statusCode == 429) {
        setRateLimitError(response.message || 'Maximum limit reached. Please try again later.');
      }
    } catch (error: any) {
      toast(error);
      if (error?.response?.data?.statusCode === 429) {
        setRateLimitError(error?.response?.data?.message || 'Login failed');
      } else {
        toast.error(error?.response?.data?.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMicrosoftSignIn = async () => {
    // Blocks double-clicks / concurrent calls before React re-renders the
    // disabled button.
    if (msalLoadingRef.current) return;
    msalLoadingRef.current = true;
    setMsalLoading(true);

    try {
      // Make sure initialize() + handleRedirectPromise() have both completed
      // before starting a new interactive request. A failed redirect response
      // is reported, not thrown, so a stale code never blocks a fresh sign-in.
      await initializeMsal();

      if (isInteractionInProgress()) {
        msalLoadingRef.current = false;
        setMsalLoading(false);
        return;
      }

      // Use redirect instead of popup to avoid COOP issues
      await msalInstance.loginRedirect({
        ...loginRequest,
        prompt: 'select_account'
      });
      // After redirect, user will come back and we handle it in useEffect
    } catch (error: any) {
      let errorMessage = 'Microsoft authentication failed';
      if (error.message) {
        errorMessage = error.message.includes(':')
          ? error.message.split(':').slice(1).join(':').trim()
          : error.message;
      }
      toast.error(errorMessage);
      onShowError('Authentication Error', errorMessage);
      msalLoadingRef.current = false;
      setMsalLoading(false);
    }
  };

  return (
    <div className="lf-wrapper">
      <div className="lf-box">
        <h2 className="lf-title">Sign In</h2>
        <form className="lf-form" onSubmit={handleSubmit} noValidate>

          {/* Microsoft Sign In Button */}
          <button
            type="button"
            className="lf-microsoft-button"
            onClick={handleMicrosoftSignIn}
            disabled={msalLoading}
          >
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg"
              alt="Microsoft Logo"
              className="lf-microsoft-logo"
            />
            {msalLoading ? 'Signing in...' : 'Continue with Microsoft'}
          </button>

          {/* OR Divider */}
          <div className="lf-divider">
            <span className="lf-divider-text">OR</span>
          </div>

          {/* Username Field */}
          <div className="lf-group">
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="lf-input"
              placeholder=" "
              required
            />
            <label htmlFor="username" className="lf-label">Username</label>
          </div>

          {/* Password Field */}
          <div className="lf-group">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="lf-input"
              placeholder=" "
              required
            />
            <label htmlFor="password" className="lf-label">Password</label>
            <button
              type="button"
              className="lf-toggle-password"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? (
                <MdOutlineRemoveRedEye size={20} />
              ) : (
                <LuEyeClosed size={20} />
              )}
            </button>
          </div>

          {/* Submit Button */}
          <button type="submit" className="lf-button" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          {rateLimitError && (
            <p className="lf-rate-limit-error">{rateLimitError}</p>
          )}
          <button type="button" className="lf-additional-query" onClick={onOpenSupport}>
            Need Help? <span className="lf-contact-support">Contact Support</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;