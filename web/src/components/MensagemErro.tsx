import { View, Text, StyleSheet } from "react-native";
import { Button } from "react-native-paper";
import { ApiError } from "@/lib/api";
import { cores } from "@/theme";

interface MensagemErroProps {
  erro: unknown;
  onTentar?: () => void;
  tentando?: boolean;
}

export function MensagemErro({ erro, onTentar, tentando = false }: MensagemErroProps) {
  const mensagem = erro instanceof Error ? erro.message : "Algo deu errado. Tente novamente.";
  const detalhes = erro instanceof ApiError ? erro.erros : [];

  return (
    <View style={styles.caixa} accessibilityRole="alert">
      <View style={styles.textos}>
        <Text style={[styles.texto, styles.principal]}>{mensagem}</Text>
        {detalhes.map((detalhe) => (
          <Text key={detalhe} style={styles.texto}>
            • {detalhe}
          </Text>
        ))}
      </View>
      {onTentar && (
        <Button mode="outlined" onPress={onTentar} loading={tentando} disabled={tentando}>
          Tentar novamente
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  caixa: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: cores.erroFundo,
  },
  textos: {
    flexShrink: 1,
    gap: 4,
  },
  texto: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: cores.erroTexto,
  },
  principal: {
    fontFamily: "Inter_600SemiBold",
  },
});
