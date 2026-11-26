import type { Role } from "@/types/usuario";
import type { StatusVisita } from "@/types/visita";

export const STATUS_VISITA: Record<StatusVisita, string> = {
  agendada: "Agendada",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export const OPCOES_STATUS = [
  { valor: "", rotulo: "Todos os status" },
  ...Object.entries(STATUS_VISITA).map(([valor, rotulo]) => ({ valor, rotulo })),
];

export const PERFIS: Record<Role, string> = {
  admin: "Admin",
  gestor: "Gestor",
  fiscalizador: "Fiscalizador",
};

const formatadorNumero = new Intl.NumberFormat("pt-BR");

export function formatarNumero(valor: number) {
  return formatadorNumero.format(valor);
}

export function plural(quantidade: number, singular: string, plural: string) {
  return `${formatarNumero(quantidade)} ${quantidade === 1 ? singular : plural}`;
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

export function mascaraData(texto: string) {
  const numeros = texto.replace(/\D/g, "").slice(0, 8);
  return [numeros.slice(0, 2), numeros.slice(2, 4), numeros.slice(4)].filter(Boolean).join("/");
}

export function mascaraHora(texto: string) {
  const numeros = texto.replace(/\D/g, "").slice(0, 4);
  return [numeros.slice(0, 2), numeros.slice(2)].filter(Boolean).join(":");
}

export function juntarDataHora(data: string, hora: string) {
  const [dia, mes, ano] = data.split("/").map(Number);
  const [horas, minutos] = hora.split(":").map(Number);
  if (data.length !== 10 || hora.length !== 5) return null;
  const resultado = new Date(ano, mes - 1, dia, horas, minutos);
  const existe = resultado.getDate() === dia && resultado.getMonth() === mes - 1;
  return existe && horas < 24 && minutos < 60 ? resultado : null;
}

export function textoOuAusente(valor: unknown) {
  const texto = String(valor ?? "").trim();
  return texto || "Não informado";
}

export function iniciais(nome?: string) {
  const partes = (nome ?? "").trim().split(/\s+/).filter(Boolean);
  const primeira = partes[0]?.charAt(0) ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1].charAt(0) : "";
  return (primeira + ultima).toUpperCase() || "?";
}

export function primeiroNome(nome?: string) {
  return (nome ?? "").trim().split(/\s+/)[0] ?? "";
}

export function normalizarPesquisa(valor: unknown) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}
