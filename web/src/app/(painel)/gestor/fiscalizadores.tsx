import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  type DimensionValue,
} from "react-native";
import { router } from "expo-router";
import { TextInput } from "react-native-paper";
import { useQuery } from "@tanstack/react-query";
import { Avatar, BotaoPrimario, Cartao, ErroCarga, Mensagem, PageHeader } from "@/components/ui";
import { buscarUsuarios, buscarVisitas } from "@/lib/consultas";
import { statusDoErro } from "@/lib/erros";
import {
  calcularCargas,
  CARGA_VAZIA,
  corDaCarga,
  iniciais,
  larguraDaCarga,
  normalizarPesquisa,
} from "@/lib/visitas";
import { cores } from "@/theme";

const ESPACO_CARTOES = 16;

// Quantos cartões por linha, pela largura da janela (o md:grid-cols-2 xl:grid-cols-3 do Tailwind)
function colunasPorLargura(largura: number) {
  if (largura >= 1280) return 3;
  if (largura >= 768) return 2;
  return 1;
}

function Legenda({ cor, rotulo }: { cor: string; rotulo: string }) {
  return (
    <View style={styles.legenda}>
      <View style={[styles.legendaCor, { backgroundColor: cor }]} />
      <Text style={styles.legendaTexto}>{rotulo}</Text>
    </View>
  );
}

function Stat({ valor, rotulo, destaque }: { valor: number; rotulo: string; destaque?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValor, destaque && styles.statDestaque]}>{valor}</Text>
      <Text style={styles.statRotulo}>{rotulo}</Text>
    </View>
  );
}

