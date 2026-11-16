import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { PerguntaQuestionario } from "@/types/visita";

async function buscarPerguntasQuestionario(): Promise<PerguntaQuestionario[]> {
  const perguntas = await apiFetch<PerguntaQuestionario[]>(
    "/questionario",
    { method: "GET" },
    "Não foi possível carregar o questionário."
  );
  return [...perguntas].sort((a, b) => a.ordem - b.ordem);
}

export function usePerguntasQuestionario() {
  return useQuery({
    queryKey: ["perguntas-questionario"],
    queryFn: buscarPerguntasQuestionario,
    staleTime: Infinity,
  });
}

export function estaRespondida(valor: string | undefined) {
  return valor !== undefined && valor.trim() !== "";
}
