import { useState } from 'react';
import './UserIdentificationForm.css';
import { useCountries } from './context/CountryContext';

interface Props {
  updateField: (field: string, value: string) => void;
}
const publicDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'rediffmail.com'];

const UserIdentificationForm = ({ updateField }: Props) => {
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const handleEmailChange = (value: string) => {
    updateField('email', value);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const domain = value.split('@')[1];

    if (!emailRegex.test(value)) {
      setEmailError('Please enter a valid email address.');
    } else if (domain && publicDomains.includes(domain.toLowerCase())) {
      setEmailError('Please use a company/organization email.');
    } else if (value.length < 5) {
      setEmailError('Email must be at least 5 characters.');
    } else if (value.length >= 100) {
      setEmailError('Email must not exceed 100 characters.');
    } else {
      setEmailError('');
    }
  };

  const handlePhoneChange = (value: string) => {
    const invalidCharPattern = /[^0-9]/;

    if (invalidCharPattern.test(value)) {
      setPhoneError('Phone number must contain digits only (no letters or symbols).');
    } else if (value.length > 20) {
      setPhoneError('Phone number must not exceed 20 digits.');
    } else {
      setPhoneError('');
    }

    const numericValue = value.replace(/\D/g, '');
    updateField('mobilePhone', numericValue);
  };

  const countries = useCountries();

  return (
    <div className="bd-section">
      <h3 className="bd-section-title">User Identification Details</h3>

      <div className="bd-grid">
        <div className="bd-form-group">
          <label className="form-label">
            Name<span className="required-star">*</span>
          </label>
          <input
            type="text"
            minLength={3}
            maxLength={50}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="Enter name"
            required
          />
        </div>

        <div className="bd-form-group">
          <label className="form-label">Phone Number<span className="required-star">*</span></label>
          <input
            type="tel"
            minLength={10}
            maxLength={20}
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder="Enter your phone number"
            required
          />
          {phoneError && <p className="bd-error-text">{phoneError}</p>}
        </div>

        <div className="bd-form-group">
          <label className="form-label">Email ID<span className="required-star">*</span></label>
          <input
            type="email"
            minLength={5}
            maxLength={100}
            onChange={(e) => handleEmailChange(e.target.value)}
            placeholder="Enter your email ID"
            required
          />
          {emailError && <p className="bd-error-text">{emailError}</p>}
        </div>

        <div className="bd-form-group">
          <label className="form-label">Designation<span className="required-star">*</span></label>
          <input
            type="text"
            minLength={2}
            maxLength={50}
            onChange={(e) => updateField('designation', e.target.value)}
            placeholder="Enter designation"
          />
        </div>

        <div className="bd-form-group">
          <label className="form-label">Employee ID<span className="required-star">*</span></label>
          <input
            type="text"
            minLength={2}
            maxLength={25}
            onChange={(e) => updateField('employeeId', e.target.value)}
            placeholder="Enter employee ID"
          />
        </div>

        <div className="bd-form-group">
          <label className="form-label">Department<span className="required-star">*</span></label>
          <input
            type="text"
            minLength={2}
            maxLength={25}
            onChange={(e) => updateField('department', e.target.value)}
            placeholder="Enter department"
          />
        </div>

        <div className="bd-form-group">
          <label className="form-label">Countries / Region<span className="required-star">*</span></label>
          <select onChange={(e) => updateField('region', e.target.value)} defaultValue="">
            <option value="" disabled>
              Select the countries / region
            </option>
            {countries.map((countryCode) => (
              <option key={countryCode} value={countryCode}>
                {countryCode.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="bd-form-group">
          <label className="form-label">Address<span className="required-star">*</span></label>
          <input
            type="text"
            minLength={10}
            maxLength={100}
            onChange={(e) => updateField('address', e.target.value)}
            placeholder="Enter address"
            required
          />
        </div>

        <div className="bd-form-group">
          <label className="form-label">Org ID</label>
          <input
            type="text"
            minLength={2}
            maxLength={25}
            onChange={(e) => updateField('orgANId', e.target.value)}
            placeholder="Enter Org ID"
          />
        </div>
      </div>
    </div>
  );
};

export default UserIdentificationForm;
