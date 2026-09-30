import React from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useConciergeForm } from './UseConciergeForm';
import ConciergeForm from './ConciergeForm';
import PrSummary from './PrSummary';
import PrEdit from './PrEdit';
import PrDraft from './PrDraft';
import type { ConciergeBaseProps, ServiceFormData } from '../Dto/ConciergeTpesDto';

import {
    createConciergeServicePR,
    fetchConciergeVenueName,
    getConciergeVenueDetails,
    createServicePRDraft,
    getAllServicePR,
    getAllDraftServicePR,
    uploadExcelDraftServicePR
} from '../api/ConciergeprApi';


const SERVICE_API_CONFIG = {
    createPR: createConciergeServicePR,
    fetchVenueName: fetchConciergeVenueName,
    getVenueDetails: getConciergeVenueDetails,
    createDraft: createServicePRDraft,
    uploadExcelDraft: uploadExcelDraftServicePR,
};

// Extra validation fields shown in the validation modal for Service
const SERVICE_EXTRA_VALIDATION_FIELDS = [
    { key: 'serviceStartDate', label: 'Service Start Date' },
    { key: 'serviceEndDate', label: 'Service End Date' },
    { key: 'autoSES', label: 'Auto SES' },
];

const ServiceConcierge: React.FC<ConciergeBaseProps> = (props) => {
    const form = useConciergeForm({
        mode: 'service',
        apiConfig: SERVICE_API_CONFIG,
        userId: props.userId,
        exitConfirmed: props.exitConfirmed,
        onResetExitFlag: props.onResetExitFlag,
        onBack: props.onBack,
        onModeChange: props.onModeChange,
    });

    const navigate = useNavigate();

    // Cast formData to ServiceFormData for easy access to service-only fields
    const serviceFormData = form.formData as ServiceFormData;

    const location = useLocation();
    const PrEditWrapper = () => {
        const prData = location.state?.prData ?? null;
        return (
            <PrEdit
                data={prData}
                onBack={() => navigate('../summary', { relative: 'path' })}
                onUpdateSuccess={() => navigate('../summary', { relative: 'path' })}
                onUpdate={createConciergeServicePR}
                isService={true}
            />
        );
    };

    // ── Service-specific extra fields rendered inside the form grid ────────
    const serviceExtraFields = (
        <>
            {/* Service Start Date */}
            <div className="form-group">
                <label htmlFor="serviceStartDate">Service Start Date *</label>
                <input
                    type="date"
                    id="serviceStartDate"
                    name="serviceStartDate"
                    value={serviceFormData.serviceStartDate || ''}
                    onChange={form.handleInputChange}
                    className="form-input form-input-consistent-border-font"
                    min="2000-01-01"
                />
            </div>

            {/* Service End Date */}
            <div className="form-group">
                <label htmlFor="serviceEndDate">Service End Date *</label>
                <input
                    type="date"
                    id="serviceEndDate"
                    name="serviceEndDate"
                    value={serviceFormData.serviceEndDate || ''}
                    onChange={form.handleInputChange}
                    className="form-input form-input-consistent-border-font"
                    min="2000-01-01"
                />
            </div>
        </>
    );

    return (
        <Routes>
            <Route path="summary" element={
                <PrSummary
                    onBack={form.handleBack}
                    onEdit={data => navigate('../edit', { state: { prData: data }, relative: 'path' })}
                    onCopy={form.handleCopyFromSummary}
                    filterPrNumber={form.targetPrNumber}
                    onFetchData={getAllServicePR}
                    summaryType="service"
                />
            } />

            <Route path="edit" element={<PrEditWrapper />} />

            <Route path="draft" element={
                <PrDraft
                    onBack={form.handleBack}
                    onEdit={data => navigate('../edit', { state: { prData: data }, relative: 'path' })}
                    onCopy={form.handleCopyFromDraft}
                    filterPrNumber={form.targetPrNumber}
                    onFetchData={getAllDraftServicePR}
                />
            } />

            <Route path="/" element={
                <ConciergeForm
                    mode="service"
                    // ── All shared state (identical to Material) ──
                    formData={form.formData}
                    lineItems={form.lineItems}
                    editingId={form.editingId}
                    selectedLineItemId={form.selectedLineItemId}
                    selectedLineItemIds={form.selectedLineItemIds}
                    selectAllChecked={form.selectAllChecked}
                    ocrProceed={form.ocrProceed}
                    isDraftEnabled={form.isDraftEnabled}
                    submitReqDisable={form.submitReqDisable}
                    isUploadingExcel={form.isUploadingExcel}
                    attachments={form.attachments}
                    invoiceAttachments={form.invoiceAttachments}
                    vendorsList={form.vendorsList}
                    vendorLoading={form.vendorLoading}
                    hasMoreVendors={form.hasMoreVendors}
                    venuesList={form.venuesList}
                    venueLoading={form.venueLoading}
                    hasMoreVenues={form.hasMoreVenues}
                    excelInputRef={form.excelInputRef}
                    pendingSwitchId={form.pendingSwitchId}
                    showSwitchConfirm={form.showSwitchConfirm}
                    showValidationModal={form.showValidationModal}
                    editingValidationIds={form.editingValidationIds}
                    showExitModal={form.showExitModal}
                    nextId={form.nextId}
                    // ── All shared handlers (identical to Material) ──
                    onInputChange={form.handleInputChange}
                    onSelectChange={form.handleSelectChange}
                    onAutoInvoiceToggle={form.handleAutoInvoiceToggle}
                    onAutoGRNToggle={form.handleAutoGRNToggle}
                    onAddTaxToggle={form.handleAddTaxToggle}
                    onFileChange={form.handleFileChange}
                    onInvoiceFileChange={form.handleInvoiceFileChange}
                    onViewFile={form.handleViewFile}
                    onRemoveAttachment={form.removeAttachment}
                    onRemoveInvoiceAttachment={form.removeInvoiceAttachment}
                    onSelectAll={form.handleSelectAll}
                    onCheckboxChange={form.handleCheckboxChange}
                    onAddLineItem={form.handleAddLineItem}
                    onDelete={form.handleDelete}
                    onCancelEdit={form.handleCancelEdit}
                    onValidate={form.handleValidate}
                    onValidationItemChange={form.handleValidationItemChange}
                    onSaveValidation={form.handleSaveValidation}
                    onCancelValidationEdit={form.handleCancelValidationEdit}
                    onToggleValidationEdit={form.toggleValidationEdit}
                    onSubmitRequisition={form.handleSubmitRequisition}
                    onSaveAsDraft={form.handleSaveAsDraft}
                    onExcelFileChange={form.handleExcelFileChange}
                    onNavigate={form.handleManualNavigate}
                    onNavigateBack={form.handleNavigateBack}
                    onBack={props.onBack}
                    onSetOcrProceed={form.setOcrProceed}
                    onSetEditingId={form.setEditingId}
                    onSetSelectedLineItemId={form.setSelectedLineItemId}
                    onSetPendingSwitchId={form.setPendingSwitchId}
                    onSetShowSwitchConfirm={form.setShowSwitchConfirm}
                    onSetShowExitModal={form.setShowExitModal}
                    onSetFormData={form.setFormData as any}
                    invoiceIdError={form.invoiceIdError}
                    saveDraft={form.saveDraft}
                    onProceed={form.handleManualProceed}
                    onSetNextId={form.setNextId}
                    onSetLineItems={form.setLineItems as any}
                    handleVendorSearch={form.handleVendorSearch}
                    handleLoadMoreVendors={form.handleLoadMoreVendors}
                    handleVenueSearch={form.handleVenueSearch}
                    handleLoadMoreVenues={form.handleLoadMoreVenues}
                    onModeChange={form.handleManualModeChange}
                    onAutoSESToggle={form.handleAutoSESToggle}
                    // ↓ Service-specific extras injected here
                    extraFields={serviceExtraFields}
                    extraValidationFields={SERVICE_EXTRA_VALIDATION_FIELDS}
                />
            } />
        </Routes>
    );
};

export default ServiceConcierge;