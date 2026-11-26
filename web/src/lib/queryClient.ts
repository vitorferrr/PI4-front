import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { useSessaoStore } from "@/store/sessaoStore";

export function ehSessaoExpirada(erro: unknown) {
  return (erro as { sessaoExpirada?: boolean } | null)?.sessaoExpirada === true;
}

export function encerrarSessao() {
  useSessaoStore.getState().encerrar();
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
      retry: (falhas, erro) => !ehSessaoExpirada(erro) && falhas < 1,
      refetchOnWindowFocus: false,
    },
  },
});
