import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { VisitaDetalhe } from "@/types/visita";

export function useVisita(id: string | undefined) {
  return useQuery({
    queryKey: ["visita", id],
    queryFn: () =>
      apiFetch<VisitaDetalhe>(
        `/visitas/${id}`,
        { method: "GET" },
        "Não foi possível carregar os dados da visita."
      ),
    enabled: Boolean(id),
  });
}
