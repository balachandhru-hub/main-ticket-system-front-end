import React, { useState } from 'react';
import './AdditionalQueryForm.css';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import type { E164Number } from 'libphonenumber-js';
import 'react-phone-number-input/style.css';
import { createAdditionalQuery } from '../../api/additionalQueryApi';
import { toast } from 'react-toastify';
import type { AdditionalQueryDto } from '../../Dto/AdditionalQueryDto';

interface AdditionalQueryFormProps {
  open?: boolean;
  onClose?: () => void;
  onSubmitSuccess?: () => void;
}

const AdditionalQueryForm: React.FC<AdditionalQueryFormProps> = ({
  open = true,
  onClose = () => {},
  onSubmitSuccess,
}) => {
  const [formData, setFormData] = useState<AdditionalQueryDto>({
    name: '',
    email: '',
    phone: '',
    organization: '',
    message: '',
  });

  const [phone, setPhone] = useState<E164Number | undefined>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!formData.message.trim()) newErrors.message = 'Message is required';
    if (phone && !isValidPhoneNumber(phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload: AdditionalQueryDto = {
        ...formData,
        phone: phone || '',
      };

      const response = await createAdditionalQuery(payload);

      if ('statusCode' in response) {
        if (response.statusCode === 201) {
          toast.success('Your query has been submitted successfully! We will get back to you soon.');
          setFormData({ name: '', email: '', phone: '', organization: '', message: '' });
          setPhone(undefined);
          onSubmitSuccess?.();
          onClose();
        } else {
          toast.error(response.message || 'Failed to submit query');
        }
      } else {
        toast.success('Your query has been submitted successfully!');
        setFormData({ name: '', email: '', phone: '', organization: '', message: '' });
        setPhone(undefined);
        onSubmitSuccess?.();
        onClose();
      }
    } catch (err: any) {
      toast.error(err?.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!open) return null;

  return (
    <div className="aqf-modal-overlay" onClick={handleOverlayClick}>
      <div className="aqf-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="aqf-modal-header">
          <div>
            <h2>Get in Touch</h2>
            <p className="aqf-modal-subtitle">We'd love to hear from you</p>
          </div>
          <button type="button" className="aqf-close-btn" onClick={onClose} aria-label="Close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="aqf-form">
          <div className="aqf-row">
            <div className="aqf-form-group">
              <label className="aqf-label">Name <span className="aqf-required">*</span></label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="John Doe"
                className={`aqf-input ${errors.name ? 'aqf-error' : ''}`}
                disabled={loading}
              />
              {errors.name && <span className="aqf-error-text">{errors.name}</span>}
            </div>

            <div className="aqf-form-group">
              <label className="aqf-label">Email <span className="aqf-required">*</span></label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="john@example.com"
                className={`aqf-input ${errors.email ? 'aqf-error' : ''}`}
                disabled={loading}
              />
              {errors.email && <span className="aqf-error-text">{errors.email}</span>}
            </div>
          </div>

          <div className="aqf-row">
            <div className="aqf-form-group">
              <label className="aqf-label">Phone</label>
              <PhoneInput
                international
                countryCallingCodeEditable={false}
                defaultCountry="IN"
                value={phone}
                onChange={setPhone}
                placeholder="Enter phone number"
                className="aqf-phone-input"
                disabled={loading}
              />
              {errors.phone && <span className="aqf-error-text">{errors.phone}</span>}
            </div>

            <div className="aqf-form-group">
              <label className="aqf-label">Organization</label>
              <input
                type="text"
                value={formData.organization}
                onChange={(e) => setFormData(prev => ({ ...prev, organization: e.target.value }))}
                placeholder="Company Name"
                className="aqf-input"
                disabled={loading}
              />
            </div>
          </div>

          <div className="aqf-form-group aqf-full">
            <label className="aqf-label">Message <span className="aqf-required">*</span></label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Tell us how we can help..."
              rows={6}
              className={`aqf-textarea ${errors.message ? 'aqf-error' : ''}`}
              disabled={loading}
            />
            {errors.message && <span className="aqf-error-text">{errors.message}</span>}
          </div>

          <div className="aqf-actions">
            <button type="button" onClick={onClose} className="aqf-btn-cancel" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="aqf-btn-submit" disabled={loading}>
              <span>{loading ? 'Sending...' : 'Send Message'}</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdditionalQueryForm;