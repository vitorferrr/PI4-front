import { View, Text, StyleSheet } from "react-native";
import { Card } from "react-native-paper";
import { formatarData } from "@/lib/formatadores";
import { cores } from "@/theme";
import type { Visita } from "@/types/visita";

type Estado = "feito" | "atual" | "pendente";

const ORDEM = ["agendada", "em_andamento", "documento", "concluida"];

const COR_ESTADO: Record<Estado, string> = {
  feito: cores.graficoVerde,
  atual: cores.etapaAtual,
  pendente: cores.etapaPendente,
};

function quando(dataIso?: string | null) {
  return dataIso ? formatarData(dataIso) : "—";
}

function montarEtapas(visita: Visita) {
  const documento = visita.documentos?.[0];
  const cancelada = visita.status === "cancelada";
  const etapaAtual = visita.status === "em_andamento" && documento ? "documento" : visita.status;
  const indiceAtual = ORDEM.indexOf(etapaAtual);

  function estado(indice: number): Estado {
    if (cancelada) return indice === 0 ? "feito" : "pendente";
    if (visita.status === "concluida" || indice < indiceAtual) return "feito";
    return indice === indiceAtual ? "atual" : "pendente";
  }

  return [
    { rotulo: "Agendada", quando: quando(visita.data_agendada), estado: estado(0) },
    { rotulo: "Em andamento", quando: quando(visita.data_realizacao), estado: estado(1) },
    {
      rotulo: "Documento gerado",
      quando: quando(documento?.data_geracao),
      estado: estado(2),
    },
    {
      rotulo: cancelada ? "Cancelada" : "Concluída",
      quando: visita.status === "concluida" ? quando(visita.updatedAt) : "—",
      estado: cancelada ? "atual" : estado(3),
    },
  ];
}

export function AndamentoVisita({ visita }: { visita: Visita }) {
  const etapas = montarEtapas(visita);

  return (
    <Card mode="outlined" style={styles.cartao} contentStyle={styles.etapas}>
      {etapas.map((etapa, indice) => (
        <View key={etapa.rotulo} style={styles.etapa}>
          <View style={styles.linha}>
            <View style={[styles.bolinha, { backgroundColor: COR_ESTADO[etapa.estado] }]} />
            {indice < etapas.length - 1 && (
              <View
                style={[
                  styles.traco,
                  { backgroundColor: COR_ESTADO[etapa.estado === "feito" ? "feito" : "pendente"] },
                ]}
              />
            )}
          </View>
          <Text style={[styles.rotulo, etapa.estado === "atual" && styles.rotuloAtual]}>
            {etapa.rotulo}
          </Text>
          <Text style={styles.quando}>{etapa.quando}</Text>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  cartao: {
    borderRadius: 16,
    backgroundColor: cores.branco,
  },
  etapas: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 16,
    padding: 20,
  },
  etapa: {
    flexGrow: 1,
    flexBasis: 160,
    paddingRight: 8,
  },
  linha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bolinha: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  traco: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  rotulo: {
    marginTop: 6,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: cores.texto,
  },
  rotuloAtual: {
    color: cores.aviso,
  },
  quando: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: cores.textoSecundario,
  },
});
