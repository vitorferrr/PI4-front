import { QueryClient } from '@tanstack/react-query';
import { create } from 'zustand';
import { useNovaVisitaStore } from '../store/novaVisitaStore.js';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (falhas, erro) => falhas < 1
        && erro?.code !== 'ERR_CANCELED'
        && ![401, 403].includes(erro?.response?.status),
    },
  },
});

export const useSession = create(() => ({ token: null, claims: null, version: 0 }));

let sessionVersion = 0;
let requestController = new AbortController();
let expirationTimer;

// A leitura das claims permite controlar a expiração, mas não verifica a assinatura.
// A autenticidade do token e todas as permissões continuam sob responsabilidade da API.
function readClaims(token) {
  if (typeof token !== 'string') return null;
  const partes = token.split('.');
  if (partes.length !== 3 || partes.some((parte) => !/^[\w-]+$/.test(parte))) return null;

  try {
    const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')), (char) => char.charCodeAt(0));
    const claims = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (!claims || typeof claims.exp !== 'number' || !Number.isFinite(claims.exp * 1000)) return null;
    return claims.exp * 1000 > Date.now() ? claims : null;
  } catch {
    return null;
  }
}

export function isTokenValid(token) {
  return readClaims(token) !== null;
}

function scheduleExpiration() {
  clearTimeout(expirationTimer);
  const { token, claims } = useSession.getState();
  if (!token) return;

  const restante = claims.exp * 1000 - Date.now();
  if (restante <= 0) {
    endSession();
    return;
  }

  // setTimeout aceita no máximo cerca de 24 dias; tokens mais longos são reavaliados.
  expirationTimer = setTimeout(scheduleExpiration, Math.min(restante, 2147483647));
}

function replaceSession(token, claims) {
  sessionVersion += 1;
  requestController.abort();
  requestController = new AbortController();
  void queryClient.cancelQueries();
  queryClient.clear();
  useNovaVisitaStore.getState().limparSelecao();
  clearTimeout(expirationTimer);

  // O perfil legado não é uma fonte de sessão nem de autorização.
  window.localStorage.removeItem('role');
  if (token) window.localStorage.setItem('token', token);
  else window.localStorage.removeItem('token');

  useSession.setState({ token, claims, version: sessionVersion });
  scheduleExpiration();
}

export function startSession(token) {
  const claims = readClaims(token);
  if (!claims) throw new Error('O servidor não retornou um JWT válido com expiração.');
  replaceSession(token, claims);
}

export function endSession() {
  replaceSession(null, null);
}

function syncSession() {
  const token = window.localStorage.getItem('token');
  const currentToken = useSession.getState().token;
  if (token === currentToken && (token === null || isTokenValid(token))) return;

  const claims = readClaims(token);
  replaceSession(claims ? token : null, claims);
}

export function getSessionRequest() {
  syncSession();
  return {
    token: useSession.getState().token,
    version: sessionVersion,
    signal: requestController.signal,
  };
}

export function initializeSession() {
  window.localStorage.removeItem('role');
  syncSession();
  scheduleExpiration();

  const onStorage = (event) => {
    if (event.storageArea === window.localStorage && (event.key === 'token' || event.key === null)) {
      syncSession();
    }
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener('focus', syncSession);
  document.addEventListener('visibilitychange', syncSession);

  return () => {
    clearTimeout(expirationTimer);
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('focus', syncSession);
    document.removeEventListener('visibilitychange', syncSession);
  };
}
