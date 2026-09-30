import React, { createContext, useContext, useState } from "react";

export interface SummaryFilterDTO {
  supplier_filter?: string[];
  requester_filter?: string[];
  department_filter?: string[];
  company_code_filter?: string[];
  gl_accounts_filter?: string[];
  cost_centers_filter?: string[];
  from_date?: string;
  to_date?: string;
}

const defaultFilters: SummaryFilterDTO = {};  // <-- keep completely empty

interface FilterContextType {
  filtersQuick: SummaryFilterDTO;
  setFiltersQuick: React.Dispatch<React.SetStateAction<SummaryFilterDTO>>;
}

const FilterContext = createContext<FilterContextType>({
  filtersQuick: defaultFilters,
  setFiltersQuick: () => {},
});

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [filtersQuick, setFiltersQuick] = useState<SummaryFilterDTO>(defaultFilters);

  return (
    <FilterContext.Provider value={{ filtersQuick, setFiltersQuick }}>
      {children}
    </FilterContext.Provider>
  );
};

export const useFilter = () => {
       const context = useContext(FilterContext);
       if (context === undefined) {
         throw new Error("useFilter must be used within a FilterProvider");
       }
       return context;
};
