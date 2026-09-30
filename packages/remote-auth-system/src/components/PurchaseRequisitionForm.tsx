import React from "react";
import { useLocation } from "react-router-dom";
import "./PurchaseRequisitionForm.css";
import { RiPrinterFill } from "react-icons/ri";
import BackButton from "./BackButton";

interface LineItemData {
  description: string;
  qty: number;
  price: number;
  unit: string;
  materialCode: string;
  materialGroup: string;
  glAccount: string;
  costCenter: string;
  deliverTo: string;
}

const PurchaseRequisitionForm: React.FC = () => {
  const location = useLocation();
  const { selectedLineIds } = (location.state as { selectedLineIds: number[] }) || { selectedLineIds: [] };

  // Mock data - in real app, fetch from API or context
  const lineItemData: Record<number, LineItemData> = {
    1: {
      description: "TEST",
      qty: 100,
      price: 100.0,
      unit: "Each",
      materialCode: "100000030",
      materialGroup: "Purchasing",
      glAccount: "622252216486 (Electrical & Mechanical)",
      costCenter: "F&B - Soul St Zur S&M Sales",
      deliverTo: "Test.Bala",
    },
  };

  const lineId = selectedLineIds[0]; // Edit first selected line
  const data = lineId ? lineItemData[lineId] : null;

  return (
    <div className="purchase-pr-page">
      <BackButton />
      <header className="purchase-pr-header">
        <span className="purchase-pr-number">PR22208</span>
        <div className="purchase-pr-actions">
          <button className="purchase-print-btn">
            <RiPrinterFill className="purchase-print-icon" />
            Print
          </button>
          <button className="purchase-ok-btn">Ok</button>
          <button className="purchase-cancel-btnn">Cancel</button>
        </div>
      </header>

      <div className="purchase-border-line purchase-bottom"></div>
      <div className="purchase-line-no">NO {lineId || "—"}</div>

      <div className="purchase-pr-main">
        <section className="purchase-form-section">
          <div className="purchase-form-row">
            <div className="purchase-form-field">
              <label>Company Code</label>
              <select defaultValue="3000">
                <option>3000 (5 Atlantis AG (CH))</option>
              </select>
            </div>
            <div className="purchase-form-field">
              <label>Material Group</label>
              <input type="text" defaultValue={data?.materialGroup || "Purchasing"} readOnly />
            </div>
          </div>

          <div className="purchase-form-row">
            <div className="purchase-form-field">
              <label>Purchase Organization</label>
              <select defaultValue="100000000000">
                <option>100000000000 (ABC LTD)</option>
              </select>
            </div>
            <div className="purchase-form-field">
              <label>Material Code</label>
              <input type="text" defaultValue={data?.materialCode || "100000030"} />
            </div>
          </div>

          <div className="purchase-form-row">
            <div className="purchase-form-field">
              <label>GL Account</label>
              <select defaultValue={data?.glAccount.split(" ")[0] || "622252216486"}>
                <option>{data?.glAccount || "622252216486 (Electrical & Mechanical)"}</option>
              </select>
            </div>
            <div className="purchase-form-field">
              <label>Account Assignment</label>
              <select defaultValue="K">
                <option>K (Cost center)</option>
              </select>
            </div>
          </div>

          <div className="purchase-form-row">
            <div className="purchase-form-field">
              <label>Ship to (Plant)</label>
              <select defaultValue="3000">
                <option>3000 (5 Atlantis AG (CH))</option>
              </select>
            </div>
            <div className="purchase-form-field">
              <label>Cost Center</label>
              <select defaultValue={data?.costCenter || "F&B - Soul St Zur S&M Sales"}>
                <option>{data?.costCenter || "F&B - Soul St Zur S&M Sales"}</option>
              </select>
            </div>
          </div>

          <div className="purchase-form-row">
            <div className="purchase-form-field">
              <label>Needed by Date</label>
              <div className="purchase-date-wrapper">
                <input type="date" />
              </div>
            </div>
            <div className="purchase-form-field">
              <label>Deliver To</label>
              <input type="text" defaultValue={data?.deliverTo || "Test.Bala"} />
            </div>
          </div>

          <div className="purchase-form-row">
            <div className="purchase-form-field">
              <label>Purchase Group</label>
              <select defaultValue="001">
                <option>001 (Group 001)</option>
              </select>
            </div>
            <div className="purchase-form-field">
              <label>Purchase Group</label>
              <select defaultValue="001">
                <option>001 (Group 001)</option>
              </select>
            </div>
          </div>

          <div className="purchase-item-details">
            <div className="purchase-form-row purchase-full-width">
              <div className="purchase-form-field">
                <label>Full Description</label>
                <textarea rows={1} defaultValue={data?.description || "TEST"} />
              </div>

              <div className="purchase-right-column">
                <div className="purchase-form-field">
                  <label>Supplier Part Number</label>
                  <input type="text" />
                </div>
                <div className="purchase-form-field">
                  <label>Supplier Part Auxiliary ID</label>
                  <input type="text" />
                </div>
              </div>
            </div>

            <div className="purchase-form-row">
              <div className="purchase-form-field">
                <label>Quantity</label>
                <input type="number" defaultValue={data?.qty || 100} />
              </div>
              <div className="purchase-form-field">
                <label>Price</label>
                <div className="purchase-price-input">
                  <input type="number" defaultValue={data?.price || 100.0} step="0.01" />
                  <select defaultValue="AED"><option>AED</option></select>
                </div>
              </div>
            </div>

            <div className="purchase-form-row">
              <div className="purchase-form-field">
                <label>UOM</label>
                <select defaultValue={data?.unit || "Each"}><option>{data?.unit || "Each"}</option></select>
              </div>
              <div className="purchase-form-field">
                <label>Discount</label>
                <input type="text" placeholder="AED" />
              </div>
            </div>

            <div className="purchase-form-row">
              <div className="purchase-form-field">
                <label>Net Amount</label>
                <div className="purchase-amount-display">
                  {data ? (data.qty * data.price).toFixed(2) : "10,000.00"}
                </div>
              </div>
              <div className="purchase-form-field">
                <label>Charges</label>
                <input type="text" />
              </div>
            </div>

            <div className="purchase-form-row">
              <div className="purchase-form-field">
                <label>Taxes</label>
                <input type="text" />
              </div>
              <div className="purchase-form-field">
                <label>Amount</label>
                <div className="purchase-amount-display">
                  {data ? (data.qty * data.price).toFixed(2) : "10,000.00"}
                </div>
              </div>
            </div>
          </div>

          {/* Additional Fields */}
          <div className="purchase-additional-fields">
            {/* ... (rest of your fields unchanged) */}
            <div className="purchase-form-row">
              <div className="purchase-form-field">
                <label>Item Category</label>
                <select defaultValue="Material"><option>Material</option></select>
              </div>
              <div className="purchase-form-field">
                <label>Vendor</label>
                <select defaultValue="100000000000">
                  <option>100000000000 (ABC LTD)</option>
                </select>
              </div>
            </div>

            {/* ... rest unchanged ... */}
            <div className="purchase-form-actions-bottom">
              <button className="purchase-split-accounting-btn">Split Accounting</button>
            </div>
          </div>
        </section>

        <div className="purchase-final-actions">
          <button className="purchase-ok-btn">Ok</button>
          <button className="purchase-cancel-btnn">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default PurchaseRequisitionForm;