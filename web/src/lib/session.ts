import { create } from 'zustand';
import type { Role } from '../types';

export interface Claims {
  id?: number;
  role?: Role | string;
  exp: number;
  jti?: string;
}

export interface UsuarioSessao {
  id: number;
  nome: string;
  email?: string;
  role: string;
}

interface SessionState {
  token: string | null;
  claims: Claims | null;
  usuario: UsuarioSessao | null;
  version: number;
}

export const useSession = create<SessionState>(() => ({ token: null, claims: null, usuario: null, version: 0 }));

let sessionVersion = 0;
let ultimoUsuarioId: number | undefined;
let requestController = new AbortController();
let expirationTimer: ReturnType<typeof setTimeout> | undefined;
const sessionChangeListeners = new Set<() => void>();

export function onSessionChange(callback: () => void) {
  sessionChangeListeners.add(callback);
  return () => {
    sessionChangeListeners.delete(callback);
  };
}

// Consultar a versão não valida o JWT nem modifica a sessão ao receber uma resposta.
export function getSessionVersion() {
  return sessionVersion;
}

// A leitura das claims permite controlar a expiração, mas não verifica a assinatura.
// A autenticidade do token e todas as permissões continuam sob responsabilidade da API.
function readClaims(token: unknown): Claims | null {
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

// Dono da sessão anterior: o login só volta para a página de onde saiu se for a mesma pessoa.
export function getUltimoUsuarioId() {
  return ultimoUsuarioId;
}

export function isTokenValid(token: unknown) {
  return readClaims(token) !== null;
}

// O usuário guardado só serve para exibir nome e perfil; ele precisa ser o dono do token atual.
function lerUsuario(valor: unknown, claims: Claims | null): UsuarioSessao | null {
  if (!claims || typeof valor !== 'string') return null;
  try {
    const usuario = JSON.parse(valor);
    return usuario && usuario.id === claims.id && typeof usuario.nome === 'string'
      ? { id: usuario.id, nome: usuario.nome, email: usuario.email, role: String(claims.role ?? usuario.role) }
      : null;
  } catch {
    return null;
  }
}

function scheduleExpiration() {
  clearTimeout(expirationTimer);
  const { token, claims } = useSession.getState();
  if (!token || !claims) return;

  const restante = claims.exp * 1000 - Date.now();
  if (restante <= 0) {
    endSession();
    return;
  }

  // setTimeout aceita no máximo cerca de 24 dias; tokens mais longos são reavaliados.
  expirationTimer = setTimeout(scheduleExpiration, Math.min(restante, 2147483647));
}

function replaceSession(token: string | null, claims: Claims | null, usuario: UsuarioSessao | null) {
  ultimoUsuarioId = useSession.getState().claims?.id ?? ultimoUsuarioId;
  sessionVersion += 1;
  requestController.abort();
  requestController = new AbortController();
  clearTimeout(expirationTimer);

  // O perfil legado não é uma fonte de sessão nem de autorização.
  window.localStorage.removeItem('role');
  if (token) window.localStorage.setItem('token', token);
  else window.localStorage.removeItem('token');
  if (usuario) window.localStorage.setItem('usuario', JSON.stringify(usuario));
  else window.localStorage.removeItem('usuario');

  // Os consumidores limpam dados privados antes de a próxima sessão ficar visível.
  sessionChangeListeners.forEach((callback) => callback());
  useSession.setState({ token, claims, usuario, version: sessionVersion });
  scheduleExpiration();
}

export function startSession(token: unknown, usuario?: unknown) {
  const claims = readClaims(token);
  if (!claims) throw new Error('O servidor não retornou um JWT válido com expiração.');
  replaceSession(token as string, claims, lerUsuario(JSON.stringify(usuario ?? null), claims));
}

export function endSession() {
  replaceSession(null, null, null);
}

function syncSession() {
  const token = window.localStorage.getItem('token');
  const atual = useSession.getState();
  if (token === atual.token && (token === null || isTokenValid(token))) {
    const usuario = lerUsuario(window.localStorage.getItem('usuario'), atual.claims);
    if (usuario?.nome !== atual.usuario?.nome) useSession.setState({ usuario });
    return;
  }

  const claims = readClaims(token);
  const usuario = lerUsuario(window.localStorage.getItem('usuario'), claims);
  replaceSession(claims ? token : null, claims, usuario);
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

  const onStorage = (event: StorageEvent) => {
    if (event.storageArea === window.localStorage && (event.key === 'token' || event.key === 'usuario' || event.key === null)) {
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
