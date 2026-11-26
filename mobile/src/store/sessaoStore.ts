import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { useVisitaEmAndamentoStore } from "./visitaEmAndamentoStore";

export const TOKEN_KEY = "token";
export const USUARIO_KEY = "usuario";
// DT-38: refresh token (30 dias, uso único) para renovar o access token de 15 min
export const REFRESH_TOKEN_KEY = "refresh_token";
// id de quem estava com a visita em andamento: ela sobrevive à expiração do token,
// mas não pode aparecer para outro fiscal que faça login no mesmo aparelho
const DONO_VISITA_KEY = "visita_dono";

export interface UsuarioLogado {
  id: number;
  nome: string;
  email: string;
  role: string;
}

type SessaoState = {
  token: string | null;
  // null quando o back ainda não envia refresh token (antes da DT-38)
  refreshToken: string | null;
  usuario: UsuarioLogado | null;
  carregada: boolean;
  carregar: () => Promise<void>;
  entrar: (token: string, usuario: UsuarioLogado, refreshToken?: string | null) => Promise<void>;
  // troca os tokens depois do POST /auth/refresh, sem mexer na visita em andamento
  atualizarTokens: (token: string, refreshToken: string, usuario: UsuarioLogado) => Promise<void>;
  encerrar: (opcoes?: { manterVisita?: boolean }) => Promise<void>;
};

async function salvarRefreshToken(refreshToken: string | null | undefined) {
  if (refreshToken) await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  else await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => {});
}

function lerUsuarioSalvo(texto: string | null): UsuarioLogado | null {
  if (!texto) return null;
  try {
    const usuario = JSON.parse(texto);
    return typeof usuario?.id === "number" ? usuario : null;
  } catch {
    return null;
  }
}

export const useSessaoStore = create<SessaoState>((set) => ({
  token: null,
  refreshToken: null,
  usuario: null,
  carregada: false,

  carregar: async () => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY).catch(() => null);
    const usuario = lerUsuarioSalvo(await SecureStore.getItemAsync(USUARIO_KEY).catch(() => null));
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY).catch(() => null);

    if (token && !usuario) {
      await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => {});
      set({ token: null, refreshToken: null, usuario: null, carregada: true });
      return;
    }

    // migração: quem já estava logado antes desta versão não tem o dono gravado.
    // Sem isso, a primeira expiração depois do update apagaria a visita em andamento.
    if (usuario) {
      const donoVisita = await SecureStore.getItemAsync(DONO_VISITA_KEY).catch(() => null);
      if (donoVisita === null) {
        await SecureStore.setItemAsync(DONO_VISITA_KEY, String(usuario.id)).catch(() => {});
      }
    }

    set({ token, refreshToken: token ? refreshToken : null, usuario, carregada: true });
  },

  entrar: async (token, usuario, refreshToken = null) => {
    const donoVisita = await SecureStore.getItemAsync(DONO_VISITA_KEY).catch(() => null);
    if (donoVisita !== String(usuario.id)) {
      useVisitaEmAndamentoStore.getState().limparVisitaStore();
    }
    await SecureStore.setItemAsync(DONO_VISITA_KEY, String(usuario.id));
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(USUARIO_KEY, JSON.stringify(usuario));
    await salvarRefreshToken(refreshToken);
    set({ token, refreshToken, usuario });
  },

  atualizarTokens: async (token, refreshToken, usuario) => {
    // grava antes de atualizar o estado: se o app fechar no meio, o próximo
    // carregar() já usa o par novo (o refresh antigo não vale mais no back)
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await salvarRefreshToken(refreshToken);
    await SecureStore.setItemAsync(USUARIO_KEY, JSON.stringify(usuario));
    set({ token, refreshToken, usuario });
  },

  // manterVisita: usado quando o token expira no meio da visita, para o fiscal
  // não perder respostas e assinaturas (que já foram enviadas ao back)
  encerrar: async ({ manterVisita = false } = {}) => {
    if (!manterVisita) {
      useVisitaEmAndamentoStore.getState().limparVisitaStore();
      await SecureStore.deleteItemAsync(DONO_VISITA_KEY).catch(() => {});
    }
    set({ token: null, refreshToken: null, usuario: null });
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USUARIO_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => {});
  },
}));
