import assert from 'node:assert/strict';
import { after, afterEach, before, beforeEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
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
let AppLayout, Dashboard, buscarDadosGerais, VisitasPage, buscarVisitas, exportarVisitas, DetalhePage, PaginaInicial;

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
        if (path.endsWith('/src/pages/AdminDashboardPage.tsx')) {
          return source + '\nexport { buscarDadosGerais };';
        }
        if (path.endsWith('/src/pages/AdminVisitasPage.tsx')) {
          return source + '\nexport { buscarVisitas, exportarVisitas };';
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
  session = await server.ssrLoadModule('/src/lib/session.ts');
  ({ queryClient } = await server.ssrLoadModule('/src/lib/queryClient.ts'));
  ({ api } = await server.ssrLoadModule('/src/lib/api.ts'));
  ({ default: AppLayout } = await server.ssrLoadModule('/src/components/AppLayout.tsx'));
  ({ default: Dashboard, buscarDadosGerais } = await server.ssrLoadModule('/src/pages/AdminDashboardPage.tsx'));
  ({ default: VisitasPage, buscarVisitas, exportarVisitas } = await server.ssrLoadModule('/src/pages/AdminVisitasPage.tsx'));
  ({ default: DetalhePage } = await server.ssrLoadModule('/src/pages/GestorVisitaDetalhePage.tsx'));
  ({ default: PaginaInicial } = await server.ssrLoadModule('/src/components/PaginaInicial.tsx'));
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

function render(element, entrada = '/admin') {
  const originalHook = React.useSyncExternalStore;
  React.useSyncExternalStore = (subscribe, snapshot) => originalHook(subscribe, snapshot, snapshot);
  try {
    return renderToStaticMarkup(h(QueryClientProvider, { client: queryClient },
      h(MemoryRouter, { initialEntries: [entrada] }, element)));
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

// Os filtros ficam na URL; o teste abre a tela já com eles aplicados.
function renderVisitas(pesquisa = '', status = '', gestor = '', fiscalizador = '') {
  const filtros = new URLSearchParams(Object.entries({ pesquisa, status, gestor, fiscalizador }).filter(([, valor]) => valor));
  const busca = filtros.toString();
  return render(h(VisitasPage), `/admin/visitas${busca ? `?${busca}` : ''}`);
}

function renderDetalhe(state) {
  const rota = h(Routes, null, h(Route, { path: '/gestor/visitas/:id', element: h(DetalhePage) }));
  return render(rota, { pathname: '/gestor/visitas/41', state });
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
  for (const texto of ['Visitas cadastradas', '4 agendadas', 'Em andamento', 'Concluídas', '5 assinaturas coletadas',
    'Visitas por status', 'Cancelada', 'Usuários por perfil', 'Fiscalizadores', '7 usuários cadastrados']) {
    assert.ok(html.includes(texto), texto);
  }
  // a barra do maior valor ocupa 100% e as outras são proporcionais
  assert.ok(html.includes('width:100%'));
  assert.ok(html.includes('width:25%'));
  assert.ok(html.includes('href="/admin/visitas"'));
});

test('painel com tudo zerado mostra zeros sem quebrar as barras', () => {
  const zerado = {
    visitas: { total: 0, por_status: { agendada: 0, em_andamento: 0, concluida: 0, cancelada: 0 } },
    usuarios: { total: 0, por_role: { admin: 0, gestor: 0, fiscalizador: 0 } },
    documentos: { total: 0 }, assinaturas: { total: 0 },
  };
  queryClient.setQueryData(['admin', 'dados-gerais'], zerado);
  const html = render(h(Dashboard));
  assert.ok(html.includes('0 agendadas'));
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
  for (const texto of ['Mercado São José', 'Gestor B', 'Ana Fiscal, Bruno Fiscal', 'Nenhum fiscalizador', 'Gestor não informado', 'Exibindo 3 de 3 visitas']) {
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

test('filtros vindos da URL aparecem preenchidos nos campos', () => {
  queryClient.setQueryData(['visitas'], visitasListagem);
  const html = renderVisitas('padaria', 'em_andamento', '4', '12');
  assert.ok(html.includes('value="padaria"'));
  assert.ok(html.includes('<option value="em_andamento" selected="">'));
  assert.ok(html.includes('<option value="4" selected="">'));
  assert.ok(html.includes('<option value="12" selected="">'));
  assert.ok(html.includes('Exibindo 1 de 3 visitas'));
});

test('detalhe volta para a lista do admin com os filtros, ou para o início se não houver origem', () => {
  const doAdmin = renderDetalhe({ voltarPara: '/admin/visitas?status=agendada', rotuloVoltar: 'Voltar para visitas' });
  assert.ok(doAdmin.includes('href="/admin/visitas?status=agendada"'));
  assert.ok(doAdmin.includes('Voltar para visitas'));

  const semOrigem = renderDetalhe(undefined);
  assert.ok(semOrigem.includes('href="/"'));
  assert.ok(semOrigem.includes('Voltar ao início'));

  // só caminhos internos: um endereço externo cai no início
  for (const voltarPara of ['//site-externo.com', 'https://site-externo.com', 42]) {
    const html = renderDetalhe({ voltarPara, rotuloVoltar: 'Voltar' });
    assert.ok(html.includes('Voltar ao início'), String(voltarPara));
    assert.ok(!html.includes('site-externo'));
  }
});

test('página inicial leva cada perfil à sua primeira tela e orienta o fiscalizador a usar o app', () => {
  // No SSR o <Navigate> não chega a renderizar o destino: basta não mostrar o aviso do app.
  const rotas = () => h(Routes, null,
    h(Route, { path: '/', element: h(PaginaInicial) }),
    h(Route, { path: '/admin', element: 'PAINEL-ADMIN' }),
    h(Route, { path: '/gestor/fiscalizadores', element: 'EQUIPE-GESTOR' }));
  assert.ok(!render(rotas(), '/').includes('Use o app'));
  session.startSession(jwt('gestor'));
  assert.ok(!render(rotas(), '/').includes('Use o app'));
  session.startSession(jwt('fiscalizador'));
  assert.ok(render(rotas(), '/').includes('Use o app no celular'));
});
