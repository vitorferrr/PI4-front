import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (falhas, erro) =>
        !(erro as { sessaoExpirada?: boolean }).sessaoExpirada && falhas < 1,
      staleTime: 1000 * 60,
    },
  },
});