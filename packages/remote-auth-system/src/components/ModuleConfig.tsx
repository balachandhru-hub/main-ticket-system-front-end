import React, { useState, useEffect } from "react";
import BackButton from "./BackButton";
import { FaEdit, FaTrash } from "react-icons/fa";
import "./ModuleConfig.css";
import AddModulePopup from "../components/AddModulePopup";
import EditModulePopup from "../components/EditModulePopup";
import { createRefTerm, getAllModules, updateModuleStatus } from "../api/metadataApi";

import type { CreateRefTermDto } from "../Dto/CreateRefTermDto";
import type { SuccessResponseDto } from "../Dto/SuccessResponseDto";
import type { ErrorResponseDto } from "../Dto/ErrorResponseDto";
import type { GetAllModulesDto } from "../Dto/GetAllModulesDto";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { MODULE_TYPE } from "../common/common";

interface Module {  
  id: string;
  name: string;
  isActive: boolean;
}

const ModuleConfig: React.FC = () => {
  const [modules, setModules] = useState<Module[]>([]);
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const isSuccessResponse = (
    res: SuccessResponseDto | ErrorResponseDto
  ): res is SuccessResponseDto => "id" in res;

  const isErrorResponse = (res: unknown): res is ErrorResponseDto =>
    typeof res === "object" && res !== null && "statusCode" in res && typeof (res as any).statusCode === "number";

  const isModulesArray = (res: unknown): res is GetAllModulesDto[] => Array.isArray(res);

  // 🔹 Fetch all modules
  const fetchModules = async () => {
    try {
      setLoading(true);
      const result = await getAllModules();

      if (isModulesArray(result)) {
        setModules(
          result
            .filter((m) => m.isActive)
            .map((m) => ({
              id: m.id,
              name: m.description,
              isActive: m.isActive,
            }))
        );
      } else if (isErrorResponse(result)) {
        if (result.statusCode === 401) {
          toast.error(result.message || "Unauthorized");
          navigate("/");
        } else if (result.statusCode === 403) {
          toast.error(result.message || "You do not have permission to view modules.");
        } else {
          toast.error(result.message || "Failed to fetch modules");
        }
      } else {
        toast.error("Unexpected response format");
      }
    } catch (error: any) {
      if (error?.response?.status === 401) {
        toast.error("Unauthorized");
        navigate("/");
      } else {
        toast.error("Failed to fetch modules");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, [navigate]);

  // 🔹 Add Module
  const handleAddModule = async (name: string, isActive: boolean) => {
    const payload: CreateRefTermDto = {
      description: name,
      type: MODULE_TYPE, // 🔹 Force ARIBA_MODEL
    };

    try {
      const result = (await createRefTerm(payload)) as SuccessResponseDto | ErrorResponseDto;

      if (isSuccessResponse(result) && result.statusCode === 201) {
        toast.success("Module created successfully");
        setModules((prev) => [...prev, { id: result.id, name, isActive }]);
      } else if (isErrorResponse(result)) {
        if (result.statusCode === 401) {
          toast.error(result.message || "Session expired. Please log in again.");
          navigate("/");
        } else if (result.statusCode === 403) {
          toast.error(result.message || "No access. You do not have permission.");
        } else if (result.statusCode === 412) {
          toast.error(result.message || "Unable to create module, Try again.");
        } else {
          toast.error(result.message || "Failed to create module");
        }
      }
    } catch {
      toast.error("Unexpected error while creating module");
    }
  };

  
  const handleSaveModule = async (_name: string, isActive: boolean) => {
    if (editIndex === null) return;
    const moduleToUpdate = modules[editIndex];

    try {
      const response = await updateModuleStatus({ id: moduleToUpdate.id, isActive });

      if (isSuccessResponse(response) && response.statusCode === 200) {
        toast.success("Module updated successfully");
        const updated = [...modules];
        updated[editIndex] = { ...moduleToUpdate, isActive };
        setModules(updated);
      } else if (isErrorResponse(response)) {
        toast.error(response.message || "Failed to update module");
      }
    } catch {
      toast.error("An error occurred while updating module");
    }
  };

  
  const handleDelete = async (index: number) => {
    const moduleToDelete = modules[index];
    if (!moduleToDelete.id) {
      setModules((prev) => prev.filter((_, i) => i !== index));
      return;
    }
    setModules((prev) => prev.filter((_, i) => i !== index));

    try {
      const response = await updateModuleStatus({ id: moduleToDelete.id, isActive: false });

      if (isSuccessResponse(response) && response.statusCode === 200) {
        toast.success("Module deleted successfully");
      } else if (isErrorResponse(response) && response.statusCode === 401) {
        toast.error("Unauthorized");
        navigate("/");
      } else {
        toast.error(response?.message || "Failed to delete module");
        setModules((prev) => [...prev, moduleToDelete]); // rollback
      }
    } catch {
      toast.error("An error occurred while deleting module");
      setModules((prev) => [...prev, moduleToDelete]); // rollback
    }
  };

  if (loading) {
    return (
      <div className="loader-container-user">
        <div className="loader"></div>
      </div>
    );
  }
  return (
    <div>
      <div className="module-config-back-bar">
        <BackButton />
      </div>

      <div className="header">
        <h2 className="title">Modules</h2>
      </div>

      <div className="module-config">
        <div className="table-section">
               <div className="table-header">
              <button className="new-module-button" onClick={() => setShowAddPopup(true)}>
                + New Module
              </button>
            </div>
          <div className="table-wrapper">
       
            <table className="module-table">
              <thead>
                <tr>
                  <th>Module Name</th>
                  <th>Status</th>
                  <th className="action-header">Action</th>
                </tr>
              </thead>
              <tbody>
                {modules.map((module, index) => (
                  <tr key={module.id}>
                    <td>{module.name}</td>
                    <td className="status-active">{module.isActive ? "Active" : "Inactive"}</td>
                    <td className="actionnn-cell">
                      <div className="action-icons-module">
                        <FaEdit
                          className="edit-icon"
                          onClick={() => {
                            setEditIndex(index);
                            setShowEditPopup(true);
                          }}
                        />
                        <FaTrash
                          className="delete-icon"
                          onClick={() => handleDelete(index)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showAddPopup && <AddModulePopup onClose={() => setShowAddPopup(false)} onAdd={handleAddModule} />}
      {showEditPopup && editIndex !== null && (
        <EditModulePopup
          onClose={() => setShowEditPopup(false)}
          moduleName={modules[editIndex].name}
          status={modules[editIndex].isActive}
          onSave={handleSaveModule}
        />
      )}
    </div>
  );
};

export default ModuleConfig;
