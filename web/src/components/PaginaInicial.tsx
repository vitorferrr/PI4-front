import { Smartphone } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useSession } from '../lib/session';
import { PageHeader } from './ui';

// Cada perfil entra na sua primeira tela; o fiscalizador usa o app no celular.
export default function PaginaInicial() {
  const role = useSession((state) => (typeof state.claims?.role === 'string' ? state.claims.role : null));

  if (role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  if (role === 'gestor') {
    return <Navigate to="/gestor/fiscalizadores" replace />;
  }

  return (
    <div className="max-w-[780px]">
      <PageHeader eyebrow="Bem-vindo ao Constata" title="Use o app no celular" />
      <div className="card mt-6 flex items-start gap-4 p-7">
        <Smartphone size={28} className="shrink-0 text-primary" aria-hidden="true" />
        <p className="text-[15px] leading-6 text-muted-2">
          O painel web é usado por administradores e gestores. As visitas do seu perfil ficam no app do Constata.
        </p>
      </div>
    </div>
  );
}
