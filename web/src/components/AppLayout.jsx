import { Outlet } from 'react-router-dom';
import { endSession, useSession } from '../lib/session';

export default function AppLayout() {
  const userRole = useSession((state) => (
    typeof state.claims?.role === 'string' ? state.claims.role.toUpperCase() : null
  ));

  const handleLogout = () => {
    endSession();
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f4f6f8' }}>
      <aside style={{ width: '250px', backgroundColor: '#2c3e50', color: '#fff', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Menu Procon</h2>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
          {userRole === 'ADMIN' && (
            <>
              <div style={{ cursor: 'pointer', padding: '0.5rem', borderRadius: '4px' }}>
                Usuários
              </div>
              <div style={{ cursor: 'pointer', padding: '0.5rem', borderRadius: '4px' }}>
                Visitas
              </div>
            </>
          )}

          {userRole === 'GESTOR' && (
            <>
              <div style={{ cursor: 'pointer', padding: '0.5rem', borderRadius: '4px' }}>
                Fiscalizadores
              </div>
              <div style={{ cursor: 'pointer', padding: '0.5rem', borderRadius: '4px' }}>
                Nova Visita
              </div>
            </>
          )}
        </nav>

        <button 
          onClick={handleLogout}
          style={{ padding: '0.5rem', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Sair
        </button>
      </aside>

      <main style={{ flex: 1, padding: '2rem' }}>
        <Outlet />
      </main>
    </div>
  );
}
