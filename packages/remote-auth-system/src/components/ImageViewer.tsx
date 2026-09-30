
import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { assetGetById } from "../api/assetApi";
import BackButton from "./BackButton";
import "./ImageViewer.css";

const ImageViewer: React.FC = () => {
  const location = useLocation();
  const { assets = [], selectedAssetId } = (location.state as any) || {};

  const [currentIndex, setCurrentIndex] = useState(() => {
    if (!assets || !Array.isArray(assets)) return 0;
    const idx = assets.findIndex((a: any) => a.id === selectedAssetId);
    return idx >= 0 ? idx : 0;
  });

  const [imageSrc, setImageSrc] = useState("");
  const [fileName, setFileName] = useState("Loading...");

  useEffect(() => {
    if (!assets || assets.length === 0) return;

    const loadImage = async () => {
      try {
        const asset = assets[currentIndex];
        const res = await assetGetById(asset.id);
        if (res && "fileBytes" in res) {
          const mimeType = res.contentType?.includes('/') ? res.contentType : `image/${res.contentType?.toLowerCase() || 'png'}`;
          setImageSrc(`data:${mimeType};base64,${res.fileBytes}`);
          setFileName(res.fileName || `Image ${currentIndex + 1}`);
        }
      } catch {
        setFileName("Failed to load image");
      }
    };

    loadImage();
  }, [currentIndex, assets]);

  if (!assets || assets.length === 0) {
    return <div className="image-viewer-empty">No images available</div>;
  }

  return (
    <div className="image-viewer-container">

      <div className="image-viewer-back-wrapper">
        <BackButton />
      </div>

      <h1 className="image-viewer-title">{fileName}</h1>


      <div className="image-viewer-content">
        <div className="image-viewer-image-wrapper">
          <img src={imageSrc} alt={fileName} className="image-viewer-image" />

          {currentIndex > 0 && (
            <button onClick={() => setCurrentIndex(i => i - 1)} className="image-viewer-arrow image-viewer-arrow-left">
              <ChevronLeft size={24} strokeWidth={2.5} />
            </button>
          )}

          {currentIndex < assets.length - 1 && (
            <button onClick={() => setCurrentIndex(i => i + 1)} className="image-viewer-arrow image-viewer-arrow-right">
              <ChevronRight size={24} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>


      <div className="image-viewer-counter">
        {currentIndex + 1} of {assets.length}
      </div>
    </div>
  );
};

export default ImageViewer;