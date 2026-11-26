import assert from 'node:assert/strict';
import { after, afterEach, before, beforeEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const originalWindow = globalThis.window;
const originalDocument = globalThis.document;
const storage = new Map();
const h = React.createElement;
let server, api, session, queryClient, visitas, defaults, disposeSession;
let AppLayout, UsuariosPage, FiscalizadoresPage;

function jwt(role = 'admin', id = 1) {
  const encode = (value) => btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${encode({ alg: 'HS256' })}.${encode({ id, role, exp: Date.now() / 1000 + 3600 })}.assinatura`;
}

const response = (config, data, status = 200) => ({ config, data, status, statusText: String(status), headers: {} });

const agora = new Date();
const dias = (quantidade) => new Date(agora.getTime() + quantidade * 86400000).toISOString();
const ana = { id: 11, nome: 'Ana Paula Ferreira' };
const bruno = { id: 12, nome: 'Bruno Lima' };
const listaVisitas = [
  { id: 1, denunciado: 'Mercado A', status: 'agendada', data_agendada: dias(-3), fiscalizadores: [ana] },
  { id: 2, denunciado: 'Mercado B', status: 'agendada', data_agendada: agora.toISOString(), fiscalizadores: [ana] },
  { id: 3, denunciado: 'Mercado C', status: 'em_andamento', data_agendada: dias(2), fiscalizadores: [ana] },
  { id: 4, denunciado: 'Mercado D', status: 'concluida', data_agendada: agora.toISOString(), data_realizacao: agora.toISOString(), fiscalizadores: [bruno] },
  { id: 5, denunciado: 'Mercado E', status: 'cancelada', data_agendada: dias(-10), fiscalizadores: [bruno] },
];

before(async () => {
  server = await createServer({
    root, envDir: false, logLevel: 'silent',
    define: { 'import.meta.env.VITE_API_URL': 'undefined', 'import.meta.env.DEV': 'true' },
    server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom',
  });
  globalThis.window = Object.assign(new EventTarget(), { localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  } });
  globalThis.document = new EventTarget();
  session = await server.ssrLoadModule('/src/lib/session.ts');
  ({ queryClient } = await server.ssrLoadModule('/src/lib/queryClient.ts'));
  ({ api } = await server.ssrLoadModule('/src/lib/api.ts'));
  visitas = await server.ssrLoadModule('/src/lib/visitas.ts');
  ({ default: AppLayout } = await server.ssrLoadModule('/src/components/AppLayout.tsx'));
  ({ default: UsuariosPage } = await server.ssrLoadModule('/src/pages/AdminUsuariosPage.tsx'));
  ({ default: FiscalizadoresPage } = await server.ssrLoadModule('/src/pages/GestorFiscalizadoresPage.tsx'));
  defaults = queryClient.getDefaultOptions();
  disposeSession = session.initializeSession();
});

beforeEach(() => {
  session.startSession(jwt());
  queryClient.setDefaultOptions({ ...defaults, queries: { ...defaults.queries, staleTime: Infinity, retryOnMount: false } });
  api.defaults.adapter = async () => { throw new Error('Requisição não prevista pelo teste'); };
});

afterEach(() => {
  session.endSession();
  queryClient.clear();
  queryClient.setDefaultOptions(defaults);
});

after(async () => {
  disposeSession?.();
  await server?.close();
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
  if (originalDocument === undefined) delete globalThis.document;
  else globalThis.document = originalDocument;
});

function render(element, entrada = '/') {
  const originalHook = React.useSyncExternalStore;
  React.useSyncExternalStore = (subscribe, snapshot) => originalHook(subscribe, snapshot, snapshot);
  try {
    return renderToStaticMarkup(h(QueryClientProvider, { client: queryClient },
      h(MemoryRouter, { initialEntries: [entrada] }, element)));
  } finally {
    React.useSyncExternalStore = originalHook;
  }
}

test('o login guarda nome e e-mail do dono do token e a barra lateral mostra os dois', () => {
  session.startSession(jwt('gestor', 7), { id: 7, nome: 'Renata Alves', email: 'renata@procon.br', role: 'gestor' });

  assert.deepEqual(session.useSession.getState().usuario, { id: 7, nome: 'Renata Alves', email: 'renata@procon.br', role: 'gestor' });
  const html = render(h(AppLayout));
  assert.ok(html.includes('Renata Alves'));
  assert.ok(html.includes('renata@procon.br'));
  assert.ok(html.includes('href="/gestor/fiscalizadores"'));
  assert.ok(html.includes('href="/gestor/visitas/nova"'));
});

test('usuário de outra conta não é aceito e o logout apaga os dados guardados', () => {
  session.startSession(jwt('admin', 1), { id: 99, nome: 'Outra pessoa' });
  assert.equal(session.useSession.getState().usuario, null);

  session.startSession(jwt('admin', 1), { id: 1, nome: 'Helena Matos' });
  assert.ok(storage.get('usuario').includes('Helena Matos'));
  session.endSession();
  assert.equal(storage.has('usuario'), false);
  assert.equal(storage.has('token'), false);
});

test('sair chama POST /auth/logout com o token e encerra a sessão local', async () => {
  const token = jwt('gestor', 7);
  session.startSession(token);
  const chamadas = [];
  api.defaults.adapter = async (config) => {
    chamadas.push({ method: config.method, url: config.url, auth: config.headers.Authorization });
    return response(config, '', 204);
  };
  const { sair } = await server.ssrLoadModule('/src/lib/api.ts');

  await sair();

  assert.deepEqual(chamadas, [{ method: 'post', url: '/auth/logout', auth: `Bearer ${token}` }]);
  assert.equal(session.useSession.getState().token, null);
});

test('sair encerra a sessão local mesmo quando o back responde 401 ou está fora do ar', async () => {
  const { sair } = await server.ssrLoadModule('/src/lib/api.ts');
  for (const falha of [
    (config) => Promise.reject(new axios.AxiosError('401', 'ERR_BAD_REQUEST', config, null, response(config, {}, 401))),
    () => Promise.reject(new axios.AxiosError('Network Error', 'ERR_NETWORK')),
  ]) {
    session.startSession(jwt('gestor', 7));
    api.defaults.adapter = falha;
    await sair();
    assert.equal(session.useSession.getState().token, null);
  }
});

test('carga de cada fiscal conta abertas, para hoje, atrasadas e concluídas no mês', () => {
  const cargas = visitas.calcularCargas(listaVisitas, agora);

  assert.deepEqual(cargas.get(11), { abertas: 3, vencemHoje: 1, atrasadas: 1, noMes: 0 });
  assert.deepEqual(cargas.get(12), { abertas: 0, vencemHoje: 0, atrasadas: 0, noMes: 1 });
  assert.equal(visitas.estaAtrasada(listaVisitas[4], agora), false);
  assert.equal(visitas.iniciais('ana paula ferreira'), 'AF');
  assert.equal(visitas.iniciais(''), '?');
});

test('lista de usuários mostra matrícula, visitas abertas e as ações de aprovação', () => {
  queryClient.setQueryData(['usuarios'], [
    { id: 1, nome: 'Helena Admin', email: 'helena@procon.br', role: 'admin', aprovado: true },
    { id: 11, nome: 'Ana Paula Ferreira', email: 'ana@procon.br', role: 'fiscalizador', matricula: '104512', aprovado: true },
    { id: 13, nome: 'Carlos Novo', email: 'carlos@procon.br', role: 'fiscalizador', aprovado: false },
    { id: 20, nome: 'Renata Gestora', email: 'renata@procon.br', role: 'gestor', aprovado: true },
  ]);
  queryClient.setQueryData(['visitas'], listaVisitas);

  const html = render(h(UsuariosPage), '/admin/usuarios');

  assert.ok(!html.includes('Helena Admin'));
  assert.ok(html.includes('104512'));
  assert.ok(html.includes('1 cadastro aguardando'));
  assert.ok(html.includes('Aguardando aprovação'));
  assert.equal((html.match(/>Aprovar</g) ?? []).length, 1);
  assert.equal((html.match(/>Bloquear</g) ?? []).length, 1);
  assert.ok(html.includes('Todos · 3'));
  assert.ok(html.includes('Fiscalizadores · 2'));
  assert.ok(html.includes('href="/admin/usuarios/11/editar"'));
  assert.match(html, /104512<\/td><td[^>]*><span[^>]*>Fiscalizador<\/span><\/td><td[^>]*>3<\/td>/);
});

test('cartões da equipe usam as visitas reais e o atalho já escolhe o fiscal', () => {
  session.startSession(jwt('gestor', 20));
  queryClient.setQueryData(['usuarios'], [
    { id: 11, nome: 'Ana Paula Ferreira', email: 'ana@procon.br', role: 'fiscalizador', matricula: '104512' },
    { id: 12, nome: 'Bruno Lima', email: 'bruno@procon.br', role: 'fiscalizador' },
    { id: 20, nome: 'Renata Gestora', email: 'renata@procon.br', role: 'gestor' },
  ]);
  queryClient.setQueryData(['visitas'], listaVisitas);

  const html = render(h(FiscalizadoresPage), '/gestor/fiscalizadores');

  assert.ok(html.includes('2 fiscalizadores'));
  assert.ok(html.includes('Mat. 104512'));
  assert.ok(html.includes('Sem matrícula'));
  assert.ok(!html.includes('Renata Gestora'));
  assert.ok(html.includes('href="/gestor/visitas/nova?fiscal=11"'));
  assert.ok(html.includes('Atribuir a Ana'));
  assert.ok(html.includes('Atribuir a Bruno'));
});
