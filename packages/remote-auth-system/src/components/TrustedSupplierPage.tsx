
import React, { useState, useEffect } from "react";
import { Search, Plus } from "lucide-react";
import { FaTrash } from "react-icons/fa";
import BackButton from "./BackButton";
import { toast } from "react-toastify";
import {
  addTrustedSupplier,
  deleteTrustedSupplier,
  getTrustedSuppliers,
} from "../api/invoiceApi-table";
import "./TrustedSupplierPage.css";

interface TrustedSupplier {
  id: number;
  supplierName: string;
  supplierTRN: string;
}

const TrustedSupplierPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<TrustedSupplier[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreatePopup, setShowCreatePopup] = useState(false);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [, setSelectedSupplier] = useState<TrustedSupplier | null>(null);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [loadingFetch, setLoadingFetch] = useState(true);
  const [errorFetch, setErrorFetch] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    SupplierName: "",
    SupplierTRN: "",
  });

  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setLoadingFetch(true);
        setErrorFetch(null);
        const response = await getTrustedSuppliers();
        const mappedSuppliers: TrustedSupplier[] =
          response.trusted_suppliers.map((supplier, index) => ({
            id: index + 1,
            supplierName: supplier.SupplierName,
            supplierTRN: supplier.TRN,
          }));
        setSuppliers(mappedSuppliers);
      } catch (error: any) {
        setErrorFetch(error.message || "Failed to fetch trusted suppliers.");
        toast.error(error.message || "Failed to fetch trusted suppliers.");
      } finally {
        setLoadingFetch(false);
      }
    };
    fetchSuppliers();
  }, []);

  const filteredSuppliers = suppliers.filter(
    (supplier) =>
      supplier.supplierName
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      supplier.supplierTRN.includes(searchTerm)
  );

 
  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentSuppliers = filteredSuppliers.slice(
    indexOfFirstItem,
    indexOfLastItem
  );

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const handleCreateClick = () => {
    setFormData({ SupplierName: "", SupplierTRN: "" });
    setShowCreatePopup(true);
  };

  const handleEditClick = (supplier: TrustedSupplier) => {
    setSelectedSupplier(supplier);
    setFormData({
      SupplierName: supplier.supplierName,
      SupplierTRN: supplier.supplierTRN,
    });
    setShowEditPopup(true);
  };

  const handleAddTrustedSupplier = async () => {
    if (!formData.SupplierName.trim()) {
      toast.error("Please enter supplier name.");
      return;
    }

    if (!formData.SupplierTRN.trim()) {
      toast.error("Please enter supplier TRN number.");
      return;
    }

    if (formData.SupplierTRN.length !== 15) {
      toast.error("Supplier TRN must be exactly 15 digits.");
      return;
    }

    try {
      setLoadingSubmit(true);
      const result = await addTrustedSupplier({
        SupplierName: formData.SupplierName,
        SupplierTRN: formData.SupplierTRN,
      });

      const message = result?.message || `Supplier "${formData.SupplierName}" added successfully!`;
      const lowerMessage = message.toLowerCase();

      if (lowerMessage.includes("already present") || lowerMessage.includes("already exists")) {
        toast.error(message, {
          position: "top-right",
          autoClose: 3000,
        });
      } else {
        toast.success(message, {
          position: "top-right",
          autoClose: 3000,
        });

        const response = await getTrustedSuppliers();
        const mappedSuppliers: TrustedSupplier[] =
          response.trusted_suppliers.map((supplier, index) => ({
            id: index + 1,
            supplierName: supplier.SupplierName,
            supplierTRN: supplier.TRN,
          }));
        setSuppliers(mappedSuppliers);

        setShowCreatePopup(false);
        setFormData({ SupplierName: "", SupplierTRN: "" });
      }
    } catch (error: any) {

      let errorMessage = "Failed to add supplier.";

      if (error?.data?.detail) {
        if (Array.isArray(error.data.detail)) {
          errorMessage = error.data.detail
            .map((err: any) => err.msg)
            .join(", ");
        } else {
          errorMessage =
            typeof error.data.detail === "string"
              ? error.data.detail
              : JSON.stringify(error.data.detail);
        }
      } else if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.data?.error) {
        errorMessage = error.data.error;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    } finally {
      setLoadingSubmit(false);
    }
  };

  const handleDeleteTrustedSupplier = async () => {
    if (!formData.SupplierName.trim() || !formData.SupplierTRN.trim()) {
      toast.error("Please enter both supplier name and TRN.");
      return;
    }

    if (formData.SupplierTRN.length !== 15) {
      toast.error("Supplier TRN must be exactly 15 digits.");
      return;
    }

    try {
      setLoadingDelete(true);
      const result = await deleteTrustedSupplier({
        SupplierName: formData.SupplierName,
        SupplierTRN: formData.SupplierTRN,
      });

      const successMessage =
        result?.message ||
        `Supplier "${formData.SupplierName}" deleted successfully!`;
      toast.success(successMessage, {
        position: "top-right",
        autoClose: 3000,
      });

      const response = await getTrustedSuppliers();
      const mappedSuppliers: TrustedSupplier[] =
        response.trusted_suppliers.map((supplier, index) => ({
          id: index + 1,
          supplierName: supplier.SupplierName,
          supplierTRN: supplier.TRN,
        }));
      setSuppliers(mappedSuppliers);

      setShowEditPopup(false);
      setFormData({ SupplierName: "", SupplierTRN: "" });
      setSelectedSupplier(null);
    } catch (error: any) {
      let errorMessage = "Supplier not found";

      if (error?.description) {
        errorMessage = error.description.includes("not found")
          ? "Supplier not found"
          : error.description;
      } else if (error?.message) {
        errorMessage = error.message.includes("not found")
          ? "Supplier not found"
          : error.message;
      }

      toast.error(errorMessage);
    } finally {
      setLoadingDelete(false);
    }
  };

  return (
    <div className="trusted-supplier-page">
      <div className="trusted-supplier-header">
        <div className="button-bar">
          <BackButton />
        </div>
        <h1 className="page-title">Trusted Supplier Management</h1>
      </div>

      <div className="search-action-container">
        <div className="search-wrapper">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Search by Supplier Name or TRN Number"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input-trusted-supplier"
          />
        </div>
        <button onClick={handleCreateClick} className="create-supplier-btn">
          <Plus size={20} />
          Create Trusted Supplier
        </button>
      </div>

      <div className="table-container">
        {loadingFetch ? (
          <div>Loading suppliers...</div>
        ) : errorFetch ? (
          <div className="error-message">{errorFetch}</div>
        ) : (
          <>
            <table className="suppliers-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Supplier Name</th>
                  <th>Supplier TRN Number</th>
                  <th className="center-align">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.length > 0 ? (
                  currentSuppliers.map((supplier, index) => (
                    <tr key={supplier.id}>
                      <td>{indexOfFirstItem + index + 1}</td>
                      <td className="supplier-name">
                        {supplier.supplierName}
                      </td>
                      <td className="supplier-trn">{supplier.supplierTRN}</td>
                      <td className="actions-cell">
                        <button
                          onClick={() => handleEditClick(supplier)}
                          className="trusted-edit-btn"
                        >
                          <FaTrash size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="no-data-row">
                      No trusted suppliers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

  
          
          </>
        )}
      </div>
{filteredSuppliers.length > 0 && (
              <div className="pagination-controls">
                <button
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                  disabled={currentPage === 1}
                  className="pagination-btn"
                >
                  Previous
                </button>
                <span className="page-info">
                  Page {currentPage} of {totalPages || 1}
                </span>
                <button
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="pagination-btn"
                >
                  Next
                </button>
              </div>
            )}
      {showCreatePopup && (
        <div
          className="popup-overlay"
          onClick={() => setShowCreatePopup(false)}
        >
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="popup-title">Create Trusted Supplier</h3>
            <input
              type="text"
              placeholder="Supplier Name"
              value={formData.SupplierName}
              onChange={(e) =>
                setFormData({ ...formData, SupplierName: e.target.value })
              }
              className="popup-input"
            />
            <input
              type="text"
              placeholder="Supplier TRN Number (15 digits)"
              value={formData.SupplierTRN}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 15);
                setFormData({ ...formData, SupplierTRN: value });
              }}
              maxLength={15}
              className="popup-input"
            />
            <div className="popup-buttons">
              <button
                onClick={handleAddTrustedSupplier}
                disabled={loadingSubmit}
                className="popup-btn submit-btn"
              >
                {loadingSubmit ? "Submitting..." : "Submit"}
              </button>
              <button
                onClick={() => setShowCreatePopup(false)}
                className="popup-btn cancel-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditPopup && (
        <div
          className="popup-overlay"
          onClick={() => setShowEditPopup(false)}
        >
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="popup-titledelete" >Delete Trusted Supplier</h3>
            <p>
              Are you sure you want to Delete this Trusted? <br />
              <b>
                {formData.SupplierName}, {formData.SupplierTRN}
              </b>
            </p>
            <div className="popup-buttons">
              <button
                onClick={handleDeleteTrustedSupplier}
                disabled={loadingDelete}
                className="popup-btn delete-btn"
              >
                {loadingDelete ? "Deleting..." : "Delete"}
              </button>
              <button
                onClick={() => setShowEditPopup(false)}
                className="popup-btn cancel-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrustedSupplierPage;
