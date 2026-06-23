import React, { useState } from 'react';

export interface CICTabsProps {
  children: React.ReactNode;
  defaultValue?: string;
}

export interface CICTabsListProps {
  children: React.ReactNode;
}

export interface CICTabsTriggerProps {
  value: string;
  children: React.ReactNode;
}

export interface CICTabsContentProps {
  value: string;
  children: React.ReactNode;
}

interface TabsContextType {
  activeTab: string;
  setActiveTab: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextType | undefined>(undefined);

const useTabsContext = () => {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error('CICTabs components must be used within CICTabs');
  return context;
};

export const CICTabs: React.FC<CICTabsProps> & {
  List: React.FC<CICTabsListProps>;
  Trigger: React.FC<CICTabsTriggerProps>;
  Content: React.FC<CICTabsContentProps>;
} = ({ children, defaultValue = '' }) => {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </TabsContext.Provider>
  );
};

CICTabs.List = ({ children }) => (
  <div className="flex border-b border-cic-border">{children}</div>
);

CICTabs.Trigger = ({ value, children }) => {
  const { activeTab, setActiveTab } = useTabsContext();
  return (
    <button
      onClick={() => setActiveTab(value)}
      className={`px-4 py-2 text-sm font-medium ${
        activeTab === value
          ? 'border-b-2 border-cic-accent text-cic-accent'
          : 'text-cic-text-secondary hover:text-cic-text-primary'
      }`}
    >
      {children}
    </button>
  );
};

CICTabs.Content = ({ value, children }) => {
  const { activeTab } = useTabsContext();
  return activeTab === value ? <div>{children}</div> : null;
};
