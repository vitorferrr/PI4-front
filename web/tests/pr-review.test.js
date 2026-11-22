import assert from 'node:assert/strict';
import { after, afterEach, before, beforeEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CancelledError, QueryClientProvider, QueryObserver } from '@tanstack/react-query';
import axios from 'axios';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const originalWindow = globalThis.window;
const originalDocument = globalThis.document;
const originalNow = Date.now;
const storage = new Map();
const h = React.createElement;
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
let server, api, session, queryClient, selectionStore, Page, Conclusion, NovaVisita, AppLayout, VisitasPage, buscarVisitas;
let disposeSession, unsubscribeSession, defaults;

function jwt(account = 'a', expires = Date.now() / 1000 + 3600) {
  const encode = (value) => btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${encode({ alg: 'HS256' })}.${encode({ sub: account, role: 'gestor', exp: expires })}.assinatura`;
}

const visita = {
  id: 41, denunciado: 'Visita de teste', gestor_id: 3, status: 'em_andamento',
  data_agendada: '2026-11-09T12:00:00Z', data_realizacao: null,
  gestor: null, fiscalizadores: [], documentos: [], respostas: [],
};
const response = (config, data, status = 200) => ({ config, data, status, statusText: String(status), headers: {} });
const httpError = (config, status, data = {}) => new axios.AxiosError(
  'Falha controlada', 'ERR_BAD_RESPONSE', config, null, response(config, data, status),
);

// O SSR não possui eventos DOM. O probe preserva os MutationObservers reais entre
// renders e expõe o componente local apenas no grafo de módulos deste teste.
const mutationImport = "import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';";
const mutationProbe = `import { useQuery, useQueryClient, MutationObserver } from '@tanstack/react-query';
function useMutation(options) {
  const probe = globalThis.__reviewTest;
  const key = options.mutationKey?.join(':') ?? 'criarVisita';
  let observer = probe.observers.get(key);
  if (!observer) { observer = new MutationObserver(probe.client, options); probe.observers.set(key, observer); }
  observer.setOptions(options);
  return { ...observer.getCurrentResult(), mutate: (variables) => {
    probe.pending = observer.mutate(variables).catch(() => {});
  } };
}`;

async function makeServer(value = 'undefined', dev = true, instrument = false) {
  return createServer({
    root, envDir: false, logLevel: 'silent',
    define: { 'import.meta.env.VITE_API_URL': value, 'import.meta.env.DEV': String(dev) },
    server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom',
    plugins: instrument ? [{
      name: 'review-regression-probe', enforce: 'pre',
      transform(source, id) {
        const path = id.replaceAll('\\', '/');
        if (path.endsWith('/src/pages/GestorVisitaDetalhePage.jsx')) {
          return source.replace(mutationImport, mutationProbe) + '\nexport { ConclusaoVisita };';
        }
        if (path.endsWith('/src/pages/GestorNovaVisitaPage.jsx')) {
          return source.replace(mutationImport, mutationProbe).replace(
            "import { useNavigate } from 'react-router-dom';",
            'const useNavigate = () => (to) => { globalThis.__reviewTest.navigation = to; };',
          );
        }
        if (path.endsWith('/src/pages/GestorVisitasPage.jsx')) {
          return source.replace(
            "import { useState } from 'react';",
            "import { useState as useRealState } from 'react'; const useState = (initial) => useRealState(globalThis.__reviewTest.listFilters?.shift() ?? initial);",
          ) + '\nexport { buscarVisitas };';
        }
      },
    }] : [],
  });
}

before(async () => {
  server = await makeServer('undefined', true, true);
  globalThis.window = Object.assign(new EventTarget(), { localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  } });
  globalThis.document = new EventTarget();
  session = await server.ssrLoadModule('/src/lib/session.js');
  ({ queryClient } = await server.ssrLoadModule('/src/lib/queryClient.js'));
  ({ api } = await server.ssrLoadModule('/src/lib/api.js'));
  ({ useNovaVisitaStore: selectionStore } = await server.ssrLoadModule('/src/store/novaVisitaStore.js'));
  ({ default: Page, ConclusaoVisita: Conclusion } = await server.ssrLoadModule('/src/pages/GestorVisitaDetalhePage.jsx'));
  ({ default: NovaVisita } = await server.ssrLoadModule('/src/pages/GestorNovaVisitaPage.jsx'));
  ({ default: AppLayout } = await server.ssrLoadModule('/src/components/AppLayout.jsx'));
  ({ default: VisitasPage, buscarVisitas } = await server.ssrLoadModule('/src/pages/GestorVisitasPage.jsx'));
  defaults = queryClient.getDefaultOptions();
  // Mesma composição usada no bootstrap: sessão notifica; consumidores limpam dados.
  unsubscribeSession = session.onSessionChange(() => {
    void queryClient.cancelQueries();
    queryClient.clear();
    selectionStore.getState().limparSelecao();
  });
  disposeSession = session.initializeSession();
});

beforeEach(() => {
  session.startSession(jwt());
  queryClient.setDefaultOptions({ ...defaults, queries: { ...defaults.queries, staleTime: Infinity, retryOnMount: false } });
  globalThis.__reviewTest = { client: queryClient, observers: new Map(), pending: null };
  window.confirm = () => true;
  api.defaults.adapter = async () => { throw new Error('Requisição não prevista pelo teste'); };
});

afterEach(() => {
  Date.now = originalNow;
  session.endSession();
  queryClient.setDefaultOptions(defaults);
});

after(async () => {
  disposeSession?.();
  unsubscribeSession?.();
  await server?.close();
  delete globalThis.__reviewTest;
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
  if (originalDocument === undefined) delete globalThis.document;
  else globalThis.document = originalDocument;
});

function render(element) {
  const originalHook = React.useSyncExternalStore;
  // O probe SSR observa o snapshot corrente, sem modificar os hooks da aplicação.
  React.useSyncExternalStore = (subscribe, snapshot) => originalHook(subscribe, snapshot, snapshot);
  try {
    return renderToStaticMarkup(h(QueryClientProvider, { client: queryClient },
      h(MemoryRouter, { initialEntries: ['/gestor/visitas/41'] }, element)));
  } finally {
    React.useSyncExternalStore = originalHook;
  }
}

function findButton(tree) {
  if (!React.isValidElement(tree)) return null;
  if (tree.type === 'button') return tree;
  return React.Children.toArray(tree.props.children).map(findButton).find(Boolean) ?? null;
}

function conclusion(status = queryClient.getQueryData(['visita', '41'])?.status ?? 'em_andamento') {
  let tree;
  function Probe() { tree = Conclusion({ id: '41', status }); return tree; }
  return { html: render(h(Probe)), button: findButton(tree) };
}

function page() {
  return render(h(Routes, null, h(Route, { path: '/gestor/visitas/:id', element: h(Page) })));
}

test('API usa localhost sem .env e não aceita origem implícita em produção', async () => {
  assert.equal(api.defaults.baseURL, 'http://localhost:3000');
  for (const [value, dev, expected] of [
    [JSON.stringify('   '), true, 'http://localhost:3000'],
    [JSON.stringify(''), true, 'http://localhost:3000'],
    [JSON.stringify(' https://api.example.test '), false, 'https://api.example.test'],
    ['undefined', false, null],
  ]) {
    const instance = await makeServer(value, dev);
    try {
      if (expected) assert.equal((await instance.ssrLoadModule('/src/lib/api.js')).api.defaults.baseURL, expected);
      else await assert.rejects(instance.ssrLoadModule('/src/lib/api.js'), /Configure VITE_API_URL/);
    } finally { await instance.close(); }
  }
});

test('expiração do JWT entre envio e resposta não revalida a sessão no interceptor', async () => {
  const now = Date.now();
  session.startSession(jwt('a', now / 1000 + 60));
  const version = session.getSessionVersion();
  let finish;
  api.defaults.adapter = (config) => new Promise((resolve) => { finish = () => resolve(response(config, visita)); });
  const request = api.get('/visitas/41');
  await tick();
  Date.now = () => now + 120000; // relógio avançado sem executar o timer de logout
  finish();
  assert.equal((await request).data.id, 41);
  assert.equal(session.getSessionVersion(), version);
  assert.equal(session.isTokenValid(session.useSession.getState().token), false);
});

test('resposta HTTP 403 continua sendo 403 quando o JWT expira durante o envio', async () => {
  const now = Date.now();
  session.startSession(jwt('a', now / 1000 + 60));
  const version = session.getSessionVersion();
  let finish;
  api.defaults.adapter = (config) => new Promise((resolve, reject) => { finish = () => reject(httpError(config, 403)); });
  const request = api.get('/visitas/41');
  await tick();
  Date.now = () => now + 120000;
  finish();
  await assert.rejects(request, (error) => error.response?.status === 403 && !axios.isCancel(error));
  assert.equal(session.getSessionVersion(), version);
});

test('uma nova requisição não envia um JWT que já está expirado', async () => {
  const now = Date.now();
  session.startSession(jwt('a', now / 1000 + 60));
  let attempts = 0;
  api.defaults.adapter = async (config) => { attempts++; return response(config, visita); };
  Date.now = () => now + 120000;
  await assert.rejects(api.get('/visitas/41'), axios.isCancel);
  assert.equal(attempts, 0);
  assert.equal(session.useSession.getState().token, null);
});

test('401 preserva o tratamento global e encerra a sessão uma única vez', async () => {
  const version = session.getSessionVersion();
  const pending = [];
  api.defaults.adapter = (config) => new Promise((resolve, reject) => pending.push(() => reject(httpError(config, 401))));
  const first = api.get('/visitas/41').catch((error) => error);
  const second = api.get('/usuarios').catch((error) => error);
  await tick();
  pending.forEach((finish) => finish());
  await Promise.all([first, second]);
  assert.equal(session.useSession.getState().token, null);
  assert.equal(session.getSessionVersion(), version + 1);
});

test('401 do login continua disponível para a mensagem de credenciais incorretas', async () => {
  session.endSession();
  const version = session.getSessionVersion();
  api.defaults.adapter = async (config) => { throw httpError(config, 401); };
  await assert.rejects(api.post('/auth/login', {}, { skipAuth: true }), (error) => error.response?.status === 401);
  assert.equal(session.getSessionVersion(), version);
});

test('respostas de conta anterior são descartadas sem derrubar a conta atual', async () => {
  let finish;
  api.defaults.adapter = (config) => new Promise((resolve, reject) => { finish = () => reject(httpError(config, 401)); });
  const request = api.get('/visitas/41').catch((error) => error);
  await tick();
  const tokenB = jwt('b');
  session.startSession(tokenB);
  queryClient.setQueryData(['conta-b'], 'dados atuais');
  finish();
  assert.ok(axios.isCancel(await request));
  assert.equal(session.useSession.getState().token, tokenB);
  assert.equal(queryClient.getQueryData(['conta-b']), 'dados atuais');
});

test('logout automático continua ativo e invalida requisições da sessão encerrada', async () => {
  session.startSession(jwt('a', Date.now() / 1000 + 0.05));
  let finish;
  api.defaults.adapter = (config) => new Promise((resolve) => { finish = () => resolve(response(config, visita)); });
  const request = api.get('/visitas/41').catch((error) => error);
  await tick();
  await new Promise((resolve) => setTimeout(resolve, 100));
  finish();
  assert.ok(axios.isCancel(await request));
  assert.equal(session.useSession.getState().token, null);
});

test('assinantes limpam cache, mutações e seleção no logout e na troca entre abas', () => {
  queryClient.setQueryData(['privado'], 'dados antigos');
  queryClient.getMutationCache().build(queryClient, { mutationKey: ['privada'] });
  selectionStore.getState().toggleFiscalizador(3);
  const event = new Event('storage');
  Object.defineProperties(event, { key: { value: 'token' }, storageArea: { value: window.localStorage } });
  const tokenB = jwt('b');
  window.localStorage.setItem('token', tokenB);
  window.dispatchEvent(event);
  assert.equal(session.useSession.getState().token, tokenB);
  assert.equal(queryClient.getQueryCache().getAll().length, 0);
  assert.equal(queryClient.getMutationCache().getAll().length, 0);
  assert.deepEqual(selectionStore.getState().fiscalizadoresSelecionados, []);
  const version = session.getSessionVersion();
  window.dispatchEvent(event);
  assert.equal(session.getSessionVersion(), version);
  queryClient.setQueryData(['privado'], 'dados');
  session.endSession();
  assert.equal(queryClient.getQueryData(['privado']), undefined);
});

test('política global não repete cancelamentos nem erros 401/403', async () => {
  for (const error of [new axios.CanceledError(), new CancelledError(), { code: 'ERR_CANCELED' },
    { response: { status: 401 } }, { response: { status: 403 } }]) {
    assert.equal(defaults.queries.retry(0, error), false);
    let attempts = 0;
    await assert.rejects(queryClient.fetchQuery({ queryKey: ['retry'], queryFn: () => { attempts++; throw error; } }));
    assert.equal(attempts, 1);
    queryClient.removeQueries({ queryKey: ['retry'] });
  }
  assert.equal(defaults.queries.retry(0, new Error('rede')), true);
  assert.equal(defaults.queries.retry(1, new Error('rede')), false);
});

test('menu abre o cadastro e o ID retornado conduz aos detalhes, com fallback preservado', () => {
  assert.ok(render(h(AppLayout)).includes('href="/gestor/visitas/nova"'));
  render(h(NovaVisita));
  const options = globalThis.__reviewTest.observers.get('criarVisita').options;
  options.onSuccess({ id: 41 });
  assert.equal(globalThis.__reviewTest.navigation, '/gestor/visitas/41');
  options.onSuccess(undefined);
  assert.equal(globalThis.__reviewTest.navigation, '/');
});

test('confirmação e trava síncrona impedem envios duplicados; PATCH continua sem body', async () => {
  queryClient.setQueryData(['visita', '41'], visita);
  let attempts = 0, finish;
  api.defaults.adapter = (config) => {
    attempts++;
    assert.equal(config.method, 'patch');
    assert.equal(config.url, '/visitas/41/concluir');
    assert.equal(config.data, undefined);
    return new Promise((resolve) => { finish = () => resolve(response(config, { ...visita, status: 'concluida' })); });
  };
  window.confirm = () => false;
  conclusion().button.props.onClick();
  assert.equal(attempts, 0);
  window.confirm = () => true;
  const button = conclusion().button;
  button.props.onClick();
  button.props.onClick();
  await tick();
  assert.equal(attempts, 1);
  assert.equal(conclusion().button.props.disabled, true);
  finish();
  await globalThis.__reviewTest.pending;
  assert.equal(queryClient.getQueryData(['visita', '41']).status, 'concluida');
  assert.equal(conclusion().button, null);
  assert.ok(conclusion().html.includes('Visita concluída com sucesso'));
});

async function failConclusion(refetchFails) {
  queryClient.setQueryData(['visita', '41'], visita);
  queryClient.setQueryData(['visita', '41', 'extra'], 'não invalidar');
  let refetches = 0;
  api.defaults.adapter = async (config) => {
    if (config.method === 'patch') throw httpError(config, 400, { erros: ['Visita já concluída por outra pessoa'] });
    refetches++;
    if (refetchFails) throw new axios.AxiosError('Sem conexão', 'ERR_NETWORK', config);
    return response(config, { ...visita, status: 'concluida' });
  };
  const observer = new QueryObserver(queryClient, {
    queryKey: ['visita', '41'], queryFn: async () => (await api.get('/visitas/41')).data,
    staleTime: Infinity, retry: false,
  });
  const unsubscribe = observer.subscribe(() => {});
  try {
    conclusion().button.props.onClick();
    await globalThis.__reviewTest.pending;
    await tick();
    assert.equal(refetches, 1);
    assert.equal(queryClient.getQueryState(['visita', '41', 'extra']).isInvalidated, false);
  } finally { unsubscribe(); }
}

test('erro 400 reconsulta exatamente a visita, atualiza o status e preserva a mensagem', async () => {
  await failConclusion(false);
  assert.equal(queryClient.getQueryData(['visita', '41']).status, 'concluida');
  assert.equal(conclusion().button, null);
  assert.ok(page().includes('Visita já concluída por outra pessoa'));
  assert.ok(!page().includes('Visita concluída com sucesso'));
});

test('falha de conexão na reconsulta preserva os dados e a mensagem original da conclusão', async () => {
  await failConclusion(true);
  const html = page();
  assert.ok(html.includes('Visita de teste'));
  assert.ok(html.includes('última consulta disponível'));
  assert.ok(html.includes('Visita já concluída por outra pessoa'));
  assert.ok(html.includes('Concluir visita'));
  assert.equal(queryClient.getQueryData(['visita', '41']).status, 'em_andamento');
});

test('403 e 404 na reconsulta ocultam os dados privados que estavam em cache', async () => {
  for (const status of [403, 404]) {
    queryClient.setQueryData(['visita', '41'], visita);
    await queryClient.fetchQuery({
      queryKey: ['visita', '41'], staleTime: 0, retry: false,
      queryFn: () => { throw { response: { status } }; },
    }).catch(() => {});
    const html = page();
    assert.ok(!html.includes('Visita de teste'));
    assert.ok(!html.includes('Concluir visita'));
    assert.ok(html.includes(status === 403 ? 'Acesso não permitido' : 'Visita não encontrada'));
  }
});

const visitasListagem = [
  { ...visita, id: 71, denunciado: 'Mercado São José', status: 'agendada', gestor_id: 901, gestor: { nome: 'Gestor A' } },
  { ...visita, id: 72, denunciado: 'Padaria Central', status: 'em_andamento', gestor_id: 902, gestor: null },
  { ...visita, id: 73, denunciado: 'Loja Centro', status: 'concluida', data_agendada: 'inválida' },
];

function renderList(pesquisa = '', status = '') {
  globalThis.__reviewTest.listFilters = [pesquisa, status];
  return render(h(VisitasPage));
}

test('listagem usa GET /visitas sem filtros de usuário e exige um array direto', async () => {
  const controller = new AbortController();
  api.defaults.adapter = async (config) => {
    assert.equal(config.method, 'get');
    assert.equal(config.url, '/visitas');
    assert.equal(config.params, undefined);
    assert.ok(config.signal);
    return response(config, visitasListagem);
  };
  assert.deepEqual(await buscarVisitas(controller.signal), visitasListagem);
  api.defaults.adapter = async (config) => response(config, { visitas: visitasListagem });
  await assert.rejects(buscarVisitas(controller.signal), /interpretar a lista/);
});

test('listagem apresenta visitas de gestores diferentes e links de criação e detalhes', () => {
  queryClient.setQueryData(['visitas'], visitasListagem);
  const html = renderList();
  for (const text of ['Mercado São José', 'Padaria Central', 'Gestor A', 'Não informado', 'Data inválida']) {
    assert.ok(html.includes(text), text);
  }
  for (const id of [71, 72, 73]) assert.ok(html.includes(`href="/gestor/visitas/${id}"`));
  assert.ok(html.includes('href="/gestor/visitas/nova"'));
  assert.ok(render(h(AppLayout)).includes('href="/gestor/visitas"'));
});

test('pesquisa por estabelecimento ignora caixa e acentos e combina com o status', () => {
  queryClient.setQueryData(['visitas'], visitasListagem);
  const pesquisa = renderList('SAO JOSE');
  assert.ok(pesquisa.includes('href="/gestor/visitas/71"'));
  assert.ok(!pesquisa.includes('href="/gestor/visitas/72"'));
  const filtrado = renderList('', 'em_andamento');
  assert.ok(filtrado.includes('href="/gestor/visitas/72"'));
  assert.ok(!filtrado.includes('href="/gestor/visitas/71"'));
  assert.ok(renderList('padaria', 'concluida').includes('Nenhuma visita corresponde aos filtros'));
});

test('listagem distingue carregamento, lista vazia e acesso negado', async () => {
  assert.ok(renderList().includes('Carregando visitas'));
  queryClient.setQueryData(['visitas'], []);
  assert.ok(renderList().includes('Nenhuma visita disponível'));
  queryClient.setQueryData(['visitas'], visitasListagem);
  await queryClient.fetchQuery({
    queryKey: ['visitas'], staleTime: 0, retry: false,
    queryFn: () => { throw { response: { status: 403 } }; },
  }).catch(() => {});
  const html = renderList();
  assert.ok(html.includes('não tem permissão para consultar'));
  assert.match(html, /Tentar novamente|Tentando novamente/);
  assert.ok(!html.includes('Mercado São José'));
});