export default function GestorFiscalizadoresScreen() {
  const [busca, setBusca] = useState("");
  const { width } = useWindowDimensions();
  // largura da área dos cartões, medida pelo onLayout
  const [larguraArea, setLarguraArea] = useState(0);
  const colunas = colunasPorLargura(width);
  const larguraCartao = (larguraArea - ESPACO_CARTOES * (colunas - 1)) / colunas;

  const usuariosQuery = useQuery({
    queryKey: ["usuarios"],
    queryFn: ({ signal }) => buscarUsuarios(signal),
  });
  const visitasQuery = useQuery({
    queryKey: ["visitas"],
    queryFn: ({ signal }) => buscarVisitas(signal),
  });

  const fiscalizadores = (usuariosQuery.data ?? []).filter(
    (usuario) => usuario.role === "fiscalizador"
  );
  const cargas = calcularCargas(visitasQuery.data ?? []);
  const termo = normalizarPesquisa(busca);
  const lista = fiscalizadores.filter((fiscal) =>
    normalizarPesquisa(`${fiscal.nome} ${fiscal.matricula ?? ""}`).includes(termo)
  );

  return (
    <View>
      <PageHeader
        eyebrow={
          usuariosQuery.data
            ? `${fiscalizadores.length} ${fiscalizadores.length === 1 ? "fiscalizador" : "fiscalizadores"}`
            : "Equipe"
        }
        title="Sua equipe em campo"
        actions={
          <>
            <TextInput
              mode="outlined"
              dense
              value={busca}
              onChangeText={setBusca}
              placeholder="Buscar fiscalizador"
              accessibilityLabel="Buscar fiscalizador"
              left={<TextInput.Icon icon="magnify" color={cores.textoSecundario} />}
              outlineColor={cores.bordaCampo}
              outlineStyle={styles.buscaBorda}
              style={styles.busca}
              placeholderTextColor="#757575"
            />
            <BotaoPrimario icon="plus" onPress={() => router.push("/gestor/visitas/nova")}>
              Atribuir visita
            </BotaoPrimario>
          </>
        }
      />

      <View style={styles.legendas}>
        <Legenda cor={corDaCarga(0)} rotulo="Carga leve (até 3 abertas)" />
        <Legenda cor={corDaCarga(4)} rotulo="Carga normal (4–5)" />
        <Legenda cor={corDaCarga(6)} rotulo="Sobrecarga (6+)" />
      </View>

      {visitasQuery.isError ? (
        <View style={styles.erro}>
          <ErroCarga
            mensagem="Não foi possível carregar as visitas; a carga de cada fiscal pode estar incompleta."
            onTentar={() => visitasQuery.refetch()}
            tentando={visitasQuery.isFetching}
          />
        </View>
      ) : null}

      {usuariosQuery.isPending ? (
        <Mensagem>Carregando fiscalizadores...</Mensagem>
      ) : usuariosQuery.isError ? (
        <View style={styles.erro}>
          <ErroCarga
            mensagem={
              statusDoErro(usuariosQuery.error) === 403
                ? "Você não tem permissão para consultar a equipe."
                : "Erro ao carregar fiscalizadores."
            }
            onTentar={() => usuariosQuery.refetch()}
            tentando={usuariosQuery.isFetching}
          />
        </View>
      ) : fiscalizadores.length === 0 ? (
        <Mensagem>Nenhum fiscalizador cadastrado.</Mensagem>
      ) : lista.length === 0 ? (
        <Mensagem>Nenhum fiscalizador encontrado.</Mensagem>
      ) : (
        <View
          style={styles.grade}
          aria-label="Fiscalizadores"
          onLayout={(evento) => setLarguraArea(evento.nativeEvent.layout.width)}
        >
          {larguraArea > 0
            ? lista.map((fiscal) => {
                const carga = cargas.get(fiscal.id) ?? CARGA_VAZIA;
                const primeiroNome = fiscal.nome.trim().split(/\s+/)[0];
                return (
                  <Cartao key={fiscal.id} style={[styles.cartao, { width: larguraCartao }]}>
                    <View style={styles.pessoa}>
                      <Avatar iniciais={iniciais(fiscal.nome)} size={48} />
                      <View style={styles.pessoaTextos}>
                        <Text style={styles.nome} numberOfLines={1}>
                          {fiscal.nome}
                        </Text>
                        <Text style={styles.detalhe} numberOfLines={1}>
                          {fiscal.matricula?.trim() ? `Mat. ${fiscal.matricula}` : "Sem matrícula"}{" "}
                          · {fiscal.email}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.abertas}>
                      <Text style={styles.abertasRotulo}>Visitas abertas</Text>
                      <Text style={styles.abertasValor}>{carga.abertas}</Text>
                    </View>
                    <View style={styles.trilha}>
                      <View
                        style={[
                          styles.barra,
                          {
                            backgroundColor: corDaCarga(carga.abertas),
                            // larguraDaCarga devolve um texto em % (ex.: "50%"), que o RN aceita
                            width: larguraDaCarga(carga.abertas) as DimensionValue,
                          },
                        ]}
                      />
                    </View>

                    <View style={styles.stats}>
                      <Stat valor={carga.vencemHoje} rotulo="para hoje" />
                      <Stat
                        valor={carga.atrasadas}
                        rotulo="atrasadas"
                        destaque={carga.atrasadas > 0}
                      />
                      <Stat valor={carga.noMes} rotulo="concluídas no mês" />
                    </View>

                    <Pressable
                      onPress={() =>
                        router.push({
                          pathname: "/gestor/visitas/nova",
                          params: { fiscal: String(fiscal.id) },
                        })
                      }
                      accessibilityRole="link"
                      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                        styles.atribuir,
                        (pressed || hovered) && styles.atribuirAtivo,
                      ]}
                    >
                      <Text style={styles.atribuirTexto}>Atribuir a {primeiroNome}</Text>
                    </Pressable>
                  </Cartao>
                );
              })
            : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  busca: {
    width: 240,
    height: 44,
    backgroundColor: cores.branco,
    fontSize: 14,
  },
  buscaBorda: {
    borderRadius: 12,
  },
  legendas: {
    marginTop: 24,
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
  erro: {
    marginTop: 16,
  },
  grade: {
    marginTop: 24,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ESPACO_CARTOES,
  },
  cartao: {
    padding: 23,
  },
  pessoa: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pessoaTextos: {
    flex: 1,
    minWidth: 0,
  },
  nome: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: cores.texto,
  },
  detalhe: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: cores.textoSecundario,
  },
  abertas: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  abertasRotulo: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: cores.textoMedio,
  },
  abertasValor: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: cores.texto,
  },
  trilha: {
    marginTop: 8,
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: cores.trilha,
  },
  barra: {
    height: 10,
    borderRadius: 999,
  },
  stats: {
    marginTop: 16,
    flexDirection: "row",
    gap: 8,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: cores.fundo,
  },
  statValor: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: cores.texto,
  },
  statDestaque: {
    color: cores.erroForte,
  },
  statRotulo: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    textAlign: "center",
    color: cores.textoSecundario,
  },
  atribuir: {
    marginTop: 16,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  atribuirAtivo: {
    backgroundColor: cores.selecionado,
  },
  atribuirTexto: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: cores.azul,
  },
});
