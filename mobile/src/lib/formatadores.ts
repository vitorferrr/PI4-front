import type { StatusVisita } from "@/types/visita";

const STATUS_LABEL: Record<StatusVisita, string> = {
  agendada: "Agendada",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export function formatarStatus(status: StatusVisita) {
  return STATUS_LABEL[status] || status;
}

export function formatarData(dataIso?: string | null) {
  if (!dataIso) return "Não informada";
  const data = new Date(dataIso);
  if (Number.isNaN(data.getTime())) return "Não informada";
  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}