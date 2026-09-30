// src/components/RoleAccessSettings.tsx

import './RoleAccessSettings.css';
import { useState, useEffect } from 'react';
import { getRoleCategories } from '../api/roleCategoryService';
import { getAllBotModels } from '../api/botModelApi';
import { getAllAppModels } from '../api/appModelApi';
import type { RoleCategory } from '../Dto/RoleCategory';
import type { BotModel } from '../Dto/BotModelResponseDto';
import type { AppModel } from '../Dto/AppModelResponseDto';
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';

interface Props {
  updateField: (field: string, value: string | string[]) => void;
}

const RoleAccessSettings = ({ updateField }: Props) => {
  const [roles, setRoles] = useState<RoleCategory[]>([]);
  const [botModels, setBotModels] = useState<BotModel[]>([]);
  const [appModels, setAppModels] = useState<AppModel[]>([]);
  const [selectedBotModels, setSelectedBotModels] = useState<string[]>([]);
  const [selectedAppModels, setSelectedAppModels] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [botModelsLoading, setBotModelsLoading] = useState(false);
  const [appModelsLoading, setAppModelsLoading] = useState(false);

  const [error, setError] = useState('');
  const [botModelsError, setBotModelsError] = useState('');
  const [appModelsError, setAppModelsError] = useState('');

  const [hasFetched, setHasFetched] = useState(false);
  const [hasFetchedBotModels, setHasFetchedBotModels] = useState(false);
  const [hasFetchedAppModels, setHasFetchedAppModels] = useState(false);

  const [showBotModelsDropdown, setShowBotModelsDropdown] = useState(false);
  const [showAppModelsDropdown, setShowAppModelsDropdown] = useState(false);

  const formatRoleName = (role: string) =>
    role
      .toLowerCase()
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

  const formatBotModelName = (model: string) =>
    model
      .toLowerCase()
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

  const formatAppModelName = (model: string) =>
    model
      .toLowerCase()
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

  const isErrorResponse = (data: any): data is ErrorResponseDto =>
    'statusCode' in data && 'message' in data;

  // --------------------------
  // Role Type Dropdown Fetch
  // --------------------------
  const handleDropdownClick = async () => {
    if (hasFetched) return;

    setLoading(true);
    setError('');

    try {
      const roleData = await getRoleCategories('BUSINESS_ROLE_CATEGORY');

      if (isErrorResponse(roleData)) {
        setError(roleData.message || 'Failed to load roles');
        return;
      }

      setRoles(roleData);
      setHasFetched(true);
    } catch {
      setError('Failed to load roles.');
    } finally {
      setLoading(false);
    }
  };

  // --------------------------
  // Bot Models Dropdown Fetch
  // --------------------------
  const handleBotModelsClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // prevents outside-click closing

    if (!hasFetchedBotModels) {
      setBotModelsLoading(true);
      setBotModelsError('');

      try {
        const botModelData = await getAllBotModels();

        if (isErrorResponse(botModelData)) {
          setBotModelsError(botModelData.message || 'Failed to load bot models');
          return;
        }

        setBotModels(botModelData.botModels);
        setHasFetchedBotModels(true);
      } catch {
        setBotModelsError('Failed to load bot models.');
      } finally {
        setBotModelsLoading(false);
      }
    }

    setShowBotModelsDropdown(prev => !prev);
  };

  // --------------------------
  // Toggle checkbox selection
  // --------------------------
  const handleBotModelToggle = (modelId: string) => {
    setSelectedBotModels(prev => {
      const updated = prev.includes(modelId)
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId];

      updateField('ModelIds', updated);
      return updated;
    });
  };

  const handleAppModelsClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!hasFetchedAppModels) {
      setAppModelsLoading(true);
      setAppModelsError('');

      try {
        const appModelData = await getAllAppModels();

        if (isErrorResponse(appModelData)) {
          setAppModelsError(appModelData.message || 'Failed to load app models');
          return;
        }

        setAppModels(appModelData.appModels);
        setHasFetchedAppModels(true);
      } catch {
        setAppModelsError('Failed to load app models.');
      } finally {
        setAppModelsLoading(false);
      }
    }

    setShowAppModelsDropdown(prev => !prev);
  };

  const handleAppModelToggle = (appId: string) => {
    setSelectedAppModels(prev => {
      const updated = prev.includes(appId)
        ? prev.filter(id => id !== appId)
        : [...prev, appId];

      updateField('AppIds', updated);
      return updated;
    });
  };

  // --------------------------
  // Close dropdown on outside click
  // --------------------------
  useEffect(() => {
    const close = () => {
      setShowBotModelsDropdown(false);
      setShowAppModelsDropdown(false);
    };
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  return (
    <div className="bd-section">
      <h3 className="bd-section-title">User Role & Platform Access Settings</h3>

      <div className="bd-role-container">

        {/* Role Dropdown */}
        <div className="bd-role-group">
          <label className="bd-role-label">
            Role Type<span className="bd-role-required">*</span>
          </label>

          {loading ? (
            <p>Loading roles...</p>
          ) : error ? (
            <p className="bd-error-text">{error}</p>
          ) : (
            <select
              className="bd-role-select"
              onClick={handleDropdownClick}
              onChange={(e) => updateField('roleId', e.target.value)}
            >
              <option value="">Select the role type</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>
                  {formatRoleName(role.userRole)}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Bot Model Dropdown (Checkbox UI) */}
        <div className="bd-role-group">
          <label className="bd-role-label">
            Bot Model<span className="bd-role-required">*</span>
          </label>

          {botModelsLoading ? (
            <p>Loading bot models...</p>
          ) : botModelsError ? (
            <p className="bd-error-text">{botModelsError}</p>
          ) : (
            <div className="bd-bot-model-wrapper">
              <div
                className="bd-role-select bd-bot-model-trigger"
                onClick={handleBotModelsClick}
              >
                {selectedBotModels.length === 0
                  ? 'Select bot models'
                  : `${selectedBotModels.length} model(s) selected`}
              </div>

              {showBotModelsDropdown && (
                <div
                  className="bd-bot-model-dropdown"
                  onClick={(e) => e.stopPropagation()}
                >
                  {botModels.map(model => (
                    <label key={model.id} className="bd-bot-model-item">
                      <input
                        type="checkbox"
                        className="bd-bot-model-checkbox"
                        checked={selectedBotModels.includes(model.id)}
                        onChange={() => handleBotModelToggle(model.id)}
                      />
                      <span className="bd-bot-model-text">
                        {formatBotModelName(model.name)}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* App Model Dropdown (Checkbox UI) */}
        <div className="bd-role-group">
          <label className="bd-role-label">
            App Model
          </label>

          {appModelsLoading ? (
            <p>Loading app models...</p>
          ) : appModelsError ? (
            <p className="bd-error-text">{appModelsError}</p>
          ) : (
            <div className="bd-bot-model-wrapper">
              <div
                className="bd-role-select bd-bot-model-trigger"
                onClick={handleAppModelsClick}
              >
                {selectedAppModels.length === 0
                  ? 'Select app models'
                  : `${selectedAppModels.length} app model(s) selected`}
              </div>

              {showAppModelsDropdown && (
                <div
                  className="bd-bot-model-dropdown"
                  onClick={(e) => e.stopPropagation()}
                >
                  {appModels.map(app => (
                    <label key={app.id} className="bd-bot-model-item">
                      <input
                        type="checkbox"
                        className="bd-bot-model-checkbox"
                        checked={selectedAppModels.includes(app.id)}
                        onChange={() => handleAppModelToggle(app.id)}
                      />
                      <span className="bd-bot-model-text">
                        {formatAppModelName(app.name)}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default RoleAccessSettings;
