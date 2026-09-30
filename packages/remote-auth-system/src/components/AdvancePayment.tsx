import React from 'react';

const AdvancePayment: React.FC = () => {
  return (
    <div style={{ width: '100%', height: '100vh', border: 'none' }}>
      <iframe
        src={import.meta.env.VITE_RAP_URL}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          overflow: 'hidden'
        }}
        title="Advance Payment System"
        allowFullScreen
      />
    </div>
  );
};

export default AdvancePayment;