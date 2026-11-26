import type { ReactNode } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { router, useGlobalSearchParams, usePathname } from "expo-router";
import { Cartao, StatusBadge } from "@/components/ui";
import {
  detalheEstabelecimento,
  estaAtrasada,
  formatarDataVisita,
  nomeEstabelecimento,
  nomesFiscalizadores,
} from "@/lib/visitas";
import { cores } from "@/theme";
import type { Visita } from "@/types";

// Rótulo em cima de cada filtro (o <label> do HTML)
export function Filtro({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <View style={styles.filtro}>
      <Text style={styles.filtroRotulo}>{rotulo}</Text>
      {children}
    </View>
  );
}

const COLUNAS = [
  { titulo: "Estabelecimento", flex: 2.6 },
  { titulo: "Gestor", flex: 1.4 },
  { titulo: "Fiscalizador", flex: 1.8 },
  { titulo: "Data agendada", flex: 1.7 },
  { titulo: "Status", flex: 1.3 },
  { titulo: "Ações", flex: 0.8, direita: true },
];

// Endereço atual com os filtros (?status=...), para o detalhe saber para onde voltar
function enderecoAtual(caminho: string, params: Record<string, string | string[] | undefined>) {
  const busca = new URLSearchParams();
  for (const [chave, valor] of Object.entries(params)) {
    if (typeof valor === "string" && valor) busca.set(chave, valor);
  }
  const texto = busca.toString();
  return texto ? `${caminho}?${texto}` : caminho;
}

export default function TabelaVisitas({
  visitas,
  rotuloVoltar,
  carregando,
}: {
  visitas: Visita[];
  rotuloVoltar: string;
  carregando?: boolean;
}) {
  const caminho = usePathname();
  const params = useGlobalSearchParams();

  function abrir(visita: Visita) {
    // no lugar do "state" do react-router, o destino de volta vai como parâmetro da rota
    router.push({
      pathname: "/gestor/visitas/[id]",
      params: {
        id: String(visita.id),
        voltarPara: enderecoAtual(caminho, params),
        rotuloVoltar,
      },
    });
  }

  return (
    <Cartao style={styles.cartao}>
      <ScrollView horizontal contentContainerStyle={styles.rolagem}>
        <View style={styles.tabela} aria-label="Tabela de visitas" aria-busy={carregando}>
          <View style={[styles.linha, styles.linhaCabecalho]}>
            {COLUNAS.map((coluna) => (
              <Text
                key={coluna.titulo}
                style={[
                  styles.celula,
                  styles.cabecalhoTexto,
                  { flex: coluna.flex },
                  coluna.direita && styles.direita,
                ]}
              >
                {coluna.titulo}
              </Text>
            ))}
          </View>

          {visitas.map((visita) => {
            const atrasada = estaAtrasada(visita);
            const detalhe = detalheEstabelecimento(visita);
            return (
              <View key={visita.id} style={[styles.linha, styles.linhaDados]}>
                <View style={[styles.celula, { flex: COLUNAS[0].flex }]}>
                  <Text style={styles.estabelecimento}>{nomeEstabelecimento(visita)}</Text>
                  <Text style={styles.detalhe} numberOfLines={1}>
                    #{visita.id}
                    {detalhe ? ` · ${detalhe}` : ""}
                  </Text>
                </View>
                <Text style={[styles.celula, styles.textoMedio, { flex: COLUNAS[1].flex }]}>
                  {visita.gestor?.nome || "Gestor não informado"}
                </Text>
                <Text style={[styles.celula, styles.texto, { flex: COLUNAS[2].flex }]}>
                  {nomesFiscalizadores(visita)}
                </Text>
                <Text
                  style={[
                    styles.celula,
                    styles.data,
                    atrasada && styles.dataAtrasada,
                    { flex: COLUNAS[3].flex },
                  ]}
                >
                  {formatarDataVisita(visita.data_agendada)}
                  {atrasada ? " · atrasada" : ""}
                </Text>
                <View style={[styles.celula, { flex: COLUNAS[4].flex }]}>
                  <StatusBadge status={visita.status} />
                </View>
                <View style={[styles.celula, styles.acoes, { flex: COLUNAS[5].flex }]}>
                  <Pressable
                    onPress={() => abrir(visita)}
                    accessibilityRole="link"
                    accessibilityLabel={`Ver detalhes da visita ${visita.id}: ${visita.denunciado}`}
                  >
                    <Text style={styles.link}>Abrir</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </Cartao>
  );
}

const styles = StyleSheet.create({
  filtro: {
    flexGrow: 1,
    flexBasis: 220,
    gap: 6,
  },
  filtroRotulo: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: cores.texto,
  },
  cartao: {
    marginTop: 24,
    overflow: "hidden",
  },
  rolagem: {
    flexGrow: 1,
  },
  tabela: {
    flex: 1,
    minWidth: 980,
  },
  linha: {
    flexDirection: "row",
    alignItems: "center",
  },
  linhaCabecalho: {
    backgroundColor: cores.fundoTabela,
  },
  linhaDados: {
    borderTopWidth: 1,
    borderTopColor: cores.linhaTabela,
  },
  celula: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  cabecalhoTexto: {
    paddingVertical: 14,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: cores.textoSecundario,
  },
  direita: {
    textAlign: "right",
  },
  estabelecimento: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: cores.texto,
  },
  detalhe: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: cores.textoSecundario,
  },
  texto: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: cores.texto,
  },
  textoMedio: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: cores.textoMedio,
  },
  data: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: cores.texto,
  },
  dataAtrasada: {
    color: cores.erroForte,
  },
  acoes: {
    alignItems: "flex-end",
  },
  link: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: cores.azul,
    textDecorationLine: "underline",
  },
});
