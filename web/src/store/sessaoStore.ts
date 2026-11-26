import { create } from "zustand";
import type { UsuarioLogado } from "@/types/usuario";

const TOKEN_KEY = "token";
const USUARIO_KEY = "usuario";

type SessaoState = {
  token: string | null;
  usuario: UsuarioLogado | null;
  entrar: (token: string, usuario: UsuarioLogado) => void;
  encerrar: () => void;
};

function lerSessaoSalva() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const usuario = JSON.parse(localStorage.getItem(USUARIO_KEY) ?? "null");
    if (token && typeof usuario?.id === "number") return { token, usuario };
  } catch {
    return { token: null, usuario: null };
  }
  return { token: null, usuario: null };
}

export const useSessaoStore = create<SessaoState>((set) => ({
  ...lerSessaoSalva(),

  entrar: (token, usuario) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario));
    set({ token, usuario });
  },

  encerrar: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USUARIO_KEY);
    set({ token: null, usuario: null });
  },
}));
