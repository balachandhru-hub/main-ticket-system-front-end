import React from "react";
import { Routes, Route } from "react-router-dom";
import SmPr from "./SmPr";
import ServiceRequisitionForm from "./ServiceRequisitionForm";
import EditServiceRequisitionForm from "./EditServiceRequisitionForm";
import MaterialRequisitionForm from "./MaterialRequisitionForm";
import EditMaterialRequisitionForm from "./EditMaterialRequisitionForm";

const SimplyPRDashboard: React.FC = () => {
  return (
    <Routes>
      <Route index element={<SmPr />} />
      <Route path="service" element={<ServiceRequisitionForm />} />
      <Route path="service/edit" element={<EditServiceRequisitionForm />} />
      <Route path="materials" element={<MaterialRequisitionForm />} />
      <Route path="materials/edit" element={<EditMaterialRequisitionForm />} />
    </Routes>
  );
};

export default SimplyPRDashboard;