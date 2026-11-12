import { isCancelledError, QueryClient } from '@tanstack/react-query';
import { isCancel } from 'axios';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (falhas, erro) => falhas < 1
        && !isCancel(erro)
        && !isCancelledError(erro)
        && erro?.code !== 'ERR_CANCELED'
        && ![401, 403].includes(erro?.response?.status),
    },
  },
});
