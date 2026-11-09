import axios from 'axios';
import { endSession, getSessionRequest } from './session';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
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
    if (response.config._session?.version !== getSessionRequest().version) {
      throw new axios.CanceledError('A sessão desta requisição foi encerrada.');
    }
    return response;
  },
  (error) => {
    const session = error.config?._session;
    if (session && session.version !== getSessionRequest().version) {
      return Promise.reject(new axios.CanceledError('A sessão desta requisição foi encerrada.'));
    }
    if (error.response?.status === 401 && session?.authenticated) {
      endSession();
    }
    return Promise.reject(error);
  },
);
