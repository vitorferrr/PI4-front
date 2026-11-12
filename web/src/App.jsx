import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import PrivateRoute from './components/PrivateRoute';
import AppLayout from './components/AppLayout';
import AdminUsuariosPage from './pages/AdminUsuariosPage';
import AdminUsuarioFormPage from './pages/AdminUsuarioFormPage';
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
            <Route path="/" element={<div style={{ fontSize: '1.2rem', color: '#333' }}>Bem-vindo ao Sistema Procon! Escolha uma opção no menu.</div>} />
            <Route path="/admin/usuarios" element={<AdminUsuariosPage />} />
            <Route path="/admin/usuarios/novo" element={<AdminUsuarioFormPage />} />
            <Route path="/admin/usuarios/:id/editar" element={<AdminUsuarioFormPage />} />
            <Route path="/gestor/fiscalizadores" element={<GestorFiscalizadoresPage />} />
            <Route path="/gestor/visitas" element={<GestorVisitasPage />} />
            <Route path="/gestor/visitas/nova" element={<GestorNovaVisitaPage />} />
            <Route path="/gestor/visitas/:id" element={<GestorVisitaDetalhePage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
