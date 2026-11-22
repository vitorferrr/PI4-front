import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface CabecalhoVisitaProps {
  titulo: string;
  subtitulo?: string;
  rotuloVoltar?: string;
  mostrarSelo?: boolean;
  horaCheckIn?: string | null;
  progresso?: { atual: number; total: number; respondidas: number };
}

export function CabecalhoVisita({
  titulo,
  subtitulo,
  rotuloVoltar = "Voltar",
  mostrarSelo = false,
  horaCheckIn,
  progresso,
}: CabecalhoVisitaProps) {
  const insets = useSafeAreaInsets();

  const porcentagemRespondida = progresso
    ? Math.round((progresso.respondidas / progresso.total) * 100)
    : 0;

  return (
    <View style={[styles.cabecalho, { paddingTop: insets.top + 8 }]}>
      <View style={styles.linha}>
        <Pressable
          style={styles.botaoVoltar}
          accessibilityRole="button"
          accessibilityLabel={rotuloVoltar}
          onPress={() => router.back()}
        >
          <Text style={styles.botaoVoltarTexto}>‹</Text>
        </Pressable>

        <View style={styles.textos}>
          <Text style={styles.titulo} numberOfLines={2}>
            {titulo}
          </Text>
          {subtitulo ? <Text style={styles.subtitulo}>{subtitulo}</Text> : null}
        </View>

        {mostrarSelo && (
          <View style={styles.selo}>
            <Text style={styles.seloIcone}>✓</Text>
            <Text style={styles.seloTexto}>Salvo no aparelho</Text>
          </View>
        )}
      </View>

      {horaCheckIn ? (
        <View style={styles.checkIn}>
          <Text style={styles.checkInTexto}>Check-in às {horaCheckIn}</Text>
        </View>
      ) : null}

      {progresso ? (
        <View style={styles.progresso}>
          <View style={styles.progressoLinha}>
            <Text style={styles.progressoTexto}>
              Pergunta {progresso.atual} de {progresso.total}
            </Text>
            <Text style={styles.progressoTexto}>
              {progresso.respondidas} de {progresso.total} respondidas
            </Text>
          </View>
          <View style={styles.barraFundo}>
            <View style={[styles.barraPreenchida, { width: `${porcentagemRespondida}%` }]} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cabecalho: {
    backgroundColor: "#1D3F94",
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 14,
  },
  linha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  botaoVoltar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  botaoVoltarTexto: {
    color: "#FFFFFF",
    fontSize: 36,
    lineHeight: 38,
  },
  textos: {
    flex: 1,
  },
  titulo: {
    fontFamily: "BarlowCondensed_800ExtraBold",
    fontSize: 23,
    lineHeight: 25,
    textTransform: "uppercase",
    color: "#FFFFFF",
  },
  subtitulo: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#D6E6F8",
  },
  selo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#172F6E",
  },
  seloIcone: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 13,
    color: "#FFCC00",
  },
  seloTexto: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    color: "#FFFFFF",
  },
  checkIn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#E2F5EA",
  },
  checkInTexto: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#0E4F27",
  },
  progresso: {
    gap: 6,
  },
  progressoLinha: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressoTexto: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#FFFFFF",
  },
  barraFundo: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#172F6E",
    overflow: "hidden",
  },
  barraPreenchida: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFCC00",
  },
});
