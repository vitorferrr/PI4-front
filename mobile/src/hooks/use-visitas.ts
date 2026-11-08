import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { Visita } from "@/types/visitas";

export function useVisitas() {
  return useQuery({
    queryKey: ["visitas"],
    queryFn: () => apiFetch<Visita[]>("/visitas"),
  });
}