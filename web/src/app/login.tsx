import { useState } from "react";
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from "react-native";
import { Redirect } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { isCancel } from "axios";
import { api } from "@/lib/api";
import { mensagensDoErro, statusDoErro } from "@/lib/erros";
import { isTokenValid, startSession, useSession } from "@/lib/session";
import { BotaoPrimario, Campo, DecorativeStrip, LogoMark } from "@/components/ui";
import { cores } from "@/theme";

// a partir desta largura a tela mostra a parte amarela ao lado do formulário (o "lg" do Tailwind)
const LARGURA_DUAS_COLUNAS = 1024;

async function fazerLogin(email: string, senha: string) {
  const response = await api.post("/auth/login", { email, senha }, { skipAuth: true });
  startSession(response.data?.token, response.data?.usuario);
}

function mensagemDoLogin(erro: unknown) {
  const status = statusDoErro(erro);
  if (status === 401) return "E-mail ou senha inválidos";
  if (status === 403)
    return mensagensDoErro(erro, "Cadastro aguardando aprovação de um administrador")[0];
  return "Não foi possível entrar. Tente novamente.";
}

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const token = useSession((state) => state.token);
  const { width } = useWindowDimensions();
  const duasColunas = width >= LARGURA_DUAS_COLUNAS;

  const loginMutation = useMutation({
    mutationFn: () => fazerLogin(email, senha),
  });
  const erro =
    loginMutation.isError && !isCancel(loginMutation.error)
      ? mensagemDoLogin(loginMutation.error)
      : null;

  function entrar() {
    if (!loginMutation.isPending) loginMutation.mutate();
  }

  // já logado: a tela inicial manda cada perfil para a sua primeira página
  if (isTokenValid(token)) return <Redirect href="/" />;

  return (
    <View style={styles.tela}>
      {duasColunas ? (
        <View style={styles.vitrine}>
          <DecorativeStrip />
          <View style={styles.vitrineConteudo}>
            <View style={styles.marca}>
              <LogoMark size={48} />
              <View>
                <Text style={styles.marcaNome}>Constata</Text>
                <Text style={styles.marcaOrgao}>Procon Jaboatão dos Guararapes</Text>
              </View>
            </View>

            <View
              style={styles.chamada}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <Text style={styles.chamadaTexto}>Fiscalização</Text>
              <View style={styles.chamadaDestaque}>
                <Text style={[styles.chamadaTexto, styles.chamadaDestaqueTexto]}>sem papel.</Text>
              </View>
            </View>

            <Text style={styles.descricao}>
              Da denúncia ao documento assinado, com cada visita registrada em campo, geolocalizada
              e pronta para análise.
            </Text>

            <View style={styles.selo}>
              <Text style={styles.seloTexto}>Tudo num só painel</Text>
            </View>

            <Text style={styles.rodape}>
              Acesso restrito a servidores do Procon. Problemas para entrar? Fale com a coordenação.
            </Text>
          </View>
        </View>
      ) : null}

      <ScrollView
        style={styles.ladoFormulario}
        contentContainerStyle={styles.ladoFormularioConteudo}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formulario}>
          <Text style={styles.titulo} accessibilityRole="header">
            Entrar
          </Text>
          <Text style={styles.subtitulo}>Use seu e-mail e senha cadastrados.</Text>

          <View style={styles.campos}>
            <Campo
              rotulo="E-mail"
              value={email}
              onChangeText={setEmail}
              placeholder="nome@jaboatao.pe.gov.br"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              onSubmitEditing={entrar}
            />
            <Campo
              rotulo="Senha"
              value={senha}
              onChangeText={setSenha}
              placeholder="Digite sua senha"
              secureTextEntry
              autoComplete="current-password"
              onSubmitEditing={entrar}
            />
          </View>

          {erro ? (
            <Text style={styles.erro} accessibilityRole="alert">
              {erro}
            </Text>
          ) : null}

          <BotaoPrimario
            onPress={entrar}
            loading={loginMutation.isPending}
            disabled={loginMutation.isPending}
            style={styles.botao}
          >
            {loginMutation.isPending ? "Entrando..." : "Entrar no painel"}
          </BotaoPrimario>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#F3F6FB",
  },
  vitrine: {
    flex: 1,
    maxWidth: 760,
    overflow: "hidden",
    backgroundColor: cores.amarelo,
  },
  vitrineConteudo: {
    flex: 1,
    paddingHorizontal: 56,
    paddingTop: 48,
    paddingBottom: 48,
  },
  marca: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  marcaNome: {
    fontFamily: "BarlowCondensed_900Black",
    fontSize: 34,
    lineHeight: 34,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: cores.azulEscuro,
  },
  marcaOrgao: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: cores.azulEscuro,
  },
  chamada: {
    marginTop: 48,
    alignItems: "flex-start",
  },
  chamadaTexto: {
    fontFamily: "BarlowCondensed_900Black",
    fontSize: 84,
    lineHeight: 84,
    textTransform: "uppercase",
    color: cores.azulEscuro,
  },
  chamadaDestaque: {
    marginTop: 4,
    paddingHorizontal: 14,
    paddingTop: 8,
    borderRadius: 10,
    backgroundColor: cores.azulEscuro,
  },
  chamadaDestaqueTexto: {
    lineHeight: 93,
    color: cores.amarelo,
  },
  descricao: {
    marginTop: 24,
    maxWidth: 430,
    fontFamily: "Inter_500Medium",
    fontSize: 19,
    lineHeight: 28.5,
    color: cores.azulEscuro,
  },
  selo: {
    marginTop: 24,
    alignSelf: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: cores.branco,
  },
  seloTexto: {
    fontFamily: "BarlowCondensed_800ExtraBold",
    fontSize: 24,
    textTransform: "uppercase",
    color: cores.azulEscuro,
  },
  rodape: {
    marginTop: "auto",
    paddingTop: 40,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: cores.azulEscuro,
  },
  ladoFormulario: {
    flex: 1,
  },
  ladoFormularioConteudo: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  formulario: {
    width: "100%",
    maxWidth: 420,
    padding: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#DCE3EF",
    backgroundColor: cores.branco,
    boxShadow: "0 20px 24px rgba(23, 47, 110, 0.1)",
  },
  titulo: {
    fontFamily: "BarlowCondensed_800ExtraBold",
    fontSize: 36,
    textTransform: "uppercase",
    color: cores.azulEscuro,
  },
  subtitulo: {
    marginTop: 6,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: cores.textoSecundario,
  },
  campos: {
    marginTop: 20,
    gap: 20,
  },
  erro: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    overflow: "hidden",
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: cores.erroTexto,
    backgroundColor: cores.erroFundo,
  },
  botao: {
    marginTop: 24,
    borderRadius: 12,
  },
});
