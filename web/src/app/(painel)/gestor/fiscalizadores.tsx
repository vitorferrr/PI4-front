import { useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import { ActivityIndicator, Button } from "react-native-paper";
import { useFiscalizadores } from "@/hooks/use-usuarios";
import { useVisitas } from "@/hooks/use-visitas";
import { normalizarPesquisa, plural } from "@/lib/formatadores";
import { calcularCargas, CARGA_VAZIA, corDaCarga } from "@/lib/visitas";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { Campo } from "@/components/Campo";
import { CartaoFiscal } from "@/components/CartaoFiscal";
import { Grade } from "@/components/Grade";
import { Mensagem } from "@/components/Mensagem";
import { MensagemErro } from "@/components/MensagemErro";
import { cores } from "@/theme";

const LEGENDA = [
  { abertas: 0, rotulo: "Carga leve (até 3 abertas)" },
  { abertas: 4, rotulo: "Carga normal (4–5)" },
  { abertas: 6, rotulo: "Sobrecarga (6+)" },
];

export default function FiscalizadoresScreen() {
  const [busca, setBusca] = useState("");
  const { fiscalizadores, isPending, isError, error, refetch, isFetching } = useFiscalizadores();
  const { data: visitas } = useVisitas();

  const cargas = useMemo(() => calcularCargas(visitas ?? []), [visitas]);
  const termo = normalizarPesquisa(busca);
  const lista = fiscalizadores.filter((fiscal) =>
    normalizarPesquisa(`${fiscal.nome} ${fiscal.matricula ?? ""}`).includes(termo)
  );

  return (
    <View style={styles.pagina}>
      <CabecalhoPagina
        sobretitulo={plural(fiscalizadores.length, "fiscalizador", "fiscalizadores")}
        titulo="Sua equipe em campo"
        acoes={
          <>
            <Campo
              value={busca}
              onChangeText={setBusca}
              placeholder="Buscar fiscalizador"
              icone="magnify"
              style={styles.busca}
            />
            <Button
              mode="contained"
              icon="plus"
              onPress={() => router.push("/gestor/visitas/nova")}
            >
              Atribuir visita
            </Button>
          </>
        }
      />

      <View style={styles.legendas}>
        {LEGENDA.map((item) => (
          <View key={item.rotulo} style={styles.legenda}>
            <View style={[styles.legendaCor, { backgroundColor: corDaCarga(item.abertas) }]} />
            <Text style={styles.legendaTexto}>{item.rotulo}</Text>
          </View>
        ))}
      </View>

      {isPending ? (
        <ActivityIndicator size="large" style={styles.carregando} />
      ) : isError ? (
        <MensagemErro erro={error} onTentar={() => refetch()} tentando={isFetching} />
      ) : lista.length === 0 ? (
        <Mensagem>Nenhum fiscalizador encontrado.</Mensagem>
      ) : (
        <Grade>
          {lista.map((fiscal) => (
            <CartaoFiscal
              key={fiscal.id}
              fiscal={fiscal}
              carga={cargas.get(fiscal.id) ?? CARGA_VAZIA}
            />
          ))}
        </Grade>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pagina: {
    gap: 24,
  },
  busca: {
    width: 240,
  },
  legendas: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 24,
  },
  legenda: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendaCor: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendaTexto: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: cores.textoMedio,
  },
  carregando: {
    marginTop: 40,
  },
});
