import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { PerguntaQuestionario, TipoResposta } from "@/types/visita";

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

// mesmas regras do FORMATOS em PI4-back/src/services/questionarioService.js
function ehDataValida(valor: string) {
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor);
  if (!partes) return false;

  const [, dia, mes, ano] = partes.map(Number);
  if (ano < 1900) return false;

  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return data.getUTCDate() === dia && data.getUTCMonth() === mes - 1;
}

const FORMATOS: Record<TipoResposta, { valido: (valor: string) => boolean; mensagem: string }> = {
  sim_nao: {
    valido: (valor) => ["Sim", "Não", "Não se aplica"].includes(valor),
    mensagem: 'Escolha "Sim", "Não" ou "Não se aplica".',
  },
  numero: {
    valido: (valor) => /^-?\d+([.,]\d+)?$/.test(valor),
    mensagem: "Digite apenas um número.",
  },
  data: {
    valido: ehDataValida,
    mensagem: "Digite uma data válida no formato DD/MM/AAAA.",
  },
  texto: {
    valido: () => true,
    mensagem: "",
  },
};

// devolve a mensagem do problema, ou null se a resposta está no formato aceito pelo back
export function erroFormatoResposta(pergunta: PerguntaQuestionario, valor: string) {
  const formato = FORMATOS[pergunta.tipo_resposta];
  return formato.valido(valor.trim()) ? null : formato.mensagem;
}
