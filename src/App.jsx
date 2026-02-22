import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import AuthGuard from './components/AuthGuard';
import Layout from './components/Layout';
import InstallationLayout from './components/InstallationLayout';
import ModeSelector from './pages/ModeSelector';
import ProfilePage from './pages/ProfilePage';
import CVPage from './pages/CVPage';
import ParcoursPage from './pages/ParcoursPage';
import DocumentsPage from './pages/DocumentsPage';
import SearchPage from './pages/SearchPage';
import ApplicationsPage from './pages/ApplicationsPage';
import CampaignsPage from './pages/CampaignsPage';
import DashboardPage from './pages/DashboardPage';
import HomePage from './pages/HomePage';
import DiagnosticPage from './pages/installation/DiagnosticPage';
import MebekoPage from './pages/installation/MebekoPage';
import LanguePage from './pages/installation/LanguePage';
import PermisPage from './pages/installation/PermisPage';
import LogementPage from './pages/installation/LogementPage';
import PratiquePage from './pages/installation/PratiquePage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AuthGuard>
          <Routes>
            {/* Default: redirect to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Mode selector */}
            <Route path="/mode" element={<ModeSelector />} />

            {/* Candidatures mode (existing app) */}
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<HomePage />} />
              <Route path="/profil" element={<ProfilePage />} />
              <Route path="/cv" element={<CVPage />} />
              <Route path="/parcours" element={<ParcoursPage />} />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/recherche" element={<SearchPage />} />
              <Route path="/candidatures" element={<ApplicationsPage />} />
              <Route path="/campagnes" element={<CampaignsPage />} />
              <Route path="/tableau-de-bord" element={<DashboardPage />} />
            </Route>

            {/* Installation mode */}
            <Route element={<InstallationLayout />}>
              <Route path="/installation" element={<Navigate to="/installation/diagnostic" replace />} />
              <Route path="/installation/diagnostic" element={<DiagnosticPage />} />
              <Route path="/installation/mebeko" element={<MebekoPage />} />
              <Route path="/installation/langue" element={<LanguePage />} />
              <Route path="/installation/permis" element={<PermisPage />} />
              <Route path="/installation/logement" element={<LogementPage />} />
              <Route path="/installation/pratique" element={<PratiquePage />} />
            </Route>
          </Routes>
        </AuthGuard>
      </AuthProvider>
    </BrowserRouter>
  );
}
