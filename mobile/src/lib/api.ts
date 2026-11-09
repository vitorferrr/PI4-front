import { queryClient } from "./queryClient";
import { useSessaoStore } from "@/store/sessaoStore";

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "https://pi4-back-one.vercel.app";

export class SessaoExpiradaError extends Error {
  sessaoExpirada = true;
}

export async function sair() {
  await useSessaoStore.getState().encerrar();
  queryClient.clear();
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  mensagemErroPadrao = "Erro na comunicação com o servidor."
): Promise<T> {
  const token = useSessaoStore.getState().token;

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