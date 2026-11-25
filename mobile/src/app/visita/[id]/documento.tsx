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
import { api, ApiError, SessaoExpiradaError } from "@/lib/api";
import { formatarData } from "@/lib/formatadores";
import { salvarImagemAssinatura } from "@/lib/arquivosAssinatura";
import { useVisita } from "@/hooks/use-visita";
import { usePerguntasQuestionario, estaRespondida } from "@/hooks/use-perguntas-questionario";
import {
  useVisitaEmAndamentoStore,
  type AssinaturaColetada,
  type TipoAssinante,
} from "@/store/visitaEmAndamentoStore";
import { CabecalhoVisita } from "@/components/CabecalhoVisita";
import { CartaoAssinante } from "@/components/CartaoAssinante";
import { useSessaoStore } from "@/store/sessaoStore";
import type { VisitaDetalhe } from "@/types/visita";

const TOTAL_ASSINANTES = 2;

interface DocumentoCriado {
  id: number;
}

interface Finalizacao {
  situacao: "pendente" | "finalizado" | "erro";
  pendentes?: string[];
  mensagem?: string;
}

interface AssinaturaRegistrada {
  id: number;
  finalizacao?: Finalizacao;
}

type CorpoAssinatura =
  | { assinante_tipo: "fiscalizador"; usuario_id: number; imagem: string }
  | {
      assinante_tipo: "denunciado";
      assinante_nome: string;
      assinante_email?: string;
      imagem: string;
    }
  | {
      assinante_tipo: "denunciado";
      assinante_nome: string;
      assinante_email?: string;
      recusou: true;
    };

interface NovaAssinatura {
  tipo: TipoAssinante;
  nome: string;
  email?: string;
  imagem: string | null;
}

async function gerarDocumentoRequest(visitaId: string): Promise<DocumentoCriado> {
  const response = await api.post<DocumentoCriado>(`/visitas/${visitaId}/documento`);
  return response.data;
}

const TIMEOUT_GERACAO_PDF = 90000;

async function enviarAssinaturaRequest(
  documentoId: number,
  corpo: CorpoAssinatura
): Promise<AssinaturaRegistrada> {
  const response = await api.post<AssinaturaRegistrada>(
    `/documentos/${documentoId}/assinaturas`,
    corpo,
    { timeout: TIMEOUT_GERACAO_PDF }
  );
  return response.data;
}

async function removerAssinaturaRequest(documentoId: number, assinaturaId: number) {
  await api.delete(`/documentos/${documentoId}/assinaturas/${assinaturaId}`);
}

async function finalizarDocumentoRequest(documentoId: number): Promise<Finalizacao> {
  const response = await api.post<Finalizacao>(`/documentos/${documentoId}/finalizar`, undefined, {
    timeout: TIMEOUT_GERACAO_PDF,
  });
  return response.data;
}

