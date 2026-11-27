import { View, Text, StyleSheet } from "react-native";
import { PERFIS } from "@/lib/formatadores";
import { cores } from "@/theme";
import type { Role } from "@/types/usuario";

const COR_PERFIL: Record<Role, string> = {
  admin: cores.amarelo,
  gestor: cores.azulEscuro,
  fiscalizador: cores.azulFaixa,
};

export function SeloPerfil({ role }: { role: Role }) {
  const cor = COR_PERFIL[role] ?? COR_PERFIL.fiscalizador;

  return (
    <View style={styles.selo}>
      <View style={[styles.ponto, { backgroundColor: cor }]} />
      <Text style={styles.texto}>{PERFIS[role] ?? role}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  selo: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 7,
  },
  ponto: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  texto: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: cores.textoMedio,
  },
});
