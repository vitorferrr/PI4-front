export interface UsuarioResumo {
  id: number;
  nome: string;
  email: string;
}

export interface VisitaDetalhe {
  id: number;
  denunciado: string;
  status: "agendada" | "em_andamento" | "concluida" | "cancelada";
  latitude: string | number | null;
  longitude: string | number | null;
  data_agendada: string;
  data_realizacao: string | null;
  observacoes_livres: string | null;
  gestor?: UsuarioResumo;
  fiscalizadores?: UsuarioResumo[];
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
  obrigatoria?: boolean;
}