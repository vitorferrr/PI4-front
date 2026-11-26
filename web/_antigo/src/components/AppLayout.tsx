import { useState } from 'react';
import { LayoutGrid, ListFilter, LogOut, MapPin, SquarePlus, Users, type LucideIcon } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { sair } from '../lib/api';
import { useSession } from '../lib/session';
import { iniciais } from '../lib/visitas';
import { Avatar, LogoMark } from './ui';
import { PERFIL_ROTULO } from '../lib/rotulos';
import type { Role } from '../types';

interface ItemMenu {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const MENU: Partial<Record<Role, ItemMenu[]>> = {
  admin: [
    { to: '/admin', label: 'Painel', icon: LayoutGrid, end: true },
    { to: '/admin/usuarios', label: 'Usuários', icon: Users },
    { to: '/admin/visitas', label: 'Visitas', icon: MapPin },
  ],
  gestor: [
    { to: '/gestor/fiscalizadores', label: 'Fiscalizadores', icon: Users },
    { to: '/gestor/visitas/nova', label: 'Nova visita', icon: SquarePlus },
    { to: '/gestor/visitas', label: 'Visitas', icon: ListFilter, end: true },
  ],
};

export default function AppLayout() {
  const role = useSession((state) => (typeof state.claims?.role === 'string' ? state.claims.role : null)) as Role | null;
  const usuario = useSession((state) => state.usuario);
  const [saindo, setSaindo] = useState(false);
  const rotuloPerfil = role ? PERFIL_ROTULO[role] ?? role : '';
  const nome = usuario?.nome ?? rotuloPerfil;

  const handleLogout = async () => {
    if (saindo) return;
    setSaindo(true);
    await sair();
  };

  return (
    <div className="flex min-h-screen">
      <div className="w-[249px] shrink-0 bg-navy">
        <aside className="sticky top-0 flex h-screen flex-col px-4 pb-7 pt-7">
          <div className="flex items-center gap-2.5 px-2">
            <LogoMark />
            <div>
              <div className="font-heading text-[26px] font-black uppercase leading-[26px] tracking-[0.02em] text-white">Constata</div>
              <div className="text-xs text-nav-muted">Procon Jaboatão{rotuloPerfil ? ` · ${rotuloPerfil}` : ''}</div>
            </div>
          </div>

          <nav className="mt-7 flex flex-col gap-1" aria-label="Menu principal">
            {(role ? MENU[role] ?? [] : []).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex h-[46px] items-center gap-3 rounded-[10px] px-3.5 text-[15px] transition-colors ${
                    isActive ? 'bg-white font-bold text-navy' : 'font-semibold text-white hover:bg-white/10'
                  }`
                }
              >
                <item.icon size={20} strokeWidth={2} aria-hidden="true" />
                <span className="flex-1">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto flex items-center gap-2.5 rounded-xl bg-nav-card p-3">
            <Avatar iniciais={iniciais(nome)} tone="accent" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-white">{nome}</div>
              <div className="truncate text-xs text-nav-muted">{usuario?.email ?? rotuloPerfil}</div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={saindo}
              title="Sair"
              aria-label="Sair"
              className="rounded-md p-1 text-white hover:bg-white/10 disabled:opacity-60"
            >
              <LogOut size={20} aria-hidden="true" />
            </button>
          </div>
        </aside>
      </div>

      <main className="min-w-0 flex-1 px-10 pb-12 pt-8">
        <Outlet />
      </main>
    </div>
  );
}
