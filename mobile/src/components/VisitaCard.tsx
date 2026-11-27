import { View, Text, StyleSheet } from "react-native";
import { Card } from "react-native-paper";
import { router } from "expo-router";
import type { VisitaDetalhe } from "@/types/visita";
import { formatarStatus } from "@/lib/formatadores";
import { cores } from "@/theme";
import { SeloStatus } from "@/components/SeloStatus";
import { BolinhaPulsante } from "@/components/BolinhaPulsante";

function formatarDiaMes(dataIso: string) {
  const data = new Date(dataIso);
  if (Number.isNaN(data.getTime())) return null;
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function estaAtrasada(visita: VisitaDetalhe) {
  if (visita.status === "concluida" || visita.status === "cancelada") return false;
  const inicioDeHoje = new Date();
  inicioDeHoje.setHours(0, 0, 0, 0);
  return new Date(visita.data_agendada) < inicioDeHoje;
}

interface VisitaCardProps {
  visita: VisitaDetalhe;
  salvaNoAparelho?: boolean;
}

export function VisitaCard({ visita, salvaNoAparelho = false }: VisitaCardProps) {
  const diaMes = formatarDiaMes(visita.data_agendada);
  const atrasada = estaAtrasada(visita);
  const endereco = [visita.endereco, visita.bairro].filter(Boolean).join(", ");

  return (
    <Card
      mode="outlined"
      style={styles.cartao}
      contentStyle={styles.conteudo}
      onPress={() => router.push(`/visita/${visita.id}`)}
      accessibilityLabel={`${visita.denunciado}, ${formatarStatus(visita.status)}`}
    >
      <View style={styles.linhaTopo}>
        <SeloStatus status={visita.status} />
        {diaMes && (
          <Text style={[styles.prazo, atrasada && styles.prazoAtrasado]}>
            {atrasada ? `Atrasada desde ${diaMes}` : `Agendada para ${diaMes}`}
          </Text>
        )}
      </View>

      <View style={styles.textos}>
        <Text style={styles.nome}>{visita.denunciado}</Text>
        {endereco !== "" && <Text style={styles.detalhe}>{endereco}</Text>}
      </View>

      {/* o back conclui a visita na última assinatura, antes de o store ser limpo */}
      {salvaNoAparelho && visita.status === "em_andamento" && (
        <View style={styles.linhaAparelho}>
          <BolinhaPulsante cor={cores.avisoForte} />
          <Text style={styles.aparelhoTexto}>Em andamento, salva no aparelho</Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  cartao: {
    borderRadius: 4,
    borderBottomRightRadius: 18,
    borderColor: cores.bordaClara,
    backgroundColor: cores.branco,
  },
  conteudo: {
    padding: 16,
    gap: 10,
  },
  linhaTopo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  prazo: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    fontVariant: ["tabular-nums"],
    color: cores.textoMedio,
  },
  prazoAtrasado: {
    color: cores.erro,
  },
  textos: {
    gap: 2,
  },
  nome: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    letterSpacing: -0.2,
    color: cores.texto,
  },
  detalhe: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: cores.textoSecundario,
  },
  linhaAparelho: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  aparelhoTexto: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: cores.avisoForte,
  },
});
