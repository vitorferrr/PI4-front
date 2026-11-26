import { isCancelledError, MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { isCancel } from "axios";
import { cancelarRequisicoes } from "@/lib/sessao";
import { useSessaoStore } from "@/store/sessaoStore";

export function ehSessaoExpirada(erro: unknown) {
  return (erro as { sessaoExpirada?: boolean } | null)?.sessaoExpirada === true;
}

function deveRepetir(falhas: number, erro: unknown) {
  if (falhas >= 1 || ehSessaoExpirada(erro) || isCancel(erro) || isCancelledError(erro)) {
    return false;
  }
  return (erro as { status?: number } | null)?.status !== 403;
}

export function encerrarSessao() {
  cancelarRequisicoes();
  useSessaoStore.getState().encerrar();
  queryClient.cancelQueries();
  queryClient.clear();
}

function aoFalhar(erro: unknown) {
  if (ehSessaoExpirada(erro)) encerrarSessao();
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: aoFalhar }),
  mutationCache: new MutationCache({ onError: aoFalhar }),
  defaultOptions: {
    queries: {
      retry: deveRepetir,
      refetchOnWindowFocus: false,
    },
  },
});
