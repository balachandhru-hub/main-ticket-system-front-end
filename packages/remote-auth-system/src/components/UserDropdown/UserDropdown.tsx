import React, { useEffect, useState } from "react";
import "./UserDropdown.css";
import { Settings, HelpCircle, LogOut, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getMyProfile } from "../../api/userApi";
import type { ProfileResponseDto } from "../../Dto/ProfileResponseDto";
import type { ErrorResponseDto } from "../../Dto/ErrorResponseDto";
import { toast } from "react-toastify";
import ErrorModel from "../ErrorModel";
import { ResetPassword } from "../ResetPassword";
import { assetGetById } from "../../api/assetApi";
import { logoutUser } from "../../api/authApi";
import { useAuth } from "../context/AuthContext";
import { USER_ROLES } from "../../common/common";
import { clearMicrosoftCache } from "../../api/microsoftAuthApi";
import { MdOutlineLockReset } from "react-icons/md";
const UserDropdown: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<
    ProfileResponseDto | ErrorResponseDto | null
  >(null);
  const navigate = useNavigate();
  const [errorPage, setErrorPage] = useState(false);
  const [errorPageData, setErrorPageData] = useState({
    title: "",
    message: "",
  });
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const auth = useAuth();

  const toggleDropdown = () => setOpen(!open);
  const closeDropdown = () => setOpen(false);

  const handleEditProfile = () => {
    if (profile && isProfileResponse(profile)) {
      navigate("/profile", { state: { profile } });
      setOpen(false);
    }
  };

  const handleAccountSettings = () => {
    navigate("/account-settings");
    setOpen(false);
  };

  const openResetModal = () => {
    if (!auth?.auth?.userId) {
      toast.error("Unable to identify user for password reset.");
      return;
    }
    setShowResetModal(true);
    setOpen(false);
  };

  const closeResetModal = () => setShowResetModal(false);

  function isProfileResponse(
    response: ProfileResponseDto | ErrorResponseDto
  ): response is ProfileResponseDto {
    return "personName" in response;
  }

  function isErrorResponse(
    response: ProfileResponseDto | ErrorResponseDto
  ): response is ErrorResponseDto {
    return "message" in response && "description" in response;
  }

  const handleSupportClick = () => {
    window.location.href =
      "mailto:support@example.com?subject=Support%20Request";
    closeDropdown();
  };

  const fetchProfile = async () => {
    try {
      const response = await getMyProfile();
      if (isProfileResponse(response)) {
        setProfile(response);

        const profileImageAsset = response.asset?.find(
          (a) => a.assetType === "PROFILE_IMAGE"
        );
        if (profileImageAsset?.id) {
          try {
            const assetResponse = await assetGetById(profileImageAsset.id);
            if (
              "fileBytes" in assetResponse &&
              "contentType" in assetResponse
            ) {
              const dataUrl = `data:${assetResponse.contentType};base64,${assetResponse.fileBytes}`;
              setProfileImage(dataUrl);
            }
          } catch (err) {
            alert("Failed to fetch profile image asset");
          }
        }
      } else if (isErrorResponse(response) && response.statusCode === 401) {
        setErrorPage(true);
        setErrorPageData({
          ...errorPageData,
          title: response.message,
          message: response.description,
        });
      }
    } catch (error: any) {
      toast(error);
      toast.error(
        error?.response?.data?.message || "Unable to fetch the profile details"
      );
    }
  };

  useEffect(() => {
    fetchProfile();

    const channel = new BroadcastChannel("profile-channel");
    channel.onmessage = (event) => {
      if (event.data === "avatar-updated") {
        fetchProfile();
      }
    };

    return () => channel.close();
  }, [navigate]);

  const handleModalConfirm = () => {
    setErrorPage(false);
    navigate("/");
  };

  const handleModalClose = () => {
    setErrorPage(false);
    navigate("/");
  };

const handleLogout = async () => {
  try {
    // ✅ Step 1: Clear all MSAL cache data (no popup, no redirect)
    clearMicrosoftCache();

    // ✅ Step 2: Clear app session data
    localStorage.clear();
    sessionStorage.clear();

    // ✅ Step 3: Call your backend logout (if it clears server cookie/session)
    const response = await logoutUser();

    // ✅ Step 4: Redirect or show success
    if (response?.statusCode === 200) {
      setErrorPageData({
        title: "",
        message: "Sign out successful.",
      });
      setErrorPage(true);
    } else {
      // Handle 401 or others gracefully
      setErrorPage(true);
      setErrorPageData({
        title: response?.message || "Logged Out",
        message: response?.description || "You have been signed out.",
      });
    }

    setTimeout(() => {
      navigate("/login");
    }, 800);
  } catch (error: any) {
    toast.error(error?.response?.data?.message || "Logout failed.");
    localStorage.clear();
    sessionStorage.clear();
  }
};
  return (
    <div className="user-dropdown" onBlur={closeDropdown} tabIndex={0}>
      <div className="user-trigger" onClick={toggleDropdown}>
        <img
          src={profileImage || "/assets/avatar.png"}
          alt="User Avatar"
          className="avatar"
        />
        <span className="username">
          {profile && isProfileResponse(profile) ? profile.personName : ""}
        </span>
        <span className="arrow">▾</span>
      </div>

      {open && (
        <div className="dropdown-menu">
          <div className="user-info">
            <div className="name">
              {profile && isProfileResponse(profile) ? profile.personName : ""}
            </div>
            <div className="email">
              {profile && isProfileResponse(profile) ? profile.email : ""}
            </div>
          </div>

          <div className="dropdown-item" onClick={handleEditProfile}>
            <Pencil className="dropdown-icon" />
            Edit Profile
          </div>


{profile &&
            isProfileResponse(profile) &&
          (
                auth?.auth?.roleId === USER_ROLES.BUSINESS_USER ||
                auth?.auth?.roleId === USER_ROLES.LEADERSHIP_USER ||
                auth?.auth?.roleId === USER_ROLES.OPERATIONS_USER ||
                auth?.auth?.roleId === USER_ROLES.FINANCE_OPERATION_USER ||
                auth?.auth?.roleId === USER_ROLES.SUPPLIER_USER || auth?.auth?.roleId===USER_ROLES.FINANCE_USER ) && (
              <div className="dropdown-item" onClick={openResetModal}>
                <MdOutlineLockReset className="dropdown-icon-reset" />
               Reset Password
              </div>
            )}
          {profile &&
            isProfileResponse(profile) &&
           (auth?.auth?.roleId === USER_ROLES.BUSINESS_ADMIN_USER) && (
              <div className="dropdown-item" onClick={handleAccountSettings}>
                <Settings className="dropdown-icon" />
                Account Settings
              </div>
            )}

          <div className="dropdown-item" onClick={handleSupportClick}>
            <HelpCircle className="dropdown-icon" />
            Support
          </div>

          <hr />

          <div className="dropdown-item logout" onClick={handleLogout}>
            <LogOut className="dropdown-icon" />
            Sign Out
          </div>
        </div>
      )}

      {errorPage && (
        <ErrorModel
          visible={true}
          title={errorPageData.title}
          message={errorPageData.message}
          onClose={handleModalClose}
          onConfirm={handleModalConfirm}
        />
      )}
      {showResetModal && auth?.auth?.userId && (
        <ResetPassword userId={auth.auth.userId} onClose={closeResetModal} />
      )}
    </div>
  );
};

export default UserDropdown;