import "./UserCredentialsFormCu.css";
import { useState, useEffect } from "react";

interface Props {
  updateField: (field: string, value: string) => void;
  setPasswordValid: (valid: boolean) => void;
}

const UserCredentialsFormCu = ({ updateField, setPasswordValid }: Props) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const validatePasswordStrength = (pwd: string) => {
    const strongPasswordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
    return strongPasswordRegex.test(pwd);
  };

  useEffect(() => {
    let valid = true;

    if (password && !validatePasswordStrength(password)) {
      setPasswordError(
        "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
      );
      valid = false;
    } else {
      setPasswordError("");
    }

    if (confirmPassword && password !== confirmPassword) {
      setError("Passwords do not match.");
      valid = false;
    } else {
      setError("");
    }

    setPasswordValid(
      valid && password.length > 0 && confirmPassword.length > 0
    );
  }, [password, confirmPassword]);

  return (
    <div className="cu-section">
      <h3 className="cu-section-title">User Credentials</h3>
      <div className="cu-form-group-grid">
        {/* Username */}
        <div className="cu-field">
          <label>User Name<span className="cu-role-required">*</span></label>
          <input
            type="text"
            placeholder="Enter username"
            onChange={(e) => updateField("userName", e.target.value)}
            maxLength={50}
          />
        </div>

        {/* Password */}
        <div className="cu-field">
          <label>Password<span className="cu-role-required">*</span></label>
          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => {
              const value = e.target.value;
              setPassword(value);
              updateField("userSecret", value);
            }}
          />
          {passwordError && <p className="cu-error-text">{passwordError}</p>}
        </div>

        {/* Confirm Password */}
        <div className="cu-field">
          <label>Confirm Password<span className="cu-role-required">*</span></label>
          <input
            type="password"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {error && <p className="cu-error-text">{error}</p>}
        </div>

        {/* New Ariba Username field */}
        <div className="cu-field">
          <label>Ariba User Name</label>
          <input
            type="text"
            placeholder="Enter Ariba username"
            maxLength={50}
            onChange={(e) => updateField("aribaUserName", e.target.value)}
          />
        </div>

        {/* New Ariba Password field */}
        <div className="cu-field">
          <label>Ariba Password</label>
          <input
            type="password"
            placeholder="Enter Ariba password"
            onChange={(e) => updateField("aribaPassword", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

export default UserCredentialsFormCu;