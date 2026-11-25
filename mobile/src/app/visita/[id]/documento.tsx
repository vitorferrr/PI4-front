import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiFetch, ApiError, SessaoExpiradaError } from "@/lib/api";
import { formatarData } from "@/lib/formatadores";
import { salvarImagemAssinatura } from "@/lib/arquivosAssinatura";
import { useVisita } from "@/hooks/use-visita";
import { usePerguntasQuestionario, estaRespondida } from "@/hooks/use-perguntas-questionario";
import { useVisitaEmAndamentoStore, type TipoAssinante } from "@/store/visitaEmAndamentoStore";
import { CabecalhoVisita } from "@/components/CabecalhoVisita";
import { CartaoAssinante } from "@/components/CartaoAssinante";
import { useSessaoStore } from "@/store/sessaoStore";
import type { VisitaDetalhe } from "@/types/visita";

const TOTAL_ASSINANTES = 2;

interface DocumentoCriado {
  id: number;
}

interface AssinaturaRegistrada {
  id: number;
}

type CorpoAssinatura =
  | { assinante_tipo: "fiscalizador"; usuario_id: number; imagem: string }
  | { assinante_tipo: "denunciado"; assinante_nome: string; imagem: string }
  | { assinante_tipo: "denunciado"; assinante_nome: string; recusou: true };

interface NovaAssinatura {
  tipo: TipoAssinante;
  nome: string;
  imagem: string | null;
}

async function gerarDocumentoRequest(visitaId: string): Promise<DocumentoCriado> {
  return apiFetch<DocumentoCriado>(
    `/visitas/${visitaId}/documento`,
    { method: "POST" },
    "Não foi possível preparar o documento da visita."
  );
}

async function enviarAssinaturaRequest(
  documentoId: number,
  corpo: CorpoAssinatura
): Promise<AssinaturaRegistrada> {
  return apiFetch<AssinaturaRegistrada>(
    `/documentos/${documentoId}/assinaturas`,
    { method: "POST", body: JSON.stringify(corpo) },
    "Não foi possível enviar a assinatura."
  );
}

async function concluirVisitaRequest(visitaId: string): Promise<VisitaDetalhe> {
  return apiFetch<VisitaDetalhe>(
    `/visitas/${visitaId}/concluir`,
    { method: "PATCH" },
    "Não foi possível concluir a visita."
  );
}

