import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Usuario } from "@/types/usuario";

async function buscarUsuarios() {
  const response = await api.get<Usuario[]>("/usuarios");
  return response.data;
}

export function useUsuarios(habilitado = true) {
  return useQuery({
    queryKey: ["usuarios"],
    queryFn: buscarUsuarios,
    enabled: habilitado,
  });
}

export function useFiscalizadores(habilitado = true) {
  const query = useUsuarios(habilitado);
  const fiscalizadores = (query.data ?? []).filter((usuario) => usuario.role === "fiscalizador");
  return { ...query, fiscalizadores };
}
