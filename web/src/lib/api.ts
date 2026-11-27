import axios, { type InternalAxiosRequestConfig } from "axios";
import { encerrarSessao } from "./queryClient";
import { sinalDaSessao, tokenValido } from "./sessao";
import { lerSessaoSalva, useSessaoStore } from "@/store/sessaoStore";
import type { UsuarioLogado } from "@/types/usuario";

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

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

export const api = axios.create({
  baseURL: API_URL,
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
  config.signal = config.signal
    ? AbortSignal.any([config.signal as AbortSignal, sinalDaSessao()])
    : sinalDaSessao();
  return config;
});

// ---------------------------------------------------------------------------
// DT-38: renovação automática da sessão.
// O access token dura 15 min. Quando uma requisição recebe 401, o painel troca o
// refresh token por um par novo (POST /auth/refresh) e repete a requisição uma vez.
// Só quando o back recusa o refresh (401/403) a sessão acaba e volta para o login.

interface RespostaRefresh {
  token: string;
  refreshToken: string;
  usuario: UsuarioLogado;
}

// Sem interceptors: a chamada de refresh não pode cair no tratamento de 401 abaixo.
const clienteRefresh = axios.create({ baseURL: API_URL, timeout: 15000 });

const LOCK_RENOVACAO = "pi4-renovar-sessao";
let renovacaoEmAndamento: Promise<string | null> | null = null;

// Uma renovação por vez nesta aba. O refresh token é de uso único: se duas
// requisições o trocassem juntas, o back veria a segunda como reuso e revogaria
// todas as sessões do usuário.
export function renovarSessao(): Promise<string | null> {
  renovacaoEmAndamento ??= renovarEntreAbas().finally(() => {
    renovacaoEmAndamento = null;
  });
  return renovacaoEmAndamento;
}

// As abas compartilham o localStorage. O lock impede duas abas de renovarem ao
// mesmo tempo; quem chega depois encontra o par novo já gravado e só o usa.
function renovarEntreAbas(): Promise<string | null> {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  return locks?.request ? locks.request(LOCK_RENOVACAO, executarRenovacao) : executarRenovacao();
}

// Devolve o access token novo, ou null quando a sessão não pode ser renovada.
// Erro de rede é repassado: o refresh token pode continuar válido, então não desloga.
async function executarRenovacao(): Promise<string | null> {
  const emMemoria = useSessaoStore.getState();
  const salva = lerSessaoSalva();

  // outra aba encerrou a sessão
  if (!salva.refreshToken) return null;

  if (salva.refreshToken !== emMemoria.refreshToken) {
    // outra aba saiu e outra pessoa entrou: esta aba não vira esse usuário. Sai só
    // desta aba (memória e cache), sem apagar o localStorage, que agora é do outro.
    if (salva.usuario?.id !== emMemoria.usuario?.id) {
      encerrarSessao({ manterArmazenamento: true });
      return null;
    }

    // outra aba já renovou: usa o par que ela gravou, sem gastar o refresh de novo
    useSessaoStore.getState().adotarSessao(salva);
    if (tokenValido(salva.token)) return salva.token;
    // o access token da outra aba também já venceu: renova com o refresh dela,
    // que ainda não foi usado (segue para a chamada abaixo)
  }

  let dados: RespostaRefresh;
  try {
    ({ data: dados } = await clienteRefresh.post<RespostaRefresh>(
      "/auth/refresh",
      { refreshToken: salva.refreshToken },
      { signal: sinalDaSessao() }
    ));
  } catch (erro) {
    const status = axios.isAxiosError(erro) ? erro.response?.status : undefined;
    if (status === 401 || status === 403) return null;
    throw erro;
  }

  // a sessão pode ter sido encerrada ou trocada enquanto a renovação estava no ar
  if (useSessaoStore.getState().refreshToken !== salva.refreshToken) return null;
  if (
    typeof dados?.token !== "string" ||
    typeof dados.refreshToken !== "string" ||
    !dados.usuario
  ) {
    return null;
  }

  useSessaoStore.getState().atualizarTokens(dados.token, dados.refreshToken, dados.usuario);
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

export async function sair() {
  // DT-38: manda o refresh token para o back revogar também a sessão longa
  const { refreshToken } = useSessaoStore.getState();
  await api
    .post("/auth/logout", refreshToken ? { refreshToken } : undefined, { timeout: 10000 })
    .catch(() => {});
  encerrarSessao();
}

interface CorpoDeErro {
  mensagem?: string;
  erro?: { mensagem?: string };
  erros?: unknown;
}

const MENSAGEM_ERRO_PADRAO = "Erro na comunicação com o servidor.";

function converterErro(erro: unknown): Error {
  if (axios.isCancel(erro)) return erro as Error;
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
