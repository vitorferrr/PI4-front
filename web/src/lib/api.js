import axios from 'axios';
import { endSession, getSessionRequest, getSessionVersion } from './session';

const configuredApiUrl = (import.meta.env.VITE_API_URL ?? '').trim();
if (!configuredApiUrl && !import.meta.env.DEV) {
  throw new Error('Configure VITE_API_URL com a URL da API antes de publicar a aplicação.');
}

export const api = axios.create({
  baseURL: configuredApiUrl || 'http://localhost:3000',
});

api.interceptors.request.use((config) => {
  const session = getSessionRequest();
  config._session = { version: session.version, authenticated: !config.skipAuth && Boolean(session.token) };

  if (config.skipAuth) {
    config.headers.delete('Authorization');
  } else {
    if (!session.token) throw new axios.CanceledError('Sessão indisponível. Faça login novamente.');
    config.headers.set('Authorization', `Bearer ${session.token}`);
  }

  config.signal = config.signal
    ? AbortSignal.any([config.signal, session.signal])
    : session.signal;
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (response.config._session?.version !== getSessionVersion()) {
      throw new axios.CanceledError('A sessão desta requisição foi encerrada.');
    }
    return response;
  },
  (error) => {
    const session = error.config?._session;
    if (session && session.version !== getSessionVersion()) {
      return Promise.reject(new axios.CanceledError('A sessão desta requisição foi encerrada.'));
    }
    if (error.response?.status === 401 && session?.authenticated) {
      endSession();
    }
    return Promise.reject(error);
  },
);
