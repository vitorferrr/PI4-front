import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Icon } from "react-native-paper";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  BotaoContorno,
  BotaoPrimario,
  Cartao,
  ErroCarga,
  Mensagem,
  PageHeader,
  TituloCartao,
} from "@/components/ui";
import { STATUS_COR_BARRA } from "@/lib/rotulos";
import { api } from "@/lib/api";
import { buscarVisitas } from "@/lib/consultas";
import { statusDoErro } from "@/lib/erros";
import { baixarArquivo, exportarVisitas } from "@/lib/exportar";
import { useSession } from "@/lib/session";
import { estaAtrasada, STATUS_VISITA, venceHoje } from "@/lib/visitas";
import { cores } from "@/theme";
import type { DadosGerais, Role, StatusVisita, Visita } from "@/types";

const PERFIS_USUARIO: Record<Role, string> = {
  admin: "Administradores",
  gestor: "Gestores",
  fiscalizador: "Fiscalizadores",
};

const formatadorNumero = new Intl.NumberFormat("pt-BR");
const formatadorMes = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });

function ehContagem(valor: unknown) {
  return Number.isInteger(valor) && (valor as number) >= 0;
}

function contagensValidas(objeto: unknown, chaves: string[]) {
  return (
    objeto !== null &&
    typeof objeto === "object" &&
    chaves.every((chave) => ehContagem((objeto as Record<string, unknown>)[chave]))
  );
}

async function buscarDadosGerais(signal?: AbortSignal) {
  const { data } = await api.get<DadosGerais>("/admin/dados-gerais", { signal });
  const valido =
    ehContagem(data?.visitas?.total) &&
    contagensValidas(data.visitas.por_status, Object.keys(STATUS_VISITA)) &&
    ehContagem(data?.usuarios?.total) &&
    contagensValidas(data.usuarios.por_role, Object.keys(PERFIS_USUARIO)) &&
    ehContagem(data?.documentos?.total) &&
    ehContagem(data?.assinaturas?.total);

  if (!valido) {
    throw new Error("Não foi possível interpretar os dados gerais.");
  }
  return data;
}

function saudacao(agora = new Date()) {
  const hora = agora.getHours();
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

function montarIndicadores(dados: DadosGerais) {
  const { visitas, documentos, assinaturas } = dados;
  const { agendada, em_andamento: emAndamento, concluida } = visitas.por_status;

  return [
    {
      titulo: "Visitas cadastradas",
      valor: visitas.total,
      nota: `${formatadorNumero.format(agendada)} agendadas`,
    },
    { titulo: "Em andamento", valor: emAndamento, nota: "Fiscais em campo agora" },
    { titulo: "Concluídas", valor: concluida, nota: "Com documento assinado" },
    {
      titulo: "Documentos gerados",
      valor: documentos.total,
      nota: `${formatadorNumero.format(assinaturas.total)} assinaturas coletadas`,
    },
  ];
}

function BarrasHorizontais({
  itens,
  rotulo,
}: {
  itens: { chave: string; rotulo: string; total: number; cor: string }[];
  rotulo: string;
}) {
  const maior = Math.max(0, ...itens.map((item) => item.total));

  return (
    <View style={styles.barras} accessibilityLabel={rotulo}>
      {itens.map((item) => (
        <View key={item.chave} style={styles.barraLinha}>
          <Text style={styles.barraRotulo}>{item.rotulo}</Text>
          <View style={styles.barraTrilha}>
            <View
              style={[
                styles.barraPreenchida,
                {
                  width: `${maior > 0 ? (item.total / maior) * 100 : 0}%`,
                  backgroundColor: item.cor,
                },
              ]}
            />
          </View>
          <Text style={styles.barraValor}>{formatadorNumero.format(item.total)}</Text>
        </View>
      ))}
    </View>
  );
}

function visitasPorFiscal(visitas: Visita[]) {
  const totais = new Map<number, { nome: string; total: number }>();
  for (const visita of visitas) {
    for (const fiscal of visita.fiscalizadores ?? []) {
      const atual = totais.get(fiscal.id) ?? {
        nome: fiscal.nome?.split(" ")[0] || `#${fiscal.id}`,
        total: 0,
      };
      atual.total += 1;
      totais.set(fiscal.id, atual);
    }
  }
  return [...totais.values()].sort((a, b) => b.total - a.total).slice(0, 8);
}

const ALTURA_MAXIMA_COLUNA = 171;

function ColunasPorFiscal({ visitas }: { visitas: Visita[] }) {
  const colunas = visitasPorFiscal(visitas);
  if (colunas.length === 0) {
    return (
      <Text style={styles.textoApagado}>Nenhuma visita atribuída a fiscalizadores ainda.</Text>
    );
  }
  const maior = Math.max(...colunas.map((coluna) => coluna.total));

  return (
    <View accessibilityLabel="Visitas por fiscalizador">
      <View style={styles.colunas}>
        {colunas.map((coluna, indice) => (
          <View key={indice} style={styles.coluna}>
            <Text style={styles.colunaValor}>{coluna.total}</Text>
            <View
              style={[
                styles.colunaBarra,
                { height: (coluna.total / maior) * ALTURA_MAXIMA_COLUNA },
              ]}
            />
          </View>
        ))}
      </View>
      <View style={styles.colunasNomes}>
        {colunas.map((coluna, indice) => (
          <Text key={indice} style={styles.colunaNome} numberOfLines={1}>
            {coluna.nome}
          </Text>
        ))}
      </View>
    </View>
  );
}

// Um aviso clicável: ícone num círculo colorido, título, explicação e "Ver" à direita
function Aviso({
  icone,
  corIcone,
  fundoIcone,
  titulo,
  descricao,
  onPress,
}: {
  icone: string;
  corIcone: string;
  fundoIcone: string;
  titulo: string;
  descricao: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`${titulo}. ${descricao}`}
      style={({ pressed }) => [styles.aviso, pressed && styles.avisoPressionado]}
    >
      <View style={[styles.avisoIcone, { backgroundColor: fundoIcone }]}>
        <Icon source={icone} size={22} color={corIcone} />
      </View>
      <View style={styles.avisoTextos}>
        <Text style={styles.avisoTitulo}>{titulo}</Text>
        <Text style={styles.avisoDescricao}>{descricao}</Text>
      </View>
      <View style={styles.avisoVer}>
        <Text style={styles.avisoVerTexto}>Ver</Text>
        <Icon source="chevron-right" size={20} color={cores.azul} />
      </View>
    </Pressable>
  );
}

