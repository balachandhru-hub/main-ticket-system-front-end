import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, FileArchive, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { useLocation } from 'react-router-dom';
import BackButton from './BackButton';
import { uploadExtension, fetchExtension } from '../api/extensionApi';
import type { CompanyPreviewDto } from '../Dto/CompanyPreviewDto';
import type { ExtensionResponseDto } from '../Dto/ExtensionResponseDto';
import './UploadExtensionZip.css';

const UploadExtensionZip: React.FC = () => {
  const location = useLocation();
  const customer = location.state as CompanyPreviewDto;
  const domainId = customer?.id;

  const [currentFileName, setCurrentFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


useEffect(() => {
  if (!domainId) {
    setCurrentFileName('');
    return;
  }

  let mounted = true;
  async function loadExtension() {
    try {
      const result = await fetchExtension(domainId);
      if (!mounted) return;
      if ('fileName' in result && result.fileName) {
        setCurrentFileName(result.fileName);
      } else {
        setCurrentFileName('');
      }
    } catch (err) {
      if (mounted) setCurrentFileName('');
    }
  }

  loadExtension();
  return () => {
    mounted = false;
  };
}, [domainId]);

  

  const validateAndSetFile = useCallback((file: File | null) => {
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (file.type === 'application/zip' || file.name.endsWith('.zip')) {
      setSelectedFile(file);
    } else {
      toast.error('Please select a valid .zip file.');
      setSelectedFile(null);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      validateAndSetFile(e.dataTransfer.files[0]);
    },
    [validateAndSetFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    validateAndSetFile(file);
  };

  const openPicker = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    if (!domainId) {
      toast.error('Domain ID is missing. Please go back and select a domain.');
      return;
    }

    setIsUploading(true);
    const loadingToast = toast.loading('Uploading extension...');

    try {
      const response = await uploadExtension(selectedFile, domainId);

      if (response.statusCode === 200) {
        
        setCurrentFileName(selectedFile.name);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';

        
        try {
          const updatedResponse = await fetchExtension(domainId);
          if (updatedResponse.statusCode === 200) {
            const data = updatedResponse as ExtensionResponseDto;
            setCurrentFileName(data.fileName || '');
          }
        } catch (fetchErr) {
         
        }

        toast.update(loadingToast, {
          render: response.message || 'Extension updated successfully!',
          type: 'success',
          isLoading: false,
          autoClose: 4000,
        });
      } else {
        toast.update(loadingToast, {
          render: response.message || 'Upload failed. Please try again.',
          type: 'error',
          isLoading: false,
          autoClose: 4000,
        });
      }
    } catch (err) {
      toast.update(loadingToast, {
        render: 'Network error. Please check your connection.',
        type: 'error',
        isLoading: false,
        autoClose: 4000,
      });
      toast.error('Upload failed due to a network or server error.');
    } finally {
      setIsUploading(false);
    }
  };

  const hasCurrentFile = !!currentFileName;
  const hasNewFile = !!selectedFile;

  return (
    <div className="extupload-page">
      <div className="extupload-button-bar">
        <BackButton />
      </div>

      <div className="extupload-header">
        <h2 className="extupload-title">
          Extension Assets {customer?.domainName && `- ${customer.domainName}`}
        </h2>
      </div>

      <div className="extupload-cards-grid">

        <div className="extupload-asset-card">
          <h3 className="extupload-card-title"><FileArchive size={20} /> Chrome Extension (.zip)</h3>

          {hasCurrentFile && !hasNewFile && (
            <div className="extupload-current-file">
              <FileArchive size={18} />
              <span className="extupload-file-name" title={currentFileName}>{currentFileName}</span>
              <span className="extupload-file-status">Current</span>
            </div>
          )}

          {hasNewFile && (
            <div className="extupload-current-file">
              <FileArchive size={18} />
              <span className="extupload-file-name" title={selectedFile.name}>{selectedFile.name}</span>
              <button type="button" onClick={removeFile} className="extupload-remove-btn"><X size={16} /></button>
            </div>
          )}

              {!hasCurrentFile && !hasNewFile && <div className="extupload-no-file">No extension ZIP uploaded</div>}

          <div
          className={`extupload-drop-zone ${isDragging ? 'extupload-dragging' : ''} ${hasNewFile ? 'extupload-has-file' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={openPicker}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip,application/zip"
              onChange={handleInputChange}
              className="extupload-file-input"
              onClick={(e) => e.stopPropagation()}
            />
            <Upload size={24} className="extupload-upload-icon" />
            <p className="extupload-drop-text"><strong>Click to select or drag and drop</strong></p>
            <p className="extupload-drop-hint">Only .zip files allowed</p>
          </div>

          {hasNewFile && (
                        <button onClick={handleUpload} disabled={isUploading} className="extupload-upload-action-btn">
                {isUploading ? <><Loader2 className="animate-spin" size={18} /> Uploading...</> : <><RefreshCw size={18} /> Update Extension</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadExtensionZip;
