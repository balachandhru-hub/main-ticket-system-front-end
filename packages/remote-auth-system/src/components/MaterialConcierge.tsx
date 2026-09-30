import React from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useConciergeForm } from './UseConciergeForm';
import ConciergeForm from './ConciergeForm';
import PrSummary from './PrSummary';
import PrEdit from './PrEdit';
import PrDraft from './PrDraft';
import type { ConciergeBaseProps } from '../Dto/ConciergeTpesDto';

import {
    createConciergePR,
    fetchConciergeVenueName,
    getConciergeVenueDetails,
} from '../api/ConciergeprApi';
import {
    createMaterialPRDraft,
    uploadExcelDraftMaterialPR,
    getAllPRMaterialPR,
    getAllDraftMaterialPR,
} from '../api/prEntertainmentApi';

const MATERIAL_API_CONFIG = {
    createPR: createConciergePR,
    fetchVenueName: fetchConciergeVenueName,
    getVenueDetails: getConciergeVenueDetails,
    createDraft: createMaterialPRDraft,
    uploadExcelDraft: uploadExcelDraftMaterialPR,
};

const MaterialConcierge: React.FC<ConciergeBaseProps> = (props) => {
    const form = useConciergeForm({
        mode: 'material',
        apiConfig: MATERIAL_API_CONFIG,
        userId: props.userId,
        exitConfirmed: props.exitConfirmed,
        onResetExitFlag: props.onResetExitFlag,
        onBack: props.onBack,
        onModeChange: props.onModeChange,
    });

    const navigate = useNavigate();

    const location = useLocation();
    const PrEditWrapper = () => {
        const prData = location.state?.prData ?? null;
        return (
            <PrEdit
                data={prData}
                onBack={() => navigate('../summary', { relative: 'path' })}
                onUpdateSuccess={() => navigate('../summary', { relative: 'path' })}
                onUpdate={createConciergePR}
                isService={false}
            />
        );
    };

    return (
        <Routes>
            <Route path="summary" element={
                <PrSummary
                    onBack={form.handleBack}
                    onEdit={data => navigate('../edit', { state: { prData: data }, relative: 'path' })}
                    onCopy={form.handleCopyFromSummary}
                    filterPrNumber={form.targetPrNumber}
                    onFetchData={getAllPRMaterialPR}
                />
            } />

            <Route path="edit" element={<PrEditWrapper />} />

            <Route path="draft" element={
                <PrDraft
                    onBack={form.handleBack}
                    onEdit={data => navigate('../edit', { state: { prData: data }, relative: 'path' })}
                    onCopy={form.handleCopyFromDraft}
                    filterPrNumber={form.targetPrNumber}
                    onFetchData={getAllDraftMaterialPR}
                />
            } />

            <Route path="/" element={
                <ConciergeForm
                    mode="material"
                    // ── All shared state ──
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
                    // ── All shared handlers ──
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
                    onSetInvoiceAttachments={undefined}
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
                    // ↓ No extra fields for Material
                    extraFields={null}
                />
            } />
        </Routes>
    );
};

export default MaterialConcierge;