import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface Company {
  id: number;
  company_name: string;
  [key: string]: any;
}

interface CompanyContextType {
  selectedCompany: Company | null;
  setSelectedCompany: (company: Company | null, userId?: string) => void;
  companies: Company[];
  setCompanies: (companies: Company[]) => void;
  restoreSelectedCompany: (userId: string, companies: Company[]) => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

const getStorageKey = (userId: string) => `selectedCompany_${userId}`;

export const CompanyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedCompany, setSelectedCompanyState] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);

  // Persist selected company to localStorage
  const setSelectedCompany = useCallback((company: Company | null, userId?: string) => {
    setSelectedCompanyState(company);
    
    if (userId && company) {
      // Store company name in localStorage keyed by user ID
      localStorage.setItem(getStorageKey(userId), company.company_name);
    } else if (userId && !company) {
      // Clear stored preference if company is null
      localStorage.removeItem(getStorageKey(userId));
    }
  }, []);

  // Restore selected company from localStorage
  const restoreSelectedCompany = useCallback((userId: string, companiesList: Company[]) => {
    if (!userId || companiesList.length === 0) return;

    const storedCompanyName = localStorage.getItem(getStorageKey(userId));
    
    if (storedCompanyName) {
      // Find the company by name (case-insensitive)
      const company = companiesList.find(
        (c) => c.company_name.toLowerCase() === storedCompanyName.toLowerCase()
      );
      
      if (company) {
        setSelectedCompanyState(company);
      } else {
        // If stored company doesn't exist anymore, fall back to first company
        // and update localStorage
        if (companiesList.length > 0) {
          setSelectedCompanyState(companiesList[0]);
          localStorage.setItem(getStorageKey(userId), companiesList[0].company_name);
        }
      }
    } else {
      // No stored preference, select first company
      if (companiesList.length > 0) {
        setSelectedCompanyState(companiesList[0]);
        localStorage.setItem(getStorageKey(userId), companiesList[0].company_name);
      }
    }
  }, []);

  return (
    <CompanyContext.Provider value={{ 
      selectedCompany, 
      setSelectedCompany, 
      companies, 
      setCompanies,
      restoreSelectedCompany 
    }}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};

