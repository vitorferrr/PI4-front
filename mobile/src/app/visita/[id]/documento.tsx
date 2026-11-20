import { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatarData, formatarHora } from "@/lib/formatadores";
import { useVisita } from "@/hooks/use-visita";
import { usePerguntasQuestionario, estaRespondida } from "@/hooks/use-perguntas-questionario";
import { useVisitaEmAndamentoStore } from "@/store/visitaEmAndamentoStore";
import { CabecalhoVisita } from "@/components/CabecalhoVisita";
import { SignaturePad } from "@/components/SignaturePad";
import { useSessaoStore } from "@/store/sessaoStore";
import { lerUsuarioIdDoToken } from "@/lib/token";

interface AssinaturaLocal {
  imagem: string;
  assinadoEm: string;
}

function useStoreHidratada() {
  const [hidratada, setHidratada] = useState(() => useVisitaEmAndamentoStore.persist.hasHydrated());

  useEffect(() => {
    if (useVisitaEmAndamentoStore.persist.hasHydrated()) setHidratada(true);
    return useVisitaEmAndamentoStore.persist.onFinishHydration(() => setHidratada(true));
  }, []);

  return hidratada;
}

export default function DocumentoVisitaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const storeHidratada = useStoreHidratada();

  const [rolagemAtiva, setRolagemAtiva] = useState(true);
  const [assinaturaFiscal, setAssinaturaFiscal] = useState<AssinaturaLocal | null>(null);

  const token = useSessaoStore((state) => state.token);
  const visitaIdStore = useVisitaEmAndamentoStore((state) => state.visitaId);
  const respostas = useVisitaEmAndamentoStore((state) => state.respostas);
  const observacoesLivres = useVisitaEmAndamentoStore((state) => state.observacoesLivres);

  const visitaQuery = useVisita(id);
  const perguntasQuery = usePerguntasQuestionario();
  const visita = visitaQuery.data;
  const perguntas = perguntasQuery.data ?? [];

  const titulo = "Revisar e assinar";

  if (!storeHidratada || visitaQuery.isLoading || perguntasQuery.isLoading) {
    return (
      <View style={styles.tela}>
        <Stack.Screen options={{ headerShown: false }} />
        <CabecalhoVisita titulo={titulo} rotuloVoltar="Voltar ao questionário" />
        <View style={styles.centralizado}>
          <ActivityIndicator size="large" color="#1D3F94" />
        </View>
      </View>
    );
  }

  if (visitaQuery.isError || perguntasQuery.isError || !visita) {
    const erro = visitaQuery.error ?? perguntasQuery.error;
    return (
      <View style={styles.tela}>
        <Stack.Screen options={{ headerShown: false }} />
        <CabecalhoVisita titulo={titulo} rotuloVoltar="Voltar ao questionário" />
        <View style={styles.centralizado}>
          <Text style={styles.erro}>{erro?.message ?? "Erro ao carregar visita."}</Text>
          <Pressable
            style={styles.botaoSecundario}
            onPress={() => {
              visitaQuery.refetch();
              perguntasQuery.refetch();
            }}
          >
            <Text style={styles.botaoSecundarioTexto}>Tentar novamente</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (visitaIdStore !== Number(id)) {
    return (
      <View style={styles.tela}>
        <Stack.Screen options={{ headerShown: false }} />
        <CabecalhoVisita
          titulo={titulo}
          subtitulo={visita.denunciado}
          rotuloVoltar="Voltar ao questionário"
        />
        <View style={styles.centralizado}>
          <Text style={styles.mensagem}>
            As respostas desta visita não estão neste aparelho. Preencha o questionário antes de
            revisar o documento.
          </Text>
          <Pressable
            style={styles.botaoPrimario}
            onPress={() => router.replace(`/visita/${id}/questionario`)}
          >
            <Text style={styles.botaoPrimarioTexto}>Ir para o questionário</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const totalRespondidas = perguntas.filter((p) => estaRespondida(respostas[p.id])).length;
  const nomesFiscais = visita.fiscalizadores?.map((f) => f.nome).join(", ") || "Não informado";

  const usuarioId = lerUsuarioIdDoToken(token);
  const fiscalLogado = visita.fiscalizadores?.find((f) => f.id === usuarioId);

  return (
    <View style={styles.tela}>
      <Stack.Screen options={{ headerShown: false }} />
      <CabecalhoVisita
        titulo={titulo}
        subtitulo={visita.denunciado}
        rotuloVoltar="Voltar ao questionário"
      />

      <ScrollView contentContainerStyle={styles.conteudo} scrollEnabled={rolagemAtiva}>
        <View style={styles.previa} accessibilityLabel="Prévia do documento">
          <View style={styles.previaTopo}>
            <View style={styles.previaIcone}>
              <Text style={styles.previaIconeTexto}>✓</Text>
            </View>
            <View>
              <Text style={styles.previaTitulo}>AUTO DE CONSTATAÇÃO</Text>
              <Text style={styles.previaSubtitulo}>Nº atribuído após o envio · Prévia</Text>
            </View>
          </View>

          <Text style={styles.previaTexto}>
            <Text style={styles.negrito}>Estabelecimento:</Text> {visita.denunciado}
          </Text>

          <Text style={styles.previaTexto}>
            <Text style={styles.negrito}>Data e hora:</Text> {formatarData(visita.data_realizacao)}
            {" · "}
            <Text style={styles.negrito}>Fiscal:</Text> {nomesFiscais}
          </Text>

          {observacoesLivres.trim() !== "" && (
            <Text style={styles.previaTexto}>
              <Text style={styles.negrito}>Constatação:</Text> {observacoesLivres}
            </Text>
          )}

          <View style={styles.respostas}>
            <Text style={styles.respostasTitulo}>Questionário</Text>
            {perguntas.map((pergunta, indice) => {
              const valor = respostas[pergunta.id];
              return (
                <View key={pergunta.id} style={styles.itemResposta}>
                  <Text style={[styles.previaTexto, styles.negrito]}>
                    {indice + 1}. {pergunta.texto}
                  </Text>
                  {estaRespondida(valor) ? (
                    <Text style={styles.previaTexto}>{valor}</Text>
                  ) : (
                    <Text style={[styles.previaTexto, styles.semResposta]}>Sem resposta</Text>
                  )}
                </View>
              );
            })}
          </View>

          <Text style={[styles.previaTexto, styles.previaRodape]}>
            {totalRespondidas} de {perguntas.length} perguntas respondidas
          </Text>
        </View>

        <View style={styles.assinaturas}>
          <Text style={styles.assinaturasTitulo}>Assinaturas</Text>

          {!fiscalLogado ? (
            <View style={styles.cartaoAssinado}>
              <Text style={styles.cartaoHora}>
                Só um fiscal atribuído a esta visita pode assinar como fiscal.
              </Text>
            </View>
          ) : assinaturaFiscal ? (
            <View style={styles.cartaoAssinado}>
              <View style={styles.cartaoAssinadoLinha}>
                <View style={styles.checkVerde}>
                  <Text style={styles.checkVerdeTexto}>✓</Text>
                </View>
                <View style={styles.cartaoAssinadoTextos}>
                  <Text style={styles.cartaoNome}>Fiscal · {fiscalLogado.nome}</Text>
                  <Text style={styles.cartaoHora}>
                    Assinado às {formatarHora(assinaturaFiscal.assinadoEm)}
                  </Text>
                </View>
                <Pressable accessibilityRole="button" onPress={() => setAssinaturaFiscal(null)}>
                  <Text style={styles.linkRefazer}>Refazer</Text>
                </Pressable>
              </View>
              <Image
                source={{ uri: assinaturaFiscal.imagem }}
                style={styles.imagemAssinatura}
                resizeMode="contain"
                accessibilityLabel={`Assinatura de ${fiscalLogado.nome}`}
              />
            </View>
          ) : (
            <View style={styles.cartaoAtivo}>
              <Text style={styles.cartaoRotulo}>Fiscal · {fiscalLogado.nome}</Text>
              <SignaturePad
                onInicioDesenho={() => setRolagemAtiva(false)}
                onFimDesenho={() => setRolagemAtiva(true)}
                onConfirmar={(imagem) =>
                  setAssinaturaFiscal({ imagem, assinadoEm: new Date().toISOString() })
                }
              />
            </View>
          )}
        </View>
      </ScrollView>

      <View style={[styles.rodape, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable style={[styles.botaoEnviar, styles.botaoDesabilitado]} disabled>
          <Text style={styles.botaoEnviarTexto}>Encerrar e enviar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: "#F3F7FB",
  },
  centralizado: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  mensagem: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
    color: "#33435A",
    textAlign: "center",
  },
  botaoPrimario: {
    backgroundColor: "#1D3F94",
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  botaoPrimarioTexto: {
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    fontSize: 16,
  },

  conteudo: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 14,
  },

  previa: {
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 14,
    gap: 10,
    shadowColor: "#0A3D7A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 9,
    elevation: 4,
  },
  previaTopo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: "#1D3F94",
  },
  previaIcone: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: "#1D3F94",
    justifyContent: "center",
    alignItems: "center",
  },
  previaIconeTexto: {
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    fontSize: 14,
  },
  previaTitulo: {
    fontFamily: "BarlowCondensed_800ExtraBold",
    fontSize: 14,
    color: "#172F6E",
  },
  previaSubtitulo: {
    fontFamily: "Inter_400Regular",
    fontSize: 10.5,
    color: "#33435A",
  },
  previaTexto: {
    fontFamily: "Inter_400Regular",
    fontSize: 11.5,
    lineHeight: 17,
    color: "#1E2B3D",
  },
  previaRodape: {
    color: "#33435A",
  },
  negrito: {
    fontFamily: "Inter_700Bold",
  },
  respostas: {
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#DCE5EF",
  },
  respostasTitulo: {
    fontFamily: "BarlowCondensed_800ExtraBold",
    fontSize: 13,
    textTransform: "uppercase",
    color: "#172F6E",
  },
  itemResposta: {
    gap: 2,
  },
  semResposta: {
    fontFamily: "Inter_600SemiBold",
    color: "#A12A20",
  },

  assinaturas: {
    gap: 10,
  },
  assinaturasTitulo: {
    fontFamily: "BarlowCondensed_800ExtraBold",
    fontSize: 23,
    textTransform: "uppercase",
    color: "#172F6E",
  },
  cartaoAtivo: {
    gap: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#1D3F94",
  },
  cartaoRotulo: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#0F1E33",
  },
  cartaoAssinado: {
    gap: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE5EF",
  },
  cartaoAssinadoLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  checkVerde: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E2F5EA",
    justifyContent: "center",
    alignItems: "center",
  },
  checkVerdeTexto: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 16,
    color: "#17803F",
  },
  cartaoAssinadoTextos: {
    flex: 1,
  },
  cartaoNome: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: "#0F1E33",
  },
  cartaoHora: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#4A5B73",
  },
  linkRefazer: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: "#1D3F94",
    padding: 8,
  },
  imagemAssinatura: {
    height: 60,
    width: "100%",
  },

  rodape: {
    paddingTop: 14,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#DCE5EF",
    gap: 10,
  },
  botaoEnviar: {
    height: 60,
    borderRadius: 16,
    backgroundColor: "#17803F",
    justifyContent: "center",
    alignItems: "center",
  },
  botaoDesabilitado: {
    opacity: 0.5,
  },
  botaoEnviarTexto: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 18,
    color: "#FFFFFF",
  },

  erro: {
    fontFamily: "Inter_600SemiBold",
    color: "#A12A20",
    textAlign: "center",
    fontSize: 16,
  },
  botaoSecundario: {
    borderWidth: 1.5,
    borderColor: "#1D3F94",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  botaoSecundarioTexto: {
    fontFamily: "Inter_700Bold",
    color: "#1D3F94",
  },
});
