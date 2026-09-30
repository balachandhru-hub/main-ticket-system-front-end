import { useState } from 'react';
import { FaPlus, FaTimes } from 'react-icons/fa';
import './UserCredentialsForm.css';

import { toast } from 'react-toastify';

interface Props {
  updateField: (field: string, value: any) => void;
}

const RequesterSetting = ({ updateField }: Props) => {
    const [reqNameInput, setReqNameInput] = useState("");
    const [deptInput, setDeptInput] = useState("");
    const [requesterNames, setRequesterNames] = useState<{name: string, department: string}[]>([]);

    const handleAdd = () => {
        const name = reqNameInput.trim();
        const department = deptInput.trim();

        if (name && department) {
            const newList = [...requesterNames, { name, department }];
            setRequesterNames(newList);
            updateField('requesterNames', newList);
            setReqNameInput("");
            setDeptInput("");
        } else {
            toast.error('Please enter both Requester Name and Department');
        }
    };

    const handleRemove = (index: number) => {
        const newList = requesterNames.filter((_, i) => i !== index);
        setRequesterNames(newList);
        updateField('requesterNames', newList);
    };

    return (
        <div className="bd-section">
            <h3 className="bd-section-title">Requester Details</h3>
            <div className="bd-form-group-grid">
                <div className="bd-field" style={{ gridColumn: '1 / -1' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1, display: 'flex', gap: '8px' }}>
                            <div style={{ flex: 1 }}>
                                <label>Requester Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Sabitha"
                                    value={reqNameInput}
                                    onChange={(e) => setReqNameInput(e.target.value)}
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label>Department</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Finance"
                                    value={deptInput}
                                    onChange={(e) => setDeptInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAdd();
                                        }
                                    }}
                                    style={{ width: '100%' }}
                                />
                            </div>
                        </div>
                        <button 
                            type="button" 
                            onClick={handleAdd}
                            style={{
                                padding: '0.6rem',
                                backgroundColor: '#2563EB',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.375rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: 'fit-content',
                                marginBottom: '2px'
                            }}
                        >
                            <FaPlus />
                        </button>
                    </div>
                </div>

                {/* List display */}
                {requesterNames.length > 0 && (
                    <div className="bd-field" style={{ gridColumn: '1 / -1' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                            {requesterNames.map((req, idx) => (
                                <div 
                                    key={idx} 
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        backgroundColor: '#e2e8f0',
                                        padding: '4px 12px',
                                        borderRadius: '16px',
                                        fontSize: '0.85rem',
                                        gap: '6px'
                                    }}
                                >
                                    <span>{req.name} - {req.department}</span>
                                    <FaTimes 
                                        size={10}
                                        style={{ cursor: 'pointer', color: '#64748b' }} 
                                        onClick={() => handleRemove(idx)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RequesterSetting;