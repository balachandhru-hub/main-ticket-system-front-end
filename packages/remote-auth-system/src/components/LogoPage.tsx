import React, { useState, useEffect, useRef } from "react";
import BackButton from "./BackButton";
import "./LogoPage.css";
import { toast } from "react-toastify";
import { useAuth } from "../components/context/AuthContext";
import { ASSET_TYPES, ENTITY_TYPE } from "../common/common";
import { assetUpload } from "../api/assetApi";
import { getDomainLogo } from "../api/domainApi"; // new API function
import type { AssetUploadDto } from "../Dto/AssetUploadDto";
import type { SuccessResponseDto } from "../Dto/SuccessResponseDto";
import type { ErrorResponseDto } from "../Dto/ErrorResponseDto";

function isSuccessResponse(
  data: SuccessResponseDto | ErrorResponseDto
): data is SuccessResponseDto {
  return !!data && "id" in data;
}

const LogoPage: React.FC = () => {
  const auth = useAuth();
  const domainId = auth?.auth?.domainId || "";
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch existing logo
  useEffect(() => {
    const fetchLogo = async () => {
      setIsLoading(true);
      try {
        const existing = await getDomainLogo();
        if ("fileBytes" in existing && "contentType" in existing) {
          if ("fileBytes" in existing && "contentType" in existing) {
            const mimeType = existing.contentType?.includes('/')
              ? existing.contentType
              : `image/${existing.contentType?.toLowerCase() || 'png'}`;
            const dataUrl = `data:${mimeType};base64,${existing.fileBytes}`;
            setSelectedImage(dataUrl);
          }
        }
      } catch (err) {

      } finally {
        setIsLoading(false);
      }
    };
    fetchLogo();
  }, [domainId]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newFile = event.target.files?.[0];
    if (newFile) {
      const allowedTypes = ["image/png", "image/jpeg"];
      if (!allowedTypes.includes(newFile.type)) {
        toast.error("Only PNG and JPG formats are allowed.");
        return;
      }
      setFile(newFile);
      const previewUrl = URL.createObjectURL(newFile);
      setSelectedImage(previewUrl);
    }
  };

  // Upload file
  const handleUpload = async () => {
    if (!file || !domainId) {
      toast.error("Please select a file first.");
      return;
    }

    if (isUploading) {
      return; // Prevent multiple uploads
    }

    setIsUploading(true); // Start loading

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = (reader.result as string).split(",")[1];

      const payload: AssetUploadDto = {
        entityType: ENTITY_TYPE.DOMAIN,
        entityId: domainId,
        assetType: ASSET_TYPES.DOMAIN_LOGO,
        fileBytes: base64String,
        contentType: file.type,
        fileName: file.name,
        isSingletonAsset: true,
      };

      try {
        const result = await assetUpload(payload);

        if (!isSuccessResponse(result)) {
          toast.error(result.message || "Logo upload failed");
          return;
        }

        // Update preview after successful upload
        setSelectedImage(`data:${file.type};base64,${base64String}`);
        toast.success("Logo uploaded successfully!");
        setIsModalOpen(false);
        setFile(null); // reset file

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } catch (err) {

        toast.error("Upload failed. Please try again.");
      } finally {
        setIsUploading(false); // End loading
      }
    };

    reader.readAsDataURL(file);
  };

  // Handle modal close - reset upload state
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsUploading(false);
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="logo-page-wrapper">
      <div className="back-button-section">
        <BackButton />
      </div>

      <div className="title-section">
        <h2 className="logo-title">Logo Upload</h2>
      </div>

      <div className="upload-button-section">
        <button className="open-popup-btn" onClick={() => setIsModalOpen(true)}>
          Upload New Logo
        </button>
      </div>

      <div className="logo-section">
        <div className="logo-preview">
          {isLoading ? (
            <p>Loading...</p>
          ) : selectedImage ? (
            <div className="logo-img-wrapper">
              <img src={selectedImage} alt="Uploaded Logo" className="logo-img" />
            </div>
          ) : (
            <img
              src={selectedImage ?? "/assets/CAS-logo.png"}
              alt="Domain Logo"
              className="default-logo-img"
            />
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="popup-overlay">
          <div className="popup-view">
            <div className="popup-top">
              <span
                className="close-icon"
                onClick={handleCloseModal}
                style={{ cursor: isUploading ? 'not-allowed' : 'pointer' }}
              >
                ×
              </span>
            </div>
            <h3 className="popup-title">Upload Logo</h3>

            <input
              type="file"
              accept="image/png, image/jpeg"
              ref={fileInputRef}
              onChange={handleImageChange}
              disabled={isUploading}
            />

            <div className="preview-container">
              {selectedImage && (
                <img src={selectedImage} alt="Preview" className="preview-img" />
              )}
            </div>

            <button
              className="upload-btn"
              onClick={handleUpload}
              disabled={isUploading || !file}
              style={{
                opacity: isUploading || !file ? 0.6 : 1,
                cursor: isUploading || !file ? 'not-allowed' : 'pointer'
              }}
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogoPage;