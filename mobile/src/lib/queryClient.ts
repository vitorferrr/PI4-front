import { Alert } from "react-native";
import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { useSessaoStore } from "@/store/sessaoStore";
import { useVisitaEmAndamentoStore } from "@/store/visitaEmAndamentoStore";

// o interceptor do axios (lib/api.ts) transforma o 401 do back em SessaoExpiradaError
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
    const temVisitaEmAndamento = useVisitaEmAndamentoStore.getState().visitaId !== null;
    // a visita em andamento fica salva: depois do login o fiscal continua de onde parou.
    // Não precisa navegar: ao zerar o token, o Stack.Protected do _layout leva para o login.
    await encerrarSessao({ manterVisita: true });
    Alert.alert(
      "Sessão expirada",
      temVisitaEmAndamento
        ? "Por segurança, faça login novamente. Os dados da visita em andamento continuam salvos."
        : "Por segurança, faça login novamente."
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
