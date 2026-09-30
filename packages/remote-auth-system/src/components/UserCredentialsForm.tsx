import './UserCredentialsForm.css';
import { useState, useEffect } from 'react';

interface Props {
  updateField: (field: string, value: string) => void;
  setPasswordValid: (isValid: boolean) => void;
}

const UserCredentialsForm = ({ updateField, setPasswordValid }: Props) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const validatePasswordStrength = (pwd: string) => {
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
    return strongPasswordRegex.test(pwd);
  };

  useEffect(() => {
    if (password.length === 0 && confirmPassword.length === 0) {
      setError('');
      setPasswordValid(false);
      return;
    }

    if (!validatePasswordStrength(password)) {
      setError(
        'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.'
      );
      setPasswordValid(false);
    } else if (password !== confirmPassword) {
      setError('Passwords do not match');
      setPasswordValid(false);
    } else {
      setError('');
      setPasswordValid(true);
    }
  }, [password, confirmPassword, setPasswordValid]);
  
  return (
    <div className="bd-section">
      <h3 className="bd-section-title">User Credentials</h3>
      <div className="bd-form-group-grid">
        <div className="bd-field">
          <label>User Name<span className="bd-role-required">*</span></label>
          <input
            type="text"
            placeholder="Enter username"
            maxLength={50}
            onChange={(e) => updateField('userName', e.target.value)}
          />
        </div>

        <div className="bd-field">
          <label>Password<span className="bd-role-required">*</span></label>
          <input
            type="password"
            placeholder="Enter password"
            onChange={(e) => {
              setPassword(e.target.value);
              updateField('userSecret', e.target.value); 
            }}
          />
        </div>

        <div className="bd-field">
          <label>Confirm Password<span className="bd-role-required">*</span></label>
          <input
            type="password"
            placeholder="Re-enter password"
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {error && <p style={{ color: 'red', marginTop: '4px', fontSize: '0.85rem' }}>{error}</p>}
        </div>

        {/* New Ariba Username field */}
        <div className="bd-field">
          <label>Ariba User Name</label>
          <input
            type="text"
            placeholder="Enter Ariba username"
            maxLength={50}
            onChange={(e) => updateField('aribaUserName', e.target.value)}
          />
        </div>

        {/* New Ariba Password field */}
        <div className="bd-field">
          <label>Ariba Password</label>
          <input
            type="password"
            placeholder="Enter Ariba password"
            onChange={(e) => updateField('aribaPassword', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

export default UserCredentialsForm;