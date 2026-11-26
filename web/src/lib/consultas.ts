import { api } from './api';
import type { Usuario, Visita } from '../types';

export async function buscarVisitas(signal?: AbortSignal) {
  const { data } = await api.get<Visita[]>('/visitas', { signal });
  if (!Array.isArray(data)) {
    throw new Error('Não foi possível interpretar a lista de visitas.');
  }
  return data;
}

export async function buscarUsuarios(signal?: AbortSignal) {
  const { data } = await api.get<Usuario[]>('/usuarios', { signal });
  if (!Array.isArray(data)) {
    throw new Error('Não foi possível interpretar a lista de usuários.');
  }
  return data;
}
