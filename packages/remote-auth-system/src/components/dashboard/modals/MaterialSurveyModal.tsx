import React, { useState, useEffect } from 'react';
import { X, ClipboardList, Plus, Trash2, Send, Search, Save, BookOpen, ArrowUp, ArrowDown, BarChart2, Loader2, User } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  createSurveyTemplate,
  getTemplateDetails,
  getSurveyDetails,
  fetchTemplateNames,
  updateTemplateQuestions,
  enterTemplateAnswers,
  type CreateTemplatePayload,
  type UpdateTemplateQuestionsPayload,
  type EnterTemplateAnswersPayload
} from '../../../api/surveyApi';
import { fetchLookupRequesters } from '../../../api/SpendApi';
import { getMyProfile } from '../../../api/userApi';
import { USER_ROLES } from '../../../common/common';
import { useAuth } from '../../context/AuthContext';

export interface QuestionItem {
  id: number;
  text: string;
  type: 'rating' | 'text' | 'yes_no' | 'select';
  options?: string[];
}

export interface SurveyTemplate {
  id: string;
  name: string;
  description: string;
  questions: QuestionItem[];
}

export interface SentSurveyItem {
  id: string;
  materialName: string;
  supplierName?: string;
  surveyTitle: string;
  recipient: string;
  from?: string;
  questionsCount: number;
  sentDate: string;
  status: 'Sent' | 'Completed' | 'Pending Response';
  responses?: Array<{
    questionText: string;
    answer: string | number;
  }>;
}

interface MaterialSurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMaterialName?: string;
  allAvailableMaterials?: string[];
  initialSupplierName?: string;
  allAvailableSuppliers?: string[];
  defaultFrom?: string;
  defaultTo?: string;
}

