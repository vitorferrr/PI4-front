import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { VisitaDetalhe } from "@/types/visita";

export function useVisitas() {
  return useQuery({
    queryKey: ["visitas"],
    queryFn: () =>
      apiFetch<VisitaDetalhe[]>("/visitas", {}, "Não foi possível carregar as visitas."),
  });
}