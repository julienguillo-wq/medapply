import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import AuthGuard from './components/AuthGuard';
import Layout from './components/Layout';
import ProfilePage from './pages/ProfilePage';
import CVPage from './pages/CVPage';
import ParcoursPage from './pages/ParcoursPage';
import DocumentsPage from './pages/DocumentsPage';
import SearchPage from './pages/SearchPage';
import ApplicationsPage from './pages/ApplicationsPage';
import DashboardPage from './pages/DashboardPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AuthGuard>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/profil" replace />} />
              <Route path="/profil" element={<ProfilePage />} />
              <Route path="/cv" element={<CVPage />} />
              <Route path="/parcours" element={<ParcoursPage />} />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/recherche" element={<SearchPage />} />
              <Route path="/candidatures" element={<ApplicationsPage />} />
              <Route path="/tableau-de-bord" element={<DashboardPage />} />
            </Route>
          </Routes>
        </AuthGuard>
      </AuthProvider>
    </BrowserRouter>
  );
}
