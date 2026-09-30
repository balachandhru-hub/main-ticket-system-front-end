import React, { useEffect, useRef, useState } from 'react';
import './ProfilePage.css';
import { Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import type { AssetUploadDto } from '../Dto/AssetUploadDto';
import { assetUpload, assetGetById } from '../api/assetApi';
import { ASSET_TYPES, ENTITY_TYPE } from '../common/common';
import { useAuth } from '../components/context/AuthContext';
import { getMyProfile } from '../api/userApi';
import { updatePerson } from '../api/personApi';
import BackButton from '../components/BackButton';
import type { ProfileResponseDto } from '../Dto/ProfileResponseDto';
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';
import type { SuccessResponseDto } from '../Dto/SuccessResponseDto';
import ErrorModel from '../components/ErrorModel';

const ProfilePage: React.FC = () => {
 const navigate = useNavigate();
  const auth = useAuth();
  const userId = auth?.auth?.userId;
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [profile, setProfile] = useState<ProfileResponseDto | ErrorResponseDto | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('/assets/avatar.png');
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    personName: '',
    address: '',
    mobilePhone: '',
  });
  const [errorPage, setErrorPage] = useState(false);
  const [errorPageData, setErrorPageData] = useState<{ title: string; message: string } | null>(null);
const formatText = (text: string): string => {
    if (!text) return "";
    return text.replace(/_/g, " ");
  };


  function isProfileResponse(data: any): data is ProfileResponseDto {
    return data && 'personName' in data;
  }

  function isErrorResponse(data: any): data is ErrorResponseDto {
    return data && 'statusCode' in data && 'message' in data;
  }

  function isSuccess(response: SuccessResponseDto | ErrorResponseDto): response is SuccessResponseDto {
    return 'id' in response;
  }

  useEffect(() => {
    if (!userId) {
      toast.error('User ID not found in token.');
      return;
    }

    const fetchProfile = async () => {
      try {
        const response = await getMyProfile();

        if (isProfileResponse(response)) {
          setProfile(response);

          const imageAsset = response.asset?.find(a => a.assetType === 'PROFILE_IMAGE');
          if (imageAsset?.id) {
            try {
              const imageResponse = await assetGetById(imageAsset.id);
              if ('fileBytes' in imageResponse && 'contentType' in imageResponse) {
                const dataUrl = `data:${imageResponse.contentType};base64,${imageResponse.fileBytes}`;
                setImagePreview(dataUrl);
              }
            } catch {
              toast.error('Failed to load profile image');
            }
          }
        } else if (isErrorResponse(response) && response.statusCode === 401) {
          toast.error(response.message || 'Unauthorized');
          navigate('/');
        }
      } catch {
        toast.error('Failed to fetch profile');
      }
    };

    fetchProfile();

    const channel = new BroadcastChannel('profile-channel');
    channel.onmessage = event => {
      if (event.data === 'avatar-updated') {
        fetchProfile();
      }
    };
    return () => channel.close();
  }, [navigate, userId]);

  useEffect(() => {
    if (isProfileResponse(profile)) {
      setEditValues({
        personName: profile.personName || '',
        address: profile.address || '',
        mobilePhone: (profile as any).MobilePhone || (profile as any).mobilePhone || '',
      });
    }
  }, [profile]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userId) return;
    const allowedTypes = ["image/png", "image/jpeg"];
  if (!allowedTypes.includes(file.type)) {
    toast.error("This format is not allowed.");
    return;
  }
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = (reader.result as string).split(',')[1];
      const payload: AssetUploadDto = {
        entityType: ENTITY_TYPE.USER,
        entityId: userId,
        assetType: ASSET_TYPES.PROFILE_IMAGE,
        fileBytes: base64String,
        contentType: '',
        fileName: file.name,
        isSingletonAsset: true,
      };

      try {
        const result = await assetUpload(payload);
        if ('statusCode' in result && result.statusCode !== 201) {
          toast.error(result.message);
        } else {
          const newImage = `data:${file.type};base64,${base64String}`;
          setImagePreview(newImage);
          toast.success('Profile image updated!');

          const channel = new BroadcastChannel('profile-channel');
          channel.postMessage('avatar-updated');
          channel.close();
        }
      } catch {
        toast.error('Upload failed.');
      }
    };

    reader.readAsDataURL(file);
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleModalConfirm = () => {
    setErrorPage(false);
    navigate('/');
  };

  const handleModalClose = () => {
    setErrorPage(false);
    navigate('/');
  };

  const handleUpdateClick = async () => {
    if (!userId) {
      toast.error('User ID not found.');
      return;
    }
    try {
      const response = await updatePerson({
        Name: editValues.personName,
        Address: editValues.address,
        MobilePhone: editValues.mobilePhone,
      });
      if (isSuccess(response)) {
        toast.success('User updated successfully!');
        setIsEditing(false);

        const refreshed = await getMyProfile();
        if (isProfileResponse(refreshed)) {
          setProfile(refreshed);
        }
      } else if (isErrorResponse(response) && response.statusCode === 401) {
        setErrorPage(true);
        setErrorPageData({
          title: response.message || 'Unauthorized',
          message: response.description || 'You are not authorized to perform this action.',
        });
      } else if (isErrorResponse(response) && response.statusCode === 412) {
        toast.error(response.message || 'Unable to update user, Try Again');
      } else {
        toast.error(response.message || 'Failed to update user');
      }
    } catch (error: any) {
      setErrorPage(true);
      setErrorPageData({
        title: 'Error',
        message: error?.response?.data?.message || 'An error occurred while updating user.',
      });
    }
  };

  if (!profile || !isProfileResponse(profile)) {
    return (
      <div className="loader-container">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-header-bar">
        <div className="back-button-profile">
          <BackButton />
        </div>
      </div>
      <h1 className="page-title">Profile</h1>


      <section className="profile-section">
        <div className="profile-header">
          <div className="profile-user">
            <div className="avatar-wrapper">
              <img src={imagePreview} alt="Profile" className="profile-avatar" />
              <button className="edit-avatar-btn" onClick={handleUploadClick}>
                <Pencil size={14} />
              </button>
              <input
                type="file"
                accept="image/png, image/jpeg"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleImageChange}
              />
            </div>
            <div className="user-details">
              <h2>{profile.personName}</h2>
              <p>
                {profile.domain}
                <span className="dot">•</span> {profile.address}.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="info-card">
        <div className="info-section">
          <div className="section-header">
            <h3 className="section-title">Personal Information</h3>
            <button className="edit-btn" onClick={handleEditClick}>
              <Pencil size={16} />
              Edit
            </button>
          </div>
          <div className="section-content">
            <div className="info-row">
              <div className="info-item">
                <label className="info-label">Name</label>
                {isEditing ? (
                  <input
                    className="info-value"
                    value={editValues.personName}
                    onChange={e => setEditValues(v => ({ ...v, personName: e.target.value }))}
                    placeholder="Name"
                  />
                ) : (
                  <div className="info-value">{profile.personName}</div>
                )}
              </div>
              <div className="info-item">
                <label className="info-label">Email address</label>
                <div className="info-value">{profile.email}</div>
              </div>
            </div>
            <div className="info-row">
              <div className="info-item">
                <label className="info-label">Phone</label>
                {isEditing ? (
                  <input
                    className="info-value"
                    value={editValues.mobilePhone}
                    onChange={e => setEditValues(v => ({ ...v, mobilePhone: e.target.value }))}
                    placeholder="Mobile Number"
                  />
                ) : (
                  <div className="info-value">{(profile as any).MobilePhone || (profile as any).mobilePhone || ''}</div>
                )}
              </div>
              <div className="info-item">
                <label className="info-label">Bio</label>
                <div className="info-value">{formatText((profile as any).Role || (profile as any).role || '')}</div>
              </div>
            </div>
            <div className="info-row">
              <div className="info-item">
                <label className="info-label">Address</label>
                {isEditing ? (
                  <input
                    className="info-value"
                    value={editValues.address}
                    onChange={e => setEditValues(v => ({ ...v, address: e.target.value }))}
                    placeholder="Address"
                  />
                ) : (
                  <div className="info-value">{profile.address}</div>
                )}
              </div>
            </div>
            {isEditing && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button className="edit-btn" onClick={handleUpdateClick}>
                  Update
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {profile.planType && (
        <section className="info-card">
          <div className="info-section">
            <div className="section-header">
              <h3 className="section-title">Plan Details</h3>
            </div>
            <div className="section-content">
              <div className="info-row">
                <div className="info-item">
                  <label className="info-label">Plan Type</label>
                  <div className="info-value">{formatText(profile.planType)}</div>
                </div>
                <div className="info-item">
                  <label className="info-label">Monthly Credits Remaining</label>
                  <div className="info-value">{profile.monthlyCreditRemaining ?? 'N/A'}</div>
                </div>
              </div>
              <div className="info-row">
                <div className="info-item">
                  <label className="info-label">Total Credits Remaining</label>
                  <div className="info-value">{profile.totalCreditRemaining ?? 'N/A'}</div>
                </div>
                <div className="info-item additional-hours">
                  <label className="info-label">Additional Hours Used</label>
                  <div className={`info-value${(profile.monthlyExceededHours ?? 0) > 0 ? ' additional-hours-red' : ''}`}>
                    {typeof profile.monthlyExceededHours === 'number' ? profile.monthlyExceededHours : 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}


      {errorPage && errorPageData && (
        <ErrorModel
          visible={true}
          title={errorPageData.title}
          message={errorPageData.message}
          onConfirm={handleModalConfirm}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
};

export default ProfilePage;
