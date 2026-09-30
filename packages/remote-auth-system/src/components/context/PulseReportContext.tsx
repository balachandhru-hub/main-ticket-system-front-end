import React, { createContext, useContext, useState,type ReactNode } from 'react';

interface PulseReportContextType {
  selectedStatus: string | null;
  setSelectedStatus: (status: string | null) => void;
}

const PulseReportContext = createContext<PulseReportContextType | undefined>(undefined);

export const PulseReportProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  return (
    <PulseReportContext.Provider value={{ selectedStatus, setSelectedStatus }}>
      {children}
    </PulseReportContext.Provider>
  );
};

export const usePulseReport = () => {
  const context = useContext(PulseReportContext);
  if (!context) {
    throw new Error('usePulseReport must be used within PulseReportProvider');
  }
  return context;
};