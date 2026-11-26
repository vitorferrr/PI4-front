import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import PrivateRoute from './components/PrivateRoute';
import AppLayout from './components/AppLayout';
import PaginaInicial from './components/PaginaInicial';
import RequireRole from './components/RequireRole';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminUsuariosPage from './pages/AdminUsuariosPage';
import AdminUsuarioFormPage from './pages/AdminUsuarioFormPage';
import AdminVisitasPage from './pages/AdminVisitasPage';
import GestorFiscalizadoresPage from './pages/GestorFiscalizadoresPage';
import GestorNovaVisitaPage from './pages/GestorNovaVisitaPage';
import GestorVisitaDetalhePage from './pages/GestorVisitaDetalhePage';
import GestorVisitasPage from './pages/GestorVisitasPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<PrivateRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<PaginaInicial />} />
            <Route element={<RequireRole roles={['admin']} />}>
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/usuarios" element={<AdminUsuariosPage />} />
              <Route path="/admin/usuarios/novo" element={<AdminUsuarioFormPage />} />
              <Route path="/admin/usuarios/:id/editar" element={<AdminUsuarioFormPage />} />
              <Route path="/admin/visitas" element={<AdminVisitasPage />} />
            </Route>
            <Route element={<RequireRole roles={['admin', 'gestor']} />}>
              <Route path="/gestor" element={<Navigate to="/gestor/fiscalizadores" replace />} />
              <Route path="/gestor/fiscalizadores" element={<GestorFiscalizadoresPage />} />
              <Route path="/gestor/visitas" element={<GestorVisitasPage />} />
              <Route path="/gestor/visitas/nova" element={<GestorNovaVisitaPage />} />
              <Route path="/gestor/visitas/:id" element={<GestorVisitaDetalhePage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
