import { View, Text, Pressable, StyleSheet } from "react-native";
import { RadioButton } from "react-native-paper";
import { plural } from "@/lib/formatadores";
import { BarraCarga } from "@/components/BarraCarga";
import { cores } from "@/theme";
import type { Usuario } from "@/types/usuario";

interface OpcaoFiscalProps {
  fiscal: Usuario;
  abertas: number;
  selecionado: boolean;
  onPress: () => void;
}

export function OpcaoFiscal({ fiscal, abertas, selecionado, onPress }: OpcaoFiscalProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={fiscal.nome}
      accessibilityState={{ checked: selecionado }}
      style={[styles.opcao, selecionado && styles.opcaoSelecionada]}
    >
      <View style={styles.linha}>
        <RadioButton.Android
          value={String(fiscal.id)}
          status={selecionado ? "checked" : "unchecked"}
          onPress={onPress}
        />
        <Text style={styles.nome}>{fiscal.nome}</Text>
        <Text style={styles.abertas}>{plural(abertas, "aberta", "abertas")}</Text>
      </View>
      <BarraCarga abertas={abertas} altura={8} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  opcao: {
    gap: 6,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.branco,
  },
  opcaoSelecionada: {
    borderColor: cores.azul,
    backgroundColor: cores.selecionado,
  },
  linha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  nome: {
    flex: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: cores.texto,
  },
  abertas: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: cores.textoMedio,
  },
});
