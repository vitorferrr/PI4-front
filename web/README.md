# Constata · Painel web (Procon Jaboatão)

Painel do **admin** e do **gestor**, feito em **React Native** com **Expo** e
rodando no navegador pelo **react-native-web**. Usa as mesmas bibliotecas do app
mobile: Expo Router (rotas por arquivo), React Native Paper (componentes e
tema), TanStack Query (dados da API), Zustand (estado global) e Axios.

Execute os comandos dentro de `web/`.

## Como rodar

```bash
npm install
cp .env.example .env   # e ajuste a URL da API
npm run dev            # abre o painel no navegador (expo start --web)
```

## Variável de ambiente

```dotenv
EXPO_PUBLIC_API_URL=http://localhost:3000
```

Sem a variável, a API usada é `http://localhost:3000`. Variáveis `EXPO_PUBLIC_`
vão para o código do navegador e são públicas: não coloque tokens nem senhas.
Depois de mudar o `.env`, reinicie o `npm run dev`. O `.env` não é versionado.

## Telas

Sem sessão, qualquer endereço leva ao **login** (`/login`). Depois do login,
cada perfil vai para a sua primeira tela.

**Admin**

- **Painel** (`/admin`): indicadores de `GET /admin/dados-gerais`, gráficos de
  visitas por status, por fiscal e de usuários por perfil, e avisos de visitas
  atrasadas e em andamento.
- **Usuários** (`/admin/usuarios`): lista de gestores e fiscalizadores, com
  busca, filtros, aprovação, bloqueio e exclusão; cadastro em
  `/admin/usuarios/novo` e edição em `/admin/usuarios/:id/editar`.
- **Visitas** (`/admin/visitas`): todas as visitas, com filtros de status,
  gestor, fiscalizador e atrasadas guardados no endereço. **Exportar CSV** usa
  `GET /admin/exportar` com os filtros de status, gestor e fiscalizador.

**Gestor** (o admin também acessa)

- **Fiscalizadores** (`/gestor/fiscalizadores`): a equipe com a carga de visitas
  de cada fiscal.
- **Nova visita** (`/gestor/visitas/nova`): cadastro da visita e escolha do
  fiscal. Ao salvar, abre o detalhe da visita criada.
- **Visitas** (`/gestor/visitas`): lista com pesquisa e filtro de status.
- **Detalhe** (`/gestor/visitas/:id`): andamento, dados do estabelecimento,
  localização, respostas do questionário, documentos e conclusão da visita.

O fiscalizador usa o app mobile; no painel ele vê só um aviso para usar o celular.

## Estrutura

A organização é a mesma do app mobile:

- `src/app/`: as telas. O nome do arquivo é a rota (`login.tsx` → `/login`).
  O `_layout.tsx` usa o `Stack.Protected` para separar o login do painel; o
  grupo `(painel)` tem o menu lateral; `admin/` e `gestor/` conferem o perfil.
- `src/components/`: um componente por arquivo.
- `src/hooks/`: as consultas à API (`useVisitas`, `useUsuarios`...).
- `src/lib/`: Axios, React Query, formatadores, exportação e regras de visitas.
- `src/store/`: a sessão, com Zustand, salva no `localStorage`.
- `src/types/`: os tipos de usuário e de visita.
- `src/theme.ts`: todas as cores e o tema do Paper.

## Validação

```bash
npm run typecheck   # TypeScript
npm run format      # Prettier
npm run build       # gera o site estático em dist/ (expo export --platform web)
```
