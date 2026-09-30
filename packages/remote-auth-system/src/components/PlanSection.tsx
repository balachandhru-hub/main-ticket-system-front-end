import React from "react";
import EditIcon from "../assets/edit-icon.png";

interface Field {
  name: string;
  value: string;
  id: string;
}

interface PlanSectionProps {
  title: string;
  fields: Field[];
  onEditClick: (field: Field) => void;
}

function formatEnumLabel(value?: string): string {
  if (!value) return '';
  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

const PlanSection: React.FC<PlanSectionProps> = ({ title, fields, onEditClick }) => {
  return (
    <div className="section-wrapper">
      <div className="section-title">{title}</div>
      <div className="section-card">
        <div className="table-wrapper">
          <table className="default-table">
            <thead>
              <tr>
                <th>Field Name</th>
                <th>Default Value</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field) => (
                <tr key={field.id}>
                  <td>{formatEnumLabel(field.name)}</td>
                  <td className="value-cell">{field.value}</td>
                  <td>
                    <div className="action-icons">
                      <img
                        src={EditIcon}
                        alt="Edit"
                        className="icon-image"
                        onClick={() => onEditClick(field)}
                        style={{ cursor: "pointer" }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PlanSection;
