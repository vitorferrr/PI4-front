import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { VisitaDetalhe } from "@/types/visita";

async function buscarVisitas() {
  const response = await api.get<VisitaDetalhe[]>("/visitas");
  return response.data;
}

export function useVisitas() {
  return useQuery({
    queryKey: ["visitas"],
    queryFn: buscarVisitas,
  });
}