function Alertas({ visitas }: { visitas: Visita[] }) {
  const atrasadas = visitas.filter((visita) => estaAtrasada(visita)).length;
  const hoje = visitas.filter((visita) => venceHoje(visita)).length;
  const emCampo = visitas.filter((visita) => visita.status === "em_andamento").length;
  if (atrasadas === 0 && hoje === 0 && emCampo === 0) return null;

  return (
    <View style={styles.alertas} accessibilityLabel="Alertas">
      {atrasadas > 0 || hoje > 0 ? (
        <Aviso
          icone="clock-alert-outline"
          corIcone={cores.erroForte}
          fundoIcone={cores.erroFundo}
          titulo={`${atrasadas} ${atrasadas === 1 ? "visita atrasada" : "visitas atrasadas"}`}
          descricao={`${hoje} ${hoje === 1 ? "agendada" : "agendadas"} para hoje`}
          onPress={() =>
            router.push({ pathname: "/admin/visitas", params: { status: "agendada" } })
          }
        />
      ) : null}
      {emCampo > 0 ? (
        <Aviso
          icone="progress-clock"
          corIcone={cores.aviso}
          fundoIcone={cores.avisoFundo}
          titulo={`${emCampo} ${emCampo === 1 ? "visita em andamento" : "visitas em andamento"}`}
          descricao={`${emCampo === 1 ? "Aguarda" : "Aguardam"} assinaturas e conclusão`}
          onPress={() =>
            router.push({ pathname: "/admin/visitas", params: { status: "em_andamento" } })
          }
        />
      ) : null}
    </View>
  );
}

