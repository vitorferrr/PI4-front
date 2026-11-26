import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Pergunta } from "@/types/visita";

async function buscarPerguntas() {
  const response = await api.get<Pergunta[]>("/questionario");
  return response.data;
}

export function usePerguntasQuestionario(habilitado: boolean) {
  return useQuery({
    queryKey: ["questionario"],
    queryFn: buscarPerguntas,
    enabled: habilitado,
  });
}