function mensagemDoErro(erro: Error) {
  const detalhes =
    erro instanceof ApiError && erro.erros.length > 0 ? `\n\n${erro.erros.join("\n")}` : "";
  return `${erro.message}${detalhes}`;
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

  const usuarioId = useSessaoStore((state) => state.usuario?.id);
  const visitaIdStore = useVisitaEmAndamentoStore((state) => state.visitaId);
  const respostas = useVisitaEmAndamentoStore((state) => state.respostas);
  const observacoesLivres = useVisitaEmAndamentoStore((state) => state.observacoesLivres);
  const assinaturas = useVisitaEmAndamentoStore((state) => state.assinaturasColetadas);
  const registrarAssinatura = useVisitaEmAndamentoStore((state) => state.registrarAssinatura);
  const limparVisitaStore = useVisitaEmAndamentoStore((state) => state.limparVisitaStore);
  const documentoIdStore = useVisitaEmAndamentoStore((state) => state.documentoId);
  const definirDocumentoId = useVisitaEmAndamentoStore((state) => state.definirDocumentoId);

  const queryClient = useQueryClient();
  const visitaQuery = useVisita(id);
  const perguntasQuery = usePerguntasQuestionario();
  const visita = visitaQuery.data;
  const perguntas = perguntasQuery.data ?? [];

  const documentoId = documentoIdStore ?? visita?.documentos?.[0]?.id ?? null;

  const {
    mutate: gerarDocumento,
    isIdle: geracaoNaoComecou,
    isError: geracaoFalhou,
    error: erroGeracao,
  } = useMutation({
    mutationFn: () => gerarDocumentoRequest(id),
    onSuccess: (documento) => {
      definirDocumentoId(documento.id);
      queryClient.invalidateQueries({ queryKey: ["visita", id] });
    },
  });

  const dadosDestaVisita = storeHidratada && visitaIdStore === Number(id);
  const precisaGerarDocumento = dadosDestaVisita && Boolean(visita) && documentoId === null;

  useEffect(() => {
    if (precisaGerarDocumento && geracaoNaoComecou) gerarDocumento();
  }, [precisaGerarDocumento, geracaoNaoComecou, gerarDocumento]);

  const enviandoRef = useRef(false);
  const enviarAssinaturaMutation = useMutation({
    mutationFn: async ({ tipo, nome, imagem }: NovaAssinatura) => {
      if (documentoId === null) throw new Error("O documento da visita ainda não foi preparado.");

      let corpo: CorpoAssinatura;
      if (tipo === "fiscalizador") {
        if (!usuarioId || !imagem) throw new Error("Não foi possível identificar o fiscal.");
        corpo = { assinante_tipo: "fiscalizador", usuario_id: usuarioId, imagem };
      } else if (imagem) {
        corpo = { assinante_tipo: "denunciado", assinante_nome: nome, imagem };
      } else {
        corpo = { assinante_tipo: "denunciado", assinante_nome: nome, recusou: true };
      }

      const registrada = await enviarAssinaturaRequest(documentoId, corpo);

      const imagemUri = imagem
        ? await salvarImagemAssinatura(imagem, `visita-${id}-${tipo}-${Date.now()}`).catch(
            () => null
          )
        : null;

      return { idServidor: registrada.id, imagemUri };
    },
    onSuccess: ({ idServidor, imagemUri }, { tipo, nome, imagem }) => {
      registrarAssinatura({
        idServidor,
        tipo,
        nome,
        usuarioId: tipo === "fiscalizador" ? (usuarioId ?? null) : null,
        imagemUri,
        recusou: imagem === null,
        assinadoEm: new Date().toISOString(),
      });
    },
    onError: (erro) => {
      if (erro instanceof SessaoExpiradaError) return;
      Alert.alert("Erro ao enviar assinatura", mensagemDoErro(erro));
    },
    onSettled: () => {
      enviandoRef.current = false;
    },
  });

  function enviarAssinatura(dados: NovaAssinatura) {
    if (enviandoRef.current) return;
    enviandoRef.current = true;
    enviarAssinaturaMutation.mutate(dados);
  }

  const tipoEnviando = enviarAssinaturaMutation.isPending
    ? enviarAssinaturaMutation.variables?.tipo
    : undefined;

  const concluindoRef = useRef(false);
  const concluirMutation = useMutation({
    mutationFn: () => concluirVisitaRequest(id),
    onSuccess: (visitaAtualizada) => {
      queryClient.setQueryData(["visita", id], visitaAtualizada);
      queryClient.invalidateQueries({ queryKey: ["visitas"] });

      Alert.alert(
        "Visita concluída",
        "As assinaturas foram enviadas e a visita foi encerrada com sucesso.",
        [
          {
            text: "OK",
            onPress: () => {
              router.dismissTo("/");
              limparVisitaStore();
            },
          },
        ],
        { cancelable: false }
      );
    },
    onError: (erro) => {
      if (erro instanceof SessaoExpiradaError) return;
      Alert.alert(
        "Não foi possível concluir a visita",
        `${mensagemDoErro(erro)}\n\nOs dados continuam salvos no aparelho. Tente novamente.`
      );
    },
    onSettled: () => {
      concluindoRef.current = false;
    },
  });

  function concluirVisita() {
    if (concluindoRef.current) return;
    concluindoRef.current = true;
    concluirMutation.mutate();
  }

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

  const fiscalLogado = visita.fiscalizadores?.find((f) => f.id === usuarioId);

  const assinaturaFiscal = assinaturas.find(
    (a) => a.tipo === "fiscalizador" && a.usuarioId === usuarioId
  );
  const assinaturaResponsavel = assinaturaFiscal
    ? assinaturas.find((a) => a.tipo === "denunciado")
    : undefined;

  const totalConcluidos = [assinaturaFiscal, assinaturaResponsavel].filter(Boolean).length;
  const totalRecusas = assinaturaResponsavel?.recusou ? 1 : 0;

  const todasAssinaturasColetadas = totalConcluidos === TOTAL_ASSINANTES;
  const podeConcluir =
    documentoId !== null &&
    todasAssinaturasColetadas &&
    visita.status === "em_andamento" &&
    !enviarAssinaturaMutation.isPending &&
    !concluirMutation.isPending;

  const travarRolagem = () => setRolagemAtiva(false);
  const liberarRolagem = () => setRolagemAtiva(true);

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

          {documentoId === null ? (
            <View style={styles.cartaoAviso}>
              {geracaoFalhou ? (
                <>
                  <Text style={styles.erroDocumento}>
                    {erroGeracao ? mensagemDoErro(erroGeracao) : "Erro ao preparar o documento."}
                  </Text>
                  <Pressable style={styles.botaoSecundario} onPress={() => gerarDocumento()}>
                    <Text style={styles.botaoSecundarioTexto}>Tentar novamente</Text>
                  </Pressable>
                </>
              ) : (
                <View style={styles.preparando}>
                  <ActivityIndicator color="#1D3F94" />
                  <Text style={styles.cartaoAvisoTexto}>Preparando o documento...</Text>
                </View>
              )}
            </View>
          ) : (
            <>
              {/* 1º assinante: o fiscal logado. Sem "Refazer": o back da sprint 2 não apaga assinaturas */}
              {fiscalLogado ? (
                <CartaoAssinante
                  rotulo="Fiscal"
                  situacao="ativo"
                  nomeFixo={fiscalLogado.nome}
                  assinatura={assinaturaFiscal}
                  enviando={tipoEnviando === "fiscalizador"}
                  onConfirmar={({ nome, imagem }) =>
                    enviarAssinatura({ tipo: "fiscalizador", nome, imagem })
                  }
                  onInicioDesenho={travarRolagem}
                  onFimDesenho={liberarRolagem}
                />
              ) : (
                <View style={styles.cartaoAviso}>
                  <Text style={styles.cartaoAvisoTexto}>
                    Só um fiscal atribuído a esta visita pode assinar como fiscal.
                  </Text>
                </View>
              )}

              {/* 2º assinante: o responsável pelo estabelecimento, só depois do fiscal */}
              <CartaoAssinante
                rotulo="Responsável"
                rotuloCampoNome="Responsável pelo estabelecimento"
                situacao={assinaturaFiscal ? "ativo" : "aguardando"}
                assinatura={assinaturaResponsavel}
                permitirRecusa
                enviando={tipoEnviando === "denunciado"}
                onConfirmar={({ nome, imagem }) =>
                  enviarAssinatura({ tipo: "denunciado", nome, imagem })
                }
                onRecusar={(nome) => enviarAssinatura({ tipo: "denunciado", nome, imagem: null })}
                onInicioDesenho={travarRolagem}
                onFimDesenho={liberarRolagem}
              />
            </>
          )}
        </View>
      </ScrollView>

      <View style={[styles.rodape, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.rodapeTexto}>
          {totalConcluidos} de {TOTAL_ASSINANTES} assinantes concluídos
          {totalRecusas > 0 ? ` · ${totalRecusas} recusa` : ""}
        </Text>
        {!todasAssinaturasColetadas && (
          <Text style={styles.rodapeDica}>Colete as assinaturas para encerrar a visita.</Text>
        )}
        <Pressable
          style={[styles.botaoEnviar, !podeConcluir && styles.botaoDesabilitado]}
          disabled={!podeConcluir}
          accessibilityRole="button"
          accessibilityState={{ disabled: !podeConcluir, busy: concluirMutation.isPending }}
          onPress={concluirVisita}
        >
          {concluirMutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.botaoEnviarTexto}>Encerrar e enviar</Text>
          )}
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
  cartaoAviso: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE5EF",
  },
  cartaoAvisoTexto: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#4A5B73",
  },
  preparando: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  erroDocumento: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#A12A20",
    marginBottom: 10,
  },

  rodapeTexto: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#33435A",
    textAlign: "center",
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
  rodapeDica: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#4A5B73",
    textAlign: "center",
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
