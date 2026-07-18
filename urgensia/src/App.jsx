import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import LandingPage from './pages/landing/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import AgentDashboard from './pages/agent/AgentDashboard';
import NewPatientPage from './pages/agent/NewPatientPage';
import TriageResultPage from './pages/agent/TriageResultPage';
import QueuePage from './pages/agent/QueuePage';
import PatientsPage from './pages/agent/PatientsPage';
import SettingsPage from './pages/agent/SettingsPage';
import CriticalCasePage from './pages/agent/CriticalCasePage';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import AccesPatientPage from './pages/citoyen/AccesPatientPage';
import SuiviPatientPage from './pages/citoyen/SuiviPatientPage';
import OrientationPage from './pages/orientation/OrientationPage';

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppProvider>
          <Router>
            <Routes>
            {/* Public — Accueil & Auth */}
            <Route path="/"          element={<LandingPage />} />
            <Route path="/connexion"           element={<LoginPage />} />
            <Route path="/mot-de-passe-oublie" element={<ForgotPasswordPage />} />
            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

            {/* Public — Patient (accès via code infirmier après triage) */}
            <Route path="/patient"             element={<AccesPatientPage />} />
            <Route path="/patient/suivi/:code" element={<SuiviPatientPage />} />

            {/* Orientation Patient — Protégé (patient enregistré) */}
            <Route path="/orientation/:mode/:id" element={<OrientationPage />} />

            {/* Agent */}
            <Route path="/agent" element={
              <ProtectedRoute role="agent"><AgentDashboard /></ProtectedRoute>
            } />
            <Route path="/agent/nouveau-patient" element={
              <ProtectedRoute role="agent"><NewPatientPage /></ProtectedRoute>
            } />
            <Route path="/agent/resultat-triage" element={
              <ProtectedRoute role="agent"><TriageResultPage /></ProtectedRoute>
            } />
            <Route path="/agent/file-attente" element={
              <ProtectedRoute role="agent"><QueuePage /></ProtectedRoute>
            } />
            <Route path="/agent/patients" element={
              <ProtectedRoute role="agent"><PatientsPage /></ProtectedRoute>
            } />
            <Route path="/agent/parametres" element={
              <ProtectedRoute role="agent"><SettingsPage /></ProtectedRoute>
            } />
            <Route path="/agent/cas-critique" element={
              <ProtectedRoute role="agent"><CriticalCasePage /></ProtectedRoute>
            } />

            {/* Médecin */}
            <Route path="/medecin"   element={
              <ProtectedRoute role="medecin"><DoctorDashboard /></ProtectedRoute>
            } />
            <Route path="/medecin/*" element={
              <ProtectedRoute role="medecin"><DoctorDashboard /></ProtectedRoute>
            } />

            {/* Admin */}
            <Route path="/admin"   element={
              <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
            } />
            <Route path="/admin/*" element={
              <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
            } />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
        </AppProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
