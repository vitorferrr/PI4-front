import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";

export const API_URL = "IP_LOCAL"; // mantenha exatamente como estava na sua linha 1

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  mensagemErroPadrao = "Erro na comunicação com o servidor."
): Promise<T> {
  const token = await SecureStore.getItemAsync("token");

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
    await SecureStore.deleteItemAsync("token");
    router.replace("/login");
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  if (!response.ok) {
    const erro = await response.json().catch(() => null);
    throw new Error(erro?.erro?.mensagem || erro?.mensagem || mensagemErroPadrao);
  }

  return response.json() as Promise<T>;
}