// Built-in Default Survey Templates
export const MaterialSurveyModal: React.FC<MaterialSurveyModalProps> = ({
  isOpen,
  onClose,
  initialMaterialName = '',
  allAvailableMaterials = [],
  initialSupplierName = '',
  allAvailableSuppliers = [],
  defaultFrom = '',
  defaultTo = ''
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'ongoing' | 'templates' | 'sent'>('ongoing');
  const [selectedMaterial, setSelectedMaterial] = useState<string>(initialMaterialName);
  const [materialSearchQuery, setMaterialSearchQuery] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [customMaterialInput, setCustomMaterialInput] = useState<boolean>(false);

  const [selectedSupplier, setSelectedSupplier] = useState<string>(initialSupplierName);
  const [supplierSearchQuery, setSupplierSearchQuery] = useState<string>('');
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState<boolean>(false);
  const [customSupplierInput, setCustomSupplierInput] = useState<boolean>(false);

  const [from, setFrom] = useState<string>(defaultFrom || '');
  const [to, setTo] = useState<string>(defaultTo || '');
  const [customToInput, setCustomToInput] = useState<boolean>(false);
  const [requestersOptions, setRequestersOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [requestersLoading, setRequestersLoading] = useState<boolean>(false);

  const [surveyTitle, setSurveyTitle] = useState<string>('Material Quality & Pricing Evaluation Survey');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // View Selected Responses Modal State
  const [viewingResponsesFor, setViewingResponsesFor] = useState<SentSurveyItem | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);

  // Custom User Templates list
  const [savedTemplates, setSavedTemplates] = useState<SurveyTemplate[]>([]);
  const [templateNamesList, setTemplateNamesList] = useState<string[]>([]);
  const [newTemplateName, setNewTemplateName] = useState<string>('');
  const [isSavingTemplate, setIsSavingTemplate] = useState<boolean>(false);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState<boolean>(false);

  // Dynamic Questions & Answers State
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});
  const [newQuestionText, setNewQuestionText] = useState<string>('');
  const [newQuestionType, setNewQuestionType] = useState<'rating' | 'text' | 'yes_no' | 'select'>('rating');
  const [isSending, setIsSending] = useState<boolean>(false);

  // Sent Surveys History
  const [sentSurveys, setSentSurveys] = useState<SentSurveyItem[]>([]);

  const { auth } = useAuth();

  const canManageTemplates = 
    auth?.roleId === USER_ROLES.BUSINESS_ADMIN_USER || 
    auth?.roleId === USER_ROLES.LEADERSHIP_USER;

  // Security enforcement: redirect non-admin/leadership users away from builder/template tabs
  useEffect(() => {
    if (!canManageTemplates && (activeTab === 'create' || activeTab === 'templates')) {
      setActiveTab('ongoing');
    }
  }, [canManageTemplates, activeTab]);

  useEffect(() => {
    if (isOpen) {
      if (initialMaterialName) setSelectedMaterial(initialMaterialName);
      if (initialSupplierName) setSelectedSupplier(initialSupplierName);
    }
  }, [isOpen, initialMaterialName, initialSupplierName]);

  // 1. Fetch User Profile for FROM field and role fallback
  useEffect(() => {
    if (!isOpen) return;
    const fetchUserProfile = async () => {
      try {
        const profile: any = await getMyProfile();
        if (profile) {
          const aribaUser = profile.aribaUserName || profile.ariba_user_name || profile.aribaUsername || profile.email || profile.name || '';
          if (aribaUser) {
            setFrom(aribaUser);
          }
        }
      } catch (err) {
        console.warn("Could not fetch user profile for survey modal", err);
      }
    };
    fetchUserProfile();
  }, [isOpen]);

  // 2. Fetch Lookup Requesters for TO field based on material & supplier
  const fetchRequestersList = async (supName?: string, matName?: string) => {
    const s = supName !== undefined ? supName : selectedSupplier;
    const m = matName !== undefined ? matName : selectedMaterial;

    setRequestersLoading(true);
    try {
      const payload: any = {};
      if (s && s.trim()) payload.supplier_name = s.trim();
      if (m && m.trim()) payload.material_name = m.trim();

      const res = await fetchLookupRequesters(payload);
      if (res && (res.status === 'success' || res.status === 200 || Array.isArray(res.data) || Array.isArray(res))) {
        const rawList = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
        const items = rawList.map((r: any) => {
          if (typeof r === 'string') return { label: r, value: r };
          if (r && typeof r === 'object') {
            const val = r.ariba_user_name || r.aribaUserName || r.requester || r.email || r.user_name || r.name || r.value || '';
            const lbl = r.name && r.name !== val ? `${r.name} (${val})` : (r.label || val);
            return { label: lbl, value: val };
          }
          return null;
        }).filter((item: any) => item && item.value);

        setRequestersOptions(items);
        if (items.length > 0) {
          setTo(prev => (items.some((it: any) => it.value === prev) ? prev : items[0].value));
        } else {
          setRequestersOptions([]);
        }
      } else {
        setRequestersOptions([]);
      }
    } catch (err) {
      console.warn("Error fetching lookup requesters for survey modal", err);
      setRequestersOptions([]);
    } finally {
      setRequestersLoading(false);
    }
  };

  // Load Templates from API on modal open
  useEffect(() => {
    if (isOpen) {
      fetchTemplatesFromApi();
    }
  }, [isOpen]);

  const fetchTemplatesFromApi = async () => {
    setIsLoadingTemplates(true);
    try {
      // 1. Fetch template names list from POST /parent/spend_analysis/api/v1/template_name
      let tNames: string[] = [];
      try {
        const namesRes = await fetchTemplateNames("PROCUREMENT_PERFORMANCE");
        if (namesRes && Array.isArray(namesRes.template_names)) {
          tNames = namesRes.template_names;
          setTemplateNamesList(tNames);
        }
      } catch (e) {
        console.warn("Could not load template names", e);
      }

      // 2. Fetch template details for all templates
      if (tNames.length > 0) {
        try {
          const detailPromises = tNames.map(async (name) => {
            try {
              const res = await getTemplateDetails({ template_name: name });
              if (res) {
                const rawObj = Array.isArray(res) ? (res[0] || {}) : (res.data || res);
                const qList = rawObj.questions || (Array.isArray(res) ? res : []);
                return {
                  id: rawObj.template_id || name,
                  name: rawObj.template_name || name,
                  description: `Backend survey template with ${qList.length} questions`,
                  questions: Array.isArray(qList)
                    ? qList.map((q: any, qIdx: number) => ({
                        id: q.question_id || q.id || qIdx + 1,
                        text: q.question || q.text || q.question_text || q.title || (typeof q === 'string' ? q : ''),
                        type: (q.type as any) || 'text'
                      }))
                    : []
                } as SurveyTemplate;
              }
            } catch (err) {
              console.warn(`Error fetching details for template ${name}`, err);
            }
            return null;
          });

          const results = await Promise.all(detailPromises);
          const formatted = results.filter(Boolean) as SurveyTemplate[];

          setSavedTemplates(formatted);
          if (formatted.length > 0) {
            setSelectedTemplateId(formatted[0].id);
            setSurveyTitle(formatted[0].name);
            setQuestions(formatted[0].questions.map(q => ({
              id: q.id,
              text: q.text || (q as any).question || '',
              type: q.type
            })));
          }
        } catch (detailErr) {
          console.warn("Error fetching templates details batch", detailErr);
        }
      }
    } catch (err) {
      console.warn('Backend templates API returned an error or is offline.', err);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  // Select a preset template by ID or Name
  const handleSelectTemplate = async (templateIdOrName: string) => {
    setSelectedTemplateId(templateIdOrName);
    if (!templateIdOrName) return;

    // Check locally in savedTemplates
    let tpl = savedTemplates.find(t => t.id === templateIdOrName || t.name === templateIdOrName);

    if (!tpl || tpl.questions.length === 0) {
      // Fetch details from backend API for this template name: { template_name: templateIdOrName }
      try {
        setIsLoadingTemplates(true);
        const res = await getTemplateDetails({ template_name: templateIdOrName });
        if (res) {
          const rawObj = Array.isArray(res) ? (res[0] || {}) : (res.data || res);
          const qList = rawObj.questions || (Array.isArray(res) ? res : []);
          tpl = {
            id: rawObj.template_id || templateIdOrName,
            name: rawObj.template_name || templateIdOrName,
            description: `Backend template with ${qList.length} questions`,
            questions: Array.isArray(qList)
              ? qList.map((q: any, qIdx: number) => ({
                  id: q.question_id || q.id || qIdx + 1,
                  text: q.question || q.text || q.question_text || q.title || (typeof q === 'string' ? q : ''),
                  type: (q.type as any) || 'text'
                }))
              : []
          };
          setSavedTemplates(prev => [tpl!, ...prev.filter(p => p.name !== tpl!.name && p.id !== tpl!.id)]);
        }
      } catch (err) {
        console.warn('Failed to fetch details for selected template name', err);
      } finally {
        setIsLoadingTemplates(false);
      }
    }

    if (tpl) {
      setSurveyTitle(tpl.name);
      setQuestions(tpl.questions.map(q => ({
        id: q.id,
        text: q.text || (q as any).question || '',
        type: q.type
      })));
      toast.info(`Loaded template: "${tpl.name}" (${tpl.questions.length} questions)`);
    }
  };

  // Add a new question dynamically
  const handleAddNewQuestionDirect = () => {
    const promptText = newQuestionText.trim();
    if (!promptText) {
      toast.warn('Please enter a question prompt text.');
      return;
    }
    const newId = Date.now();
    setQuestions(prev => [
      ...prev,
      { id: newId, text: promptText, type: newQuestionType }
    ]);
    setNewQuestionText('');
  };

  // Remove a question
  const handleRemoveQuestion = (id: number) => {
    if (questions.length <= 1) {
      toast.warn('Survey template must contain at least 1 question.');
      return;
    }
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  // Reorder Questions
  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === questions.length - 1)) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...questions];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setQuestions(updated);
  };

  // Update question text or type
  const handleUpdateQuestion = (id: number, text: string, type: 'rating' | 'text' | 'yes_no' | 'select') => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, text, type } : q));
  };

  // Save current dynamic questions as a new template via API
  const handleSaveCurrentAsTemplate = async () => {
    const nameToSave = newTemplateName.trim() || surveyTitle;
    if (!nameToSave) {
      toast.error('Please enter a name for your custom template.');
      return;
    }

    const payload: CreateTemplatePayload = {
      template_name: nameToSave,
      questions: questions.map(q => ({
        question: q.text,
        type: q.type
      }))
    };

    setIsLoadingTemplates(true);
    try {
      // 1. Create Template API
      await createSurveyTemplate(payload);
      toast.success(`Custom template "${nameToSave}" created successfully!`);

      // 2. Call template_name API again to get updated template names list
      try {
        const namesRes = await fetchTemplateNames("PROCUREMENT_PERFORMANCE");
        if (namesRes && Array.isArray(namesRes.template_names)) {
          setTemplateNamesList(namesRes.template_names);
        }
      } catch (e) {
        console.warn("Could not re-fetch template names after creation", e);
      }

      // 3. Pass template_name to get_template_details API
      try {
        const res = await getTemplateDetails({ template_name: nameToSave });
        if (res) {
          const rawObj = Array.isArray(res) ? (res[0] || {}) : (res.data || res);
          const qList = rawObj.questions || (Array.isArray(res) ? res : []);
          const createdTpl: SurveyTemplate = {
            id: rawObj.template_id || nameToSave,
            name: rawObj.template_name || nameToSave,
            description: `Backend survey template with ${qList.length} questions`,
            questions: Array.isArray(qList) && qList.length > 0
              ? qList.map((q: any, qIdx: number) => ({
                  id: q.question_id || qIdx + 1,
                  text: q.question || q.text || `Question #${qIdx + 1}`,
                  type: (q.type as any) || 'text'
                }))
              : questions.map(q => ({ ...q }))
          };

          setSavedTemplates(prev => [createdTpl, ...prev.filter(p => p.name !== nameToSave && p.id !== createdTpl.id)]);
          setSelectedTemplateId(createdTpl.id);
          setSurveyTitle(createdTpl.name);
        }
      } catch (detailErr) {
        console.warn("Could not fetch detail template after creation", detailErr);
      }
    } catch (err) {
      console.warn('Create_template API call failed, saved locally.', err);
      toast.info(`Custom template "${nameToSave}" saved locally.`);
      
      const localTpl: SurveyTemplate = {
        id: `tpl-${Date.now()}`,
        name: nameToSave,
        description: `Custom user template with ${questions.length} questions.`,
        questions: [...questions]
      };
      setSavedTemplates(prev => [localTpl, ...prev]);
      setSelectedTemplateId(localTpl.id);
    } finally {
      setIsLoadingTemplates(false);
      setIsSavingTemplate(false);
      setNewTemplateName('');
    }
  };

  // Update questions for an existing template via update template questions API
  const handleUpdateExistingTemplateQuestions = async () => {
    const activeTpl = savedTemplates.find(t => t.id === selectedTemplateId || t.name === selectedTemplateId);
    const targetTemplateName = activeTpl ? activeTpl.name : (surveyTitle.trim() || selectedTemplateId);

    if (!targetTemplateName) {
      toast.error('Please select a template to update.');
      return;
    }

    if (questions.length === 0) {
      toast.warn('Please add at least 1 question to update the template.');
      return;
    }

    const payload: UpdateTemplateQuestionsPayload = {
      template_name: targetTemplateName,
      questions: questions.map((q, idx) => ({
        question_id: idx + 1,
        question: q.text,
        type: q.type
      }))
    };

    try {
      setIsLoadingTemplates(true);
      const res = await updateTemplateQuestions(payload);
      toast.success(res?.message || `Template "${targetTemplateName}" questions updated successfully!`);

      setSavedTemplates(prev => prev.map(t => {
        if (t.name === targetTemplateName || t.id === selectedTemplateId) {
          return {
            ...t,
            questions: [...questions]
          };
        }
        return t;
      }));
    } catch (err: any) {
      console.error('Failed to update template questions', err);
      toast.error(err?.response?.data?.message || 'Failed to update template questions on backend.');
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  // Submit Template Answers (POST /parent/spend_analysis/api/v1/enter template answers)
  const handleSendSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial) {
      toast.error('Please select a material for the survey.');
      return;
    }
    const targetTo = to.trim();
    if (!targetTo) {
      toast.error('Please select or enter a recipient (To).');
      return;
    }

    const payload: EnterTemplateAnswersPayload = {
      survey_id: 0,
      from_id: from || 'User',
      to_id: targetTo,
      template_name: surveyTitle,
      template_id: selectedTemplateId || 'T100',
      answers: userAnswers
    };

    setIsSending(true);
    try {
      const res = await enterTemplateAnswers(payload);
      const surveyId = res?.survey_id || `S${Math.floor(100 + Math.random() * 900)}`;
      toast.success(res?.message || `Survey answers submitted successfully to ${targetTo}!`);

      const newSentItem: SentSurveyItem = {
        id: surveyId,
        materialName: selectedMaterial,
        supplierName: selectedSupplier,
        surveyTitle,
        recipient: targetTo,
        from: from || 'Me',
        questionsCount: questions.length,
        sentDate: new Date().toISOString().split('T')[0],
        status: 'Sent',
        responses: questions.map((q, qIdx) => {
          const key = q.id || q.text || `Q${qIdx + 1}`;
          return {
            questionText: q.text,
            answer: userAnswers[key] !== undefined ? userAnswers[key] : 'No answer provided'
          };
        })
      };

      setSentSurveys(prev => [newSentItem, ...prev]);
      setActiveTab('sent');
    } catch (err: any) {
      console.error('Failed to submit template answers', err);
      toast.error(err?.response?.data?.message || 'Failed to submit survey answers to backend.');
    } finally {
      setIsSending(false);
    }
  };

  // View survey details via API: get_survey_details
  const handleViewResponses = async (survey: SentSurveyItem) => {
    setViewingResponsesFor(survey);
    setIsLoadingDetails(true);
    try {
      const details = await getSurveyDetails(survey.id);
      if (details && details.answers) {
        // If API returns detailed answers object
        const apiResponses = Object.entries(details.answers).map(([key, val]) => ({
          questionText: `Question Key: ${key}`,
          answer: String(val)
        }));
        if (apiResponses.length > 0) {
          setViewingResponsesFor(prev => prev ? { ...prev, responses: apiResponses } : prev);
        }
      }
    } catch (err) {
      console.warn(`get_survey_details API unavailable for ${survey.id}, showing existing responses.`, err);
    } finally {
      setIsLoadingDetails(false);
    }
  };


  const filteredMaterials = allAvailableMaterials.filter(m => 
    m && m.toLowerCase().includes(materialSearchQuery.toLowerCase())
  );

  const filteredSuppliers = allAvailableSuppliers.filter(s => 
    s && s.toLowerCase().includes(supplierSearchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(3px)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onClose}>
      <div style={{ backgroundColor: '#ffffff', borderRadius: '1rem', width: '100%', maxWidth: '860px', maxHeight: '92vh', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '0.625rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ClipboardList width={22} height={22} color="#2563eb" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: '#0f172a' }}>Material Survey & Form Builder</h3>
              <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Design dynamic questions, load templates & send vendor forms</span>
            </div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: '#f1f5f9', cursor: 'pointer', color: '#64748b', padding: '0.5rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X width={18} height={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{ padding: '0.75rem 1.5rem 0 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '1.5rem' }}>
          <button
            type="button"
            onClick={() => setActiveTab('ongoing')}
            style={{ padding: '0.625rem 0', fontSize: '0.875rem', fontWeight: 700, color: activeTab === 'ongoing' ? '#2563eb' : '#64748b', borderBottom: activeTab === 'ongoing' ? '2px solid #2563eb' : '2px solid transparent', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <Send width={15} height={15} />
            <span>Survey Ongoing</span>
          </button>
          {canManageTemplates && (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('create')}
                style={{ padding: '0.625rem 0', fontSize: '0.875rem', fontWeight: 700, color: activeTab === 'create' ? '#2563eb' : '#64748b', borderBottom: activeTab === 'create' ? '2px solid #2563eb' : '2px solid transparent', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
              >
                <Plus width={15} height={15} />
                <span>Form Builder</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('templates')}
                style={{ padding: '0.625rem 0', fontSize: '0.875rem', fontWeight: 700, color: activeTab === 'templates' ? '#2563eb' : '#64748b', borderBottom: activeTab === 'templates' ? '2px solid #2563eb' : '2px solid transparent', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
              >
                <BookOpen width={15} height={15} />
                <span>Templates ({savedTemplates.length})</span>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setActiveTab('sent')}
            style={{ padding: '0.625rem 0', fontSize: '0.875rem', fontWeight: 700, color: activeTab === 'sent' ? '#2563eb' : '#64748b', borderBottom: activeTab === 'sent' ? '2px solid #2563eb' : '2px solid transparent', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <span>Sent Surveys & Responses</span>
            <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', fontSize: '0.6875rem', fontWeight: 800, padding: '0.125rem 0.4rem', borderRadius: '999px' }}>{sentSurveys.length}</span>
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, backgroundColor: '#ffffff' }}>
          {activeTab === 'ongoing' ? (
            <form onSubmit={handleSendSurvey} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Template Selector Bar */}
              <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '0.75rem', padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0369a1', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <span>Select Template Preset:</span>
                    {isLoadingTemplates && <Loader2 className="animate-spin" width={14} height={14} color="#0284c7" />}
                  </span>
                  <select
                    value={selectedTemplateId}
                    onChange={e => handleSelectTemplate(e.target.value)}
                    style={{ flex: 1, padding: '0.4rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #7dd3fc', fontSize: '0.8125rem', fontWeight: 600, color: '#0c4a6e', backgroundColor: '#ffffff', cursor: 'pointer' }}
                  >
                    <option value="">-- Choose Template Preset --</option>
                    {savedTemplates.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.questions.length} Qs)</option>
                    ))}
                    {templateNamesList
                      .filter(name => !savedTemplates.some(st => st.name === name || st.id === name))
                      .map((name, idx) => (
                        <option key={`name-${idx}`} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Target Material & Target Supplier Picker */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Target Material Picker */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155' }}>Target Material</label>
                    <button
                      type="button"
                      onClick={() => setCustomMaterialInput(prev => !prev)}
                      style={{ border: 'none', background: 'none', color: '#2563eb', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      {customMaterialInput ? 'Select from list' : 'Type custom material'}
                    </button>
                  </div>

                  {customMaterialInput || allAvailableMaterials.length === 0 ? (
                    <input
                      type="text"
                      placeholder="Type material name..."
                      value={selectedMaterial}
                      onChange={e => {
                        const val = e.target.value;
                        setSelectedMaterial(val);
                        fetchRequestersList(selectedSupplier, val);
                      }}
                      style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.875rem', color: '#0f172a', outline: 'none' }}
                      required
                    />
                  ) : (
                    <div style={{ position: 'relative' }}>
                      <div 
                        onClick={() => setIsDropdownOpen(prev => !prev)}
                        style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.875rem', fontWeight: 600, color: selectedMaterial ? '#0f172a' : '#94a3b8', backgroundColor: '#ffffff', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      >
                        <span>{selectedMaterial || 'Select or search material...'}</span>
                        <Search width={16} height={16} color="#64748b" />
                      </div>

                      {isDropdownOpen && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '0.25rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '0.5rem', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', zIndex: 50, maxHeight: '220px', overflowY: 'auto', padding: '0.5rem' }}>
                          <input
                            type="text"
                            placeholder="Filter material list..."
                            value={materialSearchQuery}
                            onChange={e => setMaterialSearchQuery(e.target.value)}
                            style={{ width: '100%', padding: '0.375rem 0.625rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1', fontSize: '0.8125rem', outline: 'none', marginBottom: '0.5rem', color: '#0f172a' }}
                            autoFocus
                          />
                          {filteredMaterials.length > 0 ? (
                            filteredMaterials.slice(0, 50).map((mat, idx) => (
                              <div
                                key={idx}
                                onClick={() => {
                                  setSelectedMaterial(mat);
                                  setIsDropdownOpen(false);
                                  fetchRequestersList(selectedSupplier, mat);
                                }}
                                style={{ padding: '0.5rem 0.75rem', fontSize: '0.8125rem', color: '#334155', cursor: 'pointer', borderRadius: '0.25rem', backgroundColor: selectedMaterial === mat ? '#eff6ff' : 'transparent' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#eff6ff'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                {mat}
                              </div>
                            ))
                          ) : (
                            <div style={{ padding: '0.5rem', fontSize: '0.8125rem', color: '#94a3b8', textAlign: 'center' }}>No materials match search</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Target Supplier Picker */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155' }}>Target Supplier</label>
                    <button
                      type="button"
                      onClick={() => setCustomSupplierInput(prev => !prev)}
                      style={{ border: 'none', background: 'none', color: '#2563eb', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      {customSupplierInput ? 'Select from list' : 'Type custom supplier'}
                    </button>
                  </div>

                  {customSupplierInput || allAvailableSuppliers.length === 0 ? (
                    <input
                      type="text"
                      placeholder="Type supplier name..."
                      value={selectedSupplier}
                      onChange={e => {
                        const val = e.target.value;
                        setSelectedSupplier(val);
                        fetchRequestersList(val, selectedMaterial);
                      }}
                      style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.875rem', color: '#0f172a', outline: 'none' }}
                    />
                  ) : (
                    <div style={{ position: 'relative' }}>
                      <div 
                        onClick={() => setIsSupplierDropdownOpen(prev => !prev)}
                        style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.875rem', fontWeight: 600, color: selectedSupplier ? '#0f172a' : '#94a3b8', backgroundColor: '#ffffff', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      >
                        <span>{selectedSupplier || 'Select or search supplier...'}</span>
                        <Search width={16} height={16} color="#64748b" />
                      </div>

                      {isSupplierDropdownOpen && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '0.25rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '0.5rem', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', zIndex: 50, maxHeight: '220px', overflowY: 'auto', padding: '0.5rem' }}>
                          <input
                            type="text"
                            placeholder="Filter supplier list..."
                            value={supplierSearchQuery}
                            onChange={e => setSupplierSearchQuery(e.target.value)}
                            style={{ width: '100%', padding: '0.375rem 0.625rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1', fontSize: '0.8125rem', outline: 'none', marginBottom: '0.5rem', color: '#0f172a' }}
                            autoFocus
                          />
                          {filteredSuppliers.length > 0 ? (
                            filteredSuppliers.slice(0, 50).map((sup, idx) => (
                              <div
                                key={idx}
                                onClick={() => {
                                  setSelectedSupplier(sup);
                                  setIsSupplierDropdownOpen(false);
                                  fetchRequestersList(sup, selectedMaterial);
                                }}
                                style={{ padding: '0.5rem 0.75rem', fontSize: '0.8125rem', color: '#334155', cursor: 'pointer', borderRadius: '0.25rem', backgroundColor: selectedSupplier === sup ? '#eff6ff' : 'transparent' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#eff6ff'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                {sup}
                              </div>
                            ))
                          ) : (
                            <div style={{ padding: '0.5rem', fontSize: '0.8125rem', color: '#94a3b8', textAlign: 'center' }}>No suppliers match search</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* From and To fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.375rem' }}>From (Sender / Requester)</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <User width={16} height={16} color="#64748b" style={{ position: 'absolute', left: '0.75rem', pointerEvents: 'none' }} />
                    <input
                      type="text"
                      value={from}
                      onChange={e => setFrom(e.target.value)}
                      placeholder="Sender username/email..."
                      style={{ width: '100%', padding: '0.625rem 0.875rem 0.625rem 2.25rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.875rem', color: '#0f172a', outline: 'none', backgroundColor: '#f8fafc' }}
                      required
                    />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155' }}>
                      To (Recipient) {requestersLoading && <Loader2 className="animate-spin" width={12} height={12} style={{ display: 'inline', marginLeft: '0.25rem' }} />}
                    </label>
                    <button
                      type="button"
                      onClick={() => setCustomToInput(prev => !prev)}
                      style={{ border: 'none', background: 'none', color: '#2563eb', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      {customToInput ? 'Select from list' : 'Type custom recipient'}
                    </button>
                  </div>

                  {customToInput || requestersOptions.length === 0 ? (
                    <input
                      type="text"
                      value={to}
                      onChange={e => setTo(e.target.value)}
                      placeholder="Enter recipient email or username..."
                      style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.875rem', color: '#0f172a', outline: 'none' }}
                      required
                    />
                  ) : (
                    <select
                      value={to}
                      onChange={e => setTo(e.target.value)}
                      style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.875rem', color: '#0f172a', outline: 'none', backgroundColor: '#ffffff', cursor: 'pointer' }}
                      required
                    >
                      {requestersOptions.map((opt, idx) => (
                        <option key={idx} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Survey Title */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.375rem' }}>Survey Title</label>
                <input
                  type="text"
                  value={surveyTitle}
                  onChange={e => setSurveyTitle(e.target.value)}
                  style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.875rem', color: '#0f172a', outline: 'none' }}
                  required
                />
              </div>

              {/* Interactive Survey Question Answering Mode */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#0f172a', display: 'block' }}>
                      Survey Questions & Answers ({questions.length})
                    </label>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Provide answers for the selected template questions below</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  {questions.length > 0 ? (
                    questions.map((q, index) => {
                      const qKey = q.id || q.text || `Q_${index + 1}`;
                      const qText = q.text || (q as any).question || `Question #${index + 1}`;
                      const currentVal = userAnswers[qKey];

                      return (
                        <div key={q.id || index} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.625rem', padding: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#2563eb' }}>Q{index + 1}.</span>
                            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>{qText}</span>
                            <span style={{ fontSize: '0.75rem', backgroundColor: '#f1f5f9', color: '#64748b', padding: '0.1rem 0.4rem', borderRadius: '0.25rem', textTransform: 'capitalize' }}>({q.type})</span>
                          </div>

                          {/* Answer Input Controls */}
                          {q.type === 'rating' ? (
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
                              {[1, 2, 3, 4, 5].map(star => {
                                const isSelected = currentVal === star;
                                return (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => setUserAnswers(prev => ({ ...prev, [qKey]: star }))}
                                    style={{
                                      padding: '0.45rem 0.875rem',
                                      borderRadius: '0.375rem',
                                      border: isSelected ? '1px solid #2563eb' : '1px solid #cbd5e1',
                                      backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                                      color: isSelected ? '#1d4ed8' : '#334155',
                                      fontWeight: isSelected ? 800 : 600,
                                      cursor: 'pointer',
                                      fontSize: '0.8125rem'
                                    }}
                                  >
                                    {star} ★
                                  </button>
                                );
                              })}
                            </div>
                          ) : q.type === 'yes_no' ? (
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                              {['Yes', 'No'].map(choice => {
                                const isSelected = currentVal === choice;
                                return (
                                  <button
                                    key={choice}
                                    type="button"
                                    onClick={() => setUserAnswers(prev => ({ ...prev, [qKey]: choice }))}
                                    style={{
                                      padding: '0.45rem 1.25rem',
                                      borderRadius: '0.375rem',
                                      border: isSelected ? '1px solid #059669' : '1px solid #cbd5e1',
                                      backgroundColor: isSelected ? '#ecfdf5' : '#ffffff',
                                      color: isSelected ? '#047857' : '#334155',
                                      fontWeight: isSelected ? 800 : 600,
                                      cursor: 'pointer',
                                      fontSize: '0.8125rem'
                                    }}
                                  >
                                    {choice}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <input
                              type="text"
                              placeholder="Type your answer here..."
                              value={currentVal || ''}
                              onChange={e => setUserAnswers(prev => ({ ...prev, [qKey]: e.target.value }))}
                              style={{ width: '100%', marginTop: '0.5rem', padding: '0.625rem 0.875rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1', fontSize: '0.8125rem', color: '#0f172a', outline: 'none' }}
                            />
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ padding: '2rem 1rem', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '0.5rem', border: '1px dashed #cbd5e1', color: '#64748b', fontSize: '0.8125rem' }}>
                      No questions found for this template. Select a template preset above or go to <strong>"Form Builder"</strong> to add questions.
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Footer */}
              <div style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={onClose}
                    style={{ padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSending}
                    style={{ padding: '0.625rem 1.5rem', borderRadius: '0.5rem', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontSize: '0.875rem', fontWeight: 700, cursor: isSending ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isSending ? 0.7 : 1 }}
                  >
                    {isSending ? <Loader2 className="animate-spin" width={16} height={16} /> : <Send width={16} height={16} />}
                    <span>{isSending ? 'Submitting Answers...' : 'Send Survey Template'}</span>
                  </button>
                </div>
              </div>
            </form>
          ) : activeTab === 'create' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Form Builder Header */}
              <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '0.75rem', padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0369a1', whiteSpace: 'nowrap' }}>
                    Select Template Preset to Edit:
                  </span>
                  <select
                    value={selectedTemplateId}
                    onChange={e => handleSelectTemplate(e.target.value)}
                    style={{ flex: 1, padding: '0.4rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #7dd3fc', fontSize: '0.8125rem', fontWeight: 600, color: '#0c4a6e', backgroundColor: '#ffffff', cursor: 'pointer' }}
                  >
                    <option value="">-- Select Template to Edit --</option>
                    {savedTemplates.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.questions.length} Qs)</option>
                    ))}
                    {templateNamesList
                      .filter(name => !savedTemplates.some(st => st.name === name || st.id === name))
                      .map((name, idx) => (
                        <option key={`name-${idx}`} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {selectedTemplateId && (
                    <button
                      type="button"
                      onClick={handleUpdateExistingTemplateQuestions}
                      title="Update questions in this existing template on backend"
                      style={{ background: '#7c3aed', color: '#ffffff', border: 'none', padding: '0.4rem 0.875rem', borderRadius: '0.375rem', fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem', whiteSpace: 'nowrap' }}
                    >
                      <Save width={14} height={14} />
                      <span>Update Template Questions</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsSavingTemplate(prev => !prev)}
                    style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '0.4rem 0.875rem', borderRadius: '0.375rem', fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem', whiteSpace: 'nowrap' }}
                  >
                    <Save width={14} height={14} />
                    <span>Save as New Template</span>
                  </button>
                </div>
              </div>

              {/* Save Custom Template Drawer inline */}
              {isSavingTemplate && (
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '0.5rem', padding: '0.875rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Enter new custom template name..."
                    value={newTemplateName}
                    onChange={e => setNewTemplateName(e.target.value)}
                    style={{ flex: 1, padding: '0.4rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1', fontSize: '0.8125rem', outline: 'none', color: '#0f172a' }}
                  />
                  <button
                    type="button"
                    onClick={handleSaveCurrentAsTemplate}
                    style={{ backgroundColor: '#059669', color: '#ffffff', border: 'none', padding: '0.4rem 1rem', borderRadius: '0.375rem', fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Confirm Save
                  </button>
                </div>
              )}

              {/* Template Title Input */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.375rem' }}>Template Name / Title</label>
                <input
                  type="text"
                  value={surveyTitle}
                  onChange={e => setSurveyTitle(e.target.value)}
                  style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.875rem', color: '#0f172a', outline: 'none' }}
                />
              </div>

              {/* Dynamic Question Builder */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#0f172a', display: 'block' }}>
                      Dynamic Template Questions ({questions.length})
                    </label>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Type custom question prompts below, select response type, or add new questions</span>
                  </div>
                </div>

                {/* Create New Question Composer Bar */}
                <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.625rem', padding: '0.875rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e40af' }}>Enter Question Prompt Text</label>
                    <input
                      type="text"
                      placeholder="Type your question text here (e.g. Rate delivery speed)..."
                      value={newQuestionText}
                      onChange={e => setNewQuestionText(e.target.value)}
                      style={{ width: '100%', padding: '0.55rem 0.875rem', borderRadius: '0.375rem', border: '1px solid #93c5fd', fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a', outline: 'none', backgroundColor: '#ffffff' }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddNewQuestionDirect();
                        }
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e40af' }}>Select Answer Type</label>
                    <select
                      value={newQuestionType}
                      onChange={e => setNewQuestionType(e.target.value as any)}
                      style={{ padding: '0.55rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #93c5fd', fontSize: '0.8125rem', fontWeight: 600, color: '#1e40af', backgroundColor: '#ffffff', cursor: 'pointer', minWidth: '170px' }}
                    >
                      <option value="rating">Rating (1-5 Stars)</option>
                      <option value="yes_no">Yes / No Choice</option>
                      <option value="text">Text Response</option>
                      <option value="select">Multiple Choice</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddNewQuestionDirect}
                    style={{ marginTop: '1.125rem', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '0.55rem 1.125rem', borderRadius: '0.375rem', fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem', whiteSpace: 'nowrap' }}
                  >
                    <Plus width={15} height={15} />
                    <span>+ Add Question</span>
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {questions.length > 0 ? (
                    questions.map((q, index) => (
                      <div 
                        key={q.id} 
                        style={{ backgroundColor: '#f8fafc', padding: '0.875rem 1rem', borderRadius: '0.625rem', border: '1px solid #e2e8f0', display: 'flex', gap: '0.625rem', alignItems: 'center' }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                          <button type="button" onClick={() => handleMoveQuestion(index, 'up')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: index === 0 ? '#cbd5e1' : '#64748b' }} disabled={index === 0}>
                            <ArrowUp width={13} height={13} />
                          </button>
                          <button type="button" onClick={() => handleMoveQuestion(index, 'down')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: index === questions.length - 1 ? '#cbd5e1' : '#64748b' }} disabled={index === questions.length - 1}>
                            <ArrowDown width={13} height={13} />
                          </button>
                        </div>

                        <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#2563eb', minWidth: '24px' }}>#{index + 1}</span>
                        
                        <input
                          type="text"
                          value={q.text || (q as any).question || ''}
                          onChange={e => handleUpdateQuestion(q.id, e.target.value, q.type)}
                          placeholder="Enter your question prompt..."
                          style={{ flex: 1, minWidth: 0, padding: '0.55rem 0.875rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1', fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a', outline: 'none', backgroundColor: '#ffffff' }}
                        />
                        
                        <select
                          value={q.type}
                          onChange={e => handleUpdateQuestion(q.id, q.text, e.target.value as any)}
                          style={{ padding: '0.55rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', backgroundColor: '#ffffff', cursor: 'pointer', minWidth: '160px' }}
                        >
                          <option value="rating">Rating (1-5 Stars)</option>
                          <option value="yes_no">Yes / No Choice</option>
                          <option value="text">Text Response</option>
                          <option value="select">Multiple Choice</option>
                        </select>
                        
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(q.id)}
                          style={{ border: 'none', background: '#fee2e2', color: '#dc2626', padding: '0.55rem', borderRadius: '0.375rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Remove Question"
                        >
                          <Trash2 width={15} height={15} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '2rem 1rem', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '0.5rem', border: '1px dashed #cbd5e1', color: '#64748b', fontSize: '0.8125rem' }}>
                      No questions added yet. Click <strong>"+ Add Question"</strong> above to start building your survey template.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : activeTab === 'templates' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Saved Survey Templates Library</h4>
                  <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Select any template to inspect or load into your survey builder</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setQuestions([
                      { id: Date.now(), text: 'Enter new question prompt...', type: 'rating' }
                    ]);
                    setActiveTab('create');
                  }}
                  style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.375rem', fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
                >
                  <Plus width={15} height={15} />
                  <span>Create Brand New Template</span>
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                {savedTemplates.length > 0 ? (
                  savedTemplates.map(tpl => (
                    <div key={tpl.id} style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '0.75rem', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{tpl.name}</h4>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#eff6ff', color: '#2563eb', padding: '0.125rem 0.5rem', borderRadius: '1rem' }}>
                            {tpl.questions.length} Questions
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.8125rem', color: '#475569' }}>{tpl.description}</p>

                        <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                          {tpl.questions.map((q, qIdx) => (
                            <div key={q.id} style={{ fontSize: '0.75rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                              <span style={{ fontWeight: 700, color: '#2563eb' }}>Q{qIdx + 1}.</span>
                              <span>{q.text}</span>
                              <span style={{ fontSize: '0.6875rem', backgroundColor: '#f1f5f9', color: '#64748b', padding: '0.05rem 0.375rem', borderRadius: '0.25rem' }}>({q.type})</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => {
                            handleSelectTemplate(tpl.id);
                            setActiveTab('create');
                          }}
                          title="Edit and update questions for this template"
                          style={{ backgroundColor: '#7c3aed', color: '#ffffff', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.375rem', fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
                        >
                          <Save width={14} height={14} />
                          <span>Update Questions</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleSelectTemplate(tpl.id);
                            setActiveTab('ongoing');
                          }}
                          style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '0.5rem 1rem', borderRadius: '0.375rem', fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                          Use Template
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '3rem 1.5rem', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '0.75rem', border: '1px dashed #cbd5e1' }}>
                    <BookOpen width={32} height={32} color="#94a3b8" style={{ margin: '0 auto 0.5rem auto' }} />
                    <h5 style={{ margin: '0 0 0.25rem 0', fontSize: '0.9375rem', fontWeight: 700, color: '#334155' }}>No Saved Templates</h5>
                    <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b' }}>No backend templates found. Create and save a custom template using the Form Builder.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#475569' }}>Sent Material Surveys & Vendor Responses</div>
              {sentSurveys.map(survey => (
                <div key={survey.id} style={{ backgroundColor: '#ffffff', borderRadius: '0.75rem', border: '1px solid #e2e8f0', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563eb', backgroundColor: '#eff6ff', padding: '0.125rem 0.375rem', borderRadius: '0.25rem' }}>{survey.id}</span>
                      <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>{survey.surveyTitle}</h4>
                    </div>
                    <span style={{ fontSize: '0.8125rem', color: '#334155', fontWeight: 600 }}>Material: {survey.materialName}{survey.supplierName ? ` • Supplier: ${survey.supplierName}` : ''}</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>From: <strong>{survey.from || 'User'}</strong> → To: <strong>{survey.recipient}</strong> • Sent: {survey.sentDate} ({survey.questionsCount} Qs)</span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: survey.status === 'Completed' ? '#dcfce7' : survey.status === 'Sent' ? '#dbeafe' : '#fef3c7', color: survey.status === 'Completed' ? '#15803d' : survey.status === 'Sent' ? '#1d4ed8' : '#b45309', padding: '0.25rem 0.625rem', borderRadius: '999px' }}>
                      {survey.status}
                    </span>
                    {survey.responses && (
                      <button
                        type="button"
                        onClick={() => handleViewResponses(survey)}
                        style={{ border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '0.75rem', fontWeight: 700, padding: '0.375rem 0.75rem', borderRadius: '0.375rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        <BarChart2 width={14} height={14} />
                        <span>View Responses ({survey.responses.length})</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* View Responses Modal Drawer */}
          {viewingResponsesFor && (
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(3px)', zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setViewingResponsesFor(null)}>
              <div style={{ backgroundColor: '#ffffff', borderRadius: '0.75rem', width: '100%', maxWidth: '640px', padding: '1.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', gap: '1rem' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563eb' }}>{viewingResponsesFor.id} Response Details</span>
                    <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: '#0f172a' }}>{viewingResponsesFor.surveyTitle}</h3>
                  </div>
                  <button onClick={() => setViewingResponsesFor(null)} style={{ border: 'none', background: '#f1f5f9', cursor: 'pointer', padding: '0.375rem', borderRadius: '0.375rem' }}>
                    <X width={16} height={16} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '420px', overflowY: 'auto' }}>
                  {isLoadingDetails ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', gap: '0.5rem', color: '#2563eb', fontWeight: 700 }}>
                      <Loader2 className="animate-spin" width={20} height={20} />
                      <span>Loading API survey details...</span>
                    </div>
                  ) : (
                    viewingResponsesFor.responses?.map((resp, idx) => (
                      <div key={idx} style={{ backgroundColor: '#f8fafc', padding: '0.875rem 1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.375rem' }}>
                          Q{idx + 1}. {resp.questionText}
                        </span>
                        <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0f172a', backgroundColor: '#ffffff', padding: '0.5rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1' }}>
                          {typeof resp.answer === 'number' ? `⭐ ${resp.answer} / 5 Stars` : resp.answer}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
