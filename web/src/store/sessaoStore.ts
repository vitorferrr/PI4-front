import { create } from "zustand";
import { tokenValido } from "@/lib/sessao";
import type { UsuarioLogado } from "@/types/usuario";

const TOKEN_KEY = "token";
const USUARIO_KEY = "usuario";
// DT-38: refresh token (30 dias, uso único) para renovar o access token de 15 min
const REFRESH_TOKEN_KEY = "refresh_token";

export interface SessaoSalva {
  token: string | null;
  refreshToken: string | null;
  usuario: UsuarioLogado | null;
}

type SessaoState = SessaoSalva & {
  entrar: (token: string, usuario: UsuarioLogado, refreshToken?: string | null) => void;
  // troca os tokens depois do POST /auth/refresh
  atualizarTokens: (token: string, refreshToken: string, usuario: UsuarioLogado) => void;
  // usa a sessão que outra aba acabou de renovar (já está no localStorage)
  adotarSessao: (sessao: SessaoSalva) => void;
  encerrar: () => void;
};

const SEM_SESSAO: SessaoSalva = { token: null, refreshToken: null, usuario: null };

// Lê o que está gravado agora. O localStorage é compartilhado entre as abas, então
// é aqui que uma aba descobre que outra renovou ou encerrou a sessão.
export function lerSessaoSalva(): SessaoSalva {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    const usuario = JSON.parse(localStorage.getItem(USUARIO_KEY) ?? "null");
    if (typeof usuario?.id !== "number" || !token) return SEM_SESSAO;
    return { token, refreshToken, usuario };
  } catch {
    return SEM_SESSAO;
  }
}

function sessaoInicial(): SessaoSalva {
  const sessao = lerSessaoSalva();
  // access token vencido não encerra a sessão se houver refresh token:
  // a primeira requisição renova (DT-38)
  if (sessao.token && (tokenValido(sessao.token) || sessao.refreshToken)) return sessao;
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USUARIO_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // localStorage indisponível: segue sem sessão
  }
  return SEM_SESSAO;
}

function gravar(token: string, usuario: UsuarioLogado, refreshToken: string | null) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario));
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  else localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export const useSessaoStore = create<SessaoState>((set) => ({
  ...sessaoInicial(),

  entrar: (token, usuario, refreshToken = null) => {
    gravar(token, usuario, refreshToken);
    set({ token, refreshToken, usuario });
  },

  atualizarTokens: (token, refreshToken, usuario) => {
    gravar(token, usuario, refreshToken);
    set({ token, refreshToken, usuario });
  },

  adotarSessao: ({ token, refreshToken, usuario }) => {
    set({ token, refreshToken, usuario });
  },

  encerrar: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USUARIO_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    set(SEM_SESSAO);
  },
}));
