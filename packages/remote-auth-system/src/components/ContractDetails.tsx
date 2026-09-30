import React from 'react';
import {  useLocation, useParams } from 'react-router-dom';
import BackButton from './BackButton';
import './Contract.css';

interface Commodity {
  uniqueName: string;
  name: string;
  contractDomain: string;
}

interface Region {
  uniqueName: string;
  name: string;
}

interface Department {
  uniqueName: string;
  name: string;
}

interface ContractDetailData {
  id: string;
  name: string;
  hierarchicalType: string;
  termType: string;
  commodities: Commodity[];
  regions: Region[];
  departments: Department[];
  supplier: string;
  contractId: string;
  cOntractStatus: string;
  contractValue: number;
  startDate: string;
  endDate: string;
  currency: string;
  testProject: boolean;
}

const formatDate = (dateString: string): string => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const ContractDetails: React.FC = () => {
useParams<{ id: string }>();
  
  const location = useLocation();
  const contractData = location.state?.contractData as ContractDetailData;

  if (!contractData) {
    return (
      <div className="minimal-details-page">
        <div style={{ marginBottom: '20px' }}>
          <BackButton />
        </div>
        <p className="minimal-value" style={{ color: 'red', marginTop: '40px' }}>
          Contract not found.
        </p>
      </div>
    );
  }

  const commodityNames = contractData.commodities?.map((c) => c.name).join(', ') || '—';
  const regionNames = contractData.regions?.map((r) => r.name).join(', ') || '—';
  const departmentNames = contractData.departments?.map((d) => d.name).join(', ') || '—';
  const formattedValue = `${contractData.contractValue?.toLocaleString()} ${contractData.currency}`;

  return (
    <div className="minimal-details-page">
      <div style={{ marginBottom: '20px' }}>
        <BackButton />
      </div>
      <h1 className="details-title-minimal">
        Contract Details – {contractData.name}
      </h1>
      <div className="minimal-grid">
        <div className="minimal-item">
          <label className="minimal-label">Contract ID</label>
          <span className="minimal-value">{contractData.contractId}</span>
        </div>
        <div className="minimal-item">
          <label className="minimal-label">Name</label>
          <span className="minimal-value">{contractData.name}</span>
        </div>
        <div className="minimal-item">
          <label className="minimal-label">Status</label>
          <span className="minimal-value">{contractData.cOntractStatus}</span>
        </div>
        <div className="minimal-item">
          <label className="minimal-label">Hierarchical Type</label>
          <span className="minimal-value">{contractData.hierarchicalType}</span>
        </div>
        <div className="minimal-item">
          <label className="minimal-label">Term Type</label>
          <span className="minimal-value">{contractData.termType}</span>
        </div>
        <div className="minimal-item">
          <label className="minimal-label">Commodity</label>
          <span className="minimal-value">{commodityNames}</span>
        </div>
        <div className="minimal-item">
          <label className="minimal-label">Region</label>
          <span className="minimal-value">{regionNames}</span>
        </div>
        <div className="minimal-item">
          <label className="minimal-label">Department</label>
          <span className="minimal-value">{departmentNames}</span>
        </div>
        <div className="minimal-item">
          <label className="minimal-label">Supplier</label>
          <span className="minimal-value">{contractData.supplier}</span>
        </div>
        <div className="minimal-item">
          <label className="minimal-label">Contract Value</label>
          <span className="minimal-value">{formattedValue}</span>
        </div>
        <div className="minimal-item">
          <label className="minimal-label">Effective Date</label>
          <span className="minimal-value">{formatDate(contractData.startDate)}</span>
        </div>
        <div className="minimal-item">
          <label className="minimal-label">Expiration Date</label>
          <span className="minimal-value">{formatDate(contractData.endDate)}</span>
        </div>
        <div className="minimal-item">
          <label className="minimal-label">Test Project</label>
          <span className="minimal-value">{contractData.testProject ? 'Yes' : 'No'}</span>
        </div>
      </div>
    </div>
  );
};

export default ContractDetails;