import './ResetPassword.css';
import { useState } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { resetPassword } from '../api/authApi';
import { useNavigate } from 'react-router-dom';
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';
 
interface ResetPasswordProps {
  onClose?: () => void;
  userId: string;
}
 
export const ResetPassword = ({ onClose, userId }: ResetPasswordProps) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
 
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirm password do not match.");
      return;
    }
 
    try {
      const response = await resetPassword(userId, newPassword);
     
      
 
      if (response.statusCode === 200) {
        toast.success("Password reset successfully.");
        if (onClose) onClose();
      } else if (response.statusCode === 412) {
        toast.error("New password cannot be the same as the old password.");
      } else if (response.statusCode === 401) {
        toast.error(response.message || "Unauthorized. Redirecting to login page.");
        setTimeout(() => {
           navigate('/');
        }, 2000);
      } else {
        toast.error(response.message || "An error occurred");
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message || err?.message || 'Password reset failed';
    if (status === 412) {
        toast.error(message || 'New password cannot be the same as the old password.');
      } else if (status === 401) {
        toast.error('Unauthorized. Redirecting to login page.');
        setTimeout(() => {
         navigate('/');
        }, 2000);
      } else {
        toast.error(`Password reset failed: ${message}`);
      }
    }
  };
 
  return (
    <div className="reset-container">
      <div className="reset-box">
        <button className="close-btn" onClick={onClose}>×</button>
        <h2 className="reset-title">Reset Password</h2>
 
        <form className="reset-form" onSubmit={handleSubmit}>
          <label className="password-label">
            New Password
            <div className="password-input-container">
              <input
                type={showNewPassword ? 'text' : 'password'}
                placeholder="Enter New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="eye-icon"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <AiOutlineEye /> : <AiOutlineEyeInvisible />}
              </button>
            </div>
          </label>

          <label className="password-label">
            Confirm Password
            <div className="password-input-container">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Re-Enter New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="eye-icon"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <AiOutlineEye /> : <AiOutlineEyeInvisible />}
              </button>
            </div>
          </label>
 
          <button type="submit" className="reset-button">
            Reset Password
          </button>
        </form>
      </div>
 
      
    </div>
  );
};
 