import React from 'react';
import { useCountries } from '../components/context/CountryContext';

type Props = {
  formData: any;
  handleChange: (e: React.ChangeEvent<any>) => void;
  realmIds: string[];
  urlList: string[];
  realmInput: string;
  urlInput: string;
  setRealmInput: React.Dispatch<React.SetStateAction<string>>;
  setUrlInput: React.Dispatch<React.SetStateAction<string>>;
  handleAddRealm: () => void;
  handleRemoveRealm: (index: number) => void;
  aribaModules: string[];
  handleCheckboxChange: (value: string) => void;
  errors: { [key: string]: string };
  isEdit?: boolean;
  inputDisabled?: { [key: string]: boolean };
  hideDropdowns?: boolean;
};

const CompanyBasicInfo: React.FC<Props> = ({
  formData,
  handleChange,
  realmIds,
  urlList,
  realmInput,
  urlInput,
  setRealmInput,
  setUrlInput,
  handleAddRealm,
  handleRemoveRealm,
  aribaModules,
  handleCheckboxChange,
  errors,
  inputDisabled = {},
  hideDropdowns = false,
}) => {
  const formatDisplayText = (text: string) => {
    return text
      .toLowerCase()
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const countries = useCountries();

  const handleERPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    if (/\s/.test(value)) {
      handleChange({ target: { name: 'connectERPSystem', value } } as any);
      errors.connectERPSystem = "Spaces are not allowed";
      return;
    }

    if (value.length > 3) value = value.slice(0, 3);

    handleChange({ target: { name: 'connectERPSystem', value } } as any);

    if (value.length < 2) {
    errors.connectERPSystem = "Must be at least 2 characters";
    }

    if (value.length !== 3) {
      errors.connectERPSystem = "Must be exactly 3 characters";
    } else {
      errors.connectERPSystem = "";
    }
  };

  const handleAribaNetworkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    if (/\s/.test(value)) {
      errors.aribaNetworkId = "Spaces are not allowed";
      return;
    }

    if (value.length > 15) value = value.slice(0, 15);

    handleChange({ target: { name: 'aribaNetworkId', value } } as any);

    if (value.length !== 15) {
      
    } else {
      errors.aribaNetworkId = "";
    }
  };

  const handleRealmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    if (/\s/.test(value)) {
      errors.realmId = "Spaces are not allowed";
      setRealmInput(value);
      return;
    }

    if (value.length > 15) value = value.slice(0, 15);

    setRealmInput(value);

    if (value.length !== 15) {
   
    } else {
      errors.realmId = "";
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    if (/\s/.test(value)) {
      errors.url = "Spaces are not allowed";
      setUrlInput(value);
      return;
    }

    if (value.length > 350) value = value.slice(0, 500);

    setUrlInput(value);

    if (value.length === 0) {
      errors.url = "URL cannot be empty";
    } else {
      errors.url = "";
    }
  };

  return (
    <>
      <fieldset className="section">
        <legend>COMPANY DETAILS</legend>
        <div className="form-grid">

          <div className='form-left'>
            <input
              name="name"
              placeholder="Company Name*"
              className={`input-field ${errors.name ? 'invalid' : ''}`}
              value={formData.name || ''}
              onChange={handleChange}
              disabled={inputDisabled.name}
              maxLength={100}
              required
            />
            {errors.name && <div className="error">{errors.name}</div>}

            <input
              name="websiteUrl"
              placeholder="Website URL*"
              className={`input-field ${errors.websiteUrl ? 'invalid' : ''}`}
              value={formData.websiteUrl || ''}
              onChange={handleChange}
              disabled={inputDisabled.websiteUrl}
            />
            {errors.websiteUrl && <div className="error">{errors.websiteUrl}</div>}

            <input
              name="headquartersLocation"
              placeholder="Location / Headquarters*"
              className={`input-field ${errors.headquartersLocation ? 'invalid' : ''}`}
              value={formData.headquartersLocation || ''}
              onChange={handleChange}
              disabled={inputDisabled.headquartersLocation}
            />
            {errors.headquartersLocation && <div className="error">{errors.headquartersLocation}</div>}

            <input
              name="registrationNumber"
              placeholder="Company Registration No (CIN number)*"
              className={`input-field ${errors.registrationNumber ? 'invalid' : ''}`}
              value={formData.registrationNumber || ''}
              onChange={handleChange}
              disabled={inputDisabled.registrationNumber}
              maxLength={21}
            />
            {errors.registrationNumber && <div className="error">{errors.registrationNumber}</div>}

            {hideDropdowns ? (
              <input
                name="countriesOfOperation"
                placeholder="Country*"
                className={`input-field ${errors.countriesOfOperation ? 'invalid' : ''}`}
                value={formData.countriesOfOperation || ''}
                onChange={handleChange}
                disabled={inputDisabled.countriesOfOperation}
              />
            ) : (
              <select
                name="countriesOfOperation"
                className={`input-field ${errors.countriesOfOperation ? 'invalid' : ''}`}
                value={formData.countriesOfOperation || ''}
                onChange={handleChange}
              >
                <option value="" disabled>Select Country*</option>
                {countries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            )}
            {errors.countriesOfOperation && <div className="error">{errors.countriesOfOperation}</div>}
          </div>

          <div className="form-right">
            <div className="drop-down-wrapper">
              <div className='dropdown-container'>
                <select
                name="businessType"
                className={`input-field${errors.businessType ? 'invalid' : ''}`}
                value={
                  ['Private Limited Company (Pvt Ltd)', 'Public Limited Company (Ltd)', 'Partnership Firm', 'Sole Proprietorship', 'Joint Venture','Co-operative Society','Trust / NGO / Non-Profit Organization','Government Undertaking / PSU (Public Sector Unit)','Foreign Company / MNC Subsidiary','Start-up (Registered under Startup India, etc.)'].includes(formData.businessType)
                    ? formData.businessType
                    : formData.businessType === '' ? '' : 'Other'
                }
                onChange={(e) => {
                  const val = e.target.value;
                  handleChange({ target: { name: 'businessType', value: val } } as any);
                }}
              >
                <option value="">Select Business Type*</option>
                <option value="Private Limited Company (Pvt Ltd)">Private Limited Company (Pvt Ltd)</option>
                <option value="Public Limited Company (Ltd)">Public Limited Company (Ltd)</option>
                <option value="Partnership Firm">Partnership Firm</option>
                <option value="Sole Proprietorship">Sole Proprietorship</option>
                <option value="Co-operative Society">Co-operative Society</option>
                <option value="Trust / NGO / Non-Profit Organization">Trust / NGO / Non-Profit Organization</option>
                <option value="Government Undertaking / PSU (Public Sector Unit)">Government Undertaking / PSU (Public Sector Unit)</option>
                <option value="Foreign Company / MNC Subsidiary">Foreign Company / MNC Subsidiary</option>
                <option value="Start-up (Registered under Startup India, etc.)">Start-up (Registered under Startup India, etc.)</option>
                <option value="Other">Other</option>
              </select>
              {formData.businessType === 'Other' && (
                <input
                  type="text"
                  placeholder="Enter Business Type"
                  className={`input-field ${errors.businessType ? 'invalid' : ''}`}
                  name="businessTypeOther"
                  value={formData.businessTypeOther || ''}
                  onChange={handleChange}
                />
              )}
              </div>
              {errors.businessType && <div className="error">{errors.businessType}</div>}
            </div>

            <div className="drop-down-wrapper">
              <div className='dropdown-container'>
                <select
                name="industryType"
                className={`input-field${errors.industryType ? 'invalid' : ''}`}
                value={
                  ['Hospitality & Tourism', 'Pharmaceuticals & Life Sciences', 'Healthcare', 'Real Estate & Construction', 'Manufacturing & Industry','Automobiles & Mobility','Transportation & Logistics','Supply Chain & Procurement','Retail & E-commerce','Energy, Utilities & Sustainability','Oil, Gas & Mining','Finance, Banking & Digital Economy',
                    'Insurance & InsurTech','Telecommunications & Media','Technology & IT Services','Aerospace & Defense','Agriculture & Food Tech','Consumer Goods & Lifestyle','Education & EdTech','Government & Public Sector',
                    'Space & Exploration','Cybersecurity','Biotechnology & Synthetic Biology','Entertainment, Sports & Gaming (Metaverse / Esports)','Environmental Services & Circular Economy'].includes(formData.industryType)
                    ? formData.industryType
                    : formData.industryType === '' ? '' : 'Other'
                }
                onChange={(e) => {
                  const val = e.target.value;
                  handleChange({ target: { name: 'industryType', value: val } } as any);
                }}
              >
                <option value="">Select Industry Type*</option>
                <option value="Hospitality & Tourism">Hospitality & Tourism</option>
                <option value="Pharmaceuticals & Life Sciences">Pharmaceuticals & Life Sciences</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Manufacturing & Industry">Manufacturing & Industry</option>
                <option value="Automobiles & Mobility">Automobiles & Mobility</option>
                <option value="Transportation & Logistics">Transportation & Logistics</option>
                <option value="Supply Chain & Procurement">Supply Chain & Procurement</option>
                <option value="Retail & E-commerce">Retail & E-commerce</option>
                <option value="Energy, Utilities & Sustainability">Energy, Utilities & Sustainability</option>
                <option value="Oil, Gas & Mining">Oil, Gas & Mining</option>
                <option value="Finance, Banking & Digital Economy">Finance, Banking & Digital Economy</option>
                <option value="Insurance & InsurTech">Insurance & InsurTech</option>
                <option value="Telecommunications & Media">Telecommunications & Media</option>
                <option value="Technology & IT Services">Technology & IT Services</option>
                <option value="Aerospace & Defense">Aerospace & Defense</option>
                <option value="Agriculture & Food Tech">Agriculture & Food Tech</option>
                <option value="Consumer Goods & Lifestyle">Consumer Goods & Lifestyle</option>
                <option value="Education & EdTech">Education & EdTech</option>
                <option value="Real Estate & Smart Cities">Real Estate & Smart Cities</option>
                <option value="Government & Public Sector">Government & Public Sector</option>
                <option value="Space & Exploration">Space & Exploration</option>
                <option value="Cybersecurity">Cybersecurity</option>
                <option value="Biotechnology & Synthetic Biology">Biotechnology & Synthetic Biology</option>
                <option value="Entertainment, Sports & Gaming (Metaverse / Esports)">Entertainment, Sports & Gaming (Metaverse / Esports)</option>
                <option value="Environmental Services & Circular Economy">Environmental Services & Circular Economy</option>
                <option value="Other">Other</option>
              </select>
              {formData.industryType === 'Other' && (
                <input
                  type="text"
                  placeholder="Enter Industry Type"
                  className={`input-field ${errors.industryType ? 'invalid' : ''}`}
                  name="industryTypeOther"
                  value={formData.industryTypeOther || ''}
                  onChange={handleChange}
                />
              )}
              </div>
              {errors.industryType && <div className="error">{errors.industryType}</div>}
            </div>

            <textarea
              name="billingAddress"
              placeholder="Billing Address*"
              className={`textarea-field ${errors.billingAddress ? 'invalid' : ''}`}
              value={formData.billingAddress || ''}
              onChange={handleChange}
              disabled={inputDisabled.billingAddress}
              maxLength={500}
              required
            />
            {errors.billingAddress && <div className="error">{errors.billingAddress}</div>}

          </div>
        </div>
      </fieldset >

      <fieldset className="section">
        <legend>SAP ARIBA USAGE PROFILE</legend>

        <label className="section-label">SAP Ariba Modules (Select those in use)</label>

        <div className="module-checkboxes">
          {aribaModules.map((module) => (
            <label key={module} className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.aribaModules?.includes(module)}
                onChange={() => handleCheckboxChange(module)}
              />
              {formatDisplayText(module)}
            </label>
          ))}
        </div>

        <label className="section-label">Integrated ERP Systems</label>
        <div className="grid-2">
          <div>
            <input
              name="connectERPSystem"
              placeholder="Connected ERP Systems*"
              className={`input-field ${errors.connectERPSystem ? 'invalid' : ''}`}
              value={formData.connectERPSystem || ''}
              onChange={handleERPChange}
              disabled={inputDisabled.connectERPSystem}
            />
            {errors.connectERPSystem && <div className="error">{errors.connectERPSystem}</div>}
          </div>
          <div>
            <input
              type="number"
              name="numberOfUser"
              placeholder="Number of Users*"
              className={`input-field ${errors.numberOfUser ? 'invalid' : ''}`}
              value={formData.numberOfUser || ''}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                handleChange({ target: { name: 'numberOfUser', value } } as any);
              }}
              disabled={inputDisabled.numberOfUser}
            />
            {errors.numberOfUser && <div className="error">{errors.numberOfUser}</div>}
          </div>

          <div>
            <input
              name="aribaNetworkId"
              placeholder="Ariba Network ID*"
              className={`input-field ${errors.aribaNetworkId ? 'invalid' : ''}`}
              value={formData.aribaNetworkId || ''}
              onChange={handleAribaNetworkChange}
              disabled={inputDisabled.aribaNetworkId}
            />
            {errors.aribaNetworkId && <div className="error">{errors.aribaNetworkId}</div>}
          </div>
        </div>

        <div className="realm-url-container">
          <div className="grid-2 align-end">
            <div>
              <input
                placeholder="Ariba Realm ID*"
                className="input-field"
                value={realmInput}
                onChange={handleRealmChange}
              />
              {errors.realmId && <div className="error">{errors.realmId}</div>}
            </div>
            <div className='input-wrapper'>
              <div className="input-row-with-button">
                <input
                  placeholder="URL*"
                  className="input-field"
                  value={urlInput}
                  onChange={handleUrlChange}
                />
                {errors.url && <div className="error">{errors.url}</div>}
                <button type="button" className="btn-add" onClick={handleAddRealm}>
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="pill-container">
          {realmIds.map((realm, index) => (
            <div className="pill" key={index}>
              {realm} → {urlList[index]}
              <span className="pill-remove" onClick={() => handleRemoveRealm(index)}>×</span>
            </div>
          ))}
        </div>
      </fieldset>
    </>
  );
};

export default CompanyBasicInfo;
