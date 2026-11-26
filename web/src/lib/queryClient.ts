import { isCancelledError, QueryClient } from '@tanstack/react-query';
import { isCancel } from 'axios';
import { statusDoErro } from './erros';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (falhas, erro) => falhas < 1
        && !isCancel(erro)
        && !isCancelledError(erro)
        && (erro as { code?: string })?.code !== 'ERR_CANCELED'
        && ![401, 403].includes(statusDoErro(erro) ?? 0),
    },
  },
});
