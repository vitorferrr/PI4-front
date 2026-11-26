import { View, Text, StyleSheet } from "react-native";
import { PERFIS } from "@/lib/formatadores";
import { cores } from "@/theme";
import type { Role } from "@/types/usuario";

const CORES_PERFIL: Record<Role, { fundo: string; texto: string }> = {
  admin: { fundo: cores.avisoFundo, texto: cores.aviso },
  gestor: { fundo: cores.enviadaFundo, texto: cores.enviada },
  fiscalizador: { fundo: cores.atribuidaFundo, texto: cores.atribuida },
};

export function SeloPerfil({ role }: { role: Role }) {
  const cor = CORES_PERFIL[role] ?? CORES_PERFIL.fiscalizador;

  return (
    <View style={[styles.selo, { backgroundColor: cor.fundo }]}>
      <Text style={[styles.texto, { color: cor.texto }]}>{PERFIS[role] ?? role}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  selo: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  texto: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
});
