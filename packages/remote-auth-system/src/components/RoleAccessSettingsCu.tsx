import './RoleAccessSettingsCu.css';
import { useEffect, useRef, useState } from 'react';
import { getRoleCategories } from '../api/roleCategoryService';
import type { RoleCategory } from '../Dto/RoleCategory';

interface Props {
  updateField: (field: string, value: string) => void;
}

const RoleAccessSettingsCu = ({ updateField }: Props) => {
  const [roles, setRoles] = useState<RoleCategory[]>([]);
  const [filteredRoles, setFilteredRoles] = useState<RoleCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('Select the role type');

  const dropdownRef = useRef<HTMLDivElement>(null);

  const formatRoleName = (role: string) =>
    role
      .toLowerCase()
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

  const fetchRoles = async () => {
    if (roles.length) return;

    setLoading(true);
    setError('');

    try {
      const response = await getRoleCategories('GLOBAL_ROLE_CATEGORY');

      // ✅ FIX: type guard
      if (Array.isArray(response)) {
        setRoles(response);
        setFilteredRoles(response);
      } else {
        setError(response.message || 'Failed to load roles');
      }
    } catch {
      setError('Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setFilteredRoles(
      roles.filter(role =>
        formatRoleName(role.userRole)
          .toLowerCase()
          .includes(value.toLowerCase())
      )
    );
  };

  const handleSelect = (role: RoleCategory) => {
    setSelectedRole(formatRoleName(role.userRole));
    updateField('roleId', role.id);
    setOpen(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () =>
      document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="cu-section">
      <h3 className="cu-section-title">
        User Role & Platform Access Settings
      </h3>

      <div className="cu-role-group">
        <label className="cu-role-label">
          Role Type<span className="cu-role-required">*</span>
        </label>

        {error && <p className="cu-error-text">{error}</p>}

        <div className="cu-custom-select" ref={dropdownRef}>
          <button
  type="button"
  className="cu-custom-select-trigger"
  onClick={() => {
    setOpen(prev => !prev);
    fetchRoles();
  }}
>
  <span>{selectedRole}</span>

  {/* ICON WITH FUNCTIONALITY */}
  <span
    className={`cu-arrow ${open ? 'open' : ''}`}
    aria-hidden="true"
  >
    ▾
  </span>
</button>


          {open && (
            <div className="cu-custom-select-dropdown">
              <input
                type="text"
                className="cu-custom-select-search"
                placeholder="Search..."
                value={search}
                onChange={e => handleSearch(e.target.value)}
              />

              <ul className="cu-custom-select-list">
                {loading && (
                  <li className="cu-disabled">Loading...</li>
                )}

                {!loading && filteredRoles.length === 0 && (
                  <li className="cu-disabled">No roles found</li>
                )}

                {!loading &&
                  filteredRoles.map(role => (
                    <li
                      key={role.id}
                      onClick={() => handleSelect(role)}
                    >
                      {formatRoleName(role.userRole)}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoleAccessSettingsCu;