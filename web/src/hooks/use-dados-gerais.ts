import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DadosGerais } from "@/types/visita";

async function buscarDadosGerais() {
  const response = await api.get<DadosGerais>("/admin/dados-gerais");
  return response.data;
}

export function useDadosGerais() {
  return useQuery({
    queryKey: ["dados-gerais"],
    queryFn: buscarDadosGerais,
  });
}
