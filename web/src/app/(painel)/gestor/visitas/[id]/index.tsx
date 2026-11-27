import { View, Text, Linking, StyleSheet, useWindowDimensions } from "react-native";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { ActivityIndicator, Button } from "react-native-paper";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useVisita } from "@/hooks/use-visita";
import { api } from "@/lib/api";
import { formatarData, textoOuAusente } from "@/lib/formatadores";
import { nomeEstabelecimento, podeAlterarVisita } from "@/lib/visitas";
import { AndamentoVisita } from "@/components/AndamentoVisita";
import { CartaoSecao } from "@/components/CartaoSecao";
import { ConclusaoVisita } from "@/components/ConclusaoVisita";
import { DocumentosVisita } from "@/components/DocumentosVisita";
import { EquipeVisita } from "@/components/EquipeVisita";
import { InfoVisita } from "@/components/InfoVisita";
import { MensagemErro } from "@/components/MensagemErro";
import { RespostasVisita } from "@/components/RespostasVisita";
import { SeloStatus } from "@/components/SeloStatus";
import { cores } from "@/theme";
import type { Visita } from "@/types/visita";

const LARGURA_DUAS_COLUNAS = 1024;

function linkDoMapa({ latitude, longitude }: Visita) {
  if (latitude == null || longitude == null) return null;
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=18/${latitude}/${longitude}`;
}

export default function VisitaDetalheScreen() {
  const { id, voltarPara } = useLocalSearchParams<{ id: string; voltarPara?: string }>();
  const { width } = useWindowDimensions();
  const queryClient = useQueryClient();
  const { data: visita, isPending, isError, error, refetch, isFetching } = useVisita(id);

  const excluirMutation = useMutation({
    mutationFn: () => api.delete(`/visitas/${id}`),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["visita", id] });
      queryClient.invalidateQueries({ queryKey: ["visitas"] });
      router.navigate("/gestor/visitas");
    },
  });

  function voltar() {
    router.navigate((voltarPara?.startsWith("/") ? voltarPara : "/") as Href);
  }

  function excluir() {
    if (!visita) return;
    const pergunta = `Excluir a visita a ${nomeEstabelecimento(visita)}? Ela some da lista e do app do fiscal.`;
    if (window.confirm(pergunta)) excluirMutation.mutate();
  }

  if (isPending) return <ActivityIndicator size="large" style={styles.carregando} />;

  if (isError) {
    return (
      <View style={styles.pagina}>
        <Button icon="chevron-left" onPress={voltar} style={styles.voltar} compact>
          Voltar
        </Button>
        <MensagemErro erro={error} onTentar={() => refetch()} tentando={isFetching} />
      </View>
    );
  }

  const mapa = linkDoMapa(visita);
  const fiscal = visita.fiscalizadores?.[0]?.nome;
  const endereco = [visita.endereco, visita.bairro].filter(Boolean).join(", ");
  const alteravel = podeAlterarVisita(visita);

  return (
    <View style={styles.pagina}>
      <View>
        <Button icon="chevron-left" onPress={voltar} style={styles.voltar} compact>
          Voltar
        </Button>
        <View style={styles.topo}>
          <View style={styles.topoTextos}>
            <View style={styles.titulo}>
              <Text style={styles.tituloTexto} accessibilityRole="header">
                {nomeEstabelecimento(visita)}
              </Text>
              <SeloStatus status={visita.status} grande />
            </View>
            <Text style={styles.subtitulo}>
              Visita nº {visita.id}, agendada para {formatarData(visita.data_agendada)}
              {fiscal ? `, com ${fiscal}.` : "."}
            </Text>
          </View>
          {alteravel && (
            <View style={styles.acoes}>
              <Button
                mode="outlined"
                icon="pencil-outline"
                onPress={() =>
                  router.push({
                    pathname: "/gestor/visitas/[id]/editar",
                    params: { id: visita.id },
                  })
                }
              >
                Editar
              </Button>
              <Button
                icon="delete-outline"
                textColor={cores.erroForte}
                onPress={excluir}
                loading={excluirMutation.isPending}
                disabled={excluirMutation.isPending}
              >
                Excluir
              </Button>
            </View>
          )}
        </View>
      </View>

      {excluirMutation.isError && <MensagemErro erro={excluirMutation.error} />}

      <AndamentoVisita visita={visita} />

      <View style={[styles.colunas, width >= LARGURA_DUAS_COLUNAS && styles.colunasLado]}>
        <View style={styles.principal}>
          <CartaoSecao titulo="Estabelecimento">
            <View style={styles.infos}>
              <InfoVisita termo="Denunciado" valor={textoOuAusente(visita.denunciado)} />
              <InfoVisita termo="Razão social" valor={textoOuAusente(visita.razao_social)} />
              <InfoVisita termo="Nome fantasia" valor={textoOuAusente(visita.nome_fantasia)} />
              <InfoVisita termo="CNPJ/CPF" valor={textoOuAusente(visita.cnpj_cpf)} />
              <InfoVisita termo="Atividade" valor={textoOuAusente(visita.atividade)} />
              <InfoVisita termo="Telefone" valor={textoOuAusente(visita.telefone)} />
              <InfoVisita termo="Endereço" valor={textoOuAusente(endereco)} />
              <InfoVisita termo="CEP" valor={textoOuAusente(visita.cep)} />
            </View>
          </CartaoSecao>

          <CartaoSecao titulo="Início da visita">
            <View style={styles.infos}>
              <InfoVisita termo="Data e hora" valor={formatarData(visita.data_realizacao)} />
              <InfoVisita termo="Latitude" valor={textoOuAusente(visita.latitude)} />
              <InfoVisita termo="Longitude" valor={textoOuAusente(visita.longitude)} />
            </View>
            {mapa ? (
              <Button
                icon="map-marker-outline"
                onPress={() => Linking.openURL(mapa)}
                style={styles.voltar}
                compact
              >
                Ver no mapa
              </Button>
            ) : (
              <Text style={styles.textoApagado}>
                A localização é registrada quando o fiscal inicia a visita no app.
              </Text>
            )}
          </CartaoSecao>

          <CartaoSecao titulo="Respostas do questionário">
            <RespostasVisita
              respostas={visita.respostas ?? []}
              observacoes={visita.observacoes_livres}
            />
          </CartaoSecao>
        </View>

        <View style={[styles.lateral, width >= LARGURA_DUAS_COLUNAS && styles.lateralFixa]}>
          <ConclusaoVisita visita={visita} />
          <DocumentosVisita documentos={visita.documentos ?? []} />
          <EquipeVisita visita={visita} editavel={alteravel} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pagina: {
    gap: 20,
  },
  carregando: {
    marginTop: 40,
  },
  voltar: {
    alignSelf: "flex-start",
  },
  topo: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 16,
  },
  topoTextos: {
    flexShrink: 1,
  },
  acoes: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  titulo: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
  },
  tituloTexto: {
    flexShrink: 1,
    fontFamily: "BarlowCondensed_800ExtraBold",
    fontSize: 44,
    lineHeight: 48,
    textTransform: "uppercase",
    color: cores.azulEscuro,
  },
  subtitulo: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: cores.textoMedio,
  },
  colunas: {
    gap: 20,
  },
  colunasLado: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  principal: {
    flex: 1,
    gap: 16,
  },
  lateral: {
    gap: 16,
  },
  lateralFixa: {
    width: 320,
  },
  infos: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  textoApagado: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: cores.textoSecundario,
  },
});
