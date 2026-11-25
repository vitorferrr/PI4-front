import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { VisitaDetalhe } from "@/types/visita";

async function buscarVisita(id: string | undefined) {
  const response = await api.get<VisitaDetalhe>(`/visitas/${id}`);
  return response.data;
}

export function useVisita(id: string | undefined) {
  return useQuery({
    queryKey: ["visita", id],
    queryFn: () => buscarVisita(id),
    enabled: Boolean(id),
  });
}
