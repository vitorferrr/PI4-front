export type StatusVisita = "agendada" | "em_andamento" | "concluida" | "cancelada";

export type Usuario = {
  id: number;
  nome: string;
  email: string;
  role: "admin" | "gestor" | "fiscalizador";
};

export type Visita = {
  id: number;
  denunciado: string;
  status: StatusVisita;
  data_agendada: string;
  data_realizacao: string | null;
  observacoes_livres: string | null;
  latitude: string | null;
  longitude: string | null;
  gestor: Usuario;
  fiscalizadores: Usuario[];
};