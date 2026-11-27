import { View, Text, ScrollView, Alert, StyleSheet } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar, Button, List } from "react-native-paper";
import { useMutation } from "@tanstack/react-query";
import { sair } from "@/lib/api";
import { iniciais } from "@/lib/formatadores";
import { useSessaoStore } from "@/store/sessaoStore";
import { useVisitaEmAndamentoStore } from "@/store/visitaEmAndamentoStore";
import { FaixaTopo } from "@/components/FaixaTopo";
import { cores } from "@/theme";

const NOMES_PERFIL: Record<string, string> = {
  fiscalizador: "Fiscalizador",
  gestor: "Gestor",
  admin: "Administrador",
};

export default function PerfilScreen() {
  const insets = useSafeAreaInsets();
  const usuario = useSessaoStore((state) => state.usuario);
  const visitaNoAparelho = useVisitaEmAndamentoStore((state) => state.visitaId);

  const sairMutation = useMutation({ mutationFn: sair });

  function confirmarSaida() {
    const sairAgora = () => sairMutation.mutate();

    if (visitaNoAparelho !== null) {
      Alert.alert(
        "Visita em andamento",
        "Você tem uma visita em andamento salva neste aparelho. Se sair agora, as respostas e assinaturas que ainda não foram enviadas serão apagadas.",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Sair e apagar", style: "destructive", onPress: sairAgora },
        ]
      );
      return;
    }

    Alert.alert("Sair da conta", "Deseja sair do aplicativo?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: sairAgora },
    ]);
  }

  return (
    <View style={styles.tela}>
      <StatusBar style="light" />

      <View style={styles.cabecalho}>
        <FaixaTopo />
        <View style={styles.titulos}>
          <Text style={styles.sobretitulo}>Conta</Text>
          <Text style={styles.titulo} accessibilityRole="header">
            Meu perfil
          </Text>
        </View>
      </View>

      {/* no iOS a barra de abas flutua por cima da tela; o insets.bottom inclui a altura dela */}
      <ScrollView contentContainerStyle={[styles.conteudo, { paddingBottom: 20 + insets.bottom }]}>
        <View style={styles.cartao}>
          <Avatar.Text
            size={60}
            label={iniciais(usuario?.nome)}
            style={styles.avatar}
            labelStyle={styles.avatarTexto}
            color={cores.azulEscuro}
          />
          <View style={styles.dados}>
            <Text style={styles.nome}>{usuario?.nome || "Fiscal"}</Text>
            {usuario?.email ? <Text style={styles.email}>{usuario.email}</Text> : null}
            {usuario?.role ? (
              <View style={styles.selo}>
                <Text style={styles.seloTexto}>{NOMES_PERFIL[usuario.role] ?? usuario.role}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.opcoes}>
          <List.Item
            title="Sobre o app e equipe"
            titleStyle={styles.opcaoTexto}
            onPress={() => router.navigate("/sobre")}
            left={(props) => <List.Icon {...props} icon="information-outline" color={cores.azul} />}
            right={(props) => (
              <List.Icon {...props} icon="chevron-right" color={cores.textoSecundario} />
            )}
            style={styles.opcao}
            accessibilityRole="button"
          />
        </View>

        <View style={styles.rodape}>
          <Button
            mode="outlined"
            icon="logout"
            textColor={cores.erro}
            onPress={confirmarSaida}
            loading={sairMutation.isPending}
            disabled={sairMutation.isPending}
            style={styles.botaoSair}
            contentStyle={styles.botaoSairConteudo}
            labelStyle={styles.botaoSairTexto}
          >
            Sair da conta
          </Button>
          <Text style={styles.aviso}>Com internet, a sessão também é encerrada no servidor.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  cabecalho: {
    backgroundColor: cores.azul,
  },
  titulos: {
    paddingTop: 22,
    paddingHorizontal: 20,
    paddingBottom: 22,
    gap: 2,
  },
  sobretitulo: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: cores.azulClaro,
  },
  titulo: {
    fontFamily: "BarlowCondensed_800ExtraBold",
    fontSize: 32,
    lineHeight: 36,
    textTransform: "uppercase",
    color: cores.branco,
  },
  conteudo: {
    flexGrow: 1,
    padding: 20,
    gap: 16,
  },
  cartao: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 4,
    borderBottomRightRadius: 18,
    borderWidth: 1,
    borderColor: cores.bordaClara,
    backgroundColor: cores.branco,
  },
  avatar: {
    backgroundColor: cores.amarelo,
  },
  avatarTexto: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 20,
  },
  dados: {
    flex: 1,
    gap: 4,
  },
  nome: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: cores.texto,
  },
  email: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: cores.textoSecundario,
  },
  selo: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: cores.agendadaFundo,
  },
  seloTexto: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    color: cores.agendadaTexto,
  },
  opcoes: {
    borderRadius: 4,
    borderBottomRightRadius: 18,
    borderWidth: 1,
    borderColor: cores.bordaClara,
    backgroundColor: cores.branco,
    overflow: "hidden",
  },
  opcao: {
    minHeight: 60,
    justifyContent: "center",
  },
  opcaoTexto: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: cores.texto,
  },
  rodape: {
    marginTop: "auto",
    gap: 8,
  },
  botaoSair: {
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: cores.erroBorda,
    backgroundColor: cores.branco,
  },
  botaoSairConteudo: {
    height: 56,
  },
  botaoSairTexto: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 17,
  },
  aviso: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    color: cores.textoSecundario,
  },
});
