import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

export const TOKEN_KEY = "token";

type SessaoState = {
  token: string | null;
  carregada: boolean;
  carregar: () => Promise<void>;
  entrar: (token: string) => Promise<void>;
  encerrar: () => Promise<void>;
};

export const useSessaoStore = create<SessaoState>((set) => ({
  token: null,
  carregada: false,

  carregar: async () => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY).catch(() => null);
    set({ token, carregada: true });
  },

  entrar: async (token) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    set({ token });
  },

  encerrar: async () => {
    set({ token: null });
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  },
}));