export type Role = "admin" | "gestor" | "fiscalizador";

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  role: Role;
  matricula?: string | null;
  aprovado?: boolean;
}

export type UsuarioResumo = Pick<Usuario, "id" | "nome"> & Partial<Usuario>;

export type UsuarioLogado = Pick<Usuario, "id" | "nome" | "email" | "role">;
