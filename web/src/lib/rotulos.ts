import type { Role, StatusVisita } from '../types';

export const PERFIL_ROTULO: Record<Role, string> = {
  admin: 'Admin',
  gestor: 'Gestor',
  fiscalizador: 'Fiscalizador',
};

export const STATUS_COR_BARRA: Record<StatusVisita, string> = {
  agendada: 'bg-[#1677d2]',
  em_andamento: 'bg-[#3ab0e6]',
  concluida: 'bg-[#2f9e5b]',
  cancelada: 'bg-[#7b8799]',
};
