import { createContext, useContext, useState } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // ── UI state ──────────────────────────────────────────────────────────────
  const [sidebarOpen,    setSidebarOpen]    = useState(
    () => typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [triageResult,   setTriageResult]   = useState(null);
  const [pendingPatient, setPendingPatient] = useState(null);

  // ── Liste de patients (état partagé, chargé par les pages via l'API) ─────
  const [patients,  setPatients]  = useState([]);

  const value = {
    // patients partagés entre pages (mis à jour via socket ou refetch)
    patients, setPatients,
    // état triage en cours (NewPatient → TriageResult)
    triageResult,   setTriageResult,
    pendingPatient, setPendingPatient,
    // UI
    sidebarOpen, setSidebarOpen,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
