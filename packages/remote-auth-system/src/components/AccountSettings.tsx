import React, { useMemo } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import BackButton from "./BackButton";
import "./AccountSettings.css";
import UserDetails from "./UserDetails";
import LogoPage from "./LogoPage";
import UploadExtensionZip from "./UploadExtensionZip";
import type { CompanyPreviewDto } from "../Dto/CompanyPreviewDto";
import { useAuth } from "../components/context/AuthContext";
import { USER_ROLES } from "../common/common";

const AccountSettings: React.FC = () => {
  const navigate = useNavigate();
  const auth = useAuth();
  const domainId = auth?.auth?.domainId;

  const customer: CompanyPreviewDto | undefined = useMemo(() => {
    if (!domainId) return undefined;
    return {
      id: domainId,
      gsT_VAT: "",
      aribaNetworkId: "",
      currentPlan: "",
      activeSince: "",
      domainName: "",
      domainStatus: "",
      activeStatus: "",
    } as CompanyPreviewDto;
  }, [domainId]);


  return (
    <div className="logo-container">
      <Routes>
        <Route
          index
          element={
            <div className="logo-body">
              <div className="button-btn">
                <BackButton />
              </div>
              {auth?.auth?.roleId === USER_ROLES.BUSINESS_ADMIN_USER ? (
                <>
                  <h2 className="logo-main-title">Account Settings</h2>
                  <div className="logo-buttons">
                    <button onClick={() => navigate("logo-upload")}>
                      Logo
                    </button>
                    <button
                      onClick={() =>
                        navigate("user-details", { state: customer })
                      }
                    >
                      User Details
                    </button>
                  </div>
                </>
              ) : (
                <div className="logo-buttons">
                 <div className="logo-unauthorized">
                  <h2>Access Denied</h2>
                  <p>You don't have permission to access this Feature</p>
                </div>
                </div>
              )}
            </div>
          }
        />
        <Route path="user-details" element={<UserDetails />} />
        <Route path="logo-upload" element={<LogoPage />} />
        <Route path="upload-extension-zip/*" element={<UploadExtensionZip />} />
      </Routes>
    </div>
  );
};
export default AccountSettings;