import { useState } from 'react';
import './UserIdentificationFormCu.css';
import { useCountries } from './context/CountryContext';
import CountrySelect from './CountrySelect';
interface Props {
  updateField: (field: string, value: string) => void;
}

const publicDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'rediffmail.com'];

const UserIdentificationFormCu = ({ updateField }: Props) => {
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
    } else {
      setEmailError('');
    }
  };

  const handlePhoneChange = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    updateField('mobilePhone', numericValue);

    if (!/^\d{1,20}$/.test(numericValue)) {
      setPhoneError('Phone number must be digits only (max 20).');
    } else {
      setPhoneError('');
    }
  };
  
  

  const countries = useCountries();
const [selectedCountry, setSelectedCountry] = useState('');

  const handleCountryChange = (country: string) => {
    setSelectedCountry(country);
    updateField('region', country);
  };
  return (
    <div className="cu-section">
      <h3 className="cu-section-title">User Identification Details</h3>

      <div className="cu-grid">
        <div className="cu-form-group">
          <label>
            Name
            <span className="cu-required">*</span>
          </label>
          <input
            type="text"
            maxLength={50}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="Enter name"
            required
          />
        </div>

        <div className="cu-form-group">
          <label>
            Phone Number
            <span className="cu-required">*</span>
          </label>
          <input
            type="tel"
            maxLength={20}   
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder="Enter your phone number"
            required
          />
          {phoneError && <p className="cu-error-text">{phoneError}</p>}
        </div>

        <div className="cu-form-group">
          <label>Email ID
            <span className="cu-required">*</span>
          </label>
          <input
            type="email"
            maxLength={50}
            onChange={(e) => handleEmailChange(e.target.value)}
            placeholder="Enter your email ID"
            required
          />
          {emailError && <p className="cu-error-text">{emailError}</p>}
        </div>

        <div className="cu-form-group">
          <label>Designation
            <span className="cu-required">*</span>
          </label>
          <input
            type="text"
            maxLength={50}
            onChange={(e) => updateField('designation', e.target.value)}
            placeholder="Enter designation"
          />
        </div>

        <div className="cu-form-group">
          <label>Employee ID
            <span className="cu-required">*</span>
          </label>
          <input
            type="text"
            maxLength={25}
            onChange={(e) => updateField('employeeId', e.target.value)}
            placeholder="Enter employee ID"
          />
        </div>

        <div className="cu-form-group">
          <label>Department
            <span className="cu-required">*</span>
          </label>
          <input
            type="text"
            maxLength={50}
            onChange={(e) => updateField('department', e.target.value)}
            placeholder="Enter department"
          />
        </div>

        <div className="cu-form-group">
           <label className='cu-label'>
            Countries / Region
            <span className="cu-required">*</span>
          </label>
          <CountrySelect
            countries={countries}
            value={selectedCountry}
            onChange={handleCountryChange}
          />
        </div>

        <div className="cu-form-group">
          <label>Address
            <span className="cu-required">*</span>
          </label>
          <input
            type="text"
            maxLength={350}
            onChange={(e) => updateField('address', e.target.value)}
            placeholder="Enter address"
            required
          />
        </div>

        <div className="cu-form-group">
          <label>Org ID</label>
          <input
            type="text"
            maxLength={25}
            onChange={(e) => updateField('orgANId', e.target.value)}
            placeholder="Enter Org ID"
          />
        </div>
      </div>
    </div>
  );
};

export default UserIdentificationFormCu;
