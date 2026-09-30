//import React from 'react';

const data = [
  {
    company: 'Company A',
    invoiceNo: 'INV-2025-007',
    startDate: '01.07.2025',
    endDate: '01.07.2025',
    tickets: 5,
    amount: '$2000',
    status: 'Invoice Not Generated',
    approval: 'Approve'
  },
  {
    company: 'Company A',
    invoiceNo: 'INV-2025-006',
    startDate: '01.06.2025',
    endDate: '01.06.2025',
    tickets: 6,
    amount: '$2050',
    status: 'Unpaid',
    approval: 'Approved'
  },
];

const InvoiceTable = () => {
  return (
    <table className="invoice-table">
      <thead>
        <tr>
          <th>S.No</th>
          <th>Company name</th>
          <th>Invoice no</th>
          <th>Start Date</th>
          <th>End Date</th>
          <th>No. of tickets</th>
          <th>Amount</th>
          <th>Payment Status</th>
          <th>Approval</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item, i) => (
          <tr key={i}>
            <td>{i + 1}</td>
            <td>{item.company}</td>
            <td>{item.invoiceNo}</td>
            <td>{item.startDate}</td>
            <td>{item.endDate}</td>
            <td>{item.tickets}</td>
            <td>{item.amount}</td>
            <td className={item.status.toLowerCase().includes('paid') ? 'paid' : 'unpaid'}>
              {item.status}
            </td>
            <td>
              <span className="approval">{item.approval}</span>
            </td>
            <td>
              <button>👁️</button>
              <button>⬇️</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default InvoiceTable;
