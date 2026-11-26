import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Usuario } from "@/types/usuario";

async function buscarUsuarios() {
  const response = await api.get<Usuario[]>("/usuarios");
  return response.data;
}

export function useUsuarios() {
  return useQuery({
    queryKey: ["usuarios"],
    queryFn: buscarUsuarios,
  });
}

export function useFiscalizadores() {
  const query = useUsuarios();
  const fiscalizadores = (query.data ?? []).filter((usuario) => usuario.role === "fiscalizador");
  return { ...query, fiscalizadores };
}
