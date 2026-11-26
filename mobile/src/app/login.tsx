import { useState } from "react";
import { View, Text, Image, StyleSheet, ScrollView } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TextInput, Button, HelperText } from "react-native-paper";
import { useMutation } from "@tanstack/react-query";
import { cores } from "@/theme";
import { FaixaTopo } from "@/components/FaixaTopo";
import { useSessaoStore, type UsuarioLogado } from "@/store/sessaoStore";
import { api, ApiError } from "@/lib/api";

interface RespostaLogin {
  token: string;
  usuario: UsuarioLogado;
}

async function fazerLogin(email: string, senha: string): Promise<RespostaLogin> {
  let data: RespostaLogin;
  try {
    const response = await api.post<RespostaLogin>("/auth/login", { email, senha });
    data = response.data;
  } catch (erro) {
    if (erro instanceof ApiError && erro.status === 401) {
      throw new Error("E-mail ou senha inválidos");
    }
    throw erro;
  }

  if (data.usuario?.role !== "fiscalizador") {
    throw new Error("Este aplicativo é exclusivo para fiscalizadores.");
  }

  return data;
}

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const entrar = useSessaoStore((state) => state.entrar);
  const insets = useSafeAreaInsets();

  const loginMutation = useMutation({
    mutationFn: () => fazerLogin(email, senha),
    onSuccess: async (data) => {
      await entrar(data.token, data.usuario);
    },
  });

  return (
    <View style={styles.tela}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.conteudo}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        bounces={false}
        overScrollMode="never"
      >
        <View style={styles.parteAmarela}>
          <FaixaTopo />

          <View style={styles.topo}>
            <View style={styles.marca}>
              <View style={styles.logo}>
                <Image
                  source={require("../../assets/images/logo-constata.png")}
                  style={styles.logoImagem}
                  accessibilityIgnoresInvertColors
                />
              </View>
              <View>
                <Text style={styles.marcaNome}>Constata</Text>
                <Text style={styles.marcaOrgao}>Procon Jaboatão</Text>
              </View>
            </View>

            <View accessible accessibilityRole="header" accessibilityLabel="Bora pra fiscalização?">
              <Text style={styles.chamada}>Bora pra</Text>
              <View style={styles.chamadaDestaque}>
                <Text style={[styles.chamada, styles.chamadaDestaqueTexto]}>Fiscalização?</Text>
              </View>
            </View>

            <Text style={styles.subtitulo}>
              Suas respostas ficam <Text style={styles.subtituloNegrito}>salvas no celular</Text>{" "}
              até você concluir a visita.
            </Text>
          </View>
        </View>

        <View style={[styles.formulario, { paddingBottom: 32 + insets.bottom }]}>
          <View style={styles.campo}>
            <Text style={styles.rotulo}>E-mail</Text>
            <TextInput
              mode="outlined"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              accessibilityLabel="E-mail"
              outlineColor={cores.borda}
              outlineStyle={styles.campoBorda}
              style={styles.campoTexto}
            />
          </View>

          <View style={styles.campo}>
            <Text style={styles.rotulo}>Senha</Text>
            <TextInput
              mode="outlined"
              value={senha}
              onChangeText={setSenha}
              secureTextEntry={!senhaVisivel}
              autoComplete="password"
              accessibilityLabel="Senha"
              outlineColor={cores.borda}
              outlineStyle={styles.campoBorda}
              style={styles.campoTexto}
              right={
                <TextInput.Icon
                  icon={senhaVisivel ? "eye-outline" : "eye-off-outline"}
                  color={cores.textoSecundario}
                  onPress={() => setSenhaVisivel((visivel) => !visivel)}
                  accessibilityLabel={senhaVisivel ? "Esconder senha" : "Mostrar senha"}
                />
              }
            />
          </View>

          <HelperText type="error" visible={loginMutation.isError} style={styles.erro}>
            {loginMutation.error?.message}
          </HelperText>

          <Button
            mode="contained"
            onPress={() => loginMutation.mutate()}
            loading={loginMutation.isPending}
            disabled={loginMutation.isPending}
            style={styles.botao}
            contentStyle={styles.botaoConteudo}
            labelStyle={styles.botaoTexto}
          >
            Entrar
          </Button>

          <Text style={styles.ajuda}>
            Esqueceu a senha? Peça ao seu gestor para redefinir pelo painel.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.branco,
  },
  conteudo: {
    flexGrow: 1,
  },
  parteAmarela: {
    flexGrow: 1,
    backgroundColor: cores.amarelo,
  },
  topo: {
    paddingTop: 48,
    paddingHorizontal: 28,
    paddingBottom: 56,
    gap: 18,
  },
  marca: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 11,
    overflow: "hidden",
  },
  logoImagem: {
    width: "100%",
    height: "100%",
  },
  marcaNome: {
    fontFamily: "BarlowCondensed_800ExtraBold",
    fontSize: 28,
    lineHeight: 28,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: cores.azulEscuro,
  },
  marcaOrgao: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: cores.azulEscuro,
  },
  chamada: {
    fontFamily: "BarlowCondensed_800ExtraBold",
    fontSize: 54,
    lineHeight: 54,
    textTransform: "uppercase",
    color: cores.azulEscuro,
  },
  chamadaDestaque: {
    alignSelf: "flex-start",
    backgroundColor: cores.azulEscuro,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingTop: 8,
    marginTop: 4,
  },
  chamadaDestaqueTexto: {
    lineHeight: 58,
    color: cores.amarelo,
  },
  subtitulo: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    lineHeight: 23,
    maxWidth: 300,
    color: cores.azulEscuro,
  },
  subtituloNegrito: {
    fontFamily: "Inter_700Bold",
  },
  formulario: {
    marginTop: -28,
    backgroundColor: cores.branco,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 28,
    paddingHorizontal: 24,
    gap: 16,
  },
  campo: {
    gap: 8,
  },
  rotulo: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: cores.texto,
  },
  campoTexto: {
    backgroundColor: cores.branco,
  },
  campoBorda: {
    borderRadius: 14,
    borderWidth: 1.5,
  },
  erro: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    textAlign: "center",
    marginVertical: -8,
  },
  botao: {
    borderRadius: 14,
    marginTop: 4,
  },
  botaoConteudo: {
    height: 56,
  },
  botaoTexto: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 17,
  },
  ajuda: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    color: cores.textoSecundario,
  },
});
