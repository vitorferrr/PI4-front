import type { Role, UsuarioResumo } from "./usuario";

export type StatusVisita = "agendada" | "em_andamento" | "concluida" | "cancelada";

export interface Pergunta {
  id: number;
  texto: string;
  ordem?: number;
}

export interface Resposta {
  id: number;
  pergunta_id: number;
  resposta: string | null;
  pergunta?: Pergunta;
}

export interface Documento {
  id: number;
  url_arquivo_pdf?: string | null;
  data_geracao?: string | null;
  enviado_email?: boolean | null;
}

export interface Visita {
  id: number;
  denunciado: string;
  status: StatusVisita;
  gestor_id?: number;
  data_agendada?: string | null;
  data_realizacao?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  observacoes_livres?: string | null;
  razao_social?: string | null;
  nome_fantasia?: string | null;
  endereco?: string | null;
  bairro?: string | null;
  cep?: string | null;
  telefone?: string | null;
  cnpj_cpf?: string | null;
  atividade?: string | null;
  gestor?: UsuarioResumo | null;
  fiscalizadores?: UsuarioResumo[];
  respostas?: Resposta[];
  documentos?: Documento[];
  updatedAt?: string;
}

export interface DadosGerais {
  visitas: { total: number; por_status: Record<StatusVisita, number> };
  usuarios: { total: number; por_role: Record<Role, number> };
  documentos: { total: number };
  assinaturas: { total: number };
}
