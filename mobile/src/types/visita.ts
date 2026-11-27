export interface UsuarioResumo {
  id: number;
  nome: string;
  email: string;
}

export type StatusVisita = "agendada" | "em_andamento" | "concluida" | "cancelada";

export interface VisitaDetalhe {
  id: number;
  denunciado: string;
  status: StatusVisita;
  latitude: string | number | null;
  longitude: string | number | null;
  data_agendada: string;
  data_realizacao: string | null;
  observacoes_livres: string | null;
  endereco?: string | null;
  bairro?: string | null;
  gestor?: UsuarioResumo;
  fiscalizadores?: UsuarioResumo[];
  documentos?: { id: number }[];
  respostas?: RespostaSalva[];
}

export interface RespostaSalva {
  id: number;
  pergunta_id: number;
  resposta: string | null;
}

export interface Coordenadas {
  latitude: number;
  longitude: number;
}

export type TipoResposta = "sim_nao" | "numero" | "data" | "texto";

export interface PerguntaQuestionario {
  id: number;
  texto: string;
  tipo_resposta: TipoResposta;
  ordem: number;
}
