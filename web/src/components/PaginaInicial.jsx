import { Navigate } from 'react-router-dom';
import { useSession } from '../lib/session';

// O admin já entra no painel; os outros perfis continuam com a mensagem de boas-vindas.
export default function PaginaInicial() {
  const role = useSession((state) => (typeof state.claims?.role === 'string' ? state.claims.role : null));

  if (role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return <div style={{ fontSize: '1.2rem', color: '#333' }}>Bem-vindo ao Sistema Procon! Escolha uma opção no menu.</div>;
}
