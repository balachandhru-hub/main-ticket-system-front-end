import React, { useState } from "react";
import "./SimplyPR.css";
import { RiPrinterFill } from "react-icons/ri";
import AddToCart from "./AddToCart";
 
const SimplyPr: React.FC = () => {
  const [showAddToCart, setShowAddToCart] = useState(false);
  const [amount, setAmount] = useState("0.00 AED"); // editable amount
 
  const handleAddToCart = () => {
    setShowAddToCart(true);
  };
 
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value);
  };
 
  if (showAddToCart) {
    return <AddToCart />;
  }
 
  return (
    <div className="simplypr-container">
      {/* Header */}
      <header className="simplypr-header-bar">
        <h3 className="simplypr-title">Create Non-Catalog Item</h3>
        <div className="simplypr-footer-buttons">
          <button className="simplypr-btn-outline">
            <RiPrinterFill className="simplypr-icon" /> Print
          </button>
          <button className="simplypr-btn-primary" onClick={handleAddToCart}>
            Add to Cart
          </button>
          <button className="simplypr-btn-cancel">Cancel</button>
        </div>
      </header>
 
      <div className="simplypr-border-line bottom"></div>
 
      {/* Stepper */}
      <div className="simplypr-stepper">
        <div className="simplypr-step active">
          <span className="simplypr-step-number"></span>
          <span>Header</span>
        </div>
        <div className="simplypr-step-line"></div>
        <div className="simplypr-step">
          <span className="simplypr-step-number"></span>
          <span>Line Items</span>
        </div>
        <div className="simplypr-step-line"></div>
        <div className="simplypr-step">
          <span className="simplypr-step-number"></span>
          <span>Supplier Information</span>
        </div>
      </div>
 
      {/* Header Section */}
      <div className="simplypr-section-view">
        <button className="simplypr-section-title">Header</button>
 
        <div className="simplypr-header-box">
          <table className="simplypr-table">
            <thead>
              <tr>
                <th>Purchase Organization</th>
                <th>Description</th>
                <th>Commodity Code</th>
                <th>Material Group</th>
                <th>Material Code</th>
                <th>Amount</th>
              </tr>
            </thead>
 
            <tbody>
              <tr>
                <td>
                  <select>
                    <option>Select purchase org</option>
                  </select>
                </td>
                <td>
                  <input type="text" placeholder="Enter Description..." />
                </td>
                <td>
                  <select>
                    <option>(no value)</option>
                  </select>
                </td>
                <td>
                  <select>
                    <option>(no value)</option>
                  </select>
                </td>
                <td>
                  <input type="text" placeholder="Enter material code..." />
                </td>
                <td>
                  {/* Editable amount input */}
                  <input
                    type="text"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="Enter amount..."
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
 
      {/* Line Items Section */}
      <div className="simplypr-section-view">
        <button className="simplypr-section-title">Line Items</button>
 
        <div className="simplypr-header-box">
          <table className="simplypr-table">
            <thead>
              <tr>
                <th>Account Type</th>
                <th>Item Category</th>
                <th>Quantity</th>
                <th>Unit of Measure</th>
                <th>Price</th>
                <th>Currency</th>
                <th>Contract Workspace ID</th>
                <th>Action</th>
              </tr>
            </thead>
 
            <tbody>
              <tr>
                <td>
                  <select>
                    <option>(no value)</option>
                  </select>
                </td>
                <td>
                  <select>
                    <option>(no value)</option>
                  </select>
                </td>
                <td>
                  <input type="number" placeholder="Enter Qty..." />
                </td>
                <td>
                  <select>
                    <option>Each</option>
                  </select>
                </td>
                <td>
                  <input type="text" placeholder="Enter price..." />
                </td>
                <td>
                  <select>
                    <option>AED</option>
                  </select>
                </td>
                <td>
                  <input type="text" placeholder="Enter..." />
                </td>
                <td>
                  <button className="simplypr-update-btn">Update Amount</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
 
      {/* Supplier Info Section */}
      <div className="simplypr-section-view">
        <button className="simplypr-section-title">Supplier Information</button>
 
        <div className="simplypr-header-box">
          <table className="simplypr-table">
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Contact</th>
                <th>Supplier Part Number</th>
                <th>Supplier Part Auxiliary ID</th>
              </tr>
            </thead>
 
            <tbody>
              <tr>
                <td>
                  <select>
                    <option>Select vendor</option>
                  </select>
                </td>
                <td>
                  <input type="text" placeholder="Enter contact..." />
                </td>
                <td>
                  <input type="text" placeholder="Enter supplier part no..." />
                </td>
                <td>
                  <input
                    type="text"
                    placeholder="Enter supplier part auxiliary..."
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
 
      {/* Bottom Buttons */}
      <div className="simplypr-footer-buttons-bottom">
        <button className="simplypr-btn-primary" onClick={handleAddToCart}>
          Add to Cart
        </button>
        <button className="simplypr-btn-cancel">Cancel</button>
      </div>
    </div>
  );
};
 
export default SimplyPr;
 
 