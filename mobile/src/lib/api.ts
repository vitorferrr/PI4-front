import axios from "axios";
import { queryClient } from "./queryClient";
import { useSessaoStore } from "@/store/sessaoStore";

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://pi4-back-one.vercel.app";

export class SessaoExpiradaError extends Error {
  sessaoExpirada = true;
}

export class ApiError extends Error {
  erros: string[];
  status?: number;

  constructor(mensagem: string, erros: string[] = [], status?: number) {
    super(mensagem);
    this.erros = erros;
    this.status = status;
  }
}

export async function sair() {
  await useSessaoStore.getState().encerrar();
  queryClient.clear();
}

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

const ROTAS_SEM_SESSAO = ["/auth/login"];

api.interceptors.request.use((config) => {
  const token = useSessaoStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (resposta) => resposta,
  async (erro) => {
    const rotaSemSessao = ROTAS_SEM_SESSAO.includes(erro.config?.url ?? "");
    if (axios.isAxiosError(erro) && erro.response?.status === 401 && !rotaSemSessao) {
      await sair();
      return Promise.reject(new SessaoExpiradaError("Sessão expirada. Faça login novamente."));
    }
    return Promise.reject(erro);
  }
);

interface CorpoDeErro {
  mensagem?: string;
  erro?: { mensagem?: string };
  erros?: unknown;
}

function converterErro(erro: unknown, mensagemPadrao: string): Error {
  if (erro instanceof SessaoExpiradaError) return erro;

  if (axios.isAxiosError(erro)) {
    if (erro.code === "ECONNABORTED") {
      return new ApiError("O servidor demorou para responder. Tente novamente em instantes.");
    }
    if (!erro.response) {
      return new ApiError("Sem conexão. Verifique a internet e tente novamente.");
    }
    const dados = erro.response.data as CorpoDeErro | undefined;
    const erros = Array.isArray(dados?.erros)
      ? dados.erros.filter((item): item is string => typeof item === "string")
      : [];
    return new ApiError(
      dados?.erro?.mensagem || dados?.mensagem || mensagemPadrao,
      erros,
      erro.response.status
    );
  }

  return erro instanceof Error ? erro : new ApiError(mensagemPadrao);
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  mensagemErroPadrao = "Erro na comunicação com o servidor."
): Promise<T> {
  try {
    const resposta = await api.request<T>({
      url: path,
      method: init.method ?? "GET",
      data: init.body ?? undefined,
      headers: init.headers as Record<string, string> | undefined,
    });
    return (resposta.status === 204 ? undefined : resposta.data) as T;
  } catch (erro) {
    throw converterErro(erro, mensagemErroPadrao);
  }
}
