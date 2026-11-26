import { View, Text, Pressable, StyleSheet } from "react-native";
import { Icon } from "react-native-paper";
import { cores } from "@/theme";

interface AvisoPainelProps {
  icone: string;
  cor: string;
  fundo: string;
  titulo: string;
  descricao: string;
  onPress: () => void;
}

export function AvisoPainel({ icone, cor, fundo, titulo, descricao, onPress }: AvisoPainelProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`${titulo}. ${descricao}`}
      style={({ pressed }) => [styles.aviso, pressed && styles.avisoPressionado]}
    >
      <View style={[styles.icone, { backgroundColor: fundo }]}>
        <Icon source={icone} size={22} color={cor} />
      </View>
      <View style={styles.textos}>
        <Text style={styles.titulo}>{titulo}</Text>
        <Text style={styles.descricao}>{descricao}</Text>
      </View>
      <Text style={styles.ver}>Ver</Text>
      <Icon source="chevron-right" size={20} color={cores.azul} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  aviso: {
    flexGrow: 1,
    flexBasis: 380,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: cores.bordaClara,
    backgroundColor: cores.branco,
  },
  avisoPressionado: {
    backgroundColor: cores.selecionado,
  },
  icone: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  textos: {
    flex: 1,
    gap: 2,
  },
  titulo: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: cores.texto,
  },
  descricao: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: cores.textoSecundario,
  },
  ver: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: cores.azul,
  },
});
