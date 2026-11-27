# Constata · Procon Jaboatão (Front-end)

Front-end do **Constata**, sistema que digitaliza as visitas de fiscalização do
Procon de Jaboatão dos Guararapes: da denúncia ao documento assinado, sem papel.

**Disciplina:** Programação para Dispositivos Móveis · 2026.2

## Equipe

| Nome | RA |
| --- | --- |
| Lucas Gabriel Maciel de Barros | 00000858201 |
| Rafael de Assis Dias Nunes | 00000859118 |
| Marconi Taibe de Andrade Filho | 00000858175 |
| Vitor dos Santos Ferreira | 00000859882 |
| Andressa Karine de Lima Amorim Miranda | 00000859891 |
| Beatriz Farias Silva | 00000845759 |

## Sumário

- [Visão geral](#visão-geral)
- [Tecnologias](#tecnologias)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Como rodar](#como-rodar)
- [Painel web](#painel-web)
- [App mobile](#app-mobile)
- [Autenticação e sessão](#autenticação-e-sessão)
- [Integração com o back-end](#integração-com-o-back-end)
- [Publicação](#publicação)
- [Validação do código](#validação-do-código)

## Visão geral

O repositório tem duas aplicações, as duas em **React Native** com **Expo**, que
consomem a mesma API ([PI4-back](https://github.com/vitorferrr/PI4-back)).

| Aplicação | Pasta | Quem usa | Onde roda |
| --- | --- | --- | --- |
| Painel web | `web/` | Administrador e gestor | Navegador (react-native-web) |
| App de campo | `mobile/` | Fiscalizador | Celular (Android e iOS) |

**Painel em produção:** https://pi4-front-web.vercel.app

### Fluxo de uma fiscalização

1. O **admin** cadastra o gestor ou o fiscalizador. A pessoa recebe no e-mail uma
   senha gerada automaticamente.
2. O **gestor** cria a visita, com os dados do estabelecimento, a data e o fiscal.
3. O **fiscalizador** vê a visita no app e a inicia, registrando a localização por GPS.
4. Ele responde o questionário e revisa o documento.
5. O fiscal e o responsável pelo estabelecimento assinam na tela (o responsável
   pode recusar).
6. Com as assinaturas, o back gera o PDF, envia por e-mail e conclui a visita.
7. O **gestor** e o **admin** acompanham no painel e abrem o PDF.

## Tecnologias

| Uso | Biblioteca |
| --- | --- |
| Base | React Native, Expo SDK 58, TypeScript |
| Navegação | Expo Router (rotas por arquivo) |
| Componentes e tema | React Native Paper e `StyleSheet` |
| Dados da API | TanStack Query e Axios |
| Estado global | Zustand |
| Fontes | Barlow Condensed e Inter |
| Web | react-native-web |
| Sessão no celular | expo-secure-store |
| Rascunho da visita | AsyncStorage e expo-file-system |
| Localização | expo-location |
| Assinatura na tela | react-native-signature-canvas |
| Formatação | Prettier |

## Estrutura do repositório

```
.
├── web/                  painel do admin e do gestor
│   ├── src/
│   │   ├── app/          telas (o nome do arquivo é a rota)
│   │   ├── components/   um componente por arquivo
│   │   ├── hooks/        consultas à API
│   │   ├── lib/          Axios, React Query, formatadores e regras
│   │   ├── store/        sessão (Zustand)
│   │   ├── types/        tipos de usuário e visita
│   │   └── theme.ts      cores e tema
│   └── vercel.json       configuração do deploy
└── mobile/               app do fiscalizador
    ├── src/
    │   ├── app/          telas e abas
    │   ├── components/   cartões, assinatura, cabeçalhos
    │   ├── hooks/        consultas à API
    │   ├── lib/          API, localização, arquivos de assinatura
    │   ├── store/        sessão e visita em andamento
    │   ├── types/
    │   └── theme.ts
    └── eas.json          perfis de build
```

## Como rodar

**Pré-requisitos:** Node.js 22 ou superior, npm e, para o app, o **Expo Go**
compatível com o SDK 58 (ou um build instalado).

```bash
git clone https://github.com/vitorferrr/PI4-front.git
cd PI4-front
```

### Painel web

```bash
cd web
npm install
cp .env.example .env
npm run dev
```

### App mobile

```bash
cd mobile
npm install
cp .env.example .env
npx expo start
```

Leia o QR code com o Expo Go (Android) ou com a câmera (iOS). O celular e o
computador precisam estar na mesma rede.

### Variável de ambiente

| Variável | Painel web | App mobile |
| --- | --- | --- |
| `EXPO_PUBLIC_API_URL` | padrão `http://localhost:3000` | padrão `https://pi4-back-one.vercel.app` |

- Informe a URL **com `https://` ou `http://`** e sem barra no final. Sem o
  protocolo, o navegador trata o valor como uma pasta do próprio site.
- A variável entra no código na hora do build. Depois de mudar o `.env`, reinicie
  o Expo.
- Tudo que começa com `EXPO_PUBLIC_` é público: não coloque senhas nem chaves.
- O arquivo `.env` não é versionado.
- No celular físico, `localhost` aponta para o próprio aparelho. Para usar um back
  local, informe o IP do computador na rede.

## Painel web

Sem sessão, qualquer endereço leva ao login. Cada perfil abre a própria tela
inicial e só vê o que pode acessar.

### Administrador

| Tela | Rota | O que faz |
| --- | --- | --- |
| Painel | `/admin` | Indicadores, gráficos por status, por fiscal e por perfil, avisos de visitas atrasadas e em andamento e exportação CSV |
| Usuários | `/admin/usuarios` | Lista de gestores e fiscalizadores com busca e filtros; aprovar, bloquear e excluir |
| Novo usuário | `/admin/usuarios/novo` | Cadastro com perfil, nome, matrícula e e-mail. A senha é gerada pelo back e enviada por e-mail |
| Editar usuário | `/admin/usuarios/:id/editar` | Altera os dados; a senha é opcional |
| Visitas | `/admin/visitas` | Todas as visitas, com filtros guardados no endereço e exportação CSV |

### Gestor

O administrador também acessa estas telas.

| Tela | Rota | O que faz |
| --- | --- | --- |
| Fiscalizadores | `/gestor/fiscalizadores` | Equipe e carga de visitas de cada fiscal |
| Nova visita | `/gestor/visitas/nova` | Dados do estabelecimento, fiscal e data, com máscara |
| Visitas | `/gestor/visitas` | Lista com pesquisa e filtro de status |
| Detalhe | `/gestor/visitas/:id` | Andamento, estabelecimento, localização com link para o mapa, respostas, documentos (abre o PDF por link temporário), equipe e conclusão |

O fiscalizador que entra no painel vê apenas um aviso para usar o app.

## App mobile

Acesso exclusivo para o perfil **fiscalizador**.

### Telas

| Tela | O que faz |
| --- | --- |
| Login | E-mail e senha, com opção de mostrar a senha |
| Visitas | Visitas pendentes e finalizadas, com atualização ao puxar a lista e indicação das salvas no aparelho |
| Detalhe da visita | Dados da visita e botão para iniciar com a localização por GPS |
| Questionário | Uma pergunta por vez, com os tipos sim/não/não se aplica, número, data e texto, e campo de observações |
| Revisar e assinar | Revisão das respostas, assinatura do fiscal e do responsável (ou recusa), e encerramento |
| Sobre | Descrição do app, versão e equipe |
| Perfil | Dados do usuário e saída da conta |

### Comportamentos importantes

- **Localização:** a visita só começa com a posição do GPS. O app trata permissão
  negada ou bloqueada, GPS desligado e falta de sinal, cada caso com a sua mensagem.
- **Rascunho no aparelho:** respostas e assinaturas ficam salvas no celular até a
  conclusão, mesmo que o app seja fechado ou a sessão expire. O rascunho é apagado
  se outro fiscal entrar no mesmo aparelho.
- **Proteção contra perda:** ao sair da conta com uma visita em andamento, o app
  pede confirmação.
- **Documento:** a assinatura do fiscal pode ser refeita. Se o PDF falhar, o botão
  de encerrar tenta gerar novamente.

## Autenticação e sessão

- Login com e-mail e senha (`POST /auth/login`).
- O token de acesso dura pouco (1 hora) e é renovado automaticamente com um
  **refresh token** de uso único (`POST /auth/refresh`). A requisição que falhou é
  repetida uma vez.
- Só quando o back recusa a renovação o usuário volta para o login. Falha de rede
  não desloga.
- Sair da conta encerra a sessão também no servidor (`POST /auth/logout`).
- **Web:** a sessão fica no `localStorage` e é coordenada entre as abas.
- **Mobile:** a sessão fica no armazenamento seguro do aparelho (SecureStore).

## Integração com o back-end

| Recurso | Rotas | Usado por |
| --- | --- | --- |
| Sessão | `POST /auth/login`, `/auth/refresh`, `/auth/logout` | web e mobile |
| Usuários | `GET/POST /usuarios`, `GET/PUT/DELETE /usuarios/:id`, `PATCH /usuarios/:id/aprovar` e `/reprovar` | web |
| Indicadores e exportação | `GET /admin/dados-gerais`, `GET /admin/exportar` | web |
| Visitas | `GET /visitas`, `GET /visitas/:id`, `PATCH /visitas/:id/concluir` | web e mobile |
| Criar visita | `POST /visitas` | web |
| Execução da visita | `PATCH /visitas/:id/iniciar`, `POST /visitas/:id/respostas`, `POST /visitas/:id/documento` | mobile |
| Questionário | `GET /questionario` | web e mobile |
| Assinaturas | `POST /documentos/:id/assinaturas`, `DELETE /documentos/:id/assinaturas/:assinaturaId` | mobile |
| Documento | `POST /documentos/:id/finalizar` | mobile |
| PDF | `GET /documentos/:id/pdf` | web |

Os erros da API são mostrados com a mensagem do próprio back. Sem conexão ou com o
servidor demorando, o front mostra uma mensagem específica e permite tentar de novo.

## Publicação

### Painel web (Vercel)

O projeto `pi4-front-web` é ligado ao GitHub, com **Root Directory** `web`.

- Merge na `main` publica em produção automaticamente.
- Push em outra branch gera um endereço de teste (preview).
- A variável `EXPO_PUBLIC_API_URL` precisa estar cadastrada em **Production** e
  **Preview**, com o endereço completo. Depois de alterá-la, refaça o deploy.
- O `web/vercel.json` gera o site com `expo export` e direciona todas as rotas para
  o `index.html`, para que atualizar a página não resulte em erro 404.

### App mobile (EAS)

Os perfis `preview` e `production` estão em `mobile/eas.json`.

```bash
cd mobile
npx eas-cli build --profile preview --platform android
```

## Validação do código

```bash
# painel web
cd web
npm run typecheck
npm run format:check
npm run build

# app mobile
cd mobile
npx tsc --noEmit
npm run format:check
```
