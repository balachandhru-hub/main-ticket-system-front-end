import React, { useEffect, useState } from 'react';
import { useCountryCodes } from '../components/context/CountryCodeContext';
import "./CompanySupportInfo.css";

type Props = {
  formData: any;
  handleChange: (e: React.ChangeEvent<any>) => void;
  errors: { [key: string]: string };
  inputDisabled?: { [key: string]: boolean };
};

const CompanySupportInfo: React.FC<Props> = ({ formData, handleChange, errors, inputDisabled = {} }) => {
  const { countryCodes, loading, error } = useCountryCodes();
  const [isFocused, setIsFocused] = useState(false);

  if (loading) return <div>Loading country codes...</div>;
  if (error) return <div>{error}</div>;

  const isIndia = (formData.countriesOfOperation || '').trim().toLowerCase() === 'india';

  useEffect(() => {
    if (isIndia && formData.lut) {
      handleChange({ target: { name: 'lut', value: '' } } as any);
    } else if (!isIndia && formData.countriesOfOperation) {
      if (formData.gst) {
        handleChange({ target: { name: 'gst', value: '' } } as any);
      }
      if (formData.pan) {
        handleChange({ target: { name: 'pan', value: '' } } as any);
      }
    }
  }, [formData.countriesOfOperation]);

  return (
    <>
      <fieldset className="section">
        <legend>SUPPORT & ACCESS DETAILS</legend>
        <div className="grid-2">
          <div>
            <input
              name="supportAdminName"
              placeholder="Support Admin Name*"
              maxLength={50}
              className={`input-field ${errors.supportAdminName ? 'invalid' : ''}`}
              value={formData.supportAdminName || ''}
              onChange={(e) => {
    let value = e.target.value;

    if (value.length > 50) {
      value = value.slice(0, 50); 
    }
    if (value.length !== 40 && value.length !== 45 && value.length !== 50) {
      errors.supportAdminName = "Length must be 40, 45, or 50 characters";
    } else {
      errors.supportAdminName = "";
    }


    handleChange({ target: { name: 'supportAdminName', value } } as any);
  }}

              disabled={inputDisabled.supportAdminName}
            />
            {errors.supportAdminName && <div className="error">{errors.supportAdminName}</div>}
          </div>
          <div className="phone-input-wrapper">
            <select
              name="countryCode"
              value={formData.countryCode || '+1'}
              onChange={(e) => {
                handleChange(e);
                setIsFocused(false);
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              disabled={inputDisabled.countryCode}
              className="country-code-select"
            >
              {countryCodes.map((item) => (
                <option key={`${item.countryCode}-${item.mobileCountryCode}`} value={item.mobileCountryCode}>
                  {isFocused ? `${item.countryCode} (${item.mobileCountryCode})` : item.mobileCountryCode}
                </option>
              ))}
            </select>

            <input
              name="supportAdminPhoneNo"
              placeholder="Support Admin Phone No*"
              maxLength={20}
              className={`input-field phone-number-input ${errors.supportAdminPhoneNo ? 'invalid' : ''}`}
              value={formData.supportAdminPhoneNo || ''}
              onChange= {(e) => {
    let value = e.target.value.replace(/\s/g, '');
    if (value.length > 20) {
      value = value.slice(0, 20);
    }
    if (value.length === 0) {
      errors.supportAdminPhoneNo = "Phone number is required";
    } else if (value.length > 20) {
      errors.supportAdminPhoneNo = "Phone number cannot exceed 20 digits";
    } else {
      errors.supportAdminPhoneNo = "";
    }

    handleChange({ target: { name: 'supportAdminPhoneNo', value } } as any);
  }}
              disabled={inputDisabled.supportAdminPhoneNo}
            />
            {errors.supportAdminPhoneNo && <div className="error">{errors.supportAdminPhoneNo}</div>}
          </div>
          <div>
            <input
              name="supportAdminEmail"
              placeholder="Support Admin Email*"
              maxLength={50}
              className={`input-field ${errors.supportAdminEmail ? 'invalid' : ''}`}
              value={formData.supportAdminEmail || ''}
              onChange={(e) => {

    let value = e.target.value.replace(/\s/g, '');
    if (value.length > 50) {
      value = value.slice(0, 50);
    }
    if (value.length < 30) {
      errors.supportAdminEmail = "Email must be at least 30 characters";
    } else if (value.length > 50) {
      errors.supportAdminEmail = "Email cannot exceed 50 characters";
    } else {
      errors.supportAdminEmail = "";
    }

    handleChange({ target: { name: 'supportAdminEmail', value } } as any);
  }}
              disabled={inputDisabled.supportAdminEmail}
            />
            {errors.supportAdminEmail && <div className="error">{errors.supportAdminEmail}</div>}
          </div>
          <div>
            <input
              name="supportAdminTimeZone"
              placeholder="Time Zone / Business Hours*"
              maxLength={50}
              className={`input-field ${errors.supportAdminTimeZone ? 'invalid' : ''}`}
              value={formData.supportAdminTimeZone || ''}
              onChange={(e) => {
 
      handleChange(e);
    }}
              disabled={inputDisabled.supportAdminTimeZone}
            />
            {errors.supportAdminTimeZone && <div className="error">{errors.supportAdminTimeZone}</div>}
          </div>
          <div>
            <input
              name="designation"
              placeholder="Designation*"
              maxLength={50}
              className={`input-field ${errors.designation ? 'invalid' : ''}`}
              value={formData.designation || ''}
              onChange={handleChange}
              disabled={inputDisabled.designation}
            />
            {errors.designation && <div className="error">{errors.designation}</div>}
          </div>
        </div>
      </fieldset>

      <fieldset className="section">
        <legend>FINANCE / TAX DETAILS</legend>
        <div className="grid-2">
          {isIndia && (
            <>
              <div>
                <input
                  name="gst"
                  placeholder="GST Number*"
                  className={`input-field ${errors.gst ? 'invalid' : ''}`}
                  value={formData.gst || ''}
                  onChange={(e) => {
 
    if (/^\S{0,15}$/.test(e.target.value)) handleChange(e);
  }}
                  disabled={inputDisabled.gst}
                />
                {errors.gst && <div className="error">{errors.gst}</div>}
              </div>
              <div>
                <input
                  name="pan"
                  placeholder="PAN Number*"
                  className={`input-field ${errors.pan ? 'invalid' : ''}`}
                  value={formData.pan || ''}
                  onChange={(e) => {
    if (/^\S{0,10}$/.test(e.target.value)) handleChange(e);
  }}
                  disabled={inputDisabled.pan}
                />
                {errors.pan && <div className="error">{errors.pan}</div>}
              </div>
            </>
          )}
          <div>
            <input
              name="tan"
              placeholder="TAN Number*"
              className={`input-field ${errors.tan ? 'invalid' : ''}`}
              value={formData.tan || ''}
              onChange={(e) => {
    if (/^\S{0,10}$/.test(e.target.value)) handleChange(e);
  }}
              disabled={inputDisabled.tan}
            />
            {errors.tan && <div className="error">{errors.tan}</div>}
          </div>
          <div>
            <input
              name="taxRegistration"
              placeholder="TAX Registration*"
              className={`input-field ${errors.taxRegistration ? 'invalid' : ''}`}
              value={formData.taxRegistration || ''}
              onChange={(e) => {

    if (/^\S{0,25}$/.test(e.target.value)) handleChange(e);
  }}
              disabled={inputDisabled.taxRegistration}
            />
            {errors.taxRegistration && <div className="error">{errors.taxRegistration}</div>}
          </div>
          <div>
            <input
              name="vat"
              placeholder="VAT Number"
              className={`input-field ${errors.vat ? 'invalid' : ''}`}
              value={formData.vat || ''}
              onChange={(e) => {
   
    if (/^\S{0,15}$/.test(e.target.value)) handleChange(e);
  }}

              disabled={inputDisabled.vat}
            />
            {errors.vat && <div className="error">{errors.vat}</div>}
          </div>
          
          {formData.countriesOfOperation && !isIndia && (
            <div>
              <input
                name="lut"
                placeholder="LUT Number*"
                className={`input-field ${errors.lut ? 'invalid' : ''}`}
                value={formData.lut || ''}
                onChange={(e) => {
  
    if (e.target.value.length <= 25) handleChange(e);
  }}
                disabled={inputDisabled.lut}
              />
              {errors.lut && <div className="error">{errors.lut}</div>}
            </div>
          )}

          <div>
            <input
              name="otherLocalTaxId"
              placeholder="Other Local TAX ID"
              className={`input-field ${errors.otherLocalTaxId ? 'invalid' : ''}`}
              value={formData.otherLocalTaxId || ''}
              onChange={(e) => {
    
    if (/^\S{0,25}$/.test(e.target.value)) handleChange(e);
  }}
              disabled={inputDisabled.otherLocalTaxId}
            />
            {errors.otherLocalTaxId && <div className="error">{errors.otherLocalTaxId}</div>}
          </div>
        </div>
      </fieldset>
    </>
  );
};

export default CompanySupportInfo;