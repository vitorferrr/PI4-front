import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { queryClient } from "./queryClient";

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "https://pi4-back-one.vercel.app";

export const TOKEN_KEY = "token";
export class SessaoExpiradaError extends Error {
  sessaoExpirada = true;
}

// Encerra a sessão: apaga o token, limpa os dados em cache e volta ao login.
export async function sair() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  queryClient.clear();
  router.replace("/login");
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  mensagemErroPadrao = "Erro na comunicação com o servidor."
): Promise<T> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 401) {
    await sair();
    throw new SessaoExpiradaError("Sessão expirada. Faça login novamente.");
  }

  if (!response.ok) {
    const erro = await response.json().catch(() => null);
    throw new Error(erro?.erro?.mensagem || erro?.mensagem || mensagemErroPadrao);
  }

  return response.json() as Promise<T>;
}