import type { Role, StatusVisita } from '../types';

export const PERFIL_ROTULO: Record<Role, string> = {
  admin: 'Admin',
  gestor: 'Gestor',
  fiscalizador: 'Fiscalizador',
};

export const STATUS_COR_BARRA: Record<StatusVisita, string> = {
  agendada: '#1677d2',
  em_andamento: '#3ab0e6',
  concluida: '#2f9e5b',
  cancelada: '#7b8799',
};
