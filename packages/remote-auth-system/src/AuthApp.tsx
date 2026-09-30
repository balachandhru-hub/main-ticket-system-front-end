import React, { useEffect, Suspense, lazy } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Header from "./components/Header";
import "./App.css";
import { useTokenRefresher } from "./hooks/userRefreshToken";
import { AuthProvider } from "./components/context/AuthContext";
import ProtectedRoutes from "./ProtectedRoutes";
import { CountryProvider } from "./components/context/CountryContext";
import { CountryCodeProvider } from "./components/context/CountryCodeContext";
import { InvoiceProvider } from "./components/context/InvoiceContext";
import { PulseReportProvider } from "./components/context/PulseReportContext";
import { FilterProvider } from "./components/context/PulseContext";
import SpinnerLoaders from "./components/SpinnerLoaders";

// Lazy-loaded components
const CreateUser = lazy(() => import("./components/CreateUser"));
const CreateUserCu = lazy(() => import("./components/CreateUserCu"));
const DashboardHome = lazy(() => import("./pages/DashboardHome"));
const BusinessModels = lazy(() => import("./components/BusinessModels"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const AccountSettings = lazy(() => import("./components/AccountSettings"));
const MenuContent = lazy(() => import("./components/MenuContent"));
const UserDetail = lazy(() => import("./components/UserDetail"));
const CompanyRegistration = lazy(() => import("./components/CompanyRegistration"));
const CompanyMenu = lazy(() => import("./components/CompanyDash"));
const CustomerMaster = lazy(() => import("./components/CustomerMaster"));
const CustomerMasterEdit = lazy(() => import("./components/CustomerMasterEdit"));
const UploadExtensionZip = lazy(() => import("./components/UploadExtensionZip"));
const BulkUploadPreview = lazy(() => import("./components/BulkUploadPreview"));
const SimplyPRDashboard = lazy(() => import("./components/SimplyPRDashboard"));
const TicketEdit = lazy(() => import("./components/TicketEdit"));
const TicketDetailsPage = lazy(() => import("./pages/TicketDetailsPage"));
const PurchaseRequisitionForm = lazy(() => import("./components/PurchaseRequisitionForm"));
const ImageViewer = lazy(() => import("./components/ImageViewer"));
const EditDomain = lazy(() => import("./components/EditDomain"));
const Config = lazy(() => import("./components/Config"));
const InvoiceExtractor = lazy(() => import("./components/InvoiceExtractor"));
const Contract = lazy(() => import("./components/Contract"));
const Prdashboard = lazy(() => import("./components/Prdashboard"));
const GrnDashboard = lazy(() => import("./components/GrnDashboard"));
const SesDashboard = lazy(() => import("./components/SesDashboard"));
const PulseReportInvoiceDashboard = lazy(() => import("./components/PulseReportInvoiceDashboard"));
const TrustedSupplierPage = lazy(() => import("./components/TrustedSupplierPage"));
const ReprocessedTable = lazy(() => import("./components/ReprocessedTable"));
const QuickSes = lazy(() => import("./components/QuickSes"));
const Autoses = lazy(() => import("./components/Autoses"));
const UserQueries = lazy(() => import("./components/UserQueries"));
const QuickApproval = lazy(() => import("./components/QuickApproval"));
const PRtable = lazy(() => import("./components/PRtable"));
const ContractDetails = lazy(() => import("./components/ContractDetails"));

const AuthAppContent: React.FC = () => {
  useTokenRefresher();
  const location = useLocation();
  
  useEffect(() => {
    const sanitizeAlphanumeric = (value: string) => {
      const urlPattern = /https?:\/\/|www\./i;
      if (urlPattern.test(value)) return value;
      return value.replace(/[^a-zA-Z0-9 ,@._-]/g, "");
    };

    const sanitizePassword = (value: string) => {
      const urlPattern = /https?:\/\/|www\./i;
      if (urlPattern.test(value)) return value;
      return value.replace(/[^a-zA-Z0-9@]/g, "");
    };

    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement;

      if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") return;
      if (target.readOnly || target.disabled) return;


      if (target.type === "password") {
        const clean = sanitizePassword(target.value);
        if (clean !== target.value) {
          target.value = clean;
          target.dispatchEvent(new Event("input", { bubbles: true }));
        }
      } else if (target.type === "text" || target.tagName === "TEXTAREA") {
        const clean = sanitizeAlphanumeric(target.value);
        if (clean !== target.value) {
          target.value = clean;
          target.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }

      target.dataset.prevValue = target.value;
    };

    document.addEventListener("input", handleInput, true);
    return () => document.removeEventListener("input", handleInput, true);
  }, []);

  const noFooterPaths = ["/", "/register"];
  const showFooter = !noFooterPaths.includes(location.pathname);

  return (
    <div className="main">
      <Header />
      <ToastContainer position="top-right" autoClose={3000} />
      <Suspense fallback={<SpinnerLoaders fullScreen={true} text="Loading..." />}>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<ProtectedRoutes />}>
            <Route path="/dashboard/*" element={<DashboardHome />} />
            <Route path="/invoice" element={<QuickApproval />} />
            <Route path="/pr" element={<PRtable />} />
            <Route path="/business-plan" element={<BusinessModels />} />
            <Route path="/createUser" element={<CreateUser />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/menu" element={<MenuContent />} />
            <Route path="/user-details" element={<UserDetail />} />
            <Route path="/create-global-user" element={<CreateUserCu />} />
            <Route path="/create-business-user" element={<CreateUser />} />
            <Route path="/add-domain" element={<CompanyRegistration />} />
            <Route path="/company-dashboard" element={<CompanyMenu />} />
            <Route path="/customer-master" element={<CustomerMaster />} />
            <Route path="/Upload-extension" element={<UploadExtensionZip />} />
            <Route path="/customer-master-edit" element={<CustomerMasterEdit />} />
            <Route path="/bulk-upload/:type" element={<BulkUploadPreview />} />
            <Route path="/simply-pr/*" element={<SimplyPRDashboard />} />
            <Route path="/ticket-edit" element={<TicketEdit />} />
            <Route path="/ticket-details" element={<TicketDetailsPage />} />
            <Route path="/purchase-requisition-form" element={<PurchaseRequisitionForm />} />
            <Route path="/image/:ticketId/:assetId" element={<ImageViewer />} />
            <Route path="/edit-domain" element={<EditDomain />} />
            <Route path="/config/*" element={<Config />} />
            <Route path="/account-settings/*" element={<AccountSettings />} />
            <Route path="/invoice-extractor/*" element={<InvoiceExtractor />} />
            <Route path="/contract/*" element={<Contract />} />
            <Route path="/pr-dashboard/*" element={<Prdashboard />} />
            <Route path="/grn-dashboard/*" element={<GrnDashboard />} />
            <Route path="/ses-dashboard/*" element={<SesDashboard />} />
            <Route path="/invoice-dashboard/*" element={<PulseReportInvoiceDashboard />} />
            <Route path="/trusted-supplier" element={<TrustedSupplierPage />} />
            <Route path="/reprocessed-invoices" element={<ReprocessedTable />} />
            <Route path="/quick-ses" element={<QuickSes />} />
            <Route path="/auto-ses/*" element={<Autoses />} />
            <Route path="/user-queries" element={<UserQueries />} />
            <Route path="/contract/details/:id" element={<ContractDetails />} />
          </Route>

          <Route path="*" element={<LoginPage />} />
        </Routes>
      </Suspense>

      {showFooter && (
        <footer className="global-footer">
          <p>&copy; {new Date().getFullYear()} CAS Ticket System. All rights reserved.</p>
        </footer>
      )}
    </div>
  );
};

const AuthApp: React.FC = () => {
  return (
    <AuthProvider>
      <PulseReportProvider>
        <CountryProvider>
          <CountryCodeProvider>
            <InvoiceProvider>
              <FilterProvider>
                <AuthAppContent />
              </FilterProvider>
            </InvoiceProvider>
          </CountryCodeProvider>
        </CountryProvider>
      </PulseReportProvider>
    </AuthProvider>
  );
};

export default AuthApp;
