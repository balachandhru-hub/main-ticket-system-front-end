// src/components/TermsAndCondition.tsx

import React from 'react';
import './TermsAndCondition.css';

interface TermsAndConditionProps {
  setAgreedToTerms: (agreed: boolean) => void;
  onClose: () => void;
}

const TermsAndCondition: React.FC<TermsAndConditionProps> = ({ onClose, setAgreedToTerms }) => {
  const handleAccept = () => {
     setAgreedToTerms(true);
    onClose();
  };

  return (
    <div className="terms-container">
      <div className="terms-header">
        <h2>Non-Disclosure Agreement (NDA)</h2>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="terms-body">
        <ol className="terms-list">
          <li>
            <strong>1. Confidential Information</strong>
            <p>
              The Receiving Party agrees not to disclose any confidential or proprietary information shared by the Disclosing Party. This includes but is not limited to: business strategies, financial information, customer lists, product designs, source code, marketing strategies, or any related materials.
            </p>
          </li>

          <li>
            <strong>2. Purpose of Disclosure</strong>
            <p>
              The confidential information shall only be used for the purpose of evaluating a potential business relationship or engagement with the Disclosing Party.
            </p>
          </li>

          <li>
            <strong>3. Obligation of Confidentiality</strong>
            <p>The Receiving Party shall:</p>
            <ul>
              <li>Not disclose confidential information to any third party.</li>
              <li>
                Use reasonable efforts to protect such information, not less than the degree of care used to protect its own information.
              </li>
              <li>Use the confidential information only for the purposes set out in this agreement.</li>
            </ul>
          </li>

          <li>
            <strong>4. Duration</strong>
            <p>
              This NDA remains in effect for a period of 2 year(s) from the effective date or until such time as the information no longer qualifies as confidential.
            </p>
          </li>

          <li>
            <strong>5. Return or Destruction of Information</strong>
            <p>
              This NDA remains in effect for a period of 2 year(s) from the effective date or until such time as the information no longer qualifies as confidential.
            </p>
          </li>

          <li>
            <strong>6. Governing Law</strong>
            <p>
              This agreement shall be governed and construed in accordance with the laws of Global Countries.
            </p>
          </li>
        </ol>
      </div>

      <div className="terms-footer">
        <button className="accept-btn" onClick={handleAccept}>
          Accept Agreement
        </button>
      </div>
    </div>
  );
};

export default TermsAndCondition;
