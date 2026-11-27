import { normalizarPesquisa } from "@/lib/formatadores";
import { cores } from "@/theme";
import type { UsuarioLogado } from "@/types/usuario";
import type { StatusVisita, Visita } from "@/types/visita";

export const STATUS_ABERTOS: StatusVisita[] = ["agendada", "em_andamento"];

const CAPACIDADE_FISCAL = 8;

export interface CargaFiscal {
  abertas: number;
  vencemHoje: number;
  atrasadas: number;
  noMes: number;
}

export const CARGA_VAZIA: CargaFiscal = { abertas: 0, vencemHoje: 0, atrasadas: 0, noMes: 0 };

function paraData(valor?: string | null) {
  if (!valor) return null;
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

function mesmoDia(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

export function estaAtrasada(visita: Visita, agora = new Date()) {
  const data = paraData(visita.data_agendada);
  return visita.status === "agendada" && data !== null && data < agora && !mesmoDia(data, agora);
}

export function venceHoje(visita: Visita, agora = new Date()) {
  const data = paraData(visita.data_agendada);
  return STATUS_ABERTOS.includes(visita.status) && data !== null && mesmoDia(data, agora);
}

export function concluidaNoMes(visita: Visita, agora = new Date()) {
  const data = paraData(visita.data_realizacao ?? visita.data_agendada);
  return (
    visita.status === "concluida" &&
    data !== null &&
    data.getFullYear() === agora.getFullYear() &&
    data.getMonth() === agora.getMonth()
  );
}

export const CAMPOS_ESTABELECIMENTO = [
  {
    chave: "razao_social",
    rotulo: "Razão social",
    exemplo: "Boa Praça Comércio de Alimentos Ltda",
  },
  { chave: "nome_fantasia", rotulo: "Nome fantasia", exemplo: "Mercadinho Boa Praça" },
  { chave: "cnpj_cpf", rotulo: "CNPJ/CPF", exemplo: "12.345.678/0001-90" },
  { chave: "atividade", rotulo: "Atividade", exemplo: "Supermercado" },
  { chave: "endereco", rotulo: "Endereço", exemplo: "Av. Bernardo Vieira de Melo, 1520" },
  { chave: "bairro", rotulo: "Bairro", exemplo: "Piedade" },
  { chave: "cep", rotulo: "CEP", exemplo: "54.410-010" },
  { chave: "telefone", rotulo: "Telefone", exemplo: "(81) 3333-4444" },
] as const;

export type CampoEstabelecimento = (typeof CAMPOS_ESTABELECIMENTO)[number]["chave"];
export type Estabelecimento = Partial<Record<CampoEstabelecimento, string>>;

export function ehResponsavelPelaVisita(visita: Visita, usuario: UsuarioLogado | null) {
  if (!usuario) return false;
  return usuario.role === "admin" || visita.gestor_id === usuario.id;
}

export function podeAlterarVisita(visita: Visita, usuario: UsuarioLogado | null) {
  return (
    ehResponsavelPelaVisita(visita, usuario) &&
    visita.status === "agendada" &&
    (visita.documentos?.length ?? 0) === 0
  );
}

export function nomeEstabelecimento(visita: Visita) {
  return visita.nome_fantasia?.trim() || visita.denunciado?.trim() || "Não informado";
}

export function detalheEstabelecimento(visita: Visita) {
  return [visita.bairro, visita.cnpj_cpf].filter((valor) => valor?.trim()).join(", ");
}

export function nomesFiscalizadores(visita: Visita) {
  const nomes = (visita.fiscalizadores ?? []).map((fiscal) => fiscal.nome).filter(Boolean);
  return nomes.length > 0 ? nomes.join(", ") : "Nenhum fiscalizador";
}

export function textoDaVisita(visita: Visita) {
  return [visita.denunciado, visita.razao_social, visita.nome_fantasia, visita.cnpj_cpf]
    .filter(Boolean)
    .join(" ");
}

export type FiltrosVisita = {
  pesquisa?: string;
  status?: string;
  gestor?: string;
  fiscalizador?: string;
  atrasadas?: string;
};

export function filtrarVisitas(visitas: Visita[], filtros: FiltrosVisita) {
  const termo = normalizarPesquisa(filtros.pesquisa);
  return visitas.filter(
    (visita) =>
      normalizarPesquisa(textoDaVisita(visita)).includes(termo) &&
      (!filtros.status || visita.status === filtros.status) &&
      (!filtros.gestor || String(visita.gestor?.id) === filtros.gestor) &&
      (!filtros.fiscalizador ||
        (visita.fiscalizadores ?? []).some(
          (fiscal) => String(fiscal.id) === filtros.fiscalizador
        )) &&
      (!filtros.atrasadas || estaAtrasada(visita))
  );
}

export function calcularCargas(visitas: Visita[], agora = new Date()) {
  const cargas = new Map<number, CargaFiscal>();
  for (const visita of visitas) {
    for (const fiscal of visita.fiscalizadores ?? []) {
      const carga = { ...(cargas.get(fiscal.id) ?? CARGA_VAZIA) };
      if (STATUS_ABERTOS.includes(visita.status)) carga.abertas += 1;
      if (venceHoje(visita, agora)) carga.vencemHoje += 1;
      if (estaAtrasada(visita, agora)) carga.atrasadas += 1;
      if (concluidaNoMes(visita, agora)) carga.noMes += 1;
      cargas.set(fiscal.id, carga);
    }
  }
  return cargas;
}

export function corDaCarga(abertas: number) {
  if (abertas >= 6) return cores.graficoAmarelo;
  if (abertas >= 4) return cores.graficoAzul;
  return cores.graficoVerde;
}

export function larguraDaCarga(abertas: number): `${number}%` {
  return `${Math.min(abertas / CAPACIDADE_FISCAL, 1) * 100}%`;
}
