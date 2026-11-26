import { View, Text, StyleSheet } from "react-native";
import { Redirect } from "expo-router";
import { Icon } from "react-native-paper";
import { useSession } from "@/lib/session";
import { Cartao, PageHeader } from "@/components/ui";
import { cores } from "@/theme";

// Cada perfil entra na sua primeira tela; o fiscalizador usa o app no celular
export default function PaginaInicial() {
  const role = useSession((state) =>
    typeof state.claims?.role === "string" ? state.claims.role : null
  );

  if (role === "admin") return <Redirect href="/admin" />;
  if (role === "gestor") return <Redirect href="/gestor/fiscalizadores" />;

  return (
    <View style={styles.conteudo}>
      <PageHeader eyebrow="Bem-vindo ao Constata" title="Use o app no celular" />
      <Cartao style={styles.cartao}>
        <Icon source="cellphone" size={28} color={cores.azul} />
        <Text style={styles.texto}>
          O painel web é usado por administradores e gestores. As visitas do seu perfil ficam no app
          do Constata.
        </Text>
      </Cartao>
    </View>
  );
}

const styles = StyleSheet.create({
  conteudo: {
    maxWidth: 780,
    gap: 24,
  },
  cartao: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    padding: 28,
  },
  texto: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 24,
    color: cores.textoMedio,
  },
});
