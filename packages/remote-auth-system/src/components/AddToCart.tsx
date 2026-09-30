import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./AddToCart.css";
import { MdLocalPrintshop, MdOutlineAttachment } from "react-icons/md";
import { IoCartOutline } from "react-icons/io5";
import BackButton from "./BackButton";

const AddToCart: React.FC = () => {
  const [actionValue, setActionValue] = useState("");
  const [selectedLines, setSelectedLines] = useState<number[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handlePurchaseRequisitionForm = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;

    if (selectedValue === "edit") {
      if (selectedLines.length === 0) {
        alert("Please select at least one line item to edit.");
        setActionValue("");
        return;
      }

      // Navigate to form with selected line IDs
      navigate("/purchase-requisition-form", {
        state: { selectedLineIds: selectedLines },
      });

      // Reset dropdown
      setActionValue("");
    }
  };

  return (
    <div className="atc-pr-page">
      <BackButton />

      <header className="atc-pr-header">
        <span className="atc-pr-number">PR22208</span>
        <div className="atc-pr-actions">
          <button className="atc-print-btn">
            <MdLocalPrintshop className="atc-print-icon" />
            Print
          </button>
          <button className="atc-continuee-btn">Continue Shopping</button>
          <button className="atc-sourcingg-btn">Create Sourcing Request</button>
          <button className="atc-deletee-btn">Delete</button>
          <button className="atc-savee-btn">Save</button>
          <button className="atc-submittt-btn">Submit</button>
        </div>
      </header>

      <div className="atc-divider atc-bottom"></div>

      <div className="atc-tabb-label">Summary</div>

      <section className="atc-pr-section">
        <div className="atc-form-gridd">
          <div className="atc-form-col">
            <div className="atc-form-group">
              <label>Title</label>
              <input type="text" placeholder="Enter title" />
            </div>
            <div className="atc-form-group">
              <label>On Behalf Of</label>
              <select defaultValue="Test_Bala">
                <option>Test_Bala</option>
              </select>
            </div>
            <div className="atc-form-group">
              <label>Department</label>
              <input type="text" placeholder="Culinary" />
            </div>
            <div className="atc-form-group">
              <label>Delivery To</label>
              <input type="text" placeholder="Test_Bala" />
            </div>
            <div className="atc-form-group">
              <label>My Labels</label>
              <select defaultValue="">
                <option value="" disabled>Apply Labels...</option>
              </select>
            </div>
          </div>

          <div className="atc-form-col">
            <div className="atc-form-group">
              <label>Purchasing Unit</label>
              <input type="text" value="Purchasing" disabled />
            </div>
            <div className="atc-form-group">
              <label>Company Code</label>
              <select defaultValue="3000">
                <option>3000 (6 Atlantis AG CH)</option>
              </select>
            </div>
            <div className="atc-form-group">
              <label>Comments</label>
              <textarea className="atc-comments-textarea" placeholder="Enter comments..." rows={4} />
            </div>
            <div className="atc-form-group">
              <label>Need-by Date</label>
              <input type="date" />
            </div>
          </div>
        </div>
      </section>

      <div className="atc-attachments-inline">
        <span className="atc-attachments-label">Attachments:</span>
        <button className="atc-btn-link" onClick={() => fileInputRef.current?.click()}>
          <MdOutlineAttachment /> Add Attachment
        </button>
        <input type="file" ref={fileInputRef} style={{ display: "none" }} />
      </div>

      <div className="atc-tabb-label">Line items</div>

      <section className="atc-pr-section atc-line-items">
        <div className="atc-section-header-btn">
          <button className="atc-btn-action">Copy Selected Line Items</button>
          <button className="atc-btn-action">Upload Bulk</button>
        </div>

        <div className="atc-lineitem-card">
          <div className="atc-table-scroll-wrapper">
            <table className="atc-pr-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      className="atc-table-checkbox"
                      checked={selectedLines.includes(1)}
                      onChange={(e) => {
                        const lineId = 1;
                        if (e.target.checked) {
                          setSelectedLines((prev) => [...prev, lineId]);
                        } else {
                          setSelectedLines((prev) => prev.filter((id) => id !== lineId));
                        }
                        setIsOpen(e.target.checked);
                      }}
                    />
                  </th>
                  <th>No</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Price</th>
                  <th>Discount</th>
                  <th>Net Amount</th>
                  <th>Charges</th>
                  <th>Taxes</th>
                  <th>Amount</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr className={isOpen ? "atc-selected-row" : ""}>
                  <td>
                    <input
                      type="checkbox"
                      className="atc-table-checkbox"
                      checked={isOpen}
                      onChange={(e) => setIsOpen(e.target.checked)}
                    />
                  </td>
                  <td>1</td>
                  <td className="atc-type-icon"><IoCartOutline /></td>
                  <td><input type="text" value="TEST" className="atc-inline-input" readOnly /></td>
                  <td><input type="text" value="100" className="atc-inline-input atc-qty" readOnly /></td>
                  <td>Each</td>
                  <td className="atc-price-cell">
                    <input type="text" value="100.00" className="atc-inline-input atc-price" readOnly />
                    <select className="atc-currency-select" disabled><option>AED</option></select>
                  </td>
                  <td><input type="text" placeholder="" className="atc-inline-input" readOnly /></td>
                  <td>10,000.00 AED</td>
                  <td></td>
                  <td></td>
                  <td>10,000.00 AED</td>
                  <td className="atc-action-cell">
                    <button
                      className="atc-arrow-btn"
                      onClick={() => setIsOpen((v) => !v)}
                      aria-label="Toggle accounting"
                    >
                      <svg
                        className={`atc-arrow-icon ${isOpen ? "open" : ""}`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>

                    <button
                      className="atc-edit-icon-btn"
                      title="Edit"
                      onClick={() =>
                        navigate("/purchase-requisition-form", {
                          state: { selectedLineIds: [1] },
                        })
                      }
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>

            <div className={`atc-accounting-wrapper ${isOpen ? "open" : ""}`}>
              <table className="atc-accounting-table">
                <thead>
                  <tr>
                    <th>Commodity Code</th>
                    <th>Material Group</th>
                    <th>Material Code</th>
                    <th>Account Assignment</th>
                    <th>GL Account</th>
                    <th>Cost Center</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Beverage</td>
                    <td>02 (Beverage)</td>
                    <td>100030</td>
                    <td>K (Cost Center)</td>
                    <td>6220000134 (Electrical & Mechanical)</td>
                    <td>F&B - Soul St Zur S&M Sales</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <div className="atc-table-footer">
        <select
          className="atc-footer-btn atc-dropdown-btn"
          value={actionValue}
          onChange={(e) => {
            setActionValue(e.target.value);
            handlePurchaseRequisitionForm(e);
          }}
        >
          <option value="" disabled>Actions</option>
          <option value="edit">Edit Selected Line items</option>
        </select>

        <select className="atc-footer-btn atc-dropdown-btn">
          <option>More</option>
        </select>
        <button className="atc-footer-btn">Import Accounting</button>
        <button className="atc-footer-btn">Update Total</button>
      </div>

      <footer className="atc-pr-footer">
        <button className="atc-btn-outline">Continue Shopping</button>
        <button className="atc-btn-outline">Create Sourcing Request</button>
        <button className="atc-btn-outline">Delete</button>
        <button className="atc-btn-outline">Save</button>
        <button className="atc-btn-submit">Submit</button>
      </footer>
    </div>
  );
};

export default AddToCart;