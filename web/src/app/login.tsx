import { useState } from "react";
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from "react-native";
import { Button } from "react-native-paper";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSessaoStore } from "@/store/sessaoStore";
import { Campo } from "@/components/Campo";
import { FaixaTopo } from "@/components/FaixaTopo";
import { Logo } from "@/components/Logo";
import { cores } from "@/theme";
import type { UsuarioLogado } from "@/types/usuario";

const LARGURA_DUAS_COLUNAS = 1024;

interface RespostaLogin {
  token: string;
  usuario: UsuarioLogado;
}

async function fazerLogin(email: string, senha: string) {
  const response = await api.post<RespostaLogin>("/auth/login", { email: email.trim(), senha });
  return response.data;
}

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const entrar = useSessaoStore((state) => state.entrar);
  const { width } = useWindowDimensions();

  const loginMutation = useMutation({
    mutationFn: () => fazerLogin(email, senha),
    onSuccess: ({ token, usuario }) => entrar(token, usuario),
  });

  function enviar() {
    if (!loginMutation.isPending) loginMutation.mutate();
  }

  return (
    <View style={styles.tela}>
      {width >= LARGURA_DUAS_COLUNAS && (
        <View style={styles.vitrine}>
          <FaixaTopo />
          <View style={styles.vitrineConteudo}>
            <View style={styles.marca}>
              <Logo tamanho={48} />
              <View>
                <Text style={styles.marcaNome}>Constata</Text>
                <Text style={styles.marcaOrgao}>Procon Jaboatão dos Guararapes</Text>
              </View>
            </View>

            <View style={styles.chamada}>
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
      )}

      <ScrollView
        style={styles.lado}
        contentContainerStyle={styles.ladoConteudo}
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
              onSubmitEditing={enviar}
            />
            <Campo
              rotulo="Senha"
              value={senha}
              onChangeText={setSenha}
              placeholder="Digite sua senha"
              secureTextEntry
              autoComplete="current-password"
              onSubmitEditing={enviar}
            />
          </View>

          {loginMutation.isError && (
            <Text style={styles.erro} accessibilityRole="alert">
              {loginMutation.error.message}
            </Text>
          )}

          <Button
            mode="contained"
            onPress={enviar}
            loading={loginMutation.isPending}
            disabled={loginMutation.isPending}
            style={styles.botao}
            contentStyle={styles.botaoConteudo}
          >
            {loginMutation.isPending ? "Entrando..." : "Entrar no painel"}
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: cores.fundo,
  },
  vitrine: {
    flex: 1,
    maxWidth: 760,
    overflow: "hidden",
    backgroundColor: cores.amarelo,
  },
  vitrineConteudo: {
    flex: 1,
    padding: 56,
    paddingTop: 48,
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
    lineHeight: 28,
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
  lado: {
    flex: 1,
  },
  ladoConteudo: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  formulario: {
    width: "100%",
    maxWidth: 420,
    padding: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: cores.bordaClara,
    backgroundColor: cores.branco,
    boxShadow: `0 20px 24px ${cores.sombra}`,
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
    padding: 12,
    borderRadius: 12,
    overflow: "hidden",
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: cores.erroTexto,
    backgroundColor: cores.erroFundo,
  },
  botao: {
    marginTop: 24,
  },
  botaoConteudo: {
    height: 48,
  },
});
