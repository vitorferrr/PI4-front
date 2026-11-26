import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Visita } from "@/types/visita";

async function buscarVisitas() {
  const response = await api.get<Visita[]>("/visitas");
  return response.data;
}

export function useVisitas() {
  return useQuery({
    queryKey: ["visitas"],
    queryFn: buscarVisitas,
  });
}
