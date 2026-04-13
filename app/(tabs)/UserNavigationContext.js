// userfolder/UserNavigationContext.js
import { createContext, useCallback, useContext, useState } from "react";

const UserNavigationContext = createContext();

export const useUserNavigation = () => {
  const context = useContext(UserNavigationContext);
  if (!context) {
    throw new Error("useUserNavigation must be used within UserNavigationProvider");
  }
  return context;
};

export const UserNavigationProvider = ({ children }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [activeTab, setActiveTab] = useState('Dashboard');

  const openMenu = () => setShowMenu(true);
  const closeMenu = () => setShowMenu(false);
  
  // No renaming - use the same name
  const setActiveNavigationTab = useCallback((tabName) => {
    setActiveTab(tabName);
  }, []);

  return (
    <UserNavigationContext.Provider value={{ 
      showMenu, 
      openMenu, 
      closeMenu, 
      activeTab, 
      setActiveTab: setActiveNavigationTab  // This is the key
    }}>
      {children}
    </UserNavigationContext.Provider>
  );
};