// src/components/BackButton.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import "./BackButton.css";

interface BackButtonProps {
  label?: string;
  className?: string;
  iconClassName?: string;
  onClick?: () => void;
}

const BackButton: React.FC<BackButtonProps> = ({
  label = "Back",
  className = "CD-back-button",
  iconClassName = "CD-add-icon",
  onClick,
}) => {
  const navigate = useNavigate();

  return (
    <div className={className} onClick={onClick || (() => navigate(-1))}>
      <FaArrowLeft className={iconClassName} />
      <span>{label}</span>
    </div>
  );
};

export default BackButton;
