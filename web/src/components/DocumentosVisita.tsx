import { View, Text, Linking, StyleSheet } from "react-native";
import { Card, Icon } from "react-native-paper";
import { API_URL } from "@/lib/api";
import { formatarData } from "@/lib/formatadores";
import { cores } from "@/theme";
import type { Documento } from "@/types/visita";

function urlDoPdf(caminho?: string | null) {
  if (!caminho) return null;
  try {
    const url = new URL(caminho, API_URL);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function textoEnvio(documento: Documento) {
  if (documento.enviado_email === true) return "enviado por e-mail";
  if (documento.enviado_email === false) return "e-mail não enviado";
  return "envio não informado";
}

function CartaoDocumento({ documento }: { documento: Documento }) {
  const url = urlDoPdf(documento.url_arquivo_pdf);

  return (
    <Card
      mode="outlined"
      style={styles.cartao}
      contentStyle={styles.conteudo}
      onPress={url ? () => Linking.openURL(url) : undefined}
      accessibilityRole={url ? "link" : undefined}
    >
      <Icon source="file-document-outline" size={24} color={cores.azul} />
      <View style={styles.textos}>
        <Text style={styles.titulo}>Documento #{documento.id}</Text>
        <Text style={styles.detalhe}>
          Gerado em {formatarData(documento.data_geracao)} ·{" "}
          {url ? textoEnvio(documento) : "PDF indisponível"}
        </Text>
      </View>
      {url && <Icon source="open-in-new" size={18} color={cores.azul} />}
    </Card>
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
