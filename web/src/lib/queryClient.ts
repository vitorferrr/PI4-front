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

// manterArmazenamento: encerra só esta aba (memória e cache), sem apagar o
// localStorage compartilhado, quando ele já pertence a outra sessão (DT-38).
export function encerrarSessao({ manterArmazenamento = false } = {}) {
  cancelarRequisicoes();
  if (manterArmazenamento) {
    useSessaoStore.getState().adotarSessao({ token: null, refreshToken: null, usuario: null });
  } else {
    useSessaoStore.getState().encerrar();
  }
  queryClient.cancelQueries();
  queryClient.clear();
}

function aoFalhar(erro: unknown) {
  // sessão já encerrada nesta aba (ex.: outra pessoa entrou em outra aba): nada a fazer
  if (ehSessaoExpirada(erro) && useSessaoStore.getState().token !== null) encerrarSessao();
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
