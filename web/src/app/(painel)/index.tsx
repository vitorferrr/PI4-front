import { View, Text, StyleSheet } from "react-native";
import { Redirect } from "expo-router";
import { Icon } from "react-native-paper";
import { useSessaoStore } from "@/store/sessaoStore";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { CartaoSecao } from "@/components/CartaoSecao";
import { cores } from "@/theme";

export default function InicioScreen() {
  const role = useSessaoStore((state) => state.usuario?.role);

  if (role === "admin") return <Redirect href="/admin" />;
  if (role === "gestor") return <Redirect href="/gestor/fiscalizadores" />;

  return (
    <View style={styles.pagina}>
      <CabecalhoPagina sobretitulo="Bem-vindo ao Constata" titulo="Use o app no celular" />
      <CartaoSecao>
        <View style={styles.aviso}>
          <Icon source="cellphone" size={28} color={cores.azul} />
          <Text style={styles.texto}>
            O painel web é usado por administradores e gestores. As visitas do seu perfil ficam no
            app do Constata.
          </Text>
        </View>
      </CartaoSecao>
    </View>
  );
}

const styles = StyleSheet.create({
  pagina: {
    gap: 24,
  },
  aviso: {
    flexDirection: "row",
    gap: 16,
  },
  texto: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 24,
    color: cores.textoMedio,
  },
});
