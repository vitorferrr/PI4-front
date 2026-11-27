# Constata · Procon Jaboatão (App mobile)

App de campo do **Constata**, usado pelo fiscalizador do Procon de Jaboatão dos
Guararapes para executar a visita, responder o questionário e colher as
assinaturas direto no celular.

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
- [Estrutura de pastas](#estrutura-de-pastas)
- [Como rodar](#como-rodar)
- [Telas](#telas)
- [Fluxo de uma visita](#fluxo-de-uma-visita)
- [Dados salvos no aparelho](#dados-salvos-no-aparelho)
- [Localização](#localização)
- [Autenticação e sessão](#autenticação-e-sessão)
- [Integração com o back-end](#integração-com-o-back-end)
- [Build e publicação](#build-e-publicação)
- [Validação do código](#validação-do-código)

## Visão geral

O acesso é exclusivo para o perfil **fiscalizador**. As visitas são criadas pelo
gestor no [painel web](https://pi4-front-web.vercel.app), e o app consome a mesma
API ([PI4-back](https://github.com/vitorferrr/PI4-back)).

## Tecnologias

| Uso | Biblioteca |
| --- | --- |
| Base | React Native, Expo SDK 58, TypeScript |
| Navegação | Expo Router (rotas por arquivo) e abas nativas |
| Componentes e tema | React Native Paper e `StyleSheet` |
| Animações | react-native-reanimated |
| Dados da API | TanStack Query e Axios |
| Estado global | Zustand |
| Sessão | expo-secure-store |
| Rascunho da visita | AsyncStorage e expo-file-system |
| Localização | expo-location |
| Assinatura na tela | react-native-signature-canvas |
| Atualizações e build | expo-updates e EAS |
| Formatação | Prettier |

## Estrutura de pastas

```
mobile/
├── src/
│   ├── app/                    telas (o nome do arquivo é a rota)
│   │   ├── login.tsx
│   │   ├── (tabs)/             Visitas, Sobre e Perfil
│   │   └── visita/[id]/        detalhe, questionário e documento
│   ├── components/             cartões, cabeçalhos, perguntas e assinatura
│   ├── hooks/                  consultas à API
│   ├── lib/                    API, sessão, localização e formatadores
│   ├── store/                  sessão e visita em andamento
│   ├── types/                  tipos da visita
│   └── theme.ts                cores e tema
├── assets/                     imagens e ícones
├── app.json                    configuração do Expo
└── eas.json                    perfis de build
```

## Como rodar

**Pré-requisitos:** Node.js 22 ou superior, npm e o **Expo Go** compatível com o
SDK 58 (ou um build instalado). Execute os comandos dentro de `mobile/`.

```bash
npm install
cp .env.example .env
npx expo start
```

Leia o QR code com o Expo Go (Android) ou com a câmera (iOS). O celular e o
computador precisam estar na mesma rede.

| Comando | O que faz |
| --- | --- |
| `npm start` | Inicia o servidor de desenvolvimento |
| `npm run android` | Abre no Android |
| `npm run ios` | Abre no iOS |

### Variável de ambiente

```dotenv
EXPO_PUBLIC_API_URL=https://pi4-back-one.vercel.app
```

- Sem a variável, o app usa a API em produção.
- Informe a URL com `https://` ou `http://` e sem barra no final.
- Para um back local, use o IP do computador: no celular, `localhost` é o próprio
  aparelho.
- Depois de mudar o `.env`, reinicie o Expo. O arquivo não é versionado.

### Acesso para teste

Entre com um usuário fiscalizador cadastrado pelo administrador no painel. A senha
chega por e-mail.

## Telas

| Tela | Arquivo | O que faz |
| --- | --- | --- |
| Login | `login.tsx` | E-mail e senha, com opção de mostrar a senha |
| Visitas | `(tabs)/index.tsx` | Visitas separadas em "Em andamento", "Próximas" e "Finalizadas", com atualização ao puxar a lista ou pelo botão |
| Sobre | `(tabs)/sobre.tsx` | Descrição do app, versão e equipe |
| Perfil | `(tabs)/perfil.tsx` | Dados do usuário e saída da conta |
| Detalhe da visita | `visita/[id]/index.tsx` | Dados da visita e botão para iniciar ou continuar |
| Questionário | `visita/[id]/questionario.tsx` | Uma pergunta por vez, com campo de observações |
| Revisar e assinar | `visita/[id]/documento.tsx` | Revisão das respostas, assinaturas e encerramento |

## Fluxo de uma visita

1. **Iniciar:** em uma visita agendada, o app captura a localização por GPS e muda
   o status para "em andamento".
2. **Responder:** as perguntas vêm da API, nos tipos:
   - sim, não ou não se aplica;
   - número;
   - data (com máscara DD/MM/AAAA);
   - texto.
3. O app aponta as perguntas em branco ou com formato inválido antes de enviar.
4. **Assinar:** o fiscal logado assina primeiro. Em seguida, o responsável pelo
   estabelecimento informa o nome (o e-mail é opcional) e assina ou recusa.
5. **Concluir:** com as assinaturas, o back gera o PDF, envia por e-mail ao
   responsável e encerra a visita. Se o PDF falhar, é possível tentar de novo.

A assinatura do fiscal pode ser apagada e refeita antes da geração do PDF. Depois
que o documento existe, as respostas não podem mais ser alteradas.

## Dados salvos no aparelho

- As respostas, as observações e as assinaturas ficam salvas até a conclusão, mesmo
  que o app seja fechado ou a sessão expire.
- O rascunho é apagado se outro fiscal entrar no mesmo aparelho.
- Ao sair da conta com uma visita em andamento, o app pede confirmação.
- O envio ao servidor **precisa de internet**.

## Localização

A posição é lida somente no início da visita. O app trata cada falha com uma
mensagem própria:

| Situação | O que o app oferece |
| --- | --- |
| Permissão negada | Tentar novamente |
| Permissão bloqueada | Abrir as configurações do aparelho |
| GPS desligado | Ativar a localização |
| Sem sinal | Tentar novamente em local aberto |

Se a posição atual não chegar em 15 segundos, o app usa a última posição
conhecida, desde que tenha no máximo 5 minutos.

## Autenticação e sessão

- Login em `POST /auth/login`. Perfis diferentes de fiscalizador são recusados.
- O token fica no armazenamento seguro do aparelho (SecureStore).
- A sessão dura 1 hora. Depois disso, o app volta para o login e mantém a visita
  em andamento salva.
- A renovação automática com **refresh token** já está pronta no app, mas só passa
  a valer quando a parte do back (DT-38) for publicada.
- Sair da conta encerra a sessão também no servidor.

## Integração com o back-end

| Ação | Rota |
| --- | --- |
| Entrar e sair | `POST /auth/login`, `POST /auth/logout` |
| Listar e abrir visitas | `GET /visitas`, `GET /visitas/:id` |
| Iniciar | `PATCH /visitas/:id/iniciar` |
| Perguntas | `GET /questionario` |
| Enviar respostas | `POST /visitas/:id/respostas` |
| Gerar o documento | `POST /visitas/:id/documento` |
| Assinar e apagar assinatura | `POST /documentos/:id/assinaturas`, `DELETE /documentos/:id/assinaturas/:assinaturaId` |
| Gerar o PDF novamente | `POST /documentos/:id/finalizar` |
| Concluir | `PATCH /visitas/:id/concluir` |

## Build e publicação

Os perfis ficam em `eas.json`:

| Perfil | Uso |
| --- | --- |
| `preview` | Build de teste, distribuição interna |
| `production` | Build de produção, apontando para a API publicada |

```bash
npx eas-cli build --profile preview --platform android
```

É preciso estar logado em uma conta com acesso ao projeto no Expo. Cada perfil tem
um canal de atualização (`expo-updates`).

## Validação do código

```bash
npx tsc --noEmit
npm run format:check
```