async function concluirVisitaRequest(visitaId: string): Promise<VisitaDetalhe> {
  const response = await api.patch<VisitaDetalhe>(`/visitas/${visitaId}/concluir`);
  return response.data;
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
  const removerAssinatura = useVisitaEmAndamentoStore((state) => state.removerAssinatura);
  const limparVisitaStore = useVisitaEmAndamentoStore((state) => state.limparVisitaStore);
  const documentoIdStore = useVisitaEmAndamentoStore((state) => state.documentoId);
  const definirDocumentoId = useVisitaEmAndamentoStore((state) => state.definirDocumentoId);

  const queryClient = useQueryClient();
  const visitaQuery = useVisita(id);
  const perguntasQuery = usePerguntasQuestionario();
  const visita = visitaQuery.data;
  const perguntas = perguntasQuery.data ?? [];

  const documentoId = documentoIdStore ?? visita?.documentos?.[0]?.id ?? null;

  function mostrarSucesso() {
    queryClient.invalidateQueries({ queryKey: ["visitas"] });
    queryClient.invalidateQueries({ queryKey: ["visita", id] });
    Alert.alert(
      "Visita concluída",
      "As assinaturas foram enviadas, o documento foi gerado e a visita foi encerrada com sucesso.",
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
  }

  const enviandoRef = useRef(false);
  const enviarAssinaturaMutation = useMutation({
    mutationFn: async ({ tipo, nome, email, imagem }: NovaAssinatura) => {
      let documentoAtual = documentoId;
      if (documentoAtual === null) {
        const documento = await gerarDocumentoRequest(id);
        documentoAtual = documento.id;
        definirDocumentoId(documento.id);
        queryClient.invalidateQueries({ queryKey: ["visita", id] });
      }

      let corpo: CorpoAssinatura;
      if (tipo === "fiscalizador") {
        if (!usuarioId || !imagem) throw new Error("Não foi possível identificar o fiscal.");
        corpo = { assinante_tipo: "fiscalizador", usuario_id: usuarioId, imagem };
      } else if (imagem) {
        corpo = {
          assinante_tipo: "denunciado",
          assinante_nome: nome,
          assinante_email: email,
          imagem,
        };
      } else {
        corpo = {
          assinante_tipo: "denunciado",
          assinante_nome: nome,
          assinante_email: email,
          recusou: true,
        };
      }

      const registrada = await enviarAssinaturaRequest(documentoAtual, corpo);

      const imagemUri = imagem
        ? await salvarImagemAssinatura(imagem, `visita-${id}-${tipo}-${Date.now()}`).catch(
            () => null
          )
        : null;

      return { idServidor: registrada.id, imagemUri, finalizacao: registrada.finalizacao };
    },
    onSuccess: ({ idServidor, imagemUri, finalizacao }, { tipo, nome, imagem }) => {
      registrarAssinatura({
        idServidor,
        tipo,
        nome,
        usuarioId: tipo === "fiscalizador" ? (usuarioId ?? null) : null,
        imagemUri,
        recusou: imagem === null,
        assinadoEm: new Date().toISOString(),
      });

      if (finalizacao?.situacao === "finalizado") {
        mostrarSucesso();
      } else if (finalizacao?.situacao === "erro") {
        Alert.alert(
          "Documento não gerado",
          `${finalizacao.mensagem ?? "Não foi possível gerar o PDF."}\n\nA assinatura foi registrada. Toque em "Encerrar e enviar" para gerar o documento novamente.`
        );
      }
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

  const refazerMutation = useMutation({
    mutationFn: async (assinatura: AssinaturaColetada) => {
      if (documentoId === null) throw new Error("O documento da visita não foi encontrado.");
      try {
        await removerAssinaturaRequest(documentoId, assinatura.idServidor);
      } catch (erro) {
        if (erro instanceof ApiError && erro.status === 404) return;
        throw erro;
      }
    },
    onSuccess: (_resultado, assinatura) => removerAssinatura(assinatura.tipo),
    onError: (erro) => {
      if (erro instanceof SessaoExpiradaError) return;
      Alert.alert("Não foi possível refazer a assinatura", mensagemDoErro(erro));
    },
  });

  const concluindoRef = useRef(false);
  const concluirMutation = useMutation({
    mutationFn: async () => {
      if (documentoId === null) throw new Error("O documento da visita ainda não foi criado.");

      const finalizacao = await finalizarDocumentoRequest(documentoId);
      if (finalizacao.situacao === "pendente") {
        throw new Error(`Ainda falta: ${(finalizacao.pendentes ?? []).join(", ")}.`);
      }
      if (finalizacao.situacao !== "finalizado") {
        throw new Error(finalizacao.mensagem ?? "Não foi possível gerar o documento.");
      }

      return concluirVisitaRequest(id);
    },
    onSuccess: () => mostrarSucesso(),
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
    (visita.status === "em_andamento" || visita.status === "concluida") &&
    !enviarAssinaturaMutation.isPending &&
    !concluirMutation.isPending;

  const travarRolagem = () => setRolagemAtiva(false);
  const liberarRolagem = () => setRolagemAtiva(true);

  function refazerFiscal() {
    if (!assinaturaFiscal || refazerMutation.isPending) return;
    Alert.alert(
      "Refazer assinatura do fiscal",
      "A assinatura será apagada e precisará ser feita de novo.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Refazer",
          style: "destructive",
          onPress: () => refazerMutation.mutate(assinaturaFiscal),
        },
      ]
    );
  }

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

          {assinaturas.length === 0 && (
            <View style={styles.avisoAmarelo}>
              <Text style={styles.avisoAmareloTexto}>
                Ao confirmar a primeira assinatura, as respostas do questionário não poderão mais
                ser alteradas. Revise a prévia antes de assinar.
              </Text>
            </View>
          )}

          {observacoesLivres.trim() !== "" && (
            <View style={styles.avisoAmarelo}>
              <Text style={styles.avisoAmareloTexto}>
                As observações ainda não são enviadas ao servidor e não vão aparecer no PDF.
              </Text>
            </View>
          )}

          {fiscalLogado ? (
            <CartaoAssinante
              rotulo="Fiscal"
              situacao="ativo"
              nomeFixo={fiscalLogado.nome}
              assinatura={assinaturaFiscal}
              enviando={tipoEnviando === "fiscalizador" || refazerMutation.isPending}
              onConfirmar={({ nome, imagem }) =>
                enviarAssinatura({ tipo: "fiscalizador", nome, imagem })
              }
              onRefazer={assinaturaResponsavel ? undefined : refazerFiscal}
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

          <CartaoAssinante
            rotulo="Responsável"
            rotuloCampoNome="Responsável pelo estabelecimento"
            situacao={assinaturaFiscal ? "ativo" : "aguardando"}
            assinatura={assinaturaResponsavel}
            permitirRecusa
            pedirEmail
            aviso="Ao confirmar a assinatura ou a recusa, o documento será finalizado e não poderá mais ser alterado."
            enviando={tipoEnviando === "denunciado"}
            onConfirmar={({ nome, email, imagem }) =>
              enviarAssinatura({ tipo: "denunciado", nome, email, imagem })
            }
            onRecusar={({ nome, email }) =>
              enviarAssinatura({ tipo: "denunciado", nome, email, imagem: null })
            }
            onInicioDesenho={travarRolagem}
            onFimDesenho={liberarRolagem}
          />
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
  avisoAmarelo: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#FFF4D6",
  },
  avisoAmareloTexto: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    lineHeight: 18,
    color: "#5C3F00",
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
