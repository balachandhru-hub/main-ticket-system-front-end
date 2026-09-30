import React, { useState, useEffect, useMemo } from "react";
import PlanSection from "./PlanSection";
import BackButton from "../components/BackButton";
import EditDefaultValue from "./EditDefaultValue";
import "./BusinessPlan.css";
import { useNavigate } from 'react-router-dom';
import { getAllPlanConfigs } from "../api/planConfig"; 
import type { GetPlanConfigDto } from "../Dto/GetPlanConfigDto";
import type { ErrorResponseDto } from "../Dto/ErrorResponseDto";
import { toast } from 'react-toastify';

interface Field {
  id: string;
  name: string;
  value: string;
}

function formatEnumLabel(value?: string): string {
  if (!value) return '';
  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

const BusinessPlan: React.FC = () => {
  const [plans, setPlans] = useState<GetPlanConfigDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedField, setSelectedField] = useState<Field | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        setError(null);
        const data: GetPlanConfigDto[] | ErrorResponseDto = await getAllPlanConfigs();

        if ("statusCode" in data) {
          if (data.statusCode === 401) {
            toast.error(data.message || "Unauthorized");
            navigate("/");
          } else {
            setError(data.message || "Failed to load business plans.");
          }
        } else {
          setPlans(data);
        }
      } catch (err: any) {
        if (err?.response?.status === 401) {
          toast.error("Unauthorized");
          navigate("/");
        } else {
          setError("Unexpected error occurred.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, [navigate]);

  const groupedPlans = useMemo(() => {
    const result = plans.reduce((acc: Record<string, Field[]>, plan) => {
      if (!acc[plan.plan]) acc[plan.plan] = [];
      const existingKeys = new Set(acc[plan.plan].map((field) => field.name));
      if (!existingKeys.has(plan.key)) {
      acc[plan.plan].push({ id: plan.id, name: plan.key, value: plan.value });
      }
      return acc;
    }, {});
    return result;
  }, [plans]);

  if (loading) {
    return (
      <div className="loader-container">
        <div className="loader"></div>
      </div>
    );
  }
  if (error) return <div className="error">{error}</div>;

  return (
    <div>
      <div className="button-row-backb">
        <BackButton />
      </div>

      <div className="title">
        <h2 className="title-text">Business Plans (Default Values)</h2>
      </div>

      <div className="business-plans-container">
        {Object.keys(groupedPlans).map((planName) => (
          <PlanSection
            key={planName}
            title={formatEnumLabel(planName)}
            fields={groupedPlans[planName]}
            onEditClick={(field) => {
              setSelectedField(field);
            }}
          />
        ))}
      </div>

      {selectedField && (
        <EditDefaultValue
          fieldName={selectedField.name}
          defaultValue={selectedField.value}
          id={selectedField.id}
          onClose={() => {
            setSelectedField(null);
          }}
          onSaveSuccess={(newValue) => {
            setPlans((prevPlans) => {
              const updatedPlans = prevPlans.map((plan) =>
                plan.id === selectedField.id ? { ...plan, value: newValue } : plan
              );
              return updatedPlans;
            });
            setSelectedField(null);
          }}
        />
      )}
    </div>
  );
};

export default BusinessPlan;
