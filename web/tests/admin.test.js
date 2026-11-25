import assert from 'node:assert/strict';
import { after, afterEach, before, beforeEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
// Como no pr-review.test.js: o axios é carregado antes do window falso existir.
import 'axios';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const originalWindow = globalThis.window;
const originalDocument = globalThis.document;
const storage = new Map();
const h = React.createElement;
let server, api, session, queryClient, defaults, disposeSession;
let AppLayout, Dashboard, buscarDadosGerais, VisitasPage, buscarVisitas, exportarVisitas;

function jwt(role = 'admin') {
  const encode = (value) => btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${encode({ alg: 'HS256' })}.${encode({ id: 1, role, exp: Date.now() / 1000 + 3600 })}.assinatura`;
}

const response = (config, data, status = 200, headers = {}) => ({ config, data, status, statusText: String(status), headers });

const dadosGerais = {
  visitas: { total: 10, por_status: { agendada: 4, em_andamento: 3, concluida: 2, cancelada: 1 } },
  usuarios: { total: 7, por_role: { admin: 1, gestor: 2, fiscalizador: 4 } },
  documentos: { total: 2 },
  assinaturas: { total: 5 },
};

const ana = { id: 11, nome: 'Ana Fiscal' };
const bruno = { id: 12, nome: 'Bruno Fiscal' };
const visitasListagem = [
  { id: 71, denunciado: 'Mercado São José', status: 'agendada', data_agendada: '2026-11-09T12:00:00Z', gestor: { id: 3, nome: 'Gestor A' }, fiscalizadores: [ana] },
  { id: 72, denunciado: 'Padaria Central', status: 'em_andamento', data_agendada: '2026-11-10T12:00:00Z', gestor: { id: 4, nome: 'Gestor B' }, fiscalizadores: [ana, bruno] },
  { id: 73, denunciado: 'Farmácia Boa Saúde', status: 'concluida', data_agendada: '2026-11-11T12:00:00Z', gestor: null, fiscalizadores: [] },
];

before(async () => {
  server = await createServer({
    root, envDir: false, logLevel: 'silent',
    define: { 'import.meta.env.VITE_API_URL': 'undefined', 'import.meta.env.DEV': 'true' },
    server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom',
    plugins: [{
      name: 'admin-test-probe', enforce: 'pre',
      transform(source, id) {
        const path = id.replaceAll('\\', '/');
        if (path.endsWith('/src/pages/AdminDashboardPage.jsx')) {
          return source + '\nexport { buscarDadosGerais };';
        }
        if (path.endsWith('/src/pages/AdminVisitasPage.jsx')) {
          // Os filtros vêm do teste, na ordem: pesquisa, status, gestor, fiscalizador.
          return source.replace(
            "import { useState } from 'react';",
            "import { useState as useRealState } from 'react'; const useState = (initial) => useRealState(globalThis.__adminTest.filtros?.shift() ?? initial);",
          ) + '\nexport { buscarVisitas, exportarVisitas };';
        }
      },
    }],
  });
  globalThis.window = Object.assign(new EventTarget(), { localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  } });
  globalThis.document = new EventTarget();
  session = await server.ssrLoadModule('/src/lib/session.js');
  ({ queryClient } = await server.ssrLoadModule('/src/lib/queryClient.js'));
  ({ api } = await server.ssrLoadModule('/src/lib/api.js'));
  ({ default: AppLayout } = await server.ssrLoadModule('/src/components/AppLayout.jsx'));
  ({ default: Dashboard, buscarDadosGerais } = await server.ssrLoadModule('/src/pages/AdminDashboardPage.jsx'));
  ({ default: VisitasPage, buscarVisitas, exportarVisitas } = await server.ssrLoadModule('/src/pages/AdminVisitasPage.jsx'));
  defaults = queryClient.getDefaultOptions();
  disposeSession = session.initializeSession();
});

beforeEach(() => {
  session.startSession(jwt());
  queryClient.setDefaultOptions({ ...defaults, queries: { ...defaults.queries, staleTime: Infinity, retryOnMount: false } });
  globalThis.__adminTest = {};
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
  delete globalThis.__adminTest;
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
  if (originalDocument === undefined) delete globalThis.document;
  else globalThis.document = originalDocument;
});

function render(element) {
  const originalHook = React.useSyncExternalStore;
  React.useSyncExternalStore = (subscribe, snapshot) => originalHook(subscribe, snapshot, snapshot);
  try {
    return renderToStaticMarkup(h(QueryClientProvider, { client: queryClient },
      h(MemoryRouter, { initialEntries: ['/admin'] }, element)));
  } finally {
    React.useSyncExternalStore = originalHook;
  }
}

async function cacheComErro(queryKey, status) {
  await queryClient.fetchQuery({
    queryKey, staleTime: 0, retry: false,
    queryFn: () => { throw { response: { status } }; },
  }).catch(() => {});
}

function renderVisitas(pesquisa = '', status = '', gestor = '', fiscalizador = '') {
  globalThis.__adminTest.filtros = [pesquisa, status, gestor, fiscalizador];
  return render(h(VisitasPage));
}

test('menu do admin leva ao painel, aos usuários e às visitas', () => {
  const html = render(h(AppLayout));
  for (const href of ['/admin', '/admin/usuarios', '/admin/visitas']) {
    assert.ok(html.includes(`href="${href}"`), href);
  }
  assert.ok(!html.includes('href="/gestor/visitas/nova"'));
});

test('painel usa GET /admin/dados-gerais e rejeita resposta fora do formato', async () => {
  const controller = new AbortController();
  api.defaults.adapter = async (config) => {
    assert.equal(config.method, 'get');
    assert.equal(config.url, '/admin/dados-gerais');
    assert.ok(config.signal);
    return response(config, dadosGerais);
  };
  assert.deepEqual(await buscarDadosGerais(controller.signal), dadosGerais);

  for (const invalido of [{}, { ...dadosGerais, visitas: { total: 10, por_status: { agendada: 4 } } }, { ...dadosGerais, documentos: { total: -1 } }]) {
    api.defaults.adapter = async (config) => response(config, invalido);
    await assert.rejects(buscarDadosGerais(controller.signal), /interpretar os dados gerais/);
  }
});

test('painel mostra indicadores e barras com os dados reais', () => {
  queryClient.setQueryData(['admin', 'dados-gerais'], dadosGerais);
  const html = render(h(Dashboard));
  for (const texto of ['Visitas cadastradas', '4 agendadas', 'Em andamento', '20% do total de visitas', '5 assinaturas coletadas',
    'Visitas por status', 'Cancelada', 'Usuários por perfil', 'Fiscalizadores', '7 usuários cadastrados']) {
    assert.ok(html.includes(texto), texto);
  }
  // a barra do maior valor ocupa 100% e as outras são proporcionais
  assert.ok(html.includes('width:100%'));
  assert.ok(html.includes('width:25%'));
  assert.ok(html.includes('href="/admin/visitas"'));
});

test('painel com tudo zerado não divide por zero', () => {
  const zerado = {
    visitas: { total: 0, por_status: { agendada: 0, em_andamento: 0, concluida: 0, cancelada: 0 } },
    usuarios: { total: 0, por_role: { admin: 0, gestor: 0, fiscalizador: 0 } },
    documentos: { total: 0 }, assinaturas: { total: 0 },
  };
  queryClient.setQueryData(['admin', 'dados-gerais'], zerado);
  const html = render(h(Dashboard));
  assert.ok(html.includes('0% do total de visitas'));
  assert.ok(!html.includes('NaN'));
  assert.ok(html.includes('width:0%'));
});

test('painel distingue carregamento e acesso negado', async () => {
  assert.ok(render(h(Dashboard)).includes('Carregando painel'));
  await cacheComErro(['admin', 'dados-gerais'], 403);
  const html = render(h(Dashboard));
  assert.ok(html.includes('não tem permissão para consultar os dados gerais'));
  assert.match(html, /Tentar novamente|Tentando novamente/);
});

test('listagem do admin usa GET /visitas e exige um array direto', async () => {
  const controller = new AbortController();
  api.defaults.adapter = async (config) => {
    assert.equal(config.url, '/visitas');
    assert.equal(config.params, undefined);
    assert.ok(config.signal);
    return response(config, visitasListagem);
  };
  assert.deepEqual(await buscarVisitas(controller.signal), visitasListagem);
  api.defaults.adapter = async (config) => response(config, { visitas: visitasListagem });
  await assert.rejects(buscarVisitas(controller.signal), /interpretar a lista/);
});

test('listagem mostra gestor, fiscalizadores e links de detalhes de todas as equipes', () => {
  queryClient.setQueryData(['visitas'], visitasListagem);
  const html = renderVisitas();
  for (const texto of ['Mercado São José', 'Gestor B', 'Ana Fiscal, Bruno Fiscal', 'Nenhum atribuído', 'Não informado', 'Exibindo 3 de 3 visitas']) {
    assert.ok(html.includes(texto), texto);
  }
  for (const idVisita of [71, 72, 73]) assert.ok(html.includes(`href="/gestor/visitas/${idVisita}"`));
  // opções dos filtros saem das próprias visitas, sem repetir
  assert.equal(html.match(/<option value="11">Ana Fiscal<\/option>/g)?.length, 1);
  assert.ok(html.includes('<option value="4">Gestor B</option>'));
});

test('filtros combinam pesquisa sem acento, status, gestor e fiscalizador', () => {
  queryClient.setQueryData(['visitas'], visitasListagem);
  const pesquisa = renderVisitas('SAO JOSE');
  assert.ok(pesquisa.includes('href="/gestor/visitas/71"'));
  assert.ok(!pesquisa.includes('href="/gestor/visitas/72"'));

  const porGestor = renderVisitas('', '', '4');
  assert.ok(porGestor.includes('href="/gestor/visitas/72"'));
  assert.ok(!porGestor.includes('href="/gestor/visitas/71"'));

  const porFiscal = renderVisitas('', '', '', '12');
  assert.ok(porFiscal.includes('href="/gestor/visitas/72"'));
  assert.ok(!porFiscal.includes('href="/gestor/visitas/71"'));

  assert.ok(renderVisitas('', 'concluida', '', '11').includes('Nenhuma visita corresponde aos filtros'));
});

test('listagem distingue carregamento, lista vazia e acesso negado', async () => {
  assert.ok(renderVisitas().includes('Carregando visitas'));
  queryClient.setQueryData(['visitas'], []);
  assert.ok(renderVisitas().includes('Nenhuma visita cadastrada'));
  queryClient.setQueryData(['visitas'], visitasListagem);
  await cacheComErro(['visitas'], 403);
  const html = renderVisitas();
  assert.ok(html.includes('não tem permissão para consultar as visitas'));
  assert.ok(!html.includes('Mercado São José'));
});

test('exportação chama GET /admin/exportar só com os filtros preenchidos e lê os cabeçalhos', async () => {
  api.defaults.adapter = async (config) => {
    assert.equal(config.url, '/admin/exportar');
    assert.equal(config.responseType, 'blob');
    assert.deepEqual(config.params, { status: 'agendada', fiscalizador_id: '11' });
    return response(config, 'csv', 200, { 'x-total-count': '6000', 'x-truncated': 'true' });
  };
  assert.deepEqual(
    await exportarVisitas({ status: 'agendada', gestor_id: '', fiscalizador_id: '11' }),
    { arquivo: 'csv', total: 6000, truncado: true },
  );

  api.defaults.adapter = async (config) => {
    assert.deepEqual(config.params, {});
    return response(config, 'csv');
  };
  assert.deepEqual(await exportarVisitas({ status: '', gestor_id: '', fiscalizador_id: '' }), { arquivo: 'csv', total: 0, truncado: false });
});
