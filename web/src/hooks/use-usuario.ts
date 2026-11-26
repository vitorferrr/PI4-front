import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Usuario } from "@/types/usuario";

async function buscarUsuario(id: string | undefined) {
  const response = await api.get<Usuario>(`/usuarios/${id}`);
  return response.data;
}

export function useUsuario(id: string | undefined) {
  return useQuery({
    queryKey: ["usuario", id],
    queryFn: () => buscarUsuario(id),
    enabled: Boolean(id),
  });
}
