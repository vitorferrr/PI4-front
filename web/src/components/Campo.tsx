import { View, Text, StyleSheet } from "react-native";
import { TextInput, type TextInputProps } from "react-native-paper";
import { cores } from "@/theme";

type CampoProps = Omit<TextInputProps, "mode" | "error"> & {
  rotulo?: string;
  erro?: string | null;
  ajuda?: string;
  icone?: string;
};

export function Campo({ rotulo, erro, ajuda, icone, style, ...props }: CampoProps) {
  return (
    <View style={[styles.campo, style]}>
      {rotulo && <Text style={styles.rotulo}>{rotulo}</Text>}
      <TextInput
        mode="outlined"
        dense
        accessibilityLabel={rotulo ?? props.placeholder}
        error={Boolean(erro)}
        outlineColor={cores.bordaCampo}
        outlineStyle={styles.borda}
        style={styles.entrada}
        left={icone ? <TextInput.Icon icon={icone} /> : undefined}
        {...props}
      />
      {erro && <Text style={styles.erro}>{erro}</Text>}
      {!erro && ajuda && <Text style={styles.ajuda}>{ajuda}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  campo: {
    gap: 6,
  },
  rotulo: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: cores.texto,
  },
  entrada: {
    backgroundColor: cores.branco,
    fontSize: 15,
  },
  borda: {
    borderRadius: 10,
  },
  erro: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: cores.erroForte,
  },
  ajuda: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: cores.textoSecundario,
  },
});
