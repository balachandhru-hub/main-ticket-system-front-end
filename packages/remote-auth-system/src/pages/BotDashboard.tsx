import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import "./BotDashboard.css";
import { useAuth } from "../components/context/AuthContext";
import { USER_ROLES } from "../common/common";
import InvoiceExtractor from "../components/InvoiceExtractor";
import POManagement from "../components/POMangement";
import Prdashboard from "../components/Prdashboard";
import QuickApproval from "../components/QuickApproval";
import NewPulseReportDashboard from "../components/NewPulseReportDashboard";
import PulseReportDashboard from "../components/PulseReportDashboard";
import ChangeExistingPR from "../components/ChangeExistingPR";
import { getModelsByUser } from "../api/modelApi";
import LeadershipLayout from "./LeadershipLayout";
import PRtable from "../components/PRtable";
import ContractApproval from "../components/ContractApproval";
import QuickSes from "../components/QuickSes";
import ErpDashboard from "../components/ErpDashboard";
import Autoses from "../components/Autoses";
import AdvancePayment from "../components/AdvancePayment";

import QuickPRModel from "../components/QuickPRModel";
import Contract from "../components/Contract";
import ContractCreate from "../components/ContractCreate";
import ContractSummary from "../components/ContractSummary";

interface BotCard {
  id: number;
  title: string;
  description: string;
  isActive: boolean;
  route: string | null;
  showForSupplier?: boolean;
  modelName?: string;
}

