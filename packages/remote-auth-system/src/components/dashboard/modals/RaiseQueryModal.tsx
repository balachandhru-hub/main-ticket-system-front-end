import React, { useState, useEffect } from 'react';
import { X, HelpCircle, Send, User } from 'lucide-react';
import { toast } from 'react-toastify';
import { raiseTicket, fetchLookupRequesters } from '../../../api/SpendApi';
import { getMyProfile } from '../../../api/userApi';
import SpinnerLoaders from '../../SpinnerLoaders';

interface RaiseQueryModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultFrom?: string;
  defaultTo?: string;
  defaultTitle?: string;
  defaultSupplierName?: string;
  defaultMaterialName?: string;
  defaultFromDate?: string;
  defaultToDate?: string;
  defaultMessage?: string;
}

export const RaiseQueryModal: React.FC<RaiseQueryModalProps> = React.memo(({
  isOpen,
  onClose,
  defaultFrom = '',
  defaultTo = '',
  defaultTitle = '',
  defaultSupplierName = '',
  defaultMaterialName = '',
  defaultFromDate = '',
  defaultToDate = '',
  defaultMessage = ''
}) => {
  const [from, setFrom] = useState(defaultFrom || '');
  const [to, setTo] = useState(defaultTo || '');
  const [title, setTitle] = useState(defaultTitle || '');
  const [supplierName, setSupplierName] = useState(defaultSupplierName || '');
  const [materialName, setMaterialName] = useState(defaultMaterialName || '');
  const [message, setMessage] = useState(defaultMessage || '');
  const [loading, setLoading] = useState(false);
  const [requestersOptions, setRequestersOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [requestersLoading, setRequestersLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    const sup = defaultSupplierName || '';
    let mat = defaultMaterialName || '';
    const fDate = defaultFromDate || '';
    const tDate = defaultToDate || '';
    const msg = defaultMessage || '';
    let tit = defaultTitle || '';

    if (!mat) {
      if (tit && tit.startsWith('Query regarding ')) {
        const extracted = tit.replace(/^Query regarding\s+/, '').replace(/\s*\(\d{4}-\d{2}\)$/, '').trim();
        if (extracted && extracted !== sup) mat = extracted;
      }
      if (!mat && msg && msg.startsWith('Query details for ')) {
        const extracted = msg.replace(/^Query details for\s+/, '').split(' supplied by')[0].trim();
        if (extracted && extracted !== 'Item' && extracted !== sup) mat = extracted;
      }
    }

    if (!tit && (mat || sup)) {
      tit = `Query regarding ${mat || sup}`;
    }

    setSupplierName(sup);
    setMaterialName(mat);
    setMessage(msg);
    setTitle(tit);
    if (defaultTo) setTo(defaultTo);

    // 1. Fetch user profile from /api/v1/person/myprofile and extract aribaUserName
    const fetchUserProfile = async () => {
      try {
        const profile: any = await getMyProfile();
        if (profile) {
          const aribaUser = profile.aribaUserName || profile.ariba_user_name || profile.aribaUsername || profile.email || profile.name || '';
          if (aribaUser) {
            setFrom(aribaUser);
          }
        }
      } catch (err) {
        console.warn("Could not fetch user profile for query modal", err);
      }
    };

    // 2. Fetch lookup requesters from /parent/spend_analysis/api/v1/lookupRequesters
    const fetchRequestersList = async (targetSup?: string, targetMat?: string) => {
      setRequestersLoading(true);
      try {
        const s = targetSup !== undefined ? targetSup : sup;
        const m = targetMat !== undefined ? targetMat : mat;
        const payload: any = {};
        if (s && s.trim()) payload.supplier_name = s.trim();
        if (m && m.trim()) payload.material_name = m.trim();
        if (fDate && fDate.trim()) payload.from_date = fDate.trim();
        if (tDate && tDate.trim()) payload.to_date = tDate.trim();

        const res = await fetchLookupRequesters(payload);
        if (res && (res.status === 'success' || res.status === 200) && Array.isArray(res.data)) {
          const items = res.data.map((r: any) => {
            if (typeof r === 'string') return { label: r, value: r };
            if (r && typeof r === 'object') {
              const val = r.ariba_user_name || r.aribaUserName || r.requester || r.email || r.user_name || r.name || r.value || '';
              const lbl = r.name && r.name !== val ? `${r.name} (${val})` : (r.label || val);
              return { label: lbl, value: val };
            }
            return null;
          }).filter(Boolean);

          setRequestersOptions(items);
          if (items.length > 0) {
            setTo(items[0].value);
          } else {
            setRequestersOptions([]);
          }
        } else {
          setRequestersOptions([]);
        }
      } catch (err) {
        console.warn("Failed to fetch lookup requesters for query modal", err);
        setRequestersOptions([]);
      } finally {
        setRequestersLoading(false);
      }
    };

    fetchUserProfile();
    fetchRequestersList();
  }, [isOpen, defaultSupplierName, defaultMaterialName, defaultFromDate, defaultToDate, defaultTitle, defaultTo, defaultMessage]);

  const handleCloseModal = () => {
    setTitle('');
    setSupplierName('');
    setMaterialName('');
    setMessage('');
    onClose();
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.warn('Please enter a query title');
      return;
    }
    if (!message.trim()) {
      toast.warn('Please enter a query message');
      return;
    }

    setLoading(true);
    try {
      const res = await raiseTicket({
        type: 'PROCUREMENT_PERFORMANCE',
        from: from.trim(),
        to: to.trim(),
        title: title.trim(),
        message: message.trim(),
        supplier_name: supplierName.trim(),
        material_name: materialName.trim()
      });

      if (res && (res.status === 'success' || res.status === 200 || res.message?.includes('success'))) {
        const ticketId = res.data?.message_id ? `#${res.data.message_id}` : '';
        toast.success(`Query submitted successfully! ${ticketId}`);
        handleCloseModal();
      } else {
        toast.error(res?.message || 'Failed to submit query. Please try again.');
      }
    } catch (err: any) {
      console.error('Error raising query ticket:', err);
      toast.error(err?.response?.data?.message || 'Error submitting query ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        padding: '1rem'
      }}
      onClick={handleCloseModal}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '600px',
          backgroundColor: '#ffffff',
          borderRadius: '0.75rem',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div style={{ backgroundColor: '#1e293b', color: '#38bdf8', width: '40px', height: '40px', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HelpCircle width={22} height={22} />
            </div>
            <div>
              <h3 style={{ color: '#ffffff', fontSize: '1.0625rem', fontWeight: 700, margin: 0, lineHeight: 1.3 }}>
                Raise a Query / Ticket
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.8125rem', margin: 0, marginTop: '0.125rem' }}>
                Submit questions or procurement issues directly to support
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={handleCloseModal} 
            title="Close Modal"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '0.375rem',
              border: 'none',
              backgroundColor: 'transparent',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#1e293b';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#94a3b8';
            }}
          >
            <X width={18} height={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b' }}>
                From (Logged-in User):
              </label>
              <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#2563eb', backgroundColor: '#eff6ff', padding: '0.1rem 0.375rem', borderRadius: '0.25rem' }}>
                Auto-detected
              </span>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                placeholder="Fetching logged-in user email..."
                required
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem 0.625rem 2.125rem',
                  fontSize: '0.875rem',
                  color: '#0f172a',
                  backgroundColor: '#f8fafc',
                  borderRadius: '0.5rem',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#2563eb';
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.12)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <User width={14} height={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.375rem' }}>
              To (Send Query To):
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <select
                value={to}
                onChange={(e) => setTo(e.target.value)}
                disabled={requestersLoading}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  fontSize: '0.875rem',
                  color: '#0f172a',
                  backgroundColor: '#ffffff',
                  borderRadius: '0.5rem',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  boxSizing: 'border-box',
                  cursor: 'pointer'
                }}
              >
                {requestersLoading ? (
                  <option value="">Loading requesters from backend...</option>
                ) : requestersOptions.length > 0 ? (
                  requestersOptions.map((opt, idx) => (
                    <option key={idx} value={opt.value}>
                      {opt.label}
                    </option>
                  ))
                ) : (
                  <option value="">No requesters found</option>
                )}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.375rem' }}>
              Query Title / Subject:
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Price Variance Inquiry on Material #10056"
              required
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                fontSize: '0.875rem',
                color: '#0f172a',
                backgroundColor: '#f8fafc',
                borderRadius: '0.5rem',
                border: '1px solid #cbd5e1',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#2563eb';
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.12)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.backgroundColor = '#f8fafc';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.375rem' }}>
                Supplier Name:
              </label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="e.g. Acme Corporation"
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  fontSize: '0.875rem',
                  color: '#0f172a',
                  backgroundColor: '#f8fafc',
                  borderRadius: '0.5rem',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#2563eb';
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.12)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.375rem' }}>
                Material Name:
              </label>
              <input
                type="text"
                value={materialName}
                onChange={(e) => setMaterialName(e.target.value)}
                placeholder="e.g. Steel Pipe 50mm"
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  fontSize: '0.875rem',
                  color: '#0f172a',
                  backgroundColor: '#f8fafc',
                  borderRadius: '0.5rem',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#2563eb';
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.12)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.375rem' }}>
              Message / Issue Description:
            </label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your query or issue in detail..."
              required
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                fontSize: '0.875rem',
                color: '#0f172a',
                backgroundColor: '#f8fafc',
                borderRadius: '0.5rem',
                border: '1px solid #cbd5e1',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#2563eb';
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.12)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.backgroundColor = '#f8fafc';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
            <button
              type="button"
              onClick={handleCloseModal}
              disabled={loading}
              style={{
                padding: '0.625rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                borderRadius: '0.5rem',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.625rem 1.5rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                borderRadius: '0.5rem',
                border: 'none',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.25)',
                transition: 'background-color 0.15s ease, transform 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#1d4ed8';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#2563eb';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {loading ? (
                <>
                  <SpinnerLoaders size="small" text="" fullScreen={false} />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send width={15} height={15} />
                  <span>Submit Query</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});
