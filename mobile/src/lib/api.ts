import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { queryClient } from "./queryClient";

export const API_URL = "https://pi4-back-one.vercel.app";

export const TOKEN_KEY = "token";

type Opcoes = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
};

export async function sair() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  queryClient.clear();
  router.replace("/login");
}

export async function apiFetch<T>(caminho: string, opcoes: Opcoes = {}): Promise<T> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);

  const response = await fetch(`${API_URL}${caminho}`, {
    method: opcoes.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: opcoes.body !== undefined ? JSON.stringify(opcoes.body) : undefined,
  });

  if (response.status === 401) {
    await sair();
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  if (!response.ok) {
    const corpo = await response.json().catch(() => null);
    throw new Error(corpo?.mensagem ?? "Erro ao comunicar com o servidor");
  }

  return response.json() as Promise<T>;
}