import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton, ProgressBar } from "react-native-paper";
import { cores } from "@/theme";

interface CabecalhoVisitaProps {
  titulo: string;
  subtitulo?: string;
  rotuloVoltar?: string;
  mostrarSelo?: boolean;
  progresso?: { atual: number; total: number; respondidas: number };
}

export function CabecalhoVisita({
  titulo,
  subtitulo,
  rotuloVoltar = "Voltar",
  mostrarSelo = false,
  progresso,
}: CabecalhoVisitaProps) {
  const insets = useSafeAreaInsets();

  const porcentagemRespondida = progresso
    ? Math.round((progresso.respondidas / progresso.total) * 100)
    : 0;

  return (
    <View style={[styles.cabecalho, { paddingTop: insets.top + 8 }]}>
      <View style={styles.linha}>
        <IconButton
          icon="chevron-left"
          size={32}
          iconColor={cores.branco}
          style={styles.botaoVoltar}
          accessibilityLabel={rotuloVoltar}
          onPress={() => router.back()}
        />

        <View style={styles.textos}>
          <Text style={styles.titulo} numberOfLines={1}>
            {titulo}
          </Text>
          {subtitulo ? <Text style={styles.subtitulo}>{subtitulo}</Text> : null}
        </View>

        {mostrarSelo && (
          <View style={styles.selo}>
            <Text style={styles.seloIcone}>✓</Text>
            <Text style={styles.seloTexto}>Salvo</Text>
          </View>
        )}
      </View>

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
          <ProgressBar
            progress={porcentagemRespondida / 100}
            color={cores.amarelo}
            style={styles.barra}
            accessibilityLabel={`${porcentagemRespondida}% respondido`}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cabecalho: {
    backgroundColor: cores.azul,
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
    margin: 0,
  },
  textos: {
    flex: 1,
  },
  titulo: {
    fontFamily: "BarlowCondensed_800ExtraBold",
    fontSize: 23,
    lineHeight: 25,
    textTransform: "uppercase",
    color: cores.branco,
  },
  subtitulo: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: cores.azulClaro,
  },
  selo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  seloIcone: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 13,
    color: cores.amarelo,
  },
  seloTexto: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    color: cores.branco,
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
    color: cores.branco,
  },
  barra: {
    height: 8,
    borderRadius: 4,
    backgroundColor: cores.azulEscuro,
  },
});
