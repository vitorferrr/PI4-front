import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { useVisitaEmAndamentoStore } from "./visitaEmAndamentoStore";

export const TOKEN_KEY = "token";
export const USUARIO_KEY = "usuario";

export interface UsuarioLogado {
  id: number;
  nome: string;
  email: string;
  role: string;
}

type SessaoState = {
  token: string | null;
  usuario: UsuarioLogado | null;
  carregada: boolean;
  carregar: () => Promise<void>;
  entrar: (token: string, usuario: UsuarioLogado) => Promise<void>;
  encerrar: () => Promise<void>;
};

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
  usuario: null,
  carregada: false,

  carregar: async () => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY).catch(() => null);
    const usuario = lerUsuarioSalvo(await SecureStore.getItemAsync(USUARIO_KEY).catch(() => null));

    if (token && !usuario) {
      await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
      set({ token: null, usuario: null, carregada: true });
      return;
    }

    set({ token, usuario, carregada: true });
  },

  entrar: async (token, usuario) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(USUARIO_KEY, JSON.stringify(usuario));
    set({ token, usuario });
  },

  encerrar: async () => {
    useVisitaEmAndamentoStore.getState().limparVisitaStore();
    set({ token: null, usuario: null });
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USUARIO_KEY);
  },
}));
