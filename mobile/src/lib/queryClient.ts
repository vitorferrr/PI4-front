import { Alert } from "react-native";
import { router } from "expo-router";
import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { useSessaoStore } from "@/store/sessaoStore";

// o apiFetch transforma o 401 do back em SessaoExpiradaError (com a flag sessaoExpirada)
export function ehSessaoExpirada(erro: unknown) {
  return (erro as { sessaoExpirada?: boolean } | null)?.sessaoExpirada === true;
}

export async function encerrarSessao(opcoes?: { manterVisita?: boolean }) {
  await useSessaoStore.getState().encerrar(opcoes);
  queryClient.clear();
}

let encerrandoSessaoExpirada = false;

// várias queries podem falhar juntas com 401: só a primeira encerra a sessão e mostra o aviso
async function tratarSessaoExpirada() {
  if (encerrandoSessaoExpirada || useSessaoStore.getState().token === null) return;
  encerrandoSessaoExpirada = true;

  try {
    // a visita em andamento fica salva: depois do login o fiscal continua de onde parou
    await encerrarSessao({ manterVisita: true });
    router.replace("/login");
    Alert.alert(
      "Sessão expirada",
      "Por segurança, faça login novamente. Os dados da visita em andamento continuam salvos."
    );
  } finally {
    encerrandoSessaoExpirada = false;
  }
}

function aoFalhar(erro: unknown) {
  if (ehSessaoExpirada(erro)) tratarSessaoExpirada().catch(() => {});
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: aoFalhar }),
  mutationCache: new MutationCache({ onError: aoFalhar }),
  defaultOptions: {
    queries: {
      retry: (falhas, erro) => !ehSessaoExpirada(erro) && falhas < 1,
      staleTime: 1000 * 60,
    },
  },
});
