import axios, { type InternalAxiosRequestConfig } from "axios";
import { encerrarSessao } from "./queryClient";
import { useSessaoStore, type UsuarioLogado } from "@/store/sessaoStore";

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
  // DT-38: manda o refresh token para o back revogar também a sessão longa
  const { refreshToken } = useSessaoStore.getState();
  await api
    .post("/auth/logout", refreshToken ? { refreshToken } : undefined, { timeout: 10000 })
    .catch(() => {});
  await encerrarSessao();
}

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

const ROTAS_SEM_SESSAO = ["/auth/login", "/auth/logout"];

type ConfigDaSessao = InternalAxiosRequestConfig & {
  _tokenUsado?: string | null;
  _sessaoRenovada?: boolean;
};

api.interceptors.request.use((config: ConfigDaSessao) => {
  const token = useSessaoStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config._tokenUsado = token;
  return config;
});

// ---------------------------------------------------------------------------
// DT-38: renovação automática da sessão.
// O access token dura 15 min. Quando uma requisição recebe 401, o app troca o
// refresh token por um par novo (POST /auth/refresh) e repete a requisição uma vez.
// Só quando o back recusa o refresh (401/403) a sessão acaba, e aí o handler
// global do queryClient leva para o login, como antes.

interface RespostaRefresh {
  token: string;
  refreshToken: string;
  usuario: UsuarioLogado;
}

// Sem interceptors: a chamada de refresh não pode cair no tratamento de 401 abaixo.
const clienteRefresh = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

let renovacaoEmAndamento: Promise<string | null> | null = null;

// Uma renovação por vez. O refresh token é de uso único: se duas requisições o
// trocassem juntas, o back veria a segunda como reuso e revogaria todas as sessões.
export function renovarSessao(): Promise<string | null> {
  renovacaoEmAndamento ??= executarRenovacao().finally(() => {
    renovacaoEmAndamento = null;
  });
  return renovacaoEmAndamento;
}

// Devolve o access token novo, ou null quando a sessão não pode ser renovada.
// Erro de rede é repassado: o refresh token pode continuar válido, então não desloga.
async function executarRenovacao(): Promise<string | null> {
  const { refreshToken } = useSessaoStore.getState();
  if (!refreshToken) return null;

  let dados: RespostaRefresh;
  try {
    ({ data: dados } = await clienteRefresh.post<RespostaRefresh>("/auth/refresh", {
      refreshToken,
    }));
  } catch (erro) {
    const status = axios.isAxiosError(erro) ? erro.response?.status : undefined;
    if (status === 401 || status === 403) return null;
    throw erro;
  }

  // a sessão pode ter sido encerrada ou trocada enquanto a renovação estava no ar
  if (useSessaoStore.getState().refreshToken !== refreshToken) return null;
  if (
    typeof dados?.token !== "string" ||
    typeof dados.refreshToken !== "string" ||
    !dados.usuario
  ) {
    return null;
  }

  await useSessaoStore.getState().atualizarTokens(dados.token, dados.refreshToken, dados.usuario);
  return dados.token;
}

api.interceptors.response.use(
  (resposta) => resposta,
  async (erro) => {
    const config = erro.config as ConfigDaSessao | undefined;
    const rotaSemSessao = ROTAS_SEM_SESSAO.includes(config?.url ?? "");

    if (axios.isAxiosError(erro) && erro.response?.status === 401 && !rotaSemSessao) {
      if (config && !config._sessaoRenovada) {
        config._sessaoRenovada = true;
        try {
          const tokenAtual = useSessaoStore.getState().token;
          // outra requisição já renovou depois que esta saiu: só repete com o token atual
          const tokenNovo =
            tokenAtual && tokenAtual !== config._tokenUsado ? tokenAtual : await renovarSessao();
          if (tokenNovo) return await api.request(config);
        } catch (erroDaRenovacao) {
          return Promise.reject(converterErro(erroDaRenovacao));
        }
      }
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
