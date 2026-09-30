import React from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import BackButton from "./BackButton";
import "./Config.css";
import ModuleConfig from "./ModuleConfig";
import BusinessPlan from "./BusinessPlan";
import EmailContent from "./EmailContent";
import EmailCC from "./EmailCC";

const Config: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="config-container">
      <Routes>
        <Route
          index
          element={
            <div className="config-body">
              <div className="config-back-wrapper">
                <BackButton />
              </div>
              <h2 className="config-main-title">Config</h2>
              <div className="config-buttons">
                <button onClick={() => navigate("module-config")}>Modules</button>
                <button onClick={() => navigate("business-plan")}>Business Plans</button>
                <button onClick={() => navigate("email-content")}>Email Content</button>
                <button onClick={() => navigate("email-cc")}>Email CC</button>
              </div>
            </div>
          }
        />
        <Route path="module-config" element={<ModuleConfig />} />
        <Route path="business-plan" element={<BusinessPlan />} />
        <Route path="email-content" element={<EmailContent />} />
        <Route path="email-cc" element={<EmailCC />} />
      </Routes>
    </div>
  );
};

export default Config;
