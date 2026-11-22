# React + Vite

## Configuração da API do CONSTATA

Execute os comandos desta aplicação dentro de `web/`.

Para configurar a API, copie `.env.example` para `.env` e ajuste:

```dotenv
VITE_API_URL=http://localhost:3000
```

Em desenvolvimento (`npm run dev`), a ausência da variável, uma string vazia ou
somente espaços usa `http://localhost:3000`. Uma URL configurada tem prioridade.
Reinicie o Vite depois de alterar as variáveis.

Em produção, configure `VITE_API_URL` com a URL do backend no ambiente de build,
antes de executar `npm run build`. O valor é incorporado ao bundle; alterar a
variável depois exige novo build. Sem um valor, a aplicação interrompe a
inicialização para evitar requisições à origem errada. Variáveis `VITE_` são
públicas: não inclua tokens ou senhas. O `.env` local não deve ser versionado.

O gestor pode abrir **Visitas** pelo menu para acessar a listagem provisória em
`/gestor/visitas`, pesquisar por estabelecimento, filtrar por status e abrir os
detalhes. A listagem usa `GET /visitas`, sem filtro por gestor. Pesquisa e status
são aplicados localmente ao array autorizado retornado pela API, sem paginação.
**Nova Visita** abre o cadastro existente. Ao concluir o cadastro, o ID retornado
pela API direciona para `/gestor/visitas/:id`.

Validação: `npm run lint`, `npm test` e `npm run build`.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
