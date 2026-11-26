import { View, Text, StyleSheet } from "react-native";
import { Card, Icon } from "react-native-paper";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatarData } from "@/lib/formatadores";
import { MensagemErro } from "@/components/MensagemErro";
import { cores } from "@/theme";
import type { Documento } from "@/types/visita";

async function buscarLinkPdf(documentoId: number) {
  const response = await api.get<{ url: string }>(`/documentos/${documentoId}/pdf`);
  return response.data.url;
}

function textoEnvio(documento: Documento) {
  if (documento.enviado_email === true) return "enviado por e-mail";
  if (documento.enviado_email === false) return "e-mail não enviado";
  return "envio não informado";
}

function CartaoDocumento({ documento }: { documento: Documento }) {
  const temPdf = Boolean(documento.url_arquivo_pdf);
  const abrirMutation = useMutation({ mutationFn: buscarLinkPdf });

  function abrir() {
    const aba = window.open("", "_blank");
    abrirMutation.mutate(documento.id, {
      onSuccess: (url) => {
        if (aba) aba.location.href = url;
        else window.location.assign(url);
      },
      onError: () => aba?.close(),
    });
  }

  function situacao() {
    if (!temPdf) return "PDF ainda não gerado";
    if (abrirMutation.isPending) return "Abrindo PDF…";
    return textoEnvio(documento);
  }

  return (
    <View style={styles.documento}>
      <Card
        mode="outlined"
        style={styles.cartao}
        contentStyle={styles.conteudo}
        onPress={temPdf && !abrirMutation.isPending ? abrir : undefined}
        accessibilityRole={temPdf ? "link" : undefined}
        accessibilityLabel={temPdf ? `Abrir o PDF do documento ${documento.id}` : undefined}
      >
        <Icon source="file-document-outline" size={24} color={cores.azul} />
        <View style={styles.textos}>
          <Text style={styles.titulo}>Documento #{documento.id}</Text>
          <Text style={styles.detalhe}>
            Gerado em {formatarData(documento.data_geracao)} · {situacao()}
          </Text>
        </View>
        {temPdf && <Icon source="open-in-new" size={18} color={cores.azul} />}
      </Card>
      {abrirMutation.isError && <MensagemErro erro={abrirMutation.error} />}
    </View>
  );
}

export function DocumentosVisita({ documentos }: { documentos: Documento[] }) {
  if (documentos.length === 0) {
    return (
      <Card mode="outlined" style={styles.cartao} contentStyle={styles.conteudo}>
        <Icon source="file-document-outline" size={24} color={cores.textoSecundario} />
        <Text style={styles.detalhe}>Nenhum documento vinculado a esta visita.</Text>
      </Card>
    );
  }

  return documentos.map((documento) => (
    <CartaoDocumento key={documento.id} documento={documento} />
  ));
}

const styles = StyleSheet.create({
  documento: {
    gap: 8,
  },
  cartao: {
    borderRadius: 16,
    backgroundColor: cores.branco,
  },
  conteudo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 18,
  },
  textos: {
    flex: 1,
  },
  titulo: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: cores.texto,
  },
  detalhe: {
    flexShrink: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: cores.textoSecundario,
  },
});