const BotsDashboard = () => {
  const navigate = useNavigate();
  const auth = useAuth();
  const [botCards, setBotCards] = useState<BotCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  const allBots: BotCard[] = [
    {
      id: 24,
      title: "Pulse Reporting BOT",
      description: "Pulse Reporting BOT",
      isActive: true,
      route: "pulse-report-dashboard",
      showForSupplier: false,
      modelName: "PULSE_REPORT"
    },
    {
      id: 1,
      title: "OCR Supplier Invoice",
      description: "Supplier Invoice Management",
      isActive: true,
      route: "invoice-extractor",
      modelName: "OCR_SUPPLIER-INVOICE"
    },
    {
      id: 2,
      title: "Rapid Receipts",
      description: "Receipts Reprocessing Bot",
      isActive: true,
      route: "po-management",
      showForSupplier: false,
      modelName: "RAPID_RECEIPTS"
    },
    {
      id: 3,
      title: "Business Process BOT",
      description: "Customer Process Support & Custom Interactions",
      isActive: false,
      route: null,
      modelName: "BUSINESS_PROCESS_BOT"
    },
    {
      id: 4,
      title: "PR BOT",
      description: "Procurement Guidance & Best Practices",
      isActive: false,
      route: null,
      modelName: "PR_BOT"
    },
    {
      id: 5,
      title: "Contract BOT",
      description: "Contract Management & Reporting",
      isActive: true,
      route: "contract",
      modelName: "CONTRACT_BOT"
    },
    {
      id: 6,
      title: "SLP Automation BOT",
      description: "Supplier Registration & Validation",
      isActive: false,
      route: null,
      modelName: "SLP_AUTOMATION"
    },
    {
      id: 7,
      title: "Common BOT",
      description: "Ariba Best Practices & Document Assistance",
      isActive: false,
      route: null,
      modelName: "COMMON_BOT"
    },
    {
      id: 8,
      title: "AI-Based Ticketing Tool",
      description: "Seamless Issue Reporting",
      isActive: false,
      route: null,
      modelName: "AI_BASED_TICKETING_TOOL"
    },
    {
      id: 9,
      title: "Interactive Tooltips & Guided Tours",
      description: "Assisted Navigation & Workflows",
      isActive: false,
      route: null,
      modelName: "INTERACTIVE_TOOLTIPS_GUIDED_TOURS"
    },
    {
      id: 10,
      title: "Contract Migration Tool",
      description: "Bulk Contract Transfer & Attachments",
      isActive: false,
      route: null,
      modelName: "CONTRACT_MIGRATION_TOOL"
    },
    {
      id: 11,
      title: "Contract Automation & NDA BOT",
      description: "Workflow Automation & Setup",
      isActive: false,
      route: null,
      modelName: "CONTRACT_AUTOMATION_NDA_BOT"
    },
    {
      id: 12,
      title: "Ariba CIG & Transaction Monitoring BOT",
      description: "Issue Detection & Resolution",
      isActive: false,
      route: null,
      modelName: "ARIBA_CIG_TRANSCATION_MONITORING"
    },
    {
      id: 13,
      title: "SLP Integrated Supplier Evaluation",
      description: "Supplier Performance Analysis",
      isActive: false,
      route: null,
      modelName: "SLP_INTEGRATED_SUPPLIER_EVALUTION"
    },
    {
      id: 14,
      title: "Audit Trail & Change Management",
      description: "Compliance & Tracking",
      isActive: false,
      route: null,
      modelName: "AUDIT_TRAIL_CHANGE_MANAGMENT"
    },
    {
      id: 15,
      title: "Buying Integration BOT",
      description: "Third-Party Purchase Process Integration",
      isActive: false,
      route: null,
      modelName: "BUYING_INTEGRATION_BOT"
    },
    {
      id: 16,
      title: "Quick SES",
      description: "Touch Free SES Process",
      isActive: true,
      route: "quick-scs",
      modelName: "QUICK_SES"
    },
    {
      id: 17,
      title: "Simply PR",
      description: "Material and Service Procurement, simplify the PR creation process",
      isActive: true,
      route: "simply-pr",
      modelName: "SIMPLY_PR"
    },
    {
      id: 18,
      title: "Ariba Security Governance",
      description: "User provisioning, new user, revoking, delete users etc",
      isActive: false,
      route: null,
      modelName: "ARIBA_SECURITY_GOVERNANCE"
    },
    {
      id: 19,
      title: "Transaction Monitoring Dashboard",
      description: "Dashboard to see all the transaction status at one place",
      isActive: true,
      route: import.meta.env.VITE_TRANSACTION_URL,
      showForSupplier: false,
      modelName: "TRANSACTION_MONITORING_DASHBOARD"
    },
    {
      id: 20,
      title: "PR Dashboard",
      description: "Composing, pending approvals, approval reminder",
      isActive: true,
      route: "pr-dashboard",
      showForSupplier: false,
      modelName: "PR_DASHBOARD"
    },
    {
      id: 21,
      title: "Gatekeeper Approval Sheet",
      description: "Invoice Approval sheet for chairman and other stakeholders",
      isActive: true,
      route: "quick-approval",
      showForSupplier: false,
      modelName: "GATEKEPEER_APPROVAL_SHEET"
    },
    {
      id: 22,
      title: "Ariba Business Process BOT",
      description: "Chatbot for all the business process, training etc",
      isActive: false,
      route: null,
      modelName: "ARIBA_BUSINESS_PROCESS"
    },
    {
      id: 23,
      title: "Service Order Automation BOT",
      description: "Service Order Automation BOT",
      isActive: false,
      route: null,
      modelName: "SERVICE_ORDER_AUTOMATION_BOT"
    },
    {
      id: 25,
      title: "ERP Dashboard BOT",
      description: "ERP Dashboard BOT",
      isActive: true,
      route: "erp-dashboard",
      modelName: "ERP_DASHBOARD"
    },
    {
      id: 26,
      title: "Advance Payment Request BOT",
      description: "Raise Advancement Payment Request",
      isActive: true,
      route: "advance-payment",
      modelName: "RAISE_ADVANCE_PAYMENT"
    },
    {
      id: 27,
      title: "Auto SES",
      description: "Touch Free SES Process",
      isActive: true,
      route: "auto-ses",
      modelName: "AUTO_SES"
    },
    {
      id: 28,
      title: "Spend Analytics Dashboard",
      description: "Multi-dashboard analytical intelligence hub",
      isActive: true,
      route: "spend-analytics-dashboard",
      showForSupplier: false,
      modelName: "PROCUREMENT_PERFORMANCE"
    },
  ];


  useEffect(() => {
    const fetchBots = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getModelsByUser();
        if (Array.isArray(response)) {
          const userBots = allBots.filter(bot => {
            if (bot.id === 24) {
              return response.some(model => model.modelName.toUpperCase() === "PULSE_REPORT");
            }
            return response.some(model => bot.modelName?.toUpperCase() === model.modelName.toUpperCase());
          });
          setBotCards(userBots);
        } else if ('description' in response) {
          setError(response.description || 'Failed to load bots');
        }
      } catch (err) {
        setError('An unexpected error occurred while loading bots');
      } finally {
        setLoading(false);
      }
    };
    fetchBots();
  }, []);

  const handleCardClick = (card: BotCard): void => {
    const isSupplier = auth?.auth?.roleId === USER_ROLES.SUPPLIER_USER;
    const isDisabled = !card.isActive || (isSupplier && card.showForSupplier === false);
    if (isDisabled) return;

    if (card.id === 26) {
      navigate("advance-payment");
      return;
    }

    if (card.route) {
      if (card.route.startsWith("http")) {
        window.open(card.route, "_blank");
      } else {
        navigate(card.route);
      }
    }
  };

  return (
    <div className="bots-container">
      <Routes>
        <Route
          index
          element={
            <div className="bots-body">
              {(auth?.auth?.roleId === USER_ROLES.BUSINESS_ADMIN_USER ||
                auth?.auth?.roleId === USER_ROLES.BUSINESS_USER ||
                auth?.auth?.roleId === USER_ROLES.LEADERSHIP_USER ||
                auth?.auth?.roleId === USER_ROLES.OPERATIONS_USER ||
                auth?.auth?.roleId === USER_ROLES.FINANCE_OPERATION_USER ||
                auth?.auth?.roleId === USER_ROLES.SUPPLIER_USER) ? (
                <>
                  {loading ? (
                    <div className="bots-loading">
                      <div className="spinner"></div>
                      <p>Loading bots...</p>
                    </div>
                  ) : error ? (
                    <div className="bots-error">
                      <h2>Error Loading Bots</h2>
                      <p>{error}</p>
                      <button className="retry-button" onClick={() => window.location.reload()}>
                        Retry
                      </button>
                    </div>
                  ) : botCards.length === 0 ? (
                    <div className="bots-empty">
                      <h2>No Bots Available</h2>
                      <p>You don't have any bots assigned yet.</p>
                    </div>
                  ) : (
                    <div className="bots-grid">
                      {botCards.map(card => {
                        const isSupplier = auth?.auth?.roleId === USER_ROLES.SUPPLIER_USER;
                        const isDisabled = !card.isActive || (isSupplier && card.showForSupplier === false);

                        return (
                          <div key={card.id} className={`bot-card ${card.isActive ? 'active' : 'inactive'}`}>
                            <div className="card-content">
                              <h3 className="card-title">{card.title}</h3>
                              <p className="card-description">{card.description}</p>
                            </div>
                            <button
                              className={`open-button ${!isDisabled ? 'enabled' : 'disabled'}`}
                              onClick={() => handleCardClick(card)}
                              disabled={isDisabled}
                            >
                              Open
                              <svg className="arrow-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="9,18 15,12 9,6"></polyline>
                              </svg>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <div className="bots-unauthorized">
                  <h2>Access Denied</h2>
                  <p>You don't have permission to access this page.</p>
                </div>
              )}
            </div>
          }
        />
        <Route path="/invoice-extractor/*" element={<InvoiceExtractor />} />
        <Route path="/po-management/*" element={<POManagement />} />
        <Route path="/contract" element={<Contract />}>
          <Route index element={<ContractCreate />} />
          <Route path="summary" element={<ContractSummary />} />
        </Route>
        <Route path="/pr-dashboard/*" element={<Prdashboard />} />
        <Route element={<LeadershipLayout />}>
          <Route index element={<QuickApproval />} />
          <Route path="contract-approval" element={<ContractApproval />} />
          <Route path="/quick-approval/*" element={<QuickApproval />} />
          <Route path="pr-table" element={<PRtable />} />
          <Route path="*" element={<Navigate to="/dashboard/quick-approval" replace />} />
        </Route>
        <Route path="/pulse-report-dashboard/*" element={<PulseReportDashboard />} />
        <Route path="/spend-analytics-dashboard/*" element={<NewPulseReportDashboard />} />
        <Route path="/quick-scs/*" element={<QuickSes />} />
        <Route path="/simply-pr/*" element={<QuickPRModel />} />
        <Route path="/change-pr/:prNumber" element={<ChangeExistingPR />} />
        <Route path="/erp-dashboard/*" element={<ErpDashboard />} />
        <Route path="/auto-ses/*" element={<Autoses />} />
        <Route path="/advance-payment/*" element={<AdvancePayment />} />
      </Routes>
    </div>
  );
};

export default BotsDashboard;