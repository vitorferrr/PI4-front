import { useState } from "react";
import { View, Text, Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { Icon, Menu } from "react-native-paper";
import { cores } from "@/theme";

export interface OpcaoSelecao {
  valor: string;
  rotulo: string;
}

interface SelecaoProps {
  rotulo: string;
  valor: string;
  opcoes: OpcaoSelecao[];
  onChange: (valor: string) => void;
  style?: StyleProp<ViewStyle>;
}

export function Selecao({ rotulo, valor, opcoes, onChange, style }: SelecaoProps) {
  const [aberto, setAberto] = useState(false);
  const escolhida = opcoes.find((opcao) => opcao.valor === valor) ?? opcoes[0];

  function escolher(novoValor: string) {
    setAberto(false);
    onChange(novoValor);
  }

  return (
    <View style={[styles.selecao, style]}>
      <Text style={styles.rotulo}>{rotulo}</Text>
      <Menu
        visible={aberto}
        onDismiss={() => setAberto(false)}
        anchorPosition="bottom"
        contentStyle={styles.menu}
        anchor={
          <Pressable
            onPress={() => setAberto(true)}
            accessibilityRole="combobox"
            accessibilityLabel={rotulo}
            style={[styles.campo, aberto && styles.campoAberto]}
          >
            <Text style={styles.valor} numberOfLines={1}>
              {escolhida?.rotulo}
            </Text>
            <Icon
              source={aberto ? "chevron-up" : "chevron-down"}
              size={20}
              color={cores.textoMedio}
            />
          </Pressable>
        }
      >
        {opcoes.map((opcao) => (
          <Menu.Item
            key={opcao.valor}
            title={opcao.rotulo}
            leadingIcon={opcao.valor === valor ? "check" : undefined}
            onPress={() => escolher(opcao.valor)}
          />
        ))}
      </Menu>
    </View>
  );
}

const styles = StyleSheet.create({
  selecao: {
    gap: 6,
  },
  rotulo: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: cores.texto,
  },
  campo: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: cores.bordaCampo,
    backgroundColor: cores.branco,
  },
  campoAberto: {
    borderColor: cores.azul,
  },
  valor: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: cores.texto,
  },
  menu: {
    backgroundColor: cores.branco,
  },
});
