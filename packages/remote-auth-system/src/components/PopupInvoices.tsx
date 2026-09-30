import React, { useState } from 'react';
import './PopupInvoices.css';
import { IoCloseOutline } from 'react-icons/io5';
import { FiSearch } from 'react-icons/fi';
import { AiOutlineEye, AiOutlineDownload } from 'react-icons/ai';

interface Props {
  onClose: () => void;
}

interface Invoice {
  company: string;
  number: string;
  date: string;
  email: string;
  amount: string;
  status: string;
  ReferenceNum: string;
  PaymentStat: string;

}

const dummyData: Invoice[] = [
  { company: 'ABC Organization', number: 'INV-2025-007', date: '01.07.2025', email: 'companya@gmail.com', amount: '$2000', status: 'Active', ReferenceNum:'PAY-UPI-2025-001235', PaymentStat: 'Unpaid' },
  { company: 'ABC Organization', number: 'INV-2025-006', date: '01.06.2025', email: 'companya@gmail.com', amount: '$2050', status: 'Paid', ReferenceNum:'PAY-UPI-2025-001235', PaymentStat: 'Paid' },
  { company: 'ABC Organization', number: 'INV-2025-005', date: '01.06.2025', email: 'companya@gmail.com', amount: '$4000', status: 'Paid',ReferenceNum:'PAY-UPI-2025-001235', PaymentStat: 'Paid' },
];

const PopupInvoices: React.FC<Props> = ({ onClose }) => {
  const [search, setSearch] = useState('');

  const filtered = dummyData.filter(
    (item) =>
      item.number.toLowerCase().includes(search.toLowerCase()) ||
      item.status.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="popup-overlay">
      <div className="popup-box">
        <div className="popup-header">
          <h3>INVOICE</h3>
          <button onClick={onClose} className="close-icon">
            <IoCloseOutline size={20} />
          </button>
        </div>

        <div className="popup-search-container">
          <div className="popup-search-box">
            <input
              className="popup-search"
              placeholder="Search by invoice no or status"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="popup-search-btn"><FiSearch size={16} /></button>
          </div>
        </div>

        <div className="popup-table-container">
          <table className="customer-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Company name</th>
                <th>Invoice no</th>
                <th>Date</th>
                <th>Email</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Reference Number</th>
                <th>Payment Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{inv.company}</td>
                  <td>{inv.number}</td>
                  <td>{inv.date}</td>
                  <td>{inv.email}</td>
                  <td>{inv.amount}</td>
                  <td className={`status ${inv.status.toLowerCase()}`}>{inv.status}</td>
                  <td>{inv.ReferenceNum}</td>
                  <td>
                    {inv.PaymentStat.toLowerCase() === 'paid' ? (
                      <span className="payment-status paid">{inv.PaymentStat}</span>
                    ) : (
                      <select className="unpaid-dropdown payment-status unpaid" value={inv.PaymentStat}>
                        <option value="Unpaid">Unpaid</option>
                        <option value="Processing">Processing</option>
                        <option value="Paid">Paid</option>
                      </select>
                    )}
                  </td>
                  <td className="popup-icons">
                    <div className="view-btn" title="View">
                      <AiOutlineEye />
                    </div>
                    <div className="dld-btn" title="Download">
                      <AiOutlineDownload />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PopupInvoices;
