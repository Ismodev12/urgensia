import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, UserPlus, Clock, Users, Settings,
  Stethoscope, BarChart3, Shield, Menu, X, Activity
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

const agentNavItems = [
  { path: '/agent', label: 'Tableau de bord', icon: LayoutDashboard, exact: true },
  { path: '/agent/nouveau-patient', label: 'Nouveau patient', icon: UserPlus },
  { path: '/agent/file-attente', label: 'File d\'attente', icon: Clock },
  { path: '/agent/patients', label: 'Patients', icon: Users },
  { path: '/agent/parametres', label: 'Paramètres', icon: Settings },
];

const doctorNavItems = [
  { path: '/medecin', label: 'Tableau de bord', icon: LayoutDashboard, exact: true },
  { path: '/medecin/patients', label: 'Mes patients', icon: Users },
  { path: '/medecin/prioritaires', label: 'Cas prioritaires', icon: Activity },
  { path: '/medecin/parametres', label: 'Paramètres', icon: Settings },
];

const adminNavItems = [
  { path: '/admin', label: 'Tableau de bord', icon: LayoutDashboard, exact: true },
  { path: '/admin/utilisateurs', label: 'Utilisateurs', icon: Users },
  { path: '/admin/services', label: 'Services', icon: Stethoscope },
  { path: '/admin/statistiques', label: 'Statistiques', icon: BarChart3 },
  { path: '/admin/securite', label: 'Sécurité', icon: Shield },
  { path: '/admin/parametres', label: 'Paramètres', icon: Settings },
];

function getNavItems(role) {
  if (role === 'medecin') return doctorNavItems;
  if (role === 'admin') return adminNavItems;
  return agentNavItems;
}

export function Sidebar({ role = 'agent' }) {
  const { sidebarOpen, setSidebarOpen } = useApp();
  const location = useLocation();
  const navItems = getNavItems(role);

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 1024 : false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const roleLabels = {
    agent: 'Infirmier d\'accueil-triage',
    medecin: 'Médecin',
    admin: 'Administrateur',
  };

  const roleColors = {
    agent: 'from-teal-700 to-teal-600',
    medecin: 'from-blue-700 to-blue-600',
    admin: 'from-slate-800 to-slate-700',
  };

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 256 : (isMobile ? 0 : 72) }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className={`
          fixed top-0 left-0 h-full z-30
          bg-white border-r border-slate-100 shadow-large
          flex flex-col overflow-hidden overflow-x-hidden
          lg:relative lg:shadow-none
          ${!sidebarOpen ? 'items-center' : ''}
        `}
      >
        {/* Header */}
        <div className={`flex items-center h-16 px-4 border-b border-slate-100 flex-shrink-0 ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-2"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center shadow-teal flex-shrink-0">
                  <Activity className="w-4 h-4 text-white" />
                </div>
                <div>
                  <span className="font-bold text-night-blue text-sm">URGENSIA</span>
                  <p className="text-xs text-soft-gray leading-none">{roleLabels[role]}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!sidebarOpen && (
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
          )}

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-soft-gray transition-colors hidden lg:flex"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path) && location.pathname !== item.path.replace(/\/[^/]+$/, '');
            const activeExact = location.pathname === item.path;
            const active = item.exact ? activeExact : isActive || activeExact;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.exact}
                className={({ isActive: navActive }) => `
                  flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm
                  transition-all duration-200 group relative cursor-pointer
                  ${navActive
                    ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-teal'
                    : 'text-soft-gray hover:bg-slate-50 hover:text-night-blue'
                  }
                `}
              >
                {({ isActive: navActive }) => (
                  <>
                    <item.icon className={`w-5 h-5 flex-shrink-0 ${navActive ? 'text-white' : ''}`} />
                    <AnimatePresence>
                      {sidebarOpen && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="whitespace-nowrap overflow-hidden"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>

                    {/* Tooltip when collapsed */}
                    {!sidebarOpen && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                        {item.label}
                      </div>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom role indicator */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-4 py-3 border-t border-slate-100"
            >
              <div className={`rounded-xl p-3 bg-gradient-to-r ${roleColors[role]}`}>
                <p className="text-white text-xs font-semibold">URGENSIA v1.0</p>
                <p className="text-white/70 text-xs">Pré-triage Médical</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.aside>
    </>
  );
}
