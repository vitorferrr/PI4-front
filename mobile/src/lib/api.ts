import axios from "axios";
import { encerrarSessao } from "./queryClient";
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
  await encerrarSessao();
}

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

// 401 nessas rotas não é sessão expirada: no login é senha errada; no logout
// (DT-03) o token pode já estar vencido e o "Sair" não deve virar o alerta de expiração.
const ROTAS_SEM_SESSAO = ["/auth/login", "/auth/logout"];

api.interceptors.request.use((config) => {
  const token = useSessaoStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// aqui só marcamos o erro: quem encerra a sessão e leva para o login é o handler
// global do React Query (lib/queryClient.ts). Se a sessão fosse limpa aqui, o
// queryClient.clear() cancelaria as queries antes de o erro chegar até elas.
// IMPORTANTE: toda chamada à API deve passar por useQuery/useMutation. Uma chamada
// direta (num useEffect ou botão sem mutation) recebe a SessaoExpiradaError, mas
// não encerra a sessão nem leva ao login.
api.interceptors.response.use(
  (resposta) => resposta,
  (erro) => {
    const rotaSemSessao = ROTAS_SEM_SESSAO.includes(erro.config?.url ?? "");
    if (axios.isAxiosError(erro) && erro.response?.status === 401 && !rotaSemSessao) {
      return Promise.reject(new SessaoExpiradaError("Sessão expirada. Faça login novamente."));
    }
    return Promise.reject(converterErro(erro));
  }
);

interface CorpoDeErro {
  mensagem?: string;
  erro?: { mensagem?: string };
  erros?: unknown;
}

const MENSAGEM_ERRO_PADRAO = "Erro na comunicação com o servidor.";

function converterErro(erro: unknown): Error {
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
      dados?.erro?.mensagem || dados?.mensagem || MENSAGEM_ERRO_PADRAO,
      erros,
      erro.response.status
    );
  }

  return erro instanceof Error ? erro : new ApiError(MENSAGEM_ERRO_PADRAO);
}
