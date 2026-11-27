import { View, Text, ScrollView, StyleSheet } from "react-native";
import { router, useGlobalSearchParams, usePathname } from "expo-router";
import { Button, DataTable } from "react-native-paper";
import { formatarData } from "@/lib/formatadores";
import {
  detalheEstabelecimento,
  estaAtrasada,
  nomeEstabelecimento,
  nomesFiscalizadores,
} from "@/lib/visitas";
import { Mensagem } from "@/components/Mensagem";
import { SeloStatus } from "@/components/SeloStatus";
import { cores } from "@/theme";
import type { Visita } from "@/types/visita";

function enderecoComFiltros(caminho: string, params: Record<string, unknown>) {
  const filtros = Object.entries(params).filter(([, valor]) => typeof valor === "string" && valor);
  const busca = new URLSearchParams(filtros as [string, string][]).toString();
  return busca ? `${caminho}?${busca}` : caminho;
}

export function TabelaVisitas({ visitas }: { visitas: Visita[] }) {
  const caminho = usePathname();
  const params = useGlobalSearchParams();

  function abrir(visita: Visita) {
    router.push({
      pathname: "/gestor/visitas/[id]",
      params: { id: visita.id, voltarPara: enderecoComFiltros(caminho, params) },
    });
  }

  return (
    <ScrollView horizontal contentContainerStyle={styles.rolagem}>
      <DataTable style={styles.tabela}>
        <DataTable.Header style={styles.cabecalho}>
          <DataTable.Title style={styles.colunaEstabelecimento}>Estabelecimento</DataTable.Title>
          <DataTable.Title>Gestor</DataTable.Title>
          <DataTable.Title style={styles.colunaLarga}>Fiscalizador</DataTable.Title>
          <DataTable.Title style={styles.colunaLarga}>Data agendada</DataTable.Title>
          <DataTable.Title>Status</DataTable.Title>
          <DataTable.Title numeric>Ações</DataTable.Title>
        </DataTable.Header>

        {visitas.map((visita, indice) => {
          const atrasada = estaAtrasada(visita);
          const detalhe = detalheEstabelecimento(visita);
          return (
            <View key={visita.id}>
              <DataTable.Row style={styles.linha} onPress={() => abrir(visita)}>
                <DataTable.Cell style={styles.colunaEstabelecimento}>
                  <View>
                    <Text style={styles.nome}>{nomeEstabelecimento(visita)}</Text>
                    <Text style={styles.detalhe} numberOfLines={1}>
                      nº {visita.id}
                      {detalhe && `, ${detalhe}`}
                    </Text>
                  </View>
                </DataTable.Cell>
                <DataTable.Cell>{visita.gestor?.nome ?? "Não informado"}</DataTable.Cell>
                <DataTable.Cell style={styles.colunaLarga}>
                  {nomesFiscalizadores(visita)}
                </DataTable.Cell>
                <DataTable.Cell style={styles.colunaLarga}>
                  <Text style={[styles.data, atrasada && styles.dataAtrasada]}>
                    {formatarData(visita.data_agendada)}
                    {atrasada && " (atrasada)"}
                  </Text>
                </DataTable.Cell>
                <DataTable.Cell>
                  <SeloStatus status={visita.status} />
                </DataTable.Cell>
                <DataTable.Cell numeric>
                  <Button compact onPress={() => abrir(visita)}>
                    Abrir
                  </Button>
                </DataTable.Cell>
              </DataTable.Row>
            </View>
          );
        })}

        {visitas.length === 0 && <Mensagem>Nenhuma visita corresponde aos filtros.</Mensagem>}
      </DataTable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  rolagem: {
    flexGrow: 1,
  },
  tabela: {
    minWidth: 980,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: cores.bordaClara,
    overflow: "hidden",
    backgroundColor: cores.branco,
  },
  cabecalho: {
    backgroundColor: cores.fundoTabela,
  },
  linha: {
    minHeight: 64,
    borderBottomColor: cores.linhaTabela,
  },
  colunaEstabelecimento: {
    flex: 2.4,
  },
  colunaLarga: {
    flex: 1.6,
  },
  nome: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: cores.texto,
  },
  detalhe: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: cores.textoSecundario,
  },
  data: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: cores.texto,
  },
  dataAtrasada: {
    color: cores.erroForte,
  },
});