export default function AdminDashboard() {
  const nome = useSession((state) => state.usuario?.nome);
  const dadosQuery = useQuery({
    queryKey: ["admin", "dados-gerais"],
    queryFn: ({ signal }) => buscarDadosGerais(signal),
  });
  const visitasQuery = useQuery({
    queryKey: ["visitas"],
    queryFn: ({ signal }) => buscarVisitas(signal),
  });
  const exportarMutation = useMutation({
    mutationFn: () => exportarVisitas(),
    onSuccess: ({ arquivo }) => baixarArquivo(arquivo, "visitas.csv"),
  });
  const dados = dadosQuery.data;
  const primeiroNome = nome?.trim().split(/\s+/)[0];
  const mes = formatadorMes.format(new Date());

  return (
    <View style={styles.pagina}>
      <PageHeader
        eyebrow={`Painel administrativo · ${mes.charAt(0).toUpperCase()}${mes.slice(1)}`}
        title={primeiroNome ? `${saudacao()}, ${primeiroNome}` : "Painel administrativo"}
        actions={
          <>
            <BotaoContorno
              onPress={() => exportarMutation.mutate()}
              disabled={exportarMutation.isPending}
            >
              {exportarMutation.isPending ? "Exportando…" : "Exportar CSV"}
            </BotaoContorno>
            <BotaoPrimario icon="plus" onPress={() => router.push("/gestor/visitas/nova")}>
              Nova visita
            </BotaoPrimario>
          </>
        }
      />

      {exportarMutation.isError ? (
        <ErroCarga
          mensagem={
            statusDoErro(exportarMutation.error) === 403
              ? "Você não tem permissão para exportar as visitas."
              : "Não foi possível exportar as visitas. Tente novamente."
          }
        />
      ) : null}

      {visitasQuery.data ? <Alertas visitas={visitasQuery.data} /> : null}

      {dadosQuery.isPending ? (
        <Mensagem>
          {dadosQuery.fetchStatus === "paused"
            ? "Aguardando conexão para carregar o painel…"
            : "Carregando painel…"}
        </Mensagem>
      ) : dadosQuery.isError || !dados ? (
        <ErroCarga
          mensagem={
            statusDoErro(dadosQuery.error) === 403
              ? "Você não tem permissão para consultar os dados gerais."
              : "Não foi possível carregar o painel. Verifique sua conexão e tente novamente."
          }
          onTentar={() => dadosQuery.refetch()}
          tentando={dadosQuery.isFetching}
        />
      ) : (
        <>
          <View style={styles.grade} accessibilityLabel="Indicadores gerais">
            {montarIndicadores(dados).map((indicador) => (
              <Cartao key={indicador.titulo} style={styles.indicador}>
                <Text style={styles.indicadorTitulo}>{indicador.titulo}</Text>
                <Text style={styles.indicadorValor}>
                  {formatadorNumero.format(indicador.valor)}
                </Text>
                <Text style={styles.indicadorNota}>{indicador.nota}</Text>
              </Cartao>
            ))}
          </View>

          <View style={styles.grade}>
            <Cartao style={styles.grafico}>
              <TituloCartao>Visitas por status</TituloCartao>
              <BarrasHorizontais
                rotulo="Quantidade de visitas por status"
                itens={(Object.entries(STATUS_VISITA) as [StatusVisita, string][]).map(
                  ([chave, rotulo]) => ({
                    chave,
                    rotulo,
                    total: dados.visitas.por_status[chave],
                    cor: STATUS_COR_BARRA[chave],
                  })
                )}
              />
            </Cartao>

            <Cartao style={styles.grafico}>
              <TituloCartao>Visitas por fiscalizador</TituloCartao>
              {visitasQuery.isPending ? (
                <Text style={styles.textoApagado}>Carregando visitas…</Text>
              ) : visitasQuery.isError ? (
                <Text style={styles.textoErro}>Não foi possível carregar as visitas.</Text>
              ) : (
                <ColunasPorFiscal visitas={visitasQuery.data} />
              )}
            </Cartao>

            <Cartao style={[styles.grafico, styles.graficoLargo]}>
              <TituloCartao>Usuários por perfil</TituloCartao>
              <BarrasHorizontais
                rotulo="Quantidade de usuários por perfil"
                itens={(Object.entries(PERFIS_USUARIO) as [Role, string][]).map(
                  ([chave, rotulo]) => ({
                    chave,
                    rotulo,
                    total: dados.usuarios.por_role[chave],
                    cor: "#6A4FC9",
                  })
                )}
              />
              <Text style={styles.textoApagado}>
                {formatadorNumero.format(dados.usuarios.total)} usuários cadastrados no total.
              </Text>
            </Cartao>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pagina: {
    gap: 28,
  },
  // flexWrap + flexBasis fazem o papel do grid responsivo do Tailwind: cada cartão tem uma
  // largura mínima e, quando não cabe, desce para a linha de baixo
  grade: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  indicador: {
    flexGrow: 1,
    flexBasis: 230,
    padding: 20,
  },
  indicadorTitulo: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: cores.textoSecundario,
  },
  indicadorValor: {
    marginTop: 8,
    fontFamily: "BarlowCondensed_800ExtraBold",
    fontSize: 34,
    lineHeight: 36,
    color: cores.azulEscuro,
  },
  indicadorNota: {
    marginTop: 12,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: cores.textoMedio,
  },
  grafico: {
    flexGrow: 1,
    flexBasis: 420,
    padding: 24,
    gap: 16,
  },
  graficoLargo: {
    flexBasis: "100%",
  },
  barras: {
    gap: 19,
  },
  barraLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
  },
  barraRotulo: {
    width: 118,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: cores.textoMedio,
  },
  barraTrilha: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: cores.trilha,
  },
  barraPreenchida: {
    height: 12,
    borderRadius: 6,
  },
  barraValor: {
    width: 36,
    textAlign: "right",
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: cores.texto,
  },
  colunas: {
    height: 229,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    gap: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: cores.bordaClara,
  },
  coluna: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  colunaValor: {
    marginBottom: 6,
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: cores.texto,
  },
  colunaBarra: {
    width: "100%",
    maxWidth: 64,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: "#1677D2",
  },
  colunasNomes: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-around",
    gap: 16,
    paddingHorizontal: 12,
  },
  colunaNome: {
    flex: 1,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: cores.textoSecundario,
  },
  alertas: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  aviso: {
    flexGrow: 1,
    flexBasis: 380,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: cores.bordaClara,
    backgroundColor: cores.branco,
  },
  avisoPressionado: {
    backgroundColor: cores.selecionado,
  },
  avisoIcone: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  avisoTextos: {
    flex: 1,
    gap: 2,
  },
  avisoTitulo: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: cores.texto,
  },
  avisoDescricao: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: cores.textoSecundario,
  },
  avisoVer: {
    flexDirection: "row",
    alignItems: "center",
  },
  avisoVerTexto: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: cores.azul,
  },
  textoApagado: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: cores.textoSecundario,
  },
  textoErro: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: cores.erro,
  },
});
